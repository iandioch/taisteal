# Copied from src/trip_parse.py, modified to use Taisteal types instead of raw objects.

import json
import os
import sys
import time

from collections import defaultdict

import requests

from jsonschema import validate

from taisteal_types import *
from location import TaistealLocation, load_location_lookup_cache, save_location_lookup_cache

SECONDS_SLEEP_ON_RATE_LIMITING = 4
SECONDS_SLEEP_BETWEEN_REQUESTS = 0.66
ESTIMATED_RATE_LIMIT_TIME_MULTIPLE = 2


'''
Given a Taisteal element and the loaded location data, output stats
on countries visited.
'''


def get_location_statistics(taisteal_data):
    def get_location_list(data, queue=[]):
        if 'elements' in data:
            for element in data['elements']:
                get_location_list(element)
        else:
            queue.append(data['location'])
        return queue
    countries = defaultdict(int)
    airports = defaultdict(int)
    cities = defaultdict(int)
    unique_countries = defaultdict(set)
    locations = get_location_list(taisteal_data)
    for location in locations:
        loc, err = TaistealLocation.find(location)
        if err == 'NOT_FOUND' or err == 'OVER_QUERY_LIMIT':
            continue
        components = loc.components
        for component in components:
            if 'country' in component['types']:
                countries[component['long_name']] += 1
                unique_countries[component['long_name']].add(location)
            elif 'airport' in component['types']:
                airports[component['long_name']] += 1
            elif 'locality' in component['types']:
                cities[component['long_name']] += 1

    def dict_count_to_tuple_list(counts):
        tuples = list(counts.items())
        tuples.sort()
        tuples.sort(key=lambda x: x[1], reverse=True)
        return tuples
    country_tuples = dict_count_to_tuple_list(countries)
    airport_tuples = dict_count_to_tuple_list(airports)
    city_tuples = dict_count_to_tuple_list(cities)
    unique_countries = {k: len(unique_countries[k]) for k in unique_countries}
    unique_country_tuples = dict_count_to_tuple_list(unique_countries)
    return country_tuples, airport_tuples, city_tuples, unique_country_tuples


def parse_taisteal_json(doc):
    return TripElement.parse(doc)

mode=None
prev=None
def convert_to_csv(obj):
    global prev
    global mode
    if 'mode' in obj.__dict__ and obj.mode != "":
        mode = obj.mode
    if 'location' in obj.__dict__ and 'raw_datetime' in obj.__dict__:
        #print(obj.location.query, obj.raw_datetime)
        if prev is None:
            prev = obj
        else:
            d = ['"{}"'.format(prev.location.query), prev.raw_datetime, '"{}"'.format(obj.location.query), obj.raw_datetime, mode]
            prev = None
            print(','.join(d))
        return
    for e in obj.elements:
        convert_to_csv(e)
    return
    #if type(obj.elements[0]) == 'TripVisit':
    if obj.mode != "":
        print ('-> set mode', obj.mode)
        print('////', obj)
        prev = obj.elements[0]
        for i in range(1, len(obj.elements)):
            curr = obj.elements[i]
            print('//', prev)
            print('//', curr)
            print(','.join([prev.location.query, prev.raw_datetime, curr.location.query, curr.raw_datetime]))
            prev = curr
        return
    for e in obj.elements:
        convert_to_csv(e)

if __name__ == '__main__':
    if len(sys.argv) == 1:
        print('Please provide as an argument the location of the trip element json schema')
        print('Provide the document you want to parse as stdin.')
    else:
        schema_file = ' '.join(sys.argv[1:])
        with open(schema_file, 'r') as f:
            schema = json.load(f)
        doc = json.load(sys.stdin)

        validate(doc, schema)

        # Load location cache before any lookups are made.
        load_location_lookup_cache()
        #print('Input conforms to JSON schema ✔')
        taisteal_obj = parse_taisteal_json(doc)
        #print(taisteal_obj)


        # TODO(iandioch): Remove.
        convert_to_csv(taisteal_obj)

        '''

        countries, airports, cities, uniques = get_location_statistics(doc)

        def print_top_n(title, data, n=10):
            print('{:<40}{:>10}'.format(title, 'Count'))
            print('-'*50)
            for i in range(n):
                if i >= len(data):
                    break
                print('{:>3}. {:<40} {:>4}'.format(
                    i+1, data[i][0], data[i][1]))
            print()
        print_top_n("Countries travelled in", countries, 36)
        print_top_n("Cities travelled in", cities)
        print_top_n("Airports travelled in", airports, 8)
        print_top_n("Unique places visited in countries", uniques, 8)
        print('Total countries:', len(countries))
        print('Total cities:', len(cities))
        '''

        '''
        for d, s in taisteal_obj.get_log():
            if s is None:
                print(None)
                continue
            print(str(d), s, s.parent)
            for a, b in s.visits:
                print('-', str(a), str(b))'''
        save_location_lookup_cache()


        '''print('switzerland')
        t, _ = TaistealLocation.find('Switzerland')
        for a, b in sorted(t.visits):
            print(a, b)'''
