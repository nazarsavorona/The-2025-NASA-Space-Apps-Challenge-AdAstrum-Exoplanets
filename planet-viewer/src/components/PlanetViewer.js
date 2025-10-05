import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';

/**
 * PlanetViewer - A reusable 3D planet visualization component
 * 
 * Features:
 * - Display planets with custom colors, textures, or 3D models
 * - Support for dreamfusion 3D models (GLTF, OBJ, PLY)
 * - Interactive camera controls
 * - Atmospheric effects and lighting
 * - Easy to integrate and share with other applications
 * 
 * @example
 * const viewer = new PlanetViewer({
 *   container: document.getElementById('planet-container'),
 *   planetData: {
 *     name: 'Earth',
 *     radius: 5,
 *     color: 0x4169e1,
 *     modelUrl: 'http://localhost:8000/models/earth.glb'
 *   }
 * });
 */
export class PlanetViewer {
    /**
     * Creates a new PlanetViewer instance
     * 
     * @param {Object} config - Configuration object
     * @param {HTMLElement} config.container - DOM element to render the scene
     * @param {Object} config.planetData - Planet configuration data
     * @param {string} config.planetData.name - Planet name
     * @param {number} config.planetData.radius - Planet radius
     * @param {number} config.planetData.color - Planet color (hex)
     * @param {string} config.planetData.textureUrl - Optional texture URL
     * @param {string} config.planetData.modelUrl - Optional 3D model URL (GLTF/OBJ)
     * @param {boolean} config.planetData.hasAtmosphere - Add atmosphere effect
     * @param {boolean} config.planetData.hasRings - Add ring system
     * @param {Array} config.planetData.moons - Array of moon data
     * @param {Object} config.options - Additional options
     */
    constructor(config) {
        this.container = config.container;
        this.planetData = config.planetData || {};
        this.options = {
            autoRotate: true,
            showStars: true,
            enableControls: true,
            backgroundColor: 0x000000,
            cameraDistance: 15,
            ...config.options
        };

        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.controls = null;
        this.planet = null;
        this.animationId = null;
        this.loadedModel = null;

        this._init();
    }

    /**
     * Initialize the 3D scene
     * @private
     */
    _init() {
        this._setupScene();
        this._setupCamera();
        this._setupRenderer();
        this._setupLighting();
        
        if (this.options.enableControls) {
            this._setupControls();
        }
        
        if (this.options.showStars) {
            this._createStarfield();
        }

        this._loadPlanet();
        this._animate();
        this._handleResize();
    }

    /**
     * Setup the Three.js scene
     * @private
     */
    _setupScene() {
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(this.options.backgroundColor);
    }

    /**
     * Setup the camera
     * @private
     */
    _setupCamera() {
        const width = this.container.clientWidth;
        const height = this.container.clientHeight;
        
        this.camera = new THREE.PerspectiveCamera(
            60,
            width / height,
            0.1,
            1000
        );
        
        this.camera.position.set(
            0,
            this.options.cameraDistance * 0.3,
            this.options.cameraDistance
        );
        this.camera.lookAt(0, 0, 0);
    }

    /**
     * Setup the WebGL renderer
     * @private
     */
    _setupRenderer() {
        this.renderer = new THREE.WebGLRenderer({
            antialias: true,
            alpha: true
        });
        
        this.renderer.setSize(
            this.container.clientWidth,
            this.container.clientHeight
        );
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        
        this.container.appendChild(this.renderer.domElement);
    }

    /**
     * Setup scene lighting
     * @private
     */
    _setupLighting() {
        // Ambient light for overall scene illumination
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
        this.scene.add(ambientLight);

        // Main directional light (sun-like)
        const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
        directionalLight.position.set(5, 3, 5);
        directionalLight.castShadow = true;
        directionalLight.shadow.mapSize.width = 2048;
        directionalLight.shadow.mapSize.height = 2048;
        this.scene.add(directionalLight);

        // Fill light from opposite side
        const fillLight = new THREE.DirectionalLight(0xffffff, 0.3);
        fillLight.position.set(-5, -2, -5);
        this.scene.add(fillLight);
    }

