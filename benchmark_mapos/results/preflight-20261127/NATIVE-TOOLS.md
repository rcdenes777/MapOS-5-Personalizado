# Native Linux toolchain — preflight, 2026-11-27

**Status: PARTIAL — no scored execution authorized.** No production access; no scored attempts. Existing preflight and nine-attempt R1 plan remain in force.

- PHP 8.5.13 plus required extensions, Composer 2.10.2 and MySQL client 8.4.11 run inside ai-jail 3.7.1 using an operator-prepared read-only tool mount. Mount write denied.
- Dedicated MySQL 8.4.11 container, synthetic data and limited separate candidate/evaluator accounts; one loopback port forwarded into the jail. Both PHP mysqli and mysql client connected. Evaluator schema access from candidate was denied (1044), another external endpoint was blocked, and operator checkout and Docker socket were absent. Docker server container is on a dedicated bridge and may have egress; this is not a blanket network-isolation claim.
- Neutral DeepSeek Flash Hermes session with High requested used the tools and synthetic DB and confirmed those paths absent. No raw provider or DB credential appeared in captured output. First launch failed before inference (`update_paused`); checkout lock subsequently tested free and a single retry succeeded. Cause unproven. Actual provider-side High not independently verified.
- One allowed source file from T01 starter was transferred into a fresh T01 evaluator tree, tests unchanged. Independent evaluator DB and unchanged grader returned 3/7, four critical failures, gate false, as expected. Candidate DB remained unchanged. Full database reset procedure and other task handoffs remain to be qualified.
- **Constraint not passed:** `/tmp`, `/run`, `/dev/shm`, and private HOME are writable tmpfs inside the jail. Host HOME identity differs, but this is not literal compliance with 'only the workspace writable'. `--lockdown` made the workspace read-only while `/tmp` and `/dev/shm` stayed writable. Another supported flag combination still left private HOME and `/run` writable. Supervisor/owner decision or a supported compliant configuration is needed; no relaxation assumed.
- Blinded T03 calibration, fresh DB reset, all-model integrated sessions, prior-attempt isolation and disabled delegation, 45-minute operation, Codex OAuth/proxy equivalence, quota, and budget remain open. This jail is not claimed as a VM-grade security boundary. Explicit preflight and budget approval remain required.

## Evidence hashes (SHA-256)

| Local evidence | SHA-256 |
|---|---|
| `tools-manifest.json` | `9b1252395e4da16f83cf281ed2f3c48eede4441e398fb6b517ea271b4fe3e238` |
| `tools-jail-probe.log` | `fee707465f44c06b2b9da31a7ffde7c2ef5909a7cb9397a922d5af3d0d0fcbd3` |
| `db-jail-probe.log` | `93f66ea04351db5ba1bf12d2284ae5c7d92a4e4acb6ae3ddc303631963f57e7b` |
| `neutral-integrated.jsonl` | `afce8543d16960dbac79bd74bf3673d9286eed289b0251d90dda923676d7ecc3` |
| `lockdown-write-probe.log` | `66f85cc641b7a4e2071ecee1c6dc3e991a9b4d4cc08856bb07e9960ffb4e00a5` |
| `writable-path-fs.log` | `4a5b832835c62d5d6fdf2d92fe7fdb7314a02959d04041955edfca5cba1dd80a` |
| `handoff/grade.json` | `e515d377dc75dad75aff4382fb4a78491f1ada1baf172f63dfe9859744712a23` |

Evidence stays outside the candidate workspace. This report does not disclose private rubric details or credentials.
