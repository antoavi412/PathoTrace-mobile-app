# PathoTrace Mobile - API Integration Guide

This document describes how the mobile client talks to the PathoTrace backend and what
the backend must return for live mode. The contract is **provisional**: the client accepts
several common field-name aliases, but endpoint paths and field names should be confirmed
with the PathoTrace backend team before production use.

## 1. Runtime modes

| Mode | Trigger | Behaviour |
| --- | --- | --- |
| Demonstration | `EXPO_PUBLIC_API_URL` is empty or whitespace | No network requests. Two local demo accounts, seeded cattle/assessment/alert data, and locally stored observations. Clearly labelled as sample data. |
| Live | `EXPO_PUBLIC_API_URL` is set | Authentication and resource requests go to the configured API. Missing endpoint paths raise `BACKEND_NOT_CONFIGURED`. |

Demo mode is not a fallback for a failed backend. If the API URL is configured, the app
uses it; cached data is only used when a request is offline or fails and a cached record
exists for the active user.

The demo credentials are defined in `src/constants/config.ts`:

| Role | Identifier | Password |
| --- | --- | --- |
| Farmer | `farmer@pathotrace.demo` | `demo1234` |
| Veterinarian | `vet@pathotrace.demo` | `demo1234` |

These are client-side demo accounts only. They must not exist on the production backend.

## 2. Configuration

Copy `.env.example` to `.env` (or `.env.local`) and restart Metro with a cleared cache:

```bash
npx expo start -c
```

| Variable | Required in live mode | Purpose | Example |
| --- | --- | --- | --- |
| `EXPO_PUBLIC_API_URL` | Yes | API origin/base URL, no trailing slash | `https://api.pathotrace.example` |
| `EXPO_PUBLIC_AUTH_LOGIN_PATH` | Yes | Login endpoint | `/auth/login` |
| `EXPO_PUBLIC_AUTH_LOGOUT_PATH` | No | Logout endpoint; skipped when empty | `/auth/logout` |
| `EXPO_PUBLIC_FORGOT_PASSWORD_PATH` | Yes, for password recovery | Password recovery request | `/auth/forgot-password` |
| `EXPO_PUBLIC_CATTLE_PATH` | Yes | Cattle collection base | `/cattle` |
| `EXPO_PUBLIC_ASSESSMENTS_PATH` | Yes | Assessment collection base | `/assessments` |
| `EXPO_PUBLIC_ALERTS_PATH` | Yes | Alert collection base | `/alerts` |
| `EXPO_PUBLIC_HEALTH_RECORDS_PATH` | Yes, for cow health records | Health record collection base | `/health-records` |
| `EXPO_PUBLIC_OBSERVATIONS_PATH` | Yes, for vet observations | Observation collection base | `/observations` |

Notes:

- Paths are appended to `EXPO_PUBLIC_API_URL`. A leading slash is optional; the client adds
  one when needed. Paths must be relative, e.g. `/cattle`, not a second absolute URL.
- Values are read at build/bundle time and embedded in the client. Changing them requires a
  Metro restart (and a new build for production binaries).
- Only publishable configuration belongs in `EXPO_PUBLIC_*` variables. They are visible to
  anyone who inspects the app bundle. Never put API secrets, database credentials, or
  service keys here.

## 3. HTTP conventions

- Requests send `Accept: application/json`. Bodies are JSON with
  `Content-Type: application/json`.
- When a session token is present, requests send `Authorization: Bearer <token>`.
- Request timeout is 15 seconds. A timeout surfaces as `TIMEOUT`; other transport failures
  surface as `NETWORK_UNAVAILABLE`.
- Successful responses must be JSON. The client only parses a body when the response
  `Content-Type` includes `application/json`; an empty or non-JSON success body fails
  validation for endpoints expected to return data.
- A response envelope of the form `{ "data": ... }` is unwrapped once. For example,
  `{ "data": { "items": [...] } }`, `{ "data": [...] }`, and `{ "items": [...] }` are all
  accepted for list endpoints.
- All timestamps should be ISO 8601 strings that JavaScript `Date` can parse.
- Risk categories are exactly `low`, `medium`, or `high` (lowercase).

### Error responses

Use an appropriate HTTP status and a JSON body with at least one of `message`, `error`, or
`detail`. The client displays that text. Status codes map to app error codes as follows:

