# Pomodoro Codebase Deep Dive - Issues & Recommendations

> **Date**: December 28, 2024  
> **Purpose**: Identify structural issues, bugs, and areas needing improvement before adding new features.

---

## 🔴 Critical Issues

### 1. Leftover Task File (Orphaned Code)
**File**: `src/components/ui/TaskTypes.ts`

We deleted `src/components/tasks/TaskTypes.ts` but there's another copy in `src/components/ui/TaskTypes.ts` that wasn't removed. This file is not referenced anywhere and should be deleted.

**Action**: Delete `src/components/ui/TaskTypes.ts`

---

### 2. Dead Code in PhaseAccent.ts
**File**: `src/ui/PhaseAccent.ts` (lines 3-7)

```typescript
const phaseBaseBg = (phase: Phase) =>
  phase === "focus" ? "bg-emerald-500/10" : "bg-sky-500/10";

const dangerStates =
  "hover:bg-red-500/20 active:bg-red-500/25 focus-visible:ring-red-500/40";
```

These are defined but only `phaseDanger` uses them—and `phaseDanger` itself is **never called** anywhere in the codebase. This is dead code.

**Action**: Remove `phaseBaseBg`, `dangerStates`, and `phaseDanger` function.

---

### 3. Hydration Test Has Wrong Expectation
**File**: `src/hooks/usePomodoroTimer.hydration.test.tsx` (line 24)

```typescript
expect(result.current.isRunning).toBe(true);
```

But `usePomodoroTimer` explicitly sets `initialRunning = false` on line 45:
```typescript
const initialRunning = false; // <— always pause on load
```

The test expects `isRunning` to be `true` after hydration, but the code intentionally forces it to `false`. **This test will fail.**

**Action**: Fix test to expect `isRunning` to be `false`, or reconsider the design decision.

---

## 🟡 Structural Issues

### 4. Duplicated `Saved` Type Definition
**Problem**: The `Saved` type is defined in TWO places with slightly different shapes:

**`usePersistence.ts` (line 6)**:
```typescript
export type Saved = { tab: Tab; seconds: number; running: boolean; savedAt?: number };
```

**`usePomodoroTimer.ts` (lines 13-19)**:
```typescript
type Saved = {
    tab: Tab;
    seconds: number;
    running: boolean;
    completedStudies?: number;  // <-- This field exists here but NOT in usePersistence
    savedAt?: number;
};
```

The persistence layer doesn't know about `completedStudies`, so it's never saved/restored properly. If you close the browser mid-session, `completedStudies` is lost.

**Action**: Consolidate into a single `Saved` type exported from one file, include `completedStudies`.

---

### 5. Tight Coupling Between Timer Hook and Persistence
**Problem**: `usePomodoroTimer` reads from `localStorage` directly via `readSaved()`, but saving is done by `usePersistence`. This split creates:
- Two different validation logics (`readSaved` vs `isSaved`)
- The timer hook depends on `PERSIST_KEY` from persistence hook (circular-ish dependency)
- Harder to test timer hook in isolation

**Action**: Either:
- A) Have `usePersistence` handle ALL localStorage I/O (read + write), pass initial state to timer hook
- B) Have `usePomodoroTimer` handle ALL persistence internally

---

### 6. Inconsistent Naming: `seconds` vs `secondsLeft`
**Problem**: 
- Saved data uses `seconds`
- Hook returns `secondsLeft`
- This causes confusion when reading code

**Action**: Standardize on one name. Suggest `secondsLeft` everywhere since it's more descriptive.

---

### 7. Timer.tsx is Too Large (410 lines)
**Problem**: Single component handling:
- Timer display
- Time editing
- Catch-up toast
- Keyboard navigation (tabs + panel)
- Focus management

This violates single responsibility and makes testing difficult.

**Action**: Extract into smaller components:
- `TimeDisplay.tsx` (clickable time + edit input)
- `CatchupToast.tsx` (catch-up prompt)
- `TimerControls.tsx` (Start/Pause/Reset buttons)

---

## 🟡 Potential Bugs

### 8. Race Condition in Catch-up Calculation
**File**: `Timer.tsx` (lines 382-391)

```typescript
onClick={() => {
    try {
        const raw = localStorage.getItem(PERSIST_KEY);
        const s = raw ? (JSON.parse(raw) as { savedAt?: number }) : {};
        const nowElapsed = s?.savedAt ? Math.floor((Date.now() - s.savedAt) / 1000) : catchupSec;
        applyCatchup(nowElapsed ?? catchupSec);
    } catch {
        applyCatchup(catchupSec);
    }
    setCatchupSec(null);
}}
```

Between showing the toast and clicking "Apply", the persistence hook may have already updated `savedAt` to a new value (because state changes trigger saves). This could cause incorrect elapsed time calculation.

**Action**: Capture `savedAt` once when the toast is shown, not when clicked.

---

### 9. `applyCatchup` Sets Running Without Checking Done State
**File**: `usePomodoroTimer.ts` (line 154)

```typescript
setIsRunning(true);
```

If catch-up calculation ends with `secondsLeft = 0`, the timer will be "running" but immediately stuck at 0.

