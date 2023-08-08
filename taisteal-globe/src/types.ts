type Location = {
    id: string,
    address: string,
    name: string,
    latitude: number,
    longitude: number,
    countryName: string,
    countryCode: string,
    type: string, // TODO: make this an enum
    region: string,
}

type Visit = {
    location: Location,
    numVisits: number,
    days: number,
    hours: number,
    // TODO: Might need to handle clusters.
}

type Leg = {
    departureLocation: Location,
    arrivalLocation: Location,
    mode: string,
    count: number,
    distance: number,
}

export type { Location, Visit, Leg };
