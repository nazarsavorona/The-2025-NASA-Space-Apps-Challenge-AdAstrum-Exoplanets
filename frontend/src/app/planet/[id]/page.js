'use client';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import TransitLightCurve from '../../../components/TransitLightCurve';
import TransitCurveControls from '../../../components/TransitCurveControls';

const planetImages = {
    'Super Earth': 'https://images.unsplash.com/photo-1614732414444-096e5f1122d5?w=800',
    'Terrestrial': 'https://images.unsplash.com/photo-1614313913007-2b4ae8ce32ec?w=800',
    'Hot Jupiter': 'https://images.unsplash.com/photo-1614730321146-b6fa6a46bcb4?w=800',
    'Sub-Neptune': 'https://images.unsplash.com/photo-1614728263952-84ea256f9679?w=800'
};

const planetDetails = {
    'Kepler-452b': {
        mass: '5 Earth masses',
        radius: '1.63 Earth radii',
        orbitalPeriod: '385 days',
        temperature: '265 K',
        star: 'Kepler-452',
        discovered: '2015',
        description: 'Often called Earth 2.0, this exoplanet orbits within the habitable zone of a Sun-like star.'
    },
    'Proxima Centauri b': {
        mass: '1.17 Earth masses',
        radius: '1.1 Earth radii',
        orbitalPeriod: '11.2 days',
        temperature: '234 K',
        star: 'Proxima Centauri',
        discovered: '2016',
        description: 'The closest known exoplanet to Earth, orbiting our nearest stellar neighbor.'
    },
    'TRAPPIST-1e': {
        mass: '0.62 Earth masses',
        radius: '0.92 Earth radii',
        orbitalPeriod: '6.1 days',
        temperature: '251 K',
        star: 'TRAPPIST-1',
        discovered: '2017',
        description: 'One of seven Earth-sized planets in the TRAPPIST-1 system, potentially habitable.'
    },
    'HD 209458 b': {
        mass: '0.69 Jupiter masses',
        radius: '1.38 Jupiter radii',
        orbitalPeriod: '3.5 days',
        temperature: '1130 K',
        star: 'HD 209458',
        discovered: '1999',
        description: 'One of the first transiting exoplanets discovered, nicknamed "Osiris".'
    },
    'Gliese 667Cc': {
        mass: '3.8 Earth masses',
        radius: '1.5 Earth radii',
        orbitalPeriod: '28.1 days',
        temperature: '277 K',
        star: 'Gliese 667C',
        discovered: '2011',
        description: 'A super-Earth located in the habitable zone of a red dwarf star.'
    },
    'K2-18b': {
        mass: '8.6 Earth masses',
        radius: '2.6 Earth radii',
        orbitalPeriod: '33 days',
        temperature: '265 K',
        star: 'K2-18',
        discovered: '2015',
        description: 'A sub-Neptune with potential water vapor in its atmosphere, possibly habitable.'
    }
};

