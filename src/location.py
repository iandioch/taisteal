import json
import os

import requests

# Constants
LOCATION_LOOKUP_CACHE_PATH = '.taistil/location_cache.json'
MAXIMUM_LOCATION_LOOKUP_ATTEMPTS = 5

# Lookup results
LOOKUP_FETCHED_FROM_CACHE = 'FETCHED_FROM_CACHE'
LOOKUP_NO_RESULTS = 'NO_RESULTS'
LOOKUP_OVER_QUERY_LIMIT = 'OVER_QUERY_LIMIT'


LOCATION_LOOKUP_CACHE = {}


class TaistilLocation:

    def __init__(self):
        self.query = ""
        self.address = ""
        self.latitude = 0
        self.longitude = 0
        self.components = []

    def __str__(self):
        return self.query

    @staticmethod
    def _fetch_location(query):
        u = 'https://maps.googleapis.com/maps/api/geocode/json?address={}'
        resp = json.loads(requests.get(u.format(query)).text)
        if resp['status'] != 'OK':
            return resp['status'], None, None, None, None
        for result in resp['results']:
            addr = result['formatted_address']
            lat = float(result['geometry']['location']['lat'])
            lng = float(result['geometry']['location']['lng'])
            components = result['address_components']
            return None, addr, lat, lng, components
        return LOOKUP_NO_RESULTS, None, None, None, None

    @staticmethod
    def find(query):
        if query in LOCATION_LOOKUP_CACHE:
            return LOCATION_LOOKUP_CACHE[query], LOOKUP_FETCHED_FROM_CACHE
        for _ in range(MAXIMUM_LOCATION_LOOKUP_ATTEMPTS):
            error, addr, lat, lng, components = \
                TaistilLocation._fetch_location(query)
            if error:
                return None, error
            loc = TaistilLocation()
            loc.query = query
            loc.address = addr
            loc.latitude = lat
            loc.longitude = lng
            loc.components = components
            print('Created Location', loc)
            LOCATION_LOOKUP_CACHE[query] = loc
            return loc

def load_location_lookup_cache(path=LOCATION_LOOKUP_CACHE_PATH):
    try:
        with open(path, 'r') as f:
            LOCATION_LOOKUP_CACHE = json.load(f)
    except OSError as e:
        print('Could not find location lookup cache file "{}"'.format(path))
    except json.JSONDecodeError as e:
        print('Location lookup cache file did not contain valid JSON.')
    except Exception as e:
        print('Error while loading location lookup cache file.')

def save_location_lookup_cache(path=LOCATION_LOOKUP_CACHE_PATH):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, 'w') as f:
        json.dump(LOCATION_LOOKUP_CACHE, f)
