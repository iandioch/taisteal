"""Load a json file of legs and log them."""

import json
import requests

FILEPATH = '.fixed.manually_edited.expanded.dump_2025_07_14.json'
ENDPOINT = 'http://travel.needs.money/api/save_leg?key=whiskey'


def main():
    with open(FILEPATH) as f:
        d = json.load(f)

        for leg in d:
            data = leg
            print(data)
            r = requests.post(ENDPOINT, json=data)
            print(r.status_code, r.reason, r.text)

if __name__ == '__main__':
    main()
