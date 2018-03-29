import json
import requests
import sys

MODES = ["0", "1", "AEROPLANE", "3", "TRAIN",
         "5", "TAXI", "CAR", "8", "BUS", "MINIBUS"]


def convert_trips(data):
    converted_data = {
        'note': 'Imported from globtrottr.com',
        'elements': [],
    }
    for trip_messy in data['travels']:
        trip = trip_messy['trip']
        mode = trip['trip_mode']['id']
        mode_str = MODES[mode]
        trip_element = {
            'mode': mode_str,
            'elements': [],
            'note': 'Imported from globtrottr.com',
        }
        for stop in trip['stops']:
            location = stop['place']['full_name']
            datetime = None
            if 'departed_at' in stop:
                datetime = stop['departed_at']
            else:
                datetime = stop['arrived_at']
            trip_element['elements'].append({
                'location': location,
                'datetime': datetime,
            })
        if mode_str == str(mode):
            # This is one of the modes that I'm not sure of the translation for.
            # ie. It isn't in the MODES list.
            continue
        converted_data['elements'].append(trip_element)
    return converted_data


if __name__ == "__main__":
    if len(sys.argv) < 2 or sys.argv[1] not in ('-u', '-f'):
        print("Please run the programme as such: 'python globtrottr.py -u username'" +
              " to load the user's data from the web, or 'python globtrottr.py -f file.json'" +
              " to use a local file.")
    else:
        data = None
        if sys.argv[1] == '-u':
            username = sys.argv[2]
            link = f"http://api.globtrottr.com/user/{username}"
            # verify=False means do not verify the SSL cert.
            # This is important as globtrottr.com's certificate is expired.
            response = requests.get(link, verify=False)
            data = json.loads(response.text)
        else:
            with open(sys.argv[2], 'r', encoding='utf-8') as f:
                data = json.load(f)
        converted = convert_trips(data)
        print(json.dumps(converted, indent=4, ensure_ascii=False))
