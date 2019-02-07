import location
from data_types import TravelLeg

import csv
import sys

CSV_COLUMNS = ['from_loc', 'from_date', 'to_loc', 'to_date', 'mode', 'note']

def process_csv_row(row):
    # row can be assumed to match CSV_COLUMNS types.
    leg = TravelLeg(row)
    print(leg)

def main():
    location.load_location_lookup_cache()
    # Take input from stdin
    csv_reader = csv.reader(sys.stdin)
    for row in csv_reader:
        if len(row) != len(CSV_COLUMNS):
            print('Error: wrong number of columns in csv.')
            continue
        process_csv_row(row)

if __name__ == '__main__':
    main()
