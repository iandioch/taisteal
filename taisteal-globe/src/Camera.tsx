import * as THREE from 'three'
import { OrbitControls, PerspectiveCamera } from '@react-three/drei'

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
                position={props.position
                //[0, 0, 2]
                }
           />
}

export { Camera };
