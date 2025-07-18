import { latLngToVector } from './maths'

function lookAt(camera: THREE.Camera, latitude: number, longitude: number, distance: number|null = null) {
    if(!distance) {
        distance = 2;
    }

    const newCameraPos = latLngToVector(latitude, longitude, distance);
    // TODO: tween
    camera.position.set(newCameraPos.x, newCameraPos.y, newCameraPos.z);
}

export { lookAt };
