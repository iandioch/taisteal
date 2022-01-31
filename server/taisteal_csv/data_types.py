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
        #self.loc, res = Location.find(loc, config)
        self.id = location.id_for_query(loc, config)
        self.loc = location.location(self.id)
        self.raw_date = date
        self.date = pendulum.parse(self.raw_date)

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
        self._compute_statistics()

    def add_leg(self, leg, config):
        self.added_legs.append(leg)
        self.added_legs.sort()
        # TODO(iandioch): We probably don't need to differentiate between .added_legs and .legs .
        self.legs.append(leg)
        # TODO(iandioch): This func call is where durations and num visits are calculated.
        # This would better be moved to somewhere (front end?) or re-orged so we can
        # calculate combined numbers for regions, etc.
        self.stats.add_travel_leg(leg)

    def _compute_statistics(self):
        self.stats = TravelStatistics()

class TravelStatistics:
    def __init__(self):
        self.num_legs = 0
        self.country_to_num_visits = defaultdict(int)
        self.locality_to_num_visits = defaultdict(int)
        self.locality_to_time_spent = defaultdict(lambda: pendulum.now() - pendulum.now())
        # TODO(iandioch): Find better way of initialising a pendulum.Period of zero.
        self.total_travel_time = pendulum.now() - pendulum.now()
        # TODO(iandioch): Use a heapq to get the N longest legs instead.
        self.longest_leg = None
        self.country_to_visit_duration = defaultdict(lambda: pendulum.now() - pendulum.now())
        self._prev_loc = None

    def add_travel_leg(self, leg):
        '''For self.country_to_visit_duration to be accurate, legs should be added in chronological order.'''
        self.add_travel_leg_point(leg.dep)

        if self._prev_loc is not None:
            self.country_to_visit_duration[leg.dep.loc['country_name']] += (leg.dep.date - self._prev_loc.date)
            self.locality_to_time_spent[leg.dep.loc['address']] += (leg.dep.date - self._prev_loc.date)

        self.add_travel_leg_point(leg.arr)

        if leg.dep.loc['country_name'] == leg.arr.loc['country_name']:
            self.country_to_visit_duration[leg.dep.loc['country_name']] += (leg.arr.date - leg.dep.date)
        self._prev_loc = leg.arr

        self.num_legs += 1
        self.total_travel_time += leg.duration
        if self.longest_leg is None or leg.duration > self.longest_leg.duration:
            self.longest_leg = leg

    def add_travel_leg_point(self, point):
        if point.loc is None:
            print('ERROR, point.loc is none for point:', point)
            return
        self.country_to_num_visits[point.loc['country_name']] += 1
        if point.loc['type'] == 'TOWN':
            self.locality_to_num_visits[point.loc['name']] += 1

    def __repr__(self):
        country_visits = ['{}: {}'.format(country, self.country_to_num_visits[country])
            for country in sorted(self.country_to_num_visits, key=lambda x:-self.country_to_num_visits[x])]
        locality_visits = ['{}: {}'.format(locality, self.locality_to_num_visits[locality])
            for locality in sorted(self.locality_to_num_visits, key=lambda x:-self.locality_to_num_visits[x])]
        country_durations = ['{}: {}'.format(country, self.country_to_visit_duration[country])
            for country in sorted(self.country_to_visit_duration, key=lambda x:-self.country_to_visit_duration[x])]
        return ('Num legs: {}\n' +
            'Longest leg: {} (duration: {})\n' +
            'Total travel time: {}\n' +
            'Country to num visits: {}\n' + 
            'Country to visit duration: {}\n' + 
            'Locality to num visits: {}\n').format(self.num_legs,
                                                   self.longest_leg,
                                                   self.longest_leg.duration,
                                                   self.total_travel_time,
                                                   country_visits,
                                                   country_durations,
                                                   locality_visits)
