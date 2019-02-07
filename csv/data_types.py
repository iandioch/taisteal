from location import Location

class TravelLegPoint:
    '''An arrival or departure (location, datetime) pair.'''

    def __init__(self, loc, date):
        '''Arguments:

        - loc (str): A raw address.
        - date (str): A datetime'''
        self.loc, res = Location.find(loc)
        print("Found location '{}' with result '{}'".format(loc, res))
        self.raw_date = date

    def __repr__(self):
        return 'Point("{}")'.format(self.loc)

class TravelLeg:

    def __init__(self, csv_row):
        self.dep = TravelLegPoint(csv_row[0], csv_row[1])
        self.arr = TravelLegPoint(csv_row[2], csv_row[3])

    def __repr__(self):
        return 'Leg({}, {})'.format(self.dep,
                                    self.arr)
