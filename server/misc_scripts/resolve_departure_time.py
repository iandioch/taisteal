"""Previously departure_datetime was set to arrival_datetime, this resolves it."""
import json

DUMP_FILEPATH = '.dump_2025_07_14.json'
GOLDEN_FILEPATH = '.manually_edited.expanded.dump_2025_07_14.json'

def main():
    with open(DUMP_FILEPATH) as f:
        d = json.load(f)

        id_to_addr = {}
        for id_ in d['locations']:
            addr = d['locations'][id_]['address']
            id_to_addr[id_] = addr

        dump_legs = []

        for leg in d['legs']:
            try:
                arrival_query = id_to_addr[leg['arrival_id']]
                arrival_datetime = leg['arrival_datetime_str']
                departure_query = id_to_addr[leg['departure_id']]
                departure_datetime = leg['departure_datetime_str']
                dump_legs.append({
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


    with open(GOLDEN_FILEPATH) as f:
        d = json.load(f)
        keys = ['arrival_query', 'arrival_datetime', 'departure_query']
        out = []
        for leg in d:
            for dump_leg in dump_legs:
                if all(leg[k] == dump_leg[k] for k in keys):
                    leg['departure_datetime'] = dump_leg['departure_datetime']
                    out.append(leg)

    with open('.fixed' + GOLDEN_FILEPATH, 'w') as f:
        json.dump(out, f, indent=2, ensure_ascii=False)


if __name__ == '__main__':
    main()
