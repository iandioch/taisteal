import json
from collections import defaultdict

import location

import pendulum

class TravelLegPoint:
    '''A (location, datetime) pair representing a single arrival or departure.'''

    def __init__(self, loc, date, config):
        '''Arguments:

        - loc (str): A raw address.
        - date (str): A datetime'''
        self.id = location.id_for_query(loc, config)
        self.loc = location.location(self.id)
        self.date = pendulum.parse(date)

    def __repr__(self):
        return 'Point("{}")'.format(self.loc)

class TravelLeg:
    '''A single leg of travel, eg. one flight, or one bus journey.'''

    def __init__(self, csv_row, config):
        self.dep = TravelLegPoint(csv_row[0], csv_row[1], config)
        self.arr = TravelLegPoint(csv_row[2], csv_row[3], config)
        self.mode = csv_row[-1]

        self.duration = self.arr.date - self.dep.date

    def __repr__(self):
        return 'Leg({}, {})'.format(self.dep,
                                    self.arr)

    def __gt__(self, other):
        return self.dep.date > other.dep.date

class TravelLegSeries:
    '''A number of consecutive travel legs.'''

    def __init__(self):
        self.added_legs = []
        self.legs = []

    def add_leg(self, leg, config):
        self.added_legs.append(leg)
        self.added_legs.sort()
        # TODO(iandioch): We probably don't need to differentiate between .added_legs and .legs .
        self.legs.append(leg)
