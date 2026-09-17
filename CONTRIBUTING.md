# Maintainer and authorized collaborator workflow

HireKarlo is created/maintained by Aman Samani. Unsolicited pull requests, feature contributions and external development changes are currently not accepted. This guide supports the owner and developers explicitly engaged by the owner; it does not change that policy or the existing MIT license.

1. Read README, the project map, current architecture, final CTO evidence and master checklist. Define a concrete defect/customer need before adding features.
2. Create a focused branch (Codex branches use `codex/`); keep existing author credit and unrelated changes. Never overwrite a remote README or force-push to repair routine divergence.
3. Use a dedicated local audit database and private `.env`. Never add credentials, real resumes, traces or customer fixtures to Git. Check ignored files with `git check-ignore` and inspect the staged diff.
4. Validate unknown input on the server, obtain organization from membership context, scope every query, fail closed on unknown roles. Add meaningful negative/concurrency regressions for changed boundaries, rather than tests that only restate implementation.
5. Keep business writes and delivery intent in one transaction where required. Keep external providers outside critical recruiting reservations; reason about lease expiry/retries and at-least-once effects.
6. Add migrations, never edit applied history. Rehearse on isolated/staging DB and check drift. Record backup/rollback implications and configure release ordering before changing live data.
7. Run appropriate lint/types/unit/integration/build/browser checks and update docs/evidence. Record unexecuted provider/live checks as unverified, not passed.
8. Review changed/added files, secrets/dependency advisories and CI result; get the owner's release decision with concrete evidence. Publishing, charging customers and provider purchases are separate decisions.

For suspected security problems use **amanworkinfo@gmail.com** privately with synthetic reproductions. Support/problem reports must omit `.env`, tokens, private provider bodies and real candidate data.
