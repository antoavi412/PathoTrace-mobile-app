# PathoTrace Mobile — Farmer CRUD, Settings, Calendar & Performance Audit

**Date:** 7 November 2026
**Scope:** Static review of the current mobile app (Expo SDK 58 / React Native 0.88 / TypeScript).
**Status:** Audit and requirements documentation only. No application source files were changed.
**Current runtime:** `.env` has `EXPO_PUBLIC_API_URL=` (empty), so the app runs in
**demonstration mode** with in-memory demo data.

---

## 0. Product direction (confirmed)

This app is **mobile-first**. Most users will work from a phone in the barn or field, so every
workflow must be thumb-friendly, fast on a mid-range Android device, and tolerant of poor
connectivity.

The intended roles are:

| Role | Primary mobile workflow |
| --- | --- |
| **Farmer (primary user)** | Add, edit and delete cattle on their own farm; request assessments; schedule work in a calendar; manage profile, farm, notification and app settings |
| **Veterinarian** | Review assigned cattle, read history and add professional observations; optionally schedule follow-ups |
| **Cooperative user** | Read-only herd and risk summaries; no cattle deletion or farm-setting changes |

Requirements added in this revision:

1. **Farmer self-service cattle management** — add, edit and delete/archive cattle from the phone.
2. **Farmer-controlled settings** — profile, farm details, notifications, language/units, data and session.
3. **Calendar option** — a mobile calendar for scheduled checkups, vaccinations, treatments,
   vet visits, dry-off dates, follow-ups and custom farm tasks.
4. Existing gaps from the first audit remain: no charts/trends, and the live-mode data path is
   slow and unpaginated.

### TL;DR

| Area | Current state | Verdict | Effort to fix |
| --- | --- | --- | --- |
| **Farmer adds cattle** | No API method, service, hook, form or button | **Missing end-to-end** | 1–2 days |
| **Farmer edits cattle** | Read-only detail screen | **Missing end-to-end** | 0.5–1 day |
| **Farmer deletes/archives cattle** | No endpoint, permission, confirmation or UI | **Missing end-to-end** | 0.5–1 day |
| **Farmer settings** | Name/phone and 3 notification toggles only, stored locally; no farm, language, units, calendar or backend sync | **Partial** | 1–2 days |
| **Calendar / scheduling** | No route, model, service, UI or reminder support | **Missing end-to-end** | 2–4 days |
| **Charts / "what is happening"** | Only a single-value `RiskGauge` and numeric count cards | **Missing** | 1–2 days |
| **Loading performance** | Demo data is synchronous; live mode can issue up to 14 requests before Home paints and never renders cache first | **Needs work** | 2–4 days |

Two framing points:

1. **The app is currently in demo mode.** If "loading is slow" is observed now, it is most likely
   Metro/dev-bundle overhead, Expo Go, a cold JS bundle or a low-end device — not the data layer.
   Section 6.1 explains how to confirm this before optimizing the wrong thing.
2. **The live-mode data path is genuinely slow by design.** It downloads complete assessments and
   alerts with no pagination and scans the whole herd for the dashboard. It will not scale past a
   few hundred records.

---

## 1. What the app can do today (evidence)

Read-only cattle features exist and are well-structured:

- Herd list with search, risk filter, sort and infinite scrolling
  (`src/app/(app)/(tabs)/herd.tsx`, `src/features/herd/use-herd.ts`).
- Cow detail with risk gauge, assessment history, health records and vet observations
  (`src/app/(app)/cow/[id].tsx`).
- Assessment creation and history (`src/app/(app)/assessment/*`, `use-assessments.ts`).
- Alerts with local read overrides (`use-alerts.ts`, `local-store.ts`).
- Offline cache in SQLite (native) / `localStorage` (web) (`src/database/*`, `src/services/resource.ts`).
- Demo mode with 14 seeded cattle (`src/services/demo/demo-data.ts`).
- Settings screen with profile name/phone, three notification toggles and sign-out
  (`src/app/(app)/settings.tsx`), persisted to local storage only.

Every cattle operation is **read-only**, and there is **no calendar**:

| Operation | Exists? | Where |
| --- | --- | --- |
| List cattle (paginated) | Yes | `remoteHerd` — `src/services/remote/api.ts:47` |
| Get one cow | Yes | `remoteCow` — `src/services/remote/api.ts:78` |
| Get all cows (for pickers/vet) | Yes | `remoteAllCows` — `src/services/remote/api.ts:60` |
| **Create cow** | **No** | — |
| **Update cow** | **No** | — |
| **Delete / archive cow** | **No** | — |
| **Edit farm/profile settings** | Partial, local-only | `settings.tsx:31-45`, `AuthProvider.tsx:108-119` |
| **Calendar / scheduled tasks** | **No** | No route, type, service or tab |
| **Charts / trends** | **No** | Only `src/components/ui/risk-gauge.tsx` |

A repository-wide search finds no `createCow`, `updateCow`, `deleteCow`, `addCow`, `removeCow`,
no `POST {CATTLE_PATH}` and no `DELETE {CATTLE_PATH}/{id}`. The only `DELETE` statements in the
codebase are SQLite cache cleanup (`src/database/index.ts:138`, `:158`), not cattle deletion.
There is also no `calendar` route, no calendar event type, and no `expo-calendar`,
`expo-notifications` or date-picker dependency in `package.json`.

---

## 2. Farmer self-service: add / edit / delete cattle

### 2.1 Missing by layer

