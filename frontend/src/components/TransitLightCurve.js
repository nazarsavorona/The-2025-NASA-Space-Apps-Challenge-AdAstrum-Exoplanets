const DEFAULT_PADDING = { top: 40, right: 32, bottom: 64, left: 72 };

const easeInOut = (t, power) => {
    if (t <= 0) return 0;
    if (t >= 1) return 1;

    const p = Math.max(1, power);
    if (p === 1) return t;

    if (t < 0.5) {
        return 0.5 * Math.pow(t * 2, p);
    }

    return 1 - 0.5 * Math.pow((1 - t) * 2, p);
};

const createDeterministicRandom = (seed) => {
    let state = Math.floor(seed) % 2147483647;
    if (state <= 0) {
        state += 2147483646;
    }
    return () => {
        state = (state * 16807) % 2147483647;
        return (state - 1) / 2147483646;
    };
};

const createGaussianGenerator = (seed) => {
    const random = createDeterministicRandom(seed);
    let spare = null;
    return () => {
        if (spare !== null) {
            const value = spare;
            spare = null;
            return value;
        }
        let u = random();
        let v = random();
        if (u <= Number.EPSILON) {
            u = Number.EPSILON;
        }
        const mag = Math.sqrt(-2.0 * Math.log(u));
        const angle = 2 * Math.PI * v;
        const z0 = mag * Math.cos(angle);
        const z1 = mag * Math.sin(angle);
        spare = z1;
        return z0;
    };
};

function buildNormalizedSeries({
    baseline,
    depth,
    preTransitDuration,
    ingressDuration,
    flatDuration,
    egressDuration,
    postTransitDuration,
    slope
}) {
    const sanitize = (value, fallback = 0) => {
        if (typeof value !== 'number' || Number.isNaN(value) || !Number.isFinite(value)) {
            return fallback;
        }
        return Math.max(0, value);
    };

    const baseLineSafe = baseline <= 0 ? 1 : baseline;
    const depthSafe = Math.min(Math.max(depth, 0), baseLineSafe * 0.95);

    const pre = sanitize(preTransitDuration, 0.5);
    const ingress = sanitize(ingressDuration, 0.25);
    const flat = sanitize(flatDuration, 1);
    const egress = sanitize(egressDuration, ingress);
    const post = sanitize(postTransitDuration, 0.5);

    const totalDuration = pre + ingress + flat + egress + post;
    if (totalDuration === 0) {
        return {
            points: [
                [0, baseLineSafe],
                [1, baseLineSafe]
            ],
            totalDuration,
            centerTime: 0,
            baseLineSafe,
            depthSafe
        };
    }

    const segments = [
        { duration: pre, start: baseLineSafe, end: baseLineSafe, easing: false },
        { duration: ingress, start: baseLineSafe, end: baseLineSafe - depthSafe, easing: true },
        { duration: flat, start: baseLineSafe - depthSafe, end: baseLineSafe - depthSafe, easing: false },
        { duration: egress, start: baseLineSafe - depthSafe, end: baseLineSafe, easing: true },
        { duration: post, start: baseLineSafe, end: baseLineSafe, easing: false }
    ];

    const sampled = [[0, baseLineSafe]];
    let cursor = 0;
    const smoothSamples = Math.max(4, Math.round(12 * Math.max(1, slope)));

    segments.forEach(({ duration, start, end, easing }) => {
        if (duration <= 0) return;

        const startTime = cursor;
        const last = sampled[sampled.length - 1];
        if (Math.abs(last[0] - startTime) > 1e-6 || Math.abs(last[1] - start) > 1e-6) {
            sampled.push([startTime, start]);
        }

        if (!easing || Math.abs(start - end) < 1e-6) {
            cursor += duration;
            sampled.push([cursor, end]);
            return;
        }

        for (let step = 1; step <= smoothSamples; step += 1) {
            const progress = step / smoothSamples;
            const eased = easeInOut(progress, slope);
            const t = startTime + progress * duration;
            const value = start + (end - start) * eased;
            sampled.push([t, value]);
        }

        cursor += duration;
    });

    if (sampled[sampled.length - 1][0] < totalDuration - 1e-6) {
        sampled.push([totalDuration, baseLineSafe]);
    }

    const centerTime = pre + ingress + flat / 2;

    const deduped = sampled.filter((point, index) => {
        if (index === 0) return true;
        const [prevTime, prevValue] = sampled[index - 1];
        const [currTime, currValue] = point;
        return Math.abs(prevTime - currTime) > 1e-6 || Math.abs(prevValue - currValue) > 1e-6;
    });

    const normalized = deduped.map(([time, value], index, array) => {
        const normalizedTime = time / totalDuration;
        if (index === array.length - 1) {
            return [1, value];
        }
        return [normalizedTime, value];
    });

    return { points: normalized, totalDuration, centerTime, baseLineSafe, depthSafe };
}

