# Taistil

Tooling for dealing with the logging and analysis of travelling.

# Usage

Uses Python 3.6. Install dependencies by running `python3.6 -m pip install -r requirements.txt`.

## Globtrottr import

`src/globtrottr.py` imports data from [Globtrottr.com](http://globtrottr.com) and converts it
to the format used by Taistil.

Run `python src/globtrottr.py -u <username>` to fetch this data from the Globtrottr API and
convert it.

If you have already downloaded your data from the Globtrottr API, you can run
`python src/globtrottr.py -f <globtrottr_api_json_file>` to load the data from a file instead.

After the file has been converted, you may want to manually inspect the data for accuracy.

## Get trip data

`src/trip_parse.py` parses a Taistil trip json document (passed through stdin) and outputs
statistics about the data.

Use it by executing:

```
cat <your_taistil_json_file> | python src/trip_parse.py <taistil_json_schema>
```

From the root directory of this repo, this would be:

```
cat <your_taistil_json_file> | python src/trip_parse.py trip_element_schema.json
```

Depending on the size of your data, this script might take a long time. However, it will
print progress reports as it operates.

## All together

```
python src/globtrottr.py -u <username> | python src/trip_parse.py trip_element_schema.json
```
