import sqlite3

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

    # Maps location queries in the location_lookups table to IDs in the
    # locations table. There may be multiple queries associated with the same
    # id (eg. "Zurich Hauptbahnhof" and "Zurich Main Station" ideally point to
    # the same underyling location).
    cursor.execute('''CREATE TABLE IF NOT EXISTS location_query_id (
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
    print('Database tables created.')

# This runs at the time this file is first imported.
_create_tables()

def save_location_lookup(query, result):
    print('Putting {} into location_lookups'.format(query))
    conn, cursor = _connect()
    args = (query, result)
    cursor.execute('insert into location_lookups(query, result) VALUES(?, ?)', args)
    conn.commit()

def get_location_lookup(query):
    conn, cursor = _connect()
    args = (query,)
    cursor.execute("SELECT * FROM location_lookups WHERE query=?", args)
    row = cursor.fetchone()
    if not row:
        return None
    return {col: row[col] for col in row.keys()}

