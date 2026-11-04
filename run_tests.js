#!/usr/bin/env node
// OV(T) calculator — regression + invariant tests.
// Usage: node run_tests.js <path-to-calculator.html> [--generate]
// --generate : (re)write golden_v5.json from the CURRENT code. Golden = frozen behaviour,
// NOT proof of correctness. Correctness evidence comes from the invariants,
// the independent cross-check, and the mutation check below.
const fs = require("fs"),
  path = require("path"),
  crypto = require("crypto");

const args = process.argv.slice(2);
const htmlPath = args.find((a) => !a.startsWith("--"));
if (!htmlPath) {
  console.error("Pass the calculator HTML path as the first argument.");
  process.exit(2);
}
const GENERATE = args.includes("--generate");
const goldenPath = path.join(__dirname, "golden_v5.json");
const TOL = 1e-9;

// ---------- load the REAL core from the HTML (no re-implementation) ----------
const src = fs.readFileSync(htmlPath, "utf8");
const start = src.indexOf("const YEARS_REMAINING");
const end = src.indexOf("// ---- RED-TEAM DIAGNOSTIC");
if (start < 0 || end < 0 || end < start)
  throw new Error("Cannot locate core block in HTML");
const sr = src.match(/function scenarioResult\([^)]*\)\{[\s\S]*?\n\}/);
if (!sr) throw new Error("scenarioResult not found");
const coreSrc = src.slice(start, end) + "\n" + sr[0];
if (/document\.|window\.|els\./.test(coreSrc))
  throw new Error("DOM reference leaked into core block");
const core = new Function(
  coreSrc +
    "\nreturn {decide,scenarioResult,Vfuel_physics,Cavoided,Creprocessing,pTech,successBranchPayoff,TMAX,VERDICTS,verdictPairCode,describeVerdictPair,pInversionWarning,pathwaysIdentical,REGISTRY,ORIGINS,QUALITIES,findFlip};"
)();
const sha = (s) =>
  crypto.createHash("sha256").update(s).digest("hex").slice(0, 16);

// ---------- read slider defaults/ranges from the markup ----------
const inputs = {};
for (const m of src.matchAll(/<input\b[^>]*>/g)) {
  const tag = m[0];
  const id = (tag.match(/\bid="([^"]+)"/) || [])[1];
  if (!id || !/type="range"/.test(tag)) continue;
  const g = (a) => {
    const x = tag.match(new RegExp("\\b" + a + '="([^"]*)"'));
    return x ? parseFloat(x[1]) : undefined;
  };
  inputs[id] = {
    min: g("min"),
    max: g("max"),
    step: g("step") || 1,
    value: g("value"),
  };
}
const IDS = [
  "r",
  "Ctot",
  "S0",
  "tunnels",
  "Cstor",
  "Crep",
  "delta",
  "Vfuel",
  "fPu",
  "halfLife",
  "k",
  "p0",
  "pmax",
  "t0tech",
];
for (const id of IDS)
  if (!inputs[id]) throw new Error("slider missing in HTML: " + id);
const toParams = (u) => ({
  r: u.r / 100,
  Ctot: u.Ctot,
  S0: u.S0,
  tunnelsDone0: u.tunnels,
  Cstor: u.Cstor / 1000,
  Crep0: u.Crep,
  delta: u.delta / 100,
  Vfuel0: u.Vfuel,
  fPu: u.fPu / 100,
  halfLife: u.halfLife,
  k: u.k,
  p0: u.p0 / 100,
  pmax: u.pmax / 100,
  t0tech: u.t0tech,
});
const DEFAULT_UI = Object.fromEntries(IDS.map((id) => [id, inputs[id].value]));
const P0 = toParams(DEFAULT_UI);

let failures = 0;
const fail = (name, detail) => {
  failures++;
  console.log(" FAIL " + name + (detail ? " " + detail : ""));
};
const ok = (name, detail) =>
  console.log(" ok " + name + (detail ? " " + detail : ""));
const check = (cond, name, detail) =>
  cond ? ok(name, detail) : fail(name, detail);

console.log(
  "html sha " +
    sha(src) +
    " core sha " +
    sha(coreSrc) +
    " node " +
    process.version
);

