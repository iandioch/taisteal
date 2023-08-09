import tunnel from 'tunnel-rat'

export function getRouteForPOI(id: string) {
    return `/poi/${id}`;
}

export function getRouteForCountryCode(countryCode: string) {
    return `/country/${countryCode}`;
}

export function getRouteForIndex() {
    return '/';
}

export const SidebarTunnel = tunnel();

