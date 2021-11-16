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
    document.addEventListener('touchmove', onMouseMove, false);
    document.addEventListener('mousedown', onMouseDown, false);
    document.addEventListener('touchstart', onMouseDown, false);

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
    const arcGroup = new THREE.Group();
    globeGroup.add(arcGroup);

    // Convert decimal LatLng to ECEF
    function latLngToVector(lat, lng, altitude = null) {
        // Y = 1 at north pole,
        // Y = -1 at south pole,

        lng += 90; // Offset of image we are using for the surface of the globe sphere.
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
    function drawRaisedArc(start, controlPoint, end, smoothness, width, colour, leg) {
            const curve = new THREE.QuadraticBezierCurve3(start, controlPoint, end);
            const points = curve.getPoints(smoothness);
            const geom = new THREE.BufferGeometry().setFromPoints(points);
            const material = new THREE.LineBasicMaterial({ color: colour, linewidth: width, transparent: true, opacity: 0.4});
            const arc = new THREE.Line(geom, material);
            arc.userData.leg = leg;
            arcGroup.add(arc);
    }

    function drawPoint(pos, radius, height, colour, label, clusterOrNull, isCluster, visitObj) {
        const pointObj = new THREE.Group();
        pointObj.position.copy(pos);
        pointObj.lookAt(0, 0, 0);
        pointObj.locationName = label;
        pointObj.hasCluster = !!clusterOrNull;
        pointObj.cluster = clusterOrNull;
        pointObj.isCluster = isCluster;
        pointObj.visit = visitObj;

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
        div.textContent = label;
        // TODO(iandioch): This styling should go in a stylesheet, instead of
        // inlined in the JS.
        div.style.padding = "2px";
        div.style.border = "0px";
        div.style.borderRadius = "5px";
        div.style.fontFamily = "Arial, Helvetica, sans-serif";
        div.style.fontSize = "1.5em";
        div.style.marginTop = '-1em';
        div.style.backgroundColor = "rgba(255, 255, 255, 0.75)";
        div.style.visibility = "hidden";
        const labelDiv = new CSS2DObject(div);
        labelDiv.position.set(0, margin, 0);
        pointObj.add(labelDiv);

        const sphereGeom = new THREE.SphereGeometry(radius*3, 16, 16);
        const sphere = new THREE.Mesh(sphereGeom, material);
        sphere.position.z = -height;
        pointObj.add(sphere);

        pointGroup.add(pointObj);
    }

    var visits = {};
    var legs = [];
    loadJSON('/taisteal/api/travel_map', (data) => {
        legs = data.legs;
        var highestVisits = 0;
        for (var i in data.visits) {
            var numVisits = data.visits[i].num_visits;
            highestVisits = (highestVisits > numVisits ? highestVisits : numVisits);
        }
        for (var i in data.visits) {
            const visit = data.visits[i];
            visits[visit.location.name] = visit;
            var radius = 0.0015;
            var colour = 0x559955;
            if (visit.location.type === "AIRPORT") {
                colour = 0xAA3333;
            } else if (visit.location.type === "CLUSTER") {
                colour = 0xfcba03;
            }
            const height = mapToRange(1, highestVisits, GLOBE_RADIUS/50, GLOBE_RADIUS/12, visit.num_visits);
            const label = visit.location.human_readable_name + " (" + visit.num_visits + "x)";
            const cluster = (visit.hasOwnProperty("cluster") ? visit.cluster : null);
            drawPoint(latLngToVector(visit.location.lat, visit.location.lng), radius, height, colour, label, cluster, (visit.location.type === "CLUSTER"), visit);
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
            drawRaisedArc(latLngToVector(leg.dep.lat, leg.dep.lng), latLngToVector(midpoint[0], midpoint[1], controlPointHeight), latLngToVector(leg.arr.lat, leg.arr.lng), smoothness, leg.count*2, 0xFFFFFF, leg);
        }
    });

    const infoPanelDiv = document.createElement("div");
    infoPanelDiv.id = "info-panel";
    infoPanelDiv.style.backgroundColor = "rgba(0, 0, 0, 0.5)";
    infoPanelDiv.style.fontFamily = "Arial, Helvetica, sans-serif";
    infoPanelDiv.style.color = "#FFFFFF";
    infoPanelDiv.style.width = "100%";
    infoPanelDiv.style.visibility = "hidden";
    infoPanelDiv.style.position = "fixed";
    infoPanelDiv.style.bottom = "0";
    infoPanelDiv.style.padding= "4px";
    const infoPanelTitleDiv = document.createElement("div");
    infoPanelTitleDiv.textContent = "test content";
    infoPanelTitleDiv.style.fontSize = "3em";
    infoPanelDiv.appendChild(infoPanelTitleDiv);
    const infoPanelContentDiv = document.createElement("div");
    infoPanelContentDiv.style.fontSize = "1em";
    infoPanelContentDiv.style.whiteSpace = "pre";
    infoPanelDiv.appendChild(infoPanelTitleDiv);
    infoPanelDiv.appendChild(infoPanelContentDiv);
    document.body.appendChild(infoPanelDiv);

    // Make semitransparent most plcaes except the one the user just clicked on.
    function toggleRoutesForSelectedVisits(visitNames) {
        const visitSet = new Set(visitNames);
        // Build up a set of everywhere that shares a leg with these visitNames.
        const connectedVisitSet = new Set(visitNames);
        for (let i in arcGroup.children) {
            const arc = arcGroup.children[i];
            const leg = arc.userData.leg;
            var visible = false;
            if (visitSet.has(leg.arr.name)) {
                connectedVisitSet.add(leg.dep.name);
                visible = true;
            } else if (visitSet.has(leg.dep.name)) {
                connectedVisitSet.add(leg.arr.name);
                visible = true;
            }
            arc.material.visible = visible;
        }
        // Also add any relevant clusters to the set, so that if we zoom in/out
        // the clusters will be shown as needed in place of the specific locations.
        for (let i in visits) {
            const visit = visits[i];
            if (!('cluster' in visit)) continue;
            if (connectedVisitSet.has(visit.location.name)) {
                connectedVisitSet.add(visit.cluster);
            }
        }
        // Make semitransparent all of the pins not in the connectedVisitSet.
        for (let i in pointGroup.children) {
            const pointParent = pointGroup.children[i];
            const visible = connectedVisitSet.has(pointParent.visit.location.name);
            const opacity = visible ? 1.0 : 0.3;
            pointParent.children[0].material.opacity = opacity;
            pointParent.children[0].material.transparent = !visible;
            pointParent.children[1].material.opacity = opacity;
            pointParent.children[1].material.transparent = !visible;
        }
    }

    // visitObj containining info like num days visited, div title, etc.
    // visitNames is names of places to render legs for.
    function renderInfoForVisit(visitObj, visitNames) {
        console.log("Rendering info for visits: ", visitNames, " under ", visitObj);
        infoPanelTitleDiv.textContent = visitObj.location.human_readable_name;
        infoPanelContentDiv.textContent = `${visitNames.join(" | ")}\r\nVisits: ${visitObj.num_visits}\r\nDays: ${visitObj.days}`;
        infoPanelDiv.style.visibility = "visible";

        toggleRoutesForSelectedVisits(visitNames);
    }

    function renderInfoForPoint(point) {
        console.log("Rendering info for clicked point: ", point);
        var locations = [];
        // If the point is a cluster, get the info for the component locations.
        if (point.isCluster) {
            const clusterName = point.visit.location.name;
            for (let i in visits) {
                if (visits[i].hasOwnProperty("cluster") && (visits[i].cluster == clusterName)) {
                    locations.push(visits[i].location.name);
                }
            }
        } else {
            locations.push(point.visit.location.name);
        }
        renderInfoForVisit(point.visit, locations);
    }

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

    var highlightedPoint; 
    var colourBeforeHighlight;
    var tooltipDiv = document.createElement('div');
    tooltipDiv.textContent = "Ros na Rún";
    tooltipDiv.style.marginTop = '-1em';
    const tooltipLabel = new CSS2DObject(tooltipDiv);
    tooltipLabel.position.set(0, GLOBE_RADIUS, 0);

    function updateHighlightedPoint() {
        function revertHighlightedPoint() {
            if (!highlightedPoint) return;
            highlightedPoint.children[1].material.color.setHex(colourBeforeHighlight);
            highlightedPoint.children[2].element.style.visibility = "hidden";
        }
        raycaster.setFromCamera(mouse, camera);
        var intersectedPoints = raycaster.intersectObjects(pointGroup.children, true);
        if (intersectedPoints.length > 0) {
            for (var i in intersectedPoints) {
                if (!intersectedPoints[i].object.material.visible) continue;
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
    }


    // If we receive any touch event, set this value.
    var TOUCH_SCREEN = false; 
    function setMousePosition(x, y) {
        mouse.x = (x / renderer.domElement.clientWidth) * 2 - 1;
        mouse.y = -(y / renderer.domElement.clientHeight) * 2 + 1;
    }

    function onMouseMove(event) {
        event.preventDefault();
        setMousePosition(event.clientX, event.clientY);
    }

    function onMouseDown(event) {
        event.preventDefault();
        if (("targetTouches" in event) && (event.targetTouches.length == 1)) {
            // Update "mouse" position for touchscreens. Do not do so for pinch-zooms.
            TOUCH_SCREEN = true;
            setMousePosition(event.targetTouches[0].clientX, event.targetTouches[0].clientY);
        }

        updateHighlightedPoint();

        if (highlightedPoint) {
            renderInfoForPoint(highlightedPoint);
        }
    }

    function render(time) {
        const seconds = time * 0.001;
        const cameraDistance = camera.position.distanceTo(controls.target);
        // Only update the highlighted point if it is not a touchscreen. If it
        // is a touchscreen, and we touch somewhere with a swipe, the globe will
        // spin, and if any point happens to be under the place we touched as
        // the globe spins, it will activate without this !TOUCH_SCREEN check.
        if (!TOUCH_SCREEN) updateHighlightedPoint();

        controls.rotateSpeed = mapToRange(MIN_CAMERA_DISTANCE, MAX_CAMERA_DISTANCE, 0.05, 0.8, cameraDistance);
        controls.update();

        if (resizeRendererToDisplaySize(renderer)) {
            const canvas = renderer.domElement;
            camera.aspect = canvas.clientWidth / canvas.clientHeight;
            camera.updateProjectionMatrix();
        }

        const scale = mapToRange(MIN_CAMERA_DISTANCE, MAX_CAMERA_DISTANCE, 0.2, 5, cameraDistance);
        const showClusters = (cameraDistance > MAX_CAMERA_DISTANCE/3.0);
        for (var i in pointGroup.children) {
            const point = pointGroup.children[i];
            point.scale.set(scale, scale, scale);

            if (point.hasCluster) {
                point.visible = !showClusters;
            } else if (point.isCluster) {
                point.visible = showClusters;
            }
        }

        //globeGroup.rotation.y = seconds/40.0;

        renderer.render(scene, camera);
        labelRenderer.render(scene, camera);
        requestAnimationFrame(render);
    }
    requestAnimationFrame(render);
})();
