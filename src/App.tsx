import { useState, useEffect, useRef, useCallback } from "react";

type Unit = "lbs" | "kg";

interface PlateEntry {
  weight: number;
  count: number;
}

interface ConfettiParticle {
  x: number; y: number; vx: number; vy: number;
  color: string; w: number; h: number; rot: number; rotV: number;
}

const SETS = [
  { reps: 10, pct: 0,    display: "10 reps — just the bar" },
  { reps: 5,  pct: 0.50, display: "5 reps at 50%" },
  { reps: 3,  pct: 0.60, display: "3 reps at 60%" },
  { reps: 2,  pct: 0.70, display: "2 reps at 70%" },
  { reps: 1,  pct: 0.80, display: "1 rep at 80%" },
  { reps: 1,  pct: 0.90, display: "1 rep at 90%" },
  { reps: 1,  pct: 0.95, display: "1 rep at 95%" },
  { reps: 1,  pct: 1.00, display: "1 rep at 100%" },
];

const DEFAULT_PLATES: Record<Unit, PlateEntry[]> = {
  lbs: [
    { weight: 55,  count: 0 },
    { weight: 45,  count: 2 },
    { weight: 35,  count: 2 },
    { weight: 25,  count: 2 },
    { weight: 15,  count: 2 },
    { weight: 10,  count: 2 },
    { weight: 5,   count: 2 },
    { weight: 2.5, count: 2 },
  ],
  kg: [
    { weight: 25,   count: 2 },
    { weight: 20,   count: 2 },
    { weight: 15,   count: 2 },
    { weight: 10,   count: 2 },
    { weight: 5,    count: 2 },
    { weight: 2.5,  count: 2 },
    { weight: 1.25, count: 2 },
  ],
};

const BAR_DEFAULTS: Record<Unit, number> = { lbs: 45, kg: 20 };

function getPlateVis(weight: number) {
  const sizes: Array<[number, number, number]> = [
    [50, 152, 41],
    [40, 138, 37],
    [30, 122, 33],
    [19, 104, 28],
    [13, 86,  24],
    [8,  68,  20],
    [3,  50,  15],
    [0,  36,  12],
  ];
  let h = 36, w = 12;
  for (const [thresh, th, tw] of sizes) {
    if (weight >= thresh) { h = th; w = tw; break; }
  }
  let fill = "#111827";
  if      (weight >= 44) fill = "#111827";
  else if (weight >= 34) fill = "#1e3a8a";
  else if (weight >= 24) fill = "#14532d";
  else if (weight >= 13) fill = "#78350f";
  else if (weight >= 8)  fill = "#7f1d1d";
  else if (weight >= 3)  fill = "#4c1d95";
  else                   fill = "#374151";
  return { h, w, fill };
}

function calcPlatesPerSide(target: number, bar: number, avail: PlateEntry[]): PlateEntry[] {
  const need = target - bar;
  if (need <= 0.0001) return [];
  const perSide = need / 2;
  const sorted = avail.filter(p => p.count >= 2).sort((a, b) => b.weight - a.weight);
  let rem = perSide;
  const result: PlateEntry[] = [];
  for (const p of sorted) {
    if (rem < 0.0001) break;
    const maxPerSide = Math.floor(p.count / 2);
    const use = Math.min(maxPerSide, Math.floor(rem / p.weight + 0.0001));
    if (use > 0) {
      result.push({ weight: p.weight, count: use });
      rem = Math.round((rem - use * p.weight) * 10000) / 10000;
    }
  }
  return result;
}

function achievedWeight(target: number, bar: number, avail: PlateEntry[]): number {
  if (target <= bar) return bar;
  const plates = calcPlatesPerSide(target, bar, avail);
  const pw = plates.reduce((s, p) => s + p.weight * p.count, 0) * 2;
  return Math.round((bar + pw) * 10) / 10;
}

