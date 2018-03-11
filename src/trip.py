import json


'''
Parent class of items that make part of a Taistil trip.
'''
class TripObject:

    def __init__(self):
        self.note = ""

    def to_dict(self):
        d = {}
        if self.note:
            d['note'] = self.note
        return d


    def __str__(self):
        return json.dumps(self.to_dict())


'''
A leg of a Taistil trip. Can recursively contain other legs.
'''
class TripElement(TripObject):

    def __init__(self):
        super(TripElement, self).__init__()
        self.elements = []
        self.mode = ""

    def to_dict(self):
        d = super().to_dict()
        d['elements'] = [e.to_dict() for e in self.elements]
        if self.mode:
            d['mode'] = self.mode
        return d


'''
A check in to a single location as part of a Taistil trip.
'''
class TripVisit(TripObject):

    def __init__(self):
        super(TripVisit, self).__init__()
        self.location = ""
        self.datetime = ""


    def to_dict(self):
        d = {}
        d['location'] = self.location
        d['datetime'] = self.datetime
        if self.note:
            d['note'] = self.note
        return d

    

if __name__ == "__main__":
    t = TripElement()
    t.note = "hiya"
    s = TripElement()
    s.note = "well wdc"
    t.elements.append(s)
    r = TripVisit()
    t.elements.append(r)
    print(t)