    /**
     * Setup orbit controls
     * @private
     */
    _setupControls() {
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        this.controls.minDistance = 5;
        this.controls.maxDistance = 50;
        this.controls.autoRotate = this.options.autoRotate;
        this.controls.autoRotateSpeed = 0.5;
    }

    /**
     * Create starfield background
     * @private
     */
    _createStarfield() {
        const starsGeometry = new THREE.BufferGeometry();
        const starsMaterial = new THREE.PointsMaterial({
            color: 0xffffff,
            size: 0.8,
            transparent: true,
            opacity: 0.8,
            sizeAttenuation: true,
            map: this._createCircleTexture(),
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });

        const starsVertices = [];
        // Create stars far from the planet (minimum distance 50 units)
        for (let i = 0; i < 8000; i++) {
            let x, y, z, distance;
            do {
                x = (Math.random() - 0.5) * 1000;
                y = (Math.random() - 0.5) * 1000;
                z = (Math.random() - 0.5) * 1000;
                distance = Math.sqrt(x * x + y * y + z * z);
            } while (distance < 50); // Ensure stars are at least 50 units away
            
            starsVertices.push(x, y, z);
        }

        starsGeometry.setAttribute(
            'position',
            new THREE.Float32BufferAttribute(starsVertices, 3)
        );

        const stars = new THREE.Points(starsGeometry, starsMaterial);
        this.scene.add(stars);
    }

    /**
     * Create a circular texture for stars
     * @private
     */
    _createCircleTexture() {
        const canvas = document.createElement('canvas');
        canvas.width = 32;
        canvas.height = 32;
        const ctx = canvas.getContext('2d');
        
        const gradient = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
        gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
        gradient.addColorStop(0.2, 'rgba(255, 255, 255, 1)');
        gradient.addColorStop(0.4, 'rgba(255, 255, 255, 0.5)');
        gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
        
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 32, 32);
        
