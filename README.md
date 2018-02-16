# Taistil

Tooling for dealing with the logging and analysis of travelling.

# Usage

Uses Python 3.6. Install dependencies by running `python3.6 -m pip install -r requirements.txt`.

## Globtrottr import

`src/globtrottr.py` imports data from [Globtrottr.com](http://globtrottr.com) and converts it
to the format used by Taistil.

To fetch this data from the Globtrottr API and convert it, run:

```sh
python src/globtrottr.py -u <USERNAME>
```

If you have already downloaded your data from the Globtrottr API, you can run:

```sh
python src/globtrottr.py -f <GLOBTROTTR_JSON_FILE_PATH>
```

This will load the data from a file instead.

After the file has been converted, you may want to manually inspect the data for accuracy.

## Get trip data

`src/trip_parse.py` parses a Taistil trip json document (passed through stdin) and outputs
statistics about the data.

Use it by executing:

```sh
cat <TAISTIL_JSON_FILE_PATH> | python src/trip_parse.py <TAISTIL_JSON_SCHEMA_PATH>
```

From the root directory of this repo, this would be:

```sh
cat <TAISTIL_JSON_FILE_PATH> | python src/trip_parse.py taistil_schema.json
```

Depending on the size of your data, this script might take a long time. However, it will
print progress reports as it operates.

## Compile multiple files

`src/compile.py` takes a directory path, and combines all files in that directory into one
big Taistil trip document, which it outputs on stdout.

Use it as following:

```sh
python src/compile.py <DIRECTORY_PATH>
```

## All together

```sh
python src/globtrottr.py -u <USERNAME> | python src/trip_parse.py taistil_schema.json
```
