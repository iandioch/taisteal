function addDot(map, lat, lng) {
    var circle = L.circle([lat, lng], {
        color: 'red',
        fillColor: '#f03',
        fillOpacity: 1,
        radius: 500
    }).addTo(map);
}

console.log("initiating.");
var flightMap = L.map('travelmap').setView([51.505, -0.09], 13);

console.log("done");

L.tileLayer('http://tile.osm.org/{z}/{x}/{y}.png?access_token={accessToken}', {
    attribution: 'Map data &copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors, <a href="http://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, Imagery © <a href="http://mapbox.com">Mapbox</a>',
    maxZoom: 18,
    id: 'mapbox.streets',
    accessToken: 'your.mapbox.access.token'
}).addTo(flightMap);

addDot(flightMap, 51.508, -0.11);
