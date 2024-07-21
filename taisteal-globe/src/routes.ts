import tunnel from 'tunnel-rat'

export function getRouteForRouteOverview() {
    return '/routes';
}

export function getRouteForVisitOverview() {
    return '/visits';
}

export function getRouteForPOI(id: string) {
    return `/poi/${id}`;
}

export function getRouteForCountryCode(countryCode: string) {
    return `/country/${countryCode}`;
}

export function getRouteForIndex() {
    return '/';
}

export function getRouteForLegs() {
    return '/edit/legs';
}

// A title of the pagae - this will be always open.
export const SidebarHighlightTunnel = tunnel();

// This is below the fold, more details.
export const SidebarTunnel = tunnel();

