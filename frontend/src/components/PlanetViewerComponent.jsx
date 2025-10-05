"use client";
import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

// ---- Mocked exoplanet data ----
const MOCK_PLANETS = [
    { name: "TRAPPIST-1e", radiusEarth: 0.92, temperature: 300, type: "terrestrial" },
    { name: "Kepler-22b", radiusEarth: 2.4, temperature: 295, type: "super-Earth" },
    { name: "HD 209458 b", radiusEarth: 13, temperature: 1400, type: "hot Jupiter" },
    { name: "GJ 1214 b", radiusEarth: 2.7, temperature: 550, type: "mini-Neptune" },
    { name: "55 Cancri e", radiusEarth: 1.9, temperature: 2400, type: "lava world" },
    { name: "Kepler-62f", radiusEarth: 1.4, temperature: 270, type: "potentially habitable" },
];

export default function PlanetViewerComponent() {
    const mountRef = useRef();
    const [selectedPlanet, setSelectedPlanet] = useState(MOCK_PLANETS[0].name);

    useEffect(() => {
        const container = mountRef.current;
        const width = container.clientWidth;
        const height = container.clientHeight;

        const renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setSize(width, height);
        renderer.setPixelRatio(window.devicePixelRatio);
        container.innerHTML = "";
        container.appendChild(renderer.domElement);

        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0x000000);

        const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
        camera.position.z = 3;

        const controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.minDistance = 1.2;
        controls.maxDistance = 20;

        const ambient = new THREE.AmbientLight(0xffffff, 0.3);
        const dir = new THREE.DirectionalLight(0xffffff, 1);
        dir.position.set(5, 3, 5);
        scene.add(ambient, dir);

        // --- Generate planet ---
        const planetData = MOCK_PLANETS.find(p => p.name === selectedPlanet);
        const scale = THREE.MathUtils.clamp(planetData.radiusEarth, 0.3, 10);
        const geometry = new THREE.SphereGeometry(1 * scale, 64, 64);

        // Procedural texture (color by temperature)
        const canvas = document.createElement("canvas");
        canvas.width = 512;
        canvas.height = 512;
        const ctx = canvas.getContext("2d");
        const temp = planetData.temperature || 300;
        const hue = THREE.MathUtils.clamp((temp - 200) / 1000, 0, 1) * 0.7;
        const color = new THREE.Color().setHSL(hue, 0.6, 0.5);
        const grad = ctx.createRadialGradient(256, 256, 30, 256, 256, 256);
        grad.addColorStop(0, color.clone().offsetHSL(0, 0, 0.2).getStyle());
        grad.addColorStop(1, color.offsetHSL(0.05, 0, -0.3).getStyle());
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, 512, 512);
        const texture = new THREE.CanvasTexture(canvas);

        const material = new THREE.MeshStandardMaterial({
            map: texture,
            bumpMap: texture,
            bumpScale: 0.04,
            roughness: 1,
            metalness: 0,
        });

        const planetMesh = new THREE.Mesh(geometry, material);
        scene.add(planetMesh);

        // Atmosphere glow shader
        const atmosphere = new THREE.Mesh(
            new THREE.SphereGeometry(1.05 * scale, 64, 64),
            new THREE.ShaderMaterial({
                vertexShader: `
          varying vec3 vNormal;
          void main() {
            vNormal = normalize(normalMatrix * normal);
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
                fragmentShader: `
          varying vec3 vNormal;
          void main() {
            float intensity = pow(0.6 - dot(vNormal, vec3(0,0,1.0)), 2.0);
            gl_FragColor = vec4(0.2, 0.5, 1.0, 1.0) * intensity;
          }
        `,
                blending: THREE.AdditiveBlending,
                side: THREE.BackSide,
                transparent: true,
            })
        );
        planetMesh.add(atmosphere);

        const animate = () => {
            requestAnimationFrame(animate);
            planetMesh.rotation.y += 0.002;
            controls.update();
            renderer.render(scene, camera);
        };
        animate();

        return () => {
            renderer.dispose();
            geometry.dispose();
            material.dispose();
            texture.dispose();
            controls.dispose();
        };
    }, [selectedPlanet]);

    return (
        <div className="w-full flex flex-col items-center text-white">
            <select
                className="text-black p-2 rounded mb-3"
                value={selectedPlanet}
                onChange={(e) => setSelectedPlanet(e.target.value)}
            >
                {MOCK_PLANETS.map((p) => (
                    <option key={p.name} value={p.name}>
                        {p.name}
                    </option>
                ))}
            </select>
            <div
                ref={mountRef}
                style={{ width: "600px", height: "600px" }}
            ></div>
        </div>
    );
}
