import sqlite3
import json
import time

import location_database_utils 

import pendulum

DB_PATH = '.taisteal.db'

def _connect():
    db_connection = sqlite3.connect(DB_PATH)
    db_connection.row_factory = sqlite3.Row
    return db_connection, db_connection.cursor()

def _create_tables():
    print('Creating database tables...')
    conn, cursor = _connect()
    # The location_lookups table acts as a cache for previous responses when
    # looking up "query". The "result" column contains arbitrary JSON.
    cursor.execute('''CREATE TABLE IF NOT EXISTS location_lookups
        (
        query text PRIMARY KEY,
        result text
        )''')

    # The directly entered data, not used in prod directly, but processed into 
    # `legs` table.
    cursor.execute('''CREATE TABLE IF NOT EXISTS logged_legs
        (
        id text PRIMARY KEY,
        departure_query text,
        departure_datetime text,
        arrival_query text,
        arrival_datetime text,
        mode text,
        FOREIGN KEY (departure_query) REFERENCES location_lookups(query),
        FOREIGN KEY (arrival_query) REFERENCES location_lookups(query)
        )''')

    # Maps location queries in the location_lookups table to IDs in the
    # locations table. There may be multiple queries associated with the same
    # id (eg. "Zurich Hauptbahnhof" and "Zurich Main Station" ideally point to
    # the same underyling location).
    cursor.execute('''CREATE TABLE IF NOT EXISTS location_query_to_id (
        query text PRIMARY KEY,
        id text
    )''')

    # The locations table is derived from the data in location_lookups.
    cursor.execute('''CREATE TABLE IF NOT EXISTS locations
        (
        /* id is an arbitrary string */
        id text PRIMARY KEY,
        /* human-readable non-ambiguous well-formatted address */
        address text,
        /* human-readable name */
        name text,
        /* position in the real world */
        latitude real,
        longitude real,
        /* country name in English */
        country_name text,
        /* ISO 3166 country codes, with some additions (eg. the UK is split up into component countries) */
        country_code text,
        /* Type of this place, eg. STATION, AIRPORT. */
        type text,
        /* Computed region, used to group some locations together. Sometimes, this is some official designation (eg. corresponds to NUTS 2 region names), but there is no guarantee. Prefer names in in English. In Switzerland, this is cantons; in Ireland, this is counties; in the US, this is states; in Monaco, there is just one region.*/
        region text
        )''')

    # Derived from logged_legs.
    cursor.execute('''CREATE TABLE IF NOT EXISTS legs
        (
        id text PRIMARY KEY,
        departure_location_id text,
        departure_datetime integer,
        arrival_location_id text,
        arrival_datetime integer,
        mode text
        )''')

    cursor.execute('''CREATE TABLE IF NOT EXISTS collections
        (
        /* id is arbitrary string */
        id text PRIMARY KEY,
        title text
        )''')

    cursor.execute('''CREATE TABLE IF NOT EXISTS collection_parts
        (
        collection_id text,
        position integer,

        /* Should have exactly one of leg_id or note set */
        leg_id text,
        note text
        )''')
    conn.close()
    print('Database tables created.')

# This runs at the time this file is first imported.
_create_tables()

# Regenerate derived tables.
def regenerate_tables():
    print('Regenerating tables...')
    start_time = time.time()
    conn, cursor = _connect()
    cursor.execute('DELETE FROM location_query_to_id')
    cursor.execute('DELETE FROM locations')
    conn.commit()
    cursor.execute('SELECT * FROM location_lookups')
    for lookup in cursor.fetchall():
        parsed_lookup_result = json.loads(lookup['result'])
        id_ = location_database_utils.get_id_for_location_lookup(lookup['query'], parsed_lookup_result)
        args = (lookup['query'], id_)
        cursor.execute('INSERT INTO location_query_to_id(query, id) VALUES(?, ?)', args)
    conn.commit()

    cursor.execute('''
    SELECT
        location_query_to_id.id,
        location_lookups.result
    FROM
        location_query_to_id
    LEFT OUTER JOIN
        location_lookups
    ON
        location_query_to_id.query = location_lookups.query
    GROUP BY
        location_query_to_id.id
    ''')
    for lookup in cursor.fetchall():
        parsed_lookup_result = json.loads(lookup['result'])
        id_ = lookup['id']
        location_data = location_database_utils.create_locations_row_for_lookup(parsed_lookup_result)
        args = (id_, location_data['address'], location_data['name'], location_data['latitude'], location_data['longitude'], location_data['country_name'], location_data['country_code'], location_data['type'], location_data['region'])
        cursor.execute('INSERT INTO locations(id, address, name, latitude, longitude, country_name, country_code, type, region) VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?)', args)
    conn.commit()
    conn.close()
    end_time = time.time()
    print('Tables regenerated. It took {} seconds.'.format(end_time - start_time))

