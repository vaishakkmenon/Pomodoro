# Potential Issues Tracker

This document tracks potential issues identified during code review. Each issue is evaluated and marked as either a real problem to fix or skipped (not an issue).

---

## Issue #1: Race condition in timer tick effect

**Location:** `src/hooks/usePomodoroTimer.ts:47-80`

**Original Concern:** The effect depends on `tab`, but `setTab()` is called inside the interval callback. This could cause the effect to re-run, clearing and restarting the interval, potentially losing or duplicating ticks.

**Analysis:** This is standard React behavior and works correctly:
1. Timer hits 0 → `setTab(next)` called
2. React batches the state updates
3. Component re-renders
4. Effect cleanup runs synchronously (clears old interval)
5. New effect runs (creates new interval)

The `tab` dependency is necessary because the interval callback reads `tab` from the closure to know which phase just completed.

**Verdict:** SKIPPED - Not an issue. Code works as intended.

---

## Issue #2: Catch-up prompt validation for paused sessions

**Location:** `src/components/timer/Timer.tsx:36-48`

**Original Concern:** If the timer was paused (`running: false`), the catch-up prompt won't show. A user who paused and left overnight wouldn't see a resume option.

**Analysis:** This is correct behavior:
1. Paused timer = intentional stop. The user explicitly paused, so the timer is exactly where they left it.
2. Catch-up is for running timers only - when the browser closed while the timer was active and elapsed time needs to be accounted for.
3. Paused sessions restore correctly via hydration with the saved `tab` and `seconds` values.

**Verdict:** SKIPPED - Intentional and correct behavior.

---

## Issue #3: Persistence logic split across 3 files

**Location:** Multiple files (`usePomodoroTimer.ts`, `usePersistence.ts`, `Timer.tsx`)

**Original Concern:** Persistence logic is spread across 3 files, which could make maintenance harder if the saved state shape changes.

**Analysis:** The separation is intentional and serves different purposes:
- `usePomodoroTimer.ts` - Sync read before render (timer needs initial values synchronously)
- `usePersistence.ts` - Write lifecycle (centralized save logic with throttling)
- `Timer.tsx` - UI-specific catch-up check (only needs `running` + `savedAt` fields)

Key safeguards are already centralized:
- `TimerSavedState` type is in `src/types/timer.ts`
- `isValidSavedState` validation is shared
- `PERSIST_KEY` is exported from one place

**Verdict:** SKIPPED - Not causing issues currently. Revisit for cleanup if we add more features that need timer state access or if the saved state shape changes frequently.

---

## Issue #4: Type assertion `as unknown as number`

**Location:** `src/hooks/usePomodoroTimer.ts:72`

**Original Concern:** `as unknown as number` is a double type assertion that bypasses TypeScript's type system, which is a code smell.

**Analysis:** The cast was unnecessary. The `tsconfig.app.json` is correctly configured with only DOM types (`"types": []`), so `window.setInterval` returns `number` directly without needing any cast.

**Fix:** Removed the `as unknown as number` cast.

**Verdict:** FIXED

---

## Issue #5: Double re-render from focusIdx state

**Location:** `src/components/timer/Timer.tsx:67-70`

**Original Concern:** `focusIdx` appears to be derived from `tab`, but is managed as separate state. When `tab` changes, an effect updates `focusIdx`, causing a second render.

**Analysis:** `focusIdx` is NOT purely derived from `tab`. They serve different purposes:
- `tab` = Which tab is **selected/active** (study, short, long)
- `focusIdx` = Which tab button has **keyboard focus** for navigation

The keyboard navigation (arrow keys) changes `focusIdx` independently without changing `tab`. For example:
1. User is on "study" tab (`tab = "study"`, `focusIdx = 0`)
2. User presses → arrow key → `focusIdx = 1` (focus moves to "short" button)
3. `tab` is still "study" - nothing selected yet
4. User presses Enter → now `tab = "short"`

The effect that syncs `focusIdx` to `tab` is needed to reset the focus position when the tab changes externally (e.g., timer completing a phase).

**Verdict:** SKIPPED - Intentional design for accessibility/keyboard navigation. Not derived state.

---

## Issue #6: Event listener churn in useStoredState

**Location:** `src/hooks/usePersistence.ts:154-164`

**Original Concern:** The effect depends on `[key, value]`. Every time `value` changes, event listeners are removed and re-added, causing unnecessary churn for frequently-updating values.

**Analysis:** While `useStoredState` is not currently used in production code (only tests), fixing this future-proofs the utility for high-frequency updates. The main `usePersistence` hook already uses a ref pattern to avoid this issue.

**Fix:** Applied the same ref pattern:
1. Added `valueRef` to store current value
2. Effect keeps ref in sync with value
3. Event listeners read from `valueRef` instead of closing over `value`
4. Effect now only depends on `[key]`, not `[key, value]`

**Verdict:** FIXED - Future-proofed for high-frequency updates

---

## Issue #7: Missing accessibility in CatchupToast

**Location:** `src/components/timer/CatchupToast.tsx`

**Original Concern:** The toast container had no ARIA attributes, so screen readers wouldn't announce it when it appears.

