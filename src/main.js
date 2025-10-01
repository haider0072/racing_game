import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

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
const ambientLight = new THREE.AmbientLight(0xffffff, 1.0); // Increased from 0.6 to 1.0
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 1.2); // Increased from 0.8 to 1.2
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

// Create oval racing track with straights and curves
const trackWidth = 12; // 2-lane track
const trackInnerRadius = 80; // Inner radius of curves
const trackOuterRadius = trackInnerRadius + trackWidth;
const straightLength = 200; // Length of straight sections

// Create track using Shape and ExtrudeGeometry for smooth curves
const trackShape = new THREE.Shape();

// Start at bottom of left straight
trackShape.moveTo(-trackWidth/2, -straightLength/2);

// Left straight (going up)
trackShape.lineTo(-trackWidth/2, straightLength/2);

// Top curve (counter-clockwise)
trackShape.absarc(0, straightLength/2, trackInnerRadius, Math.PI, 0, true);

// Right straight (going down)
trackShape.lineTo(trackOuterRadius, straightLength/2);
trackShape.lineTo(trackOuterRadius, -straightLength/2);

// Bottom curve (counter-clockwise)
trackShape.absarc(0, -straightLength/2, trackOuterRadius, 0, Math.PI, true);

// Close the shape
trackShape.lineTo(-trackWidth/2, -straightLength/2);

// Create asphalt material
const trackMaterial = new THREE.MeshStandardMaterial({
    color: 0x2a2a2a,
    roughness: 0.9,
    metalness: 0.1
});

// Create track mesh
const trackGeometry = new THREE.ShapeGeometry(trackShape);
const track = new THREE.Mesh(trackGeometry, trackMaterial);
track.rotation.x = -Math.PI / 2;
track.position.y = 0.01; // Slightly above ground to prevent z-fighting
track.receiveShadow = true;
scene.add(track);

// Add lane markings using lines
const lineMaterial = new THREE.LineBasicMaterial({ color: 0xffffff });
const innerLaneMaterial = new THREE.LineBasicMaterial({ color: 0xffff00 }); // Yellow for edges

// Helper function to create dashed center line
function createCenterLine() {
    const points = [];
    const dashLength = 5;
    const gapLength = 5;

    // Left straight
    for (let y = -straightLength/2; y < straightLength/2; y += dashLength + gapLength) {
        points.push(new THREE.Vector3(0, 0.05, y));
        points.push(new THREE.Vector3(0, 0.05, Math.min(y + dashLength, straightLength/2)));
    }

    // Top curve
    const topCurveRadius = trackInnerRadius + trackWidth/2;
    for (let angle = Math.PI; angle > 0; angle -= 0.2) {
        const x = Math.cos(angle) * topCurveRadius;
        const z = straightLength/2 + Math.sin(angle) * topCurveRadius;
        points.push(new THREE.Vector3(x, 0.05, z));
    }

    // Right straight
    for (let y = straightLength/2; y > -straightLength/2; y -= dashLength + gapLength) {
        points.push(new THREE.Vector3(trackInnerRadius + trackWidth/2, 0.05, y));
        points.push(new THREE.Vector3(trackInnerRadius + trackWidth/2, 0.05, Math.max(y - dashLength, -straightLength/2)));
    }

    // Bottom curve
    const bottomCurveRadius = trackInnerRadius + trackWidth/2;
    for (let angle = 0; angle < Math.PI; angle += 0.2) {
        const x = Math.cos(angle) * bottomCurveRadius;
        const z = -straightLength/2 + Math.sin(angle) * bottomCurveRadius;
        points.push(new THREE.Vector3(x, 0.05, z));
    }

    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const line = new THREE.LineSegments(geometry, lineMaterial);
    scene.add(line);
}

createCenterLine();

// Add grass infield and outfield
const grassMaterial = new THREE.MeshStandardMaterial({
    color: 0x3a5f3a,
    roughness: 1.0
});

