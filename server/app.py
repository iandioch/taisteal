import json

import time
from collections import defaultdict
from math import radians, asin, sqrt, cos, sin

import cluster
import database
import location
import user

import pendulum
from flask import Flask, request
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

with open('config.json') as f:
    config = json.load(f)

@app.route('/')
def serve_root():
    return 'Hello World!'

@app.route('/api/travel_map', methods=['GET'])
def serve_travel_map():
    start_time = time.time()
    resp = user.serve_travel_map(config)
    end_time = time.time()
    print('Time to serve request {0:.10f} seconds.'.format(end_time - start_time))
    return resp

@app.route('/api/get_user_data', methods=['GET'])
def serve_get_user_data():
    private_key = config['private_key']
    if request.args.get('key') != private_key:
        return {}
    return json.dumps(user.get_user_data())

@app.route('/api/save_collection', methods=['POST'])
def save_collection():
    private_key = config['private_key']
    if request.args.get('key') != private_key:
        print('Bad key', request.args.get('key'))
        return {}
    print(request.get_json())
    collection = request.get_json()
    database.save_collection(collection)
    return request.data

@app.route('/api/get_location_id', methods=['GET'])
def serve_get_location_id_query():
    private_key = config['private_key']
    if request.args.get('key') != private_key:
        return {}

    print('Getting ID for query {}'.format(request.args.get('query')))
    id_ = location.id_for_query(request.args.get('query'), config)
    return json.dumps({
        'id': id_,
    })

@app.route('/api/get_location', methods=['GET'])
def serve_get_location_query():
    private_key = config['private_key']
    if request.args.get('key') != private_key:
        return {}
    id_ = request.args.get('id')
    print('Getting location data for ID {}'.format(id_))
    location_resp = database.get_location(id_)
    return json.dumps({
        'location': location_resp,
    })

@app.route('/api/save_leg', methods=['POST'])
def save_leg():
    private_key = config['private_key']
    if request.args.get('key') != private_key:
        return {}
    leg = request.get_json()

    print('APP: Logging leg: {}'.format(json.dumps(leg)))
    user.log_leg(leg['departure_query'], leg['departure_datetime'], leg['arrival_query'], leg['arrival_datetime'], leg['mode'], config)
    return request.data

@app.route('/api/get_legs', methods=['GET'])
def serve_get_legs_query():
    private_key = config['private_key']
    if request.args.get('key') != private_key:
        return {}
    # TODO: these offset and limit args are passed directly to the DB query, it's an SQL injection opportunity.
    offset = request.args.get('offset')
    limit = request.args.get('limit')
    ret = user.serve_legs_paginated(offset=offset, limit=limit)
    print(ret)
    return ret

def main():
    app.run(host='0.0.0.0', port=1916)

if __name__ == '__main__':
    main()