| Layer | What exists | What is missing |
| --- | --- | --- |
| **Type model** (`src/types/index.ts:31-46`) | `Cow` with tag, breed, optional age/lactation/notes | `CowInput`/`CreateCowInput`, `UpdateCowInput`, `status` (`active`/`sold`/`dead`/`archived`), `createdAt`/`updatedAt`, optional `sex`/`dateOfBirth`, server `version` if needed for conflicts |
| **API client** (`src/services/remote/api.ts`) | `remoteHerd`, `remoteCow`, `remoteAllCows` | `remoteCreateCow`, `remoteUpdateCow`, `remoteDeleteCow`; handle `201`, `204`, `409` (duplicate tag), `403`, `422` |
| **Config** (`src/constants/config.ts`) | `EXPO_PUBLIC_CATTLE_PATH` | No change needed if create/update/delete use the same collection base; document it in `docs/API_INTEGRATION.md` |
| **Parsers** (`src/services/remote/parsers.ts`) | `parseCow` | A create/update response is a cow, so `parseCow` can be reused; validate `id`/`tagId` and reject malformed responses |
| **Service** (`src/services/herd-service.ts`) | `fetchHerd`, `fetchCow`, `fetchAllCows` | `createCow`, `updateCow`, `deleteCow`; demo equivalents |
| **Query hooks** (`src/features/herd/use-herd.ts`) | Read-only `useHerd`, `useCow`, `useAllCows` | `useCreateCow`, `useUpdateCow`, `useDeleteCow` with invalidation/optimistic updates for `['herd']`, `['cows','all']`, `['cow', id]`, `['dashboard']` |
| **UI — create** | Only an "Assess" button on the herd screen (`herd.tsx:73-83`) | "Add animal" action (FAB or header button) and a create form screen (`src/app/(app)/cow/new.tsx`) |
| **UI — edit** | Cow detail is read-only for animal data (`cow/[id].tsx:118-170`) | Edit screen or editable form for tag, name, breed, age, lactation, DIM, notes |
| **UI — delete** | No delete action | Cow detail overflow/actions, destructive `ConfirmDialog`, success/error feedback, navigate back to herd |
| **Permissions** (`src/utils/permissions.ts`) | Vet observation rules only | `canManageCattle(user, cow)`; **farmers can manage cattle on their own farm**, vets observe, cooperative read-only. Backend must enforce |
| **Confirmation UI** | `ConfirmDialog` exists (`src/components/ui/confirm-dialog.tsx`) | Wire it to a destructive delete/archive flow |
| **Validation** (`src/utils/validation.ts`) | Assessment/login rules only | Cattle form rules: required `tagId` + `breed`, tag format/uniqueness, numeric ranges for age/lactation/DIM |
| **Demo mode** (`src/services/demo/demo-data.ts`) | `DEMO_COWS` is a `const` array (`:48`); reads filter/slice it (`:493-519`) | Make the collection mutable, add create/update/delete helpers, persist changes so they survive a reload, and update `getDemoDashboard` counts |
| **Offline / cache** | `resolveResource` writes `herd:*`, `cows:all`, `cow:*`, `dashboard` | Delete must remove all cached cattle keys (`herd:*`, `cows:all`, `cow:{id}`, `dashboard`) so a deleted animal cannot reappear offline |
| **API documentation** (`docs/API_INTEGRATION.md:121-134`) | List/get only | Create/update/delete contracts, status codes, farmer role rules, soft-delete semantics |
| **Tests** (`tests/services`, `tests/components`) | Read/parse tests | Service tests, parser tests, hook/invalidation tests, form validation tests, delete-confirmation component test |

### 2.2 Recommended API contract

Use the existing `EXPO_PUBLIC_CATTLE_PATH` (`/cattle`) so no new env variable is needed.

| Operation | Request | Success | Notes |
| --- | --- | --- | --- |
| Create | `POST /cattle` `{ tagId, name?, breed, ageMonths?, lactationNumber?, lactationStage?, daysInMilk?, notes? }` | `201` + created cow | Farmer role allowed for own farm; duplicate `tagId` → `409` |
| Update | `PATCH /cattle/{id}` with the same partial body | `200` + cow | Farmer owner only; vet read-only |
| Delete (soft) | `PATCH /cattle/{id}` `{ "status": "archived" }` **or** `DELETE /cattle/{id}` | `204` / `200` | **Recommend soft delete** (see 2.4) |
| Restore | `PATCH /cattle/{id}` `{ "status": "active" }` | `200` + cow | If soft delete is chosen |

The client must not fabricate an `id`; the server owns it. For demo mode, generate
`cow-local-${Date.now()}` locally.

### 2.3 Recommended client shape

```ts
// src/types/index.ts
export type CowStatus = 'active' | 'sold' | 'dead' | 'archived';

export interface CowInput {
  tagId: string;
  name?: string;
  breed: string;
  ageMonths?: number;
  lactationNumber?: number;
  lactationStage?: string;
  daysInMilk?: number;
  notes?: string;
}

export interface Cow {
  // ...existing fields
  status?: CowStatus;      // default 'active' when absent
  createdAt?: string;
  updatedAt?: string;
}
```

```ts
// src/features/herd/use-herd.ts (new exports)
export function useCreateCow() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CowInput) => createCow(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['herd'] });
      void queryClient.invalidateQueries({ queryKey: ['cows'] });
      void queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}
// useUpdateCow: also invalidate ['cow', id]
// useDeleteCow: remove cached cow, invalidate herd/cows/dashboard
```

Recommended farmer UX (mobile):

1. **Add:** header/FAB on **My Herd** → form screen → validate → save → return to herd with the
   new animal visible (or optimistically inserted into page 1).
2. **Edit:** cow detail → "Edit" action → prefilled form → save → detail refreshes.
3. **Delete:** cow detail → overflow menu → `ConfirmDialog` (`destructive`, animal tag in the
   message) → archive/delete → navigate back to herd. Hide the action from users without
   permission.
4. **Failure:** keep the dialog/form open, show `getErrorMessage(error)` in a `NoticeBanner`.
   Do not silently remove the animal if the request fails.
5. **Large touch targets:** 44×44 minimum, bottom-sheet forms, numeric keyboards, and no
   hover-only interactions.

### 2.4 Decisions needed before implementing delete

| Question | Recommendation |
| --- | --- |
| Hard delete or archive? | **Soft delete** (`status: 'archived'`) by default. Health records, assessments, alerts and calendar events reference the cow; hard deletes create orphans and break audit history. Offer a separate "permanently delete" only for admins, if required. |
| Who can delete? | Farmer/owner for their own farm. Vets must not delete. Cooperative users read-only. Backend enforces ownership. |
| Offline delete? | Do **not** queue deletes silently. Require connectivity and show an `OFFLINE` error, or queue with an explicit "will sync when online" indicator. A hidden delete is dangerous. |
| Duplicate tag IDs? | Treat as `409` and show a field-level error. Also validate client-side. |
| Existing records after delete? | Hide archived animals from herd/dashboard/pickers/calendar by default; keep their detail page reachable for history (read-only) or label it "Archived". |
| Add offline? | Creation may be queued like observations, but show a clear `pending sync` badge. If the product prefers simplicity, require connectivity for add/edit/delete in v1. |

