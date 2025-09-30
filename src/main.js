import * as THREE from 'three';
import * as CANNON from 'cannon-es';

// Scene setup
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87ceeb); // Sky blue

// Physics world setup
const world = new CANNON.World();
world.gravity.set(0, -9.82, 0); // Earth gravity (m/s²)
world.broadphase = new CANNON.SAPBroadphase(world);
world.allowSleep = true;

// Camera setup
const camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
);
camera.position.set(0, 5, 10);
camera.lookAt(0, 0, 0);

// Renderer setup
const canvas = document.getElementById('game-canvas');
const renderer = new THREE.WebGLRenderer({
    canvas: canvas,
    antialias: true
});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

// Lighting
const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
directionalLight.position.set(50, 50, 50);
directionalLight.castShadow = true;
directionalLight.shadow.camera.left = -50;
directionalLight.shadow.camera.right = 50;
directionalLight.shadow.camera.top = 50;
directionalLight.shadow.camera.bottom = -50;
directionalLight.shadow.camera.near = 0.1;
directionalLight.shadow.camera.far = 200;
directionalLight.shadow.mapSize.width = 2048;
directionalLight.shadow.mapSize.height = 2048;
scene.add(directionalLight);

// Ground plane
const groundGeometry = new THREE.PlaneGeometry(100, 100);
const groundMaterial = new THREE.MeshStandardMaterial({
    color: 0x333333,
    roughness: 0.8,
    metalness: 0.2
});
const ground = new THREE.Mesh(groundGeometry, groundMaterial);
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);

// Grid helper for visual reference
const gridHelper = new THREE.GridHelper(100, 100, 0x888888, 0x444444);
scene.add(gridHelper);

// Ground physics body
const groundMaterialPhysics = new CANNON.Material('ground');
const groundShape = new CANNON.Plane();
const groundBody = new CANNON.Body({
    mass: 0, // Static body (infinite mass)
    shape: groundShape,
    material: groundMaterialPhysics
});
groundBody.quaternion.setFromEuler(-Math.PI / 2, 0, 0); // Rotate to horizontal
world.addBody(groundBody);

// Add a test cube (temporary placeholder for car)
const cubeGeometry = new THREE.BoxGeometry(2, 1, 4);
const cubeMaterial = new THREE.MeshStandardMaterial({ color: 0xff0000 });
const cube = new THREE.Mesh(cubeGeometry, cubeMaterial);
cube.position.set(0, 0.6, 0);
cube.castShadow = true;
cube.receiveShadow = true;
scene.add(cube);

// Car chassis physics body - SIMPLIFIED
const carShape = new CANNON.Box(new CANNON.Vec3(1, 0.5, 2));
const carBody = new CANNON.Body({
    mass: 500,
    shape: carShape,
    position: new CANNON.Vec3(0, 0.6, 0), // Slightly higher to avoid ground collision issues
    linearDamping: 0.0, // NO damping - we'll handle it manually
    angularDamping: 0.0 // NO damping - we'll handle it manually
});

carBody.fixedRotation = false;
carBody.allowSleep = false;

world.addBody(carBody);

// Car movement variables
const carSpeed = 0.15;
const carRotationSpeed = 0.03;
let carVelocity = new THREE.Vector3();
let carRotationVelocity = 0;

// Keyboard input state
const keys = {
    forward: false,
    backward: false,
    left: false,
    right: false,
    brake: false
};

// Performance tracking variables
let accelerationStartTime = null;
let accelerationStartSpeed = 0;
let brakingStartTime = null;
let brakingStartSpeed = 0;
let coastingStartTime = null;
let coastingStartSpeed = 0;
let maxSpeedReached = 0;
let wasAccelerating = false;
let wasBraking = false;
let wasCoasting = false;

