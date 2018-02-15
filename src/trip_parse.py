import json
from jsonschema import validate

with open('trip_element_schema.json', 'r') as f:
    schema = json.load(f)

with open('example_trips.json', 'r') as f:
    doc = json.load(f)

validate(doc, schema)