### 2.5 Acceptance criteria

- [ ] A farmer can add an animal from **My Herd** with required tag/breed validation; success
      updates the herd without manual refresh.
- [ ] A farmer can edit animal details; the cow detail reflects changes immediately.
- [ ] A farmer can archive/delete an owned animal after a destructive confirmation.
- [ ] Vets and cooperative users cannot see or trigger create/edit/delete actions.
- [ ] Duplicate tag, invalid fields, offline and permission errors show actionable messages.
- [ ] Deleted/archived animals disappear from herd, dashboard counts, assessment picker, vet
      workspace and calendar, and cannot reappear from a stale cache.
- [ ] Demo mode supports add/edit/delete and reflects it in counts immediately (persisted across
      reloads if desired).
- [ ] API docs and tests are updated.

---

## 3. Farmer settings (mobile)

### 3.1 Current state and gaps

| Setting area | Today | Gap |
| --- | --- | --- |
| **Profile** | Name and phone editable; email read-only (`settings.tsx:62-116`) | Saved only on the device (`settings.tsx:111-114`, `AuthProvider.tsx:108-119`); no backend `PATCH`; no photo; no validation beyond a 2-character name |
| **Farm** | Farm name displayed on Home/Profile (`home.tsx:57-59`, `profile.tsx:63-69`) | Cannot edit farm name, location, contact details or herd identifiers; farm fields are read-only from login |
| **Notifications** | High/medium/low switches (`settings.tsx:118-155`) | Local only; no push permission flow; no quiet hours; no calendar reminders; no per-cow mute |
| **Language** | `UserPreferences.language` exists but is fixed to `'en'` (`types/index.ts:142-145`, `preferences-service.ts:4-11`, `:20-26`) | No language selector and no translations |
| **Units / formats** | None | No liters/gal, kg/lb, °C/°F or date-format preference |
| **Calendar preferences** | None | No reminder lead time, week start, default event type or calendar sync setting |
| **Data / privacy** | Clear cached data (`privacy.tsx`) | No export, no cache size, no last-sync display |
| **Session** | Sign out with confirmation (`settings.tsx:158-189`) | No session-expiry display or multi-device management |
| **Backend profile endpoint** | `remoteCurrentUser` exists but is unused (`remote/api.ts:39-45`) | No user/farm update endpoints in the client |

### 3.2 What a farmer should be able to change

- **Profile:** name, phone; email/sign-in ID read-only; password recovery via the existing flow.
- **Farm (if they own it):** farm name, location/address, contact phone, herd label.
- **Notifications:** high/medium/low alerts, quiet hours, calendar reminder lead time, and a
  master on/off switch.
- **App preferences:** language, units (L/gal, kg/lb, °C/°F), date format, week start.
- **Calendar defaults:** default event type, default reminder time, show completed events.
- **Data:** clear cache, last sync time, storage used.
- **Session:** sign out, session expiry notice.

### 3.3 Recommended implementation

1. **Extend the preference model** (`src/types/index.ts`):

```ts
export interface UserPreferences {
  language: 'en';                 // expand when translations exist
  units: { volume: 'L' | 'gal'; weight: 'kg' | 'lb'; temperature: 'C' | 'F' };
  dateFormat: 'DMY' | 'MDY';
  weekStartsOn: 0 | 1;            // Sunday or Monday
  notifications: NotificationPreferences;
  calendar: {
    remindersEnabled: boolean;
    leadTimeMinutes: number;      // 0, 15, 60, 1440
    showCompleted: boolean;
  };
}
```

2. **Local-first, sync later.** Keep reading/writing preferences through
   `preferences-service.ts` so settings work offline, then sync to the backend when online.
   A failed sync must keep the local value and show a "saved on this device" note, or roll back
   with an error — never silently discard the farmer's choice.
3. **Backend contract** (proposed, to confirm with the backend team):
   - `PATCH /users/me` `{ name?, phone?, preferences? }`
   - `PATCH /farms/{id}` `{ name?, location?, phone? }` (farmer owner only)
   - `GET /users/me` for a fresh profile on launch
4. **UI structure** (`settings.tsx`): group into **Profile**, **Farm**, **Notifications**,
   **Calendar**, **App preferences**, **Data & privacy**, **Session**. Use existing `Card`,
   `SwitchRow`, `TextField`, `ConfirmDialog` and `MenuRow` components.
5. **Save behavior:** explicit "Save" for text fields; immediate save for switches with
   optimistic UI and rollback on failure. Show a small inline "Saved" confirmation.
6. **Permissions:** farmers edit their own profile and farm; vets edit their own profile only;
   cooperative users read-only for farm details. Backend is the security boundary.
7. **Validation:** name ≥ 2 characters, phone format where required, safe trim, no secrets in
   logs. Reuse `TextField` error props.

### 3.4 Acceptance criteria

- [ ] A farmer can edit name, phone and farm details; changes persist and survive app restart.
- [ ] Notification and calendar preferences persist per user and are restored on next launch.
- [ ] Language/units/date-format choices are visible and consistently applied where supported.
- [ ] Failed backend sync shows an error and does not silently lose the change.
- [ ] Settings are scoped per account and cleared on sign-out, like cached data.
- [ ] Role-based visibility works (farmer owns farm fields; vet sees profile only).
- [ ] All controls are mobile-accessible with labels and 44×44 touch targets.

---

## 4. Calendar & scheduling (new mobile option)

### 4.1 Current state

There is **no calendar option** in the app today:

- No calendar route in `src/app/(app)/_layout.tsx:31-37`.
- No calendar tab in `src/app/(app)/(tabs)/_layout.tsx` (five tabs: Home, My Herd, Assessments,
  Alerts, Profile).
- No calendar event type in `src/types/index.ts`.
- No calendar service, hook, screen or component.
- No `expo-calendar`, `expo-notifications`, date-picker or calendar library in `package.json`.
- Dates are only formatted for display (`src/utils/format.ts:1-92`); there is no month-grid or
  date-window logic.

Existing dated records are **historical**, not schedulable:

| Record | Date field | Use |
| --- | --- | --- |
| `Assessment.createdAt` | Past assessment | History/trends |
| `HealthRecord.recordedAt` | Past checkup/treatment | History |
| `HealthAlert.createdAt` | Alert time | Feed |
| `Cow.lastAssessmentAt` | Last assessment | Due/overdue hints |

