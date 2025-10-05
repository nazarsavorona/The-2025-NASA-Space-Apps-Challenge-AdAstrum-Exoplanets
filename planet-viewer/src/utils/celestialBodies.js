import * as THREE from 'three';

/**
 * Creates a textured or colored sphere for celestial bodies
 * 
 * @param {number} radius - The radius of the sphere
 * @param {number} color - The color of the sphere in hex format
 * @param {string|null} texturePath - Optional texture path
 * @returns {THREE.Mesh} The created mesh
 */
function createSphere(radius, color, texturePath = null) {
    const geometry = new THREE.SphereGeometry(radius, 64, 64);
    
    let material;
    if (texturePath) {
        const texture = new THREE.TextureLoader().load(texturePath);
        material = new THREE.MeshStandardMaterial({
            map: texture,
            metalness: 0.2,
            roughness: 0.8
        });
    } else {
        material = new THREE.MeshStandardMaterial({
            color: color,
            metalness: 0.2,
            roughness: 0.8
        });
    }
    
    return new THREE.Mesh(geometry, material);
}

/**
 * Creates the Sun with glow effect
 * 
 * @returns {THREE.Group} The Sun group with mesh and glow
 */
export function createSun() {
    const sunGroup = new THREE.Group();
    
    // Main sun sphere
    const sunGeometry = new THREE.SphereGeometry(15, 64, 64);
    const sunMaterial = new THREE.MeshBasicMaterial({
        color: 0xffff00,
        emissive: 0xffff00,
        emissiveIntensity: 1
    });
    const sun = new THREE.Mesh(sunGeometry, sunMaterial);
    sunGroup.add(sun);
    
    // Glow effect
    const glowGeometry = new THREE.SphereGeometry(18, 64, 64);
    const glowMaterial = new THREE.MeshBasicMaterial({
        color: 0xffaa00,
        transparent: true,
        opacity: 0.3,
        side: THREE.BackSide
    });
    const glow = new THREE.Mesh(glowGeometry, glowMaterial);
    sunGroup.add(glow);
    
    // Add point light at sun's position
    const sunLight = new THREE.PointLight(0xffffff, 1.5, 500);
    sunGroup.add(sunLight);
    
    return sunGroup;
}

/**
 * Creates a planet with optional moons and rings
 * 
 * @param {Object} data - Planet data including size, color, texture, and moons
 * @returns {THREE.Group} The planet group with mesh and optional children
 */
export function createPlanet(data) {
    const planetGroup = new THREE.Group();
    
    // Create main planet
    const planet = createSphere(data.size, data.color, data.texture);
    planetGroup.add(planet);
    
    // Add rings if applicable (Saturn, Uranus)
    if (data.hasRings) {
        const ringGeometry = new THREE.RingGeometry(
            data.size * 1.5,
            data.size * 2.2,
            64
        );
        const ringMaterial = new THREE.MeshBasicMaterial({
            color: data.name === 'Saturn' ? 0xd4a373 : 0x87ceeb,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.6
        });
        const ring = new THREE.Mesh(ringGeometry, ringMaterial);
        ring.rotation.x = Math.PI / 2;
        planetGroup.add(ring);
    }
    
    // Add moons if applicable
    if (data.moons) {
        data.moons.forEach(moonData => {
            const moon = createSphere(moonData.size, moonData.color);
            moon.position.set(moonData.distance, 0, 0);
            planetGroup.add(moon);
        });
    }
    
    // Add subtle atmosphere for Earth
    if (data.name === 'Earth') {
        const atmosphereGeometry = new THREE.SphereGeometry(data.size * 1.1, 64, 64);
        const atmosphereMaterial = new THREE.MeshBasicMaterial({
            color: 0x4169e1,
            transparent: true,
            opacity: 0.15,
            side: THREE.BackSide
        });
        const atmosphere = new THREE.Mesh(atmosphereGeometry, atmosphereMaterial);
        planetGroup.add(atmosphere);
    }
    
    return planetGroup;
}

/**
 * Creates an orbit line for a planet
 * 
 * @param {number} radius - The orbital radius
 * @returns {THREE.Line} The orbit line
 */
export function createOrbit(radius) {
    const segments = 128;
    const geometry = new THREE.BufferGeometry();
    const vertices = [];
    
    for (let i = 0; i <= segments; i++) {
        const angle = (i / segments) * Math.PI * 2;
        const x = Math.cos(angle) * radius;
        const z = Math.sin(angle) * radius;
        vertices.push(x, 0, z);
    }
    
    geometry.setAttribute(
        'position',
        new THREE.Float32BufferAttribute(vertices, 3)
    );
    
    const material = new THREE.LineBasicMaterial({
        color: 0x444444,
        transparent: true,
        opacity: 0.3
    });
    
    return new THREE.Line(geometry, material);
}

/**
 * Creates an asteroid belt between Mars and Jupiter
 * 
 * @param {number} innerRadius - Inner radius of the belt
 * @param {number} outerRadius - Outer radius of the belt
 * @param {number} count - Number of asteroids
 * @returns {THREE.Group} Group containing all asteroids
 */
export function createAsteroidBelt(innerRadius, outerRadius, count) {
    const asteroidGroup = new THREE.Group();
    const asteroidGeometry = new THREE.SphereGeometry(0.2, 8, 8);
    const asteroidMaterial = new THREE.MeshStandardMaterial({
        color: 0x8b7355,
        roughness: 1
    });
    
    for (let i = 0; i < count; i++) {
        const asteroid = new THREE.Mesh(asteroidGeometry, asteroidMaterial);
        
        const angle = Math.random() * Math.PI * 2;
        const radius = innerRadius + Math.random() * (outerRadius - innerRadius);
        
        asteroid.position.set(
            Math.cos(angle) * radius,
            (Math.random() - 0.5) * 2,
            Math.sin(angle) * radius
        );
        
        asteroid.scale.set(
            0.5 + Math.random(),
            0.5 + Math.random(),
            0.5 + Math.random()
        );
        
        asteroidGroup.add(asteroid);
    }
    
    return asteroidGroup;
}
