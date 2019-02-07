class Location:
    '''A single physical location'''

    def __init__(self, raw_str):
        # raw_str is the exact string the user inputted.
        # Should not be used for anything other than debugging?
        self.raw_str = raw_str

        # cleaned_str is the stripped version of the raw_str.
        self.cleaned_str = raw_str.strip()

    def __repr__(self):
        return self.cleaned_str

class TravelLegPoint:
    '''An arrival or departure (location, datetime) pair.'''

    def __init__(self, loc, date):
        '''Arguments:

        - loc (str): A raw address.
        - date (str): A datetime'''
        self.raw_loc = Location(loc)
        self.raw_date = date

    def __repr__(self):
        return 'Point("{}")'.format(self.raw_loc)

class TravelLeg:

    def __init__(self, csv_row):
        self.dep = TravelLegPoint(csv_row[0], csv_row[1])
        self.arr = TravelLegPoint(csv_row[2], csv_row[3])

    def __repr__(self):
        return 'Leg({}, {})'.format(self.dep.raw_loc,
                                    self.arr.raw_loc)
