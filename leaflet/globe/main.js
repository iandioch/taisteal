import * as THREE from 'https://unpkg.com/three@0.108.0/build/three.module.js';
import {OrbitControls} from 'https://unpkg.com/three@0.108.0/examples/jsm/controls/OrbitControls.js';
//import {CubeTextureLoader} from 'https://unpkg.com/three@0.108.0/examples/jsm/loaders/CubeTextureLoader.js';

function loadJSON(url, callback) {
    var request = new XMLHttpRequest;
    request.open('GET', url, true);
    request.onload = function() {
      if (request.status >= 200 && request.status < 400){
        // Success!
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

(function() {
    const GLOBE_RADIUS = 1;
    const canvas = document.querySelector('#globe-canvas');
    const renderer = new THREE.WebGLRenderer({canvas});
    const camera = new THREE.PerspectiveCamera(45, 2, 0.01, 500);
    camera.position.z = 2;
    const controls = new OrbitControls(camera, canvas);
    const MIN_CAMERA_DISTANCE = GLOBE_RADIUS * 1.025;
    const MAX_CAMERA_DISTANCE = GLOBE_RADIUS * 5;
    controls.minDistance = MIN_CAMERA_DISTANCE;
    controls.maxDistance = MAX_CAMERA_DISTANCE;
    controls.enablePan = false;
    controls.enableDamping = true;
    controls.rotateSpeed = 0.75;
    controls.zoomSpeed = 0.5;
    const scene = new THREE.Scene();

    {
        const MAX_STAR_DIST = GLOBE_RADIUS * 30;
        const MIN_DIST = GLOBE_RADIUS*10;
        function randomStarPosition() {
            while (true) { 
            const x = Math.random() * MAX_STAR_DIST - MAX_STAR_DIST/2.0;
            const y = Math.random() * MAX_STAR_DIST - MAX_STAR_DIST/2.0;
            const z = Math.random() * MAX_STAR_DIST - MAX_STAR_DIST/2.0;
            if (x*x + y*y + z*z > MIN_DIST*MIN_DIST) {
                return new THREE.Vector3(x, y, z);
            }
            }
        }
        const NUM_STARS = 100;
        const starGeom = new THREE.Geometry();
        for (let i = 0; i < NUM_STARS; i++) {
            //let star = new THREE.Vector3(randomStarPosition(), randomStarPosition(), randomStarPosition());
            let star = randomStarPosition();
            starGeom.vertices.push(star);
        }
        const material = new THREE.PointsMaterial({color: 0xFFFFFF, size: 0.1});
        const points = new THREE.Points(starGeom, material);
        scene.add(points);
    }

    { 
        const ambientLight = new THREE.AmbientLight(0xFFFFFF, 1);
        scene.add(ambientLight);
    }

    const globeGroup = new THREE.Group();
    scene.add(globeGroup);
    const pointGroup = new THREE.Group();
    globeGroup.add(pointGroup);

    // Create the sphere obj.
    const textureLoader = new THREE.TextureLoader();
    textureLoader.load('land_ocean_ice_cloud_2048.jpg', (texture) => {
        // TODO(iandioch): it'd be cool here instead of drawing some picture of the earth to instead render the polygon for each country or something; if we did that, there's lots of cool interactions that could be added.
        const globeGeometry = new THREE.SphereGeometry(GLOBE_RADIUS, 128, 128);
        const globeMaterial = new THREE.MeshPhongMaterial({ map: texture, overdraw: 0.5 });
        const globe = new THREE.Mesh(globeGeometry, globeMaterial);
        globeGroup.add(globe);
    });

    // Convert decimal LatLng to ECEF
    function latLngToVector(lat, lng, altitude = null) {
        // Y = 1 at north pole,
        // Y = -1 at south pole,

        lng += 90; // Offset of image we are using for the surface of the globe sphere.
        const latRadians = lat * Math.PI / 180.0;
        const lngRadians = lng * Math.PI / 180.0;
        const vector = new THREE.Vector3();

        //const N = a / Math.sqrt(1 - (e*e) * (Math.sin(latRadians)*Math.sin(latRadians)));
        var N = GLOBE_RADIUS;
        if (altitude !== null) N = altitude;
        vector.z = N * Math.cos(latRadians) * Math.cos(lngRadians);
        vector.x = N * Math.cos(latRadians) * Math.sin(lngRadians);
        //vector.z = GLOBE_RADIUS * Math.sin(latRadians);
        vector.y = N * Math.sin(latRadians);
        console.log(lat, lng, "->", vector.x, vector.y, vector.z);
        return vector;
    }

    function latLngMidpoint(lat1, lng1, lat2, lng2) {
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

    function mapToRange(inputLo, inputHi, outputLo, outputHi, input) {
        const slope = (outputHi - outputLo) / (inputHi - inputLo);
        return outputLo + slope * (input - inputLo);
    }

    // Returns distance in KM between given pair of points, as the crow flies.
    // Results are not exact, possibly because of assumption the earth is a sphere.
    // Examples: Munich -> Zurich is 242km.
    function latLngDistance(lat1, lng1, lat2, lng2) {
        // From https://stackoverflow.com/q/18883601
        const R = 6371; // Earth radius in km.
        const dLat = (lat2-lat1) * Math.PI / 180.0;
        const dLng = (lng2-lng1) * Math.PI / 180.0;
        const a = Math.sin(dLat/2) * Math.sin(dLat/2) + Math.cos((lat1) * Math.PI / 180.0) * Math.cos((lat2) * Math.PI / 180.0) * Math.sin(dLng/2) * Math.sin(dLng/2); 
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        const d = R*c;
        return d;
    }

    function drawSurfaceArc(start, end, smoothness, width, colour) {
        // Following https://stackoverflow.com/a/42721392
        var cb = new THREE.Vector3();
        var ab = new THREE.Vector3();
        var normal = new THREE.Vector3();
        cb.subVectors(new THREE.Vector3(), end);
        ab.subVectors(start, end);
        cb.cross(ab);
        normal.copy(cb).normalize();

        var angle = start.angleTo(end);
        var angleDelta = angle/(smoothness-1);
        var geom = new THREE.Geometry();
        for (var i = 0; i < smoothness; i++) {
            geom.vertices.push(start.clone().applyAxisAngle(normal, angleDelta*i));
        }
        var arc = new THREE.Line(geom, new THREE.LineBasicMaterial({color: colour, linewidth: width}));
        globeGroup.add(arc);
    }

    // [start, controlPoint, end] should all be Vector3.
    function drawRaisedArc(start, controlPoint, end, smoothness, width, colour) {
            const curve = new THREE.QuadraticBezierCurve3(start, controlPoint, end);
            const points = curve.getPoints(smoothness);
            const geom = new THREE.BufferGeometry().setFromPoints(points);
            const material = new THREE.LineBasicMaterial({ color: colour, linewidth: width, transparent: true, opacity: 0.4});
            const arc = new THREE.Line(geom, material);
            globeGroup.add(arc);
    }

    function drawPoint(pos, radius, height, colour) {
        const margin = 0.0005;
        const baseGeom = new THREE.CylinderGeometry(radius + margin*2, radius + margin*2, margin, 16);
        baseGeom.applyMatrix(new THREE.Matrix4().makeRotationX(-Math.PI/2));
        const baseMaterial = new THREE.MeshBasicMaterial({color: 0xFFFFFF});
        const base = new THREE.Mesh(baseGeom, baseMaterial);
        base.position.copy(pos);
        base.lookAt(0, 0, 0);
        pointGroup.add(base);
        // TODO(iandioch): I think that some of the height goes inside the earth. Fix.
        const geom = new THREE.CylinderGeometry(radius, radius, height, 16);
        geom.applyMatrix(new THREE.Matrix4().makeRotationX(-Math.PI/2));
        const material = new THREE.MeshPhongMaterial({color: colour});
        const point = new THREE.Mesh(geom, material);
        point.position.copy(pos);
        //point.rotation.x = Math.PI * 0.5;
        point.lookAt(0, 0, 0);
        console.log(point.position);

        /*point.position.x = GLOBE_RADIUS * Math.cos(latRadians) * Math.cos(lngRadians);
        console.log( GLOBE_RADIUS * Math.cos(latRadians) * Math.cos(lngRadians));
        point.position.z = GLOBE_RADIUS * Math.cos(latRadians) * Math.sin(lngRadians);
        point.position.y = GLOBE_RADIUS * Math.sin(latRadians);*/
        pointGroup.add(point);
    }

    loadJSON('/taisteal/api/travel_map', (data) => {
        var highestVisits = 0;
        for (var i in data.visits) {
            var numVisits = data.visits[i].num_visits;
            highestVisits = (highestVisits > numVisits ? highestVisits : numVisits);
        }
        console.log("Highest visits: ", highestVisits);
        for (var i in data.visits) {
            const visit = data.visits[i];
            console.log(visit.num_visits);
            var radius = 0.001;
            var colour = 0x559955;
            console.log(visit.num_visits*2, highestVisits);
            if (visit.num_visits >= highestVisits/3) {
                colour = 0xAA3333;
                //radius = 0.008;
                console.log(colour);
            } else if (visit.num_visits >= 2) {
                colour = 0x5555FF;
                //radius = 0.005;
            }
            const height = mapToRange(1, highestVisits, 0.025, GLOBE_RADIUS/10, visit.num_visits);
            console.log("Num visits: ", visit.num_visits, ", height: ", height);
            drawPoint(latLngToVector(visit.location.lat, visit.location.lng), radius, height, colour);
        }
        for (var i in data.legs) {
            const leg = data.legs[i];
            if (leg.mode === "FILL") {
                // These are auto-added to make all legs into one continuous route.
                continue;
            }
            const legDistance = latLngDistance(leg.dep.lat, leg.dep.lng, leg.arr.lat, leg.arr.lng);
            const globeCircumference = 40000;
            const controlPointHeight = mapToRange(0, globeCircumference, GLOBE_RADIUS, GLOBE_RADIUS * 3, legDistance);
            const smoothness = Math.ceil(mapToRange(0, globeCircumference, 8, 256, legDistance));
			const midpoint = latLngMidpoint(leg.dep.lat, leg.dep.lng, leg.arr.lat, leg.arr.lng);
            drawRaisedArc(latLngToVector(leg.dep.lat, leg.dep.lng), latLngToVector(midpoint[0], midpoint[1], controlPointHeight), latLngToVector(leg.arr.lat, leg.arr.lng), smoothness, leg.count*2, 0xFFFFFF);
        }
    });

    // Returns true if we needed to resize.
    function resizeRendererToDisplaySize(renderer) {
        const canvas = renderer.domElement;
        const needResize = (canvas.width !== canvas.clientWidth ||
                            canvas.height !== canvas.clientHeight);
        if (needResize) {
            renderer.setSize(canvas.clientWidth, canvas.clientHeight, false);
        }
        return needResize;
    }

    function render(time) {
        const seconds = time * 0.001;
        // TODO(iandioch): When you get in close, the size of rendered points could change to show more detail.
        const cameraDistance = camera.position.distanceTo(controls.target);
        controls.rotateSpeed = mapToRange(MIN_CAMERA_DISTANCE, MAX_CAMERA_DISTANCE, 0.05, 0.8, cameraDistance);
        controls.update();

        if (resizeRendererToDisplaySize(renderer)) {
            const canvas = renderer.domElement;
            camera.aspect = canvas.clientWidth / canvas.clientHeight;
            camera.updateProjectionMatrix();
        }

        const scale = mapToRange(MIN_CAMERA_DISTANCE, MAX_CAMERA_DISTANCE, 0.2, 3, cameraDistance);
        for (var i in pointGroup.children) {
            const point = pointGroup.children[i];
            point.scale.set(scale, scale, scale);
        }

        //globeGroup.rotation.y = seconds/40.0;

        renderer.render(scene, camera);
        requestAnimationFrame(render);
    }
    requestAnimationFrame(render);
})();