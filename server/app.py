import json

import time
from collections import defaultdict
from math import radians, asin, sqrt, cos, sin

import cluster
import database
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
    resp = user.create_travel_map(config)
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

def main():
    app.run(port=1916)

if __name__ == '__main__':
    main()
