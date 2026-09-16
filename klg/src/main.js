import * as THREE from 'three';

const container = document.querySelector('#game');
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x8bb7d8);
scene.fog = new THREE.Fog(0x8bb7d8, 45, 180);

const camera = new THREE.PerspectiveCamera(65, innerWidth / innerHeight, 0.1, 500);
camera.position.set(0, 6, 10);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
container.appendChild(renderer.domElement);

scene.add(new THREE.HemisphereLight(0xffffff, 0x45604b, 2.2));
const sun = new THREE.DirectionalLight(0xffffff, 2.5);
sun.position.set(30, 50, 20);
sun.castShadow = true;
scene.add(sun);

const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(240, 240),
  new THREE.MeshStandardMaterial({ color: 0x536b48, roughness: 1 })
);
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);

function building(x, z, w, h, d, color = 0xb7a78b) {
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(w, h, d),
    new THREE.MeshStandardMaterial({ color })
  );
  mesh.position.set(x, h / 2, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  scene.add(mesh);
  return mesh;
}

// Kigali-inspired starter city block.
building(-12, -8, 10, 8, 10, 0xc6b58e);
building(5, -12, 8, 14, 8, 0x9eacb0);
building(15, 4, 12, 7, 10, 0xd1c09b);
building(-18, 12, 9, 11, 12, 0xa98f78);
building(3, 15, 14, 5, 8, 0x8f9f83);

// Road grid.
const roadMat = new THREE.MeshStandardMaterial({ color: 0x303337 });
for (const x of [-24, 0, 24]) {
  const road = new THREE.Mesh(new THREE.PlaneGeometry(7, 240), roadMat);
  road.rotation.x = -Math.PI / 2;
  road.position.x = x;
  road.position.y = 0.01;
  scene.add(road);
}
for (const z of [-24, 0, 24]) {
  const road = new THREE.Mesh(new THREE.PlaneGeometry(240, 7), roadMat);
  road.rotation.x = -Math.PI / 2;
  road.position.z = z;
  road.position.y = 0.02;
  scene.add(road);
}

// Player placeholder.
const player = new THREE.Mesh(
  new THREE.CapsuleGeometry(0.65, 1.2, 6, 12),
  new THREE.MeshStandardMaterial({ color: 0x1d2630 })
);
player.position.y = 1.25;
player.castShadow = true;
scene.add(player);

const keys = new Set();
addEventListener('keydown', e => keys.add(e.key.toLowerCase()));
addEventListener('keyup', e => keys.delete(e.key.toLowerCase()));

const clock = new THREE.Clock();
const cameraOffset = new THREE.Vector3(0, 5.5, 8.5);
const desiredCamera = new THREE.Vector3();

function updatePlayer(dt) {
  const speed = 8 * dt;
  const forward = keys.has('w') || keys.has('arrowup');
  const backward = keys.has('s') || keys.has('arrowdown');
  const left = keys.has('a') || keys.has('arrowleft');
  const right = keys.has('d') || keys.has('arrowright');

  if (forward) player.position.z -= speed;
  if (backward) player.position.z += speed;
  if (left) player.position.x -= speed;
  if (right) player.position.x += speed;

  player.position.x = THREE.MathUtils.clamp(player.position.x, -110, 110);
  player.position.z = THREE.MathUtils.clamp(player.position.z, -110, 110);

  const moving = forward || backward || left || right;
  if (moving) player.rotation.y += 0.01;
}

function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.05);
  updatePlayer(dt);

  desiredCamera.copy(player.position).add(cameraOffset);
  camera.position.lerp(desiredCamera, 0.08);
  camera.lookAt(player.position.x, player.position.y + 0.7, player.position.z);

  renderer.render(scene, camera);
}

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

animate();
