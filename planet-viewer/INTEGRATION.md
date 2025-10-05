# Integration Guide for PlanetViewer Component

This guide explains how to integrate the PlanetViewer component into your own applications.

## Quick Start

### 1. Installation

Copy the `PlanetViewer.js` component to your project:

```bash
cp frontend_3/src/components/PlanetViewer.js your-project/src/
```

Install Three.js dependency:

```bash
npm install three
```

### 2. Basic Usage

```javascript
import { PlanetViewer } from './components/PlanetViewer.js';

// Create a container in your HTML
const container = document.getElementById('planet-container');

// Initialize the viewer
const viewer = new PlanetViewer({
    container: container,
    planetData: {
        name: 'Earth',
        radius: 6,
        color: 0x4169e1,
        hasAtmosphere: true
    }
});
```

## Advanced Usage Examples

### Loading a DreamFusion 3D Model

```javascript
const viewer = new PlanetViewer({
    container: document.getElementById('planet-container'),
    planetData: {
        name: 'Exoplanet Kepler-186f',
        radius: 5,
        modelUrl: 'http://localhost:8000/models/kepler-186f.glb'
    },
    options: {
        autoRotate: true,
        cameraDistance: 20
    }
});
```

### Planet with Moons and Rings

```javascript
const viewer = new PlanetViewer({
    container: document.getElementById('planet-container'),
    planetData: {
        name: 'Saturn',
        radius: 21,
        color: 0xfad5a5,
        hasRings: true,
        ringColor: 0xd4a373,
        moons: [
            {
                name: 'Titan',
                size: 2.5,
                distance: 35,
                speed: 0.8,
                color: 0xffa500
            },
            {
                name: 'Enceladus',
                size: 0.8,
                distance: 28,
                speed: 1.2,
                color: 0xffffff
            }
        ]
    }
});
```

### Dynamic Model Switching

```javascript
// Initial planet
const viewer = new PlanetViewer({
    container: document.getElementById('planet-container'),
    planetData: { name: 'Mars', radius: 3.4, color: 0xcd5c5c }
});

// Later, switch to a different planet
viewer.updatePlanet({
    name: 'Jupiter',
    radius: 25,
    color: 0xdaa520
});

// Or load a 3D model
viewer.updatePlanet({
    name: 'Custom Planet',
    modelUrl: 'http://localhost:8000/models/my-planet.glb'
});
```

### Control Methods

```javascript
// Toggle rotation
viewer.setAutoRotate(false);  // Stop
viewer.setAutoRotate(true);   // Start

// Set camera position
viewer.setCameraPosition(0, 10, 30);

// Take screenshot
const imageData = viewer.takeScreenshot();
// imageData is a base64 PNG string

// Access Three.js internals for advanced customization
const scene = viewer.getScene();
const camera = viewer.getCamera();
const renderer = viewer.getRenderer();

// Clean up when done
viewer.dispose();
```

## Framework Integration

### React Integration

```jsx
import React, { useEffect, useRef, useState } from 'react';
import { PlanetViewer } from './components/PlanetViewer';

function PlanetComponent({ planetData }) {
    const containerRef = useRef(null);
    const viewerRef = useRef(null);

    useEffect(() => {
        if (containerRef.current && !viewerRef.current) {
            viewerRef.current = new PlanetViewer({
                container: containerRef.current,
                planetData: planetData
            });
        }

        return () => {
            if (viewerRef.current) {
                viewerRef.current.dispose();
                viewerRef.current = null;
            }
        };
    }, []);

    useEffect(() => {
        if (viewerRef.current) {
            viewerRef.current.updatePlanet(planetData);
        }
    }, [planetData]);

    return (
        <div 
            ref={containerRef} 
            style={{ width: '100%', height: '100vh' }}
        />
    );
}

export default PlanetComponent;

// Usage
<PlanetComponent 
    planetData={{
        name: 'Earth',
        radius: 6,
        color: 0x4169e1,
        hasAtmosphere: true
    }}
/>
```

### Vue 3 Integration

```vue
<template>
    <div ref="container" class="planet-container"></div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch } from 'vue';
import { PlanetViewer } from './components/PlanetViewer';

const props = defineProps({
    planetData: {
        type: Object,
        required: true
    }
});

const container = ref(null);
let viewer = null;

onMounted(() => {
    viewer = new PlanetViewer({
        container: container.value,
        planetData: props.planetData
    });
});

onUnmounted(() => {
    if (viewer) {
        viewer.dispose();
    }
});

watch(() => props.planetData, (newData) => {
    if (viewer) {
        viewer.updatePlanet(newData);
    }
}, { deep: true });
</script>

<style scoped>
.planet-container {
    width: 100%;
    height: 100vh;
}
</style>
```

### Angular Integration

```typescript
import { Component, ElementRef, Input, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { PlanetViewer } from './components/PlanetViewer';

@Component({
    selector: 'app-planet-viewer',
    template: '<div #container class="planet-container"></div>',
    styles: ['.planet-container { width: 100%; height: 100vh; }']
})
export class PlanetViewerComponent implements OnInit, OnDestroy {
    @ViewChild('container', { static: true }) container!: ElementRef;
    @Input() planetData: any;
    
    private viewer: any;

    ngOnInit() {
        this.viewer = new PlanetViewer({
            container: this.container.nativeElement,
            planetData: this.planetData
        });
    }

    ngOnChanges(changes: any) {
        if (changes.planetData && this.viewer) {
            this.viewer.updatePlanet(this.planetData);
        }
    }

    ngOnDestroy() {
        if (this.viewer) {
            this.viewer.dispose();
        }
    }
}
```

