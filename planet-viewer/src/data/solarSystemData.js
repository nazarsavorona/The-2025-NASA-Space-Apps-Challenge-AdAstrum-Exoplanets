/**
 * Solar System data with realistic proportions (scaled for visualization)
 * Distances and sizes are scaled down for better viewing experience
 */

export const solarSystemData = [
    {
        name: 'Mercury',
        size: 2.4,
        orbitRadius: 25,
        orbitSpeed: 4.74,
        color: 0x8c7853,
        texture: null,
        description: 'Mercury is the smallest planet in our solar system and nearest to the Sun. It has a heavily cratered surface and extreme temperature variations.',
        diameter: '4,879 km',
        mass: '3.285 × 10²³ kg',
        orbitalPeriod: '88 days',
        distanceFromSun: '57.9 million km'
    },
    {
        name: 'Venus',
        size: 6.0,
        orbitRadius: 35,
        orbitSpeed: 3.50,
        color: 0xffc649,
        texture: null,
        description: 'Venus is the second planet from the Sun and Earth\'s closest neighbor. It has a thick, toxic atmosphere that traps heat in a runaway greenhouse effect.',
        diameter: '12,104 km',
        mass: '4.867 × 10²⁴ kg',
        orbitalPeriod: '225 days',
        distanceFromSun: '108.2 million km'
    },
    {
        name: 'Earth',
        size: 6.3,
        orbitRadius: 45,
        orbitSpeed: 2.98,
        color: 0x4169e1,
        texture: null,
        description: 'Earth is our home planet and the only known planet with life. It has liquid water, a protective atmosphere, and a moderate climate.',
        diameter: '12,742 km',
        mass: '5.972 × 10²⁴ kg',
        orbitalPeriod: '365.25 days',
        distanceFromSun: '149.6 million km',
        moons: [
            {
                name: 'Moon',
                size: 1.7,
                distance: 10,
                speed: 1.0,
                color: 0xaaaaaa
            }
        ]
    },
    {
        name: 'Mars',
        size: 3.4,
        orbitRadius: 58,
        orbitSpeed: 2.41,
        color: 0xcd5c5c,
        texture: null,
        description: 'Mars is known as the Red Planet due to iron oxide on its surface. It has the largest volcano and canyon in the solar system.',
        diameter: '6,779 km',
        mass: '6.39 × 10²³ kg',
        orbitalPeriod: '687 days',
        distanceFromSun: '227.9 million km',
        moons: [
            {
                name: 'Phobos',
                size: 0.5,
                distance: 7,
                speed: 2.0,
                color: 0x8b7355
            },
            {
                name: 'Deimos',
                size: 0.3,
                distance: 9,
                speed: 1.5,
                color: 0x9b8365
            }
        ]
    },
    {
        name: 'Jupiter',
        size: 25,
        orbitRadius: 85,
        orbitSpeed: 1.31,
        color: 0xdaa520,
        texture: null,
        description: 'Jupiter is the largest planet in our solar system. It has a Great Red Spot, a giant storm larger than Earth that has lasted hundreds of years.',
        diameter: '139,820 km',
        mass: '1.898 × 10²⁷ kg',
        orbitalPeriod: '11.86 years',
        distanceFromSun: '778.5 million km',
        moons: [
            {
                name: 'Io',
                size: 1.8,
                distance: 30,
                speed: 1.5,
                color: 0xffff00
            },
            {
                name: 'Europa',
                size: 1.5,
                distance: 35,
                speed: 1.2,
                color: 0xffffff
            },
            {
                name: 'Ganymede',
                size: 2.6,
                distance: 40,
                speed: 1.0,
                color: 0xcccccc
            },
            {
                name: 'Callisto',
                size: 2.4,
                distance: 45,
                speed: 0.8,
                color: 0x8b7355
            }
        ]
    },
    {
        name: 'Saturn',
        size: 21,
        orbitRadius: 120,
        orbitSpeed: 0.97,
        color: 0xfad5a5,
        texture: null,
        hasRings: true,
        description: 'Saturn is best known for its spectacular ring system. It is the second-largest planet and has at least 82 moons.',
        diameter: '116,460 km',
        mass: '5.683 × 10²⁶ kg',
        orbitalPeriod: '29.46 years',
        distanceFromSun: '1.43 billion km',
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
    },
    {
        name: 'Uranus',
        size: 11,
        orbitRadius: 155,
        orbitSpeed: 0.68,
        color: 0x4fd0e7,
        texture: null,
        hasRings: true,
        description: 'Uranus rotates on its side, making it unique among the planets. It has a blue-green color due to methane in its atmosphere.',
        diameter: '50,724 km',
        mass: '8.681 × 10²⁵ kg',
        orbitalPeriod: '84.01 years',
        distanceFromSun: '2.87 billion km'
    },
    {
        name: 'Neptune',
        size: 10.5,
        orbitRadius: 185,
        orbitSpeed: 0.54,
        color: 0x4169e1,
        texture: null,
        description: 'Neptune is the farthest planet from the Sun. It has the strongest winds in the solar system, reaching speeds of 2,000 km/h.',
        diameter: '49,244 km',
        mass: '1.024 × 10²⁶ kg',
        orbitalPeriod: '164.79 years',
        distanceFromSun: '4.50 billion km',
        moons: [
            {
                name: 'Triton',
                size: 1.3,
                distance: 20,
                speed: 0.7,
                color: 0xd3d3d3
            }
        ]
    }
];