function useConfetti() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particles = useRef<ConfettiParticle[]>([]);
  const rafId = useRef(0);
  const running = useRef(false);

  const loop = useCallback(() => {
    const cv = canvasRef.current;
    if (!cv) return;
    const ctx = cv.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, cv.width, cv.height);
    particles.current = particles.current.filter(p => p.y < cv.height + 30);
    for (const p of particles.current) {
      p.x += p.vx; p.y += p.vy; p.vy += 0.09; p.vx *= 0.99; p.rot += p.rotV;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate((p.rot * Math.PI) / 180);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      ctx.restore();
    }
    if (particles.current.length > 0) {
      rafId.current = requestAnimationFrame(loop);
    } else {
      running.current = false;
    }
  }, []);

  const fire = useCallback(() => {
    const cv = canvasRef.current;
    if (!cv) return;
    const colors = ["#60a5fa","#34d399","#fbbf24","#f87171","#a78bfa","#fb923c","#4ade80","#38bdf8","#f472b6"];
    const burst: ConfettiParticle[] = Array.from({ length: 150 }, () => ({
      x: Math.random() * cv.width,
      y: -10,
      vx: (Math.random() - 0.5) * 6,
      vy: Math.random() * 4 + 1.5,
      color: colors[Math.floor(Math.random() * colors.length)],
      w: Math.random() * 12 + 5,
      h: Math.random() * 7 + 4,
      rot: Math.random() * 360,
      rotV: (Math.random() - 0.5) * 14,
    }));
    particles.current = [...particles.current, ...burst];
    if (!running.current) {
      running.current = true;
      rafId.current = requestAnimationFrame(loop);
    }
  }, [loop]);

  useEffect(() => {
    const cv = canvasRef.current;
    if (!cv) return;
    const resize = () => { cv.width = window.innerWidth; cv.height = window.innerHeight; };
    resize();
    window.addEventListener("resize", resize);
    return () => { window.removeEventListener("resize", resize); cancelAnimationFrame(rafId.current); };
  }, []);

  return { canvasRef, fire };
}

function BarbellSVG({
  platesPerSide,
  repLabel,
}: {
  platesPerSide: PlateEntry[];
  repLabel: string | null;
}) {
  const VW = 800;
  const VH = 350;
  const barY = 148;
  const barH = 17;
  const barColor = "#a3adb8";
  const upColor = "#555563";

  const upW = 32;
  const upLeftX = 264;
  const upRightX = 504;
  const upY = barY - barH / 2;

  const benchBaseTop = barY + 176;
  const benchBaseH = 18;
  const benchBaseBottom = benchBaseTop + benchBaseH;
  const upH = benchBaseBottom - upY;

  const stack = platesPerSide.flatMap(p => Array<number>(p.count).fill(p.weight));

  let lCursor = upLeftX - 4;
  const leftPlates = stack.map(w => {
    const vis = getPlateVis(w);
    const x = lCursor - vis.w;
    lCursor = x - 3;
    return { x, vis, weight: w };
  });

  let rCursor = upRightX + upW + 4;
  const rightPlates = stack.map(w => {
    const vis = getPlateVis(w);
    const x = rCursor;
    rCursor = x + vis.w + 3;
    return { x, vis, weight: w };
  });

  return (
    <svg viewBox={`0 0 ${VW} ${VH}`} className="w-full" style={{ maxHeight: 280 }} aria-label="Bench press barbell">
      <rect x={40} y={barY - barH / 2} width={VW - 80} height={barH} rx={barH / 2} fill={barColor} />

      {repLabel && (
        <text
          x={VW / 2}
          y={barY + 5}
          textAnchor="middle"
          fill="rgba(255,255,255,0.92)"
          fontSize={13}
          fontFamily="Outfit, sans-serif"
          fontWeight="700"
          letterSpacing="1"
        >
          {repLabel}
        </text>
      )}

      <rect
        x={upLeftX + upW + 16}
        y={barY + 78}
        width={upRightX - upLeftX - upW - 32}
        height={52}
        rx={24}
        fill="#a3adb8"
      />
      <rect x={VW / 2 - 11} y={barY + 130} width={22} height={48} rx={5} fill={upColor} />
      <rect x={VW / 2 - 88} y={benchBaseTop} width={176} height={benchBaseH} rx={7} fill={upColor} />

      <rect x={upLeftX}  y={upY} width={upW} height={upH} rx={12} fill={upColor} />
      <rect x={upRightX} y={upY} width={upW} height={upH} rx={12} fill={upColor} />

      {leftPlates.map((p, i) => (
        <g key={`lp${i}`}>
          <rect x={p.x} y={barY - p.vis.h / 2} width={p.vis.w} height={p.vis.h} rx={6} fill={p.vis.fill} />
          {p.vis.w >= 18 && (
            <text x={p.x + p.vis.w / 2} y={barY + 5} textAnchor="middle"
              fill="rgba(255,255,255,0.85)" fontSize={p.vis.w >= 28 ? 12 : 10}
              fontFamily="Outfit, sans-serif" fontWeight="700">{p.weight}</text>
          )}
        </g>
      ))}
      {rightPlates.map((p, i) => (
        <g key={`rp${i}`}>
          <rect x={p.x} y={barY - p.vis.h / 2} width={p.vis.w} height={p.vis.h} rx={6} fill={p.vis.fill} />
          {p.vis.w >= 18 && (
            <text x={p.x + p.vis.w / 2} y={barY + 5} textAnchor="middle"
              fill="rgba(255,255,255,0.85)" fontSize={p.vis.w >= 28 ? 12 : 10}
              fontFamily="Outfit, sans-serif" fontWeight="700">{p.weight}</text>
          )}
        </g>
      ))}
    </svg>
  );
}

