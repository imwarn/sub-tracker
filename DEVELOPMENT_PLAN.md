# Sub-Tracker Development Plan

This plan turns the first project review into a practical improvement path. The goal is to keep the project simple enough for personal deployment while making the open-source release safer, easier to maintain, and easier to verify.

## Current Assessment

Sub-Tracker already has a clear product shape: a single Cloudflare Worker that manages eSIM renewal dates, subscriptions, balance tracking, exports, and Telegram reminders. The main gaps are release reliability, validation, security hardening, duplicated constants, and missing tests.

## P0 - Release And Open-Source Hygiene

Status: complete. These items should stay complete before each public release.

- Keep `src/` and `worker/worker.js` synchronized by running `npm run build`.
- Use Node.js 22 or newer everywhere, including local development and GitHub Actions.
- Ignore local secret files such as `.env`.
- Provide a real `LICENSE` file for the MIT license.
- Run build and tests in CI before deploy.
- Keep dependency audit clean or document any accepted residual risk.

Acceptance:

- `npm run build` succeeds.
- `npm test` succeeds.
- `git diff --exit-code worker/worker.js` is clean after build.
- GitHub Actions uses Node.js 22 or newer.

## P1 - Security And Data Correctness

Status: complete. These items protect user secrets and stored data.

- Use cryptographically secure random numbers for OTP generation.
- Add a cooldown to OTP sending to reduce Telegram spam and brute-force pressure.
- Revoke the server-side session token on logout.
- Use UUIDs for item IDs instead of timestamps.
- Validate create, update, and import payloads with the same schema rules.
- Normalize `remindDays` to arrays.
- Recalculate balance suspend dates whenever balance-related fields change.
- Prevent negative balances from producing past suspend dates.
- Escape Telegram HTML fields before sending notifications.
- Add API no-cache and basic security headers.

Acceptance:

- Invalid update/import payloads are rejected or skipped with an error summary.
- Balance items always have a predicted suspend date when monthly fee and billing day are valid.
- Logout removes the KV session token.
- OTP generation no longer uses `Math.random()`.

## P2 - Maintainability

Status: complete for the current codebase. These items reduce future drift as the feature set grows.

- Move shared constants such as currencies and reminder defaults into one module.
- Generate frontend country/currency maps from backend sources.
- Add tests for date math, schema validation, rendered template script validity, and map synchronization.
- Keep the one-Worker deployment model, but split the large frontend template into smaller modules when the next UI feature lands.

Acceptance:

- Country maps in the rendered frontend match `src/utils/country.js`.
- Currency symbols are maintained from one source.
- Tests cover the known edge cases from the first review.

## P3 - Future Product Work

These items can be implemented after the quality baseline is stable.

- [x] Add multi-channel notifications: Bark, WeCom, and generic Webhook.
- [x] Add richer cost analytics by category, year, and currency.
- [x] Add PWA manifest and offline caching.
- [x] Add activity history for renewals, balance corrections, and imports.
- [ ] Consider Durable Objects or per-item KV keys if concurrent writes become a real use case.

The remaining Durable Objects/per-item KV item is intentionally conditional. The current single-key KV model is still appropriate for a personal dashboard; revisit it only if concurrent writes become a real usage pattern.