| Status | App code | Typical meaning |
| --- | --- | --- |
| `400`, `422` | `VALIDATION` | Invalid request or assessment input |
| `401` | `UNAUTHORIZED` | Missing, invalid, or expired token |
| `403` | `FORBIDDEN` | Authenticated but not permitted |
| `404` | `NOT_FOUND` | Record does not exist or is not visible to this user |
| `429` | `RATE_LIMITED` | Too many requests; include `Retry-After` if available |
| `5xx` | `SERVER_ERROR` | Backend failure |
| Other | `UNKNOWN` | Unmapped status |

A `401` received while a session token is attached clears the local session and returns the
user to login with a "Session expired" notice. The login request itself is unauthenticated,
so invalid credentials do not trigger that flow.

For transient resource failures (network unavailable, timeout, rate limiting, or a `5xx`),
previously cached data is returned with `source: "cache"` and `stale: true` instead of an
error. A `401`, `403`, or `404` does not use the cache: the cached key is invalidated and the
error is surfaced. Other failures, including invalid response bodies, are surfaced rather
than hidden behind cached data. Actions that write data (creating an assessment, marking an
alert read) still surface errors.

## 4. Endpoint contracts

### Authentication

| Operation | Request | Success response |
| --- | --- | --- |
| Login | `POST {AUTH_LOGIN_PATH}` with `{ "identifier": "...", "password": "..." }` | `{ "token": "...", "user": { ... } }` |
| Logout | `POST {AUTH_LOGOUT_PATH}` with bearer token; no body | Any `2xx`; body ignored |
| Forgot password | `POST {FORGOT_PASSWORD_PATH}` with `{ "identifier": "..." }` | Any `2xx`; body ignored |

Login response details:

- The token may be under `token`, `accessToken`, or `access_token`.
- The user object may be under `user` or `profile`.
- The user object must include `id`, `name`, and `email`.
- Both the login and logout paths are configurable because implementations differ. The
  mobile client sends the identifier exactly as typed.

There is no registration, social login, token refresh, push registration, or sensor
integration in this release.

### Cattle

| Operation | Request | Success response |
| --- | --- | --- |
| List herd | `GET {CATTLE_PATH}?page=1&pageSize=8[&q=search][&risk=high]` | Paginated cattle object (see below) |
| Get cow | `GET {CATTLE_PATH}/{id}` | A cattle object |

- `page` starts at 1. The herd screen requests 8 at a time. Dashboard aggregation requests
  up to 10 pages of 100 records each.
- `q` is a free-text search term, sent only when non-empty.
- `risk` is sent when the user selects a filter and is one of `low`, `medium`, `high`, or
  `unknown`. Omit it for "All".
- Pagination should be server-side. If an array is returned instead, the client treats it as
  a single complete page (`hasMore: false`).

### Assessments

| Operation | Request | Success response |
| --- | --- | --- |
| List assessments | `GET {ASSESSMENTS_PATH}[?cowId=...]` | Assessment list |
| Get assessment | `GET {ASSESSMENTS_PATH}/{id}` | One assessment |
| Create assessment | `POST {ASSESSMENTS_PATH}` with input body | The created assessment |

Create body:

```json
{
  "cowId": "cow-1",
  "milkYieldLiters": 24.5,
  "somaticCellCount": 210000,
  "milkTemperatureC": 38.4,
  "daysInMilk": 120,
  "lactationNumber": 2
}
```

The backend owns inference. The mobile app does not calculate a risk category or
probability. It displays the returned category, optional probability, and optional model
version. When no probability is returned, the detail screen states that none was provided.
The app does not assume a probability scale or append a percent sign; the backend should
document the units it returns.

Assessment responses must include an `id`, a cow reference, a category, and a creation
timestamp. The cow reference may be flat (`cowId`, `cowTagId`) or nested under `cow`
(`cow.id`, `cow.tagId`). The input can be returned under `input` or `inputs`; missing numeric
input fields default to `0` (`lactationNumber` defaults to `1`).

### Alerts

| Operation | Request | Success response |
| --- | --- | --- |
| List alerts | `GET {ALERTS_PATH}` | Alert list |
| Mark one read | `PATCH {ALERTS_PATH}/{id}` with `{ "read": true }` | Any `2xx`; body ignored |

Alerts must include `id`, `cowId`, `cowTagId`, `category`, and `createdAt`. `severity` is
derived from `category`. `title` defaults to `"{category} risk alert"`; `message` defaults
to an empty string. Read state accepts `read`, `isRead`, or `is_read`.

Read state is also stored locally so an alert stays read if the PATCH request fails or the
device is offline. "Mark all read" applies locally and best-effort PATCHes each alert.

### Health records

| Operation | Request | Success response |
| --- | --- | --- |
| List cow records | `GET {HEALTH_RECORDS_PATH}?cowId=...` | Health record list |