### 4.2 What the calendar should show

- **Today / upcoming:** assessments due, vet visits, vaccinations, treatments, dry-off dates,
  follow-ups, custom farm tasks.
- **Past:** completed checkups, treatments and assessments (read-only history).
- **Per-cow schedule:** a "Schedule" section on the cow detail, filtered to that animal.
- **Home summary:** "Today" card with overdue, due today and next 7 days.
- **Filters:** event type, cow, status (scheduled/completed/overdue), and a "My tasks" view.
- **Actions:** add event, edit, mark complete, reschedule, cancel/delete; all role-gated.

### 4.3 Proposed data model and API

```ts
// src/types/index.ts
export type CalendarEventType =
  | 'assessment'
  | 'checkup'
  | 'vaccination'
  | 'treatment'
  | 'vet-visit'
  | 'dry-off'
  | 'follow-up'
  | 'other';

export type CalendarEventStatus = 'scheduled' | 'completed' | 'cancelled' | 'overdue';

export interface CalendarEvent {
  id: string;
  farmId: string;
  cowId?: string;             // optional for herd-wide tasks
  cowTagId?: string;
  cowName?: string;
  type: CalendarEventType;
  title: string;
  notes?: string;
  scheduledAt: string;        // ISO 8601
  durationMinutes?: number;
  status: CalendarEventStatus;
  reminderMinutesBefore?: number;
  assignedTo?: string;        // user id/name
  isDemonstration: boolean;
  createdAt: string;
  updatedAt?: string;
}
```

Proposed endpoints (add `EXPO_PUBLIC_CALENDAR_PATH=/calendar-events`):

| Operation | Request | Success |
| --- | --- | --- |
| List window | `GET /calendar-events?from=...&to=...&cowId=...&status=...` | Event list |
| Get one | `GET /calendar-events/{id}` | Event |
| Create | `POST /calendar-events` with the event body | Created event |
| Update / reschedule | `PATCH /calendar-events/{id}` | Updated event |
| Complete | `PATCH /calendar-events/{id}` `{ "status": "completed" }` | Updated event |
| Delete | `DELETE /calendar-events/{id}` | `204` |

Validation:

- `scheduledAt` must be a valid ISO date; required `title` and `type`.
- Reject `from`/`to` ranges larger than a sensible window (e.g. 62 days) to protect the API.
- Overdue is derived client-side when `status === 'scheduled'` and `scheduledAt < now`.
- The backend remains the source of truth; do not fabricate events.

### 4.4 Navigation and screens

Adding a sixth bottom tab is possible but crowds small screens. Two options:

| Option | Pros | Cons |
| --- | --- | --- |
| **A. Calendar tab** (recommended if used daily) | One tap; clear "Today" badge; familiar mobile pattern | Six tabs at 11 px labels is tight on 320 pt screens; may need "More" |
| **B. Top-level screen from Home + cow detail** (safer v1) | No tab crowding; contextual scheduling from a cow | Less discoverable; extra tap |

Recommended hybrid:

- Add `src/app/(app)/(tabs)/calendar.tsx` as a tab **or** expose "Calendar" as a prominent Home
  quick action and a cow-detail "Schedule" action.
- Add `src/app/(app)/calendar/new.tsx` and `src/app/(app)/calendar/[id].tsx` for the form and
  detail.
- Add a "Today" summary card on Home regardless of navigation choice.

Calendar screen composition:

```text
[ Month header: < November 2026 >   Today ]
[ Month grid with event dots ]
[ Filter chips: All · Assessments · Treatments · Vet · Tasks ]
[ Agenda for selected day / next 7 days (FlatList) ]
[ FAB: Add event ]
```

Recommended zero-dependency components:

- `MonthGrid` — 7-column grid built from `Date` + `View`; weekday labels; previous/next month.
- `DayAgenda` — virtualized list of events; status badges; complete/delete actions.
- `EventFormSheet` — title, type chips, cow picker (reuse `CowPicker`), date/time, reminder,
  notes.
- `CalendarTodayCard` — overdue/due-today/upcoming counts for Home.

Date/time input options:

- **Zero dependency:** simple date/time stepper or three-field input (day/month/year + hour/minute).
  Less polished but no native module.
- **Recommended:** `npx expo install @react-native-community/datetimepicker` for native pickers.
- **Do not** add a heavy calendar UI library for a month grid.

### 4.5 Reminders and device integration

| Capability | v1 recommendation | Notes |
| --- | --- | --- |
| In-app "Today" card and badge | **Yes** | Uses existing screen patterns; no permissions |
| Local notifications | **Optional** | Requires `expo-notifications`, notification permission, Android channel setup and a rebuild; cannot work fully in Expo Go for push |
| Push reminders | **Later** | Requires backend scheduling or a push service |
| Device calendar sync | **Later/optional** | `expo-calendar` needs calendar permissions and a clear privacy explanation; avoid writing health data to shared calendars by default |
| Recurring tasks | **Later** | Start with one-off events; recurrence adds complexity and timezone edge cases |

Tie reminder choices to the settings in Section 3 (`calendar.remindersEnabled`,
`calendar.leadTimeMinutes`, quiet hours). If notifications are not implemented, the UI must say
"Reminders appear in the app" rather than promising push.

### 4.6 Offline and performance behaviour

- Cache the visible month plus today's agenda; revalidate in the background.
- Query only the visible window (`from`/`to`), never all history.
- Prefetch the previous/next month on swipe; cap the window at 62 days.
- Use `FlatList` for the agenda and `React.memo` for day cells; the month grid should not
  rerender on every event fetch.
- Offline creation: reuse the observation queue pattern (`enqueueSync('calendar.create', ...)`,
  `sync-service.ts`) and show a `pending sync` badge. Offline delete should be blocked or
  explicitly queued — never silent.
- Invalidate `['calendar']` and `['dashboard']` after create/complete/delete.
- Empty/error/loading states use the existing `states.tsx` components.

### 4.7 Acceptance criteria

- [ ] A farmer can open the calendar, see today's and upcoming events, and switch months.
- [ ] A farmer can add an event for a cow or the whole farm, edit/reschedule it, mark it complete
      and cancel/delete it.
