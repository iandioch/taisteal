import * as THREE from 'https://unpkg.com/three@0.108.0/build/three.module.js';
import {OrbitControls} from 'https://unpkg.com/three@0.108.0/examples/jsm/controls/OrbitControls.js';
import { CSS2DRenderer, CSS2DObject } from 'https://unpkg.com/three@0.108.0/examples/jsm/renderers/CSS2DRenderer.js';


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
    const GLOBE_TEXTURE_PATH = 'scaled_globe_10800.jpg'
    const canvas = document.querySelector('#globe-canvas');
    const renderer = new THREE.WebGLRenderer({canvas});

    const labelRenderer = new CSS2DRenderer();
    labelRenderer.setSize(window.innerWidth, window.innerHeight);
    labelRenderer.domElement.style.position = 'absolute';
    labelRenderer.domElement.style.top = '0px';
    document.body.appendChild(labelRenderer.domElement);

    const camera = new THREE.PerspectiveCamera(45, 2, 0.01, 500);
    camera.position.z = 2;
    const controls = new OrbitControls(camera, labelRenderer.domElement);
    const MIN_CAMERA_DISTANCE = GLOBE_RADIUS * 1.025;
    const MAX_CAMERA_DISTANCE = GLOBE_RADIUS * 5;
    controls.minDistance = MIN_CAMERA_DISTANCE;
    controls.maxDistance = MAX_CAMERA_DISTANCE;
    controls.enablePan = false;
    controls.enableDamping = true;
    controls.rotateSpeed = 0.75;
    controls.zoomSpeed = 0.5;
    const scene = new THREE.Scene();

    var raycaster = new THREE.Raycaster(); 
    var mouse = new THREE.Vector2();
    document.addEventListener('mousemove', onMouseMove, false);

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
        const ambientLight = new THREE.AmbientLight(0xFFFFFF, 0.9);
        scene.add(ambientLight);
        const directionalLight = new THREE.DirectionalLight(0xF9D78C, 1);
        directionalLight.position.set(-1, 2, 4);
        scene.add(directionalLight);
    }

    const globeGroup = new THREE.Group();
    scene.add(globeGroup);
    const pointGroup = new THREE.Group();
    globeGroup.add(pointGroup);

    // Create the sphere obj.
    const textureLoader = new THREE.TextureLoader();
    textureLoader.load(GLOBE_TEXTURE_PATH, (texture) => {
        // TODO(iandioch): it'd be cool here instead of drawing some picture of the earth to instead render the polygon for each country or something; if we did that, there's lots of cool interactions that could be added.
        const globeGeometry = new THREE.SphereGeometry(GLOBE_RADIUS, 128, 128);
        const globeMaterial = new THREE.MeshPhongMaterial({ map: texture });
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

    function drawPoint(pos, radius, height, colour, name, hasCluster, isCluster) {
        const pointObj = new THREE.Group();
        pointObj.position.copy(pos);
        pointObj.lookAt(0, 0, 0);
        pointObj.locationName = name;
        pointObj.hasCluster = hasCluster;
        pointObj.isCluster = isCluster;

        const margin = 0.0005;
        const baseGeom = new THREE.CylinderGeometry(radius + margin*2, radius + margin*2, margin, 16);
        baseGeom.applyMatrix(new THREE.Matrix4().makeRotationX(-Math.PI/2));
        const baseMaterial = new THREE.MeshBasicMaterial({color: 0xFFFFFF});
        const base = new THREE.Mesh(baseGeom, baseMaterial);
        pointObj.add(base);

        const geom = new THREE.CylinderGeometry(radius, radius*0.5, height, 16);
        geom.applyMatrix(new THREE.Matrix4().makeRotationX(-Math.PI/2));
        const material = new THREE.MeshPhongMaterial({color: colour});
        const point = new THREE.Mesh(geom, material);
        point.position.z = -height/2;
        pointObj.add(point);

        const div = document.createElement("div");
        div.textContent = name;
        div.style.padding = "2px";
        div.style.border = "0px";
        div.style.borderRadius = "5px";
        div.style.fontFamily = "Arial, Helvetica, sans-serif";
        div.style.fontSize = "1.5em";
        div.style.marginTop = '-1em';
        div.style.backgroundColor = "rgba(255, 255, 255, 0.75)";
        div.style.visibility = "hidden";
        const label = new CSS2DObject(div);
        label.position.set(0, margin, 0);
        pointObj.add(label);

        const sphereGeom = new THREE.SphereGeometry(radius*3, 16, 16);
        const sphere = new THREE.Mesh(sphereGeom, material);
        sphere.position.z = -height;
        pointObj.add(sphere);

        pointGroup.add(pointObj);
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
            console.log("Visit: ", visit)
            var radius = 0.001;
            var colour = 0x559955;
            if (visit.location.type === "AIRPORT") {
                colour = 0xAA3333;
            } else if (visit.location.type === "CLUSTER") {
                colour = 0xfcba03;
            }
            const height = mapToRange(1, highestVisits, GLOBE_RADIUS/50, GLOBE_RADIUS/12, visit.num_visits);
            console.log("Num visits: ", visit.num_visits, ", height: ", height);
            const name = visit.location.human_readable_name + " (" + visit.num_visits + "x)";
            drawPoint(latLngToVector(visit.location.lat, visit.location.lng), radius, height, colour, name, visit.hasOwnProperty("cluster"), (visit.location.type === "CLUSTER"));
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
            labelRenderer.setSize(window.innerWidth, window.innerHeight);
        }
        return needResize;
    }

    function onMouseMove(event) {
        mouse.x = (event.clientX / renderer.domElement.clientWidth) * 2 - 1;
        mouse.y = -(event.clientY / renderer.domElement.clientHeight) * 2 + 1;
    }

    var highlightedPoint; 
    var colourBeforeHighlight;
    var tooltipDiv = document.createElement('div');
    tooltipDiv.textContent = "Ros na Rún";
    tooltipDiv.style.marginTop = '-1em';
    const tooltipLabel = new CSS2DObject(tooltipDiv);
    tooltipLabel.position.set(0, GLOBE_RADIUS, 0);
    function render(time) {
        function revertHighlightedPoint() {
            if (!highlightedPoint) return;
            highlightedPoint.children[1].material.color.setHex(colourBeforeHighlight);
            highlightedPoint.children[2].element.style.visibility = "hidden";
        }
        const seconds = time * 0.001;
        const cameraDistance = camera.position.distanceTo(controls.target);

        raycaster.setFromCamera(mouse, camera);
        //var ray = new THREE.Raycaster(camera.position, vector.sub(camera.position).normalize());
        var intersectedPoints = raycaster.intersectObjects(pointGroup.children, true);
        if (intersectedPoints.length > 0) {
            for (var i in intersectedPoints) {
                if (intersectedPoints[i].object.material.transparent) continue;
                // First point is the one closest to camera.
                const pointParent = intersectedPoints[i].object.parent;
                if (pointParent != highlightedPoint) {
                    revertHighlightedPoint();

                    highlightedPoint = pointParent;
                    colourBeforeHighlight = pointParent.children[1].material.color.getHex();
                    pointParent.children[1].material.color.setHex(0x000000);
                    pointParent.children[2].element.style.visibility = "visible";
                }
                break;
            }
        } else {
            // No currently intersected points.
            revertHighlightedPoint();
            highlightedPoint = null; // Delete prev highlight, if it exists.
        }

        controls.rotateSpeed = mapToRange(MIN_CAMERA_DISTANCE, MAX_CAMERA_DISTANCE, 0.05, 0.8, cameraDistance);
        controls.update();

        if (resizeRendererToDisplaySize(renderer)) {
            const canvas = renderer.domElement;
            camera.aspect = canvas.clientWidth / canvas.clientHeight;
            camera.updateProjectionMatrix();
        }

        const scale = mapToRange(MIN_CAMERA_DISTANCE, MAX_CAMERA_DISTANCE, 0.2, 5, cameraDistance);
        const showClusters = (cameraDistance > MAX_CAMERA_DISTANCE/4.0);
        for (var i in pointGroup.children) {
            const point = pointGroup.children[i];
            point.scale.set(scale, scale, scale);

            //console.log("Setting transparency for point:", point);
            if (point.hasCluster) {
                point.visible = !showClusters;
                //point.children[0].material.transparent = !showClusters;
                //point.children[1].material.transparent = !showClusters;
            } else if (point.isCluster) {
                point.visible = showClusters;
                //point.children[0].material.transparent = showClusters;
                //point.children[1].material.transparent = showClusters;
            }
        }

        //globeGroup.rotation.y = seconds/40.0;

        renderer.render(scene, camera);
        labelRenderer.render(scene, camera);
        requestAnimationFrame(render);
    }
    requestAnimationFrame(render);
})();
