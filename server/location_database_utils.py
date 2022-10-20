import base64
import json

TYPE_UNKNOWN = 'UNKNOWN'
TYPE_AIRPORT = 'AIRPORT'
TYPE_TOWN = 'TOWN'
TYPE_STATION = 'STATION'

def _apply_rewrites(parsed_result):
    # A hack to get "Bayern" to resolve to "Bavaria" etc.
    rewrites = {
        'administrative_area_level_1': {
            'Bayern': 'Bavaria',
            'Tessin': 'Ticino',
            'Zurich': 'Zürich',
            'Lombardia': 'Lombardy',
            'Illes Balears': 'Balearic Islands',
            'Islas Baleares': 'Balearic Islands',
            'Grisons': 'Graubünden',
            'Noord-Brabant': 'North Brabant',
            'Județul Ilfov': 'Bucharest', # technically different
            'Județul Cluj': 'Cluj County',
            'Bratislavský kraj': 'Bratislava Region',
            'Tangier-Tétouan-Al Hoceima': 'Tanger-Tétouan-Al Hoceïma',
            'Wallis': 'Valais',
            'Niederösterreich': 'Lower Austria',
            'Stockholms län': 'Stockholm County',
            'Andalucía': 'Andalusia',
            'Vlaams Gewest': 'Flanders',
            'Brussel': 'Brussels',
            'Nordrhein-Westfalen': 'North Rhine-Westphalia',
            'Basel-Stadt': 'Basel City',
            'Sankt Gallen': 'St. Gallen',
        },
        'locality': {
            'Kastrup': 'Copenhagen', # technically different
            'Milano': 'Milan',
            'München': 'Munich',
            'Brussel': 'Brussels',
        },
        # For England, try to get "ceremonial counties"
        'administrative_area_level_2': {
            'North Somerset': 'Somerset',
            'Bath and North East Somerset': 'Somerset',
            'Bristol City': 'Bristol',
        },
        'country': {
            'Unknown Country': 'Palestine',
        }
    }
    for component in parsed_result['address_components']:
        for type_ in component['types']:
            if type_ in rewrites:
                if component['long_name'] in rewrites[type_]:
                    print('Applying rewrites to', parsed_result)
                    component['long_name'] = rewrites[type_][component['long_name']]

    def rewrite_tegel_airport(parsed_result):
        for component in parsed_result['address_components']:
            if component['long_name'] == 'Tegel, Berlin, Germany':
                component['types'].append('airport')
                return True
        return False

    def rewrite_luton_airport(parsed_result):
        for component in parsed_result['address_components']:
            if component['long_name'] == 'London Luton Airport':
                parsed_result['address_components'].append({
                    'long_name': 'Bedfordshire',
                    'types': ['administrative_area_level_2'],
                })
                return True
        return False

    def rewrite_kos_airport(parsed_result):
        for component in parsed_result['address_components']:
            if component['long_name'] == 'Kos Airport':
                parsed_result['address_components'].append({
                    'long_name': 'Kos',
                    'types': ['administrative_area_level_2'],
                })
                return True
        return False

    def rewrite_heraklion(parsed_result):
        for component in parsed_result['address_components']:
            if component['long_name'] == 'Iraklio':
                parsed_result['address_components'].append({
                    'long_name': 'Crete',
                    'types': ['administrative_area_level_2'],
                })
                return True
        return False

    # Non-standard rewrites that don't cleanly fit as a name substitution. Each should return True if they applied to the given structure.
    # TODO(iandioch): it'd be good to get a counter for the number of usages of
    # these, so we know if any aren't used and can be removed.
    ad_hoc_rewrites = {
        'tegel': rewrite_tegel_airport,
        'luton': rewrite_luton_airport,
        'kos_airport': rewrite_kos_airport,
        'heraklion': rewrite_heraklion,
    }
    for rewrite_id in ad_hoc_rewrites:
        func = ad_hoc_rewrites[rewrite_id]
        if func(parsed_result):
            print('Applied ad-hoc rewrite', rewrite_id, 'to', parsed_result)
    return parsed_result

