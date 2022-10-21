import json

import database
import location_database_utils

import requests

def location(id_):
    return database.get_location(id_)

def id_for_query(query, config):
    # From the given query, gets the matching ID (if it exists). If it doesn't
    # yet exist, performs the query, and returns the id_ to fetch the result.

    def lookup(query, api_key):
        print('Performing new location lookup for query {}'.format(query))
        u = 'https://maps.googleapis.com/maps/api/geocode/json?address={}&key={}'
        resp = json.loads(requests.get(u.format(query, api_key)).text)
        if resp['status'] != 'OK':
            return resp, None
        for result in resp['results']:
            return result
            return None, loc
        return 'No results', None

    id_ = database.get_id_for_query(query)
    if id_:
        return id_

    print('No existing location ID found for "{}"'.format(query))

    parsed_result = lookup(query, config['google_api_key'])
    print('Got parsed result:', parsed_result)
    database.save_location_lookup(query, json.dumps(parsed_result))

    id_ = location_database_utils.get_id_for_location_lookup(query, parsed_result)
    print('Saving ID {} for query {}'.format(id_, query))
    database.save_id_for_query(id_, query)

    if database.get_location(id_):
        print('Database already has location info for id {}'.format(id_))
        # The location was already fetched. This might happen if previously 
        # 'Zurich HB' was added, but this time, 'Zurich Main Station' was the
        # query.
        return id_

    location_data = location_database_utils.create_locations_row_for_lookup(parsed_result)
    print('Saving location info for ID {}'.format(id_))
    database.save_location(id_, location_data)
    return id_
