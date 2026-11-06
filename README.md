# Everyday

A mobile-first calorie, macro and training tracker. It installs to the iPhone home screen as a PWA and gets a full web layout on larger screens.

- **Today** has a calorie ring, macro progress, one-tap Trained / Rest day, a Mon–Sun strip, and the day's meals.
- **Add food**: one tap re-logs a recent food, favourite, or saved meal (with Undo). Manual entry uses numeric keyboards.
- **History** shows a month calendar. Any past day can be opened and edited, and each day is measured against the goals that were in force on that day.
- **Analytics** covers 7, 30 and 90 days: daily and weekly intake, protein vs goal, macro balance, training per week, and monthly consistency. Every chart has a table view.
- **Settings** holds goals (kept as history), units, theme, favourites, saved meals, and the account.

## Stack

Next.js 16 (App Router, Cache Components), TypeScript, Tailwind CSS v4, Radix primitives in the shadcn/ui style, Lucide, Recharts, TanStack Query, React Hook Form + Zod, Vitest, and Playwright.

## Getting started

```bash
pnpm install
pnpm dev            # http://localhost:3000
```

The app is a private, on-device tracker. It starts empty and saves your data in this browser's local storage; there are no accounts, sign-in screens, sample entries, or external database.

To try it on a phone, open the network URL that `pnpm dev` prints while the phone is on the same Wi-Fi. In Safari, use Share → Add to Home Screen to install it.

The service-role key is never used, and it should not be added.

## Architecture

```
src/
  app/                 routes (thin), server actions, PWA manifest & icons
  components/          UI by feature: today, food, workout, history, analytics, settings, shell, ui
  lib/domain/          pure business logic (dates, totals, goals, workout, analytics, validation)
  lib/data/            Repository interface + local-storage implementation, query hooks
e2e/                   Playwright smoke tests (375px, 390px, desktop)
```

- UI talks only to `Repository` through the hooks in `lib/data/hooks.ts`. It never touches local storage directly.
- Data is saved locally in the browser after each change. Clearing site data or using a different browser/device starts a separate, empty tracker.
- Mutations are optimistic, roll back on error, and then refetch.
- **Future nutrition database or barcode scanner:** `food_entries.source` and `external_ref` are already in the schema, and `FoodSearchProvider` (`lib/domain/types.ts`) is the interface a lookup service would implement. Its results merge into quick-pick search next to personal history.

### Data model

One local profile holds goal history, food entries, favourites, saved meals, and workouts. No row for a day means it is not logged; rest days never carry a workout type or duration.

### Dates & time zones

Each entry stores `entry_date`, the local calendar day it counts toward, and `logged_at`, the instant it was eaten. "Today" is computed in the profile's time zone (set from the device at onboarding and changeable in Settings), and rolls over at local midnight while the app is open. Calendar arithmetic works on `YYYY-MM-DD` strings, so DST changes never skip or repeat a day.

### Goals history

Saving goals writes a record effective from today. Each past day is measured against the record in force on that date, so changing a goal never rewrites past statistics.

## How the numbers are calculated

- A **logged day** has at least one food entry. A logged day that totals 0 kcal is a real zero. A day with no entries is **missing**: it appears as a gap in charts and is excluded from averages.
- **Averages** (intake, protein, macros) are taken over logged days only. The UI always shows "n of N days logged".
- **Ranges** (7/30/90) cover complete days ending yesterday. Today is added once it's over, so a half-finished day doesn't pull averages down.
- **On target** counts logged days within ±10% of that day's own calorie goal.
- **Protein goal met** counts logged days where protein is at or above that day's goal.
- **Macro balance** is the share of energy from each macro across logged days, using 4/4/9 kcal per gram.
- **Training per week** is trained days ÷ days in range × 7. **Monthly consistency** is trained days ÷ days of that month inside the range.

Totals are summed from stored values (0.1 precision) and rounded only for display.

## Scripts

| Command | What it does |
| --- | --- |
| `pnpm dev` | Dev server |
| `pnpm build` / `pnpm start` | Production build / server (the service worker registers in production only) |
| `pnpm lint` | ESLint |
| `pnpm typecheck` | `tsc --noEmit` |
| `pnpm test` | Vitest unit tests for dates, totals, goals, workouts, analytics, search and validation |
| `pnpm test:e2e` | Playwright smoke tests for the account-only access gate (`pnpm exec playwright install chromium` first) |
