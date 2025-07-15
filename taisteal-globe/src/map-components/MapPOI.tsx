import * as THREE from 'three';
import { Visit, Location } from 'types';
import { POI_COLOUR_SCALE, POI_RADIUS, MIN_POI_HEIGHT, MAX_POI_HEIGHT } from '../constants';
import { latLngDistance } from '../maths';
import { latLngToVector } from 'maths';
import { useRef, useLayoutEffect, useState } from 'react';
import { Circle, Cylinder, Hud, Html, Sphere } from '@react-three/drei';
import { useNavigate } from 'react-router-dom';
import { getRouteForPOI, getRouteForCluster } from 'routes'
import { RootState } from 'store';
import { useSelector } from 'react-redux';
import './MapPOI.css'

type MapPOIProps = {
    latitude: number,
    longitude: number,
    label: string,
    targetURL: string,
    visitHours: number,
};

const MapPOI = (props: MapPOIProps) : JSX.Element => {
    const scaling = useSelector((state: RootState) => state.ui.mapPOISize);
    const [hovered, setHover] = useState(false);
    const navigate = useNavigate();
    const longestVisit = useSelector((state: RootState) => state.visits.longestVisit);
    const highestVisits = longestVisit ? longestVisit.hours : 1000;
    const highestVisitsLog10 = Math.log10(highestVisits);
    const MAX_LOG_HEIGHT = MAX_POI_HEIGHT/2;
    // TODO: need to handle clusters.
    const visitHours = props.visitHours;

    // Use a log-based height, because in a normal case, the place where
    // you live will have an order of magnitude more visit time than
    // other places you've visited, and will be 100s of times larger in
    // a linear scale.
    let height = MIN_POI_HEIGHT/1.5 + (Math.log10(visitHours)/highestVisitsLog10)*MAX_LOG_HEIGHT*0.33;
    // However, also use a linear-scaled height in addition, because
    // we don't want somewhere you stayed for 1000 hours to be the same
    // height at a glance as somewhere you stayed for 120.
    height += (visitHours / highestVisits) * (MAX_POI_HEIGHT/1.5 - MAX_LOG_HEIGHT - MIN_POI_HEIGHT);
    height *= scaling;
    const radius = height / 4 ;


    const pos = latLngToVector(props.latitude, props.longitude);

    const baseMaterial = new THREE.MeshBasicMaterial({color: 0xFFFFFF, side: THREE.BackSide});
    const bodyMaterial = new THREE.MeshBasicMaterial({color: POI_COLOUR_SCALE(Math.log10(visitHours)/Math.log10(highestVisits)).hex()});
    //const bodyMaterial = new THREE.MeshBasicMaterial({color: 0xFF0000});
    const margin = radius * 0.25;

    return (
        <group
            position={pos}
            onUpdate={(self) => self.lookAt(0, 0, 0)}
            onPointerOver={e => {setHover(true); e.stopPropagation();}}
            onPointerOut={e => setHover(false)}
            onClick={e => {e.stopPropagation(); navigate(props.targetURL);}}>
            {<mesh material={baseMaterial}>
                <Circle args={[radius + margin, 8]} material={baseMaterial} />
            </mesh>}
            {/*<Cylinder args={[radius, radius*0.8, height, 8, 1, false]} material={bodyMaterial} position={[0, 0, -height/2]} rotation={[-Math.PI/2, 0, 0]}/>*/}
            <Sphere args={[height/4, 8, 8]} material={bodyMaterial} />
            {hovered && 
                <Html prepend center style={{pointerEvents: 'none'}}> 
                    <p className="poi-label text-center text-lg p-1 bg-slate-100 rounded">{props.label}</p>
                </Html>
            }
        </group>
    );
};

type VisitMapPOIProps = {
    visit: Visit,
}

const VisitMapPOI = (props: VisitMapPOIProps) : JSX.Element => {
    return <MapPOI key={props.visit.location.id}
                latitude={props.visit.location.latitude}
                longitude={props.visit.location.longitude}
                label={props.visit.location.name}
                targetURL={getRouteForPOI(props.visit.location.id)}
                visitHours={props.visit.hours} />
}

type ClusterMapPOIProps = {
    visits: Visit[],
    neighbours: MaybeCluster[],
    regions: Map<string, number>,
    countries: Map<string, number>,
}

