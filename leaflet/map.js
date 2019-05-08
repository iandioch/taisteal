function loadJSON(url, callback) {
    request = new XMLHttpRequest;
    request.open('GET', url, true);
    request.onload = function() {
      if (request.status >= 200 && request.status < 400){
        // Success!
        data = JSON.parse(request.responseText);
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

function loadData(callback) {
    console.log("Loading data.");
    loadJSON("http://localhost:1916/api/travel_map", function(data) {
        callback(data);
    });
}

function createMap(callback) {
    loadJSON('http://localhost:1916/api/get_mapbox_token', function(data) {
        console.log("Loading");
        var mapObj = L.map('travel-map').setView([0, -0.09], 1);
        var accessToken = data['token']
        L.tileLayer('https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.png?access_token=' + accessToken, {
            attribution: 'Map data &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors, <a href="https://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, Imagery &copy; <a href="https://www.mapbox.com/">Mapbox</a>',
            maxZoom: 18,
            id: 'mapbox.light',
            accessToken: accessToken 
        }).addTo(mapObj);
        callback(mapObj);
    });
}

function addDataToMap(mapObj, callback) {
    loadData(function(data) {
        // Add the data.
        console.log("Adding data to map.");
        console.log(data);
        for (i in data.legs) {
            var leg = data.legs[i];
            var points = [
                [leg.dep.lat, leg.dep.lng],
                [leg.arr.lat, leg.arr.lng]
            ];

            /* What type/shape of line is being drawn.
               0: Straight (default).
               1: Geodesic.
               2: Snap to roads.
            */
            var lineType = 0; 

            // Options wrt. colour & styling.
            var opts = {};
            if (leg.mode === 'AEROPLANE') {
                opts.color = '#4696F0';
                opts.opacity = 0.4;
                lineType = 1;
            } else if (leg.mode === 'BUS') {
                opts.color = '#10634f';
                opts.opacity = 0.6;
                lineType = 2;
            } else if (leg.mode === 'TRAIN') {
                opts.color = '#598e2f';
                opts.opacity = 0.5;
            } else if (leg.mode === 'FILL') {
                // Fills draw a line between two subsequent stops that have
                // different locations. Often between eg. ZRH Airport and Zurich city.
                opts.color = 'white';
                opts.opacity = 0.5;
            } else {
                opts.color = '#cc3420';
                opts.opacity = 0.7;
                lineType = 2;
            }
            if (lineType == 0) {
                var line = L.polyline(points, opts).addTo(mapObj);
            } else if (lineType == 1) {
                var pointObjs = [
                    new L.LatLng(points[0][0], points[0][1]),
                    new L.LatLng(points[1][0], points[1][1])
                ]
                var line = L.geodesic([pointObjs], opts).addTo(mapObj);
            } else if (lineType == 2) {
                // Snap to roads.
                // See: https://stackoverflow.com/a/39490070 .
                // Must pass opts in as arg to not overwrite it with a later opts.
                (function(opts) {
                    var control = L.Routing.control({
                        show: false,
                        createMarker: function() {},
                        waypointMode: 'snap',
                    });
                    control._router.route([{latLng: leg.dep}, {latLng: leg.arr}], function(err, waypoints) {
                        var a = waypoints[0].coordinates;
                        // TODO(iandioch): This draws over the city markers, when it shouldn't. Fix.
                        L.polyline(a, opts).addTo(mapObj);
                    });
                })(opts);
            }
        }
        for (v in data.visits) {
            var loc = data.visits[v].location;
            var lat = loc.lat;
            var lng = loc.lng;
            var num_visits = data.visits[v].num_visits;
            console.log(lat + ", " + lng);
            //var marker = L.marker([lat, lng]).addTo(mapObj);
            var marker = L.circleMarker([lat, lng], {
                'color': 'white',
                'fillColor': '#A00',
                'fillOpacity': 0.9,
                'radius': 6,
                'weight': 1,
            }).addTo(mapObj);
            marker.bindPopup(loc.name + " (" + loc.type + ")<br />Number of visits: " + num_visits);
        }
        callback(mapObj, data);
    });
}

(function() {
    console.log("JS grabbed.");
    createMap(function(map) { addDataToMap(map, function(){}); });
})();
