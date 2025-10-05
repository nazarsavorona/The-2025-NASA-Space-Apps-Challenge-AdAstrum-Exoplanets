import PlanetViewerComponent from '@/components/PlanetViewerComponent';

export default function PlanetViewer() {
    return (
        <div>
            <div style={{ width: '100vw', height: '100vh' }}>
                <PlanetViewerComponent
                    planetData={{
                        name: 'Earth',
                        radius: 5,
                        textureUrl: '/textures/earth.jpg',
                        hasAtmosphere: true,
                        hasRings: false,
                        moons: [
                            { size: 1, distance: 10, speed: 0.5, color: 0xaaaaaa },
                        ],
                    }}
                    options={{
                        autoRotate: true,
                        showStars: true,
                    }}
                />
            </div>
        </div>
    );
}