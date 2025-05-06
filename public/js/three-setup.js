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

// Constants
const ROTATION_SPEED = 0.001;
const RING_RADIUS = 30; // Increased by 1.5x from original 2.5
const RING_TUBE = 1;
const RING_SEGMENTS = 64;

// Initialize Three.js scene
document.addEventListener('DOMContentLoaded', () => {
    container = document.getElementById('visualization-container');
    
    // Only initialize if container exists
    if (container) {
        initThreeJs();
        createAntarcticaPlaceholder();
        createVisualizationRing();
        addLighting();
        animate();
        
        // Handle window resize
        window.addEventListener('resize', onWindowResize);
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
    
    // Add directional light
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(5, 3, 5);
    scene.add(directionalLight);
    
    // Add point light inside the model for glow effect
    const pointLight = new THREE.PointLight(0x0088ff, 1, 10);
    pointLight.position.set(0, 0, 0);
    scene.add(pointLight);
}

/**
 * Animation loop
 */
function animate() {
    animationId = requestAnimationFrame(animate);
    
    // No longer rotating Antarctica as per requirements
    // if (antarctica) {
    //     antarctica.rotation.y += ROTATION_SPEED;
    // }
    
    // Rotate visualization ring in opposite direction
    if (visualizationRing) {
        visualizationRing.rotation.z -= ROTATION_SPEED * 0.5;
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
    cleanupThreeJs
};
