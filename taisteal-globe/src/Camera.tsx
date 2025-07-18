import * as THREE from 'three'
import { OrbitControls, PerspectiveCamera } from '@react-three/drei'
import { lookAt, setCameraPosition } from 'action'
import { useThree } from '@react-three/fiber'
import { uiSlice } from 'store'
import store from 'store'
import { useEffect } from 'react'


type CameraProps = {
    position: THREE.Vector3,
};

function Camera(props: CameraProps) {
    return <PerspectiveCamera
                makeDefault
                fov={30}
                aspect={2}
                near={0.025}
                far={12}
                position={props.position}
           />
}

function CameraPointer(props: CameraProps) {
    const { camera } = useThree();
    setCameraPosition(camera, props.position);
    useEffect(() => {
        const dist = props.position.distanceTo(new THREE.Vector3(0, 0, 0));
        console.log("CameraPointer setting camera distance to", dist);
        store.dispatch(uiSlice.actions.setCameraDistance(dist));
    });
    return (<> </>);
}

export { Camera, CameraPointer };
