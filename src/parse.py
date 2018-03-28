# Copied from src/trip_parse.py, modified to use Taistil types instead of raw objects.

import json
import os
import sys
import time

from collections import defaultdict

import requests

from jsonschema import validate

from taistil_types import *
from location import TaistilLocation, load_location_lookup_cache, save_location_lookup_cache

SECONDS_SLEEP_ON_RATE_LIMITING = 4
SECONDS_SLEEP_BETWEEN_REQUESTS = 0.66
ESTIMATED_RATE_LIMIT_TIME_MULTIPLE = 2


'''
Given a Taistil element and the loaded location data, output stats
on countries visited.
'''


def get_location_statistics(taistil_data):
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
    locations = get_location_list(taistil_data)
    for location in locations:
        components = TaistilLocation.find(location).components
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


def parse_taistil_json(doc):
    return TripElement.parse(doc)


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
        print('Input conforms to JSON schema ✔')
        taistil_obj = parse_taistil_json(doc)
        print(taistil_obj)
        load_location_lookup_cache()

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
        save_location_lookup_cache()
