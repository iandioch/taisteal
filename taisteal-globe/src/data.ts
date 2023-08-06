import { Location, Leg } from './types'
import { addLegs } from 'store'

const MAP_DATA_URL = 'http://localhost:1916/api/travel_map'

function parseLocation(data: any): Location {
    const loc: Location = {
        id: data.id,
        latitude: data.lat,
        longitude: data.lng,
        address: data.address,
        type: data.type,
        region: data.region,
        name: data.human_readable_name,
        countryName: data.country,
        countryCode: data.country_code,
    };
    return loc;
}

function parseLeg(data: any): Leg {
    const leg: Leg = {
        departureLocation: parseLocation(data.dep),
        arrivalLocation: parseLocation(data.arr),
        mode: data.mode,
        count: data.count
    };
    return leg;
}

function parseLegs(data: any): Leg[] {
    const legs: Leg[] = [];
    for (const jsonLeg of data.legs) {
        legs.push(parseLeg(jsonLeg));
    }
    return legs;
}

function loadJSON(url: string, callback: (data: any) => void) {
    var request = new XMLHttpRequest();
    request.open('GET', url, true);
    request.onload = function() {
      if (request.status >= 200 && request.status < 400){
        // Success!
        console.log(`loadJSON(${url}) returned:\n${request.responseText}`);
        var data = JSON.parse(request.responseText);
        callback(data);
      } else {
        console.log("Status code error: " + request.status);
      }
    };

    request.onerror = function() {
      console.log("Error connecting.");
    };

    request.send();
}

var loadingMapData = false;
async function loadMapData() {
    if (loadingMapData) {
        console.log("Requested to load map data, but it is already loading.");
    }
    loadingMapData = true;
    loadJSON(MAP_DATA_URL, (data) => {
        const legs = parseLegs(data);
        addLegs(legs);
    });
}

export { loadJSON, loadMapData };
