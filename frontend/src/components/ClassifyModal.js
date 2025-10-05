'use client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function ClassifyModal({ onClose }) {
    const [formData, setFormData] = useState({
        candidate_threshold: 0.5,
        confirmed_threshold: 0.8,
    });
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: parseFloat(e.target.value),
        });
    };

    const handleClassify = async () => {
        setLoading(true);
        try {
            const response = await fetch(`http://localhost:8000/predict`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                    candidate_threshold: formData.candidate_threshold,
                    confirmed_threshold: formData.confirmed_threshold,
                }),
            });

            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const data = await response.json();
            console.log('Prediction result:', data);
            router.push('/results');
        } catch (error) {
            console.error('Error during prediction:', error);
            alert('Error during prediction');
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 flex items-center justify-center bg-black/70 z-50">
            <div className="relative bg-black border border-white-500 text-white rounded-md shadow-xl p-10 w-full max-w-xl">
                {/* Close button */}
                <button
                    onClick={() => (onClose ? onClose() : router.back())}
                    className="absolute top-4 right-4 text-gray-400 hover:text-white text-lg"
                >
                    ✕
                </button>

                {/* Title */}
                <h1 className="text-3xl font-bold text-center mb-10 tracking-widest">
                    ADVANCED PARAMETERS
                </h1>

                {/* Candidate threshold */}
                <div className="mb-8">
                    <div className="flex justify-between items-center mb-2">
                        <span className="tracking-widest">CANDIDATE THRESHOLD</span>
                        <span className="font-mono">{formData.candidate_threshold.toFixed(2)}</span>
                    </div>
                    <input
                        type="range"
                        name="candidate_threshold"
                        value={formData.candidate_threshold}
                        onChange={handleChange}
                        min="0"
                        max="1"
                        step="0.01"
                        className="w-full accent-purple-400"
                    />
                </div>

                {/* Confirmed threshold */}
                <div className="mb-10">
                    <div className="flex justify-between items-center mb-2">
                        <span className="tracking-widest">CONFIRMED THRESHOLD</span>
                        <span className="font-mono">{formData.confirmed_threshold.toFixed(2)}</span>
                    </div>
                    <input
                        type="range"
                        name="confirmed_threshold"
                        value={formData.confirmed_threshold}
                        onChange={handleChange}
                        min="0"
                        max="1"
                        step="0.01"
                        className="w-full accent-purple-400"
                    />
                </div>

                {/* Buttons */}
                <div className="flex justify-center gap-8">
                    <button
                        onClick={() => (onClose ? onClose() : router.back())}
                        className="px-6 py-2 text-white hover:text-gray-300"
                    >
                        Skip
                    </button>
                    <button
                        type="button"
                        onClick={handleClassify}
                        disabled={loading}
                        className={`px-8 py-2 border border-white hover:bg-white hover:text-black transition ${loading ? 'opacity-50 cursor-not-allowed' : ''
                            }`}
                    >
                        {loading ? 'Processing...' : 'Submit'}
                    </button>
                </div>
            </div>
        </div>
    );
}
