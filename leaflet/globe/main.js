import * as THREE from 'https://unpkg.com/three@0.108.0/build/three.module.js';
import {OrbitControls} from 'https://unpkg.com/three@0.108.0/examples/jsm/controls/OrbitControls.js';

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
    const camera = new THREE.PerspectiveCamera(45, 2, 0.025, 5);
    camera.position.z = 2;
    const controls = new OrbitControls(camera, canvas);
    controls.minDistance = GLOBE_RADIUS*1.1;
    controls.maxDistance = GLOBE_RADIUS*3;
    controls.enablePan = false;
    const scene = new THREE.Scene();

    { 
        // Create a sun and an ambient light.
        const sunLight = new THREE.DirectionalLight(0xF9D79C, 1);
        sunLight.position.set(-1, 2, 4);
        scene.add(sunLight);
        const ambientLight = new THREE.AmbientLight(0xFFFFFF, 1);
        scene.add(ambientLight);
    }

    const globeGroup = new THREE.Object3D();
    scene.add(globeGroup);

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
    function latLngToVector(lat, lng) {
        // Y = 1 at north pole,
        // Y = -1 at south pole,

        lng += 90; // Offset of image we are using for the surface of the globe sphere.
        const latRadians = lat * Math.PI / 180.0;
        const lngRadians = lng * Math.PI / 180.0;
        const vector = new THREE.Vector3();

        //const N = a / Math.sqrt(1 - (e*e) * (Math.sin(latRadians)*Math.sin(latRadians)));
        const N = GLOBE_RADIUS;
        vector.z = N * Math.cos(latRadians) * Math.cos(lngRadians);
        vector.x = N * Math.cos(latRadians) * Math.sin(lngRadians);
        //vector.z = GLOBE_RADIUS * Math.sin(latRadians);
        vector.y = N * Math.sin(latRadians);
        console.log(lat, lng, "->", vector.x, vector.y, vector.z);
        return vector;
    }

    function drawArc(start, end, smoothness, width, colour) {
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

    function drawPoint(pos, radius, height, colour) {
        const margin = 0.001;
        const baseGeom = new THREE.CylinderGeometry(radius + margin*2, radius + margin*2, margin, 16);
        baseGeom.applyMatrix(new THREE.Matrix4().makeRotationX(-Math.PI/2));
        const baseMaterial = new THREE.MeshBasicMaterial({color: 0x000000});
        const base = new THREE.Mesh(baseGeom, baseMaterial);
        base.position.copy(pos);
        base.lookAt(0, 0, 0);
        globeGroup.add(base);
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
        globeGroup.add(point);
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
            var colour = 0x55FF55;
            console.log(visit.num_visits*2, highestVisits);
            if (visit.num_visits >= highestVisits/3) {
                colour = 0xAA3333;
                //radius = 0.008;
                console.log(colour);
            } else if (visit.num_visits >= 2) {
                colour = 0x5555FF;
                //radius = 0.005;
            }
            drawPoint(latLngToVector(visit.location.lat, visit.location.lng), radius, 0.05 + visit.num_visits/100, colour);
        }
        for (var i in data.legs) {
            const leg = data.legs[i];
            if (leg.mode === "FILL") {
                // These are auto-added to make all legs into one continuous route.
                continue;
            }
            // TODO(iandioch): We could optimise by drawing shorter legs with a much lower smoothness.
            drawArc(latLngToVector(leg.dep.lat, leg.dep.lng), latLngToVector(leg.arr.lat, leg.arr.lng), 64, leg.count, 0xFFFFFF);
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
        console.log(cameraDistance);

        if (resizeRendererToDisplaySize(renderer)) {
            const canvas = renderer.domElement;
            camera.aspect = canvas.clientWidth / canvas.clientHeight;
            camera.updateProjectionMatrix();
        }

        //globeGroup.rotation.y = seconds/40.0;

        renderer.render(scene, camera);
        requestAnimationFrame(render);
    }
    requestAnimationFrame(render);
})();
