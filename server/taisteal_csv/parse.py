from .data_types import TravelLeg, TravelLegSeries
from .location import load_location_lookup_cache

import csv
import sys

CSV_COLUMNS = ['from_loc', 'from_date', 'to_loc', 'to_date', 'mode']

def parse_travel_leg(row):
    # row can be assumed to match CSV_COLUMNS types.
    return TravelLeg(row)

def parse(loc):
    travel_legs = TravelLegSeries()
    load_location_lookup_cache()
    with open(loc) as f:
        csv_reader = csv.reader(f)
        for row in csv_reader:
            if len(row) != len(CSV_COLUMNS):
                print('Error: wrong number of columns in CSV.')
            leg = parse_travel_leg(row)
            travel_legs.add_leg(leg)
    return travel_legs

def main():
    travel_legs = TravelLegSeries()
    load_location_lookup_cache()
    # Take input from stdin
    csv_reader = csv.reader(sys.stdin)
    for row in csv_reader:
        if len(row) != len(CSV_COLUMNS):
            print('Error: wrong number of columns in csv.')
            continue
        leg = parse_travel_leg(row)
        travel_legs.add_leg(leg)
    print(travel_legs.stats)

if __name__ == '__main__':
    main()
