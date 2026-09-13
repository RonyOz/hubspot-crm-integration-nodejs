# HubSpot CRM Integration - Node.js

Node.js fundamentals (Section 1) + a real HubSpot CRM integration for Contacts and Deals (Section 2). Every HubSpot call in this repo hits a live portal.

## Setup

```bash
npm install
cp .env.example .env   # fill in your values, see below
```

| Variable | Value |
|---|---|
| `HUBSPOT_ACCESS_TOKEN` | Service Key token (`pat-na1-...`) |
| `HUBSPOT_PORTAL_ID` | your portal ID |
| `HUBSPOT_PIPELINE_ID` | deal pipeline internal ID, default `default` |
| `HUBSPOT_STAGE_ID` | deal stage internal ID, default `appointmentscheduled` |
| `HUBSPOT_MAX_RETRIES` | default `3` |
| `HUBSPOT_RETRY_BASE_DELAY_MS` | default `500` |

Get your own pipeline/stage IDs with `node src/examples/list-pipelines.js` after setting the token.

**Credential**: private-app *creation* is being phased out on HubSpot's Unified Developer Platform. Use a **Service Key** instead — same token format, same scopes, same endpoints, just a different place to generate it.

1. Portal → **Development** → **Keys** → **Service keys** → **Create service key**.
2. Scopes: `crm.objects.contacts.read`, `crm.objects.contacts.write`, `crm.objects.deals.read`, `crm.objects.deals.write`.
3. Portal ID is the number in the record URL (`app.hubspot.com/contacts/{PORTAL_ID}/record/...`) — not `hs_object_source_id`, which identifies the integration, not the portal. Cost me one wrong value in an earlier draft; caught it by reading the raw API response instead of trusting the account URL.
4. `npm run examples:sync-deals` needs a custom deal property, `sync_external_id`, marked **unique value**, or it fails with `PROPERTY_DOESNT_EXIST`. Create it once: Settings → Properties → Deals → Create property → single-line text → advanced options → "unique value". (See Idempotency section below for why.)

## Architecture

```
examples/  →  services/  →  repositories/  →  clients/  →  HubSpot API
                              ↑
                        utils/ (validation, error handling — used by all layers)
```

_Diagram: architecture + request flow — added separately._

Every `examples/*.js` script goes through `hubSpotService`, no exceptions. Plain CRUD is a one-line delegation there; the service only holds actual logic for sync and associations. One rule, no special cases to memorize when reading the code.

Repositories own HubSpot's specific shapes (pagination cursors, `{id, properties:{...}}` nesting, search filter syntax) and hand back flat objects. `hubSpotClient` is the only thing that knows about HTTP — auth header, timeout, retry/backoff.

```
src/
  config/         env loading, fails fast if HUBSPOT_ACCESS_TOKEN missing
  clients/        hubSpotClient.js — axios instance + retry interceptor
  repositories/   contactRepository.js, dealRepository.js, associationRepository.js
  services/       hubSpotService.js — the only entry point examples call
  utils/          validateHubSpotPayload.js, handleHubSpotErrors.js, streams.js
  fundamentals/   Section 1 — standalone, zero dependency on the rest of the repo
  examples/       one script per function, real output to console
data/             seed JSON for the sync examples
test/             node:test, pure/no-network layer only
```

## Running Section 1 (fundamentals)

| Command | Demonstrates |
|---|---|
| `npm run fundamentals:callback` | `setTimeout` + callback |
| `npm run fundamentals:async` | same, refactored to Promise + async/await |
| `npm run fundamentals:modules` | CommonJS `require`/`module.exports` |
| `npm run fundamentals:streams` | `Readable` → uppercase `Transform` → `process.stdout` |

## Running Section 2 (HubSpot)

No-arg scripts have an npm shortcut. Anything taking an ID is run directly (skips the `npm run -- <args>` footgun):

| Command | Function |
|---|---|
| `npm run examples:list-pipelines` | `GET /crm/v3/pipelines/deals` |
| `npm run examples:list-contact-names` | `getHubSpotContactNames` |
| `npm run examples:list-contacts` | `getHubSpotContacts [limit]` |
| `npm run examples:create-contact` | `createHubSpotContact [firstname lastname email]` |
| `node src/examples/update-contact.js <id> [firstname] [lastname] [email]` | `updateHubSpotContact` |
| `node src/examples/delete-contact.js <id>` | `deleteHubSpotContact` |
| `npm run examples:list-deals` | `getHubSpotDeals [limit]` |
| `npm run examples:create-deal` | `createHubSpotDeal [dealname amount]` |
| `node src/examples/update-deal.js <id> [dealname] [amount]` | `updateHubSpotDeal` |
| `node src/examples/delete-deal.js <id>` | `deleteHubSpotDeal` |
| `node src/examples/associate-contact-deal.js <contactId> <dealId>` | `associateContactToDeal` — idempotent, run it twice |
| `npm run examples:sync-contacts` | `syncContactsWithHubSpot` — upserts `data/contacts.json` |
| `npm run examples:sync-deals` | `syncDealsWithHubSpot` — upserts `data/deals.json` |

