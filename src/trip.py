import json


class TripElement:
    def __init__(self):
        self.elements = []
        self.note = ""
        self.mode = ""

    def to_dict(self):
        d = {}
        d['elements'] = [e.to_dict() for e in self.elements]
        d['note'] = self.note
        d['mode'] = self.mode
        return d

    def __str__(self):
        return json.dumps(self.to_dict())


if __name__ == "__main__":
    t = TripElement()
    t.note = "hiya"
    s = TripElement()
    s.note = "well wdc"
    t.elements.append(s)
    print(t)