**Action**: Add check: only start if `rem > 0`.

---

### 10. Throttle Logic Creates Stale Data
**File**: `usePersistence.ts` (lines 73-77)

```typescript
if (opts.saveThrottleMs && opts.saveThrottleMs > 0) {
    const id = window.setTimeout(() => {
        try { localStorage.setItem(storageKey, JSON.stringify(saved)); } catch { }
    }, opts.saveThrottleMs);
    return () => clearTimeout(id);
}
```

The `saved` object is captured at effect run time. If throttle is 1000ms and user clicks Pause at 999ms, the saved state will have `running: true` (stale). The cleanup clears the timeout, so the correct state is never saved.

**Action**: Use `useRef` to always capture latest values, or debounce instead of timeout.

---

## 🔵 Code Quality Issues

### 11. Magic Numbers
**File**: `Timer.tsx`
```typescript
const MIN_ELAPSED = 10;        // show if away ≥ 10s
const MAX_ELAPSED = 10 * 60;   // and ≤ 10 minutes
```

**File**: `usePomodoroTimer.ts`
```typescript
const clamped = Math.max(0, Math.min(24 * 60 * 60, Math.floor(n)));
```

These should be in config or constants.

**Action**: Move to `src/config/timer.ts`:
```typescript
export const CATCHUP_MIN_SECONDS = 10;
export const CATCHUP_MAX_SECONDS = 600;
export const MAX_TIMER_SECONDS = 86400;
```

---

### 12. Type Assertions in Tests
**File**: `usePomodoroTimer.core.test.tsx`
```typescript
usePomodoroTimer({ durations: tiny as any, longEvery: 99, onComplete })
```

Using `as any` defeats TypeScript's purpose.

**Action**: Fix the types or create a proper test fixture that matches the expected shape.

---

### 13. Event Handler Adds/Removes on Every State Change
**File**: `usePersistence.ts` (lines 84-111)

The `pagehide`/`visibilitychange`/`beforeunload` listeners are removed and re-added every time `api.tab`, `api.secondsLeft`, or `api.isRunning` changes. This happens every second during timer tick.

**Action**: Use `useRef` to store current values and a stable callback:
```typescript
const stateRef = useRef({ tab: api.tab, secondsLeft: api.secondsLeft, isRunning: api.isRunning });
useEffect(() => {
    stateRef.current = { tab: api.tab, secondsLeft: api.secondsLeft, isRunning: api.isRunning };
});
// Then listener never needs to be re-attached
```

---

### 14. Unused Import Check
**File**: `src/ui/PhaseAccent.ts`
```typescript
import type { Accent, Phase } from "./types";
```

`Phase` is only used in dead code (`phaseDanger`). If dead code is removed, `Phase` import is unused.

---

### 15. PillButton `displayName` Missing
**File**: `src/components/ui/PillButton.tsx`

`forwardRef` components should have a `displayName` for better debugging:
```typescript
PillButton.displayName = "PillButton";
```

---

## 🔵 Missing Tests

| Component/Hook | Status |
|----------------|--------|
| `usePomodoroTimer` | ✅ Has tests (but hydration test has bug) |
| `usePersistence` | ❌ No tests |
| `useStoredState` | ❌ No tests |
| `useAudio` | ❌ No tests |
| `useChime` | ❌ No tests |
| `Timer.tsx` | ❌ No tests |
| `SidebarTabs.tsx` | ❌ No tests |
| `PillButton.tsx` | ❌ No tests |
| `formatTime` | ❌ No tests |
| `parseFlexibleTime` | ❌ No tests (should be extracted and tested) |

---

## 🔵 Documentation Issues

### 16. README is Boilerplate
The README is still the default Vite template. Should include:
- What the app does
- How to run locally
- How to build
- Feature list
- Screenshots

---

## 📋 Recommended Cleanup Order

| Priority | Task | Effort |
|----------|------|--------|
| 1 | Delete orphaned `TaskTypes.ts` | 1 min |
| 2 | Remove dead code in `PhaseAccent.ts` | 5 min |
| 3 | Fix hydration test | 5 min |
| 4 | Consolidate `Saved` type | 15 min |
| 5 | Add `displayName` to PillButton | 1 min |
| 6 | Extract magic numbers to config | 10 min |
| 7 | Fix event listener churn in `usePersistence` | 20 min |
| 8 | Fix catch-up race condition | 10 min |
| 9 | Fix `applyCatchup` done-state bug | 5 min |
| 10 | Extract `TimeDisplay` from Timer | 30 min |
| 11 | Extract `CatchupToast` from Timer | 20 min |
| 12 | Write tests for `formatTime` | 10 min |
| 13 | Write tests for `parseFlexibleTime` | 15 min |
| 14 | Update README | 20 min |

---

## Summary

**Good news**: The core timer logic is solid. The issues are mostly:
- Leftover/dead code from previous iterations
- Structural coupling that will make future features harder
- Missing tests for edge cases
- Performance inefficiencies (listener churn)

**Recommendation**: Address items 1-6 immediately (quick wins), then tackle the structural issues (7-11) before starting new features. This will give you a clean, tested foundation.

Want me to start fixing these issues?
