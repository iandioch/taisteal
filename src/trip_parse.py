import json
import sys

from jsonschema import validate

if __name__ == '__main__':
    if len(sys.argv) != 3:
        print('Please provide 2 files, separated by a space.')
        print('The first file should be the trip element schema file.')
        print('The second file should be the document you want to parse.')
    else:
        with open(sys.argv[1], 'r') as f:
            schema = json.load(f)
        with open(sys.argv[2], 'r') as f:
            doc = json.load(f)

        validate(doc, schema)
