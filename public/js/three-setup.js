/**
 * Arka: Antarctica Personification Project
 * Three.js Setup and 3D Visualization
 */

// Global variables
let scene, camera, renderer;
let antarctica;
let visualizationRing;
let container;
let animationId;
let aurora;
let auroraVisible = false;
let auroraOpacity = 0;
let forceAurora = false; // Configuration from server
let directionalLight; // Reference to directional light for dynamic updates

// Globe rotation variables
let defaultRotation = { x: Math.PI / 2, y: 0, z: Math.PI }; // Default rotation showing south pole
let isThinking = false; // Flag to track if the globe is in "thinking" mode
let thinkingTime = 0; // Counter for thinking animation
let rotationTarget = { x: 0, y: 0, z: 0 }; // Target for smooth rotation
let rotationVelocity = { x: 0, y: 0, z: 0 }; // Current rotation velocity

// Constants
const ROTATION_SPEED = 0.001;
const RING_RADIUS = 30; // Increased by 1.5x from original 2.5
const RING_TUBE = 1;
const RING_SEGMENTS = 64;
const THINKING_ROTATION_SPEED = 0.005; // Speed of random rotation when thinking
const THINKING_CHANGE_INTERVAL = 1; // How often to change rotation direction (in seconds)
const ROTATION_DAMPING = 0.95; // Damping factor for smooth rotation
const RETURN_SPEED = 0.1; // Speed to return to default position

// Aurora constants
const AURORA_PARTICLE_COUNT = 30;
const AURORA_FADE_SPEED = 0.1;
const AURORA_WAVE_SPEED = 0.004; // Reduced by 50% for slower animation
const AURORA_HEIGHT_RANGE = 180; // Much taller for curtain effect
const AURORA_RADIUS = 55; // Increased from 45 to push curtains further from camera
const AURORA_CURTAIN_WIDTH = 30; // Increased width for wider curtains
const AURORA_CURTAIN_ANGLE = Math.PI / 16; // 30 degrees - consistent angle for all curtains

// Initialize Three.js scene
document.addEventListener('DOMContentLoaded', () => {
    container = document.getElementById('visualization-container');
    
    // Only initialize if container exists
    if (container) {
        // Fetch configuration from server
        fetchConfiguration().then(() => {
            initThreeJs();
            createAntarcticaPlaceholder();
            createVisualizationRing();
            createAurora();
            addLighting();
            animate();
            
            // Handle window resize
            window.addEventListener('resize', onWindowResize);
        }).catch(error => {
            console.error('Error fetching configuration:', error);
            // Continue with default configuration
            initThreeJs();
            createAntarcticaPlaceholder();
            createVisualizationRing();
            createAurora();
            addLighting();
            animate();
            
            // Handle window resize
            window.addEventListener('resize', onWindowResize);
        });
    }
});

/**
 * Initialize Three.js scene, camera, and renderer
 */
function initThreeJs() {
    // Create scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000033); // Dark blue background
    
    // Create camera
    const aspect = container.clientWidth / container.clientHeight;
    camera = new THREE.PerspectiveCamera(75, aspect, 0.1, 1000);
    camera.position.z = 50; // Zoomed out 10x from original position of 5
    
    // Create renderer
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    container.appendChild(renderer.domElement);
}

/**
 * Load the Earth globe model and focus on the south pole
 */
function createAntarcticaPlaceholder() {
    // Create a loading manager with callbacks
    const loadingManager = new THREE.LoadingManager(
        // onLoad
        () => {
            console.log('All resources loaded successfully');
        },
        // onProgress
        (url, itemsLoaded, itemsTotal) => {
            console.log(`Loading resource: ${url} (${itemsLoaded}/${itemsTotal})`);
        },
        // onError
        (url) => {
            console.error(`Error loading resource: ${url}`);
        }
    );
    
    // Create GLTF loader
    const gltfLoader = new THREE.GLTFLoader(loadingManager);
    
    console.log('Attempting to load GLB model: /earth/source/earth.glb');
    
    // Load GLB model
    gltfLoader.load(
        '/earth/source/earth.glb',
        (gltf) => {
            // Get the model from the GLTF scene
            const object = gltf.scene;
            
            // Set scale for the model
            object.scale.set(2.5, 2.5, 2.5);
            
            // Rotate to show south pole
            // Rotate 90 degrees around X axis to show the pole
            object.rotation.x = Math.PI / 2;
            // Additional rotation to ensure south pole is visible
            object.rotation.z = Math.PI;
            
            // Set as antarctica object
            antarctica = object;
            
            // Add to scene
            scene.add(antarctica);
        },
        (xhr) => {
            // Loading progress
            console.log((xhr.loaded / xhr.total * 100) + '% loaded');
        },
        (error) => {
            // Error handling
            console.error('An error happened while loading the GLB model:', error);
            
            // Fallback to placeholder if loading fails
            const geometry = new THREE.IcosahedronGeometry(1.5, 1);
            const material = new THREE.MeshPhongMaterial({
                color: 0xffffff,
                flatShading: true,
                transparent: true,
                opacity: 0.8,
                shininess: 100
            });
            
            antarctica = new THREE.Mesh(geometry, material);
            scene.add(antarctica);
        }
    );
}

