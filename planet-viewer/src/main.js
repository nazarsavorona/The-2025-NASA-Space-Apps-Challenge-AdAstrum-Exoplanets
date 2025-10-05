import { PlanetViewer } from './components/PlanetViewer.js';

/**
 * Main application entry point
 * Demonstrates how to use the PlanetViewer component
 */

// API Configuration
const API_BASE_URL = 'http://localhost:8000';

// Current state
let currentViewer = null;
let availablePlanets = [];

/**
 * Initialize the application
 */
async function init() {
    setupUI();
    await loadAvailablePlanets();
    loadDefaultPlanet();
}

/**
 * Setup UI event listeners
 */
function setupUI() {
    // Planet selector
    document.getElementById('planet-select')?.addEventListener('change', (e) => {
        const planetData = availablePlanets.find(p => p.id === e.target.value);
        if (planetData) {
            loadPlanet(planetData);
        }
    });

    // Load custom model button
    document.getElementById('load-model-btn')?.addEventListener('click', () => {
        const modelUrl = document.getElementById('model-url-input')?.value;
        if (modelUrl) {
            loadCustomModel(modelUrl);
        }
    });

    // Toggle rotation
    document.getElementById('toggle-rotation')?.addEventListener('click', (e) => {
        if (currentViewer) {
            const enabled = e.target.classList.toggle('active');
            currentViewer.setAutoRotate(enabled);
            e.target.textContent = enabled ? '⏸ Pause Rotation' : '▶ Start Rotation';
        }
    });

    // Reset camera
    document.getElementById('reset-camera')?.addEventListener('click', () => {
        if (currentViewer) {
            currentViewer.setCameraPosition(0, 5, 15);
        }
    });

    // Screenshot
    document.getElementById('take-screenshot')?.addEventListener('click', () => {
        if (currentViewer) {
            const dataUrl = currentViewer.takeScreenshot();
            downloadImage(dataUrl, 'planet-screenshot.png');
        }
    });

    // Load from backend
    document.getElementById('load-from-backend')?.addEventListener('click', () => {
        showModelSelector();
    });
}

/**
 * Load available planets from backend
 */
async function loadAvailablePlanets() {
    try {
        const response = await fetch(`${API_BASE_URL}/planets`);
        if (response.ok) {
            availablePlanets = await response.json();
            populatePlanetSelector(availablePlanets);
        } else {
            console.warn('Failed to load planets from backend, using default data');
            availablePlanets = getDefaultPlanets();
            populatePlanetSelector(availablePlanets);
        }
    } catch (error) {
        console.warn('Backend not available, using default data:', error);
        availablePlanets = getDefaultPlanets();
        populatePlanetSelector(availablePlanets);
    }
}

/**
 * Populate planet selector dropdown
 */
function populatePlanetSelector(planets) {
    const selector = document.getElementById('planet-select');
    if (!selector) return;

    selector.innerHTML = '<option value="">Select a planet...</option>';
    
    planets.forEach(planet => {
        const option = document.createElement('option');
        option.value = planet.id;
        option.textContent = planet.name;
        selector.appendChild(option);
    });
}

/**
 * Load a planet into the viewer
 */
function loadPlanet(planetData) {
    const container = document.getElementById('planet-container');
    
    // Dispose of existing viewer
    if (currentViewer) {
        currentViewer.dispose();
    }

    // Create configuration for PlanetViewer
    const config = {
        container: container,
        planetData: {
            name: planetData.name,
            radius: planetData.radiusEarth || 5,
            color: getColorFromPlanet(planetData),
            modelUrl: planetData.modelUrl,
            hasAtmosphere: planetData.hasAtmosphere || false,
            hasRings: planetData.hasRings || false,
            moons: planetData.moons || []
        },
        options: {
            autoRotate: true,
            showStars: true,
            enableControls: true,
            backgroundColor: 0x000000,
            cameraDistance: 15
        }
    };

    // Create new viewer
    currentViewer = new PlanetViewer(config);

    // Update info panel
    updateInfoPanel(planetData);
}

/**
 * Load a custom 3D model
 */
async function loadCustomModel(modelUrl) {
    const container = document.getElementById('planet-container');
    
    // Dispose of existing viewer
    if (currentViewer) {
        currentViewer.dispose();
    }

    // Create configuration for custom model
    const config = {
        container: container,
        planetData: {
            name: 'Custom Model',
            radius: 5,
            modelUrl: modelUrl,
            hasAtmosphere: false,
            hasRings: false
        },
        options: {
            autoRotate: true,
            showStars: true,
            enableControls: true,
            backgroundColor: 0x000000,
            cameraDistance: 15
        }
    };

    try {
        currentViewer = new PlanetViewer(config);
        showNotification('Model loaded successfully!', 'success');
        updateInfoPanel({ name: 'Custom Model', description: 'Loaded from: ' + modelUrl });
    } catch (error) {
        showNotification('Failed to load model: ' + error.message, 'error');
        console.error('Model loading error:', error);
    }
}

/**
 * Show model selector dialog
 */
