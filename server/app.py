import json

import time
from collections import defaultdict
from math import radians, asin, sqrt, cos, sin

from taisteal_csv import parse
import cluster
import database

import pendulum
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

    id_to_location = {}
    location_visits = defaultdict(lambda: {
        'num_visits': 0,
        'duration': pendulum.now() - pendulum.now()
    })
    aggregated_legs = defaultdict(lambda: {
        'count': 0,
        'mode': None
    })
    prev_loc_id = None
    prev_loc_date = None
    for leg in travel_leg_series.legs:
        dep = _get_location_dict(leg.dep.loc)
        arr = _get_location_dict(leg.arr.loc)
        id_to_location[dep['id']] = dep
        id_to_location[arr['id']] = arr

        k = (dep['id'], arr['id'], leg.mode)
        aggregated_legs[k]['count'] += 1
        aggregated_legs[k]['mode'] = leg.mode
        if leg.dep.date >= leg.arr.date:
            print('Warning: travel leg does not have positive duration: {} ({}) to {} ({})'.format(leg.dep.loc['name'], leg.dep.date, leg.arr.loc['name'], leg.arr.date))

        if prev_loc_id is not None:
            # Try to account for places which never appear as an arrival, and only as a departure location.
            if prev_loc_id == dep['id']:
                location_visits[prev_loc_id]['duration'] += (leg.dep.date - prev_loc_date)
                location_visits[prev_loc_id]['num_visits'] += 1
            else:
                location_visits[dep['id']]['duration'] += (leg.dep.date - prev_loc_date)/2
                location_visits[dep['id']]['num_visits'] += 1
                location_visits[prev_loc_id]['duration'] += (leg.dep.date - prev_loc_date)/2
                location_visits[prev_loc_id]['num_visits'] += 1

        prev_loc_id = arr['id']
        prev_loc_date = leg.arr.date

    legs = []
    for k in aggregated_legs:
        dep_id, arr_id, _ = k
        mode = aggregated_legs[k]['mode']
        count = aggregated_legs[k]['count']
        legs.append({
            'dep': id_to_location[dep_id],
            'arr': id_to_location[arr_id],
            'mode': mode,
            'count': count,
        })
    visits = []
    for id_ in location_visits:
        visits.append({
            'location': id_to_location[id_],
            'num_visits': location_visits[id_]['num_visits'],
            'days': int(0.5 + location_visits[id_]['duration'].total_days()),
            'hours': max(1, int(0.5 + location_visits[id_]['duration'].total_hours())),
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
