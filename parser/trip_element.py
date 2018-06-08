import json

from trip_visit import Visit

class Element:
    def __init__(self):
        # each element must be a Element or a Visit.
        self.elements = []
        self.mode = ''
        self.note = ''

    @staticmethod
    def parse(doc):
        if 'elements' not in doc:
            return Visit.parse(doc)
        t = Element()
        if 'note' in doc:
            t.note = doc['note']
        if 'mode' in doc:
            t.mode = doc['mode']
        t.elements.append(Element.parse(doc['elements'][0]))
        t.elements.append(Element.parse(doc['elements'][1]))
        if len(doc['elements']) > 2:
            print('WARNING: Document has extra trip elements.')
            print(json.dumps(doc, indent=4))
        return t
            