/**
 * Create the visualization ring that will respond to audio
 */
function createVisualizationRing() {
    const geometry = new THREE.TorusGeometry(
        RING_RADIUS,
        RING_TUBE,
        16,
        RING_SEGMENTS
    );
    
    const material = new THREE.MeshPhongMaterial({
        color: 0x00aaff,
        transparent: true,
        opacity: 0.5,
        shininess: 80
    });
    
    visualizationRing = new THREE.Mesh(geometry, material);
    //visualizationRing.rotation.x = Math.PI / 2; // Rotate to horizontal
    scene.add(visualizationRing);
}

/**
 * Add lighting to the scene
 */
function addLighting() {
    // Add ambient light
    const ambientLight = new THREE.AmbientLight(0x404040);
    scene.add(ambientLight);
    
    // Add directional light with initial nighttime settings
    directionalLight = new THREE.DirectionalLight(0x39aaff, 0.75);
    directionalLight.position.set(1, 5, 5);
    scene.add(directionalLight);
    
    // Add point light inside the model for glow effect
    const pointLight = new THREE.PointLight(0x0088ff, 1, 10);
    pointLight.position.set(0, 0, 0);
    scene.add(pointLight);
    
    // Set initial lighting based on current time
    updateLighting();
}

/**
 * Update lighting based on time of day
 */
function updateLighting() {
    if (!directionalLight) return;
    
    const nighttime = forceAurora || isNighttime();
    
    if (nighttime) {
        // Nighttime: blue-tinted light with lower intensity
        directionalLight.color.setHex(0x39aaff);
        directionalLight.intensity = 0.75;
    } else {
        // Daytime: white light with full intensity
        directionalLight.color.setHex(0xffffff);
        directionalLight.intensity = 1;
    }
}

/**
 * Create aurora borealis curtain effect
 */
function createAurora() {
    // Aurora color palette
    const auroraColors = [
        new THREE.Color(0x00ff88), // Green
        new THREE.Color(0x00ccff), // Blue
        new THREE.Color(0x00ff48), // Purple
        new THREE.Color(0x00ffcc), // Cyan
        new THREE.Color(0xff0088)  // Pink (rare)
    ];
    
    // Create a group to hold all aurora curtains
    aurora = new THREE.Group();
    aurora.visible = false;
    
    // Create individual curtain meshes
    for (let i = 0; i < AURORA_PARTICLE_COUNT; i++) {
        // Create elongated plane geometry for each curtain
        const curtainHeight = 80 + Math.random() * AURORA_HEIGHT_RANGE; // Use AURORA_HEIGHT_RANGE constant
        const curtainWidth = AURORA_CURTAIN_WIDTH + Math.random() * 4; // 8-12 units wide
        
        const geometry = new THREE.PlaneGeometry(curtainWidth, curtainHeight, 1, 8);
        
        // Position curtain around Earth
        const angle = (i / AURORA_PARTICLE_COUNT) * Math.PI * 2;
        const radius = AURORA_RADIUS + Math.random() * 8;
        const x = Math.cos(angle) * radius;
        const z = Math.sin(angle) * radius;
        const y = (Math.random() - 0.5) * 20; // Slight vertical offset
        
        // Choose color (green most common)
        const colorIndex = Math.random() < 0.6 ? 0 : Math.floor(Math.random() * auroraColors.length);
        const color = auroraColors[colorIndex];
        
        // Create material with custom shader for curtain effect
        const material = new THREE.ShaderMaterial({
            uniforms: {
                time: { value: 0 },
                opacity: { value: 0 },
                curtainColor: { value: color },
                curtainIndex: { value: i }
            },
            vertexShader: `
                uniform float time;
                uniform float curtainIndex;
                varying vec2 vUv;
                varying float vOpacity;
                
                void main() {
                    vUv = uv;
                    
                    vec3 pos = position;
                    
                    // Create gentle swaying motion along the curtain height
                    float sway = sin(time * 1.5 + curtainIndex * 0.5) * 0.3;
                    float heightFactor = (uv.y - 0.5) * 2.0; // -1 to 1 from bottom to top
                    pos.x += sway * heightFactor * heightFactor; // More sway at the top
                    
                    // Add subtle wave motion
                    pos.z += sin(time * 2.0 + curtainIndex + uv.y * 3.0) * 0.5;
                    
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
                    
                    // Create vertical gradient opacity (stronger at center, fading at edges)
                    float verticalGradient = 1.0 - abs(uv.y - 0.5) * 2.0;
                    verticalGradient = pow(verticalGradient, 0.8);
                    
                    // Add shimmer effect
                    float shimmer = sin(time * 4.0 + curtainIndex * 2.0 + uv.y * 8.0) * 0.3 + 0.7;
                    
                    vOpacity = verticalGradient * shimmer;
                }
            `,
            fragmentShader: `
                uniform float opacity;
                uniform vec3 curtainColor;
                varying vec2 vUv;
                varying float vOpacity;
                
                void main() {
                    // Create horizontal gradient (fading at edges)
                    float horizontalGradient = 1.0 - abs(vUv.x - 0.5) * 2.0;
                    horizontalGradient = pow(horizontalGradient, 1.5);
                    
                    // Combine gradients
                    float alpha = horizontalGradient * vOpacity * opacity;
                    
                    gl_FragColor = vec4(curtainColor, alpha);
                }
            `,
            transparent: true,
            blending: THREE.AdditiveBlending,
            side: THREE.DoubleSide,
            depthWrite: false,
            depthTest: true,
            alphaTest: 0.01
        });
        
        // Create mesh
        const curtainMesh = new THREE.Mesh(geometry, material);
        
        // Position the curtain
        curtainMesh.position.set(x, y, z);
        
        // Rotate curtain to face outward from Earth and apply consistent angle
        curtainMesh.lookAt(0, y, 0);
        curtainMesh.rotateZ(AURORA_CURTAIN_ANGLE); // Apply consistent angle to all curtains
        
        // Add to aurora group
        aurora.add(curtainMesh);
    }
    
    scene.add(aurora);
    console.log('Aurora curtain effect created with', AURORA_PARTICLE_COUNT, 'curtains');
}

