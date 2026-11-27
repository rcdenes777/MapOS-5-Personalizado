# Existing controls and runtime diagnosis — 2026-11-27

**STOP remains in force.** This document assesses existing controls only; it does not authorize relaxed rules or scored inference. Prior evidence and the 18-attempt master / nine-attempt sequential-R1 plans remain unchanged.

## Credential and host security

- ai-jail 3.7.1, read-only native tools and source/venv, private ephemeral runtime filesystems, one persistent candidate workspace, filtered provider egress and one least-privilege synthetic-DB relay provide useful layers. Prior point tests found the raw host auth file, operator checkout and Docker socket hidden and the other synthetic schema denied. They do not prove absence of every host escape; ai-jail shares the host kernel and the publisher does not present it as a hostile-code VM boundary.
- Proxy `--secret` keeps the real value outside the jail, but the usable placeholder is a bearer-like capability scoped to the allowed host. In an offline LocalEnvironment test with only synthetic handles, a nonstandard Codex handle propagated to the terminal and the parent process's provider-handle environment was readable through `/proc`. No real credential was disclosed by this synthetic test. The risk of an extra provider request follows from the substitution design; no indirect paid call was performed.
- Restricting toolsets removed `delegate_task` and denied its tool description, but does not block an agent from invoking a model API through an allowed endpoint and usable handle. This is a capability/financial and methodological boundary, not evidence the real credential was stolen.

## Methodological integrity

A cooperative exploratory benchmark is a possible *proposal*, not a waiver of the original rules: explicitly tell candidates not to run indirect inference, spawn agents or use external assistance; run sequentially in equivalent fresh workspaces/DBs; preserve prompts, output, timestamps, selected tool calls, host-side egress records and provider usage; audit discrepancies; mark a detected violation as invalid and report monitoring blind spots. Such results must be labeled exploratory/cooperative and not described as independently enforced no-delegation. Approval by the owner and supervisor would be needed for any change to the benchmark's enforcement requirements.

`--egress-log` is supported and stores owner-only connection metadata outside the candidate workspace. A synthetic HTTPS probe performed two successful requests over one reused connection and produced one egress event. Therefore its log can corroborate connections and byte counts but cannot count all requests, identify who initiated them, distinguish all indirect inference or prove contractual compliance. `--run-summary` captured the normal synthetic run; its presence is not proof of complete audit under all termination conditions.

## Runtime diagnosis

- `hermes pm status` reads the latest PM receipt, not a venv health verdict. Read-only `hermes pm doctor` exited 0; missing optional tools were reported, not installed.
- Using the exact selected interpreter and installed PM code, host `venv_is_current` was true, no source-completion marker existed and the checkout lock was not held. In the jail, `venv_is_current` was false and the same source lock was read-only. Direct `prepare_launch` in that jail reproduced `an update is still running` even with no held checkout lock. The isolated runtime cannot see the host's per-install dependency facts, while the source checkout is intentionally read-only. This explains the source-update warning; it is not conclusive proof of every `update_paused` race.
- With per-invocation `HERMES_DISABLE_LAZY_INSTALLS=1`, which installed Hermes code identifies as an internal bridge used by its official container and hermetic tests, the same direct `prepare_launch` returned without attempting completion. This is not a user-facing stable option and must not be taken as an approved permanent workaround or proof that dependency states match in the sandbox.
- A no-network CLI diagnostic using this variable avoided the warning but did not yield a final result within a 20-second external timeout. No paid request was possible. The gateway CLI rejected `--run-budget` despite its appearing in CLI help and advised the per-home `agent.run_budget_seconds` config. A separate synthetic run with that setting in private tmpfs also failed to complete before the 20-second external timeout. It therefore did not establish an effective end-to-end run deadline or solve the gateway reliability problem.

## Time and financial controls

- `timeout --signal=TERM --kill-after=5s` around the whole jailed command stopped one synthetic three-second process-tree probe: timeout exited 124, the synthetic child was absent afterward. The run-summary reported `teardown: missing` after the signal, so child cleanup is a point observation, not a verified full-tree guarantee or a substitute for robust monitoring. A 45-minute production setting and all failure modes are not yet qualified.
- Hermes has `--max-turns`, but it is an iteration control, not a dollar ceiling or a restriction on direct endpoint calls. A new iteration cap could also affect benchmark comparability and requires explicit policy approval.
- The catalog lists the community `budget-leash` plugin (not installed or qualified here): its own documentation says it meters *estimated* token spend/tool calls and fails open on hook bugs. It does not establish a provider-side hard spending limit or prevent direct calls outside its middleware. A daily ledger in a disposable private HOME also would not persist across attempts without a separately designed authorized state arrangement. Do not change global plugin/configuration to activate it.
- A provider-side spending limit or isolated prepaid balance is preferable **only if actually available, scoped and verified for each route**; subscription/OAuth quota is not assumed to be a dollar cap. Actual charges must come from the provider, while API-equivalent scenarios and cached/reasoning tokens are reported separately. No budget has been approved and actual cost remains unknown.

## Evidence SHA-256

| Local artifact | SHA-256 |
|---|---|
| `neutral-matrix/host-runtime-diagnostic.log` | `0ac3b6237b231487ece660964274837b03de431a5c123e098cf5784d463d031f` |
| `neutral-matrix/jail-runtime-diagnostic.log` | `f090a25b6605357bf17c143ce3af7d625490c949c9ef4d66a2eabd5943e8a344` |
| `neutral-matrix/prepare-launch-diagnostic.log` | `d904a8da5ad08744900dd9a65a508b391b69a9eade5c6b8f807a670d97d41790` |
| `neutral-matrix/lazy-disabled-cli-diagnostic.stderr` | `df05bb6897d8bfe5881c042a6ebd262d06eeaa112b635fe06fafef91bcec3da5` |
| `neutral-matrix/lazy-disabled-config-budget.jsonl` | `65394df821cfba843ed53aad1c1e1bf57abb096587711907f56d8e50d4a92358` |
| `egress-monitor-https.jsonl` | `f9571473f991d17ab2704e2d061ce1e136fefb82c93200b49e04c9285e25a1c2` |
| `egress-monitor-https-probe.log` | `7de8c267dd52b2563f1eff13e3a2b63f924fe007f8f5fe4bbcd6f5119dc341dd` |
| `timeout-probe-summary.json` | `2fb1b5ac8d920a6423aea45ee69686bfefec0925bd48ff8f6f669ab1afa905d4` |
