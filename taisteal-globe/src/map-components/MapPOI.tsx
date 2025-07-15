import * as THREE from 'three';
import { Visit } from 'types';
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
}

const getLabelForCluster = (visits: Visit[]) : string => {
    const regions = new Map<string, number>();
    for (const visit of visits) {
        regions.set(visit.location.region, visit.hours + (regions.get(visit.location.region) || 0));
    }
    const sortedRegions = Array.from(regions.entries()).sort((a, b) => a[1] - b[1]).reverse();
    if (sortedRegions.length == 1) {
        return `${sortedRegions[0][0]}`
    } else if (sortedRegions.length == 2) {
        return `${sortedRegions[0][0]} & ${sortedRegions[1][0]}`
    } else {
        return `${sortedRegions[0][0]}, ${sortedRegions[1][0]} & More`
    }
}

const ClusterMapPOI = (props: ClusterMapPOIProps) : JSX.Element => {
    const label = getLabelForCluster(props.visits);
    const latitude = props.visits[0].location.latitude;
    const longitude = props.visits[0].location.longitude;
    const visitHours = Math.max(...props.visits.map((v) => v.hours));
    const ids = props.visits.map((v) => v.location.id);
    const key = ids.join(",");
    return <MapPOI key={key}
                latitude={latitude}
                longitude={longitude}
                label={label}
                targetURL={getRouteForCluster(ids) }
                visitHours={visitHours} />
}

type MapPOIGroupProps = {
    visits: Visit[],
    cluster: boolean,
};

type MaybeCluster = {
    visits: Visit[],
    hours: number,
}

const getClusteredVisits = (visits: Visit[], cameraDistanceFactor: number): Visit[][] => {
    const clusters: MaybeCluster[] = [];
    const reqDistanceKm = 250 * (cameraDistanceFactor);
    console.log("Req distance for cluster: " + reqDistanceKm);
    for (const visit of visits) {
        let added = false;
        for (const cluster of clusters) {
            for (const v of cluster.visits) {
                if (latLngDistance(visit.location.latitude, visit.location.longitude, v.location.latitude, v.location.longitude) < reqDistanceKm) {
                    cluster.visits.push(visit);
                    cluster.hours += visit.hours;
                    console.log("Adding " + visit + " to cluster " + cluster);
                    added = true;
                    break;
                }
                // Only check the first one, just because otherwise it's so slow.
                break;
            }
            if (added) break;
        }
        if (!added) {
            clusters.push({visits: [visit], hours: visit.hours});
        }
    }
    return clusters.map((c) => c.visits);
};

const MapPOIGroup = (props: MapPOIGroupProps) : JSX.Element => {
    const cameraDistance = useSelector((state: RootState) => state.ui.scaleFactor);
    let renderedVisits = props.visits.map((v) => [v]);
    if (props.cluster) {
        renderedVisits = getClusteredVisits(props.visits, cameraDistance)
    }
    console.log("After clustering, rendering " + (renderedVisits.length) + " POIs.");
    return (
        <>
            {[...renderedVisits].map((visits, i) => {
                if (visits.length == 1) {
                    const visit = visits[0];
                    return (<VisitMapPOI key={visit.location.id} visit={visit} />);
                } else {
                    return (<ClusterMapPOI visits={visits} />);
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
