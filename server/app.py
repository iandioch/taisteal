import json

from collections import defaultdict
from math import radians

from taisteal_csv import parse
from flask import Flask
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

with open('config.json') as f:
    config = json.load(f)

@app.route('/')
def serve_root():
    return 'Hello World!'

@app.route('/api/travel_map')
def serve_travel_map():
    def _get_location_dict(loc):
        # Turn a Location object into a json-dumpable form.
        return {
            'lat': loc.latitude,
            'lng': loc.longitude,
            'name': loc.address, # unique
            'type': loc.type,
            'region': loc.region , # used to cluster close places.
            'human_readable_name': loc.human_readable_name, # no guarantee of uniqueness
        }

    loc = '../../mo_thaistil/2018_02_20_Lugano.csv'
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
        #legs.append({
        #    'dep': departure_loc,
        #    'arr': arrival_loc,
        #    'mode': leg.mode,
        #})
        num_visits[departure_loc['name']] += 1
        num_visits[arrival_loc['name']] += 1
        name_to_loc[departure_loc['name']] = departure_loc
        name_to_loc[arrival_loc['name']] = arrival_loc 
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


    def add_location_to_cluster(cluster, v):
        print('Adding {} to cluster {}'.format(v, cluster))
        # TODO(iandioch): num_visits will be incorrect here,
        # because it is estimated from separate departures and
        # arrivals from a place, but if it is a journey between
        # two places being combined, that confuses everything.
        cluster['num_visits'] += v['num_visits']
        # Also not correct, as two half-day visits will each have
        # v['days'] = 1, and they will sum to 2 instead of to 1.
        cluster['days'] += v['days']
        v['cluster'] = cluster['location']['name']
    
    clusters = {}
    CLUSTER_THRESHOLD_KM = 25
    for i in range(len(visits)-1):
        for j in range(i+1, len(visits)):
                v1 = visits[i]
                v2 = visits[j]
                v1_loc = v1['location']
                v2_loc = v2['location']
                if v1_loc['region'] == v2_loc['region']:
                    if 'cluster' in v1 and 'cluster' in v2:
                        continue
                    elif 'cluster' in v1:
                        cluster = clusters[v1_loc['region']]
                        add_location_to_cluster(cluster, v2)
                        continue
                    elif 'cluster' in v2:
                        v1['cluster'] = v2['cluster']
                        add_location_to_cluster(cluster, v1)
                        continue

                    if v1_loc['region'] in clusters:
                        cluster = v1_loc['region']
                    else:
                        # Create a new cluster.
                        cluster = {
                            'location': {
                                'lat': v1_loc['lat'],
                                'lng': v1_loc['lng'],
                                'name': 'CLUSTER("{}")'.format(v1_loc['region']),
                                'type': 'CLUSTER',
                                'region': v1_loc['region'],
                                'human_readable_name': v1_loc['region'],
                            },
                            'num_visits': 0,
                            'days': 0,
                        }

                    add_location_to_cluster(cluster, v1)
                    add_location_to_cluster(cluster, v2)
                    clusters[v1_loc['region']] = cluster

    data = {
        'legs': legs,
        'visits': visits + list(clusters.values()),
    }
    s = json.dumps(data, indent=4)
    print(s)
    return s

@app.route('/api/get_mapbox_token')
def serve_get_mapbox_token():
    return json.dumps({
        'token': config['mapbox_token']
    })

def main():
    app.run(port=1916)

if __name__ == '__main__':
    main()