- [ ] Events appear on Home ("Today") and on the related cow detail.
- [ ] Overdue events are clearly labelled and never silently dropped.
- [ ] Only the visible date window is fetched; month switching stays smooth on a mid-range phone.
- [ ] Calendar data is cached for offline viewing; pending writes are clearly marked.
- [ ] Role permissions are enforced: farmer manages own farm, vet can schedule follow-ups for
      assigned cows (if product allows), cooperative read-only.
- [ ] Demo mode seeds events relative to today so the feature is demonstrable offline.
- [ ] No push/device-calendar claims unless those integrations are actually implemented.

---

## 5. Charts and "what is currently happening"

### 5.1 Present state

There are **no charts** in the app. The only visual risk element is a static ring that displays
one category for one cow (`src/components/ui/risk-gauge.tsx`). The closest thing to analytics is:

- Four count cards on Home (`home.tsx:101-134`).
- A count strip on Assessments (`assessments.tsx:72-106`).
- An unread-alert count on Alerts (`assessments`/`alerts.tsx:73-83`).

There is no chart/graph library in `package.json`, no `react-native-svg`, and no time-series
aggregation in `src/utils/risk.ts` (which only has `countRisk`, `highestRisk`, sorting and
weights). There is also no "live" or periodic refresh: alerts/assessments/calendar only update on
navigation or pull-to-refresh, and there is no push/polling.

### 5.2 Data already available

| Source | Fields useful for charts |
| --- | --- |
| `Cow` | `riskStatus`, `lastAssessmentAt`, `breed`, `lactationNumber`, `daysInMilk`, `ageMonths` |
| `Assessment` | `category`, `createdAt`, `probability?`, `input.milkYieldLiters`, `input.somaticCellCount`, `input.milkTemperatureC`, `input.daysInMilk` |
| `HealthAlert` | `category`, `createdAt`, `read` |
| `HealthRecord` | `kind`, `recordedAt` |
| `CalendarEvent` (new) | `type`, `scheduledAt`, `status` — upcoming workload and overdue counts |

**Caveat:** in live mode the client must not invent values. `probability` is optional and its
scale is backend-defined (`docs/API_INTEGRATION.md:155-166`). A trend chart should plot only
fields actually returned; if `input` is absent, show "not recorded" rather than zero.

### 5.3 Recommended chart set

| # | Chart | Question it answers | Data source | Where |
| --- | --- | --- | --- | --- |
| 1 | **Herd risk distribution** (stacked bar or 4 horizontal bars) | How is the herd split across high / medium / low / not assessed? | `countRisk(cows)` | Home, top of Herd |
| 2 | **14-day assessment trend** (stacked columns by day) | Are high-risk findings rising or falling this week? | assessments grouped by day + category | Home ("Herd activity") |
| 3 | **Current attention list** (not a chart, but the "what is happening now" card) | Which animals need action right now? | cows sorted by risk + unread alerts | Home |
| 4 | **Upcoming workload** (next 7 days) | What needs doing this week? | calendar events by day/type | Home, Calendar |
| 5 | **Cow health trend** (sparkline) | Is SCC / milk yield / temperature moving in a bad direction? | assessment `input` over time for one cow | Cow detail |
| 6 | **Assessment coverage** (progress bar) | How many animals have never been assessed? | `unknownRisk / totalCattle` | Home or Herd |
| 7 | **Alert volume** (7-day bars) | Are alerts increasing? | alerts grouped by day | Alerts screen |

Suggested Home layout after stats:

```text
[ Risk distribution — 1 stacked bar + legend ]
[ Last 14 days · assessments — stacked columns ]
[ Needs attention now — top 3 high-risk / unread ]
[ Today / next 7 days — calendar workload ]
[ Recent assessments ]
[ Recent alerts ]
```

### 5.4 Implementation approach

**Option A — zero new dependencies (recommended first):**
Build charts with `View` widths/heights and `flex`, exactly like a progress bar. A stacked risk
bar, 14 daily columns, workload bars and a coverage bar are simple and fast. This avoids native
modules and works in Expo Go/web without extra setup.

**Option B — `react-native-svg`:**
Install with `npx expo install react-native-svg` and draw smooth sparklines, donuts or axis
lines. Use only if curved lines/donuts are a hard requirement. Do not add a full charting
library (Victory/Gifted Charts) unless the requirement justifies the bundle and maintenance cost.

**New analytics helpers** (`src/utils/analytics.ts`):

```ts
export function assessmentsPerDay(
  assessments: Assessment[],
  days: number,
  now?: Date
): { date: string; high: number; medium: number; low: number }[];

export function riskDistribution(cows: Cow[]): {
  high: number; medium: number; low: number; unknown: number; total: number;
};

export function assessmentsCoverage(cows: Cow[]): number; // 0..1

export function cowTrend(assessments: Assessment[]): {
  at: string;
  milkYieldLiters?: number;
  somaticCellCount?: number;
  milkTemperatureC?: number;
}[];

export function alertsPerDay(alerts: HealthAlert[], days: number): { date: string; count: number }[];

export function workloadPerDay(
  events: CalendarEvent[],
  days: number
): { date: string; scheduled: number; overdue: number }[];
```

**Reusable components** (`src/components/charts/`):

- `RiskDistributionBar` — stacked segments with accessible labels.
- `DailyTrendBars` — 14 columns, stacked by risk, with a legend.
- `Sparkline` — pure `View` segments or SVG; renders a "not recorded" caption when fewer than
  two points exist.
- `WorkloadBars` — next-7-days scheduled/overdue bars.
- `HerdPulseCard` — text summary: "2 high-risk · 3 unread · 5 assessed this week".

**Accessibility and honesty:**

- Never rely on color alone: add labels/values and an accessible summary string.
- Label demo data with the existing `DemoModeBanner`/"sample data" wording.
- Show empty states ("No assessments in the last 14 days") instead of an empty axis.
- Do not plot a probability unless the backend returned one and documented its units.

### 5.5 Acceptance criteria

- [ ] Home answers "what is happening now" at a glance: risk distribution, 14-day trend, top
      attention items and upcoming calendar workload.
- [ ] Cow detail shows a real trend only when 2+ assessments with inputs exist; otherwise a
      clear empty state.