export default function PlanetDetail({ params }) {
    const [planet, setPlanet] = useState(null);
    const [curveConfig, setCurveConfig] = useState({
        baseline: 1,
        depth: 0.35,
        preTransitDuration: 0.35,
        ingressDuration: 0.12,
        flatDuration: 0.18,
        egressDuration: 0.12,
        postTransitDuration: 0.35,
        slope: 2.2
    });
    const router = useRouter();

    useEffect(() => {
        const storedPlanet = sessionStorage.getItem('selectedPlanet');
        if (!storedPlanet) {
            router.push('/results');
            return;
        }
        setPlanet(JSON.parse(storedPlanet));
    }, [router]);

    useEffect(() => {
        if (!planet) {
            return;
        }

        const probabilityRaw = typeof planet.probability === 'number'
            ? planet.probability
            : parseFloat(planet.probability);
        const boundedProbability = Number.isFinite(probabilityRaw)
            ? Math.min(Math.max(probabilityRaw, 0), 1)
            : 0.7;
        const derivedDepthRaw = 0.15 + (1 - boundedProbability) * 0.45;
        const derivedDepth = Number(Math.min(0.75, Math.max(0.05, derivedDepthRaw)).toFixed(2));

        setCurveConfig((prev) => {
            if (Math.abs(prev.depth - derivedDepth) < 0.01) {
                return prev;
            }
            return { ...prev, depth: derivedDepth };
        });
    }, [planet]);

    const updateValue = (key, value, boundaries = {}) => {
        if (!Number.isFinite(value)) {
            return;
        }
        const { min = 0, max } = boundaries;
        const clamped = Math.max(min, max !== undefined ? Math.min(value, max) : value);
        setCurveConfig((prev) => ({ ...prev, [key]: clamped }));
    };

    const updateSymmetricEnvelope = (value) => {
        if (!Number.isFinite(value)) {
            return;
        }
        const clamped = Math.max(0.05, Math.min(value, 2));
        setCurveConfig((prev) => ({
            ...prev,
            preTransitDuration: clamped,
            postTransitDuration: clamped
        }));
    };

    const updateIngress = (value) => {
        if (!Number.isFinite(value)) {
            return;
        }
        const clamped = Math.max(0.04, Math.min(value, 0.6));
        setCurveConfig((prev) => ({ ...prev, ingressDuration: clamped, egressDuration: clamped }));
    };

    if (!planet) {
        return <div>Loading...</div>;
    }

    const details = planetDetails[planet.name] || {
        mass: 'Unknown',
        radius: 'Unknown',
        orbitalPeriod: 'Unknown',
        temperature: 'Unknown',
        star: 'Unknown',
        discovered: 'Unknown',
        description: 'Details for this exoplanet are currently being researched.'
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 to-blue-900 text-white p-8">
            <div className="max-w-6xl mx-auto">
                <button
                    onClick={() => router.push('/results')}
                    className="mb-6 px-4 py-2 bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
                >
                    ← Back to Results
                </button>

                <div className="grid md:grid-cols-2 gap-8">
                    <div className="bg-gray-800 rounded-lg overflow-hidden shadow-2xl">
                        <img
                            src={planetImages[planet.type] || planetImages['Terrestrial']}
                            alt={planet.name}
                            className="w-full h-96 object-cover"
                        />
                    </div>

                    <div className="bg-gray-800 rounded-lg p-8 shadow-2xl">
                        <h1 className="text-4xl font-bold mb-4">{planet.name}</h1>
                        <div className="mb-6">
                            <span className="inline-block px-3 py-1 bg-blue-600 rounded-full text-sm">
                                {planet.type}
                            </span>
                            <span className="ml-2 text-gray-400">
                                Classification: {(planet.probability * 100).toFixed(0)}% confidence
                            </span>
                        </div>

                        <p className="text-gray-300 mb-6">{details.description}</p>

                        <div className="space-y-3">
                            <div className="flex justify-between border-b border-gray-700 pb-2">
                                <span className="text-gray-400">Mass:</span>
                                <span>{details.mass}</span>
                            </div>
                            <div className="flex justify-between border-b border-gray-700 pb-2">
                                <span className="text-gray-400">Radius:</span>
                                <span>{details.radius}</span>
                            </div>
                            <div className="flex justify-between border-b border-gray-700 pb-2">
                                <span className="text-gray-400">Orbital Period:</span>
                                <span>{details.orbitalPeriod}</span>
                            </div>
                            <div className="flex justify-between border-b border-gray-700 pb-2">
                                <span className="text-gray-400">Temperature:</span>
                                <span>{details.temperature}</span>
                            </div>
                            <div className="flex justify-between border-b border-gray-700 pb-2">
                                <span className="text-gray-400">Host Star:</span>
                                <span>{details.star}</span>
                            </div>
                            <div className="flex justify-between border-b border-gray-700 pb-2">
                                <span className="text-gray-400">Distance from Earth:</span>
                                <span>{planet.distance}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-400">Year Discovered:</span>
                                <span>{details.discovered}</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="mt-12 bg-gray-900/80 border border-blue-400/20 rounded-2xl p-8 shadow-2xl">
                    <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                        <div>
                            <h2 className="text-2xl font-semibold">Transit Light Curve</h2>
                            <p className="text-sm text-gray-400 mt-1">
                                Adjust the parameters to simulate how this planet dims its host star during transit.
                            </p>
                        </div>
                        <div className="text-sm text-gray-400 bg-gray-800/70 border border-blue-300/20 rounded-lg px-4 py-2">
                            Current depth: {(curveConfig.depth * 100).toFixed(0)}% flux drop · Slope {curveConfig.slope.toFixed(1)}
                        </div>
                    </div>

                    <div className="mt-6">
                        <TransitCurveControls
                            config={curveConfig}
                            onValueChange={updateValue}
                            onIngressChange={updateIngress}
                            onEnvelopeChange={updateSymmetricEnvelope}
                        />
                    </div>

                    <div className="mt-8">
                        <TransitLightCurve
                            className="bg-gradient-to-br from-gray-950 to-gray-900"
                            baseline={curveConfig.baseline}
                            depth={curveConfig.depth}
                            preTransitDuration={curveConfig.preTransitDuration}
                            ingressDuration={curveConfig.ingressDuration}
                            flatDuration={curveConfig.flatDuration}
                            egressDuration={curveConfig.egressDuration}
                            postTransitDuration={curveConfig.postTransitDuration}
                            slope={curveConfig.slope}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}