function interpolateDisplay(series, time) {
    if (series.length === 0) return 0;
    if (time <= series[0].time) return series[0].value;
    if (time >= series[series.length - 1].time) return series[series.length - 1].value;

    for (let index = 1; index < series.length; index += 1) {
        const prev = series[index - 1];
        const next = series[index];
        if (time >= prev.time && time <= next.time) {
            const span = next.time - prev.time || 1;
            const ratio = (time - prev.time) / span;
            return prev.value + (next.value - prev.value) * ratio;
        }
    }

    return series[series.length - 1].value;
}

const formatNumber = (value, precision) => {
    const factor = 10 ** precision;
    const rounded = Math.round(value * factor + Number.EPSILON) / factor;
    return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(precision);
};

export default function TransitLightCurve({
    width = 680,
    height = 360,
    baseline = 1,
    depth = 0.012,
    preTransitDuration = 0.8,
    ingressDuration = 0.35,
    flatDuration = 1.1,
    egressDuration = 0.35,
    postTransitDuration = 0.8,
    slope = 2.2,
    strokeColor = '#e53935',
    noiseColor = '#1d4ed8',
    backgroundColor = '#ffffff',
    axisColor = '#222222',
    gridColor = 'rgba(50, 50, 50, 0.15)',
    labelColor = '#222222',
    padding = DEFAULT_PADDING,
    tickCount = 6,
    fluxTickCount = 5,
    fluxScale = 1,
    fluxUnit = '',
    fluxMode = 'absolute', // 'absolute' | 'delta'
    timeUnit = 'hours',
    displayAsPhase = false,
    orbitalPeriodHours,
    showNoise = true,
    snr = 0,
    title,
    className = '',
    style,
    timeAxisLabel,
    fluxAxisLabel
}) {
    const pad = { ...DEFAULT_PADDING, ...padding };
    const innerWidth = width - pad.left - pad.right;
    const innerHeight = height - pad.top - pad.bottom;

    if (innerWidth <= 0 || innerHeight <= 0) return null;

    const { points: normalizedPoints, totalDuration, centerTime, baseLineSafe, depthSafe } = buildNormalizedSeries({
        baseline,
        depth,
        preTransitDuration,
        ingressDuration,
        flatDuration,
        egressDuration,
        postTransitDuration,
        slope
    });

    const periodHours = Number.isFinite(orbitalPeriodHours) && orbitalPeriodHours > 0 ? orbitalPeriodHours : undefined;

    const computeFluxValue = (value) => {
        if (fluxMode === 'delta') {
            return (value - baseLineSafe) * fluxScale;
        }
        return (value / baseLineSafe) * fluxScale;
    };

    const scaledPoints = normalizedPoints.map(([normalizedTime, value]) => {
        const absoluteTime = normalizedTime * totalDuration;
        const relativeTime = absoluteTime - centerTime;
        const displayTime = displayAsPhase && periodHours ? relativeTime / periodHours : relativeTime;
        return {
            time: displayTime,
            value: computeFluxValue(value),
            baseValue: value
        };
    });

    const timeStart = scaledPoints[0]?.time ?? -1;
    const timeEnd = scaledPoints[scaledPoints.length - 1]?.time ?? 1;
    const timeRange = timeEnd - timeStart || 1;

    const fluxValues = scaledPoints.map((point) => point.value);
    const minFlux = Math.min(...fluxValues);
    const maxFlux = Math.max(...fluxValues);
    const fluxPadding = (maxFlux - minFlux || 1) * 0.12;
    const fluxMin = minFlux - fluxPadding;
    const fluxMax = maxFlux + fluxPadding;
    const fluxRange = fluxMax - fluxMin || 1;

    const xScale = (time) => pad.left + ((time - timeStart) / timeRange) * innerWidth;
    const yScale = (value) => pad.top + (fluxMax - value) * (innerHeight / fluxRange);

    const modelPath = scaledPoints
        .map(({ time, value }, index) => {
            const command = index === 0 ? 'M' : 'L';
            return `${command}${xScale(time)} ${yScale(value)}`;
        })
        .join(' ');

    const timeTicks = Array.from({ length: Math.max(2, Math.round(tickCount)) + 1 }, (_, index) =>
        timeStart + (index / Math.max(1, tickCount)) * timeRange
    );
    const fluxTicks = Array.from({ length: Math.max(2, Math.round(fluxTickCount)) + 1 }, (_, index) =>
        fluxMin + (index / Math.max(1, fluxTickCount)) * fluxRange
    );

    const formatTime = (value) => {
        if (displayAsPhase) {
            const precision = Math.abs(timeRange) > 0.2 ? 3 : 4;
            return formatNumber(value, precision);
        }
        const magnitude = Math.abs(timeRange);
        const precision = magnitude > 10 ? 1 : magnitude > 2 ? 2 : 3;
        return formatNumber(value, precision);
    };

    const formatFlux = (value) => {
        if (Math.abs(value) >= 1000) {
            return Math.round(value).toLocaleString();
        }
        const precision = Math.abs(fluxRange) > 0.2 ? 3 : 4;
        return formatNumber(value, precision);
    };

    const baselineDisplay = computeFluxValue(baseLineSafe);
    const minDisplay = computeFluxValue(baseLineSafe - depthSafe);
    const depthDisplay = Math.abs(baselineDisplay - minDisplay);

    const observedSeries = [];
    if (showNoise && Number.isFinite(snr) && snr > 0 && scaledPoints.length > 1 && depthDisplay > 0) {
        const sigma = depthDisplay / snr;
        if (sigma > 0) {
            const sampleCount = Math.max(150, Math.min(480, Math.round(innerWidth / 1.8)));
            const seedBase =
                Math.round(depthSafe * 1_000_000) * 13 +
                Math.round(snr * 100) * 7 +
                Math.round(totalDuration * 1000) * 3 +
                Math.round((periodHours || 0) * 100);
            const gaussian = createGaussianGenerator(seedBase || 1);
            for (let index = 0; index <= sampleCount; index += 1) {
                const ratio = index / sampleCount;
                const time = timeStart + ratio * timeRange;
                const baseValue = interpolateDisplay(scaledPoints, time);
                const noisy = baseValue + gaussian() * sigma;
                observedSeries.push({ time, value: noisy });
            }
        }
    }

    const noisePath = observedSeries.length
        ? observedSeries
              .map(({ time, value }, index) => {
                  const command = index === 0 ? 'M' : 'L';
                  return `${command}${xScale(time)} ${yScale(value)}`;
              })
              .join(' ')
        : null;

    const resolvedTimeAxisLabel =
        typeof timeAxisLabel === 'string'
            ? timeAxisLabel
            : displayAsPhase
            ? 'Orbital Phase'
            : `Time (${timeUnit}${timeUnit && !timeUnit.includes('relative') ? ' relative to mid-transit' : ''})`;

    const resolvedFluxAxisLabel =
        typeof fluxAxisLabel === 'string'
            ? fluxAxisLabel
            : fluxMode === 'delta'
            ? `Flux Change ${fluxUnit ? `(${fluxUnit})` : ''}`
            : `Normalized Flux${fluxUnit ? ` (${fluxUnit})` : ''}`;

    const tickLabelCharacters = fluxTicks.reduce(
        (max, tick) => Math.max(max, formatFlux(tick).length),
        0
    );
    const approxTickLabelWidth = tickLabelCharacters * 6.5; // rough px estimate per character
    const yAxisLabelX = Math.max(12, pad.left - approxTickLabelWidth - 18);
    const yAxisLabelY = pad.top + innerHeight / 2;

    return (
        <div
            className={`rounded-xl border border-neutral-300 bg-white p-4 shadow-sm ${className}`.trim()}
            style={{
                ...style,
                backgroundColor: '#ffffff'
            }}
        >
            <svg width={width} height={height} role="img" aria-label="Transit light curve visualization">
                <rect x={0} y={0} width={width} height={height} fill={backgroundColor} />

                {title && (
                    <text
                        x={width / 2}
                        y={pad.top - 18}
                        textAnchor="middle"
                        fill={labelColor}
                        fontSize={16}
                        fontFamily="sans-serif"
                        fontWeight="600"
                    >
                        {title}
                    </text>
                )}

                <g>
                    <line
                        x1={pad.left}
                        y1={pad.top}
                        x2={pad.left}
                        y2={pad.top + innerHeight}
                        stroke={axisColor}
                        strokeWidth={1.5}
                    />
                    <line
                        x1={pad.left}
                        y1={pad.top + innerHeight}
                        x2={pad.left + innerWidth}
                        y2={pad.top + innerHeight}
                        stroke={axisColor}
                        strokeWidth={1.5}
                    />
                </g>

                <g>
                    {timeTicks.map((tick) => {
                        const x = xScale(tick);
                        return (
                            <g key={`time-${tick.toFixed(6)}`}>
                                <line
                                    x1={x}
                                    y1={pad.top}
                                    x2={x}
                                    y2={pad.top + innerHeight}
                                    stroke={gridColor}
                                    strokeDasharray="6 8"
                                />
                                <text
                                    x={x}
                                    y={pad.top + innerHeight + 28}
                                    textAnchor="middle"
                                    fill={labelColor}
                                    fontSize={12}
                                    fontFamily="sans-serif"
                                >
                                    {formatTime(tick)}
                                </text>
                            </g>
                        );
                    })}
                </g>

                <g>
                    {fluxTicks.map((tick) => {
                        const y = yScale(tick);
                        return (
                            <g key={`flux-${tick.toFixed(6)}`}>
                                <line
                                    x1={pad.left}
                                    y1={y}
                                    x2={pad.left + innerWidth}
                                    y2={y}
                                    stroke={gridColor}
                                    strokeDasharray="6 8"
                                />
                                <text
                                    x={pad.left - 10}
                                    y={y + 4}
                                    textAnchor="end"
                                    fill={labelColor}
                                    fontSize={12}
                                    fontFamily="sans-serif"
                                >
                                    {formatFlux(tick)}
                                </text>
                            </g>
                        );
                    })}
                </g>

                {noisePath && (
                    <path d={noisePath} fill="none" stroke={noiseColor} strokeWidth={1.2} strokeOpacity={0.6} />
                )}

                {observedSeries.map(({ time, value }, index) => (
                    <circle
                        key={`sample-${index}`}
                        cx={xScale(time)}
                        cy={yScale(value)}
                        r={Math.max(1.6, Math.min(2.8, 2.4 - (snr || 1) / 5000))}
                        fill={noiseColor}
                        opacity={0.75}
                    />
                ))}

                <path d={modelPath} fill="none" stroke={strokeColor} strokeWidth={2.4} strokeLinejoin="round" strokeLinecap="round" />

                <text
                    x={yAxisLabelX}
                    y={yAxisLabelY}
                    fill={labelColor}
                    fontSize={13}
                    fontFamily="sans-serif"
                    transform={`rotate(-90 ${yAxisLabelX} ${yAxisLabelY})`}
                    textAnchor="middle"
                >
                    {resolvedFluxAxisLabel}
                </text>
                <text
                    x={pad.left + innerWidth / 2}
                    y={pad.top + innerHeight + 48}
                    fill={labelColor}
                    fontSize={13}
                    fontFamily="sans-serif"
                    textAnchor="middle"
                >
                    {resolvedTimeAxisLabel}
                </text>
            </svg>
        </div>
    );
}
