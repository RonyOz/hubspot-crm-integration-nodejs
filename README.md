# HubSpot CRM Integration - Node.js

Technical test: Node.js fundamentals (Section 1) + a real HubSpot CRM integration for Contacts and Deals (Section 2), built with a classic layered architecture. All HubSpot calls in this repo are real — no mocks or simulations, per the test requirements.

## Requirements

- Node.js >= 20
- npm
- A HubSpot account (portal) with a Service Key credential (see below)

## Installation

```bash
npm install
```

## Environment Setup

Copy `.env.example` to `.env` and fill in your real values (never commit `.env` — it's gitignored):

| Variable | Description |
|---|---|
| `HUBSPOT_ACCESS_TOKEN` | Bearer token from your Service Key (starts with `pat-na1-...`) |
| `HUBSPOT_PORTAL_ID` | Your HubSpot portal/hub ID |
| `HUBSPOT_PIPELINE_ID` | Deal pipeline internal ID (default: `default`) |
| `HUBSPOT_STAGE_ID` | Deal stage internal ID (default: `appointmentscheduled`) |
| `HUBSPOT_MAX_RETRIES` | Max retry attempts on 429/5xx (default: `3`) |
| `HUBSPOT_RETRY_BASE_DELAY_MS` | Base delay for exponential backoff, in ms (default: `500`) |

Resolve your own pipeline/stage IDs by running `node src/examples/list-pipelines.js` once your token is set.

## Creating the HubSpot Credential (Service Key)

As of this account's migration to HubSpot's Unified Developer Platform, new credentials for in-account API integrations are created as **Service Keys**, not legacy Private Apps (private app *creation* was phased out; existing private apps still work, but new ones use this flow instead). Service Keys use the exact same auth mechanism as private apps: a `pat-...` Bearer token, the same scope names, and the same REST endpoints.

Steps:
1. In your HubSpot account, go to **Development** → **Keys** → **Service keys**.
2. Click **Create service key**, give it a name.
3. Add these scopes:
   - `crm.objects.contacts.read`
   - `crm.objects.contacts.write`
   - `crm.objects.deals.read`
   - `crm.objects.deals.write`
4. Save, open the key's detail page, click **Show** then **Copy** to get the token.
5. Find your Portal ID in the account URL: `https://app.hubspot.com/contacts/{PORTAL_ID}/...`

Portal used for development/testing of this submission: portal ID `52871882`.

## Project Structure

```
src/
  config/         env var loading + validation (fails fast if HUBSPOT_ACCESS_TOKEN is missing)
  clients/        hubSpotClient.js — axios instance: auth header, timeout, retry/backoff interceptor
  repositories/   contactRepository.js, dealRepository.js, associationRepository.js —
                  raw HubSpot endpoint calls, map HubSpot's {id, properties:{...}} shape
                  to flat objects for the service layer
  services/       hubSpotService.js — single entry point every example goes through.
                  Simple single-resource CRUD is a thin delegation to the matching
                  repository (no extra logic); cross-cutting orchestration (idempotent
                  sync, associations) holds real logic here instead
  utils/          validateHubSpotPayload.js, handleHubSpotErrors.js, streams.js —
                  cross-cutting concerns used by client/repositories/services alike
  fundamentals/   Section 1 exercises (callbacks, promises/async-await, CommonJS modules)
  examples/       one executable script per core function, real output to console
data/             seed JSON consumed by the sync examples
test/             unit tests (node:test) for the pure/no-network layer only
```

**Why this structure**: it mirrors a classic controller/service/repository split — `examples/` plays the role of the entry point ("controller"), `services/` holds business orchestration, `repositories/` isolate HubSpot's specific endpoint/payload shape from the rest of the app, and `clients/` is the raw HTTP transport. This groups code by *technical responsibility*, matching the exact function/file names the test spec requires (`hubSpotClient`, `hubSpotService`, `contactRepository`, `dealRepository`), and keeps each layer replaceable without touching the others (e.g. swapping axios for another HTTP library only touches `clients/`).

## Running the Fundamentals (Section 1)

| Command | What it demonstrates |
|---|---|
| `npm run fundamentals:callback` | Async operation via `setTimeout` + callback |
| `npm run fundamentals:async` | Same operation refactored to a Promise, consumed with async/await |
| `npm run fundamentals:modules` | CommonJS `require`/`module.exports` (`utils_module.js` + `main.js`) |
| `npm run fundamentals:streams` | `Readable.from(...)` piped through an uppercase `Transform` to `process.stdout` |

## Running the HubSpot Examples (Section 2)

Scripts without required arguments have an `npm run examples:*` shortcut. Scripts that take an ID as an argument are invoked directly with `node` (avoids the `npm run -- <args>` `--` footgun):

| Command | Function | Notes |
|---|---|---|
| `npm run examples:list-pipelines` | `GET /crm/v3/pipelines/deals` | lists pipeline/stage internal IDs |
| `npm run examples:list-contact-names` | `getHubSpotContactNames` | paginates all contacts, returns full names |
| `npm run examples:list-contacts` | `getHubSpotContacts` | `node src/examples/list-contacts.js [limit]` |
| `npm run examples:create-contact` | `createHubSpotContact` | `node src/examples/create-contact.js [firstname lastname email]` |
| `node src/examples/update-contact.js <contactId> [firstname] [lastname] [email]` | `updateHubSpotContact` | |
| `node src/examples/delete-contact.js <contactId>` | `deleteHubSpotContact` | |
| `npm run examples:list-deals` | `getHubSpotDeals` | `node src/examples/list-deals.js [limit]` |
| `npm run examples:create-deal` | `createHubSpotDeal` | `node src/examples/create-deal.js [dealname amount]` |
| `node src/examples/update-deal.js <dealId> [dealname] [amount]` | `updateHubSpotDeal` | |
| `node src/examples/delete-deal.js <dealId>` | `deleteHubSpotDeal` | |
| `node src/examples/associate-contact-deal.js <contactId> <dealId>` | `associateContactToDeal` | safe to run twice, idempotent |
| `npm run examples:sync-contacts` | `syncContactsWithHubSpot` | upserts `data/contacts.json` by email |
| `npm run examples:sync-deals` | `syncDealsWithHubSpot` | upserts `data/deals.json` by dealname |

## Seed Data

`data/contacts.json` and `data/deals.json` hold small local datasets consumed by the sync examples. Deal records intentionally omit `pipeline`/`dealstage` — those default from `HUBSPOT_PIPELINE_ID`/`HUBSPOT_STAGE_ID` in `.env`, per-record override is supported if present in the JSON.

## Running Tests

```bash
npm test
```

Covers only the pure, no-network layer: `validateHubSpotPayload`, `handleHubSpotErrors` (backoff math and error classification on plain objects — never touches axios/the network), `sumArray`, and the `streams.js` transform. Repositories/services/client are intentionally **not** unit tested: the test spec forbids mocking HubSpot calls, and exercising them "for real" on every `npm test` run would mutate the portal on every run. Their correctness is instead verified by manually running the `src/examples/*.js` scripts against a real portal (see below).

## HubSpot Endpoints Used

- Contacts: https://developers.hubspot.com/docs/api/crm/contacts
- Deals: https://developers.hubspot.com/docs/api/crm/deals
- Associations: https://developers.hubspot.com/docs/api/crm/associations
- Pipelines: https://developers.hubspot.com/docs/api/crm/pipelines
- Search: https://developers.hubspot.com/docs/api/crm/search

## Technical Decisions

- **Layered architecture** (examples → services → repositories → client), **uniformly enforced**: every example goes through `hubSpotService`, never straight to a repository — even for plain CRUD with no extra logic, where the service method is a one-line delegation. This was a deliberate correction: an earlier version let examples call repositories directly "since there's nothing to add," which technically works but breaks the layer's contract and makes the codebase inconsistent (some paths go through service, some don't, with no rule to predict which). Uniform routing means any future cross-cutting concern (audit logging, caching, per-call permission checks) has exactly one place to land, and every caller follows the same rule.
- **axios over `@hubspot/api-client`**: the SDK bakes in its own error handling/retries, which would hide the hand-written retry/backoff/error-normalization logic that this test evaluates. axios + a custom interceptor keeps that logic visible and inspectable.
- **CommonJS over TypeScript**: the spec explicitly requires `require`/`module.exports` and evaluates CommonJS understanding directly (Section 1.3); adding a TypeScript build step would work against that and add setup friction with no evaluated benefit.
- **`pipeline`/`dealstage` instead of the spec's `hs_pipeline`/`hs_stage`**: those two property names don't exist on HubSpot deals. The real, current property names — confirmed against official HubSpot docs — are `pipeline` and `dealstage`. Used the real names everywhere so the calls actually work against the live API, since "appropriate real HubSpot API calls" is an explicit evaluation criterion.
- **Associations API, dated version `2026-09`**: HubSpot's associations endpoints moved from `v3`/`v4` to date-based versioning. The specific endpoint used, `PUT /crm/objects/{version}/{fromType}/{fromId}/associations/default/{toType}/{toId}`, is documented by HubSpot as idempotent by design — calling it repeatedly does not duplicate the association (verified live: see Known Limitations/Findings). No client-side "does this association already exist" check was added, since it would just be an extra round-trip for a guarantee the endpoint already provides.
- **Retry/backoff**: retries on `429`, `500`, `502`, `503`, `504`, and network-level codes (`ECONNABORTED`, `ETIMEDOUT`, `ECONNRESET`, `ENOTFOUND`); does **not** retry `400/401/403/404/409` since retrying a client/validation/auth error won't change the outcome. Backoff is exponential (`baseDelay * 2^(attempt-1)` + random jitter up to one `baseDelay` unit), capped at `HUBSPOT_MAX_RETRIES` attempts; a `Retry-After` header on a `429` response overrides the computed delay. Errors are logged with the `Authorization` header redacted, never the raw token.
- **Idempotent sync strategy**: `syncContactsWithHubSpot`/`syncDealsWithHubSpot` use `email`/`dealname` as natural keys, look up the existing record via HubSpot's search endpoint, then create or update accordingly. Records are processed **sequentially** (not in parallel) to avoid bursting rate limits and so that duplicate keys within the same batch resolve correctly against each other. A single bad record is caught, logged, and recorded as `failed` in the returned summary — it does not abort the rest of the batch.

## Known Limitations / Findings

- **HubSpot Search API eventual consistency**: during live verification, running `syncDealsWithHubSpot` twice in immediate succession occasionally created a duplicate deal instead of updating, because the search index HubSpot uses for `findDealByName` had not yet reflected the deal created moments earlier by the first run. This is HubSpot-side indexing latency, not a defect in the sync logic — the same search-then-upsert logic correctly updated on subsequent runs once the index caught up (confirmed live for contacts, which did not exhibit the delay in testing). Running syncs back-to-back with a few seconds' gap avoids this; a production system with tighter guarantees would need its own record of "which HubSpot ID does this local record map to" instead of relying on search-immediately-after-write.
- No bulk/batch HubSpot endpoints are used (e.g. `/crm/v3/objects/deals/batch/*`) — each sync record is a separate PATCH/POST call, which is simpler to reason about at this scale (a handful of seed records) but would not scale efficiently to large datasets.
