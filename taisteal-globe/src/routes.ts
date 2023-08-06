import tunnel from 'tunnel-rat'

export function getRouteForPOI(id: string) {
    return `/poi/${id}`;
}

export function getRouteForIndex() {
    return '/';
}

export const SidebarTunnel = tunnel();

