export default function TransitCurveControls({
    config,
    onValueChange,
    onIngressChange,
    onEnvelopeChange
}) {
    const handleValue = (key, boundaries) => (event) => {
        const next = parseFloat(event.target.value);
        if (!Number.isFinite(next)) {
            return;
        }
        onValueChange?.(key, next, boundaries);
    };

    const handleIngress = (event) => {
        const next = parseFloat(event.target.value);
        if (!Number.isFinite(next)) {
            return;
        }
        onIngressChange?.(next);
    };

    const handleEnvelope = (event) => {
        const next = parseFloat(event.target.value);
        if (!Number.isFinite(next)) {
            return;
        }
        onEnvelopeChange?.(next);
    };

    return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <label className="flex flex-col gap-2 text-sm">
                <span className="text-gray-300 uppercase tracking-widest text-xs">Baseline flux</span>
                <div className="flex items-center gap-3">
                    <input
                        type="range"
                        min="0.6"
                        max="1.4"
                        step="0.01"
                        value={config.baseline}
                        onChange={handleValue('baseline', { min: 0.6, max: 1.4 })}
                        className="w-full accent-blue-400"
                    />
                    <input
                        type="number"
                        min="0.6"
                        max="1.4"
                        step="0.01"
                        value={config.baseline}
                        onChange={handleValue('baseline', { min: 0.6, max: 1.4 })}
                        className="w-20 rounded-lg bg-gray-800 border border-gray-700 px-2 py-1 text-right"
                    />
                </div>
            </label>

            <label className="flex flex-col gap-2 text-sm">
                <span className="text-gray-300 uppercase tracking-widest text-xs">
                    Transit depth · {(config.depth * 1_000_000).toFixed(0)} ppm
                </span>
                <div className="flex items-center gap-3">
                    <input
                        type="range"
                        min="0.0001"
                        max="0.08"
                        step="0.0001"
                        value={config.depth}
                        onChange={handleValue('depth', { min: 0.0001, max: 0.08 })}
                        className="w-full accent-blue-400"
                    />
                    <input
                        type="number"
                        min="0.0001"
                        max="0.08"
                        step="0.0001"
                        value={config.depth}
                        onChange={handleValue('depth', { min: 0.0001, max: 0.08 })}
                        className="w-24 rounded-lg bg-gray-800 border border-gray-700 px-2 py-1 text-right"
                    />
                </div>
            </label>

            <label className="flex flex-col gap-2 text-sm">
                <span className="text-gray-300 uppercase tracking-widest text-xs">Ingress / egress (hrs)</span>
                <div className="flex items-center gap-3">
                    <input
                        type="range"
                        min="0.02"
                        max="3"
                        step="0.01"
                        value={config.ingressDuration}
                        onChange={handleIngress}
                        className="w-full accent-blue-400"
                    />
                    <input
                        type="number"
                        min="0.02"
                        max="3"
                        step="0.01"
                        value={config.ingressDuration}
                        onChange={handleIngress}
                        className="w-20 rounded-lg bg-gray-800 border border-gray-700 px-2 py-1 text-right"
                    />
                </div>
            </label>

            <label className="flex flex-col gap-2 text-sm">
                <span className="text-gray-300 uppercase tracking-widest text-xs">Flat minimum (hrs)</span>
                <div className="flex items-center gap-3">
                    <input
                        type="range"
                        min="0.05"
                        max="8"
                        step="0.01"
                        value={config.flatDuration}
                        onChange={handleValue('flatDuration', { min: 0.05, max: 8 })}
                        className="w-full accent-blue-400"
                    />
                    <input
                        type="number"
                        min="0.05"
                        max="8"
                        step="0.01"
                        value={config.flatDuration}
                        onChange={handleValue('flatDuration', { min: 0.05, max: 8 })}
                        className="w-20 rounded-lg bg-gray-800 border border-gray-700 px-2 py-1 text-right"
                    />
                </div>
            </label>

            <label className="flex flex-col gap-2 text-sm lg:col-span-2">
                <span className="text-gray-300 uppercase tracking-widest text-xs">Out-of-transit duration (hrs)</span>
                <div className="flex items-center gap-3">
                    <input
                        type="range"
                        min="0.2"
                        max="12"
                        step="0.05"
                        value={config.preTransitDuration}
                        onChange={handleEnvelope}
                        className="w-full accent-blue-400"
                    />
                    <input
                        type="number"
                        min="0.2"
                        max="12"
                        step="0.05"
                        value={config.preTransitDuration}
                        onChange={handleEnvelope}
                        className="w-20 rounded-lg bg-gray-800 border border-gray-700 px-2 py-1 text-right"
                    />
                </div>
                <p className="text-xs text-gray-500">
                    Applies before and after the transit equally.
                </p>
            </label>

            <label className="flex flex-col gap-2 text-sm lg:col-span-2">
                <span className="text-gray-300 uppercase tracking-widest text-xs">Slope (curve smoothness)</span>
                <div className="flex items-center gap-3">
                    <input
                        type="range"
                        min="1"
                        max="4"
                        step="0.1"
                        value={config.slope}
                        onChange={handleValue('slope', { min: 1, max: 4 })}
                        className="w-full accent-blue-400"
                    />
                    <input
                        type="number"
                        min="1"
                        max="4"
                        step="0.1"
                        value={config.slope}
                        onChange={handleValue('slope', { min: 1, max: 4 })}
                        className="w-20 rounded-lg bg-gray-800 border border-gray-700 px-2 py-1 text-right"
                    />
                </div>
                <p className="text-xs text-gray-500">
                    Higher values add smoother S-shaped ingress and egress transitions.
                </p>
            </label>
        </div>
    );
}
