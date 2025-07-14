"""Hopefully this tool won't be needed again.

Tool to try to re-build requests to log legs, based on the legs in a json obj
grabbed from the Chrome debug log."""

import json

FILEPATH = '.dump_2025_07_14.json'

def main():
    with open(FILEPATH) as f:
        d = json.load(f)

        id_to_addr = {}
        for id_ in d['locations']:
            addr = d['locations'][id_]['address']
            id_to_addr[id_] = addr

        out = []

        for leg in d['legs']:
            try:
                arrival_query = id_to_addr[leg['arrival_id']]
                arrival_datetime = leg['arrival_datetime_str']
                departure_query = id_to_addr[leg['departure_id']]
                departure_datetime = leg['departure_datetime_str']
                out.append({
                    'arrival_query': arrival_query,
                    'arrival_datetime': arrival_datetime,
                    'departure_query': departure_query,
                    'departure_datetime': departure_datetime,
                    'mode': 'CAR',
                })
            except Exception as e:
                print(leg)
                print(e)
                break

    with open('.expanded' + FILEPATH, 'w') as f:
        json.dump(out, f, indent=2, ensure_ascii=False)


if __name__ == '__main__':
    main()
