import json
import os

import requests

# Constants
LOCATION_LOOKUP_CACHE_PATH = '.taisteal/location_cache.json'
MAXIMUM_LOCATION_LOOKUP_ATTEMPTS = 5

# Lookup results
# TODO(iandioch): Convert to enum.
LOOKUP_FETCHED_FROM_CACHE = 'FETCHED_FROM_CACHE'
LOOKUP_NO_RESULTS = 'NO_RESULTS'
LOOKUP_OVER_QUERY_LIMIT = 'OVER_QUERY_LIMIT'
LOOKUP_FETCHED_FROM_GOOGLE = 'FETCHED_FROM_GOOGLE'


LOCATION_LOOKUP_CACHE = {}

TYPE_UNKNOWN = 'UNKNOWN'
TYPE_AIRPORT = 'AIRPORT'
TYPE_TOWN = 'TOWN'
TYPE_STATION = 'STATION'


class Location:

    def __init__(self):
        '''Location() should not be called directly.
        Use Location.find(query) instead.'''
        self.query = ""
        self.address = ""
        self.human_readable_name = ""
        self.latitude = 0
        self.longitude = 0
        self.components = []
        self.maps_response = ""
        self.parent = None
        self.children = []
        self.country = None#"Unknown Country"
        self.type = TYPE_UNKNOWN 
        self.region = ''

    def __repr__(self):
        return self.query

    @staticmethod
    def _apply_rewrites(loc):
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
            },
            'locality': {
                'Kastrup': 'Copenhagen', # technically different
                'Milano': 'Milan'
            },
            'administrative_area_level_2': {},
            'country': {
                'Unknown Country': 'Palestine',
            }
        }
        for component in loc.components:
            for type_ in component['types']:
                if type_ in rewrites:
                    if component['long_name'] in rewrites[type_]:
                        print('Applying rewrites to', loc)
                        component['long_name'] = rewrites[type_][component['long_name']]
        return loc


    @staticmethod
    def _get_region_name(loc):
        # Lower number = better
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
            # TODO(iandioch): Find a way to get England, Wales, Scotland, NI to the country field instead of United Kingdom.
            'country': set([])
        }
        best_name = None 
        best_type_value = 99
        for component in loc.components:
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
            return loc.address
        return best_name

    @staticmethod
    def _get_country_name(loc):
        is_uk = False
        admin_area = None
        country = None
        for component in loc.components:
            typeset = set(component['types'])
            if 'country' in typeset:
                country = component['long_name']
                if country == 'United Kingdom':
                    is_uk = True
            if 'administrative_area_level_1' in typeset:
                admin_area = component['long_name']
        if is_uk:
            return admin_area
        if country:
            return country
        return 'Palestine'

    @staticmethod
    def _parse_maps_response(result, query, config):
        loc = Location()
        loc.maps_response = result
        loc.query = query
        loc.address = result['formatted_address']
        loc.latitude = float(result['geometry']['location']['lat'])
        loc.longitude = float(result['geometry']['location']['lng'])
        loc.components = result['address_components']
        Location._apply_rewrites(loc)

        for component in loc.components:
            typeset = set(component['types'])
            if 'locality' in typeset:
                if not loc.human_readable_name:
                    loc.human_readable_name = component['long_name']
                if loc.type == TYPE_UNKNOWN:
                    loc.type = TYPE_TOWN
            if 'airport' in typeset:
                loc.type = TYPE_AIRPORT
                # Special case for airports, which can be in a differently named
                # town or county than their associated city, to just name them
                # the name of the airport itself.
                # Marking a location as "County Dublin" instead of "DUB Airport"
                # or Kloten instead of "ZRH Airport" is not useful.
                loc.human_readable_name = component['long_name']
            elif (loc.type != TYPE_AIRPORT and ('bus_station' in typeset or
                                                'train_station' in typeset or
                                                'transit_station' in typeset or
                                                'station' in component['long_name'].lower())):
                loc.type = TYPE_STATION

        if not loc.human_readable_name:
            loc.human_readable_name = loc.address
        loc.region = Location._get_region_name(loc)

        loc.country = Location._get_country_name(loc)
        return loc

    @staticmethod
    def _fetch_location(query, config):
        u = 'https://maps.googleapis.com/maps/api/geocode/json?address={}&key={}'
        resp = json.loads(requests.get(u.format(query, config['google_api_key'])).text)
        if resp['status'] != 'OK':
            return resp['status'], None
        for result in resp['results']:
            loc = Location._parse_maps_response(result, query, config)
            return None, loc
        return LOOKUP_NO_RESULTS, None

    @staticmethod
    def find(query, config):
        query = query.strip()
        if query in LOCATION_LOOKUP_CACHE:
            return LOCATION_LOOKUP_CACHE[query], LOOKUP_FETCHED_FROM_CACHE
        print('Could not find given location ("{}") in lookup cache.'.format(query))
        for _ in range(MAXIMUM_LOCATION_LOOKUP_ATTEMPTS):
            error, loc = Location._fetch_location(query, config)
            if error:
                return None, error
            print('Created Location', loc.address)
            loc.query = query
            LOCATION_LOOKUP_CACHE[query] = loc
            LOCATION_LOOKUP_CACHE[loc.address] = loc
            return loc, LOOKUP_FETCHED_FROM_GOOGLE 


def load_location_lookup_cache(config, path=LOCATION_LOOKUP_CACHE_PATH):
    try:
        with open(path, 'r') as f:
            d = json.load(f)
            for e in d:
                LOCATION_LOOKUP_CACHE[e] = Location._parse_maps_response(
                    d[e], e, config)
            print('Location lookup cache successfully loaded. It is {} elements long.'.format(len(LOCATION_LOOKUP_CACHE)))
    except OSError as e:
        print('Could not find location lookup cache file "{}"'.format(path))
    except json.JSONDecodeError as e:
        print('Location lookup cache file did not contain valid JSON.')
    except Exception as e:
        print('Error while loading location lookup cache file: {}'.format(e))


def save_location_lookup_cache(path=LOCATION_LOOKUP_CACHE_PATH):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    d = {
        q: LOCATION_LOOKUP_CACHE[q].maps_response for q in LOCATION_LOOKUP_CACHE}
    with open(path, 'w') as f:
        json.dump(d, f)