// ---------- 0. UI defaults are what we think they are ----------
console.log("\n[0] UI defaults parsed from markup");
const EXPECT_DEFAULTS = {
  r: 8.5,
  Ctot: 3.5,
  S0: 0.9,
  tunnels: 5,
  Cstor: 50,
  Crep: 7,
  delta: 0,
  Vfuel: 2.3,
  fPu: 0,
  halfLife: 14.3,
  k: 0.4,
  p0: 15,
  pmax: 80,
  t0tech: 40,
};
const badDef = IDS.filter(
  (id) => Math.abs(DEFAULT_UI[id] - EXPECT_DEFAULTS[id]) > 1e-12
);
check(
  badDef.length === 0,
  "defaults match documented baseline",
  badDef.map((i) => i + "=" + DEFAULT_UI[i]).join(" ")
);

// ---------- 1. control scenarios + independent cross-check ----------
console.log("\n[1] Control scenarios (real JS core)");
const SCEN = {
  base: { d: "baseline MOX, private 8.5%", o: {} },
  gov_2_5: { d: "government 2.5%", o: { r: 0.025 } },
  political_15: { d: "political 15% (T*=boundary artefact)", o: { r: 0.15 } },
  narrow_wait: {
    d: "narrow waiting zone (t0=6, delta=18%, fPu=20%)",
    o: { t0tech: 6, delta: 0.18, fPu: 0.2 },
  },
  narrow_wait_ads: {
    d: "same, ADS pathway (k=0)",
    o: { t0tech: 6, delta: 0.18, fPu: 0.2, k: 0 },
  },
  act_now: {
    d: "red-team: mult=0.01, delta=25% -> ACT NOW",
    o: { Crep0: 0.01 * P0.Ctot, delta: 0.25 },
  },
  p_inverted: {
    d: "p0>pmax inversion (UI warning case)",
    o: { p0: 0.6, pmax: 0.4 },
  },
  fast_tech: {
    d: "fast tech (p 10->95%, t0=3, delta=20%)",
    o: { p0: 0.1, pmax: 0.95, t0tech: 3, delta: 0.2 },
  },
};
// Values obtained EARLIER from an independent Python re-implementation (4 decimals).
const INDEPENDENT = {
  base: { T: 0, OV: -0.3521, v: "DISPOSE" },
  political_15: { T: 94, OV: -0.3333, v: "DISPOSE" },
  narrow_wait: { T: 9, OV: 0.7337, v: "PRESERVE" },
  act_now: { T: 0, OV: 0.7476, v: "ACT_NOW" },
  p_inverted: { T: 94, OV: -0.5888, v: "DISPOSE" },
};
const golden = { meta: {}, scenarios: {}, grids: {}, thresholds: {} };
for (const [id, s] of Object.entries(SCEN)) {
  const P = { ...P0, ...s.o };
  const r = core.decide(P);
  golden.scenarios[id] = {
    description: s.d,
    params: P,
    bestT: r.bestT,
    bestOV: r.bestOV,
    verdict: r.verdict,
    ov0: r.ov0,
    curve: r.curve,
  };
  const ind = INDEPENDENT[id];
  if (ind)
    check(
      r.bestT === ind.T &&
        Math.abs(r.bestOV - ind.OV) < 6e-5 &&
        r.verdict === ind.v,
      id.padEnd(16) + " = independent Python",
      "T*=" + r.bestT + " OV=" + r.bestOV.toFixed(4) + " " + r.verdict
    );
  else
    ok(
      id.padEnd(16) + " recorded",
      "T*=" + r.bestT + " OV=" + r.bestOV.toFixed(4) + " " + r.verdict
    );
}