/**
 * Animation loop
 */
function animate() {
    animationId = requestAnimationFrame(animate);
    
    // Handle globe rotation based on thinking state
    if (antarctica) {
        if (isThinking) {
            // Update thinking time counter
            thinkingTime += 1/60; // Assuming 60fps
            
            // Change rotation target periodically
            if (thinkingTime >= THINKING_CHANGE_INTERVAL) {
                setRandomRotationTarget();
                thinkingTime = 0;
            }
            
            // Calculate rotation velocity towards target
            rotationVelocity.x = (rotationTarget.x - antarctica.rotation.x) * THINKING_ROTATION_SPEED;
            rotationVelocity.y = (rotationTarget.y - antarctica.rotation.y) * THINKING_ROTATION_SPEED;
            rotationVelocity.z = (rotationTarget.z - antarctica.rotation.z) * THINKING_ROTATION_SPEED;
            
            // Apply damping to rotation velocity
            rotationVelocity.x *= ROTATION_DAMPING;
            rotationVelocity.y *= ROTATION_DAMPING;
            rotationVelocity.z *= ROTATION_DAMPING;
            
            // Apply rotation velocity
            antarctica.rotation.x += rotationVelocity.x;
            antarctica.rotation.y += rotationVelocity.y;
            antarctica.rotation.z += rotationVelocity.z;
        } else {
            // Return to default position when not thinking
            antarctica.rotation.x += (defaultRotation.x - antarctica.rotation.x) * RETURN_SPEED;
            antarctica.rotation.y += (defaultRotation.y - antarctica.rotation.y) * RETURN_SPEED;
            antarctica.rotation.z += (defaultRotation.z - antarctica.rotation.z) * RETURN_SPEED;
        }
    }
    
    // Rotate visualization ring in opposite direction
    if (visualizationRing) {
        visualizationRing.rotation.z -= ROTATION_SPEED * 0.5;
    }
    
    // Update aurora animation and lighting
    if (aurora && aurora.children) {
        // Handle aurora visibility based on time
        updateAuroraVisibility();
        
        // Update lighting based on time
        updateLighting();
        
        // Smooth opacity transitions
        if (auroraVisible && auroraOpacity < 1) {
            auroraOpacity = Math.min(1, auroraOpacity + AURORA_FADE_SPEED);
        } else if (!auroraVisible && auroraOpacity > 0) {
            auroraOpacity = Math.max(0, auroraOpacity - AURORA_FADE_SPEED);
        }
        
        // Update each curtain's animation and opacity
        aurora.children.forEach((curtain) => {
            if (curtain.material && curtain.material.uniforms) {
                // Update time uniform for wave animation
                curtain.material.uniforms.time.value += AURORA_WAVE_SPEED;
                
                // Update material opacity
                curtain.material.uniforms.opacity.value = auroraOpacity;
            }
        });
        
        aurora.visible = auroraOpacity > 0;
    }
    
    // Render scene
    renderer.render(scene, camera);
}

