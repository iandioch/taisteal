from travel_leg import TravelLeg

import csv
import sys

CSV_COLUMNS = ['from_loc', 'from_date', 'to_loc', 'to_date']

def process_csv_row(row):
    # row can be assumed to match CSV_COLUMNS types.
    leg = TravelLeg(row)
    print(leg)

def main():
    # Take input from stdin
    csv_reader = csv.reader(sys.stdin)
    for row in csv_reader:
        if len(row) != len(CSV_COLUMNS):
            print('Error: wrong number of columns in csv.')
            continue
        process_csv_row(row)

if __name__ == '__main__':
    main()
