export const GLOBE_RADIUS: number = 1; // in 3D space units

export const PATH_COUNTRIES_JSON: string = process.env.PUBLIC_URL + '/countries.json';

export const GLOBE_CIRCUMFERENCE = 40000; // in km

export const MIN_CAMERA_DISTANCE = GLOBE_RADIUS * 1.05;
export const MAX_CAMERA_DISTANCE = GLOBE_RADIUS * 5;
// Increase this number to make the scrolling snappier.
export const CONTROLS_DAMPING_FACTOR = 0.075;
export const CONTROLS_ROTATE_SPEED = 0.85;
export const CONTROLS_ZOOM_SPEED = 0.7;

export const POI_RADIUS = 0.005;
export const MIN_POI_HEIGHT = GLOBE_RADIUS / 50;
export const MAX_POI_HEIGHT = GLOBE_RADIUS / 5;
