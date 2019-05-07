from flask import Flask
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

@app.route('/')
def serve_root():
    return 'Hello World!'

@app.route('/api/travel_map')
def serve_travel_map():
    return '{}'

def main():
    app.run(port=1916)

if __name__ == '__main__':
    main()
