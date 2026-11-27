# Qualification update — 2026-11-27

**Status: BLOCKED. No scored attempts have started.** The owner revised the writable-path invariant: private ephemeral tmpfs (`/tmp`, `/run`, `/dev/shm`, isolated HOME) is allowed, provided it is not shared across attempts and is discarded at session end; the candidate workspace remains the only persistent writable host-mounted directory. Lockdown is not required. The owner accepted the previously qualified native toolchain and T01 negative handoff; they were not repeated.

## Completed checks

- Two separate ai-jail sessions: a marker written to private `/tmp`, `/dev/shm`, and HOME in session A was absent in session B; the host HOME marker was absent. Direct writing to the root of `/run` failed in session A. This is a point test of tmpfs lifecycle, not proof of every writable path or all possible concurrent-session behavior.
- The evaluator synthetic schema was dropped and recreated **only in the dedicated disposable benchmark container**, then reimported from the pinned schema and synthetic fixture. Counts returned to the original snapshot while the candidate schema was unchanged. Evaluator access worked inside ai-jail and evaluator-to-candidate access was denied (1044). No production database was involved.
- T03 blinded report scoring: three independently prepared anonymized reports and a private expected key. An independent assessor in a separate jail could read the three reports, frozen rubric, and starter source but not the expected key, private executable grader, reference solution or Docker socket. The assessor's detection/false-positive/hypothesis counts matched the key for all three. One example contained an inaccurate explanatory detail identified by the assessor. These controls qualify the sample report-score comparison, **not** the repair gate: no candidate patches or executed repair results were attached. The previous T03 functional positive/negative grader controls remain separate evidence.
- With the terminal-only toolset, `delegate_task` was absent from selected definitions; a `tool_describe` request for it was denied. This does not prove that terminal-launched independent inference is impossible.

## Material blockers

1. **Provider proxy handle accessible to terminal.** An offline, no-network test inside ai-jail used synthetic stand-ins only and exercised Hermes `LocalEnvironment`. The candidate terminal inherited the synthetic `BENCH_CODEX_TOKEN` handle, whereas `DEEPSEEK_API_KEY` was absent from the terminal environment. Separately, that terminal could read a synthetic provider-key name from the parent process's `/proc/<pid>/environ`. No real credential was printed or observed in these tests. The prior proxy test established substitution outside the jail; therefore it is a security inference—not an executed paid call—that access to a usable proxy handle could enable direct provider requests or a separately launched agent, defeating no-subagents and budget accounting. The actual proxy-routing candidate adapter remains unqualified until this capability is prevented or otherwise controlled without weakening the requirement.
2. **Intermittent runtime update fence.** The first neutral Luna session in the integrated all-model matrix failed before inference with `Gateway draining: update_paused` and zero reported tokens. Earlier integrated DeepSeek and assessor sessions did succeed, and a later read-only diagnostic found no marker and no checkout lock held; the exact cause remains unproven. Do not treat one successful retry as reliable 45-minute operation.
3. Same-condition integrated sessions for all three models, end-to-end absence of previous attempts and quota enforcement, Codex OAuth/proxy equivalence, the T03 repair gate on attached patches, and final preflight/budget authorization remain open. Prior short model probes showed requested High, not independently measured provider-side effective GPT reasoning.

## Evidence SHA-256

| Artifact under local `aijail-evaluation/` | SHA-256 |
|---|---|
| `tmpfs-session-separation.log` | `7193e790bba7261c4e819747798a50b44e79504b94e7c410d87b0c29ee8f46fc` |
| `evaluator-reset.log` | `5f83afdf8ae582d9188bbe05354fd1307c72b1bfc95067d3d75b9716532303c7` |
| `evaluator-reset-jail-probe.log` | `709f88cdf6b4e23589e84dbcc40a6782c6b6d1608ecc2520821f9b0f03342bc2` |
| `t03-calibration/assessor.jsonl` | `419e872c15e37b454ce9050ad48fd8f272fba48c4eefeb9402e0af39d7ab84c8` |
| `t03-calibration/assessor-isolation.log` | `fa805f8eceff4f8de716162e159fd3985adddf27785d55da58a987a2da301882` |
| `neutral-matrix/terminal-toolset-probe.log` | `189440dabd54d60be623e8f397256de9e54c85b301246381b2222028959c1f64` |
| `neutral-matrix/delegate-denied-probe.log` | `e601b3bb52856d704f1d43b99b9d04952b6a9c8c5297ffd68dd3e613e7e3d1c0` |
| `neutral-matrix/synthetic-handle-probe-short.log` | `c66317bacd78e6154a04bcfd952f3885c919af4f6d9230baf62b5feeee717bd1` |
| `neutral-matrix/synthetic-proc-handle-probe.log` | `cfb0990422ce2920a6ebad4ae2b97b3d03bf426077a8537783591181a02987bf` |
| `neutral-matrix/luna.jsonl` | `a934e31c23b5a31a9c6227175b997c37772e7dae47624d06742738eb61615dfd` |

The independent assessor's unscored session reported 111,108 input tokens including 68,992 cache-read tokens and 2,198 output tokens; actual billing was not established. The nine-attempt sequential R1 plan and the full 18-attempt plan remain preserved. No budget is approved by this update.