// Keyboard event listeners
window.addEventListener('keydown', (event) => {
    switch(event.key.toLowerCase()) {
        case 'w':
        case 'arrowup':
            keys.forward = true;
            break;
        case 's':
        case 'arrowdown':
            keys.backward = true;
            break;
        case 'a':
        case 'arrowleft':
            keys.left = true;
            break;
        case 'd':
        case 'arrowright':
            keys.right = true;
            break;
        case ' ':
            keys.brake = true;
            break;
    }
});

window.addEventListener('keyup', (event) => {
    switch(event.key.toLowerCase()) {
        case 'w':
        case 'arrowup':
            keys.forward = false;
            break;
        case 's':
        case 'arrowdown':
            keys.backward = false;
            break;
        case 'a':
        case 'arrowleft':
            keys.left = false;
            break;
        case 'd':
        case 'arrowright':
            keys.right = false;
            break;
        case ' ':
            keys.brake = false;
            break;
    }
});

// Update car movement - DIRECT VELOCITY CONTROL (SIMPLIFIED)
function updateCarMovement() {
    const acceleration = 0.6; // Realistic sports car acceleration
    const maxSpeed = 200; // Allow very high speeds (top speed controlled by drag)
    const friction = 0.99; // Minimal friction when coasting
    const turnSpeed = 2.5;
    const lateralGrip = 0.85; // Tire grip coefficient (0.85 = strong grip, reduces sideways sliding)
    const dragCoefficient = 0.0005; // Realistic air drag - allows 150-180 km/h top speed

    // Keep car upright (lock X and Z rotation)
    const euler = new CANNON.Vec3();
    carBody.quaternion.toEuler(euler);
    carBody.quaternion.setFromEuler(0, euler.y, 0);

    // Keep car at fixed height above ground
    carBody.position.y = 0.6;
    carBody.velocity.y = 0;

    // Get forward and right direction vectors
    const forward = new CANNON.Vec3(0, 0, -1);
    carBody.quaternion.vmult(forward, forward);

    const right = new CANNON.Vec3(1, 0, 0);
    carBody.quaternion.vmult(right, right);

    // Get current speed for tracking
    const currentSpeedKMH = Math.sqrt(carBody.velocity.x ** 2 + carBody.velocity.z ** 2) * 3.6;

    // ACCELERATION TRACKING
    if (keys.forward) {
        if (!wasAccelerating) {
            // Just started accelerating
            accelerationStartTime = performance.now();
            accelerationStartSpeed = currentSpeedKMH;
            wasAccelerating = true;
            console.log(`🚀 ACCELERATION START - Speed: ${currentSpeedKMH.toFixed(1)} km/h`);
        }
        carBody.velocity.x += forward.x * acceleration;
        carBody.velocity.z += forward.z * acceleration;

        // Track max speed
        if (currentSpeedKMH > maxSpeedReached) {
            maxSpeedReached = currentSpeedKMH;
        }
    } else if (wasAccelerating) {
        // Stopped accelerating
        const duration = ((performance.now() - accelerationStartTime) / 1000).toFixed(2);
        const speedGain = (currentSpeedKMH - accelerationStartSpeed).toFixed(1);
        console.log(`✅ ACCELERATION END - Duration: ${duration}s | Speed gain: ${speedGain} km/h | Final: ${currentSpeedKMH.toFixed(1)} km/h | Max reached: ${maxSpeedReached.toFixed(1)} km/h`);
        wasAccelerating = false;
    }

    if (keys.backward) {
        carBody.velocity.x -= forward.x * acceleration * 0.5;
        carBody.velocity.z -= forward.z * acceleration * 0.5;
    }

    // BRAKE TRACKING
    if (keys.brake) {
        if (!wasBraking && currentSpeedKMH > 10) {
            // Just started braking (only log if moving)
            brakingStartTime = performance.now();
            brakingStartSpeed = currentSpeedKMH;
            wasBraking = true;
            console.log(`🛑 BRAKING START - Speed: ${currentSpeedKMH.toFixed(1)} km/h`);
        }
        const brakeStrength = 0.92; // Realistic braking (was 0.85, too strong)
        carBody.velocity.x *= brakeStrength;
        carBody.velocity.z *= brakeStrength;

        // Check if stopped (only log once)
        if (currentSpeedKMH < 5 && wasBraking && brakingStartSpeed > 10) {
            const duration = ((performance.now() - brakingStartTime) / 1000).toFixed(2);
            const speedLoss = (brakingStartSpeed - currentSpeedKMH).toFixed(1);
            console.log(`✅ BRAKING COMPLETE - Duration: ${duration}s | Speed loss: ${speedLoss} km/h | From: ${brakingStartSpeed.toFixed(1)} to ${currentSpeedKMH.toFixed(1)} km/h`);
            wasBraking = false;
        }
    } else if (wasBraking && currentSpeedKMH >= 5) {
        // Released brake before stopping
        const duration = ((performance.now() - brakingStartTime) / 1000).toFixed(2);
        const speedLoss = (brakingStartSpeed - currentSpeedKMH).toFixed(1);
        console.log(`⚠️ BRAKING RELEASED - Duration: ${duration}s | Speed loss: ${speedLoss} km/h | From: ${brakingStartSpeed.toFixed(1)} to ${currentSpeedKMH.toFixed(1)} km/h`);
        wasBraking = false;
    }

    // COASTING TRACKING (no input)
    if (!keys.forward && !keys.backward && !keys.brake) {
        if (!wasCoasting && currentSpeedKMH > 30) {
            // Just started coasting (only log at meaningful speeds)
            coastingStartTime = performance.now();
            coastingStartSpeed = currentSpeedKMH;
            wasCoasting = true;
            console.log(`🌊 COASTING START - Speed: ${currentSpeedKMH.toFixed(1)} km/h`);
        }
        carBody.velocity.x *= friction;
        carBody.velocity.z *= friction;

        // Check if significantly slowed down (only log once when dropped 50%)
        if (wasCoasting && currentSpeedKMH < coastingStartSpeed * 0.5 && coastingStartSpeed > 30) {
            const duration = ((performance.now() - coastingStartTime) / 1000).toFixed(2);
            const speedLoss = (coastingStartSpeed - currentSpeedKMH).toFixed(1);
            console.log(`✅ COASTING DECEL - Duration: ${duration}s | Speed loss: ${speedLoss} km/h | From: ${coastingStartSpeed.toFixed(1)} to ${currentSpeedKMH.toFixed(1)} km/h`);
            wasCoasting = false;
        }
    } else if (wasCoasting && coastingStartSpeed > 30) {
        // Stopped coasting (started accelerating or braking)
        const duration = ((performance.now() - coastingStartTime) / 1000).toFixed(2);
        const speedLoss = (coastingStartSpeed - currentSpeedKMH).toFixed(1);
        console.log(`⚠️ COASTING END - Duration: ${duration}s | Speed loss: ${speedLoss} km/h | From: ${coastingStartSpeed.toFixed(1)} to ${currentSpeedKMH.toFixed(1)} km/h`);
        wasCoasting = false;
    }

    // Cap max speed
    const speed = Math.sqrt(carBody.velocity.x ** 2 + carBody.velocity.z ** 2);
    if (speed > maxSpeed) {
        const factor = maxSpeed / speed;
        carBody.velocity.x *= factor;
        carBody.velocity.z *= factor;
    }

    // SPEED-DEPENDENT STEERING
    // Calculate current speed
    const currentSpeed = Math.sqrt(carBody.velocity.x ** 2 + carBody.velocity.z ** 2);

    // Reduce steering sensitivity at high speeds (more stable at high speed)
    const steeringFactor = 1.0 / (1.0 + currentSpeed * 0.08);
    const adjustedTurnSpeed = turnSpeed * steeringFactor;

    // Apply steering
    if (keys.left) {
        carBody.angularVelocity.y = adjustedTurnSpeed;
    } else if (keys.right) {
        carBody.angularVelocity.y = -adjustedTurnSpeed;
    } else {
        carBody.angularVelocity.y *= 0.8; // Dampen rotation
    }

    // TIRE LATERAL FRICTION - Reduce sideways sliding
    // Calculate how much the car is moving sideways (perpendicular to forward direction)
    const currentVelocity = new CANNON.Vec3(carBody.velocity.x, 0, carBody.velocity.z);
    const lateralVelocity = currentVelocity.dot(right); // Sideways velocity component

    // Apply friction force to reduce sideways motion (this simulates tire grip)
    carBody.velocity.x -= right.x * lateralVelocity * lateralGrip;
    carBody.velocity.z -= right.z * lateralVelocity * lateralGrip;

    // AIR DRAG - Increases with speed² (realistic aerodynamic resistance)
    const dragForce = currentSpeed * currentSpeed * dragCoefficient;

    // Apply drag opposite to velocity direction
    if (currentSpeed > 0.1) { // Avoid division by zero at very low speeds
        const velocityDirection = new CANNON.Vec3(
            carBody.velocity.x / currentSpeed,
            0,
            carBody.velocity.z / currentSpeed
        );
        carBody.velocity.x -= velocityDirection.x * dragForce;
        carBody.velocity.z -= velocityDirection.z * dragForce;
    }
}

