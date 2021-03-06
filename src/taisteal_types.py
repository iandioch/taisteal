import json

from location import TaistealLocation

import pendulum


'''
Parent class of items that make part of a Taisteal trip.
'''


class TripObject:

    def __init__(self):
        # A note related to this trip object. No enforced format.
        self.note = ""

    def to_dict(self):
        d = {}
        if self.note:
            d['note'] = self.note
        return d

    def __str__(self):
        return json.dumps(self.to_dict())

    @staticmethod
    def parse(doc):
        return TripObject()


'''
A leg of a Taisteal trip. Can recursively contain other legs.
'''


class TripElement(TripObject):

    def __init__(self):
        super(TripElement, self).__init__()
        # Sub elements of this trip object.
        self.elements = []
        # The mode of transport for this trip. See taisteal schema
        # for a list of possible values.
        self.mode = ""
        # The earliest datetime in any of this element's
        # sub-elements. Can be treated as the starting datetime
        # of this trip element.
        self.datetime = None

    def to_dict(self):
        d = super().to_dict()
        d['elements'] = [e.to_dict() for e in self.elements]
        if self.mode:
            d['mode'] = self.mode
        return d

    def _add_visits_to_locations(self, prev_location=None, prev_datetime=None):
        loc, date = prev_location, prev_datetime
        for e in self.elements:
            if isinstance(e, TripVisit):
                if e.location != loc:
                    if date and loc:
                        loc.add_visit(date, e.datetime)
                        print('adding visit to', str(loc), str(date), str(e.datetime))
                    loc = e.location
                    date = e.datetime
            else:
                print('Adding sub element visits.')
                e._add_visits_to_locations(loc, date)
            

    @staticmethod
    def parse(doc):
        if 'elements' not in doc:
            return TripVisit.parse(doc)
        t = TripElement()
        if 'note' in doc:
            t.note = doc['note']
        if 'mode' in doc:
            t.mode = doc['mode']
        for e in doc['elements']:
            t.elements.append(TripElement.parse(e))
        t.elements.sort(key=lambda x: x.datetime)
        if len(t.elements):
            t.datetime = t.elements[0].datetime
        t._add_visits_to_locations()
        return t

    def get_log(self):
        log = []
        for e in self.elements:
            if isinstance(e, TripVisit):
                log.append((e.datetime, e.location))
            else:
                log += e.get_log()
        return log


'''
A check in to a single location as part of a Taisteal trip.
'''


class TripVisit(TripObject):

    def __init__(self):
        super(TripVisit, self).__init__()
        # A TaistealLocation object.
        self.location = None
        # Original location query string.
        self.query = ''
        # A Pendulum object, representing the datetime of
        # this location visit.
        self.datetime = None

    def to_dict(self):
        d = {}
        d['location'] = self.query
        d['datetime'] = str(self.datetime)
        if self.note:
            d['note'] = self.note
        return d

    @staticmethod
    def parse(doc):
        t = TripVisit()
        t.location, error = TaistealLocation.find(doc['location'])
        t.query = doc['location']
        t.raw_datetime = doc['datetime']
        t.datetime = pendulum.parse(doc['datetime'])
        if 'note' in doc:
            t.note = doc['note']
        return t


if __name__ == "__main__":
    t = TripElement()
    t.note = "hiya"
    s = TripElement()
    s.note = "well wdc"
    t.elements.append(s)
    r = TripVisit()
    t.elements.append(r)
    print(t)
