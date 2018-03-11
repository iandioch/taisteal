import json


class TripObject:
    def to_dict(self):
        return {}


    def __str__(self):
        return json.dumps(self.to_dict())


class TripElement(TripObject):
    def __init__(self):
        self.elements = []
        self.note = ""
        self.mode = ""

    def to_dict(self):
        d = {}
        d['elements'] = [e.to_dict() for e in self.elements]
        if self.note:
            d['note'] = self.note
        if self.mode:
            d['mode'] = self.mode
        return d


class TripVisit(TripObject):
    def __init__(self):
        self.location = ""
        self.datetime = ""
        self.note = ""


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
    print(t)
