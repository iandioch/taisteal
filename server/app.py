import json

import time
from collections import defaultdict
from math import radians, asin, sqrt, cos, sin

from taisteal_csv import parse
from user import create_travel_map
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

TRAVEL_MAP_RESPONSE = None
@app.route('/api/travel_map')
def serve_travel_map():
    start_time = time.time()
    global TRAVEL_MAP_RESPONSE
    if not TRAVEL_MAP_RESPONSE:
        TRAVEL_MAP_RESPONSE = create_travel_map(config)
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
