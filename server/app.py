import json

import time
from collections import defaultdict
from math import radians, asin, sqrt, cos, sin

from taisteal_csv import parse
import cluster
import database
from flask import Flask
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

with open('config.json') as f:
    config = json.load(f)

@app.route('/')
def serve_root():
    return 'Hello World!'


def create_travel_map():
    def _get_location_dict(loc):
        # Turn a Location object into a json-dumpable form.
        return {
            'lat': loc['latitude'],
            'lng': loc['longitude'],
            'id': loc['address'], # TODO(iandioch): Should use loc['id'] instead, once it is no longer user-visible.
            'address': loc['address'],
            'type': loc['type'], # eg. 'CLUSTER', 'STATION', 'TOWN'
            'region': loc['region'], # used to cluster close places, and to give names to those clusters.
            'country': loc['country_name'], # used for stats.
            'country_code': loc['country_code'],
            'human_readable_name': loc['name'], # no guarantee of uniqueness
        }

    database.regenerate_tables()
    loc = '../mo_thaistil/full.csv'
    travel_leg_series = parse.parse(loc, config)

    legs = []
    num_visits = defaultdict(int)
    time_spent = defaultdict(int)
    name_to_loc = {}
    leg_count_dict = defaultdict(int)
    leg_obj_dict = {}
    for leg in travel_leg_series.legs:
        departure_loc = _get_location_dict(leg.dep.loc)
        arrival_loc = _get_location_dict(leg.arr.loc)
        k = (departure_loc['lat'], departure_loc['lng'], arrival_loc['lat'], arrival_loc['lng'])
        leg_count_dict[k] += 1
        leg_obj_dict[k] = (departure_loc, arrival_loc, leg.mode)
        num_visits[departure_loc['id']] += 1
        num_visits[arrival_loc['id']] += 1
        name_to_loc[departure_loc['id']] = departure_loc
        name_to_loc[arrival_loc['id']] = arrival_loc 
    for leg in leg_count_dict:
        departure_loc, arrival_loc, mode = leg_obj_dict[leg]
        n = leg_count_dict[leg]
        legs.append({
            'dep': departure_loc,
            'arr': arrival_loc,
            'mode': mode,
            'count': n,
        })

    stats = travel_leg_series.stats
    for v in num_visits:
        time_spent[v] = stats.locality_to_time_spent[v].days

    visits = []
    for v in sorted(num_visits, key=lambda x:num_visits[x]):
        visits.append({
            'location': name_to_loc[v],
            'num_visits': max(1, num_visits[v]//2),
            'days': time_spent[v],
        })

    data = {
        'legs': legs,
        'visits': visits + cluster.get_clusters(visits),
    }
    s = json.dumps(data, indent=4)
    return s

TRAVEL_MAP_RESPONSE = None
@app.route('/api/travel_map')
def serve_travel_map():
    start_time = time.time()
    global TRAVEL_MAP_RESPONSE
    if not TRAVEL_MAP_RESPONSE:
        TRAVEL_MAP_RESPONSE = create_travel_map()
    end_time = time.time()
    print('Time to serve request {0:.10f} seconds.'.format(end_time - start_time))
    return TRAVEL_MAP_RESPONSE

@app.route('/api/get_mapbox_token')
def serve_get_mapbox_token():
    return json.dumps({
        'token': config['mapbox_token']
    })

def main():
    app.run(port=1916)

if __name__ == '__main__':
    main()