// Camera follow system
const cameraOffset = new THREE.Vector3(0, 5, 10);
const cameraLookAtOffset = new THREE.Vector3(0, 0, -5);
const cameraLerpFactor = 0.1;

function updateCamera() {
    // Calculate desired camera position (behind and above the car)
    const desiredPosition = new THREE.Vector3();
    desiredPosition.copy(cameraOffset);
    desiredPosition.applyQuaternion(cube.quaternion);
    desiredPosition.add(cube.position);

    // Smooth camera movement (lerp)
    camera.position.lerp(desiredPosition, cameraLerpFactor);

    // Calculate look-at point (slightly ahead of the car)
    const lookAtPoint = new THREE.Vector3();
    lookAtPoint.copy(cameraLookAtOffset);
    lookAtPoint.applyQuaternion(cube.quaternion);
    lookAtPoint.add(cube.position);

    // Make camera look at the point
    camera.lookAt(lookAtPoint);
}

// FPS counter
let lastTime = performance.now();
let frames = 0;
let fps = 0;

function updateFPS() {
    frames++;
    const currentTime = performance.now();
    const elapsed = currentTime - lastTime;

    if (elapsed >= 1000) {
        fps = Math.round((frames * 1000) / elapsed);
        document.getElementById('fps-counter').textContent = `FPS: ${fps}`;
        frames = 0;
        lastTime = currentTime;
    }
}

// Speedometer update
function updateSpeedometer() {
    // Calculate speed in m/s
    const speedMS = Math.sqrt(carBody.velocity.x ** 2 + carBody.velocity.z ** 2);
    // Convert to km/h (multiply by 3.6)
    const speedKMH = Math.round(speedMS * 3.6);
    document.getElementById('speed-value').textContent = speedKMH;
}

// Handle window resize
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// Physics time step
const timeStep = 1 / 60; // 60 FPS physics simulation

// Animation loop
function animate() {
    requestAnimationFrame(animate);

    // CRITICAL: Apply forces BEFORE physics step
    updateCarMovement();

    // Update physics world
    world.step(timeStep);

    // Sync Three.js mesh with physics body
    cube.position.copy(carBody.position);
    cube.quaternion.copy(carBody.quaternion);

    // Update camera to follow car
    updateCamera();

    // Update FPS counter
    updateFPS();

    // Update speedometer
    updateSpeedometer();

    // Render scene
    renderer.render(scene, camera);
}

// Start animation
animate();

console.log('🏎️ Racing game initialized! Scene is ready.');
console.log('Controls: WASD or Arrow Keys to drive');