        const texture = new THREE.CanvasTexture(canvas);
        return texture;
    }

    /**
     * Load and create the planet
     * @private
     */
    async _loadPlanet() {
        const planetGroup = new THREE.Group();

        // Check if we need to load a 3D model
        if (this.planetData.modelUrl) {
            try {
                await this._load3DModel(this.planetData.modelUrl, planetGroup);
            } catch (error) {
                console.error('Failed to load 3D model, trying templates fallback:', error);
            
                this._createSpherePlanet(planetGroup);
            }
        } else {
            this._createSpherePlanet(planetGroup);
        }

        // Add atmosphere if specified
        if (this.planetData.hasAtmosphere) {
            this._addAtmosphere(planetGroup);
        }

        // Add rings if specified
        if (this.planetData.hasRings) {
            this._addRings(planetGroup);
        }

        // Add moons if specified
        if (this.planetData.moons && this.planetData.moons.length > 0) {
            this._addMoons(planetGroup);
        }

        this.planet = planetGroup;
        this.scene.add(this.planet);
    }

    /**
     * Load a 3D model from URL (supports GLTF, GLB, OBJ)
     * @private
     */
    async _load3DModel(url, parentGroup) {
        const fileExtension = url.split('.').pop().toLowerCase();
        
        return new Promise((resolve, reject) => {
            if (fileExtension === 'gltf' || fileExtension === 'glb') {
                const loader = new GLTFLoader();
                loader.load(
                    url,
                    (gltf) => {
                        const model = gltf.scene;
                        this._normalizeModel(model);
                        parentGroup.add(model);
                        this.loadedModel = model;
                        resolve(model);
                    },
                    undefined,
                    reject
                );
            } else if (fileExtension === 'obj') {
                const loader = new OBJLoader();
                loader.load(
                    url,
                    (obj) => {
                        this._normalizeModel(obj);
                        parentGroup.add(obj);
                        this.loadedModel = obj;
                        resolve(obj);
                    },
                    undefined,
                    reject
                );
            } else {
                reject(new Error(`Unsupported file format: ${fileExtension}`));
            }
        });
    }

    /**
     * Normalize loaded 3D model (scale and center)
     * @private
     */
    _normalizeModel(model) {
        // Calculate bounding box
        const box = new THREE.Box3().setFromObject(model);
        const size = box.getSize(new THREE.Vector3());
        const center = box.getCenter(new THREE.Vector3());

        // Scale to fit desired radius
        const maxDim = Math.max(size.x, size.y, size.z);
        const targetRadius = this.planetData.radius || 5;
        const scale = (targetRadius * 2) / maxDim;
        
        model.scale.multiplyScalar(scale);

        // Center the model
        model.position.sub(center.multiplyScalar(scale));

        // Ensure materials are properly set
        model.traverse((child) => {
            if (child.isMesh) {
                child.castShadow = true;
                child.receiveShadow = true;
                
                // Enhance material if needed
                if (child.material) {
                    child.material.needsUpdate = true;
                }
            }
        });
    }

    /**
     * Create a sphere-based planet
     * @private
     */
    _createSpherePlanet(parentGroup) {
        const radius = this.planetData.radius || 5;
        const geometry = new THREE.SphereGeometry(radius, 64, 64);
        
        let material;
        
        if (this.planetData.textureUrl) {
            // Load texture
            const textureLoader = new THREE.TextureLoader();
            const texture = textureLoader.load(this.planetData.textureUrl);
            
            material = new THREE.MeshStandardMaterial({
                map: texture,
                metalness: 0.2,
                roughness: 0.8
            });
        } else {
            // Use solid color
            material = new THREE.MeshStandardMaterial({
                color: this.planetData.color || 0x4169e1,
                metalness: 0.2,
                roughness: 0.7
            });
        }
        
        const sphere = new THREE.Mesh(geometry, material);
        sphere.castShadow = true;
        sphere.receiveShadow = true;
        
        parentGroup.add(sphere);
        this.loadedModel = sphere;
    }

    /**
     * Add atmospheric glow effect
     * @private
     */
    _addAtmosphere(parentGroup) {
        const radius = this.planetData.radius || 5;
        const atmosphereGeometry = new THREE.SphereGeometry(radius * 1.15, 64, 64);
        const atmosphereMaterial = new THREE.MeshBasicMaterial({
            color: this.planetData.atmosphereColor || 0x4169e1,
            transparent: true,
            opacity: 0.2,
            side: THREE.BackSide
        });
        
        const atmosphere = new THREE.Mesh(atmosphereGeometry, atmosphereMaterial);
        parentGroup.add(atmosphere);
    }

    /**
     * Add ring system (like Saturn)
     * @private
     */
    _addRings(parentGroup) {
        const radius = this.planetData.radius || 5;
        const ringGeometry = new THREE.RingGeometry(
            radius * 1.5,
            radius * 2.2,
            64
        );
        
        const ringMaterial = new THREE.MeshBasicMaterial({
            color: this.planetData.ringColor || 0xd4a373,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.6
        });
        
        const ring = new THREE.Mesh(ringGeometry, ringMaterial);
        ring.rotation.x = Math.PI / 2;
        parentGroup.add(ring);
    }

    /**
     * Add moons orbiting the planet
     * @private
     */
    _addMoons(parentGroup) {
        this.planetData.moons.forEach((moonData) => {
            const moonGeometry = new THREE.SphereGeometry(moonData.size || 0.5, 32, 32);
            const moonMaterial = new THREE.MeshStandardMaterial({
                color: moonData.color || 0xaaaaaa,
                metalness: 0.1,
                roughness: 0.9
            });
            
            const moon = new THREE.Mesh(moonGeometry, moonMaterial);
            moon.position.set(moonData.distance || 10, 0, 0);
            moon.castShadow = true;
            moon.receiveShadow = true;
            
            // Store moon data for animation
            moon.userData = {
                distance: moonData.distance || 10,
                speed: moonData.speed || 1.0,
                angle: Math.random() * Math.PI * 2
            };
            
            parentGroup.add(moon);
        });
    }

    /**
     * Animation loop
     * @private
     */
    _animate() {
        this.animationId = requestAnimationFrame(() => this._animate());

        // Rotate planet
        if (this.planet && this.options.autoRotate) {
            this.planet.rotation.y += 0.005;
        }

        // Animate moons
        if (this.planet && this.planetData.moons) {
            this.planet.children.forEach((child) => {
                if (child.userData.distance) {
                    child.userData.angle += 0.01 * child.userData.speed;
                    child.position.x = Math.cos(child.userData.angle) * child.userData.distance;
                    child.position.z = Math.sin(child.userData.angle) * child.userData.distance;
                }
            });
        }

        if (this.controls) {
            this.controls.update();
        }

        this.renderer.render(this.scene, this.camera);
    }

    /**
     * Handle window resize
     * @private
     */
    _handleResize() {
        window.addEventListener('resize', () => {
            const width = this.container.clientWidth;
            const height = this.container.clientHeight;

            this.camera.aspect = width / height;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(width, height);
        });
    }

    /**
     * Update planet data and reload
     * @param {Object} newPlanetData - New planet configuration
     */
    async updatePlanet(newPlanetData) {
        this.planetData = { ...this.planetData, ...newPlanetData };
        
        if (this.planet) {
            this.scene.remove(this.planet);
            this.planet = null;
        }
        
        await this._loadPlanet();
    }

    /**
     * Toggle auto-rotation
     * @param {boolean} enabled - Enable or disable rotation
     */
    setAutoRotate(enabled) {
        this.options.autoRotate = enabled;
        if (this.controls) {
            this.controls.autoRotate = enabled;
        }
    }

    /**
     * Set camera position
     * @param {number} x - X coordinate
     * @param {number} y - Y coordinate
     * @param {number} z - Z coordinate
     */
    setCameraPosition(x, y, z) {
        this.camera.position.set(x, y, z);
        this.camera.lookAt(0, 0, 0);
    }

    /**
     * Take a screenshot of the current view
     * @returns {string} Base64 encoded image
     */
    takeScreenshot() {
        this.renderer.render(this.scene, this.camera);
        return this.renderer.domElement.toDataURL('image/png');
    }

    /**
     * Get the Three.js scene (for advanced usage)
     * @returns {THREE.Scene} The scene object
     */
    getScene() {
        return this.scene;
    }

    /**
     * Get the camera (for advanced usage)
     * @returns {THREE.Camera} The camera object
     */
    getCamera() {
        return this.camera;
    }

    /**
     * Get the renderer (for advanced usage)
     * @returns {THREE.WebGLRenderer} The renderer object
     */
    getRenderer() {
        return this.renderer;
    }

    /**
     * Dispose of all resources and stop animation
     */
    dispose() {
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
        }

        if (this.controls) {
            this.controls.dispose();
        }

        if (this.renderer) {
            this.renderer.dispose();
            if (this.renderer.domElement.parentElement) {
                this.renderer.domElement.parentElement.removeChild(
                    this.renderer.domElement
                );
            }
        }

        // Dispose geometries and materials
        if (this.scene) {
            this.scene.traverse((object) => {
                if (object.geometry) {
                    object.geometry.dispose();
                }
                if (object.material) {
                    if (Array.isArray(object.material)) {
                        object.material.forEach(material => material.dispose());
                    } else {
                        object.material.dispose();
                    }
                }
            });
        }
    }
}