const getLabelForCluster = (visits: Visit[], regions: Map<string, number>, countries: Map<string, number>, neighbours: MaybeCluster[]) : string => {
    let titles = [];
    // This is so that eg. "Seychelles" is just presented as "Seychelles".
    // TODO: maybe include <= 2, to facilitate Monaco, San Marino, etc?
    let useCountryNames = (countries.size == 1);
    if (useCountryNames) {
        const sortedCountries = Array.from(countries.entries()).sort((a, b) => a[1] - b[1]).reverse();
        const primaryCountry = sortedCountries[0][0]; //countries.keys().next().value;
        for (const neighbour of neighbours) {
            if (neighbour.countries.has(primaryCountry)) {
                useCountryNames = false;
            }
        }
        if (useCountryNames) {
            titles.push(primaryCountry);
            console.log("Using country name " + primaryCountry + " for ", visits);
        }
    }

    if (!useCountryNames) {
        let useRegionNames = true;
        // Sorted regions by hours.
        const sortedRegions = Array.from(regions.entries()).sort((a, b) => a[1] - b[1]).reverse();

        // If this region is shared among neighbours, calling this place by the region
        // name instead of the actual locality may not be useful.
        const primaryRegion = sortedRegions[0][0];
        for (const neighbour of neighbours) {
            if (neighbour.regions.has(primaryRegion)) {
                console.log(primaryRegion + " is in ", neighbour);
                useRegionNames = false;
            }
        }
        if (useRegionNames) {
            for (let i = 0; i < Math.min(3, sortedRegions.length); i++) {
                titles.push(sortedRegions[i][0]);
            }
        } else {
            const sortedVisits = visits.sort((a, b) => a.hours - b.hours).reverse();
            for (let i = 0; i < Math.min(3, sortedVisits.length); i++) {
                titles.push(sortedVisits[i].location.name);
            }
        }
    }

    if (titles.length == 1) {
        return `${titles[0]}`
    } else if (titles.length == 2) {
        return `${titles[0]} & ${titles[1]}`
    } else {
        return `${titles[0]}, ${titles[1]} & More`
    }
}

const ClusterMapPOI = (props: ClusterMapPOIProps) : JSX.Element => {
    const label = getLabelForCluster(props.visits, props.regions, props.countries, props.neighbours);
    // Set position to be average of component positions.
    const latitude = props.visits.map((v) => v.location.latitude).reduce((a, b) => a+b, 0)/props.visits.length; 
    const longitude = props.visits.map((v) => v.location.longitude).reduce((a, b) => a+b, 0)/props.visits.length;
    const visitHours = Math.max(...props.visits.map((v) => v.hours));
    const ids = props.visits.map((v) => v.location.id);
    const key = ids.join(",");
    return <MapPOI key={key}
                latitude={latitude}
                longitude={longitude}
                label={label}
                targetURL={getRouteForCluster(label, ids) }
                visitHours={visitHours} />
}

type MapPOIGroupProps = {
    visits: Visit[],
    cluster: boolean,
};

type MaybeCluster = {
    visits: Visit[],
    hours: number,
    centroid: Visit,
    regions: Map<string, number>,
    countries: Map<string, number>,
}

const getClusteredVisits = (visits: Visit[], cameraDistanceFactor: number): MaybeCluster[] => {
    const clusters: MaybeCluster[] = [];
    const reqDistanceKm = 200 * (cameraDistanceFactor);
    console.log("Req distance for cluster: " + reqDistanceKm);
    for (const visit of visits) {
        let bestCluster = null;
        let leastDistance = reqDistanceKm*10;
        for (const cluster of clusters) {
            const dist = latLngDistance(visit.location.latitude, visit.location.longitude, cluster.centroid.location.latitude, cluster.centroid.location.longitude);
            if (dist > reqDistanceKm || dist > leastDistance) {
                continue;
            }
            bestCluster = cluster;
            leastDistance = dist;
        }
        if (bestCluster) {
            bestCluster.visits.push(visit);
            bestCluster.hours += visit.hours;
            // Not sure if the centroid actually makes much of a difference.
            if (bestCluster.centroid.hours < visit.hours) {
                bestCluster.centroid = visit;
            }
        } else {
            clusters.push({visits: [visit], hours: visit.hours, centroid: visit, regions: new Map(), countries: new Map()});
        }
    }
    for (const cluster of clusters) {
        const regions = cluster.regions;
        for (const visit of cluster.visits) {
            regions.set(visit.location.region, visit.hours + (regions.get(visit.location.region) || 0));
        }
        const countries = cluster.countries;
        for (const visit of cluster.visits) {
            countries.set(visit.location.countryName, visit.hours + (regions.get(visit.location.countryName) || 0));
        }
    }
    return clusters;
};

const MapPOIGroup = (props: MapPOIGroupProps) : JSX.Element => {
    const cameraDistance = useSelector((state: RootState) => state.ui.scaleFactor);
    let renderedVisits: MaybeCluster[] = props.visits.map((v) => {return {visits: [v], centroid: v, hours: v.hours, regions: new Map(), countries: new Map()}});
    if (props.cluster && cameraDistance > 0) {
        renderedVisits = getClusteredVisits(props.visits, cameraDistance)
    }
    console.log("After clustering, rendering " + (renderedVisits.length) + " POIs.");
    return (
        <>
            {[...renderedVisits].map((cluster, i) => {
                const visits = cluster.visits;
                if (visits.length == 1) {
                    const visit = visits[0];
                    return (<VisitMapPOI key={visit.location.id} visit={visit} />);
                } else {
                    return (<ClusterMapPOI visits={visits} regions={cluster.regions} countries={cluster.countries} neighbours={renderedVisits.filter((el, j) => j != i)}/>);
                }
            })}
        </>
    );
};

const AllMapPOIs = ():JSX.Element => {
    const visits = useSelector((state: RootState) => state.visits);
    console.log("All visits:", visits.visits.length);
    return (
        <MapPOIGroup visits={visits.visits} cluster={true} />
    );
};

export { MapPOI, MapPOIGroup, AllMapPOIs, VisitMapPOI }