function PlatesPanel({
  plates, unit, barWeight, onPlates, onBar, onClose,
}: {
  plates: PlateEntry[]; unit: Unit; barWeight: number;
  onPlates: (p: PlateEntry[]) => void; onBar: (w: number) => void; onClose: () => void;
}) {
  const [customVal, setCustomVal] = useState("");

  function bump(i: number, delta: number) {
    onPlates(plates.map((p, j) => j === i ? { ...p, count: Math.max(0, p.count + delta) } : p));
  }

  function addCustom() {
    const w = parseFloat(customVal);
    if (!w || w <= 0 || plates.find(p => p.weight === w)) return;
    onPlates([...plates, { weight: w, count: 2 }].sort((a, b) => b.weight - a.weight));
    setCustomVal("");
  }

  return (
    <div className="fixed inset-0 z-40 flex justify-end" onClick={onClose}>
      <div
        className="relative bg-white h-full overflow-y-auto shadow-2xl"
        style={{ width: "min(340px, 100vw)", borderRadius: "20px 0 0 20px" }}
        onClick={e => e.stopPropagation()}
      >
        <div className="p-7" style={{ paddingTop: 72 }}>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900">What plates do you have?</h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">×</button>
          </div>

          <div className="mb-6">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2">Bar weight ({unit})</p>
            <div className="flex items-center gap-3">
              <button onClick={() => onBar(Math.max(0, barWeight - (unit === "kg" ? 0.5 : 1)))}
                className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-gray-700 hover:bg-gray-200 transition-colors text-xl font-medium">−</button>
              <input type="number" value={barWeight}
                onChange={e => onBar(parseFloat(e.target.value) || 0)}
                className="w-20 bg-gray-100 rounded-xl px-3 py-2 text-center font-bold text-gray-900 outline-none focus:bg-gray-200" />
              <button onClick={() => onBar(barWeight + (unit === "kg" ? 0.5 : 1))}
                className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-gray-700 hover:bg-gray-200 transition-colors text-xl font-medium">+</button>
            </div>
          </div>

          <div className="h-px bg-gray-100 mb-5" />
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-4">Plates (total count)</p>

          <div className="space-y-4">
            {plates.map((p, i) => (
              <div key={p.weight} className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="rounded" style={{ width: 10, height: 28, background: getPlateVis(p.weight).fill }} />
                  <span className="font-semibold text-gray-800">{p.weight} {unit}</span>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => bump(i, -2)}
                    className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-700 hover:bg-gray-200 transition-colors">−</button>
                  <span className="w-6 text-center font-bold text-gray-900">{p.count}</span>
                  <button onClick={() => bump(i, 2)}
                    className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-700 hover:bg-gray-200 transition-colors">+</button>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-7 flex gap-2">
            <input type="number" placeholder={`Custom weight (${unit})`} value={customVal}
              onChange={e => setCustomVal(e.target.value)}
              onKeyDown={e => e.key === "Enter" && addCustom()}
              className="flex-1 bg-gray-100 rounded-xl px-3 py-2.5 text-sm outline-none focus:bg-gray-200" />
            <button onClick={addCustom}
              className="bg-gray-200 hover:bg-gray-300 rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors">Add</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function SetDots({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex gap-2 items-center justify-center">
      {Array.from({ length: total }, (_, i) => (
        <div key={i} style={{ transition: "all 0.25s ease" }}
          className={`rounded-full ${i < current ? "w-2 h-2 bg-white/50" : i === current ? "w-3 h-3 bg-white shadow" : "w-2 h-2 bg-white/20"}`} />
      ))}
    </div>
  );
}

export default function App() {
  const [unit, setUnit] = useState<Unit>("lbs");
  const [maxInput, setMaxInput] = useState("");
  const [confirmedMax, setConfirmedMax] = useState<number | null>(null);
  const [currentSet, setCurrentSet] = useState(0);
  const [plates, setPlates] = useState<PlateEntry[]>(DEFAULT_PLATES.lbs);
  const [barWeight, setBarWeight] = useState<number>(BAR_DEFAULTS.lbs);
  const [showPlates, setShowPlates] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const { canvasRef, fire } = useConfetti();

  const maxWeight = confirmedMax ?? 0;
  const isStarted = confirmedMax !== null && confirmedMax > 0;
  const set = SETS[currentSet];
  const targetWeight = currentSet === 0 ? barWeight : maxWeight * set.pct;
  const platesPerSide = isStarted ? calcPlatesPerSide(targetWeight, barWeight, plates) : [];
  const setWeight = isStarted
    ? (currentSet === 0 ? barWeight : achievedWeight(targetWeight, barWeight, plates))
    : barWeight;

  const repLabel: string | null = isStarted
    ? (set.reps === 1 ? "1 rep" : `${set.reps} reps`)
    : null;

  const isLast = currentSet === SETS.length - 1;

  function confirm() {
    const v = parseFloat(maxInput);
    if (!v || v <= 0) return;
    setConfirmedMax(v);
    setCurrentSet(0);
  }

  function editMax() {
    setConfirmedMax(null);
    setCurrentSet(0);
    setTimeout(() => inputRef.current?.focus(), 50);
  }

  function switchUnit(next: Unit) {
    if (next === unit) return;
    const factor = next === "kg" ? 1 / 2.20462 : 2.20462;
    if (maxInput) setMaxInput(String(Math.round(parseFloat(maxInput) * factor)));
    if (confirmedMax) setConfirmedMax(Math.round(confirmedMax * factor));
    setBarWeight(BAR_DEFAULTS[next]);
    setPlates(DEFAULT_PLATES[next]);
    setUnit(next);
  }

  function goNext() {
    if (currentSet < SETS.length - 1) { fire(); setCurrentSet(s => s + 1); }
  }

  function goPrev() {
    if (currentSet > 0) setCurrentSet(s => s - 1);
  }

  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden"
      style={{ background: "linear-gradient(160deg, #c5e8f8 0%, #a8d8f0 60%, #92c8e8 100%)" }}>

      <canvas ref={canvasRef} className="fixed inset-0 pointer-events-none z-50" />

      <div className="flex justify-end p-5">
        <button onClick={() => setShowPlates(true)}
          className="bg-white/85 backdrop-blur-sm rounded-2xl px-5 py-2.5 font-semibold text-gray-800 shadow-sm hover:bg-white transition-all active:scale-95 text-[15px]">
          Plates
        </button>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center gap-4 px-4 pb-6 -mt-4">

        {!isStarted ? (
          <>
            <p className="text-gray-700 font-medium text-lg text-center">
              What do you want your one rep max to be?
            </p>
            <div className="flex items-center gap-3">
              <div className="flex items-center bg-white/90 backdrop-blur-sm rounded-2xl shadow-sm overflow-hidden" style={{ height: 54 }}>
                <input
                  ref={inputRef}
                  type="number"
                  value={maxInput}
                  onChange={e => setMaxInput(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && confirm()}
                  placeholder={String(barWeight)}
                  autoFocus
                  className="w-28 px-5 text-center text-xl font-bold text-gray-900 bg-transparent outline-none placeholder-gray-300"
                />
                <div className="flex m-1.5 gap-0.5">
                  {(["lbs", "kg"] as Unit[]).map(u => (
                    <button key={u} onClick={() => switchUnit(u)}
                      className={`px-3.5 py-1.5 rounded-xl text-sm font-semibold transition-all ${unit === u ? "bg-gray-200 text-gray-900" : "text-gray-400 hover:text-gray-600"}`}>
                      {u}
                    </button>
                  ))}
                </div>
              </div>
              <button onClick={confirm} disabled={!maxInput || parseFloat(maxInput) <= 0}
                className="h-[54px] px-5 rounded-2xl font-bold text-white transition-all active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed"
                style={{ background: "#1a1a2e", fontSize: 20 }}>
                →
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-gray-900">
                Maxing at {maxWeight} {unit}!
              </h1>
              <button onClick={editMax} title="Change max"
                className="w-7 h-7 rounded-full bg-white/50 hover:bg-white/80 flex items-center justify-center transition-all active:scale-95"
                style={{ fontSize: 14 }}>
                ✎
              </button>
            </div>

            <div className="flex flex-col items-center gap-2 -mt-1">
              <p className="text-gray-700 font-semibold text-[17px]">
                Set {currentSet + 1} of {SETS.length}: {set.display}
              </p>
              <SetDots current={currentSet} total={SETS.length} />
            </div>

            <div className="flex items-center bg-white/90 backdrop-blur-sm rounded-2xl shadow-sm overflow-hidden" style={{ height: 54 }}>
              <div className="w-28 px-5 text-center text-xl font-bold text-gray-900">
                {setWeight % 1 === 0 ? setWeight : setWeight.toFixed(1)}
              </div>
              <div className="flex m-1.5 gap-0.5">
                {(["lbs", "kg"] as Unit[]).map(u => (
                  <button key={u} onClick={() => switchUnit(u)}
                    className={`px-3.5 py-1.5 rounded-xl text-sm font-semibold transition-all ${unit === u ? "bg-gray-200 text-gray-900" : "text-gray-400 hover:text-gray-600"}`}>
                    {u}
                  </button>
                ))}
              </div>
            </div>

            {currentSet > 0 && platesPerSide.length > 0 && (
              <div className="flex flex-wrap gap-2 justify-center max-w-xs">
                {platesPerSide.map((p, i) => (
                  <span key={i} className="text-xs font-bold px-2.5 py-1 rounded-full text-white/90"
                    style={{ background: getPlateVis(p.weight).fill }}>
                    {p.count > 1 ? `${p.count}x` : ""}{p.weight}{unit}
                  </span>
                ))}
                <span className="text-xs text-gray-500/80 self-center">per side</span>
              </div>
            )}
          </>
        )}

        <div className="w-full max-w-2xl px-2 mt-1">
          <BarbellSVG platesPerSide={platesPerSide} repLabel={repLabel} />
        </div>
      </div>

      {isStarted && (
        <div className="flex gap-4 px-5 pb-9 justify-center">
          <button onClick={goPrev} disabled={currentSet === 0}
            className="flex-1 max-w-[180px] py-4 rounded-2xl font-semibold text-gray-700 transition-all active:scale-95 disabled:opacity-35 disabled:cursor-not-allowed"
            style={{ background: "rgba(255,255,255,0.55)", backdropFilter: "blur(8px)", fontSize: 15 }}>
            Previous Set
          </button>
          <button onClick={goNext} disabled={isLast}
            className="flex-1 max-w-[180px] py-4 rounded-2xl font-bold transition-all active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed"
            style={{
              background: isLast ? "rgba(107,114,128,0.25)" : "rgba(20,20,35,0.78)",
              backdropFilter: "blur(8px)",
              color: isLast ? "#6b7280" : "white",
              fontSize: 15,
            }}>
            {isLast ? "Done!" : "Next Set"}
          </button>
        </div>
      )}

      {showPlates && (
        <PlatesPanel plates={plates} unit={unit} barWeight={barWeight}
          onPlates={setPlates} onBar={setBarWeight} onClose={() => setShowPlates(false)} />
      )}
    </div>
  );
}
