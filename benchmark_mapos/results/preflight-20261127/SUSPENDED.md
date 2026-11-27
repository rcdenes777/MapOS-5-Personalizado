# Benchmark qualification — suspended checkpoint

**Decision:** The owner suspended qualification at the current checkpoint. No scored attempt is authorized or has been started. Do not continue sandbox/proxy enforcement investigations or runtime workarounds under this decision. Do not remove benchmark resources or change tasks, grader, configurations, plans or existing evidence. Resume only under an explicitly authorized methodology.

## Preserved evidence and plans

- Benchmark definition commit: `56b15360af2afd4089b4daaaad83a5ee7017dbca` on `benchmark-mapos`; this checkpoint and earlier reports are documentation only and do not alter that definition.
- Full plan: local `mapos-benchmark-evidence/plan.json`, 18 unique attempts; SHA-256 `37df58013e84d0019c3d80a17fefab96ec4d6ba1ee0920f75c8252780cc73366`.
- Sequential R1 plan: local `mapos-benchmark-evidence/manual-sequential-r1.json`, nine unique attempts; SHA-256 `6bf09f07221d595ea91f34caaa0abbe1c148fc4b66cd42b19d24535e3a48111f`. R2 remains reserved in the full plan.
- Local evidence root: `mapos-benchmark-evidence/`, including `aijail-evaluation/`; operator checkout: `mapos-benchmark-operator/`; dedicated native toolchain: `mapos-benchmark-tools/`.
- Reports: `STATUS.md`, `NATIVE-TOOLS.md`, `QUALIFICATION-UPDATE.md`, and `EXPLORATORY-OPTIONS.md` in this directory. They include evidence hashes, caveats and diagnostic findings; this suspension does not replace them.
- The dedicated synthetic DB container was running when this checkpoint was recorded. Its data directory is tmpfs: leaving it untouched does **not** imply survival across container restart or host reboot. Synthetic fixtures and import/reset evidence are preserved separately.

## Reusable capabilities

- PHP 8.5.13 with required extensions, Composer 2.10.2 and MySQL client 8.4.11 were exercised through a read-only ai-jail tool mount.
- Native regression previously passed: 2,051 tests, 10,815 assertions, one deprecation and one skip; its difference from the earlier laboratory baseline was reproduced and attributed to runtime user/mount conditions.
- All six executable grader controls behaved as expected on fresh synthetic state. The owner accepted native-toolchain and T01 negative handoff evidence; do not repeat those gates without a material reason.
- Dedicated MySQL synthetic fixtures, restricted candidate/evaluator accounts, cross-schema denial, evaluator reset and an allowed-file T01 negative handoff were demonstrated.
- Private ephemeral tmpfs separation between two sessions was point-tested. The owner authorized private ephemeral writable runtime directories, with the candidate workspace the only persistent writable host mount.
- Three independently prepared T03 report samples matched an independent blinded assessor's detection/false-positive/hypothesis counts; this did not qualify a repair gate without attached candidate patches and execution evidence.
- Model-route probes and neutral jailed sessions remain evidence of what actually ran, not proof of provider-side GPT High reasoning or equivalent long-running authentication.

## Open blockers and limits

1. **Host/credential security:** the real provider credential was kept outside the jail in the tested proxy design, but synthetic tests showed a usable proxy handle could be exposed to terminal processes. ai-jail shares the host kernel; point tests are not a hostile-code VM guarantee.
2. **Methodology:** disabling the `delegate_task` tool does not by itself prevent indirect inference using an available provider handle. Connection logs do not establish a complete count of API requests. A cooperative exploratory methodology was discussed only as a proposal; no change to benchmark requirements was authorized.
3. **Runtime:** the isolated environment reported the selected venv stale despite the host considering it current, and the read-only checkout caused a misleading update-completion failure; `update_paused` and long-run stability remain unresolved. An internal environment switch bypassed one bootstrap step in a direct test but is not a qualified fix.
4. **Financial controls:** provider-side caps, actual billed cost, enforceable indirect-call controls and budget approval remain unverified. One synthetic timeout probe did not establish a complete teardown guarantee.
5. **Remaining qualification:** identical final conditions across all three model routes, previous-attempt isolation in the final adapter, Codex OAuth/account and refresh equivalence, a T03 repair-gate calibration with real candidate patches, and final preflight/budget approval.

No scored inference, task result, acceptance, or cost-per-accepted-task value may be inferred from this checkpoint.