// Large ground plane for grass
const groundGeometry = new THREE.PlaneGeometry(800, 800);
const ground = new THREE.Mesh(groundGeometry, grassMaterial);
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);

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

// Load Nissan GT-R R35 3D model
let car = null; // Will hold the loaded car model
const loader = new GLTFLoader();

// Loading screen elements
const loadingScreen = document.getElementById('loading-screen');
const loadingProgress = document.getElementById('loading-progress');

loader.load(
    '/assets/nissan_gtr/scene.gltf',
    (gltf) => {
        car = gltf.scene;

        // The model's pivot point might not be at the bottom, so we need to offset it
        car.position.set(0, 0, 0); // Start at ground level

        // Scale the model (adjust if needed)
        car.scale.set(1, 1, 1);

        // Enable shadows for all meshes in the model
        car.traverse((child) => {
            if (child.isMesh) {
                child.castShadow = true;
                child.receiveShadow = true;
            }
        });

        scene.add(car);
        console.log('🏎️ Nissan GT-R R35 model loaded successfully!');

        // Hide loading screen
        loadingScreen.classList.add('hidden');
    },
    (progress) => {
        const percentComplete = Math.round((progress.loaded / progress.total) * 100);
        loadingProgress.textContent = `${percentComplete}%`;
        console.log(`Loading model: ${percentComplete}%`);
    },
    (error) => {
        console.error('Error loading GT-R model:', error);
        loadingScreen.textContent = 'Error loading model!';
        // Show cube if model fails to load
        cube.visible = true;
        setTimeout(() => {
            loadingScreen.classList.add('hidden');
        }, 2000);
    }
);

// Fallback cube (temporary - will be hidden once model loads)
const cubeGeometry = new THREE.BoxGeometry(2, 1, 4);
const cubeMaterial = new THREE.MeshStandardMaterial({ color: 0xff0000, transparent: true, opacity: 0.3 });
const cube = new THREE.Mesh(cubeGeometry, cubeMaterial);
cube.position.set(0, 0.3, 0); // Match physics body height
cube.castShadow = true;
cube.receiveShadow = true;
cube.visible = false; // Hide cube initially, show only if model fails to load
scene.add(cube);

