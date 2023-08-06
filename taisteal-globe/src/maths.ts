import * as THREE from 'three'
import { GLOBE_RADIUS } from './constants'

function latLngToVector(lat: number, lng: number, altitude:number|null = null) {
    // Y = 1 at north pole,
    // Y = -1 at south pole,

    const latRadians = lat * Math.PI / 180.0;
    const lngRadians = lng * Math.PI / 180.0;
    const vector = new THREE.Vector3();

    var N = GLOBE_RADIUS;
    if (altitude !== null) N = altitude;
    vector.x = N * Math.cos(latRadians) * Math.sin(lngRadians);
    vector.y = N * Math.sin(latRadians);
    vector.z = N * Math.cos(latRadians) * Math.cos(lngRadians);
    return vector;
}

function latLngMidpoint(lat1: number, lng1: number, lat2: number, lng2: number) {
    // Following https://stackoverflow.com/a/4656937
    var dLng = (lng2 - lng1) * Math.PI / 180.0;

    //convert to radians
    var lat1 = (lat1) * Math.PI / 180.0;
    var lat2 = (lat2) * Math.PI / 180.0;
    var lng1 = (lng1) * Math.PI / 180.0;

    var Bx = Math.cos(lat2) * Math.cos(dLng);
    var By = Math.cos(lat2) * Math.sin(dLng);
    var lat3 = Math.atan2(Math.sin(lat1) + Math.sin(lat2), Math.sqrt((Math.cos(lat1) + Bx) * (Math.cos(lat1) + Bx) + By * By));
    var lng3 = lng1 + Math.atan2(By, Math.cos(lat1) + Bx);

    return [(lat3) * 180.0 / Math.PI, (lng3) * 180.0 / Math.PI];
}

function mapToRange(inputLo: number, inputHi: number, outputLo: number, outputHi: number, input: number) {
    const slope = (outputHi - outputLo) / (inputHi - inputLo);
    return outputLo + slope * (input - inputLo);
}

// Returns distance in KM between given pair of points, as the crow flies.
// Results are not exact, possibly because of assumption the earth is a sphere.
// Examples: Munich -> Zurich is 242km.
function latLngDistance(lat1: number, lng1: number, lat2: number, lng2: number) {
    // From https://stackoverflow.com/q/18883601
    const R = 6371; // Earth radius in km.
    const dLat = (lat2-lat1) * Math.PI / 180.0;
    const dLng = (lng2-lng1) * Math.PI / 180.0;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) + Math.cos((lat1) * Math.PI / 180.0) * Math.cos((lat2) * Math.PI / 180.0) * Math.sin(dLng/2) * Math.sin(dLng/2); 
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const d = R*c;
    return d;
}

export { latLngToVector, latLngMidpoint, mapToRange, latLngDistance };
