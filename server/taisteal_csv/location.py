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


class Location:

    def __init__(self):
        '''Location() should not be called directly.
        Use Location.find(query) instead.'''
        self.query = ""
        self.address = ""
        self.latitude = 0
        self.longitude = 0
        self.components = []
        self.maps_response = ""
        self.parent = None
        self.children = []
        self.country = "Unknown Country"

    def __repr__(self):
        return self.query

    @staticmethod
    def _parse_maps_response(result, query=''):
        loc = Location()
        loc.maps_response = result
        loc.query = query
        loc.address = result['formatted_address']
        loc.latitude = float(result['geometry']['location']['lat'])
        loc.longitude = float(result['geometry']['location']['lng'])
        loc.components = result['address_components']
        for component in loc.components:
            if 'country' in component['types']:
                country_name = component['long_name']
                if country_name == query:
                    # TODO(iandioch): Figure out why this if-statement is here.
                    continue
                loc.parent, result = Location.find(country_name)
                loc.parent.children.append(loc)
                loc.country = country_name
        return loc

    @staticmethod
    def _fetch_location(query):
        u = 'https://maps.googleapis.com/maps/api/geocode/json?address={}'
        resp = json.loads(requests.get(u.format(query)).text)
        if resp['status'] != 'OK':
            return resp['status'], None
        for result in resp['results']:
            loc = Location._parse_maps_response(result, query)
            return None, loc
        return LOOKUP_NO_RESULTS, None

    @staticmethod
    def find(query):
        query = query.strip()
        if query in LOCATION_LOOKUP_CACHE:
            return LOCATION_LOOKUP_CACHE[query], LOOKUP_FETCHED_FROM_CACHE
        print('Could not find given location ("{}") in lookup cache.'.format(query))
        for _ in range(MAXIMUM_LOCATION_LOOKUP_ATTEMPTS):
            error, loc = Location._fetch_location(query)
            if error:
                return None, error
            print('Created Location', loc.address)
            loc.query = query
            LOCATION_LOOKUP_CACHE[query] = loc
            LOCATION_LOOKUP_CACHE[loc.address] = loc
            return loc, LOOKUP_FETCHED_FROM_GOOGLE 


def load_location_lookup_cache(path=LOCATION_LOOKUP_CACHE_PATH):
    try:
        with open(path, 'r') as f:
            d = json.load(f)
            for e in d:
                LOCATION_LOOKUP_CACHE[e] = Location._parse_maps_response(
                    d[e], e)
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
