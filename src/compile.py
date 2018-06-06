import json
import sys

from os import listdir
from os.path import isfile, join


'''
Given a path to a directory, compile all the json
files in that directory and recursive subdirectories
into one big Taisteal json document, and return it.
'''


def compile_directory(path):
    obj = {
        'note': 'Auto-compiled from directory {}'.format(path),
        'elements': [],
    }
    items = listdir(path)
    for item in items:
        if item.startswith('.') and not item.startswith('..'):
            # Skip hidden files and directories (eg '.git')
            continue
        sub_path = join(path, item)
        if isfile(sub_path):
            if not item.endswith('.json'):
                # Skip non-json files
                continue
            with open(sub_path, 'r') as f:
                try:
                    data = json.load(f)
                    obj['elements'].append(data)
                except Exception as e:
                    print(e)
        else:
            obj['elements'].append(compile_directory(sub_path))
    return obj


if __name__ == '__main__':
    if len(sys.argv) == 1:
        print('Please provide a directory path.')
    else:
        path = ' '.join(sys.argv[1:])
        compiled = compile_directory(path)
        print(json.dumps(compiled, indent=4))