## Backend Integration

### Python/FastAPI Example

See `backend/planet_viewer_api.py` for a complete implementation.

Key endpoints:
- `GET /planets` - List available planets
- `GET /models` - List available 3D models
- `GET /models/{filename}` - Serve 3D model files

### Node.js/Express Example

```javascript
const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(cors());

// Serve 3D models
app.use('/models', express.static(path.join(__dirname, 'models')));

// Get planets
app.get('/planets', (req, res) => {
    res.json([
        {
            id: 'earth',
            name: 'Earth',
            radiusEarth: 6.3,
            hasAtmosphere: true,
            // ... more data
        }
    ]);
});

// Get available models
app.get('/models', (req, res) => {
    const fs = require('fs');
    const modelsDir = path.join(__dirname, 'models');
    
    fs.readdir(modelsDir, (err, files) => {
        if (err) {
            return res.json([]);
        }
        
        const models = files
            .filter(f => f.endsWith('.glb') || f.endsWith('.gltf') || f.endsWith('.obj'))
            .map(f => ({
                name: f,
                url: `/models/${f}`,
                description: 'Generated 3D model'
            }));
        
        res.json(models);
    });
});

app.listen(8000, () => {
    console.log('Server running on http://localhost:8000');
});
```

## DreamFusion Integration

### Exporting from DreamFusion

DreamFusion typically outputs meshes in various formats. Convert to GLTF for best results:

```bash
# Using Blender to convert
blender --background --python convert.py -- input.obj output.glb

# Or use online converters
# https://github.com/CesiumGS/obj2gltf
obj2gltf -i model.obj -o model.glb
```

### Loading DreamFusion Models

```javascript
// Assuming model is available at your backend
const viewer = new PlanetViewer({
    container: document.getElementById('planet-container'),
    planetData: {
        name: 'Generated Exoplanet',
        radius: 5,  // Will be auto-scaled to fit
        modelUrl: 'http://localhost:8000/models/dreamfusion-output.glb'
    }
});
```

The PlanetViewer automatically:
- Scales models to fit the specified radius
- Centers models at origin
- Applies proper lighting
- Handles materials and textures

## Configuration Options

### PlanetData Schema

```typescript
interface PlanetData {
    name: string;                    // Required: Planet name
    radius: number;                  // Required: Visual radius
    color?: number;                  // Hex color (if no model/texture)
    textureUrl?: string;             // Texture image URL
    modelUrl?: string;               // 3D model URL (.glb, .gltf, .obj)
    hasAtmosphere?: boolean;         // Add atmospheric glow
    atmosphereColor?: number;        // Atmosphere color (default: planet color)
    hasRings?: boolean;              // Add ring system
    ringColor?: number;              // Ring color
    moons?: Array<{
        name: string;
        size: number;
        distance: number;
        speed: number;
        color: number;
    }>;
}
```

### Options Schema

```typescript
interface Options {
    autoRotate?: boolean;            // Auto-rotate planet (default: true)
    showStars?: boolean;             // Show starfield (default: true)
    enableControls?: boolean;        // Enable orbit controls (default: true)
    backgroundColor?: number;        // Background color (default: 0x000000)
    cameraDistance?: number;         // Initial camera distance (default: 15)
}
```

## Performance Optimization

### For Multiple Planets

```javascript
// Create a shared scene manager
class PlanetManager {
    constructor() {
        this.viewers = new Map();
    }
    
    addPlanet(id, container, planetData) {
        const viewer = new PlanetViewer({ container, planetData });
        this.viewers.set(id, viewer);
        return viewer;
    }
    
    removePlanet(id) {
        const viewer = this.viewers.get(id);
        if (viewer) {
            viewer.dispose();
            this.viewers.delete(id);
        }
    }
    
    disposeAll() {
        this.viewers.forEach(viewer => viewer.dispose());
        this.viewers.clear();
    }
}
```

### Lazy Loading

```javascript
// Only load viewer when container is visible
const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting && !viewer) {
            viewer = new PlanetViewer({
                container: entry.target,
                planetData: { /* ... */ }
            });
        }
    });
});

observer.observe(container);
```

## Troubleshooting

### Models Not Loading

1. Check CORS headers on backend
2. Verify model file format is supported
3. Check browser console for errors
4. Test model URL directly in browser

### Performance Issues

1. Reduce polygon count of 3D models
2. Disable starfield: `showStars: false`
3. Reduce texture sizes to 2048x2048 or less
4. Disable auto-rotation when not needed

### Memory Leaks

Always call `dispose()` when removing the viewer:

```javascript
// Before removing from DOM
viewer.dispose();
container.innerHTML = '';
```

## Examples

See the `example-simple.html` file for a minimal working example.

For a full-featured application, see `index.html` and `src/main.js`.

## Support

For issues or questions, please refer to the main README.md or open an issue on the repository.
