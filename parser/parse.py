import json
import sys

import jsonschema

from trip_element import Element


DEFAULT_SCHEMA_LOCATION = 'taisteal_schema.json'

'''
Validates the input json against the taisteal JSON schema
at the given path. This ensures that the input JSON is in
the right format.
'''
def validate_json_doc(json_data, json_schema_path):
    with open(json_schema_path, 'r') as f:
        schema = json.load(f)
    jsonschema.validate(json_data, schema)

'''
Returns a python object with the data contained in the
input taisteal json document.
'''
def parse_json(json_data):
    return Element.parse(json_data)

if __name__ == '__main__':

    json_schema_path = DEFAULT_SCHEMA_LOCATION
    if len(sys.argv) > 1:
        json_schema_path = ' '.join(sys.argv[1:])

    raw_data = sys.stdin.read()
    json_data = json.loads(raw_data)
    validate_json_doc(json_data, json_schema_path)
    parse_json(json_data)