// Car chassis physics body - SIMPLIFIED
const carShape = new CANNON.Box(new CANNON.Vec3(1, 0.5, 2));
const carBody = new CANNON.Body({
    mass: 1773, // Nissan GT-R R35 curb weight (kg)
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
    const acceleration = 0.62; // Nissan GT-R R35: 0-100 km/h in ~3.2s (restored working value)
    const maxSpeed = 400; // GT-R can reach 315 km/h (set higher, drag will limit naturally)
    const friction = 0.99; // Minimal friction when coasting
    const turnSpeed = 2.5;
    const lateralGrip = 0.95; // GT-R AWD grip (0.95 = exceptional grip, minimal sliding)
    const dragCoefficient = 0.0002; // GT-R air drag - allows ~315 km/h top speed (restored)

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

// Camera follow system - NFS Heat style (with real-time controls)
let cameraOffset = new THREE.Vector3(0, 2.6, 4.7); // User-tuned optimal view
let cameraLookAtOffset = new THREE.Vector3(0, 1.2, -0.5); // User-tuned look-at point
const cameraLerpFactor = 0.1;

// Dynamic camera settings
let speedHeightGain = 0.4; // User-tuned: camera rises when speeding
let speedZoomIn = 8.0; // User-tuned: camera zooms in dramatically at speed
let speedThreshold = 200; // Speed at which dynamic effects max out

// Camera control inputs (commented out - uncomment in HTML to use)
/*
const camYInput = document.getElementById('cam-y');
const camZInput = document.getElementById('cam-z');
const lookYInput = document.getElementById('look-y');
const lookZInput = document.getElementById('look-z');
const speedYInput = document.getElementById('speed-y');
const speedZInput = document.getElementById('speed-z');
const speedThresholdInput = document.getElementById('speed-threshold');

// Update camera offset in real-time
camYInput.addEventListener('input', (e) => {
    cameraOffset.y = parseFloat(e.target.value) || 0;
});

camZInput.addEventListener('input', (e) => {
    cameraOffset.z = parseFloat(e.target.value) || 0;
});

lookYInput.addEventListener('input', (e) => {
    cameraLookAtOffset.y = parseFloat(e.target.value) || 0;
});

lookZInput.addEventListener('input', (e) => {
    cameraLookAtOffset.z = parseFloat(e.target.value) || 0;
});

// Dynamic camera controls
speedYInput.addEventListener('input', (e) => {
    speedHeightGain = parseFloat(e.target.value) || 0;
});

speedZInput.addEventListener('input', (e) => {
    speedZoomIn = parseFloat(e.target.value) || 0;
});

speedThresholdInput.addEventListener('input', (e) => {
    speedThreshold = parseFloat(e.target.value) || 200;
});
*/

function updateCamera() {
    // Use car model if loaded, otherwise use cube
    const target = car || cube;

    // Calculate current speed for dynamic camera
    const currentSpeed = Math.sqrt(carBody.velocity.x ** 2 + carBody.velocity.z ** 2) * 3.6; // km/h

    // Adjust camera distance based on speed (closer at higher speeds) - NFS style
    const speedFactor = Math.min(currentSpeed / speedThreshold, 1.0); // 0 to 1 based on threshold
    const dynamicOffset = new THREE.Vector3(
        cameraOffset.x,
        cameraOffset.y + speedFactor * speedHeightGain, // Height gain at speed
        cameraOffset.z - speedFactor * speedZoomIn // Zoom in at max speed
    );

    // Calculate desired camera position (behind and above the car)
    const desiredPosition = new THREE.Vector3();
    desiredPosition.copy(dynamicOffset);
    desiredPosition.applyQuaternion(target.quaternion);
    desiredPosition.add(target.position);

    // Smooth camera movement (lerp)
    camera.position.lerp(desiredPosition, cameraLerpFactor);

    // Calculate look-at point (slightly ahead of the car)
    const lookAtPoint = new THREE.Vector3();
    lookAtPoint.copy(cameraLookAtOffset);
    lookAtPoint.applyQuaternion(target.quaternion);
    lookAtPoint.add(target.position);

    // Make camera look at the point
    camera.lookAt(lookAtPoint);
}

// Performance monitoring
let lastTime = performance.now();
let frames = 0;
let fps = 0;
let minFPS = 999;
let maxFPS = 0;
let avgFPSsamples = [];
let frameTimeMS = 0;

function updateFPS() {
    frames++;
    const currentTime = performance.now();
    const elapsed = currentTime - lastTime;

    if (elapsed >= 1000) {
        fps = Math.round((frames * 1000) / elapsed);
        frameTimeMS = (elapsed / frames).toFixed(2);

        // Track min/max
        if (fps < minFPS) minFPS = fps;
        if (fps > maxFPS) maxFPS = fps;

        // Calculate rolling average (last 10 samples)
        avgFPSsamples.push(fps);
        if (avgFPSsamples.length > 10) avgFPSsamples.shift();
        const avgFPS = Math.round(avgFPSsamples.reduce((a, b) => a + b, 0) / avgFPSsamples.length);

        // Update display
        document.getElementById('fps-counter').innerHTML =
            `FPS: ${fps}<br>` +
            `<small>Avg: ${avgFPS} | Min: ${minFPS} | Frame: ${frameTimeMS}ms</small>`;

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

    // Sync GT-R model with physics body (if loaded)
    if (car) {
        car.position.copy(carBody.position);
        car.quaternion.copy(carBody.quaternion);
    } else {
        // Sync cube with physics body (fallback)
        cube.position.copy(carBody.position);
        cube.quaternion.copy(carBody.quaternion);
    }

    // Update camera to follow car
    updateCamera();

    // Update FPS counter
    updateFPS();

    // Update speedometer
    updateSpeedometer();

    // Render scene
    renderer.render(scene, camera);
}

// Lighting Control Panel Setup
const togglePanelBtn = document.getElementById('toggle-lighting-panel');
const lightingPanel = document.getElementById('lighting-panel');
const ambientIntensityInput = document.getElementById('ambient-intensity');
const sunIntensityInput = document.getElementById('sun-intensity');
const sunXInput = document.getElementById('sun-x');
const sunYInput = document.getElementById('sun-y');
const sunZInput = document.getElementById('sun-z');
const shadowSizeSelect = document.getElementById('shadow-size');
const shadowBiasInput = document.getElementById('shadow-bias');
const logSettingsBtn = document.getElementById('log-settings');
const resetSettingsBtn = document.getElementById('reset-settings');

// Toggle panel visibility
togglePanelBtn.addEventListener('click', () => {
    lightingPanel.classList.toggle('collapsed');
    togglePanelBtn.textContent = lightingPanel.classList.contains('collapsed') ? '▶ Show' : '▼ Hide';
});

// Ambient light controls
ambientIntensityInput.addEventListener('input', (e) => {
    ambientLight.intensity = parseFloat(e.target.value);
    e.target.nextElementSibling.textContent = e.target.value;
});

// Sun light controls
sunIntensityInput.addEventListener('input', (e) => {
    directionalLight.intensity = parseFloat(e.target.value);
    e.target.nextElementSibling.textContent = e.target.value;
});

sunXInput.addEventListener('input', (e) => {
    directionalLight.position.x = parseFloat(e.target.value);
    e.target.nextElementSibling.textContent = e.target.value;
});

sunYInput.addEventListener('input', (e) => {
    directionalLight.position.y = parseFloat(e.target.value);
    e.target.nextElementSibling.textContent = e.target.value;
});

sunZInput.addEventListener('input', (e) => {
    directionalLight.position.z = parseFloat(e.target.value);
    e.target.nextElementSibling.textContent = e.target.value;
});

// Shadow controls
shadowSizeSelect.addEventListener('change', (e) => {
    const size = parseInt(e.target.value);
    directionalLight.shadow.mapSize.width = size;
    directionalLight.shadow.mapSize.height = size;
    directionalLight.shadow.map?.dispose();
    directionalLight.shadow.map = null;
    console.log(`Shadow map size updated to ${size}x${size}`);
});

shadowBiasInput.addEventListener('input', (e) => {
    directionalLight.shadow.bias = parseFloat(e.target.value);
    e.target.nextElementSibling.textContent = e.target.value;
});

// Log current settings to console
logSettingsBtn.addEventListener('click', () => {
    console.log('🎨 Current Lighting Settings:');
    console.log(`Ambient Light: intensity=${ambientLight.intensity}`);
    console.log(`Directional Light: intensity=${directionalLight.intensity}, position=(${directionalLight.position.x}, ${directionalLight.position.y}, ${directionalLight.position.z})`);
    console.log(`Shadow: mapSize=${directionalLight.shadow.mapSize.width}, bias=${directionalLight.shadow.bias}`);
});

// Reset to defaults
resetSettingsBtn.addEventListener('click', () => {
    ambientLight.intensity = 1.0;
    ambientIntensityInput.value = 1.0;
    directionalLight.intensity = 1.2;
    sunIntensityInput.value = 1.2;
    directionalLight.position.set(50, 50, 50);
    sunXInput.value = 50;
    sunYInput.value = 50;
    sunZInput.value = 50;
    directionalLight.shadow.bias = 0;
    shadowBiasInput.value = 0;
    console.log('✅ Lighting reset to defaults');
});

// Start animation
animate();

console.log('🏎️ Racing game initialized! Scene is ready.');
console.log('Controls: WASD or Arrow Keys to drive');
console.log('💡 Lighting controls available on the right side');
