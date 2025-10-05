import { Bar } from "react-chartjs-2";
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend,
} from "chart.js";

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);
export default function FeatureImportance() {

    const features = {
        "Orbital Period (days)": 27884.833504080772,
        "Transit Duration (hours)": 11461.031258970499,
        "Transit Depth (ppm)": 20514.496178925037,
        "Impact Parameter": 9013.564484089613,
        "Eccentricity": 872.1251285076141,
        "Inclination (degrees)": 8752.685040086508,
        "Planet Radius (Earth radii)": 50285.66988945007,
        "Planet Equilibrium Temperature (K)": 25769.203072845936,
        "Insolation Flux (Earth flux)": 6548.60926130414,
        "Stellar Effective Temperature (K)": 8623.679917544127,
        "Stellar Surface Gravity (log10(cm/s^2))": 7475.145740032196,
        "Stellar Radius (solar radii)": 6567.19534599781,
        "Stellar Mass (solar masses)": 4982.842602550983,
        "Stellar Metallicity ([Fe/H])": 13078.731902450323,
        "Dataset Type Indicator": 3818.9925240278244
    }
    // Sort features by importance (descending)
    const sorted = Object.entries(features).sort((a, b) => b[1] - a[1]);
    const labels = sorted.map(([name]) => name);
    const values = sorted.map(([_, importance]) => importance);

    const data = {
        labels,
        datasets: [
            {
                label: "Importance",
                data: values,
                backgroundColor: "rgba(168, 85, 247, 0.8)", // purple
                borderColor: "rgba(168, 85, 247, 1)",
                borderWidth: 1,
            },
        ],
    };

    const options = {
        indexAxis: "y", // horizontal bar chart
        responsive: true,
        plugins: {
            legend: { display: false },
            title: {
                display: true,
                text: "Feature importance",
                color: "#fff",
                font: { size: 18 },
            },
        },
        scales: {
            x: {
                ticks: { color: "#fff" },
                grid: { color: "rgba(255,255,255,0.1)" },
            },
            y: {
                ticks: { color: "#fff" },
                grid: { color: "rgba(255,255,255,0.1)" },
            },
        },
    };

    return (
        <div className="relative w-full max-w-2xl p-6 rounded-xl bg-gradient-to-br from-[#1a1a2e] via-[#13111c] to-[#0d0b13] shadow-xl border border-white/10">
            <Bar data={data} options={options} />
        </div>
    );
}