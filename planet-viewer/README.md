# Planet Viewer - Modular 3D Planet Visualization

A reusable, modular 3D planet visualization component built with Three.js. Designed to work standalone or integrate with other applications, with support for loading 3D models from DreamFusion backend.

## Features

### 🎨 Flexible Planet Display
- **Solid Colors**: Simple colored spheres
- **Textures**: Load custom planet textures
- **3D Models**: Import GLTF, GLB, or OBJ models
- **Atmospheric Effects**: Optional atmospheric glow
- **Ring Systems**: Saturn-like rings
- **Moon Systems**: Orbiting satellites

### 🔌 Backend Integration
- Load 3D models from DreamFusion backend
- Fetch planet data from API
- Support for various 3D model formats
- Automatic model normalization and scaling

### 🎮 Interactive Controls
- Orbit controls (rotate, pan, zoom)
- Auto-rotation toggle
- Camera reset
- Screenshot capture
- Real-time model switching

### 💻 Modular Architecture
- **Standalone Component**: Use `PlanetViewer` class in any project
- **Easy Integration**: Simple API for embedding
- **No Dependencies**: Works independently
- **Customizable**: Extensive configuration options

## Installation

```bash
cd frontend_3
npm install
npm run dev
```

## Controls

### Mouse/Trackpad
- **Left Click + Drag**: Rotate the view
- **Right Click + Drag**: Pan the camera
- **Scroll**: Zoom in/out
- **Click on Planet**: Focus camera on that planet

### UI Controls
- **Play/Pause**: Stop or resume orbital motion
- **Speed Slider**: Adjust animation speed (0x to 2x)
- **Reset View**: Return camera to default position
- **Toggle Orbits**: Show/hide orbital path lines
- **Planet Selector**: Click to focus on specific celestial body

## Project Structure

```
frontend_3/
├── src/
│   ├── main.js                    # Main application entry point
│   ├── data/
│   │   └── solarSystemData.js    # Planetary data and configurations
│   └── utils/
│       ├── celestialBodies.js    # Functions to create 3D objects
│       └── ui.js                 # UI helper functions
├── index.html                     # HTML template
├── package.json                   # Dependencies
├── vite.config.js                # Vite configuration
└── README.md                     # This file
```

## Technologies Used

- **Three.js**: 3D graphics library
- **Vite**: Fast build tool and dev server
- **Vanilla JavaScript**: No framework dependencies

## Customization

### Adding New Celestial Bodies

Edit `src/data/solarSystemData.js` to add new planets or modify existing ones:

```javascript
{
    name: 'New Planet',
    size: 5.0,                    // Visual size
    orbitRadius: 100,             // Distance from sun
    orbitSpeed: 1.5,              // Orbital velocity
    color: 0xff0000,              // Hex color
    description: 'Description',
    diameter: '10,000 km',
    mass: '1 × 10²⁴ kg',
    orbitalPeriod: '365 days',
    distanceFromSun: '150M km'
}
```

### Modifying Visual Styles

Update the CSS in `index.html` to change colors, transparency, or layout of UI elements.

### Adjusting Physics

Modify the animation loop in `src/main.js` to change:
- Orbital speeds
- Planet rotation rates
- Camera animation speeds

## Performance

The visualization is optimized for modern browsers. For better performance:
- Reduce the number of stars in the starfield (line 53 in main.js)
- Lower the geometry segments for spheres (in celestialBodies.js)
- Disable shadows if added

## Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

WebGL support is required.

## Future Enhancements

- [ ] Add textures for realistic planet surfaces
- [ ] Include dwarf planets (Pluto, Ceres, etc.)
- [ ] Add asteroid belt
- [ ] Implement time controls (date/time selection)
- [ ] Add planet comparison tool
- [ ] Include spacecraft trajectories
- [ ] VR/AR support
- [ ] Educational mode with guided tours

## Credits

Inspired by NASA's Eyes on the Solar System: https://eyes.nasa.gov/apps/solar-system/

## License

MIT License - Feel free to use and modify for your projects!
