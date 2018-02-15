import json
import sys

from jsonschema import validate

if __name__ == '__main__':
    if len(sys.argv) == 1:
        print('Please provide as an argument the location of the trip element json schema')
        print('Provide the document you want to parse as stdin.')
    else:
        schema_file = ' '.join(sys.argv[1:])
        with open(schema_file, 'r') as f:
            schema = json.load(f)
        doc = json.load(sys.stdin)

        validate(doc, schema)
        print('Input conforms to JSON schema ✔')