// ---------- 2. thresholds (distance-to-flip) ----------
console.log("\n[2] Verdict thresholds");
const bisect = (f, lo, hi) => {
  const sgn = f(lo) > 0;
  for (let i = 0; i < 70; i++) {
    const m = (lo + hi) / 2;
    f(m) > 0 === sgn ? (lo = m) : (hi = m);
  }
  return (lo + hi) / 2;
};
{
  const vAt = (m) => core.decide({ ...P0, Crep0: m * P0.Ctot, delta: 0.25 });
  const path = [];
  let prev = vAt(0.01).verdict;
  for (let m = 0.02; m <= 4.0001; m += 0.01) {
    const v = vAt(m).verdict;
    if (v !== prev) {
      let a = m - 0.01,
        b = m;
      for (let i = 0; i < 50; i++) {
        const c = (a + b) / 2;
        vAt(c).verdict === prev ? (a = c) : (b = c);
      }
      path.push({ at: +((a + b) / 2).toFixed(4), from: prev, to: v });
      prev = v;
    }
  }
  const zero = path.find((p) => p.to === "DISPOSE");
  golden.thresholds.mult_path_delta25 = { value: zero ? zero.at : null, path };
  check(
    vAt(0.01).bestOV > 0 && vAt(4.0).bestOV <= 0 && !!zero,
    "verdict path along C_reprocess/C_disposal (delta=25%)",
    vAt(0.01).verdict +
      " " +
      path.map((p) => "-> " + p.to + " @" + p.at + "x").join(" ")
  );
}
{
  const f = (d) => core.decide({ ...P0, t0tech: 6, fPu: 0.2, delta: d }).bestOV;
  const d = bisect(f, 0.0, 0.18);
  const below = core.decide({ ...P0, t0tech: 6, fPu: 0.2, delta: d - 1e-4 }),
    above = core.decide({ ...P0, t0tech: 6, fPu: 0.2, delta: d + 1e-4 });
  golden.thresholds.delta_at_t0_6 = {
    value: d,
    below: below.verdict,
    above: above.verdict,
    T_below: below.bestT,
    T_above: above.bestT,
  };
  check(
    f(0) < 0 && f(0.18) > 0,
    "annual cost decline delta flips DISPOSE -> wait at (t0=6, fPu=20%)",
    "delta*=" +
      (d * 100).toFixed(2) +
      "%/yr below->" +
      below.verdict +
      " above->" +
      above.verdict +
      "(T*=" +
      above.bestT +
      ")"
  );
}

// ---------- 3. Two-Clocks grids on the real scenarioResult ----------
console.log("\n[3] Two-Clocks grids (30x30 = 900 cells)");
function grid(P, moxK) {
  const T = [],
    V = [],
    D = [];
  for (let y = 1; y <= 30; y++) {
    const a = [],
      b = [],
      c = [];
    for (let x = 1; x <= 30; x++) {
      const m = core.scenarioResult(P, y, x, moxK),
        ad = core.scenarioResult(P, y, x, 0);
      a.push(ad.bestT - m.bestT);
      b.push(ad.bestOV - m.bestOV);
      c.push((ad.preserve ? 1 : 0) - (m.preserve ? 1 : 0));
    }
    T.push(a);
    V.push(b);
    D.push(c);
  }
  return { T, V, D };
}
const stats = (g) => {
  let nt = 0,
    nd = 0,
    nv = 0,
    mx = -Infinity,
    mn = Infinity;
  for (const j in g.T)
    for (const i in g.T[j]) {
      if (g.T[j][i] !== 0) nt++;
      if (g.D[j][i] !== 0) nd++;
      if (Math.abs(g.V[j][i]) > 1e-12) nv++;
      mx = Math.max(mx, g.V[j][i]);
      mn = Math.min(mn, g.V[j][i]);
    }
  return {
    nonzeroT: nt,
    nonzeroVerdict: nd,
    nonzeroValue: nv,
    maxDeltaOV: mx,
    minDeltaOV: mn,
  };
};
{
  const g0 = grid(P0, P0.k),
    s0 = stats(g0);
  check(
    s0.nonzeroT === 0 && s0.nonzeroVerdict === 0 && s0.nonzeroValue === 0,
    "fPu=0: MOX and ADS identical in all 900 cells",
    JSON.stringify(s0)
  );
  const P1 = { ...P0, fPu: 0.5, delta: 0.18 },
    g1 = grid(P1, P1.k),
    s1 = stats(g1);
  check(
    s1.minDeltaOV >= -1e-12,
    "ADS never worse than MOX in any cell (no hidden bonus, no penalty)",
    "min dOV=" + s1.minDeltaOV.toExponential(2)
  );
  check(
    s1.nonzeroT === 49 &&
      s1.nonzeroVerdict === 91 &&
      Math.abs(s1.maxDeltaOV - 0.0436) < 5e-5,
    "fPu=50%, delta=18%: matches the earlier independent audit (49 / 91 / 0.0436)",
    JSON.stringify({ ...s1, maxDeltaOV: +s1.maxDeltaOV.toFixed(4) })
  );
  golden.grids.fPu50_delta18 = {
    stats: s1,
    T: g1.T,
    D: g1.D,
    V: g1.V.map((r) => r.map((v) => +v.toFixed(9))),
  };
  golden.grids.fPu0 = { stats: s0 };
}

