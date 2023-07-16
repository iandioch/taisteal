import * as THREE from 'three';
import {OrbitControls} from 'three/examples/jsm/controls/OrbitControls';
//'https://unpkg.com/three@0.108.0/examples/jsm/controls/OrbitControls.js';
import { CSS2DRenderer, CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer.js';
import TWEEN from '@tweenjs/tween.js'
import chroma from 'chroma-js';
import { ConicPolygonGeometry } from 'three-conic-polygon-geometry';

const urlParams = new URLSearchParams(window.location.search);
const GLOBE_STYLE_TEXTURE = "texture";
const GLOBE_STYLE_POLYGON = "polygon";
const GLOBE_STYLE_MINIMAL = "minimal";
const GLOBE_STYLE = (urlParams.has('style') ? urlParams.get('style') : GLOBE_STYLE_TEXTURE);

const PATH_COUNTRIES_JSON = 'static/countries.json'
const PATH_TOWN_SVG = 'static/town.svg'
const PATH_REGION_SVG = 'static/region.svg'
const PATH_AIRPORT_SVG = 'static/airport.svg'
const PATH_STATION_SVG = 'static/station.svg'

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
    Vue.component('poi', {
        props: {
            text: String,
            id: String,
        },
        template: `<a class="poi" href='#' v-on:click="handleClick"><img :src="icon[0]" :title="icon[1]" :alt="icon[1]" style="width: 1em; display: inline; margin-right: 2px; position: relative; vertical-align: middle;"></img>{{text}}</a>`,
        methods: {
            handleClick() {
                renderInfoForPOI(this.id);
            }
        },
        computed: {
            icon: function() {
                // TODO(iandioch): It's dumb to get this point instead of just having a getVisitForID(this.id) func.
                const visit = getPointForName(this.id).visit;
                if (visit.location.type == 'TOWN' || visit.location.type == "TOWN_CLUSTER") {
                    return [PATH_TOWN_SVG, 'Town by mapbox on svgrepo.com'];
                } else if (visit.location.type == "STATION") {
                    return [PATH_STATION_SVG, 'Railway Station 14 by gmgeo on svgrepo.com'];
                } else if (visit.location.type == "AIRPORT") {
                    return [PATH_AIRPORT_SVG, 'Airplane Plane by SVG Repo on svgrepo.com'];
                }
                return [PATH_TOWN_SVG, 'TODO'];
            }
        }
    });

    Vue.component('country', {
        props: {
            text: String,
            id: String,
        },
        template: `<a class="poi" href='#' v-on:click="handleClick"><span v-if="flag">{{flag}} </span>{{text}}</a>`,
        methods: {
            handleClick() {
                renderInfoForCountry(this.text);
            },
            flagEmojiForCountryCode(countryCode) {
                const codePoints = countryCode.toUpperCase().split('').map(c =>  127397 + c.charCodeAt());
                return String.fromCodePoint(...codePoints);
            }
        },
        computed: {
            flag: function() {
                if (this.id.length != 2) {
                    // Only the three regional flags of [Scotland, Wales, England] are recommended for general interchange by the Unicode consortium.
                    switch(this.id) {
                        case 'GBSCT': return '🏴󠁧󠁢󠁳󠁣󠁴󠁿';
                        case 'GBWLS': return '🏴󠁧󠁢󠁷󠁬󠁳󠁿';
                        case 'GBENG': return '🏴󠁧󠁢󠁥󠁮󠁧󠁿';
                        default: return null;
                    }
                }
                return this.flagEmojiForCountryCode(this.id);
            },
        }
    });

    Vue.component('region', {
        props: {
            country: String, // name of country
            name: String, // name of region
        },
        template: `<a class="poi" href='#' v-on:click="handleClick"><img src="` + PATH_REGION_SVG + `" title="Location by SVG Repo on svgrepo.com" style="width: 1em; display: inline; margin-right: 2px; position: relative; vertical-align: middle"></img>{{name}}</a>`,
        methods: {
            handleClick() {
                renderInfoForRegion(this.country, this.name);
            },
        }
    });

    Vue.component('collection', {
        props: {
            collection: Object,
        },
        template: `<a class="poi" href='#' v-on:click="handleClick">{{collection.title}}</a>`,
        methods: {
            handleClick() {
                renderInfoForCollection(this.collection);
            },
        }
    });

    Vue.component('top-region-table', {
        props: {
            regions: Array, // Array of {country, name, hours}
        },
        template: `
            <ul class="top-region-table">
                <li v-for="region in regions">
                    <region :country="region.country" :name="region.name"></region> <span class="fact">{{region.visit_duration}}</span>
                </li>
            </ul>`
    });

    // TODO(iandioch): It might be easier to have separate components for clusters vs. individual POIs, instead of wrapping everything in ifs.
    Vue.component('poi-visit-dashboard', {
        props: {
            visits: Array, // One (or more, if poi is a cluster) visit objs. 
            poi: Object, // a single visitObj
        },
        template: `<div>
            <div class="poi-list">
                <p v-if="visits.length > 1">This cluster is composed of multiple adjacent places:<br><span v-for="poi in visits"><poi :text="poi.location.human_readable_name" :id="poi.location.id"></poi> </span><br>in <span v-for="country in countries"><country :id="country.code" :text="country.name"></country></span></p>
                <p v-if="poi.location.type != 'CLUSTER'"><poi :text="poi.location.human_readable_name" :id="poi.location.id"></poi> is {{humanReadableType}} in <region :name="regions[0].name" :country="regions[0].country"></region> in <country :id="countries[0].code" :text="countries[0].name"></country></p>
                <!--p v-if="poi.hasOwnProperty('cluster')">This is a part of <poi text="a cluster" :id="poi.cluster"></poi></p-->
                <p v-if="poi.location.type == 'CLUSTER'">Contains visits to region(s): <span v-for="region in regions"><region :name="region.name" :country="region.country"></region></span></p>
            </div>
            <p>Number of visits: {{poi.num_visits}}</p>
            <p>Estimated total time visited: {{durationString}}.</p>
        </div>`,
        computed: {
            countries: function() {
                var seenCountries = new Set();
                var results = [];
                for (let i in this.visits) {
                    const visit = this.visits[i];
                    if (seenCountries.has(visit.location.country)) continue;

                    seenCountries.add(visit.location.country);
                    results.push({
                        name: visit.location.country, 
                        code: visit.location.country_code
                    });
                }
                return results;
            },
            regions: function() {
                return getRegionsForVisits(this.visits);
            },
            humanReadableType: function() {
                switch(this.poi.location.type) {
                    case "CLUSTER":
                        return "a cluster";
                    case "TOWN":
                    case "TOWN_CLUSTER":
                        return "a locality";
                    case "AIRPORT":
                        return "an airport";
                    case "STATION":
                        return "a station";
                    default:
                        return "a place";
                }
            },
            durationString: function() {
                return stringForHours(this.poi.hours);
            }
        }
    });
    Vue.component('poi-collection-dashboard', {
        // This component is eg. used to render info about a country or region.
        props: {
            visits: Array // A list of [human_readable_name, id] pairs of places
        },
        template:`<div>
            <div class="poi-list">
                <!-- if there is only one region, we are probably just rendering
                info about that region, so list component POIs instead of list
                of component regions -->
                <div v-if="regions.length == 1">
                <p>Contains the following places:</p>
                <span v-for="poi in visits"><poi :text="poi[0]" :id="poi[1]"></poi></span>
                </div>
                <div v-else>
                <!-- If there is more than one region, we are probably rendering
                info about a country, so list all of the component regions and
                not the individual POIs. However, if there is only one visited
                region within a country, then this will not be what is
                rendered. That is good. But:
                TODO(iandioch): If there is not only just one visited region in
                                a country, but actually just one visited POI,
                                (eg. "Almaty"), just render info about that POI
                                and skip this collection view.
                -->
                <p>Regions visited:</p>
                <top-region-table v-bind:regions="regions"></top-region-table>
                </div>
                <p>Stayed in these places for {{durationString}} total.</p>
            </div>
        </div>`,
        computed: {
            hours: function() {
                var hours = 0;
                for (let i in this.visits) {
                    let visit = visits[this.visits[i][1]];
                    hours += visit.hours;
                }
                return hours;
            },
            regions: function() {
                const visitObjs = [];
                for (let i in this.visits) {
                    visitObjs.push(visits[this.visits[i][1]]);
                }
                console.log(visitObjs);
                return getRegionsForVisits(visitObjs);
            },
            durationString: function() {
                return stringForHours(this.hours);
            }
        }
    });
    Vue.component('home-dashboard', {
		props: ['legs', 'visits'],
        template: `<div>
            Logged <span class="fact">{{statistics.num_legs}}</span> trips to <span class="fact">{{statistics.num_unique_pois}}</span> different places in <span class="fact">{{statistics.num_countries}}</span> countries.<br>
            Places I have spent the most time in since I started logging:
            <top-region-table v-bind:regions="longestStayedRegions"></top-region-table>
            <br>
            I have logged trips passing through the following countries: <span v-for="country in countries"><country :id="country.code" :text="country.name"></country></span>
            <br>
            See more info about: <collection v-for="collection in collections" :collection="collection"></collection>.
        </div>`,
        computed: {
            longestStayedRegions() {
                const regions = getRegionsForVisits(visits);
                return regions.slice(0, 8);
            },
            statistics() {
                const POINames = new Set();
                for (let i in visits) {
                    if (visits[i].type == 'CLUSTER') continue;
                    POINames.add(visits[i].location.id);
                }
                const numUniquePOIs = POINames.size;

                var numLegs = 0;
                for (let i in legs) {
                    numLegs += legs[i].count;
                }

                const countries = new Set();
                for (let i in visits) {
                    if (visits[i].type == 'CLUSTER') continue;
                    countries.add(visits[i].location.country);
                }
                const numCountries = countries.size;

                return {
                    "num_unique_pois": numUniquePOIs,
                    "num_legs": numLegs,
                    "num_countries": numCountries,
                }
            },
            countries: function() {
                var seenCountries = new Set();
                var results = [];
                for (let i in visits) {
                    const visit = visits[i];
                    const countryCode = visit.location.country_code;
                    const countryName = visit.location.country;
                    if (seenCountries.has(countryName)) continue;

                    seenCountries.add(countryName);
                    results.push({
                        name: countryName, 
                        code: countryCode,
                    });
                }
                results.sort((a, b) => {return a.name.localeCompare(b.name)});
                return results;
            },
            collections: function() {
                return collections;
            }
        }
    });

    function createComponentForPOI(point, locations) {
        return {
            data: () => {
                return {
                    visits: locations,
                    poi: point.visit,
                }
            },
            template: `<poi-visit-dashboard v-bind:visits="visits" v-bind:poi="poi"></poi-visit-dashboard>`,
        }
    }

    function getVisitsForCountry(country) {
        var locations = [];
        for (let i in visits) {
            if (visits[i].location.type == 'CLUSTER') continue;
            if (visits[i].location.country == country) {
                locations.push(visits[i]);
            }
        }
        locations.sort((a, b) => { return b.days - a.days });
        return locations;
    }

    function getRegionsForVisits(visits) {
        function regionKey(visit) {
            return visit.location.country + ':' + visit.location.region;
        }
        var regions = new Map();
        for (let i in visits) {
            const visit = visits[i];
            if (visit.location.type == 'CLUSTER') {
                console.log("Skipping visit type", visit);
                continue;
            }
            const rkey = regionKey(visit);
            if (!regions.has(rkey)) {
                regions.set(rkey, {
                    name: visit.location.region, 
                    country: visit.location.country,
                    country_code: visit.location.country_code,
                    hours: 0,
                });
            }

            var region = regions.get(rkey);
            region.hours += visit.hours;
            regions.set(rkey, region);
        }
        var results = [];
        for (const [k, v] of regions) {
            v.visit_duration = stringForHours(v.hours);
            results.push(v);
        }
        results.sort(function(a, b) { return b.hours-a.hours; });
        return results;
    }

    function stringForHours(hours) {
        if (hours < 18) {
            return `${hours} hours`;
        }
        const days = Math.ceil(hours / 24.0);
        if (days < 50) {
            return `${days} days`;
        }
        const weeks = Math.ceil(hours / (24.0 * 7));
        if (weeks < 100) {
            return `${weeks} weeks`;
        }
        //const years = (hours / (24.0 * 365)).toFixed(1);
        const years = Math.floor(hours / (24.0 * 365));
        const remainingHours = hours - (years * 24 * 365);
        if (remainingHours > 100) {
            return `${years} years ${stringForHours(remainingHours)}`;
        }
        return `${years} years`;
    }

    function createComponentForVisits(visits) {
        var locations = [];
        for (let i in visits) {
            locations.push([visits[i].location.human_readable_name, visits[i].location.id]);
        }
        return {
            data: () => {
                return {
                    visits: locations,
                }
            },
            template: `<poi-collection-dashboard v-bind:visits="visits"></poi-collection-dashboard>`,
        }
    }

    function createComponentForCollection(collection) {
        var locations = [];
        for (let location of getLocationsForCollection(collection)) {
            locations.push([location.location.human_readable_name, location.location.id]);
        }
        return {
            data: () => {
                return {
                    collection,
                    visits: locations,
                }
            },
            template: `<div>
                <p>Total distance travelled: <span class="fact">{{collection.meta.distance}}km</span></p>
                <div v-for="part in collection.parts" stlye="margin-top: 1rem">
                    <div v-if="partType(part) == 'NOTE'">
                        {{part.note}}
                    </div>
                    <div v-if="partType(part) == 'LEG'">
                        <component :is="renderLeg(part)"></component>
                    </div>
                    <div v-if="partType(part) == 'IMAGE'">
                        <img :src="part.image_url" style="max-width:100%;"></img>
                    </div>
                </div>
            </div>`,
            methods: {
                partType: function(part) {
                    if (part.note && part.note.length) {
                        return 'NOTE';
                    }
                    if (part.image_url && part.image_url.length) {
                        return 'IMAGE';
                    }
                    return 'LEG';
                },
                modeVerb: function(mode) {
                    switch(mode) {
                        case 'AEROPLANE':
                            return 'Flew';
                        case 'CAR':
                            return 'Drove';
                        case 'TRAIN':
                            return 'Took a train';
                        case 'BUS':
                            return 'Took a bus';
                        case 'TAXI':
                            return 'Took a taxi';
                        case 'BOAT':
                            return 'Took a boat';
                        default:
                            console.log("No verb specified for mode", mode);
                            return 'Travelled';
                    }
                },
                formatDatetime: function(datetime) {
                    const date = new Date();
                    date.setTime(Date.parse(datetime));
                    return date.toLocaleString("en-IE");
                },
                renderLeg(part) {
                    return {
                        data: function() {
                            return {
                                part,
                            }
                        },
                        template: `<div class="leg-description">
                            ${this.modeVerb(part.leg.mode)} ${part.distance}km from <poi :text="part.dep.human_readable_name" :id="part.dep.id"></poi> (${this.formatDatetime(part.leg.departure_datetime)}) to <poi :text="part.arr.human_readable_name" :id="part.arr.id"></poi> (${this.formatDatetime(part.leg.arrival_datetime)}).
                        </div>`
                    }
                },
            },
        }
    }

    var dashboard = new Vue({
        el: '#vue-dashboard',
        data: {
            activeDashboard: {
                template: '<div>Loading...</div>',
            },
			legs: [],
			visits: [],
            collections: [],
            title: "Loading",
            hideBackButton: true,
        },
        methods: {
            loadData: function(data) {
                console.log("Loading data in homeDashboard.");
                console.log(data);
				this.legs.push(...data.legs);
				this.visits.push(...data.visits);
                this.collections.push(...data.collections);
                this.renderHome();
            },
            renderHome: function() {
                this.activeDashboard = "home-dashboard";
                this.title = "Travel globe";
                this.hideBackButton = true;
                const allVisits = [];
                for (let i in this.visits) {
                    allVisits.push(this.visits[i].location.id);
                }
                toggleRoutesForSelectedVisits(allVisits, true);
            },
            renderPOI: function(point, locations) {
                this.activeDashboard = createComponentForPOI(point, locations);
                this.title = point.visit.location.human_readable_name;
                this.hideBackButton = false;
            },
            renderCountry: function(country, visits) {
                this.activeDashboard = createComponentForVisits(visits);
                this.title = country;
                this.hideBackButton = false;
            },
            renderCollection: function(collection) {
                this.activeDashboard = createComponentForCollection(collection);
                this.title = collection.title;
                this.hideBackButton = false;
            }
        }
    });

    const GLOBE_RADIUS = 1;
    const GLOBE_TEXTURE_PATH = 'static/scaled_globe_10800.jpg'
    const canvas = document.querySelector('#globe-canvas');
    const canvasContainer = document.querySelector('#globe-container');
    const renderer = new THREE.WebGLRenderer({canvas, antialias: false});

    const labelRenderer = new CSS2DRenderer();
    labelRenderer.setSize(canvas.width, canvas.height);
    labelRenderer.domElement.style.position = 'absolute';
    labelRenderer.domElement.style.top = '0px';
    canvasContainer.appendChild(labelRenderer.domElement);

    const camera = new THREE.PerspectiveCamera(45, 2, 0.025, 12);
    camera.position.z = 2;
    const controls = new OrbitControls(camera, labelRenderer.domElement);
    const MIN_CAMERA_DISTANCE = GLOBE_RADIUS * 1.05;
    const MAX_CAMERA_DISTANCE = GLOBE_RADIUS * 5;
    controls.minDistance = MIN_CAMERA_DISTANCE;
    controls.maxDistance = MAX_CAMERA_DISTANCE;
    controls.enablePan = false;
    controls.enableDamping = true;
    // Increase this number to make the scrolling snappier.
    controls.dampingFactor = 0.075;
    controls.rotateSpeed = 0.85;
    controls.zoomSpeed = 0.7;
    const scene = new THREE.Scene();

    var raycaster = new THREE.Raycaster(); 
    var mouse = new THREE.Vector2();

    const topLayer = labelRenderer.domElement;
    topLayer.addEventListener('mousemove', onMouseMove, false);
    topLayer.addEventListener('touchmove', onMouseMove, false);
    topLayer.addEventListener('mousedown', onMouseDown, false);
    topLayer.addEventListener('touchstart', onMouseDown, false);

    {
        const MAX_STAR_DIST = GLOBE_RADIUS * 10;
        const MIN_DIST = GLOBE_RADIUS*5;
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
        const NUM_STARS = (GLOBE_STYLE === GLOBE_STYLE_MINIMAL ? 0 : 100);
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
        const ambientLight = new THREE.AmbientLight(0xFFFFFF, 0.8);
        scene.add(ambientLight);
        const directionalLight = new THREE.DirectionalLight(0xF9D78C, 0.2);
        directionalLight.position.set(-1, 2, 4);
        scene.add(directionalLight);
    }

    const globeGroup = new THREE.Group();
    scene.add(globeGroup);
    const pointGroup = new THREE.Group();
    globeGroup.add(pointGroup);


    function createGlobe(cb) {
        // Create the sphere obj.
        const globeGeometry = new THREE.SphereGeometry(GLOBE_RADIUS*0.995, 64, 64);

        if (GLOBE_STYLE === GLOBE_STYLE_TEXTURE) {
            const textureLoader = new THREE.TextureLoader();
            textureLoader.load(GLOBE_TEXTURE_PATH, (texture) => {
                texture.offset.set(0.25, 0.0);
                texture.wrapS = THREE.RepeatWrapping;
                texture.anisotropy = renderer.getMaxAnisotropy();
                texture.magFilter = THREE.NearestFilter;

                const globeGeometry = new THREE.SphereGeometry(GLOBE_RADIUS, 128, 128);
                const globeMaterial = new THREE.MeshPhongMaterial({ map: texture });
                globeMaterial.map.minFilter = THREE.LinearFilter;
                const globe = new THREE.Mesh(globeGeometry, globeMaterial);
                cb(globeGeometry, globe);
            });
        } else if (GLOBE_STYLE === GLOBE_STYLE_POLYGON) {
            const waterMaterial = new THREE.MeshBasicMaterial({ color: 0x3D6F95});
            const globeObjGroup = new THREE.Group();
            const globe = new THREE.Mesh(globeGeometry, waterMaterial);
            globeObjGroup.add(globe);

            const landMaterial = new THREE.MeshBasicMaterial({
                color: 0xb2bf9d,
                side: THREE.FrontSide, shininess: 0
            });
            const fineness = 2; // The smaller this number, the worse the performance. However, if this number is big, the ConicPolygonGeometry will have parts in the middle where it sags below the globe size.
            loadJSON(PATH_COUNTRIES_JSON, (data) => {
                const countryGroup = new THREE.Group();
                globeObjGroup.add(countryGroup);
                data.features.forEach(({properties, geometry}) => {
                    const polygons = geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.coordinates;
                    polygons.forEach(coords => {
                        const mesh = new THREE.Mesh(new ConicPolygonGeometry(coords, GLOBE_RADIUS*0.9, GLOBE_RADIUS, false, true, false, fineness), landMaterial);
                        countryGroup.add(mesh);
                    });
                });
                cb(globeGeometry, globeObjGroup);
            });
        } else if (GLOBE_STYLE === GLOBE_STYLE_MINIMAL) {
            const waterMaterial = new THREE.MeshBasicMaterial({ color: 0xAAAAAA});
            const globeObjGroup = new THREE.Group();
            const globe = new THREE.Mesh(globeGeometry, waterMaterial);
            globeObjGroup.add(globe);

            const landMaterial = new THREE.MeshBasicMaterial({
                color: 0xDDDDDD,
                side: THREE.FrontSide, shininess: 0
            });
            const fineness = 2; // The smaller this number, the worse the performance. However, if this number is big, the ConicPolygonGeometry will have parts in the middle where it sags below the globe size.
            loadJSON(PATH_COUNTRIES_JSON, (data) => {
                const countryGroup = new THREE.Group();
                globeObjGroup.add(countryGroup);
                data.features.forEach(({properties, geometry}) => {
                    const polygons = geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.coordinates;
                    polygons.forEach(coords => {
                        const mesh = new THREE.Mesh(new ConicPolygonGeometry(coords, GLOBE_RADIUS*0.9, GLOBE_RADIUS, false, true, false, fineness), landMaterial);
                        countryGroup.add(mesh);
                    });
                });
                cb(globeGeometry, globeObjGroup);
		});
	}else {
            alert("Invalid globe style " + GLOBE_STYLE);
        }
    }
    createGlobe((globeGeometry, group) => {
        const atmosphereShader = {
            uniforms: {},
            vertexShader: `
                varying vec3 v_normal;
                void main() {
                    v_normal = normalize(normalMatrix * normal);
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                varying vec3 v_normal;
                void main() {
                    vec3 colour = vec3(0.6, 0.8, 1.0);
                    float intensity = pow(0.5 - dot(v_normal, vec3(0.0, 0.0, 1.0)), 2.0);
                    gl_FragColor = vec4(colour, 1.0) * intensity;
                }
            `,
        }
        const atmosphereMaterial = new THREE.ShaderMaterial({
            uniforms: atmosphereShader.uniforms,
            vertexShader: atmosphereShader.vertexShader,
            fragmentShader: atmosphereShader.fragmentShader,
            side: THREE.BackSide,
            blending: THREE.AdditiveBlending,
            transparent: true,
        });
        const atmosphereMesh = new THREE.Mesh(globeGeometry, atmosphereMaterial);
        atmosphereMesh.scale.set(1.3, 1.3, 1.3);
        globeGroup.add(atmosphereMesh);
        globeGroup.add(group);
    });

    const arcGroup = new THREE.Group();
    globeGroup.add(arcGroup);

    // Convert decimal LatLng to ECEF
    function latLngToVector(lat, lng, altitude = null) {
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

            const material = new THREE.LineBasicMaterial({ color: colour, linewidth: width, transparent: true, opacity: 0.25});
            const arc = new THREE.Line(geom, material);
            arc.material.visible = false;
            arc.userData.leg = leg;
            arcGroup.add(arc);
    }

    function drawPoint(pos, radius, height, colour, label, clusterOrNull, isCluster, isTownCluster, visitObj) {
        const pointObj = new THREE.Group();
        pointObj.position.copy(pos);
        pointObj.lookAt(0, 0, 0);
        // TODO(iandioch): these should be put in userData
        pointObj.locationName = label;
        pointObj.hasCluster = !!clusterOrNull;
        pointObj.cluster = clusterOrNull;
        pointObj.isCluster = isCluster;
        pointObj.isTownCluster = isTownCluster;
        pointObj.visit = visitObj;

        const margin = radius*0.25;
        const baseGeom = new THREE.CircleGeometry(radius + margin, 8);
        const baseMaterial = new THREE.MeshBasicMaterial({color: 0xFFFFFF, side: THREE.BackSide});
        const base = new THREE.Mesh(baseGeom, baseMaterial);
        base.origMaterial = baseMaterial;
        pointObj.add(base);

        const geom = new THREE.CylinderGeometry(radius, radius*0.8, height, 8, 1, true);
        geom.applyMatrix(new THREE.Matrix4().makeRotationX(-Math.PI/2));

        const sphereGeom = new THREE.SphereGeometry(radius, 8, 4, Math.PI, Math.PI, 0, Math.PI);
        const sphere = new THREE.Mesh(sphereGeom);
        sphere.position.z -= height/2;
        geom.mergeMesh(sphere);
        geom.mergeVertices();

        const material = new THREE.MeshBasicMaterial({color: colour});
        const point = new THREE.Mesh(geom, material);
        point.origMaterial = material;
        point.position.z = -height/2;
        pointObj.add(point);

        const div = document.createElement("div");
        div.textContent = label;
        div.classList.add("poi-tooltip");
        div.style.visibility = "hidden";
        const labelDiv = new CSS2DObject(div);
        labelDiv.position.set(0, margin, 0);
        pointObj.add(labelDiv);
        pointGroup.add(pointObj);
    }

    var visits = {};
    var legs = [];
    var collections = [];
    function loadTravelMap(url) {
        loadJSON(url, (data) => {
            legs = data.legs;
            collections = data.collections;
            var highestVisits = 0;
            var mostVisited = undefined;
            for (var i in data.visits) {
                // Do not consider clusters of points when calculating the most-visited places.
                // We want the height of clusters to be the height of the highest
                // component part, so this 
                if (data.visits[i].location.type === "CLUSTER") continue;
                var numVisits = data.visits[i].hours;
                if (numVisits > highestVisits) {
                    highestVisits = numVisits;
                    mostVisited = data.visits[i];
                }
            }
            if (mostVisited) {
                lookAt(mostVisited.location.lat, mostVisited.location.lng, 2);
            }
            const highestVisitsLog10 = Math.log10(highestVisits);
            var colourScale = chroma.scale(["navy", "purple", 0xDC6F3D, 0xe9c440]).mode('lch').gamma(0.5);
            for (var i in data.visits) {
                const visit = data.visits[i];
                visits[visit.location.id] = visit;
                var radius = 0.002;
                if (visit.location.type === "CLUSTER") {
                    radius *= 1.5;
                }

                var visitHours = visit.hours;
                if (visit.location.type === "CLUSTER") {
                    visitHours = Math.max(...data.visits.filter(subVisit => (subVisit.location.type !== "CLUSTER" && subVisit.cluster === visit.location.id)).map(v => v.hours));
                }
                const colour = colourScale(Math.log10(visitHours)/Math.log10(highestVisits)).hex();

                const MIN_HEIGHT = GLOBE_RADIUS/200;
                const MAX_HEIGHT = GLOBE_RADIUS/15;

                // Use a log-based height, because in a normal case, the place where
                // you live will have an order of magnitude more visit time than
                // other places you've visited, and will be 100s of times larger in
                // a linear scale.
                const MAX_LOG_HEIGHT = MAX_HEIGHT/2;
                let height = MIN_HEIGHT + (Math.log10(visitHours)/highestVisitsLog10)*MAX_LOG_HEIGHT;
                // However, also use a linear-scaled height in addition, because
                // we don't want somewhere you stayed for 1000 hours to be the same
                // height at a glance as somewhere you stayed for 120.
                height += (visitHours / highestVisits)*(MAX_HEIGHT - MAX_LOG_HEIGHT - MIN_HEIGHT);
                const label = visit.location.human_readable_name;
                const cluster = (visit.hasOwnProperty("cluster") ? visit.cluster : null);
                drawPoint(latLngToVector(visit.location.lat, visit.location.lng), radius, height, colour, label, cluster, (visit.location.type === "CLUSTER"), (visit.location.type === "TOWN_CLUSTER"), visit);
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
                const smoothness = Math.ceil(mapToRange(0, globeCircumference, 4, 64, legDistance));
                const midpoint = latLngMidpoint(leg.dep.lat, leg.dep.lng, leg.arr.lat, leg.arr.lng);
                drawRaisedArc(latLngToVector(leg.dep.lat, leg.dep.lng), latLngToVector(midpoint[0], midpoint[1], controlPointHeight), latLngToVector(leg.arr.lat, leg.arr.lng), smoothness, 3, 0xFFFFFF, leg);
            }
            dashboard.loadData(data);

            if (urlParams.has("collection")) {
                for (const collection of collections) {
                    if (collection.id == urlParams.get("collection")) {
                        renderInfoForCollection(collection);
                    }
                }
            }
        });
    }
    loadTravelMap('http://localhost:1916/api/travel_map');

    // Make semitransparent most places except the one the user just clicked on.
    // If specificLegs is set, only those legs will be rendered.
    function toggleRoutesForSelectedVisits(locationIDs, showLegs = true, showConnectedLocations = true, specificLegs = null) {
        showLegs = showLegs && (!specificLegs);
        const visitSet = new Set(locationIDs);
        // Build up a set of everywhere that shares a leg with these visitNames.
        const connectedVisitSet = new Set(locationIDs);
        for (let i in arcGroup.children) {
            const arc = arcGroup.children[i];
            const leg = arc.userData.leg;
            var visible = false;
            if (visitSet.has(leg.arr.id)) {
                if (showConnectedLocations) connectedVisitSet.add(leg.dep.id);
                visible = true;
            } else if (visitSet.has(leg.dep.id)) {
                if (showConnectedLocations) connectedVisitSet.add(leg.arr.id);
                visible = true;
            }
            visible = visible && showLegs;
            if (specificLegs) {
                for (const specificLeg of specificLegs) {
                    if (leg.arr.id == specificLeg.arr.id && leg.dep.id == specificLeg.dep.id) {
                        visible = true;
                    }
                }
            }
            arc.material.visible = visible;
        }
        // Also add any relevant clusters to the set, so that if we zoom in/out
        // the clusters will be shown as needed in place of the specific locations.
        // TODO(iandioch): If a station, which is a member of a TOWN_CLUSTER, is clicked, the associated town's own cluster will not be rendered if you zoom out.
        for (let i in visits) {
            const visit = visits[i];
            if (!('cluster' in visit)) continue;
            if (connectedVisitSet.has(visit.location.id)) {
                connectedVisitSet.add(visit.cluster);
            }
        }
        // Make semitransparent all of the pins not in the connectedVisitSet.
        const inactiveBaseMaterial = new THREE.MeshPhongMaterial({
            color: 0xffffff,
            opacity: 0.3,
            transparent: true,
            side: THREE.DoubleSide,
            shininess: 0,
        });
        const inactivePointMaterial = new THREE.MeshPhongMaterial({
            color: 0xdddddd,
            opacity: 0.3,
            transparent: true,
            side: THREE.DoubleSide,
            shininess: 0
        });
        for (let i in pointGroup.children) {
            const pointParent = pointGroup.children[i];
            const visible = connectedVisitSet.has(pointParent.visit.location.id);
            var baseMaterial = pointParent.children[0].origMaterial;
            var pointMaterial = pointParent.children[1].origMaterial;
            if (!visible) {
                baseMaterial = inactiveBaseMaterial;
                pointMaterial = inactivePointMaterial;
            }
            pointParent.children[0].material = baseMaterial;
            pointParent.children[1].material = pointMaterial;
        }
    }

    // TODO: Rename, because it has nothing to do with the name of a location
    // anymore.
    function getPointForName(location_id) {
        // TODO: it'd be more useful to just return here visits[location_id].
        // Check if anything actually needs the point obj.
        for (let i in pointGroup.children) {
            const point = pointGroup.children[i];
            if (point.visit.location.id == location_id) return point;
        }
        return null;
    }

    function getLegsForCollection(collection) {
        const collectionLegs = [];
        for (const part of collection.parts) {
            if (part.leg_id) {
                for (const leg of legs) {
                    if (part.dep.id == leg.dep.id && part.arr.id == leg.arr.id) {
                        collectionLegs.push(leg);
                    }
                }
            }
        }
        return collectionLegs;
    }

    function getLocationsForCollection(collection) {
        const legs = getLegsForCollection(collection);
        const locationIDs = new Set();
        for (const leg of getLegsForCollection(collection)) {
            locationIDs.add(leg.dep.id);
            locationIDs.add(leg.arr.id);
        }
        const locations = [];
        for (const id of locationIDs) {
            locations.push(visits[id]);
        }
        return locations;
    }


    function getClusterMembers(location_id) {
        const point = getPointForName(location_id);
        var locations = [];
        if (point.isCluster || point.isTownCluster) {
            const clusterName = point.visit.location.id;
            for (let i in visits) {
                if (visits[i].hasOwnProperty("cluster") && (visits[i].cluster == location_id)) {
                    const members = getClusterMembers(visits[i].location.id);
                    locations.push(...members);
                }
            }
        } else {
            locations.push(point.visit.location.id);
        }
        return locations;
    }

    function renderInfoForPOI(location_id) {
        console.log("Rendering info for clicked point: ", location_id);
        const point = getPointForName(location_id);
        const locations = getClusterMembers(location_id);
        const locationObjs = [];
        for (const loc of locations) {
            locationObjs.push(visits[loc]);
        }
        toggleRoutesForSelectedVisits(locations);
        dashboard.renderPOI(point, locationObjs);
        lookAt(point.visit.location.lat, point.visit.location.lng, getCameraDistance());

    }

    function renderInfoForCountry(countryName) {
        const visits = getVisitsForCountry(countryName);
        dashboard.renderCountry(countryName, visits);
        var locationNames = [];
        for (let i in visits) {
            locationNames.push(visits[i].location.id);
        }
        toggleRoutesForSelectedVisits(locationNames, true, false);
    }

    function renderInfoForRegion(countryName, regionName) {
        const visits = getVisitsForCountry(countryName);
        const regionVisits = [];
        const regionLocationIDs = [];
        for (let i in visits) {
            if (visits[i].location.region == regionName) {
                regionVisits.push(visits[i]);
                regionLocationIDs.push(visits[i].location.id);
            }
        }
        dashboard.renderCountry(regionName, regionVisits);
        toggleRoutesForSelectedVisits(regionLocationIDs, true, false);
    }

    function renderInfoForCollection(collection) {
        console.log("Rendering info for collection", collection);
        const locationIDs = new Set();
        for (const leg of getLegsForCollection(collection)) {
            locationIDs.add(leg.dep.id);
            locationIDs.add(leg.arr.id);
        }
        console.log("Location IDs:", locationIDs);
        dashboard.renderCollection(collection);
        toggleRoutesForSelectedVisits([...locationIDs], true, false, getLegsForCollection(collection));
    }

    // Returns true if we needed to resize.
    function resizeRendererToDisplaySize(renderer) {
        const canvas = renderer.domElement;
        const needResize = (canvas.width !== canvas.clientWidth ||
                            canvas.height !== canvas.clientHeight);
        if (needResize) {
            renderer.setSize(canvas.clientWidth, canvas.clientHeight, false);
            labelRenderer.setSize(canvas.width, canvas.height);
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
            /*highlightedPoint.children[1].material.color.setHex(colourBeforeHighlight);*/
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
                    /*colourBeforeHighlight = pointParent.children[1].material.color.getHex();
                    pointParent.children[1].material.color.setHex(0x000000);
                    */pointParent.children[2].element.style.visibility = "visible";
                }
                break;
            }
        } else {
            // No currently intersected points.
            revertHighlightedPoint();
            highlightedPoint = null; // Delete prev highlight, if it exists.
        }
    }

    function getCameraDistance() {
        return camera.position.distanceTo(controls.target);
    }

    function lookAt(lat, lng, distance) {
        console.log("Tweening camera to ", lat, ", ", lng, " at distance ", distance);
        TWEEN.removeAll();
        // TODO: Instead need to do latLngToVector(lat, lng) plus some other vector of distance*(some direction)
        const newCameraPos = latLngToVector(lat, lng, distance);
        //newCameraPos.add(new THREE.Vector3(0, 0, 0).lookAt(
        //newCameraPos.addScaledVector(new THREE.Vector3(1, 0, 0).lookAt(new THREE.Vector3(0, 0, 0), distance));
        new TWEEN.Tween(camera.position).to(newCameraPos, 500).easing(TWEEN.Easing.Cubic.Out).start();
        /*const newCameraTarget = latLngToVector(lat, lng);
        new TWEEN.Tween(controls.target).to(newCameraTarget, 500).easing(TWEEN.Easing.Cubic.Out).start();*/
    }

    // If we receive any touch event, set this value.
    var TOUCH_SCREEN = false; 
    function setMousePosition(x, y) {
        const canvasRect = renderer.domElement.getBoundingClientRect();
        x -= canvasRect.left;
        y -= canvasRect.top;
        mouse.x = (x / renderer.domElement.clientWidth) * 2 - 1;
        mouse.y = -(y / renderer.domElement.clientHeight) * 2 + 1;
    }

    function onMouseMove(event) {
        event.preventDefault();
        setMousePosition(event.clientX, event.clientY);
    }

    function onMouseDown(event) {
        console.log("onMouseDown: " + event);
        event.preventDefault();
        if (("targetTouches" in event) && (event.targetTouches.length == 1)) {
            // Update "mouse" position for touchscreens. Do not do so for pinch-zooms.
            TOUCH_SCREEN = true;
            setMousePosition(event.targetTouches[0].clientX, event.targetTouches[0].clientY);
        }

        updateHighlightedPoint();

        if (highlightedPoint) {
            renderInfoForPOI(highlightedPoint.visit.location.id);
        }
    }

    var prevCameraDistance = 0;
    function onZoomChange() {
        // It seems that the iterations we're doing when zooming are extremely
        // slow, so we should try to avoid doing them if possible.
        const cameraDistance = getCameraDistance();
        if (cameraDistance === prevCameraDistance) {
            return;
        }
        prevCameraDistance = cameraDistance;

        const scale = mapToRange(MIN_CAMERA_DISTANCE, MAX_CAMERA_DISTANCE, 0.2, 5, cameraDistance);
        const showClusters = (cameraDistance > MAX_CAMERA_DISTANCE/2.0);
        const showLocalClusters = (cameraDistance > MIN_CAMERA_DISTANCE*1.1);
        for (var i in pointGroup.children) {
            const point = pointGroup.children[i];
            point.scale.set(scale, scale, scale);
            if (point.isCluster) {
                point.visible = showClusters;
            }
            if (point.hasCluster) {
                const clusterPoint = getPointForName(point.visit.cluster);
                if (clusterPoint.isTownCluster) {
                    point.visible = !showLocalClusters;
                } else {
                    point.visible = !showClusters;
                }
            }
        }

    }

    controls.addEventListener('end', onZoomChange);

    var lastTime = 0;
    var frameCount = 0;
    function render(time) {
        frameCount ++;
        if (frameCount % 100 == 0) {
            const elapsedSeconds = (time - lastTime) * 0.001;
            console.info("Frame #", frameCount, ": ", 1/elapsedSeconds, "fps");
            console.log("Scene polycount:", renderer.info.render.triangles)
            console.log("Active Drawcalls:", renderer.info.render.calls)
            console.log("Textures in Memory", renderer.info.memory.textures)
            console.log("Geometries in Memory", renderer.info.memory.geometries)

        }
        lastTime = time;
        const seconds = time * 0.001;
        const cameraDistance = getCameraDistance();
        // Only update the highlighted point if it is not a touchscreen. If it
        // is a touchscreen, and we touch somewhere with a swipe, the globe will
        // spin, and if any point happens to be under the place we touched as
        // the globe spins, it will activate without this !TOUCH_SCREEN check.
        if (!TOUCH_SCREEN) updateHighlightedPoint();

        controls.rotateSpeed = mapToRange(MIN_CAMERA_DISTANCE, MAX_CAMERA_DISTANCE, 0.1, 1.0, cameraDistance);
        TWEEN.update();
        controls.update();

        if (resizeRendererToDisplaySize(renderer)) {
            const canvas = renderer.domElement;
            camera.aspect = canvas.clientWidth / canvas.clientHeight;
            camera.updateProjectionMatrix();
        }

        renderer.render(scene, camera);
        labelRenderer.render(scene, camera);
        requestAnimationFrame(render);
    }
    requestAnimationFrame(render);
})();