`data/*.json` are small seed files. Deal records skip `pipeline`/`dealstage` — those come from env, overridable per-record if present.

## Tests

```bash
npm test
```

Covers `validateHubSpotPayload`, `handleHubSpotErrors`, `sumArray`, `streams` — the pure layer, no network. Nothing else is unit-tested: the spec bans mocking HubSpot, and hitting the real API on every `npm test` run would mutate the portal every time. Repositories/services are verified by running the examples against a live portal instead.

## Endpoints

- [Contacts](https://developers.hubspot.com/docs/api/crm/contacts)
- [Deals](https://developers.hubspot.com/docs/api/crm/deals)
- [Associations](https://developers.hubspot.com/docs/api/crm/associations)
- [Pipelines](https://developers.hubspot.com/docs/api/crm/pipelines)
- [Search](https://developers.hubspot.com/docs/api/crm/search)
- [Batch upsert](https://developers.hubspot.com/docs/api-reference/legacy/crm/objects/contacts/batch/upsert-contacts)

## Decisions

| Decision | Reason |
|---|---|
| axios, not `@hubspot/api-client` | SDK hides its own retry/error handling — the point being evaluated. |
| CommonJS, not TypeScript | Spec requires `require`/`module.exports` explicitly; a build step fights that. |
| `pipeline`/`dealstage`, not the spec's `hs_pipeline`/`hs_stage` | Those two don't exist on HubSpot deals. Real names, confirmed against docs. |
| Associations on dated version `2026-09` | HubSpot moved off `v3`/`v4` for this endpoint. The `default` association route is idempotent by design — no client-side existence check needed. |
| Contacts sync via `batch/upsert` (`idProperty: email`) | Atomic, server-side, one call. Email is unique for contacts by default. |
| Deals sync via `batch/upsert` (`idProperty: sync_external_id`) | `dealname` isn't unique — `400` confirmed live. Created a custom deal property, `sync_external_id`, marked "unique value" via `POST /crm/v3/properties/deals` (`hasUniqueValue: true`), populated with each record's `source_id`. Same atomic mechanism as contacts, no search involved. |
| Retry on `429/500/502/503/504` + network errors, not `400/401/403/404/409` | Client/auth errors don't get better on retry. Exponential backoff + jitter, `Retry-After` overrides when present, capped at `HUBSPOT_MAX_RETRIES`. |
| Sync processes records sequentially | Avoids rate-limit bursts, keeps per-record error isolation simple (one bad record fails, the rest continue). |

## Idempotency: contacts vs deals

`dealname` isn't unique in HubSpot — multiple deals can share a name, so `batch/upsert` rejects it as an `idProperty` (`400`, confirmed live: `"Unable to perform update/upsert by non-unique 0-3 property dealname"`). An earlier version of this sync used search-then-write for deals (search for an existing deal, then create or update), which raced HubSpot's Search API: two immediate `sync-deals` runs produced `created: 2` both times instead of `created → updated`, because the index lags a few seconds behind writes.

Fixed by creating a custom deal property instead of working around the race:

1. `POST /crm/v3/properties/deals` with `hasUniqueValue: true` — a unique property, same guarantee `email` gives contacts by default. ([docs](https://developers.hubspot.com/docs/api/crm/properties#create-unique-identifier-properties))
2. `sync_external_id`, populated with each record's `source_id` — a stable external identifier, not `dealname`. Models a real migration scenario: the source system's record ID, decoupled from the display name, which can change without breaking the sync (`data/deals.json` carries both fields separately for this reason).
3. `syncDealsWithHubSpot` now calls `batch/upsert` with `idProperty: 'sync_external_id'` — same atomic, one-call mechanism contacts already used, no search involved.

Verified live: two immediate `sync-deals` runs now produce `created: 2` then `updated: 2`, no duplicates.

A local file mapping `source_id → dealId` was considered as a code-only alternative — rejected, because it only closes the race for records this exact process creates and remembers. A second process running concurrently, a deal created manually in the UI, or a deleted local file all reopen the same window. The unique-property fix has no such gap: HubSpot enforces it centrally, regardless of who's writing.