def _get_name_and_type(parsed_result):
    type_ = TYPE_UNKNOWN
    name = None
    for component in parsed_result['address_components']:
        typeset = set(component['types'])
        stations = ['bus_station', 'train_station', 'transit_station']
        if 'locality' in typeset:
            # Should not overwrite other more specifically chosen values, as most things seem to be 'localities' somewhere in the list of components.
            if not name:
                name = component['long_name']
            if type_ == TYPE_UNKNOWN:
                type_ = TYPE_TOWN
        if 'airport' in typeset:
            type_ = TYPE_AIRPORT
            # Special case for airports, which can be in a differently named
            # town or county than their associated city, to just name them
            # the name of the airport itself.
            # Marking a location as "County Dublin" instead of "DUB Airport"
            # or Kloten instead of "ZRH Airport" is not useful.
            # TODO(iandioch): 'long_name' isn't actually a special case...
            name = component['long_name']
        elif (type_ != TYPE_AIRPORT and
                 (any(station in typeset for station in stations) or
                    'station' in component['long_name'].lower())):
            type_ = TYPE_STATION

    # Last resort, use the address as the name if no other name was found.
    if not name:
        name = parsed_result['formatted_address']
    return name, type_

def _get_region_name(parsed_result):
    # Lower number = better
    # TODO(iandioch): It would be good to change this ranking based on country.
    # Eg. In the UK, the regions are messy, probably because we are splitting it
    # into its component countries.
    preference_order = {
        'administrative_area_level_1': 1,
        'locality': 3,
        'administrative_area_level_2': 2,
        'country': 4
    }
    banned_regions = {
        'administrative_area_level_1': set([
            # These look very strange as single regions.
            'England', 'Wales', 'Scotland', 
        ]),
        'locality': set([]),
        'administrative_area_level_2': set([]),
        'country': set([])
    }
    best_name = None 
    best_type_value = 99
    for component in parsed_result['address_components']:
        typeset = set(component['types'])
        for type_, value in preference_order.items():
            if type_ in typeset:
                if best_type_value < value:
                    continue
                if (component['long_name'] in banned_regions[type_]):
                    continue
                best_type_value = value
                best_name = component['long_name']

    if best_name is None:
        return parsed_result['formatted_address']
    return best_name

def _get_country_data(parsed_result):
    is_uk = False
    admin_area = None
    country = None
    for component in parsed_result['address_components']:
        typeset = set(component['types'])
        if 'country' in typeset:
            country = (component['long_name'], component['short_name'])
            if country[0] == 'United Kingdom':
                is_uk = True
        if 'administrative_area_level_1' in typeset:
            admin_area = (component['long_name'], component['short_name'])
    if is_uk:
        if (admin_area[0] == 'Scotland'):
            return 'Scotland', 'GBSCT'
        elif (admin_area[0] == 'Wales'):
            return 'Wales', 'GBWLS'
        elif (admin_area[0] == 'England'):
            return 'England', 'GBENG'
        return admin_area
    if country:
        return country
    return ('Palestine', 'PS')

def create_locations_row_for_lookup(parsed_lookup_result):
    # Apply the rewrites here, as this is directly coming from the lookup cache.
    result = _apply_rewrites(parsed_lookup_result)
    # These elements are trivial accesses of the lookup result:
    data = {
        'address': result['formatted_address'],
        'latitude': float(result['geometry']['location']['lat']),
        'longitude': float(result['geometry']['location']['lng']),
    }

    # The name and type are chosen by picking through the result['address_components'].
    data['name'], data['type'] = _get_name_and_type(result)
    data['region'] = _get_region_name(result)
    # We split UK into its component countries, so we need to manipulate things
    # a bit to get the country data out of the parsed result.
    data['country_name'], data['country_code'] = _get_country_data(result)
    return data

def get_id_for_location_lookup(query, parsed_lookup_result):
    lat = float(parsed_lookup_result['geometry']['location']['lat'])
    lng = float(parsed_lookup_result['geometry']['location']['lng'])
    # Add the country to eg. differentiate Rome and Vatican
    country, code = _get_country_data(parsed_lookup_result)
    # The larger this number, the further points will be merged (but the merging
    # is based on lat & long, so it is pretty arbitrary).
    rounding = 5
    return '{}:{:.2f},{:.2f}'.format(country, lat/rounding, lng/rounding)
