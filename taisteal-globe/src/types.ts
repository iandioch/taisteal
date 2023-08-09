// TODO: Should extract country code + name into its own type, so it's easier to
// make components around it.
// TODO: in the same vein, should extract visit info (numVisits is problematic,
// but at least days & hours) to a separate type, so there can be a
// LocationVisit and also eg. a CountryVisit
// TODO: A location should be able to have more than one country associated with
// it, eg. Jerusalem.
export type Location = {
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

export type Visit = {
    location: Location,
    numVisits: number,
    days: number,
    hours: number,
    // TODO: Might need to handle clusters.
}

export enum Mode {
    UNKNOWN = 0,
    AEROPLANE,
    BUS,
    TRAIN,
    TAXI,
    BOAT,
    WALK,
    CAR,
    GONDOLA,
    MINIBUS,
}

// This would be good, but it isn't easy to check if something is inside
type ModeStrings = keyof typeof Mode;

export const modeFromString = (s: ModeStrings): Mode => {
    switch(s) {
        case 'AEROPLANE': return Mode.AEROPLANE;
        case 'BUS': return Mode.BUS;
        case 'TRAIN': return Mode.TRAIN;
        case 'TAXI': return Mode.TAXI;
        case 'BOAT': return Mode.BOAT;
        case 'WALK': return Mode.WALK;
        case 'CAR': return Mode.CAR;
        case 'GONDOLA': return Mode.GONDOLA;
        case 'MINIBUS': return Mode.MINIBUS;
    }
    return Mode.UNKNOWN;
}

export const modeToString = (m: Mode): string => {
    const mapping: { [mode in Mode]: string } = {
        [Mode.UNKNOWN]: '_Unknown',
        [Mode.AEROPLANE]: 'Aeroplane',
        [Mode.BUS]: 'Bus',
        [Mode.TRAIN]: 'Train',
        [Mode.TAXI]: 'Taxi',
        [Mode.BOAT]: 'Boat',
        [Mode.WALK]: 'Walk',
        [Mode.CAR]: 'Car',
        [Mode.GONDOLA]: 'Gondola',
        [Mode.MINIBUS]: 'Minibus',
    };
    return mapping[m];
}

export type Leg = {
    departureLocation: Location,
    arrivalLocation: Location,
    mode: Mode,
    count: number,
    distance: number,
    id: string,
}

export const makeLegID = (departureLocation: Location, arrivalLocation: Location, mode: Mode): string => {
    // TODO: This should probably come from server.
    return `${departureLocation.id}-${arrivalLocation.id}-${mode}`
}