**Analysis:** Toast notifications should use `role="alert"` to be announced by screen readers. The buttons ("Apply", "Keep time") are already reasonably descriptive.

**Fix:** Added `role="alert"` to the toast container div.

**Verdict:** FIXED - Screen readers will now announce the catch-up toast

---

## Issue #8: Dead code in PhaseAccent.ts

**Location:** `src/ui/PhaseAccent.ts`

**Original Concern:** Functions `phaseBaseBg`, `dangerStates`, and `phaseDanger` were reported as unused.

**Analysis:** These functions only exist in `CODE_REVIEW.md` as a historical note - they were already removed from the actual code in a previous cleanup. The current `PhaseAccent.ts` only contains `phaseAccent`, which is actively used by `Pill.ts`.

**Verdict:** SKIPPED - Already cleaned up, no dead code exists

---

## Issue #9: Inconsistent JSON parsing patterns

**Location:** Multiple files (`usePomodoroTimer.ts`, `Timer.tsx`, `usePersistence.ts`)

**Original Concern:** Different files used different patterns for JSON parsing - some with try-catch, some with type assertions, some with validators.

**Analysis:** Consolidated all JSON parsing to use a single `safeParseJSON` utility for consistency and clarity.

**Fix:**
1. Created `src/lib/json.ts` with `safeParseJSON<T>(raw, validate?)` utility
2. Added `CatchupCheckState` type and `isValidCatchupState` type guard to `src/types/timer.ts`
3. Updated `usePomodoroTimer.ts` to use `safeParseJSON` with `isValidSavedState`
4. Updated `Timer.tsx` to use `safeParseJSON` with `isValidCatchupState`
5. Updated `usePersistence.ts` to use `safeParseJSON` in both hydration and `useStoredState`

**Verdict:** FIXED - All JSON parsing now uses the same utility

---

## Issue #10: Silent error suppression (catch {} blocks)

**Location:** Multiple files (`useAudio.ts`, `usePersistence.ts`, `lib/json.ts`)

**Original Concern:** Silent `catch {}` blocks make debugging harder by suppressing errors.

**Analysis:** These are all intentional graceful degradation patterns for expected edge cases:
- **JSON parsing** - Invalid data returns null, caller handles it
- **Audio playback** - Autoplay restrictions or CORS shouldn't crash the app
- **localStorage** - Quota exceeded, private browsing, disabled - app should still work

These failures are:
- Expected in certain environments (Safari autoplay, private browsing)
- Handled correctly (returns null/default, continues without feature)
- Not actionable by the user or developer
- Would just create console noise if logged

**Verdict:** SKIPPED - Intentional graceful degradation, not hidden bugs

---

## Issue #11: Ref mutation pattern for completedStudies

**Location:** `src/hooks/usePomodoroTimer.ts:38`

**Original Concern:** Using a ref instead of state for `completedStudies` could cause stale closures and makes testing harder.

**Analysis:** The ref is intentional:
- No UI displays this value - it's only used internally to calculate long vs short break
- Avoids extra re-renders on every study completion
- Persistence works correctly because when `completedStudies` changes, `tab` and `secondsLeft` also change, which triggers the persistence effect

**Potential fragility:** If someone modified the logic to update `completedStudies` without changing tab/seconds, persistence would break.

**Fix:** Added a comment documenting the intentional coupling and warning future developers to ensure persistence still works if they modify the pattern.

**Verdict:** FIXED - Added documentation comment to prevent future issues

---

## Issue #12: Missing test coverage gaps

**Location:** Multiple files

**Original Concern:** Several files lacked direct test coverage, particularly new utilities and components.

**Analysis:** Identified files without tests and created comprehensive test suites.

**Fix:** Added test files for:
1. `lib/json.test.ts` - Tests for `safeParseJSON` utility
2. `types/timer.test.ts` - Tests for `isValidSavedState` and `isValidCatchupState` type guards
3. `components/timer/CatchupToast.test.tsx` - Tests for catch-up toast component
4. `components/timer/TimeDisplay.test.tsx` - Tests for time display with editing functionality
5. `components/timer/TimerControls.test.tsx` - Tests for timer control buttons
6. `ui/cx.test.ts` - Tests for class name utility
7. `ui/PhaseAccent.test.ts` - Tests for phase accent classes
8. `ui/Pill.test.ts` - Tests for pill class composition

**Verdict:** FIXED - Added 8 new test files covering all critical functionality

---

## Summary

| Issue | Status | Action Needed |
|-------|--------|---------------|
| #1 Timer tick race condition | SKIPPED | None |
| #2 Catch-up validation | SKIPPED | None |
| #3 Persistence split | SKIPPED | Revisit if needed |
| #4 Type assertion | FIXED | Removed unnecessary cast |
| #5 focusIdx re-render | SKIPPED | Intentional for keyboard nav |
| #6 Event listener churn | FIXED | Added ref pattern |
| #7 Accessibility | FIXED | Added role="alert" |
| #8 Dead code | SKIPPED | Already cleaned up |
| #9 JSON parsing | FIXED | Created safeParseJSON utility |
| #10 Error suppression | SKIPPED | Intentional graceful degradation |
| #11 Ref mutation | FIXED | Added documentation comment |
| #12 Test coverage | FIXED | Added 8 new test files |
