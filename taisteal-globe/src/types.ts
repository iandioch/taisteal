export type Location = {
    id: string,
    address: string,
    name: string,
    latitude: number,
    longitude: number,
    country_name: string,
    country_code: string,
    type: string, // TODO: make this an enum
    region: string,
}

export type Visit = {
    location: Location,
    num_visits: number,
    days: number,
    hours: number,
}

export type Leg = {
    departure_location: Location,
    arrival_location: Location,
    mode: string,
    count: number,
}
