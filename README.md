OV(T) — Option Value of Spent Nuclear Fuel

Live tool: https://alberta777-hub.github.io/

An interactive decision-support calculator developed from the analysis presented in the article “To Bury or to Recycle? The Economics of an Irreversible Decision.”

The model explores one specific question:

Is it economically rational to permanently dispose of spent nuclear fuel today — or is it more rational to preserve the option to change course when future reprocessing technologies may become technically and economically viable?

The Finnish Onkalo repository is used as the case-study framework, but this model is not intended to represent the economics of the entire Finnish nuclear fuel cycle.
This Is Not a Forecast

The calculator does not predict:

future uranium prices;

when new technologies will mature;

future reactor economics;

future reprocessing costs;

or which decision will ultimately prove to be “correct.”

Instead, it does something narrower and more transparent:

It evaluates the economic consequences of explicitly stated assumptions and identifies the conditions under which the decision changes.

Open the tool, move the sliders, switch pathways, and see how the result changes.

Live calculator: https://alberta777-hub.github.io/
What the Model Calculates

The core object of the model is the option value function:

OV(T) =
[p(T) · (V_fuel(T) + C_avoided(T) − C_reprocess(T))]
/ (1+r)^T
− PV(C_storage)

where T is the waiting period.

The model is organized into four layers that can be examined independently.
1. PHYSICS

What happens to the fuel itself?

The decay of Pu-241 → Am-241 is treated as a change in isotopic composition, rather than as an automatic destruction of the total value of spent nuclear fuel.

A physical change in the material does not necessarily imply a proportional loss of its future economic value. The economic consequences depend on the technology through which that material might eventually be processed.

The current model therefore keeps the physical isotope transition separate from technology-specific economic assumptions.
2. TECHNOLOGY

How likely is a viable reprocessing pathway to become available, and how quickly might it mature?

The calculator allows comparison between two pathways:

MOX/PUREX — today's established reprocessing pathway

ADS — a conceptual accelerator-driven pathway

The same physical process — accumulation of Am-241 through Pu-241 decay — may have different economic implications depending on the technology used to process the material.

Importantly, the ADS pathway is not automatically assigned a positive value because of Am-241.
In the current model, the PUREX-specific Am-241 penalty is simply removed from the ADS pathway. This means:

“the specific PUREX-related penalty does not apply here”

—not:

“Am-241 creates additional value.”

There is currently no sourced quantitative basis in this model for assigning a positive economic effect to Am-241 under ADS.
3. ECONOMICS

The economic layer accounts for:

total lifecycle disposal cost;

costs already incurred;

the portion of future disposal costs that can still be avoided;

storage costs incurred while waiting;

current reprocessing cost;

and potential future reductions in reprocessing cost through technological learning.

The model therefore does not treat waiting as free.

Nor does it treat already-spent disposal expenditure as if it were still fully recoverable.

The avoided-disposal component is explicitly tied to the remaining disposal cost and retrieval feasibility.
4. DECISION

The model searches for:

T* = argmax OV(T)

where T* is the time at which the option value reaches its maximum.

The decision layer then applies a three-way decision rule.

DISPOSE NOW

If:

OV(T*) ≤ 0

then no point in time — including T = 0 — produces positive economic value.

In other words, there is no economically justified waiting or reprocessing pathway under the stated assumptions.
PRESERVE OPTION

If:

T* > 0  AND  OV(T*) > 0

then waiting until T* has positive economic value.

The option should be preserved until that point under the assumptions of the model.

ACT NOW

If:

T* = 0  AND  OV(T*) > 0

then the economically optimal action is to proceed immediately, without waiting for further technological maturation.

This is not the same as disposal.
The three-way rule was introduced as a direct result of red-team testing. The original two-way decision rule incorrectly classified the case T* = 0 with a positive OV(T*) as DISPOSE NOW, even though the model was actually indicating that the reprocessing pathway was economically attractive immediately.

A positive T* is therefore not sufficient by itself.

It can simply be the least-negative point on an otherwise unprofitable curve. That is why OV(T*) > 0 is required for every positive-value branch.
Red-Team Diagnostic — Two Clocks

The calculator includes a dedicated stress-testing panel designed to examine the interaction between two independent timescales:

the physical clock — the Pu-241 half-life;

the technology clock — the timescale of technology maturation.

The diagnostic recalculates both pathways for each point on the sensitivity map while holding all other current assumptions constant.

ΔT* — TIMING

ADS T* − MOX T*

This shows whether the technological pathway changes the optimal timing of the decision.
A value of zero means that the pathway changes the option's value but does not change the optimal year.

ΔOV* — VALUE

ADS OV(T*) − MOX OV(T*)

This shows the economic magnitude of the pathway effect.

ΔVERDICT — DECISION

+1 → ADS Preserve / MOX Dispose
−1 → opposite
 0 → same verdict

This shows whether the pathway changes the final decision itself, rather than merely changing the size of the option value.

The physical Pu-241 reference half-life is 14.3 years.
The diagnostic does not tune parameters to force a difference between pathways. It maps where the current model naturally produces one.
Known Limitations

The limitations of the model are deliberately disclosed rather than hidden.

f_Pu241

The share of the initial fuel value linked to Pu-241 is set to 0% by default, because the current model does not have a sufficiently justified sourced value for this parameter.

This is a conservative default, not a research finding.

If a defensible source becomes available, the parameter can be changed.

k

The parameter representing the Am-241 penalty on the Pu-linked portion of fuel value is illustrative, not a measured physical or economic constant.
It applies only to the Pu-linked share of the modeled fuel value, not to the entire V_fuel(0).

Reprocessing Cost Multiplier

The relative reprocessing-cost multiplier is also a scenario parameter, not a forecast of future market prices.

The model allows technological learning to reduce this cost over time, but the assumed learning rate is explicitly user-defined.

Model Revision

The model has already been revised after internal inconsistencies were discovered during red-team testing.

One revision corrected the treatment of avoided disposal cost, which had previously been credited independently of technology success.
Another corrected the decision layer so that an economically positive T = 0 case is correctly identified as ACT NOW rather than DISPOSE NOW.

This is important:

The model does not claim to be infallible.

If another logical or mathematical inconsistency is found, the model should be revised again.

That is precisely why the calculator and its assumptions are published openly.
Use the Calculator as a Red-Team Tool

Do not try to find a combination of parameters that confirms your expectations.

Try to find one that breaks the model.

Move the sliders.

Change storage costs.

Change the probability and timing of technology maturation.

Switch between MOX/PUREX and ADS.

Push the parameters toward their extremes.

Look for:

illogical decisions;

unexpected discontinuities;

impossible values;

excessive sensitivity to small parameter changes;
situations where the physical and economic layers appear to contradict each other;

or any case in which the decision logic behaves differently from what the underlying mathematics implies.

If you find a bug, that is a more valuable result than if the calculator simply agrees with you.
Philosophy

This project is not published as a conclusion.

It is published as a testable model.

The question is not:

“Can this calculator prove that spent nuclear fuel should be preserved?”

The question is:

“Under what assumptions does the answer change — and can we find where the model itself breaks?”

The goal is not to prove that disposal is wrong.

Nor is it to prove that reprocessing is economically justified.

The goal is to make the assumptions visible, make the logic inspectable, and make the result open to challenge.
An independent analysis, shared openly to invite scrutiny — not to close the debate.
