import csv
import json
from collections import defaultdict

import cluster
import database
import location
from taisteal_csv import parse

import pendulum

def _log_legs_from_csv(csv_path, config):
    CSV_COLUMNS = ['from_loc', 'from_date', 'to_loc', 'to_date', 'mode']
    with open(csv_path) as f:
        csv_reader = csv.reader(f)
        for row in csv_reader:
            if len(row) != len(CSV_COLUMNS):
                print('Wrong number of columns:', row)
                continue
            departure_query = row[0]
            departure_datetime = row[1]
            arrival_query = row[2]
            arrival_datetime = row[3]
            mode = row[4]
            log_leg(departure_query, departure_datetime, arrival_query, arrival_datetime, mode, config)


def create_travel_map(config):
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
    csv_loc = '../mo_thaistil/full.csv'
    _log_legs_from_csv(csv_loc, config)

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
    for leg in database.get_legs():
        dep_id = leg['departure_location_id']
        arr_id = leg['arrival_location_id']
        dep = _get_location_dict(database.get_location(dep_id))
        arr = _get_location_dict(database.get_location(arr_id))
        id_to_location[dep['id']] = dep
        id_to_location[arr['id']] = arr

        k = (dep['id'], arr['id'], leg['mode'])
        aggregated_legs[k]['count'] += 1
        aggregated_legs[k]['mode'] = leg['mode']
        if leg['departure_datetime'] >= leg['arrival_datetime']:
            print('Warning: travel leg does not have positive duration: {} ({}) to {} ({})'.format(dep['human_readable_name'], leg['departure_datetime'], arr['human_readable_name'], leg['arrival_datetime']))

        if prev_loc_id is not None:
            # Try to account for places which never appear as an arrival, and only as a departure location.
            if prev_loc_id == dep['id']:
                location_visits[prev_loc_id]['duration'] += (leg['departure_datetime'] - prev_loc_date)
                location_visits[prev_loc_id]['num_visits'] += 1
            else:
                location_visits[dep['id']]['duration'] += (leg['departure_datetime'] - prev_loc_date)/2
                location_visits[dep['id']]['num_visits'] += 1
                location_visits[prev_loc_id]['duration'] += (leg['departure_datetime'] - prev_loc_date)/2
                location_visits[prev_loc_id]['num_visits'] += 1

        prev_loc_id = arr['id']
        prev_loc_date = leg['arrival_datetime']

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

def log_leg(departure_query, departure_datetime, arrival_query, arrival_datetime, mode, config):
    id_ = '{}:"{}"({})-"{}"({})'.format(mode, departure_query, departure_datetime, arrival_query, arrival_datetime)
    try:
        database.save_logged_leg(id_, departure_query, departure_datetime, arrival_query, arrival_datetime, mode)
        departure_id = location.id_for_query(departure_query, config)
        arrival_id = location.id_for_query(arrival_query, config)
        database.save_leg(id_, departure_id, departure_datetime, arrival_id, arrival_datetime, mode)
    except Exception as e:
        print(e, id_)