/**
 * Handle window resize
 */
function onWindowResize() {
    if (!container || !camera || !renderer) return;
    
    const width = container.clientWidth;
    const height = container.clientHeight;
    
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    
    renderer.setSize(width, height);
}

/**
 * Update visualization ring based on audio level
 * This will be called from audio-viz.js
 * @param {number} level - Audio level between 0 and 1
 */
function updateVisualizationRing(level) {
    if (!visualizationRing) return;
    
    // Update ring opacity based on audio level
    visualizationRing.material.opacity = 0.2 + (level * 0.8);
    
    // Slightly scale the ring based on audio level
    const scale = 1 + (level * 0.2);
    visualizationRing.scale.set(scale, scale, 1);
}

/**
 * Start the "thinking" animation for the globe
 * This will be called when audio starts playing
 */
function startThinkingAnimation() {
    if (!antarctica) return;
    
    // Set thinking flag
    isThinking = true;
    
    // Reset thinking time counter
    thinkingTime = 0;
    
    // Set initial random rotation target
    setRandomRotationTarget();
    
    console.log('Started globe thinking animation');
}

/**
 * Stop the "thinking" animation and return to default position
 * This will be called when audio stops playing
 */
function stopThinkingAnimation() {
    if (!antarctica) return;
    
    // Clear thinking flag
    isThinking = false;
    
    // Set rotation target back to default
    rotationTarget.x = defaultRotation.x;
    rotationTarget.y = defaultRotation.y;
    rotationTarget.z = defaultRotation.z;
    
    console.log('Stopped globe thinking animation, returning to default position');
}

/**
 * Set a random rotation target for the "thinking" animation
 */
function setRandomRotationTarget() {
    // Generate random offsets from default rotation
    // Keep the offsets small to prevent wild rotations
    const xOffset = (Math.random() * 0.6 - 0.3); // -0.1 to 0.1 radians
    const yOffset = (Math.random() * 0.6 - 0.3);
    const zOffset = (Math.random() * 0.6 - 0.3);
    
    // Set new rotation targets based on default rotation plus offset
    rotationTarget.x = defaultRotation.x + xOffset;
    rotationTarget.y = defaultRotation.y + yOffset;
    rotationTarget.z = defaultRotation.z + zOffset;
}

/**
 * Fetch configuration from server
 * @returns {Promise} Promise that resolves when configuration is loaded
 */
async function fetchConfiguration() {
    try {
        const response = await fetch('/api/config');
        const config = await response.json();
        
        forceAurora = config.forceAurora || false;
        console.log('Configuration loaded:', { forceAurora });
        
        return config;
    } catch (error) {
        console.error('Error fetching configuration:', error);
        forceAurora = false;
        throw error;
    }
}

/**
 * Check if it's currently nighttime (6pm to 8am)
 * @returns {boolean} True if it's nighttime
 */
function isNighttime() {
    const now = new Date();
    const hour = now.getHours();
    
    // Nighttime is from 6pm (18:00) to 8am (08:00)
    // This includes: 18, 19, 20, 21, 22, 23, 0, 1, 2, 3, 4, 5, 6, 7
    return hour >= 18 || hour < 8;
}

/**
 * Update aurora visibility based on current time or force setting
 */
function updateAuroraVisibility() {
    // If FORCE_AURORA is enabled, always show aurora
    // Otherwise, check if it's nighttime
    const shouldBeVisible = forceAurora || isNighttime();
    
    // Only update if visibility state has changed
    if (shouldBeVisible !== auroraVisible) {
        auroraVisible = shouldBeVisible;
        const reason = forceAurora ? 'forced by configuration' : `time-based (current hour: ${new Date().getHours()})`;
        console.log(`Aurora visibility changed: ${auroraVisible ? 'showing' : 'hiding'} (${reason})`);
    }
}

/**
 * Clean up Three.js resources
 */
function cleanupThreeJs() {
    if (animationId) {
        cancelAnimationFrame(animationId);
    }
    
    if (renderer) {
        renderer.dispose();
    }
    
    // Remove event listener
    window.removeEventListener('resize', onWindowResize);
    
    // Clear references
    scene = null;
    camera = null;
    renderer = null;
    antarctica = null;
    visualizationRing = null;
}

// Export functions for use in other modules
window.threeViz = {
    updateVisualizationRing,
    cleanupThreeJs,
    startThinkingAnimation,
    stopThinkingAnimation
};