- [ ] Charts render in demo mode, live mode, offline cache mode, and with zero records.
- [ ] Aggregations are unit-tested (including timezone/day boundaries and missing inputs).
- [ ] No fabricated data or probability.

---

## 6. Speed / loading audit

### 6.1 First, separate the two kinds of "slow"

**Observation:** `.env` currently has an empty `EXPO_PUBLIC_API_URL`, so all data is local demo
data. Demo reads are synchronous (`resolveResource` returns immediately,
`src/services/resource.ts:31-34`). Therefore:

- If the **first screen still takes seconds in demo mode**, the bottleneck is almost certainly
  the development environment: Metro bundling, Expo Go, dev-mode JS (no bytecode/minification),
  icon-font loading, or a low-end emulator. Confirm with a production-like run:
  `npx expo start --no-dev --minify` or an EAS preview build.
- If it is slow only **after setting a live API URL**, use Section 6.2. The live path has real,
  measurable problems.

Do not "optimize" the demo path based on dev-mode timings. Measure first (6.4).

### 6.2 Findings ranked by impact

| ID | Finding | Evidence | Impact | Fix | Effort |
| --- | --- | --- | --- | --- | --- |
| **P1** | **No cache-first rendering.** Cached records are read but only returned when offline or after a network error. The UI blocks on the network on every cold start. | `resolveResource` reads cache at `src/services/resource.ts:36` but only returns it at `:39-51` / `:72-79`; TanStack has no persisted cache (`query-client.ts:1-15`) | High — blank spinner for a full round-trip even with valid cache | Seed React Query from SQLite/localStorage (`initialData`/`placeholderData`) or add a persister; show `StaleDataNotice` while revalidating | 1 day |
| **P2** | **Dashboard scans the entire herd with up to 10 sequential requests**, plus assessments, alerts and local reads. | `dashboard-service.ts:20-40`; `remoteAllCows` loop `remote/api.ts:60-76` (10 × 100, sequential) | High — worst case **13 requests** before Dashboard paints | Add `GET /dashboard/summary` backend aggregate; if not possible, use the herd list `total` + per-risk query params instead of downloading every cow | 1–2 days |
| **P3** | **Assessments and alerts are unpaginated** and request every record. | `remoteAssessments` / `remoteAlerts` — `remote/api.ts:83-104` | High with history — payload and parse time grow forever | Add `page`/`pageSize` + `hasMore`; use `useInfiniteQuery` | 1 day |
| **P4** | **Lists render inside `ScrollView` with `.map`**, so every row mounts at once. | Assessments `assessments.tsx:139-152`; Alerts `alerts.tsx:110-119`; Vet `vet.tsx` | High — slow first render/jank with hundreds of rows | Use `FlatList`/`FlashList` with pagination and `React.memo` rows | 0.5–1 day |
| **P5** | **Herd page size is only 8.** | `HERD_PAGE_SIZE = 8` — `use-herd.ts:6` | Medium — many round-trips while scrolling | Raise to 20–25, prefetch at 50% scroll, keep the server-side page contract | 30 min |
| **P6** | **Cow detail fires 4 independent requests on mount.** | `cow/[id].tsx:43-46` (cow, assessments, health, observations) | Medium — 4× latency, 4× cache entries, more failure points | Add a cow-detail aggregate endpoint, or fetch cow first then stagger the rest; keep queries parallel only where independent | 1 day |
| **P7** | **Duplicate alerts request at startup.** The tab layout fetches alerts for the unread badge while Dashboard separately fetches alerts. | `tabs/_layout.tsx:8` → `use-alerts.ts:6-16`; `dashboard-service.ts:21-26` | Medium — one extra full-list request on every launch | Make Dashboard consume the shared `['alerts']` query, or share a single `alerts` query across tabs/home | 0.5 day |
| **P8** | **All-cattle scans used for pickers and vet workspace.** | `assessment/new.tsx:50`, `vet.tsx:22` → `fetchAllCows` | Medium — up to 10 more sequential requests per screen | Paginate/search server-side; for the picker, use debounced `GET /cattle?q=` with 20 results | 1 day |
| **P9** | **Network probe on every resource resolve** adds a native bridge call before each request. | `resource.ts:37` → `isNetworkAvailable()` (`network.ts:4-18`); no result caching | Low–Medium | Cache the network state for 2–5 s, or use `NetworkProvider` state / `useNetwork()` | 2 hours |
| **P10** | **Cache fragmentation from search keys.** Every debounced search term writes a new `herd:page:size:risk:term` row. | `herd-service.ts:7-9` | Low–Medium over time (DB growth, more writes) | Cache only unfiltered pages, or drop the search term from the cache key; add a TTL/size cleanup using the unused `CACHE_STALE_AFTER_MS` (`config.ts:21`, currently dead config) | 2 hours |
| **P11** | **Search causes an empty flash.** New query key has no data, and there is no previous-data placeholder. | `use-herd.ts:9-22`; `herd.tsx:35` | Low perceived performance | Add `placeholderData: keepPreviousData`; keep the previous list visible while filtering | 15 min |
| **P12** | **No persisted query cache / no background revalidation policy.** `staleTime` is 30 s and every tab can refetch independently. | `query-client.ts:5-13` | Medium — repeated requests and stale flashes after 30 s | Tune per-query `staleTime` (herd 60 s, dashboard 60 s, alerts 30 s, health records 5 min); add a persister for offline-first | 0.5 day |
| **P13** | **Calendar must not fetch all history.** A naive `GET /calendar-events` would repeat the assessments/alerts mistake. | Not implemented yet | Preventive — high if built naively | Fetch only the visible month/week window; prefetch adjacent months; cache per window | Included in calendar work |
| **P14** | **Settings should be local-first.** Loading preferences is fast today, but a future backend sync must not block the settings screen. | `preferences-service.ts:17-34`; `settings.tsx:22` | Low now, medium after sync is added | Render cached preferences immediately; sync in the background with rollback/notice | Included in settings work |

### 6.3 Mobile-first performance rules for the new work

- Virtualize every list (`FlatList`), never `.map` inside a `ScrollView` for records.
- Fetch **windows/pages**, not "all": calendar by month, assessments/alerts by page, pickers by
  search query.
- Keep first paint under 3 requests; cache the first page of herd, alerts, assessments, calendar
  and dashboard.
