import csv
import json
import uuid
from collections import defaultdict

import cluster
import database
import location

import pendulum

_CACHED_MAP_DATA = None
_NEED_TO_REFRESH_CACHE = False

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
            'id': loc['id'],
            'address': loc['address'],
            'type': loc['type'], # eg. 'CLUSTER', 'STATION', 'TOWN'
            'region': loc['region'], # used to cluster close places, and to give names to those clusters.
            'country': loc['country_name'], # used for stats.
            'country_code': loc['country_code'],
            'human_readable_name': loc['name'], # no guarantee of uniqueness
        }

    database.regenerate_tables()
    csv_loc = '../mo_thaistil/full.csv'
    #_log_legs_from_csv(csv_loc, config)

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

    # The travel map does not have access to individual leg_ids, so augment the
    # legs in the collection with the dep_id and arr_id.
    def get_collections_for_travel_map():
        collections = get_collections()
        for collection in collections:
            total_distance = 0
            for part in collection['parts']:
                if part['note'] or part['image_url']:
                    continue
                leg_id = part['leg_id']
                leg = database.get_leg(leg_id)
                part['leg'] = leg
                dep_id = leg['departure_location_id']
                arr_id = leg['arrival_location_id']
                part['dep'] = id_to_location[dep_id]
                part['arr'] = id_to_location[arr_id]
                distance = cluster.estimated_distance_km(
                        id_to_location[dep_id]['lat'],
                        id_to_location[dep_id]['lng'],
                        id_to_location[arr_id]['lat'],
                        id_to_location[arr_id]['lng'])
                part['distance'] = int(round(distance))
                total_distance += distance
            collection['meta'] = {
                'distance': int(round(total_distance)),
            }
        return collections

    data = {
        'legs': legs,
        'visits': visits + cluster.get_clusters(visits),
        'collections': get_collections_for_travel_map(),
    }
    s = json.dumps(data, indent=4)
    return s

def serve_travel_map(config):
    global _CACHED_MAP_DATA
    if (not _CACHED_MAP_DATA) or _NEED_TO_REFRESH_CACHE:
        print('No cached map, creating one.')
        _CACHED_MAP_DATA = create_travel_map(config)
    return _CACHED_MAP_DATA 

def log_leg(departure_query, departure_datetime, arrival_query, arrival_datetime, mode, config):
    def _create_leg_id():
        return uuid.uuid4().hex
    id_ = _create_leg_id()
    try:
        database.save_logged_leg(id_, departure_query, departure_datetime, arrival_query, arrival_datetime, mode)
        departure_id = location.id_for_query(departure_query, config)
        arrival_id = location.id_for_query(arrival_query, config)
        database.save_leg(id_, departure_id, departure_datetime, arrival_id, arrival_datetime, mode)
    except Exception as e:
        print(e, id_)

# returns collections info in a vacuum. Collection legs reference leg_ids.
def get_collections():
    collections = []
    for collection in database.get_collections():
        id_ = collection['id']
        obj = {
            'id': id_,
            'title': collection['title'],
            'parts': []
        }
        for part in database.get_collection_parts(id_):
            obj['parts'].append(part)
        collections.append(obj)
    return collections

def get_user_data():
    locations = {}

    def _maybe_add_location(id_):
        if id_ in locations:
            return
        location = database.get_location(id_)
        locations[id_] = location

    legs = []
    for leg in database.get_legs():
        print(leg)
        legs.append({
            'id': leg['id'],
            'arrival_id': leg['arrival_location_id'],
            'departure_id': leg['departure_location_id'],
            'arrival_datetime_str': leg['arrival_datetime'].isoformat(),
            'departure_datetime_str': leg['departure_datetime'].isoformat(),
        })
        _maybe_add_location(leg['arrival_location_id'])
        _maybe_add_location(leg['departure_location_id'])
    return {
        'legs': legs,
        'locations': locations,
        'collections': get_collections(),
    }
