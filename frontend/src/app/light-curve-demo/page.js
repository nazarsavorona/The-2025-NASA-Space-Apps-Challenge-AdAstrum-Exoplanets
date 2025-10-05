'use client';
import { useState, useEffect } from 'react';
import TransitLightCurve from '../../components/TransitLightCurve';
import TransitCurveControls from '../../components/TransitCurveControls';

const createDefaultCurve = () => ({
    baseline: 1,
    depth: 0.012,
    preTransitDuration: 0.8,
    ingressDuration: 0.35,
    flatDuration: 1.1,
    egressDuration: 0.35,
    postTransitDuration: 0.8,
    slope: 2.2
});

const createDefaultView = () => ({
    width: 640,
    height: 320,
    tickCount: 6,
    strokeColor: '#f6a23a',
    backgroundColor: '#ffffff'
});

const createDefaultObservation = () => ({
    depthPpm: 12000,
    durationHours: 1.8,
    snr: 800,
    orbitalPeriodDays: 4.3,
    epochBkjd: 120.45
});

export default function LightCurveDemo() {
    const [curveConfig, setCurveConfig] = useState(() => createDefaultCurve());
    const [viewConfig, setViewConfig] = useState(() => createDefaultView());
    const [observation, setObservation] = useState(() => createDefaultObservation());

    const applyDurationTemplate = (durationHours) => {
        if (!Number.isFinite(durationHours) || durationHours <= 0) {
            return;
        }
        const ingress = Math.max(0.02, Math.min(durationHours * 0.18, durationHours / 2 - 0.05));
        const roundedIngress = Number(ingress.toFixed(2));
        const flat = Math.max(0.02, durationHours - roundedIngress * 2);
        const roundedFlat = Number(flat.toFixed(2));
        const baselineWindow = Number(Math.max(durationHours * 0.6, 0.5).toFixed(2));

        setCurveConfig((prev) => ({
            ...prev,
            ingressDuration: roundedIngress,
            egressDuration: roundedIngress,
            flatDuration: roundedFlat,
            preTransitDuration: baselineWindow,
            postTransitDuration: baselineWindow
        }));
    };

    useEffect(() => {
        applyDurationTemplate(createDefaultObservation().durationHours);
    }, []);

    const updateCurveValue = (key, value, boundaries = {}) => {
        if (!Number.isFinite(value)) {
            return;
        }
        const { min = 0, max } = boundaries;
        const clamped = Math.max(min, max !== undefined ? Math.min(value, max) : value);
        setCurveConfig((prev) => ({ ...prev, [key]: clamped }));
        if (key === 'depth') {
            setObservation((prev) => ({ ...prev, depthPpm: Number((clamped * 1_000_000).toFixed(1)) }));
        }
    };

    const updateEnvelope = (value) => {
        if (!Number.isFinite(value)) {
            return;
        }
        const clamped = Math.max(0.2, Math.min(value, 12));
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
        const clamped = Math.max(0.02, Math.min(value, 3));
        setCurveConfig((prev) => ({ ...prev, ingressDuration: clamped, egressDuration: clamped }));
    };

    const updateViewNumber = (key, value, boundaries = {}) => {
        if (!Number.isFinite(value)) {
            return;
        }
        const { min = 0, max } = boundaries;
        const clamped = Math.max(min, max !== undefined ? Math.min(value, max) : value);
        setViewConfig((prev) => ({ ...prev, [key]: clamped }));
    };

    const updateTickCount = (value) => {
        if (!Number.isFinite(value)) {
            return;
        }
        const clamped = Math.max(2, Math.min(Math.round(value), 12));
        setViewConfig((prev) => ({ ...prev, tickCount: clamped }));
    };

    const handleReset = () => {
        const defaults = createDefaultCurve();
        setCurveConfig(defaults);
        setViewConfig(createDefaultView());
        setObservation(createDefaultObservation());
        applyDurationTemplate(createDefaultObservation().durationHours);
    };

    const handleObservationChange = (key, rawValue) => {
        if (!Number.isFinite(rawValue)) {
            return;
        }

        if (key === 'depthPpm') {
            const depth = Math.max(1, rawValue);
            setObservation((prev) => ({ ...prev, depthPpm: Number(depth.toFixed(1)) }));
            setCurveConfig((prev) => ({ ...prev, depth: Number((depth / 1_000_000).toFixed(6)) }));
            return;
        }

        if (key === 'durationHours') {
            const duration = Math.max(0.2, rawValue);
            setObservation((prev) => ({ ...prev, durationHours: Number(duration.toFixed(2)) }));
            applyDurationTemplate(duration);
            return;
        }

        if (key === 'snr') {
            const snrValue = Math.max(1, rawValue);
            setObservation((prev) => ({ ...prev, snr: Number(snrValue.toFixed(1)) }));
            return;
        }

        if (key === 'orbitalPeriodDays') {
            const period = Math.max(0.1, rawValue);
            setObservation((prev) => ({ ...prev, orbitalPeriodDays: Number(period.toFixed(4)) }));
            return;
        }

        if (key === 'epochBkjd') {
            setObservation((prev) => ({ ...prev, epochBkjd: Number(rawValue.toFixed(4)) }));
        }
    };

    useEffect(() => {
        const depthPpm = Number((curveConfig.depth * 1_000_000).toFixed(1));
        if (Number.isFinite(depthPpm) && Math.abs(depthPpm - observation.depthPpm) > 0.5) {
            setObservation((prev) => ({ ...prev, depthPpm }));
        }
    }, [curveConfig.depth]);

    useEffect(() => {
        const transitDuration = Number(
            (curveConfig.ingressDuration + curveConfig.flatDuration + curveConfig.egressDuration).toFixed(2)
        );
        if (Number.isFinite(transitDuration) && Math.abs(transitDuration - observation.durationHours) > 0.01) {
            setObservation((prev) => ({ ...prev, durationHours: transitDuration }));
        }
    }, [curveConfig.ingressDuration, curveConfig.flatDuration, curveConfig.egressDuration]);

    return (
        <div className="min-h-screen bg-gradient-to-br from-black via-slate-950 to-indigo-950 text-white px-6 py-10">
            <div className="max-w-5xl mx-auto space-y-10">
                <header className="space-y-2 text-center">
                    <h1 className="text-4xl font-semibold">Transit Light Curve Playground</h1>
                    <p className="text-base text-gray-300">
                        Experiment with transit parameters and instantly preview the resulting light curve. Use this page to
                        validate styling changes before integrating them elsewhere.
                    </p>
                </header>

                <section className="bg-slate-900/70 border border-indigo-400/30 rounded-2xl p-6 shadow-2xl space-y-6">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <h2 className="text-xl font-medium">Curve Parameters</h2>
                        <span className="text-sm text-gray-400">
                            Flux drop: {(curveConfig.depth * 100).toFixed(1)}% • Ingress: {curveConfig.ingressDuration.toFixed(2)} • Flat: {curveConfig.flatDuration.toFixed(2)}
                        </span>
                    </div>
                    <TransitCurveControls
                        config={curveConfig}
                        onValueChange={updateCurveValue}
                        onIngressChange={updateIngress}
                        onEnvelopeChange={updateEnvelope}
                    />
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
                        <label className="flex flex-col gap-1 text-sm">
                            <span className="text-gray-300 uppercase tracking-widest text-xs">Transit depth (ppm)</span>
                            <input
                                type="number"
                                min="1"
                                value={observation.depthPpm}
                                onChange={(event) => handleObservationChange('depthPpm', parseFloat(event.target.value))}
                                className="rounded-lg border border-indigo-500/30 bg-slate-800 px-3 py-2"
                            />
                        </label>
                        <label className="flex flex-col gap-1 text-sm">
                            <span className="text-gray-300 uppercase tracking-widest text-xs">Transit duration (hrs)</span>
                            <input
                                type="number"
                                min="0.2"
                                step="0.05"
                                value={observation.durationHours}
                                onChange={(event) => handleObservationChange('durationHours', parseFloat(event.target.value))}
                                className="rounded-lg border border-indigo-500/30 bg-slate-800 px-3 py-2"
                            />
                        </label>
                        <label className="flex flex-col gap-1 text-sm">
                            <span className="text-gray-300 uppercase tracking-widest text-xs">SNR</span>
                            <input
                                type="number"
                                min="1"
                                step="1"
                                value={observation.snr}
                                onChange={(event) => handleObservationChange('snr', parseFloat(event.target.value))}
                                className="rounded-lg border border-indigo-500/30 bg-slate-800 px-3 py-2"
                            />
                        </label>
                        <label className="flex flex-col gap-1 text-sm">
                            <span className="text-gray-300 uppercase tracking-widest text-xs">Orbital period (days)</span>
                            <input
                                type="number"
                                min="0.1"
                                step="0.01"
                                value={observation.orbitalPeriodDays}
                                onChange={(event) => handleObservationChange('orbitalPeriodDays', parseFloat(event.target.value))}
                                className="rounded-lg border border-indigo-500/30 bg-slate-800 px-3 py-2"
                            />
                        </label>
                        <label className="flex flex-col gap-1 text-sm">
                            <span className="text-gray-300 uppercase tracking-widest text-xs">Transit epoch (BKJD)</span>
                            <input
                                type="number"
                                step="0.0001"
                                value={observation.epochBkjd}
                                onChange={(event) => handleObservationChange('epochBkjd', parseFloat(event.target.value))}
                                className="rounded-lg border border-indigo-500/30 bg-slate-800 px-3 py-2"
                            />
                        </label>
                    </div>
                    <p className="text-xs text-indigo-200/70">
                        Transit span (ingress + flat + egress): {(curveConfig.ingressDuration + curveConfig.flatDuration + curveConfig.egressDuration).toFixed(2)} hrs · Observation window: {(curveConfig.preTransitDuration + curveConfig.ingressDuration + curveConfig.flatDuration + curveConfig.egressDuration + curveConfig.postTransitDuration).toFixed(2)} hrs
                    </p>
                </section>

                <section className="bg-slate-900/70 border border-indigo-400/30 rounded-2xl p-6 shadow-2xl space-y-4">
                    <h2 className="text-xl font-medium">Display Options</h2>
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        <label className="flex flex-col gap-2 text-sm">
                            <span className="text-gray-300 uppercase tracking-widest text-xs">Width</span>
                            <input
                                type="number"
                                min="360"
                                max="1024"
                                step="10"
                                value={viewConfig.width}
                                onChange={(event) => updateViewNumber('width', parseFloat(event.target.value), { min: 360, max: 1024 })}
                                className="rounded-lg bg-slate-800 border border-slate-700 px-3 py-2"
                            />
                        </label>
                        <label className="flex flex-col gap-2 text-sm">
                            <span className="text-gray-300 uppercase tracking-widest text-xs">Height</span>
                            <input
                                type="number"
                                min="220"
                                max="400"
                                step="10"
                                value={viewConfig.height}
                                onChange={(event) => updateViewNumber('height', parseFloat(event.target.value), { min: 220, max: 400 })}
                                className="rounded-lg bg-slate-800 border border-slate-700 px-3 py-2"
                            />
                        </label>
                        <label className="flex flex-col gap-2 text-sm">
                            <span className="text-gray-300 uppercase tracking-widest text-xs">Tick count</span>
                            <input
                                type="number"
                                min="2"
                                max="12"
                                value={viewConfig.tickCount}
                                onChange={(event) => updateTickCount(parseFloat(event.target.value))}
                                className="rounded-lg bg-slate-800 border border-slate-700 px-3 py-2"
                            />
                        </label>
                        <label className="flex flex-col gap-2 text-sm">
                            <span className="text-gray-300 uppercase tracking-widest text-xs">Stroke colour</span>
                            <input
                                type="color"
                                value={viewConfig.strokeColor}
                                onChange={(event) => setViewConfig((prev) => ({ ...prev, strokeColor: event.target.value }))}
                                className="h-10 w-full rounded-lg border border-slate-700 bg-slate-800"
                            />
                        </label>
                        <label className="flex flex-col gap-2 text-sm">
                            <span className="text-gray-300 uppercase tracking-widest text-xs">Background colour</span>
                            <input
                                type="color"
                                value={viewConfig.backgroundColor}
                                onChange={(event) => setViewConfig((prev) => ({ ...prev, backgroundColor: event.target.value }))}
                                className="h-10 w-full rounded-lg border border-slate-700 bg-slate-800"
                            />
                        </label>
                    </div>
                    <div className="flex flex-wrap gap-3 pt-2">
                        <button
                            onClick={handleReset}
                            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium hover:bg-indigo-500 transition-colors"
                        >
                            Reset defaults
                        </button>
                        <button
                            onClick={() => {
                                const randomDepthPpm = Number((400 + Math.random() * 19000).toFixed(1));
                                const randomDuration = Number((0.8 + Math.random() * 4).toFixed(2));
                                const randomSlope = Number((1 + Math.random() * 3).toFixed(1));
                                const randomSnr = Number((80 + Math.random() * 4000).toFixed(0));
                                const randomPeriod = Number((1 + Math.random() * 50).toFixed(2));
                                const randomEpoch = Number((100 + Math.random() * 900).toFixed(3));

                                setObservation({
                                    depthPpm: randomDepthPpm,
                                    durationHours: randomDuration,
                                    snr: randomSnr,
                                    orbitalPeriodDays: randomPeriod,
                                    epochBkjd: randomEpoch
                                });

                                setCurveConfig((prev) => ({
                                    ...prev,
                                    depth: Number((randomDepthPpm / 1_000_000).toFixed(6)),
                                    slope: randomSlope
                                }));

                                applyDurationTemplate(randomDuration);
                            }}
                            className="rounded-lg border border-indigo-400/40 px-4 py-2 text-sm font-medium text-indigo-200 hover:bg-indigo-500/10 transition-colors"
                        >
                            Randomise curve
                        </button>
                    </div>
                </section>

                <section className="bg-slate-900/70 border border-indigo-400/30 rounded-2xl p-6 shadow-2xl">
                    <h2 className="text-xl font-medium mb-4">Preview</h2>
                    <TransitLightCurve
                        className="bg-gradient-to-br from-slate-950 to-slate-900"
                        width={viewConfig.width}
                        height={viewConfig.height}
                        tickCount={viewConfig.tickCount}
                        fluxTickCount={5}
                        strokeColor={viewConfig.strokeColor}
                        backgroundColor={viewConfig.backgroundColor}
                        baseline={curveConfig.baseline}
                        depth={curveConfig.depth}
                        preTransitDuration={curveConfig.preTransitDuration}
                        ingressDuration={curveConfig.ingressDuration}
                        flatDuration={curveConfig.flatDuration}
                        egressDuration={curveConfig.egressDuration}
                        postTransitDuration={curveConfig.postTransitDuration}
                        slope={curveConfig.slope}
                        fluxScale={1_000_000}
                        fluxUnit="ppm relative drop"
                        timeUnit="hours"
                        showNoise
                        snr={observation.snr}
                        timeAxisLabel="Time (hours relative to mid-transit)"
                        fluxAxisLabel="Flux (ppm relative drop)"
                    />
                </section>

            </div>
        </div>
    );
}