- Use 44×44 touch targets and avoid expensive shadows/animations on low-end Android.
- Compress payloads where the backend allows it; do not request full history for a count.
- Debounce search (already 300 ms) and keep previous results visible.
- Use `React.memo` for row/cell components and stable callbacks.

### 6.4 Live-mode request budget (current)

| Screen | Requests on first open |
| --- | --- |
| App start (Home + tab badge) | dashboard (1 + **up to 10 sequential** cow pages + 1 assessments + 1 alerts) **+** 1 alerts = **up to 14** |
| Herd | 1 per 8 rows scrolled |
| Cow detail | 4 |
| Assessment form | up to 10 (all cows) |
| Vet workspace | up to 10 (all cows) |
| Assessments tab | 1 (all history) |
| Alerts tab | 1 (all alerts, usually deduped with the badge query) |
| Calendar (proposed) | 1 per visible month (+ prefetch adjacent months) |
| Settings save (proposed) | 1 PATCH per save (local-first UI) |

### 6.5 Quick wins (half a day or less)

1. Herd page size 8 → 20/25 (`use-herd.ts:6`).
2. `placeholderData: keepPreviousData` on herd search (`use-herd.ts`).
3. Cache the network probe result for a few seconds (`network.ts`).
4. Stop caching every search term (`herd-service.ts`).
5. Make Dashboard reuse the shared alerts query instead of fetching alerts again.
6. Increase `staleTime` for slow-changing resources (health records, dashboard) and remove
   unnecessary invalidations.
7. Add simple skeletons (already have `LoadingState`; use skeleton rows on Home/Herd) to improve
   perceived speed.
8. Confirm the app is tested in a production-like build, not just dev mode.

### 6.6 Structural improvements (recommended order)

1. **Cache-first + background revalidation** (P1). Biggest perceived improvement.
2. **Server aggregate for the dashboard** (P2) and **server pagination for assessments/alerts**
   (P3).
3. **Virtualized lists** for assessments/alerts/vet (P4) and server search for pickers (P8).
4. **Cow-detail aggregate** (P6).
5. Add request instrumentation (dev-only timing) and a performance budget.

### 6.7 Measurement plan

- Use a **production build** (`npx expo start --no-dev --minify` or an EAS preview) on a
  mid/low-end Android device.
- Measure: cold start → first interactive screen, Home time-to-content (cache vs network),
  herd first page, calendar month switch, scroll FPS, and HTTP request count per session.
- Suggested initial budgets:
  - Cached Home content < 300 ms after mount; network revalidation in the background.
  - Cold start to interactive < 2 s (mid-range device).
  - ≤ 3 requests to paint Home; ≤ 6 for a full session start.
  - 60 fps scrolling with 500+ herd records and a populated calendar.
- Add dev-only timing around `resolveResource`/`apiRequest`; never log tokens, health data or
  full responses.

---

## 7. Suggested delivery plan

| Phase | Work | Outcome |
| --- | --- | --- |
| **A. Performance quick wins** (0.5–1 day) | Page size, placeholder data, network cache, query tuning, dedupe alerts | Faster, smoother app with low risk |
| **B. Cache-first** (1 day) | Seed queries from SQLite/localStorage; background revalidate | Instant repeat launches |
| **C. Farmer cattle CRUD** (2–3 days) | Types → API → service → hooks → add/edit form → delete/archive confirm → demo + tests + docs | Farmer can manage the herd from the phone |
| **D. Farmer settings** (1–2 days) | Preference model, profile/farm edit, notification/calendar settings, local-first sync + tests | Farmer controls their account and app behaviour |
| **E. Calendar** (2–4 days) | Model/API → month grid + agenda → add/edit/complete → Home card + cow schedule → offline cache/queue + tests | Scheduling and follow-up in one mobile view |
| **F. Charts** (1–2 days) | Analytics helpers → zero-dep chart components → Home/Herd/Cow panels → tests | "What is happening now" at a glance |
| **G. Scale** (2–4 days) | Dashboard aggregate, paginated assessments/alerts, virtualized lists, cow aggregate | Scales to large herds |

Suggested sequencing for the farmer-first goal: **A → C → D → E → B → F → G**. Performance quick
wins are cheap and reduce frustration while CRUD and calendar are built.

---

## 8. Files to add / change

### New files

```
src/app/(app)/cow/new.tsx                  # Add-cattle form
src/app/(app)/cow/edit.tsx                 # Edit-cattle form (or reuse new.tsx with an id param)
src/features/herd/use-cattle-mutations.ts  # Create/update/delete hooks (or extend use-herd.ts)
src/app/(app)/(tabs)/calendar.tsx          # Calendar tab (or a non-tab screen)
src/app/(app)/calendar/new.tsx             # Create event
src/app/(app)/calendar/[id].tsx            # Event detail / edit
src/features/calendar/use-calendar.ts      # Calendar queries and mutations
src/services/calendar-service.ts           # Demo + remote calendar service
src/components/calendar/month-grid.tsx
src/components/calendar/day-agenda.tsx
src/components/calendar/event-form-sheet.tsx
src/components/calendar/calendar-today-card.tsx
src/utils/calendar.ts                      # Month grid, date windows, overdue logic
src/utils/analytics.ts                     # Time-series and distribution helpers
src/components/charts/risk-distribution.tsx
src/components/charts/daily-trend.tsx
src/components/charts/sparkline.tsx
src/components/charts/workload-bars.tsx
src/components/charts/herd-pulse-card.tsx
tests/utils/analytics.test.ts
tests/utils/calendar.test.ts
tests/features/cattle-mutations.test.tsx
tests/features/calendar.test.tsx
tests/features/settings.test.tsx
```

### Existing files to change

