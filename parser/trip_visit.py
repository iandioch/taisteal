class Visit:
    def __init__(self):
        self.note = ''
        self.location = ''
        self.datetime = ''

    @staticmethod
    def parse(doc):
        t = Visit()
        t.location = doc['location']
        t.datetime = doc['datetime']
        if 'note' in doc:
            t.note = doc['note']
        return t
