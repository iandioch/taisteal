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
        self.country = "Unknown Country"
        self.type = TYPE_UNKNOWN 
        self.region = ''

    def __repr__(self):
        return self.query

    @staticmethod
    def _get_region_name(loc):
        # Lower number = better
        preference_order = {
            'administrative_area_level_1': 1,
            'locality': 2,
            'administrative_area_level_2': 3,
            'country': 4
        }
        best_name = None 
        best_type_value = 99
        for component in loc.components:
            typeset = set(component['types'])
            for type_, value in preference_order.items():
                print(type_, typeset)
                if type_ in typeset:
                    if best_type_value < value:
                        continue
                    print('New name {} ({}) is better than {}'.format(component['long_name'], type_, best_name))
                    best_type_value = value
                    best_name = component['long_name']

        bad_admin_area_l1s = set(['England', 'Wales', 'Scotland']) # Too broad.
        if best_name is None:
            return loc.address
        return best_name


    @staticmethod
    def _parse_maps_response(result, query, config):
        loc = Location()
        loc.maps_response = result
        loc.query = query
        loc.address = result['formatted_address']
        loc.latitude = float(result['geometry']['location']['lat'])
        loc.longitude = float(result['geometry']['location']['lng'])
        loc.components = result['address_components']
        for component in loc.components:
            typeset = set(component['types'])
            if 'locality' in typeset:
                if not loc.human_readable_name:
                    loc.human_readable_name = component['long_name']
                if loc.type == TYPE_UNKNOWN:
                    loc.type = TYPE_TOWN
            if 'country' in typeset:
                country_name = component['long_name']
                if country_name == query:
                    # TODO(iandioch): Figure out why this if-statement is here. Exit recursion?
                    continue
                loc.parent, result = Location.find(country_name, config)
                loc.parent.children.append(loc)
                loc.country = country_name
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