// ---------- 4. invariants over the UI's own parameter box ----------
console.log("\n[4] Invariants");
let seed = 20261029;
const rng = () => {
  seed |= 0;
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const drawUI = () => {
  const u = {};
  for (const id of IDS) {
    const s = inputs[id];
    const n = Math.floor((s.max - s.min) / s.step + 1e-9);
    u[id] = +(s.min + s.step * Math.floor(rng() * (n + 1))).toFixed(6);
  }
  return u;
};
const verdictOf = (T, ov) =>
  ov <= 0 ? "DISPOSE" : T > 0 ? "PRESERVE" : "ACT_NOW";
const bad = {};
const first = {};
const flag = (k, ex) => {
  bad[k] = (bad[k] || 0) + 1;
  if (!first[k]) first[k] = ex;
};
const NF = 20000;
for (let n = 0; n < NF; n++) {
  const P = toParams(drawUI()),
    Q = toParams(drawUI());
  const r = core.decide(P);
  if (
    !Number.isFinite(r.bestOV) ||
    r.curve.some((v) => !Number.isFinite(v)) ||
    !Number.isInteger(r.bestT) ||
    r.bestT < 0 ||
    r.bestT > core.TMAX
  )
    flag("finite", P);
  if (
    r.verdict !== verdictOf(r.bestT, r.bestOV) ||
    r.preserve !== (r.verdict === "PRESERVE")
  )
    flag("verdict rule", P);
  if (
    r.bestOV !== Math.max(...r.curve) ||
    r.curve.indexOf(r.bestOV) !== r.bestT ||
    r.ov0 !== r.curve[0]
  )
    flag("argmax/ov0", P);
  // ADS dominance
  if (core.decide({ ...P, k: 0 }).bestOV < r.bestOV - TOL)
    flag("ADS >= MOX", P);
  // monotone directions (pointwise in T, hence for the max)
  if (
    core.decide({ ...P, Cstor: P.Cstor * 1.5 + 0.001 }).bestOV >
    r.bestOV + TOL
  )
    flag("storage cost up => OV not up", P);
  if (
    core.decide({ ...P, Crep0: P.Crep0 * 1.3 + 0.01 }).bestOV >
    r.bestOV + TOL
  )
    flag("reprocess cost up => OV not up", P);
  if (core.decide({ ...P, Vfuel0: P.Vfuel0 * 1.3 }).bestOV < r.bestOV - TOL)
    flag("fuel value up => OV not down", P);
  // success-branch symmetry: with p(T)=0 NOTHING that lives in the success branch may move the curve
  const Z = { ...P, p0: 0, pmax: 0 },
    Z2 = {
      ...Z,
      Ctot: Q.Ctot,
      S0: Q.S0,
      tunnelsDone0: Q.tunnelsDone0,
      Crep0: Q.Crep0,
      delta: Q.delta,
      Vfuel0: Q.Vfuel0,
      fPu: Q.fPu,
      halfLife: Q.halfLife,
      k: Q.k,
    };
  const a = core.decide(Z).curve,
    b = core.decide(Z2).curve;
  if (a.some((v, i) => Math.abs(v - b[i]) > TOL)) flag("p=0 symmetry", P);
  // p=1: curve is exactly discounted payoff minus PV storage
  const O = { ...P, p0: 1, pmax: 1 },
    co = core.decide(O).curve;
  let cum = 0;
  for (let t = 0; t <= core.TMAX; t++) {
    if (t > 0) cum += O.Cstor / Math.pow(1 + O.r, t);
    if (
      Math.abs(
        co[t] - (core.successBranchPayoff(t, O) / Math.pow(1 + O.r, t) - cum)
      ) > TOL
    ) {
      flag("p=1 identity", P);
      break;
    }
  }
  // storage-free: curve is exactly p * payoff / (1+r)^T
  const S = { ...P, Cstor: 0 },
    cs = core.decide(S).curve;
  for (let t = 0; t <= core.TMAX; t += 7)
    if (
      Math.abs(
        cs[t] -
          (core.pTech(t, S.p0, S.pmax, S.t0tech) *
            core.successBranchPayoff(t, S)) /
            Math.pow(1 + S.r, t)
      ) > TOL
    ) {
      flag("Cstor=0 identity", P);
      break;
    }
  // avoidable disposal cost never grows with time and stays in [0, C_disposal]
  let prev = Infinity;
  for (let t = 0; t <= core.TMAX; t += 3) {
    const c = core.Cavoided(t, P.Ctot, P.S0, P.tunnelsDone0);
    if (c > prev + TOL || c < -TOL || c > P.Ctot + TOL) {
      flag("C_avoided bounds/monotone", P);
      break;
    }
    prev = c;
  }
}
for (const k of [
  "finite",
  "verdict rule",
  "argmax/ov0",
  "ADS >= MOX",
  "storage cost up => OV not up",
  "reprocess cost up => OV not up",
  "fuel value up => OV not down",
  "p=0 symmetry",
  "p=1 identity",
  "Cstor=0 identity",
  "C_avoided bounds/monotone",
])
  check(
    !bad[k],
    k.padEnd(34) + NF + " random draws within slider ranges",
    bad[k] ? bad[k] + " violations, e.g. " + JSON.stringify(first[k]) : ""
  );

// C_reprocess is an independent input: C_disposal must not enter the reprocessing cost
{
  let badd = 0;
  check(
    core.Creprocessing(10, 7, 0.05) === 7 * Math.pow(0.95, 10),
    "Creprocessing(T, Crep0, delta) = Crep0*(1-delta)^T"
  );
  for (let n = 0; n < 5000; n++) {
    const P = toParams(drawUI()),
      Q = toParams(drawUI());
    for (const t of [0, 13, 60]) {
      const rep = (X) =>
        core.Vfuel_physics(t, X.Vfuel0, X.fPu, X.halfLife, X.k).totalValue +
        core.Cavoided(t, X.Ctot, X.S0, X.tunnelsDone0) -
        core.successBranchPayoff(t, X);
      const P2 = { ...P, Ctot: Q.Ctot };
      if (Math.abs(rep(P) - rep(P2)) > TOL) badd++;
    }
  }
  check(badd === 0, "changing C_disposal leaves C_reprocess(T) unchanged", badd + " violations in 15000 checks");
}

// all 2^14 corners of the slider box
{
  let n = 0,
    badc = 0;
  for (let mask = 0; mask < 1 << IDS.length; mask++) {
    const u = {};
    IDS.forEach(
      (id, i) => (u[id] = (mask >> i) & 1 ? inputs[id].max : inputs[id].min)
    );
    const r = core.decide(toParams(u));
    n++;
    if (
      !Number.isFinite(r.bestOV) ||
      r.verdict !== verdictOf(r.bestT, r.bestOV)
    )
      badc++;
  }
  check(
    badc === 0,
    "all " + n + " corners of the slider box: finite + verdict rule",
    badc ? badc + " bad" : ""
  );
}

// ---------- 5. does the symmetry test have teeth? (mutation check on the OLD, buggy formula) ----------
console.log(
  "\n[5] Mutation check: the p=0 symmetry test must FAIL on the pre-fix formula"
);
{
  let caught = 0,
    tot = 300;
  for (let n = 0; n < tot; n++) {
    const P = toParams(drawUI()),
      Q = toParams(drawUI());
    const buggy = (Pp) => {
      const out = [];
      let cum = 0;
      for (let t = 0; t <= core.TMAX; t++) {
        if (t > 0) cum += Pp.Cstor / Math.pow(1 + Pp.r, t);
        const Vt = core.Vfuel_physics(
          t,
          Pp.Vfuel0,
          Pp.fPu,
          Pp.halfLife,
          Pp.k
        ).totalValue;
        const Cav = core.Cavoided(t, Pp.Ctot, Pp.S0, Pp.tunnelsDone0);
        out.push(
          (core.pTech(t, Pp.p0, Pp.pmax, Pp.t0tech) * Vt + Cav) /
            Math.pow(1 + Pp.r, t) -
            cum
        );
      }
      return out;
    }; // C_avoided OUTSIDE p(T): the original bug
    const Z = { ...P, p0: 0, pmax: 0 },
      Z2 = { ...Z, Ctot: Q.Ctot, S0: Q.S0, tunnelsDone0: Q.tunnelsDone0 };
    const a = buggy(Z),
      b = buggy(Z2);
    if (a.some((v, i) => Math.abs(v - b[i]) > TOL)) caught++;
  }
  check(
    caught > tot * 0.9,
    "old formula violates p=0 symmetry",
    caught + "/" + tot + " draws expose it (current code: 0/" + NF + ")"
  );
}

// ---------- 5b. verdict pairs (Two-Clocks dVERDICT) and p0>pmax warning ----------
console.log("\n[5b] Verdict pairs, labels, warnings");
{
  const V = ["DISPOSE", "ACT_NOW", "PRESERVE"];
  check(JSON.stringify(core.VERDICTS) === JSON.stringify(V), "verdict list is DISPOSE, ACT_NOW, PRESERVE");
  const seen = new Set();
  let bad9 = 0;
  for (const m of V) for (const a of V) {
    const c = core.verdictPairCode(m, a), d = core.describeVerdictPair(c);
    seen.add(c);
    if (d.mox !== m || d.ads !== a || d.same !== (m === a)) bad9++;
  }
  check(seen.size === 9 && bad9 === 0, "all 9 (MOX, ADS) verdict pairs: distinct codes, exact round trip, same-flag correct", bad9 + " bad");
  check(
    core.describeVerdictPair(core.verdictPairCode("DISPOSE", "ACT_NOW")).same === false &&
      core.describeVerdictPair(core.verdictPairCode("ACT_NOW", "PRESERVE")).same === false,
    "DISPOSE vs ACT_NOW is a difference (the old preserve-flag map called it same)"
  );
  let threw = false;
  try { core.verdictPairCode("DISPOSE", "WAIT"); } catch (e) { threw = true; }
  check(threw, "unknown verdict string is rejected");
  const pw = [[0.15, 0.8, false], [0.5, 0.5, false], [0.6, 0.4, true], [0.4, 0.4, false], [0.41, 0.4, true]];
  check(pw.every(([a, b, w]) => core.pInversionWarning(a, b) === w), "p0 > pmax warning logic (equal values: no warning)");
  check(/id="pWarn"/.test(src) && /pInversionWarning\(p\.p0, p\.pmax\)/.test(src) && /p₀ is higher than p_max/.test(src), "p0>pmax warning element, call in render() and text present in html");
  check(/verdictPairCode\(m\.verdict, ares\.verdict\)/.test(src) && !/ares\.preserve\?1:0/.test(src), "dVERDICT grid is built from verdict pairs, not the preserve flag");
  const pl = (src.match(/<label>p\(T\):[\s\S]*?<\/label>/) || [""])[0];
  check(/id="pRangeVal"/.test(src) && !/pRangeVal/.test(pl), "p(T) values sit in their own row under the sliders, not inside the narrow label");
  check(!/\+1 = ADS Preserve/.test(src) && /compares the full verdict of MOX and ADS/.test(src), "dVERDICT caption describes verdict pairs, not the old +1/-1/0 code");
  check(core.pathwaysIdentical(0, 0.4) === "fPu" && core.pathwaysIdentical(0.3, 0) === "k" && core.pathwaysIdentical(0.3, 0.4) === null && core.pathwaysIdentical(0, 0) === "fPu", "pathwaysIdentical: fPu=0 -> fPu, k=0 -> k, otherwise null");
  check(/id="pathNote"/.test(src) && /f_Pu = 0: MOX and ADS are identical by construction/.test(src), "neutral-map note element and text present in html");
  { const gk = grid({ ...P0, fPu: 0.5, delta: 0.18 }, 0), sk = stats(gk);
    check(sk.nonzeroT === 0 && sk.nonzeroVerdict === 0 && sk.nonzeroValue === 0, "the note is true: with MOX k=0 (fPu=50%) MOX and ADS are identical in all 900 cells", JSON.stringify(sk)); }
  // ---- parameter registry
  const reg = core.REGISTRY;
  check(reg.length === 14 && new Set(reg.map((e) => e.id)).size === 14 && IDS.every((id) => reg.some((e) => e.id === id)), "registry has exactly one entry per input slider (14)");
  check(reg.every((e) => core.ORIGINS.includes(e.origin) && core.QUALITIES.includes(e.q)), "registry origin and quality values are from the defined scales");
  check(reg.every((e) => typeof e.why === "string" && e.why.length > 25), "every rating has a written reason");
  check(reg.filter((e) => e.q === "High").every((e) => e.origin === "sourced") && reg.filter((e) => e.origin === "unknown" || e.origin === "illustrative").every((e) => e.q === "Unassessed" || e.q === "Low"), "no High rating without a source; unknown/illustrative inputs are never rated above Low");
  check(reg.every((e) => /^[a-zA-Z0-9]+$/.test(e.key) && P0[e.key] !== undefined), "registry keys exist in the model parameters");
  const eC = reg.find((e) => e.id === "Crep"), fC = core.findFlip(P0, eC, inputs.Crep.min, inputs.Crep.max, inputs.Crep.step);
  check(fC !== null && Math.abs(fC - (2.3 + 2.6 * 0.95)) < 0.02, "leverage: C_reprocess flip found at the analytic 4.77 bn", "got " + (fC && fC.toFixed(3)));
  const eK = reg.find((e) => e.id === "k");
  check(core.findFlip(P0, eK, inputs.k.min, inputs.k.max, inputs.k.step) === null, "leverage: k has no flip at f_Pu=0 (no effect, as the UI note says)");
  check(/id="registryBody"/.test(src) && /renderRegistry\(p\)/.test(src), "registry panel and its render call are in the html");
  const tun = (src.match(/<label>Tunnels[\s\S]*?<\/label>/) || [""])[0];
  check(/Tunnels completed today/.test(tun) && !/sealed/i.test(tun.replace(/backfilled or sealed/g, "")), "tunnel label and info say completed (sealed appears only in the not-the-same-as note)");
}

// ---------- golden: write or compare ----------
golden.meta = {
  generated: new Date().toISOString().slice(0, 10),
  htmlSha: sha(src),
  coreSha: sha(coreSrc),
  node: process.version,
  fuzzSeed: 20261029,
  fuzzDraws: NF,
  note: "Golden = frozen CURRENT behaviour (regression protection). It is not evidence of correctness.",
};
console.log("\n[6] Golden file");
if (GENERATE) {
  fs.writeFileSync(goldenPath, JSON.stringify(golden));
  ok(
    "written " + goldenPath,
    (fs.statSync(goldenPath).size / 1024).toFixed(0) + " KB"
  );
} else if (!fs.existsSync(goldenPath))
  fail("golden file missing", "run with --generate once");
else {
  const g = JSON.parse(fs.readFileSync(goldenPath, "utf8"));
  const diffs = [];
  for (const [id, s] of Object.entries(g.scenarios)) {
    const c = golden.scenarios[id];
    if (!c) {
      diffs.push(id + ": scenario missing");
      continue;
    }
    if (c.bestT !== s.bestT || c.verdict !== s.verdict)
      diffs.push(
        id +
          ": T*/verdict " +
          s.bestT +
          "/" +
          s.verdict +
          " -> " +
          c.bestT +
          "/" +
          c.verdict
      );
    const md = Math.max(...s.curve.map((v, i) => Math.abs(v - c.curve[i])));
    if (md > TOL)
      diffs.push(id + ": curve moved by up to " + md.toExponential(2) + " bn");
  }
  const gc = g.grids.fPu50_delta18,
    cc = golden.grids.fPu50_delta18;
  if (
    JSON.stringify(gc.T) !== JSON.stringify(cc.T) ||
    JSON.stringify(gc.D) !== JSON.stringify(cc.D)
  )
    diffs.push("Two-Clocks timing/verdict maps changed");
  for (const k of Object.keys(g.thresholds))
    if (Math.abs(g.thresholds[k].value - golden.thresholds[k].value) > 1e-6)
      diffs.push(
        "threshold " +
          k +
          " moved " +
          g.thresholds[k].value +
          " -> " +
          golden.thresholds[k].value
      );
  check(
    diffs.length === 0,
    "matches golden (" + g.meta.generated + ", core " + g.meta.coreSha + ")",
    diffs.join(" | ")
  );
}

console.log("\n" + (failures ? failures + " FAILURE(S)" : "ALL CHECKS PASSED"));
process.exit(failures ? 1 : 0);
