import TWEEN from '@tweenjs/tween.js'
import { latLngToVector } from './maths'

function lookAt(camera: THREE.Camera, latitude: number, longitude: number, distance: number|null = null) {
    if(!distance) {
        distance = 2;
    }


    const newCameraPos = latLngToVector(latitude, longitude, distance);
    setCameraPosition(camera, newCameraPos);
}

function setCameraPosition(camera: THREE.Camera, position: THREE.Vector3) {
    TWEEN.removeAll();
    new TWEEN.Tween(camera.position).to(position, 500).easing(TWEEN.Easing.Cubic.Out).start();
}

export { lookAt, setCameraPosition };
