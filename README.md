# OV(T) — Option Value of Spent Nuclear Fuel

![tests](https://github.com/alberta777-hub/alberta777-hub.github.io/actions/workflows/tests.yml/badge.svg)

**Live tool:** https://alberta777-hub.github.io/

An interactive decision-support calculator developed from the analysis presented in the article “To Bury or to Recycle? The Economics of an Irreversible Decision.”

The model explores one specific question:

> Is it economically rational to permanently dispose of spent nuclear fuel today — or is it more rational to preserve the option to change course when future reprocessing technologies may become technically and economically viable?

The Finnish Onkalo repository is used as the case-study framework, but this model is not intended to represent the economics of the entire Finnish nuclear fuel cycle.

## This Is Not a Forecast

The calculator does not predict:

- future uranium prices;
- when new technologies will mature;
- future reactor economics;
- future reprocessing costs;
- or which decision will ultimately prove to be “correct.”

Instead, it does something narrower and more transparent:

**It evaluates the economic consequences of explicitly stated assumptions and identifies the conditions under which the decision changes.**

Open the tool, move the sliders, switch pathways, and see how the result changes.

**Live calculator:** https://alberta777-hub.github.io/

## What the Model Calculates

The core object of the model is the option value function:

```
OV(T) = p(T) · [ V_fuel(T) + C_avoided(T) − C_reprocess(T) ] / (1+r)^T  −  PV(C_storage)
```

where `T` is the waiting period, and:

```
C_avoided(T)   = [ C_disposal − S(T) ] × retrieval feasibility(T)
C_reprocess(T) = C_reprocess(0) × (1 − δ)^T
```

`p(T)` is the probability that a viable reprocessing pathway is available after `T` years. It is a logistic curve that starts exactly at `p₀` today (`p(0) = p₀`) and approaches `p_max` in the long run; the inflection year `t₀` sets when it rises fastest.

At the default inputs the verdict is **DISPOSE NOW**. It flips if `C_reprocess` falls below roughly €4.8 bn (about a third below the default €7.0 bn), all else equal. That is a sensitivity to one input, not an economic boundary.

The model is organized into four layers that can be examined independently.

### 1. PHYSICS

What happens to the fuel itself?

The decay of Pu-241 → Am-241 is treated as a change in isotopic composition, rather than as an automatic destruction of the total value of spent nuclear fuel.

A physical change in the material does not necessarily imply a proportional loss of its future economic value. The economic consequences depend on the technology through which that material might eventually be processed.

The current model therefore keeps the physical isotope transition separate from technology-specific economic assumptions.

### 2. TECHNOLOGY

How likely is a viable reprocessing pathway to become available, and how quickly might it mature?

The calculator offers two cases:

- **MOX/PUREX** — today's established reprocessing pathway, with an Am-241 penalty `k` on the Pu-linked share of the fuel value;
- **ADS** — a conceptual accelerator-driven pathway.

The same physical process — accumulation of Am-241 through Pu-241 decay — may have different economic implications depending on the technology used to process the material.

**What “ADS” means in this model.** ADS is the same model with `k = 0`, at the same cost and the same maturity timing as MOX. It has no costs, timing or probability of its own. The two cases therefore differ only through `k` acting on the Pu-linked share of the fuel value (`f_Pu`), and ADS can never be worse than MOX by construction. The comparison measures the value of removing the Am-241 penalty in isolation. It is not a comparison of two technologies.

Importantly, the ADS pathway is not automatically assigned a positive value because of Am-241. In the current model, the PUREX-specific Am-241 penalty is simply removed from the ADS pathway. This means:

> “the specific PUREX-related penalty does not apply here”

— not:

> “Am-241 creates additional value.”

There is currently no sourced quantitative basis in this model for assigning a positive economic effect to Am-241 under ADS.

### 3. ECONOMICS

The economic layer accounts for:

- total lifecycle disposal cost;
- costs already incurred;
- the portion of future disposal costs that can still be avoided;
- storage costs incurred while waiting;
- current reprocessing cost;
- and potential future reductions in reprocessing cost through technological learning.

The model therefore does not treat waiting as free.

Nor does it treat already-spent disposal expenditure as if it were still fully recoverable.

The avoided-disposal component is explicitly tied to the remaining disposal cost and retrieval feasibility. Retrieval feasibility falls as disposal tunnels are completed; “completed” is not the same as loaded, backfilled or sealed.

### 4. DECISION

The model searches for:

```
T* = argmax OV(T)
```

where `T*` is the time at which the option value reaches its maximum.

The decision layer then applies a three-way decision rule.

**DISPOSE NOW**

If `OV(T*) ≤ 0`, then no point in time — including `T = 0` — produces positive economic value.

In other words, there is no economically justified waiting or reprocessing pathway under the stated assumptions.

**PRESERVE OPTION**

If `T* > 0` **and** `OV(T*) > 0`, then waiting until `T*` has positive economic value.

The option should be preserved until that point under the assumptions of the model.

**ACT NOW**

If `T* = 0` **and** `OV(T*) > 0`, then the economically optimal action is to proceed immediately, without waiting for further technological maturation.

This is not the same as disposal.

The three-way rule was introduced as a direct result of red-team testing. The original two-way decision rule incorrectly classified the case `T* = 0` with a positive `OV(T*)` as DISPOSE NOW, even though the model was actually indicating that the reprocessing pathway was economically attractive immediately.

A positive `T*` is therefore not sufficient by itself.

It can simply be the least-negative point on an otherwise unprofitable curve. That is why `OV(T*) > 0` is required for every positive-value branch.

## Red-Team Diagnostic — Two Clocks

The calculator includes a dedicated stress-testing panel designed to examine the interaction between two independent timescales:

- the physical clock — the Pu-241 half-life;
- the technology clock — the timescale of technology maturation.

The diagnostic recalculates both cases (MOX and ADS, where ADS means `k = 0`) for each of the 900 points of the sensitivity map (half-life 1–30 years × `t₀` 1–30 years), holding all other current assumptions constant.

### `ΔT*` — Timing

`T*` with `k = 0` minus `T*` with the MOX penalty, in years.

A value of zero means that removing the penalty changes the option's value but does not change the optimal year.

### `ΔOV*` — Value

`OV(T*)` with `k = 0` minus `OV(T*)` with the MOX penalty, in € bn.

This is the value of removing the Am-241 penalty in isolation, not a comparison of two technologies.

### `ΔVERDICT` — Decision

Each cell compares the full verdict of the two cases: DISPOSE, ACT NOW or PRESERVE. The map is built from the exact pair of verdicts, not from a single flag.

- green — MOX disposes, ADS preserves;
- red — MOX preserves, ADS disposes;
- grey — the same verdict in both cases;
- amber — any other difference (it involves ACT NOW).

A 3×3 table counts the cells for each pair, and hovering over a cell shows its exact pair.

### Reading the maps

- With `f_Pu = 0` (the default) or `k = 0`, MOX and ADS are identical by construction, so every cell is neutral. The page says so. The button “Try an example: f_Pu = 50%, δ = 18%” sets those two sliders to values at which the maps become non-neutral. It is an example, not a recommendation, and a second click restores your own values.
- Above the maps, the page states how much more the ADS pathway could cost to reprocess than MOX before its whole advantage disappears. This is a what-if on one input, not an ADS cost estimate.
- Cells near the verdict boundary are sensitive to small changes in any assumption. Read the maps as a diagnostic of where the answer is fragile, not as a prediction.

The physical Pu-241 reference half-life is 14.3 years.

The diagnostic does not tune parameters to force a difference between the cases. It shows where the current model produces one, which is only where `f_Pu` and `k` are both above zero.

## Parameter Registry

The page contains a collapsible panel, “Parameter registry (provisional v0.3)”, covering all 14 inputs. For each input it separates:

- **origin** — sourced, sourced\* (provisional: exact source still to be verified), scenario, illustrative or unknown;
- **evidence quality** — High, Medium, Low or Unassessed, each with a written reason;
- **leverage** — the nearest value of that one input at which the verdict flips, computed live from the model. It is single-input only; interactions between inputs are not mapped yet.

Only one input is rated High: the Pu-241 half-life (the exact database and version are still to be cited). Several key inputs are rated Low or Unassessed. This is deliberate: the registry exists to show how weak the evidence behind some inputs is.

## Known Limitations

The limitations of the model are deliberately disclosed rather than hidden.

### `f_Pu241`

The share of the initial fuel value linked to Pu-241 is set to 0% by default, because the current model does not have a sufficiently justified sourced value for this parameter.

This is a conservative default, not a research finding.

If a defensible source becomes available, the parameter can be changed.

### `k`

The parameter representing the Am-241 penalty on the Pu-linked portion of fuel value is illustrative, not a measured physical or economic constant.
It applies only to the Pu-linked share of the modeled fuel value, not to the entire `V_fuel(0)`.

### Reprocessing cost

`C_reprocess` is an independent scenario input in € bn (default 7.0), not a forecast of future market prices. Its ratio to `C_disposal` is shown only as a derived read-out. Its evidence quality is rated Low: the default comes from an earlier reading of a remark about plant cost, not from a measured ratio.

The model allows technological learning (`δ`) to reduce this cost over time, but the assumed learning rate is explicitly user-defined.

### Open model questions

These are known and not yet resolved. The numbers will not be changed until they are decided.

1. **ADS has no costs or timing of its own** (see “What ‘ADS’ means in this model”). A real technology comparison would need new inputs, and no sources for them have been found yet.
2. **Possible double penalty in `C_avoided`.** The remaining disposal cost and the retrieval feasibility both fall over the same horizon, so waiting may be penalized twice.
3. **Scope of `C_avoided` versus `C_reprocess`.** `C_avoided` credits all remaining disposal cost as avoided, but reprocessing leaves vitrified waste that also has to be disposed of. This may overstate the value of reprocessing and waiting. It is also unclear what `C_reprocess` covers (plant, fuel fabrication, secondary waste).

### Other limits

- `V_fuel(0)`, `C_storage`, the discount rate `r` and the technology-probability inputs (`p₀`, `p_max`, `t₀`) have not been assessed for evidence quality, and several have no verified source. Treat them as scenarios, not estimates.
- Counting completed disposal tunnels as irreversible biases the result slightly toward DISPOSE.
- Accessibility features (labels, live region for the verdict, keyboard focus, reduced motion) are implemented but have not been tested with a real screen reader.

## Model Revision

The model has already been revised several times after internal inconsistencies were discovered during red-team testing:

1. Avoided disposal cost was credited independently of technology success; it is now inside `p(T)`.
2. The decision layer labelled an economically positive `T = 0` case DISPOSE NOW; it is now ACT NOW.
3. `C_reprocess` was coupled to `C_disposal`, so one slider moved both sides and could flip the sign of its effect; it is now an independent input.
4. The MOX/ADS verdict map compared only a single PRESERVE flag, which mislabelled ACT NOW → PRESERVE cells; it is now built from exact verdict pairs.
5. “Tunnels sealed” was renamed “Tunnels completed”, which is what the underlying figure actually counts.
6. In November 2026 (registry v0.3) the meaning of `p₀` was changed. It was a lower asymptote, so `p(0)` was 0.158 at defaults. Now `p(0) = p₀` exactly. The verdicts of all control scenarios stayed the same, the maximum shift of `OV(T*)` over random inputs was about €0.15 bn, and about 0.4% of random settings changed verdict.
7. The MOX/ADS maps were relabelled to say that ADS means `k = 0`, and the break-even readout was added (see above).

This is important:

The model does not claim to be infallible.

If another logical or mathematical inconsistency is found, the model should be revised again.

That is precisely why the calculator and its assumptions are published openly.

## Tests

The repository contains an automated test suite. Run it with:

```
node run_tests.js index.html
```

(`golden_v6.json` must be in the same folder.) It currently runs 79 checks, including:

- the real JavaScript core against control scenarios and decision thresholds;
- invariants over 20,000 random input sets and all corner cases of the inputs;
- cross-checks against an independent re-implementation of the model (not included in this repository);
- the 900-cell maps, the verdict pairs, the parameter registry and the interface texts;
- mutation checks, where a deliberately wrong formula must make a test fail.

A GitHub Actions workflow runs the suite on every push.

`golden_v6.json` freezes the current behaviour as a regression guard. It protects against accidental changes. It is not evidence that the model is correct.

## Use the Calculator as a Red-Team Tool

Do not try to find a combination of parameters that confirms your expectations.

Try to find one that breaks the model.

Move the sliders.

Change storage costs.

Change the probability and timing of technology maturation.

Switch between MOX/PUREX and ADS.

Push the parameters toward their extremes.

Look for:

- illogical decisions;
- unexpected discontinuities;
- impossible values;
- excessive sensitivity to small parameter changes;
- situations where the physical and economic layers appear to contradict each other;
- or any case in which the decision logic behaves differently from what the underlying mathematics implies.

If you find a bug, that is a more valuable result than if the calculator simply agrees with you.

## Philosophy

This project is not published as a conclusion.

It is published as a testable model.

The question is not:

> “Can this calculator prove that spent nuclear fuel should be preserved?”

The question is:

> “Under what assumptions does the answer change — and can we find where the model itself breaks?”

The goal is not to prove that disposal is wrong.

Nor is it to prove that reprocessing is economically justified.

The goal is to make the assumptions visible, make the logic inspectable, and make the result open to challenge.

*An independent analysis, shared openly to invite scrutiny — not to close the debate.*
