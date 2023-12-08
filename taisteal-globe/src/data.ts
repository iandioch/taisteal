import { Mode, modeFromString, Location, Leg, makeLegID, Visit } from './types'
import { legSlice, visitSlice } from 'store'
import store from 'store'
import { latLngDistance } from 'maths'

const MAP_DATA_URL = window.location.protocol + '//' + window.location.hostname + '/api/travel_map'

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

function parseVisit(data: any): Visit {
    const visit: Visit = {
        location: parseLocation(data.location),
        numVisits: data.num_visits,
        days: data.days,
        hours: data.hours,
    };
    return visit;
}

function parseVisits(data: any): Visit[] {
    const visits: Visit[] = [];
    for (const jsonVisit of data.visits) {
        const visit = parseVisit(jsonVisit);
        if (visit.location.type !== "CLUSTER") {
            visits.push(visit);
        }
    }
    return visits;
}

function parseLeg(data: any): Leg {
    const departureLocation = parseLocation(data.dep);
    const arrivalLocation = parseLocation(data.arr);
    const mode = modeFromString(data.mode);
    const leg: Leg = {
        departureLocation,
        arrivalLocation,
        mode,
        count: data.count,
        // TODO: this should probably happen on the server
        distance: latLngDistance(departureLocation.latitude, departureLocation.longitude, arrivalLocation.latitude, arrivalLocation.longitude),
        // TODO: it'd be good to get some time for an aggregated leg (maybe mean would be most normal, but max most interesting on a chart?)
        id: makeLegID(departureLocation, arrivalLocation, mode),
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
        return;
    }
    loadingMapData = true;
    loadJSON(MAP_DATA_URL, (data) => {
        const legs = parseLegs(data);
        store.dispatch(legSlice.actions.addLegs(legs));
        const visits = parseVisits(data);
        store.dispatch(visitSlice.actions.addVisits(visits));
    });
}

export { loadJSON, loadMapData };