Required fields are `id`, `cowId`, `title`, and a record date. `kind` accepts `checkup`,
`illness`, `treatment`, `observation`, or `vaccination`; any other value becomes `checkup`.
Health records are read-only in the mobile app.

### Veterinary observations

| Operation | Request | Success response |
| --- | --- | --- |
| List cow observations | `GET {OBSERVATIONS_PATH}?cowId=...` | Observation list |
| Create observation | `POST {OBSERVATIONS_PATH}` with `{ "cowId": "...", "note": "..." }` | The created observation |

Required observation fields are `id`, `cowId`, `note`, and `createdAt`. The veterinarian
name falls back to `"Veterinarian"` and the veterinarian ID falls back to an empty string.
Only users with the veterinarian role can open the submission form in the app; the backend
must enforce that authorization independently.

If the device is offline and a backend is configured, a new observation is stored locally
with `syncStatus: "pending"` and queued. The local queue removes an entry only after a
successful create. The client does not currently send an idempotency key, so a request that
succeeds server-side but loses its response may be retried and create a duplicate. The
backend should support an idempotency key or tolerate duplicate submissions for production.

### Dashboard

There is no dashboard endpoint. The client derives the dashboard from the cattle list,
assessment list, and alert list. Alerts are sorted client-side, with the three most recent
shown on the dashboard and four recent assessments shown.

## 5. Response field reference

Field names may be camelCase or snake_case where shown. Unknown extra fields are ignored.

### User

| Field | Required | Accepted names / fallback |
| --- | --- | --- |
| `id` | Yes | `id`, `userId`, `user_id` |
| `name` | Yes | `name`, `fullName`, `full_name`, `displayName` |
| `email` | Yes | `email`, `username` |
| `role` | No | `role`, `userRole`, `user_role`; `veterinarian`/`vet` -> vet, `cooperative` -> cooperative, anything else -> farmer |
| `farmId` | No | `farmId`, `farm_id` |
| `farmName` | No | `farmName`, `farm_name` |
| `phone` | No | `phone`, `phoneNumber`, `phone_number` |
| `assignedCowIds` | No | `assignedCowIds`, `assigned_cow_ids` (array of strings) |

### Cattle

| Field | Required | Accepted names / fallback |
| --- | --- | --- |
| `id` | Yes | `id`, `cowId`, `cow_id` |
| `tagId` | Yes | `tagId`, `tag_id`, `earTag`, `ear_tag`, `identifier`; falls back to `id` |
| `breed` | No | `breed`, `cattleBreed`; defaults to `"Not recorded"` |
| `name` | No | `name`, `cowName`, `cow_name` |
| `ageMonths` | No | `ageMonths`, `age_months`, `ageInMonths` |
| `lactationNumber` | No | `lactationNumber`, `lactation_number`, `lactation` |
| `lactationStage` | No | `lactationStage`, `lactation_stage` |
| `daysInMilk` | No | `daysInMilk`, `days_in_milk`, `dim` |
| `farmId` | No | `farmId`, `farm_id`; defaults to empty string |
| `farmName` | No | `farmName`, `farm_name` |
| `riskStatus` | No | `riskStatus`, `risk_status`, `currentRisk`, `current_risk`; invalid/missing -> `unknown` |
| `lastAssessmentAt` | No | `lastAssessmentAt`, `last_assessment_at`, `lastAssessmentDate` |
| `lastAssessmentId` | No | `lastAssessmentId`, `last_assessment_id` |
| `notes` | No | `notes`, `healthNotes` |

### Assessment

| Field | Required | Accepted names / fallback |
| --- | --- | --- |
| `id` | Yes | `id`, `assessmentId`, `assessment_id` |
| `cowId` | Yes | `cowId`, `cow_id`, or nested `cow.id` |
| `cowTagId` | Yes | `cowTagId`, `cow_tag_id`, `tagId`, or nested `cow.tagId` |
| `cowName` | No | `cowName`, `cow_name`, or nested `cow.name` |
| `category` | Yes | `category`, `riskCategory`, `risk_category`, `risk`; must be `low`/`medium`/`high` |
| `createdAt` | Yes | `createdAt`, `created_at`, `assessedAt` |
| `probability` | No | `probability`, `riskProbability`, `risk_probability` |
| `modelVersion` | No | `modelVersion`, `model_version` |
| `note` | No | `note`, `notes` |
| `input` | No | `input` or `inputs` |

### Alert

