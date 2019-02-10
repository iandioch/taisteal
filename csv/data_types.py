import json
from collections import defaultdict

from location import Location

import pendulum

class TravelLegPoint:
    '''A (location, datetime) pair representing a single arrival or departure.'''

    def __init__(self, loc, date):
        '''Arguments:

        - loc (str): A raw address.
        - date (str): A datetime'''
        self.loc, res = Location.find(loc)
        print("Found location '{}' with result '{}'".format(loc, res))
        self.raw_date = date

        # TODO(iandioch): Parse date.
        self.date = pendulum.parse(self.raw_date)

    def __repr__(self):
        return 'Point("{}")'.format(self.loc)

class TravelLeg:
    '''A single leg of travel, eg. one flight, or one bus journey.'''

    def __init__(self, csv_row):
        self.dep = TravelLegPoint(csv_row[0], csv_row[1])
        self.arr = TravelLegPoint(csv_row[2], csv_row[3])

        self.duration = self.arr.date - self.dep.date

    def __repr__(self):
        return 'Leg({}, {})'.format(self.dep,
                                    self.arr)

    def __gt__(self, other):
        return self.dep.date > other.dep.date

class TravelLegSeries:
    '''A number of consecutive travel legs.'''

    def __init__(self):
        self.legs = []
        self._compute_statistics()

    def add_leg(self, leg):
        self.legs.append(leg)
        self.legs.sort()
        self.stats.add_travel_leg(leg)

    def _compute_statistics(self):
        self.stats = TravelStatistics()

class TravelStatistics:
    def __init__(self):
        self.num_legs = 0
        self.country_to_num_visits = defaultdict(int)
        self.locality_to_num_visits = defaultdict(int)
        # TODO(iandioch): Find better way of initialising a pendulum.Period of zero.
        self.total_travel_time = pendulum.min - pendulum.min
        # TODO(iandioch): Use a heapq to get the N longest legs instead.
        self.longest_leg = None

    def add_travel_leg(self, leg):
        self.add_travel_leg_point(leg.dep)
        self.add_travel_leg_point(leg.arr)
        self.num_legs += 1
        self.total_travel_time += leg.duration
        if self.longest_leg is None or leg.duration > self.longest_leg.duration:
            self.longest_leg = leg

    def add_travel_leg_point(self, point):
        print('Adding stats from travel leg point: "{}" on {}'.format(point.loc, point.date))
        for component in point.loc.components:
            if 'country' in component['types']:
                self.country_to_num_visits[component['long_name']] += 1
            if 'locality' in component['types']:
                s = '{}, {}'.format(component['long_name'], point.loc.country)
                self.locality_to_num_visits[s] += 1

    def __repr__(self):
        country_visits = ['{}: {}'.format(country, self.country_to_num_visits[country])
            for country in sorted(self.country_to_num_visits, key=lambda x:-self.country_to_num_visits[x])]
        locality_visits = ['{}: {}'.format(locality, self.locality_to_num_visits[locality])
            for locality in sorted(self.locality_to_num_visits, key=lambda x:-self.locality_to_num_visits[x])]
        return ('Num legs: {}\n' +
            'Longest leg: {} (duration: {})\n' +
            'Total travel time: {}\n' +
            'Country to num visits: {}\n' + 
            'Locality to num visits: {}\n').format(self.num_legs,
                                                   self.longest_leg,
                                                   self.longest_leg.duration,
                                                   self.total_travel_time,
                                                   country_visits,
                                                   locality_visits)
