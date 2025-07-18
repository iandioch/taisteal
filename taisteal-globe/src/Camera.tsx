import * as THREE from 'three'
import { OrbitControls, PerspectiveCamera } from '@react-three/drei'
import { lookAt, setCameraPosition } from 'action'
import { useThree } from '@react-three/fiber'


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
    return (<> </>);
}

export { Camera, CameraPointer };