| Field | Required | Accepted names / fallback |
| --- | --- | --- |
| `id` | Yes | `id`, `alertId`, `alert_id` |
| `cowId` | Yes | `cowId`, `cow_id` |
| `cowTagId` | Yes | `cowTagId`, `cow_tag_id`, `tagId` |
| `cowName` | No | `cowName`, `cow_name` |
| `category` | Yes | `category`, `riskCategory`, `risk_category`, `risk`; must be `low`/`medium`/`high` |
| `createdAt` | Yes | `createdAt`, `created_at`, `timestamp` |
| `title` | No | `title`; defaults to `"{category} risk alert"` |
| `message` | No | `message`, `description` |
| `read` | No | `read`, `isRead`, `is_read`; defaults to `false` |
| `assessmentId` | No | `assessmentId`, `assessment_id` |

### Health record

| Field | Required | Accepted names / fallback |
| --- | --- | --- |
| `id` | Yes | `id`, `recordId`, `record_id` |
| `cowId` | Yes | `cowId`, `cow_id` |
| `title` | Yes | `title`, `name` |
| `recordedAt` | Yes | `recordedAt`, `recorded_at`, `date`, `createdAt` |
| `kind` | No | `kind`, `type`; defaults to `checkup` |
| `description` | No | `description`, `details` |
| `recordedBy` | No | `recordedBy`, `recorded_by`, `veterinarian` |

### Observation

| Field | Required | Accepted names / fallback |
| --- | --- | --- |
| `id` | Yes | `id`, `observationId`, `observation_id` |
| `cowId` | Yes | `cowId`, `cow_id` |
| `note` | Yes | `note`, `observation`, `text` |
| `createdAt` | Yes | `createdAt`, `created_at`, `date` |
| `veterinarianName` | No | `veterinarianName`, `veterinarian_name`, `authorName`; defaults to `"Veterinarian"` |
| `veterinarianId` | No | `veterinarianId`, `veterinarian_id`, `authorId`; defaults to empty string |

## 6. Caching, offline behaviour, and storage

- Native builds cache API data in SQLite through `expo-sqlite`. Web builds use
  `localStorage` instead so the browser bundle does not load the SQLite WebAssembly module.
- Cache keys are scoped per authenticated user. Signing out clears the user's cached
  records, queued writes, and read-alert overrides.
- When offline, previously cached data is returned with a stale-data notice. If no cache
  exists, an `OFFLINE` error is shown.
- Transient server failures fall back to cached data. Authorization, not-found, and invalid
  response failures invalidate or bypass the cache instead.
- TanStack Query keeps in-memory query data for 30 seconds before considering it stale. It
  retries resource queries once; mutations are not retried automatically.
- New observations made offline in live mode are stored locally and queued. The queue is
  flushed on app start, on sign-in, and when connectivity returns, and a failed item is
  retried on the next flush. Assessments are not queued; they require a connection.
- The server is the source of truth for read-only records. The app does not edit cattle,
  assessments, health records, or alerts locally, so there are no field-level conflicts to
  merge. Pending observations are displayed alongside server observations until they sync.
  Read-alert overrides are intentionally local and are merged with server read state.
- Clear cached data is available under Privacy and data; it clears cached records,
  preferences, and queued observations for the current account without deleting the active
  session.

## 7. Security and authorization

- Tokens are stored in `expo-secure-store` on native platforms and `localStorage` on web.
  Web storage is not equivalent to secure storage; deploy the web build only where that
  trade-off is acceptable.
- The app sends bearer tokens over HTTPS. Use HTTPS in production and configure CORS to
  allow the app's web origin if the web build is deployed.
- Role checks in the mobile UI are usability controls, not security boundaries. The backend
  must authorize every request, restrict cattle and assessments to the authenticated user's
  farm/clinic scope, and enforce veterinarian-only observation creation.
- Do not log tokens, patient data, or full API responses. The current client reports only
  safe error messages.

## 8. Integration checklist

1. Set `EXPO_PUBLIC_API_URL` and the endpoint paths, then restart with `npx expo start -c`.
2. Confirm login returns a bearer token plus a user with `id`, `name`, and `email`.
3. Confirm herd responses use server-side pagination and include `hasMore` (or `total`).
4. Confirm assessments are created by the backend and returned with a valid category and
   timestamp; never hardcode a risk result in the client.
5. Confirm alerts include cow identifiers and categories, and that PATCH read is idempotent.
6. Confirm vet observations are authorized server-side and tolerate duplicate retries.
7. Verify a `401` returns the user to login with the session-expired notice.
8. Test offline cache fallback and the observation sync queue on a physical device.
