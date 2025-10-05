# Planet Textures

This folder contains procedurally generated planet textures used as fallback when 3D models are not available.

## Generating Textures

To generate planet textures:

1. Open http://localhost:5173/generate-textures.html in your browser
2. The page will generate textures for Earth, Mars, and Jupiter
3. Click the download links to save each texture
4. Save the textures in this folder with these names:
   - `earth-texture.png`
   - `mars-texture.png`
   - `jupiter-texture.png`

## Texture Specifications

All textures are generated at **2048x2048 pixels** for high quality:

### Earth Texture
- Blue oceans with variations
- Green/brown continents with procedural noise
- White polar ice caps at top and bottom
- Suitable for terrestrial planets

### Mars Texture
- Red/orange base colors (#c1440e)
- Dark craters and surface variations
- Light dusty areas
- Subtle polar ice caps

### Jupiter Texture
- Horizontal atmospheric bands
- Multiple color layers (cream, brown, orange)
- Great Red Spot at 30% width position
- Turbulent swirls in each band

## Usage

The PlanetViewer will automatically use these textures when:
1. A 3D model file is not found
2. A 3D model fails to load
3. The template loading system is activated

Textures are loaded from the `/templates/` folder and applied to sphere geometry.
