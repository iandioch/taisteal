import flask

app = flask.Flask(__name__, static_url_path='')

@app.route('/load/<path:path>')
def static_files(path):
    print(path)
    return flask.send_from_directory('', path)
app.run(host='0.0.0.0', port=8080)
