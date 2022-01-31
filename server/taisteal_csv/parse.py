from .data_types import TravelLeg, TravelLegSeries

import time
import csv
import sys

CSV_COLUMNS = ['from_loc', 'from_date', 'to_loc', 'to_date', 'mode']

def parse_travel_leg(row, config):
    # row can be assumed to match CSV_COLUMNS types.
    return TravelLeg(row, config)

def parse(loc, config):
    print('Parsing taisteal CSV.')
    travel_legs = TravelLegSeries()
    with open(loc) as f:
        csv_reader = csv.reader(f)
        row_number = 0
        start_time = time.time()
        for row in csv_reader:
            if len(row) != len(CSV_COLUMNS):
                print('Error: wrong number of columns in CSV.')
            leg = parse_travel_leg(row, config)
            travel_legs.add_leg(leg, config)
            if row_number % 50 == 0:
                end_time = time.time()
                print('Parsed up to row', row_number, 'in', end_time - start_time, 'seconds.')
                start_time = time.time()
            row_number += 1
    return travel_legs

def main():
    travel_legs = TravelLegSeries()
    # Take input from stdin
    csv_reader = csv.reader(sys.stdin)
    for row in csv_reader:
        if len(row) != len(CSV_COLUMNS):
            print('Error: wrong number of columns in csv.')
            continue
        leg = parse_travel_leg(row, {})
        travel_legs.add_leg(leg, {})
    print(travel_legs.stats)

if __name__ == '__main__':
    main()