| File | Change |
| --- | --- |
| `src/types/index.ts` | `CowInput`, `CowStatus`, `status`/`createdAt`/`updatedAt` on `Cow`; `CalendarEvent`, `CalendarEventType`, `CalendarEventStatus`; extended `UserPreferences` |
| `src/services/remote/api.ts` | `remoteCreateCow`, `remoteUpdateCow`, `remoteDeleteCow`; calendar list/create/update/delete; profile/farm update |
| `src/services/remote/parsers.ts` | Reuse `parseCow`; add `parseCalendarEvent`; validate responses |
| `src/services/herd-service.ts` | `createCow`, `updateCow`, `deleteCow` + demo branches + cache invalidation |
| `src/services/demo/demo-data.ts` | Mutable demo herd + create/update/delete helpers + relative-to-today calendar seed events + dashboard counts |
| `src/features/herd/use-herd.ts` | Mutation hooks and invalidation |
| `src/services/calendar-service.ts` (new) and `src/features/calendar/use-calendar.ts` (new) | Windowed queries, optimistic complete/reschedule, offline queue |
| `src/constants/config.ts` | Add `calendar: process.env.EXPO_PUBLIC_CALENDAR_PATH`; optionally user/farm routes |
| `.env`, `.env.example` | Add `EXPO_PUBLIC_CALENDAR_PATH=/calendar-events`; document user/farm paths |
| `src/app/(app)/(tabs)/herd.tsx` | "Add animal" action; refresh after create; optional edit entry |
| `src/app/(app)/cow/[id].tsx` | Edit/Delete/Archive actions and confirmation; "Schedule" section |
| `src/app/(app)/(tabs)/home.tsx` | Charts, "Needs attention now", "Today / next 7 days" card, add-event shortcut |
| `src/app/(app)/settings.tsx` | Farm/profile editing, language/units/date format, calendar reminders, quiet hours, sync status |
| `src/services/preferences-service.ts` | Extended defaults, migration, local-first sync |
| `src/features/settings/use-preferences.ts` | Update APIs for units/calendar/quiet hours |
| `src/features/auth/AuthProvider.tsx` | Persist profile/farm updates through the backend when live; keep local fallback |
| `src/app/(app)/(tabs)/_layout.tsx` | Add Calendar tab (or keep 5 tabs and use a Home entry) |
| `src/app/(app)/_layout.tsx` | Register `calendar/new` and `calendar/[id]` routes; cow/new and cow/edit routes |
| `src/components/ui/confirm-dialog.tsx` | Used as-is for delete/archive confirmation |
| `src/utils/permissions.ts` | `canManageCattle(user, cow)`, `canEditFarm(user)`, `canManageCalendar(user, cow)` |
| `src/utils/validation.ts` | Cattle form + calendar event validation |
| `src/services/resource.ts` | Cache-first return option; network-probe caching |
| `src/services/query-client.ts` | Per-query defaults + optional persistence |
| `src/services/dashboard-service.ts` | Aggregate endpoint or lighter herd summary; include calendar workload |
| `src/app/(app)/(tabs)/assessments.tsx` | `FlatList` + pagination |
| `src/app/(app)/(tabs)/alerts.tsx` | `FlatList` + pagination |
| `src/app/(app)/vet.tsx` | Paginated/searchable assigned herd |
| `src/app/(app)/assessment/new.tsx` | Server-side cow search instead of all cows |
| `docs/API_INTEGRATION.md` | Cattle create/update/delete, settings/profile, calendar, dashboard, pagination contracts |
| `README.md` | Update feature status after implementation |

---

## 9. Testing checklist for the new work

### Cattle CRUD and permissions

- `createCow` / `updateCow` / `deleteCow`: success, `409` duplicate, `403`, `422`, offline.
- Farmer can manage own-farm cattle; vet and cooperative actions are hidden and rejected.
- Query invalidation: after create/edit/delete, herd/all-cows/dashboard/cow detail are correct and
  archived animals cannot reappear from cache.
- Form validation: required tag/breed, numeric ranges, whitespace-only names.
- Delete confirmation: cannot delete while pending; cancel does nothing; failure keeps the record.

### Settings

- Preferences load before first paint; switches save optimistically and roll back on failure.
- Profile/farm edits persist across restart and sync when online.
- Per-user scoping and clear-on-sign-out.
- Language/units/date format are applied consistently where supported.

### Calendar

- Month-grid math: month boundaries, leap years, DST/timezone changes, week start 0/1, 6-week
  grids.
- Overdue derivation, completed/cancelled filtering, event counts.
- Create/edit/reschedule/complete/delete; optimistic updates and rollback.
- Windowed fetch (`from`/`to`) and no all-history request.
- Offline cache read and queued create with a visible pending badge.
- Permissions by role and cow assignment.

### Charts

- `analytics.ts`: day boundary/timezone, empty inputs, missing `probability`, 14-day window,
  coverage 0/1, unsorted data, calendar workload with overdue events.
- Chart components: zero records, one record, missing inputs, accessible labels.

### Mobile device checks

- 320 pt width, large font scaling, 44×44 touch targets, keyboard behavior, safe areas.
- Slow network, airplane mode, app background/resume, session expiry.
- Large herd (500+), long assessment history, populated calendar month.

---

## 10. Open questions for the product/backend team

1. Does the backend already support `POST/PATCH/DELETE /cattle`, or does it need to be built?
2. Is deletion hard-delete or archive? Are health records, assessments, alerts and calendar
   events expected to remain?
3. Confirm the farmer ownership rule: can a farmer manage every animal on their farm, or only
   animals they created?
4. Which settings are server-owned (profile, farm, notifications) and which remain device-local?
5. Can farmers edit farm details, or is that a cooperative/admin responsibility?
6. Should the calendar be a sixth bottom tab or an entry from Home and cow detail?
7. Which calendar event types are required for v1? Are recurring events needed?
8. Are in-app reminders enough, or are local/push notifications required? If push, what backend
   or push service is available?
9. Is device-calendar sync required? If yes, what privacy wording and permissions are approved?
10. Must offline users be able to add cattle or calendar events? If yes, both need an explicit
    pending-sync state.
11. Is there a dashboard/analytics endpoint, or should the client aggregate herd pages?
12. Can assessments, alerts and calendar events be paginated/server-windowed? What are the max
    page sizes and date windows?
13. Which charts matter most to farmers (risk trend vs milk/SCC trend vs workload vs alert
    volume)?
14. What are the target devices and the acceptable cold-start time?

---

## 11. Verification notes

- This revision is **documentation only**; no application source files were changed.
- No cattle create/update/delete call exists in `src/`.
- No calendar route, tab, type, service, component or dependency exists.
- There is no chart/graph library in `package.json`.
- Settings today persist name/phone and three notification switches locally only; there is no
  backend profile/farm update and no language/units/calendar preference UI.
- The app is in demo mode (`EXPO_PUBLIC_API_URL=` empty in `.env`), so current data reads are
  local. Perceived slowness in this state should first be re-checked in a production-like build.
