import json

import pendulum


'''
Parent class of items that make part of a Taistil trip.
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
A leg of a Taistil trip. Can recursively contain other legs.
'''


class TripElement(TripObject):

    def __init__(self):
        super(TripElement, self).__init__()
        # Sub elements of this trip object.
        self.elements = []
        # The mode of transport for this trip. See taistil schema
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
        return t


'''
A check in to a single location as part of a Taistil trip.
'''


class TripVisit(TripObject):

    def __init__(self):
        super(TripVisit, self).__init__()
        # A string with some name for this location.
        self.location = ""
        # A Pendulum object, representing the datetime of
        # this location visit.
        self.datetime = ""

    def to_dict(self):
        d = {}
        d['location'] = self.location
        d['datetime'] = str(self.datetime)
        if self.note:
            d['note'] = self.note
        return d

    @staticmethod
    def parse(doc):
        t = TripVisit()
        t.location = doc['location']
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
