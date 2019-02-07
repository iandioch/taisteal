class TravelLegPoint:
    '''An arrival or departure (location, datetime) pair.'''

    def __init__(self, loc, date):
        '''Arguments:

        - loc (str): An address.
        - date (str): A datetime'''
        self.raw_loc = loc
        self.raw_date = date

class TravelLeg:

    def __init__(self, csv_row):
        self.dep = TravelLegPoint(csv_row[0], csv_row[1])
        self.arr = TravelLegPoint(csv_row[2], csv_row[3])

    def __repr__(self):
        return 'TravelLeg("{}", "{}")'.format(self.dep.raw_loc,
                                              self.arr.raw_loc)