async function showModelSelector() {
    try {
        // Fetch available models from backend
        const response = await fetch(`${API_BASE_URL}/models`);
        
        if (!response.ok) {
            throw new Error('Failed to fetch models from backend');
        }

        const models = await response.json();
        
        if (models.length === 0) {
            showNotification('No models available on backend', 'info');
            return;
        }

        // Create modal with model list
        const modal = createModelSelectorModal(models);
        document.body.appendChild(modal);
    } catch (error) {
        showNotification('Backend not available: ' + error.message, 'error');
        console.error('Backend error:', error);
    }
}

/**
 * Create model selector modal
 */
function createModelSelectorModal(models) {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content">
            <h2>Select 3D Model from Backend</h2>
            <div class="model-list">
                ${models.map(model => `
                    <div class="model-item" data-url="${API_BASE_URL}${model.url}">
                        <h3>${model.name}</h3>
                        <p>${model.description || 'No description'}</p>
                    </div>
                `).join('')}
            </div>
            <button class="close-modal">Close</button>
        </div>
    `;

    // Add event listeners
    modal.querySelectorAll('.model-item').forEach(item => {
        item.addEventListener('click', () => {
            const modelUrl = item.dataset.url;
            loadCustomModel(modelUrl);
            modal.remove();
        });
    });

    modal.querySelector('.close-modal').addEventListener('click', () => {
        modal.remove();
    });

    return modal;
}

/**
 * Update information panel
 */
function updateInfoPanel(planetData) {
    const infoPanel = document.getElementById('planet-info');
    if (!infoPanel) return;

    infoPanel.innerHTML = `
        <h2>${planetData.name}</h2>
        <p>${planetData.description || 'A celestial body in space.'}</p>
        ${planetData.diameter ? `<p><strong>Diameter:</strong> ${planetData.diameter}</p>` : ''}
        ${planetData.mass ? `<p><strong>Mass:</strong> ${planetData.mass}</p>` : ''}
        ${planetData.orbitalPeriod ? `<p><strong>Orbital Period:</strong> ${planetData.orbitalPeriod}</p>` : ''}
        ${planetData.distanceFromSun ? `<p><strong>Distance from Sun:</strong> ${planetData.distanceFromSun}</p>` : ''}
    `;
}

/**
 * Show notification
 */
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    document.body.appendChild(notification);

    setTimeout(() => {
        notification.classList.add('fade-out');
        setTimeout(() => notification.remove(), 500);
    }, 3000);
}

/**
 * Download image
 */
function downloadImage(dataUrl, filename) {
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = filename;
    link.click();
}

/**
 * Load default planet (Earth)
 */
function loadDefaultPlanet() {
    const defaultPlanet = availablePlanets[0] || {
        id: 'earth',
        name: 'Earth',
        radiusEarth: 6,
        color: 0x4169e1,
        hasAtmosphere: true,
        description: 'Our home planet',
        diameter: '12,742 km',
        mass: '5.972 × 10²⁴ kg'
    };

    loadPlanet(defaultPlanet);
}

/**
 * Get color from planet data
 */
function getColorFromPlanet(planetData) {
    const colorMap = {
        'mercury': 0x8c7853,
        'venus': 0xffc649,
        'earth': 0x4169e1,
        'mars': 0xcd5c5c,
        'jupiter': 0xdaa520,
        'saturn': 0xfad5a5,
        'uranus': 0x4fd0e7,
        'neptune': 0x4169e1
    };

    const planetName = planetData.name.toLowerCase();
    return colorMap[planetName] || 0x888888;
}

/**
 * Get default planet data
 */
function getDefaultPlanets() {
    return [
        {
            id: 'earth',
            name: 'Earth',
            radiusEarth: 6,
            hasAtmosphere: true,
            description: 'Our home planet and the only known planet with life.',
            diameter: '12,742 km',
            mass: '5.972 × 10²⁴ kg',
            moons: [
                { name: 'Moon', size: 1.7, distance: 10, speed: 1.0, color: 0xaaaaaa }
            ]
        },
        {
            id: 'mars',
            name: 'Mars',
            radiusEarth: 3.4,
            hasAtmosphere: false,
            description: 'The Red Planet, known for its iron oxide surface.',
            diameter: '6,779 km',
            mass: '6.39 × 10²³ kg',
            moons: [
                { name: 'Phobos', size: 0.5, distance: 7, speed: 2.0, color: 0x8b7355 },
                { name: 'Deimos', size: 0.3, distance: 9, speed: 1.5, color: 0x9b8365 }
            ]
        },
        {
            id: 'jupiter',
            name: 'Jupiter',
            radiusEarth: 25,
            hasAtmosphere: false,
            description: 'The largest planet in our solar system.',
            diameter: '139,820 km',
            mass: '1.898 × 10²⁷ kg'
        },
        {
            id: 'saturn',
            name: 'Saturn',
            radiusEarth: 21,
            hasRings: true,
            hasAtmosphere: false,
            description: 'Best known for its spectacular ring system.',
            diameter: '116,460 km',
            mass: '5.683 × 10²⁶ kg'
        }
    ];
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

console.log('Planet Viewer Application initialized');