def save_location_lookup(query, result):
    print('Putting {} into location_lookups'.format(query))
    conn, cursor = _connect()
    args = (query, result)
    cursor.execute('INSERT INTO location_lookups(query, result) VALUES(?, ?)', args)
    conn.commit()
    conn.close()

def get_location_lookup(query):
    conn, cursor = _connect()
    args = (query,)
    cursor.execute("SELECT * FROM location_lookups WHERE query=? LIMIT 1", args)
    row = cursor.fetchone()
    conn.close()
    if not row:
        return None
    return {col: row[col] for col in row.keys()}

def save_id_for_query(id_, query):
    conn, cursor = _connect()
    args = (id_, query)
    cursor.execute('INSERT INTO location_query_to_id(id, query) VALUES(?, ?)', args)
    conn.commit()
    conn.close()

def get_id_for_query(query):
    conn, cursor = _connect()
    args = (query,)
    cursor.execute("SELECT id FROM location_query_to_id WHERE query=? LIMIT 1", args)
    row = cursor.fetchone()
    conn.close()
    if not row:
        return None
    return row['id']

def get_location(id_):
    conn, cursor = _connect()
    args = (id_,)
    cursor.execute("SELECT * FROM locations WHERE id=? LIMIT 1", args)
    row = cursor.fetchone()
    conn.close()
    if not row:
        return None
    return {col: row[col] for col in row.keys()}

def save_location(id_, location_data):
    conn, cursor = _connect()
    args = (id_, location_data['address'], location_data['name'], location_data['latitude'], location_data['longitude'], location_data['country_name'], location_data['country_code'], location_data['type'], location_data['region'])
    cursor.execute('INSERT INTO locations(id, address, name, latitude, longitude, country_name, country_code, type, region) VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?)', args)
    conn.commit()
    conn.close()

def save_logged_leg(id_, departure_query, departure_datetime, arrival_query, arrival_datetime, mode):
    conn, cursor = _connect()
    args = (id_, departure_query, departure_datetime, arrival_query, arrival_datetime, mode)
    cursor.execute('INSERT INTO logged_legs(id, departure_query, departure_datetime, arrival_query, arrival_datetime, mode) VALUES(?, ?, ?, ?, ?, ?)', args)
    conn.commit()
    conn.close()

def save_leg(id_, departure_id, departure_datetime, arrival_id, arrival_datetime, mode):
    conn, cursor = _connect()
    args = (id_, departure_id, departure_datetime, arrival_id, arrival_datetime, mode)
    cursor.execute('INSERT INTO legs(id, departure_location_id, departure_datetime, arrival_location_id, arrival_datetime, mode) VALUES(?, ?, ?, ?, ?, ?)', args)
    conn.commit()
    conn.close()

def get_legs():
    conn, cursor = _connect()
    cursor.execute('''
    SELECT
        id,
        mode,
        departure_location_id,
        departure_datetime,
        arrival_location_id,
        arrival_datetime
    FROM
        legs
    ''')
    for lookup in cursor.fetchall():
        d = {n: lookup[n] for n in lookup.keys()}
        d['departure_datetime'] = pendulum.parse(d['departure_datetime'])
        d['arrival_datetime'] = pendulum.parse(d['arrival_datetime'])
        yield d

def get_leg(id_):
    conn, cursor = _connect()
    args = (id_,)
    cursor.execute("SELECT * FROM legs WHERE id=? LIMIT 1", args)
    row = cursor.fetchone()
    conn.close()
    if not row:
        return None
    return {col: row[col] for col in row.keys()}

def get_collections():
    conn, cursor = _connect()
    cursor.execute('''
    SELECT *
    FROM
        collections
    ''')
    for lookup in cursor.fetchall():
        yield {n: lookup[n] for n in lookup.keys()}

def get_collection_parts(id_):
    conn, cursor = _connect()
    cursor.execute('''
    SELECT
        *
    FROM
        collection_parts
    WHERE
        collection_id = ?
    ORDER BY
        position 
    ''', (id_,))
    for lookup in cursor.fetchall():
        yield {n: lookup[n] for n in lookup.keys()}

def save_collection(collection):
    print('DATABASE: Saving collection:', collection)
    conn, cursor = _connect()
    cursor.execute('''
    DELETE FROM
        collections
    WHERE
        id = ?''', (collection['id'],))
    cursor.execute('''
    DELETE FROM
        collection_parts
    WHERE
        collection_id = ?''', (collection['id'],))
    conn.commit()
    cursor.execute('INSERT INTO collections(id, title) VALUES(?, ?)', (collection['id'], collection['title']))
    for position, part in enumerate(collection['parts']):
        leg_id = part['leg_id']
        note = part['note']
        # TODO: verify that exactly one of (leg_id, note) is set
        cursor.execute('INSERT INTO collection_parts(collection_id, position, leg_id, note) VALUES(?, ?, ?, ?)', (collection['id'], position, leg_id, note))
    conn.commit()
