import json
import sys

import jsonschema

def validate_json_doc(json_data, json_schema_path):
    with open(json_schema_path, 'r') as f:
        schema = json.load(f)
    jsonschema.validate(json_data, schema)

if __name__ == '__main__':
    json_schema_path = 'taisteal_schema.json'
    if len(sys.argv) > 1:
        json_schema_path = ' '.join(sys.argv[1:])

    raw_data = sys.stdin.read()
    json_data = json.loads(raw_data)
    validate_json_doc(json_data, json_schema_path)
