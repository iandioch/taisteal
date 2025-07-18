import TWEEN from '@tweenjs/tween.js'
import { latLngToVector } from './maths'

function lookAt(camera: THREE.Camera, latitude: number, longitude: number, distance: number|null = null) {
    if(!distance) {
        distance = 2;
    }

    TWEEN.removeAll();

    const newCameraPos = latLngToVector(latitude, longitude, distance);
    new TWEEN.Tween(camera.position).to(newCameraPos, 500).easing(TWEEN.Easing.Cubic.Out).start();
}

export { lookAt };
