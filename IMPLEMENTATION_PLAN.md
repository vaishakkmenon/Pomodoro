# Pomodoro App Implementation Plan

> **Goal**: Build a delightful, feature-rich Pomodoro timer with ambient sounds, task management, and animated progress—all without a backend.

---

## Phase 1: Core Enhancements (Foundation)

### 1.1 Settings Panel
**Priority**: High | **Effort**: Medium

Create a settings modal/drawer for user customization:
- Custom timer durations (study, short break, long break)
- Long break interval (every N pomodoros)
- Sound volume controls
- Enable/disable chime notifications

**Files to create/modify**:
- `src/components/settings/SettingsModal.tsx` [NEW]
- `src/hooks/useSettings.ts` [NEW] — stored in localStorage
- `src/config/timer.ts` — make durations dynamic

**Storage key**: `pomodoro:settings:v1`

---

### 1.2 Browser Notifications
**Priority**: High | **Effort**: Low

Request permission on first start, send notifications when:
- Study session completes
- Break ends

**Files to modify**:
- `src/hooks/usePomodoroTimer.ts` — add notification trigger in `onComplete`
- `src/lib/notifications.ts` [NEW]

---

## Phase 2: Task Management

### 2.1 Task List with Pomodoro Estimates
**Priority**: High | **Effort**: Medium

```
┌─────────────────────────────────────┐
│ Today's Tasks                       │
├─────────────────────────────────────┤
│ ☐ Write documentation    2/4 🍅    │
│ ☐ Review PR              0/2 🍅    │
│ ☑ Fix login bug          1/1 🍅    │
├─────────────────────────────────────┤
│ Est. completion: 2:45 PM            │
│ Total: 5 pomodoros remaining        │
└─────────────────────────────────────┘
```

**Features**:
- Add/edit/delete tasks
- Estimated pomodoros per task
- Track completed pomodoros per task
- Check off completed tasks
- Calculate estimated completion time

**Files to create**:
- `src/components/tasks/TaskList.tsx` [NEW]
- `src/components/tasks/TaskItem.tsx` [NEW]
- `src/components/tasks/AddTaskForm.tsx` [NEW]
- `src/hooks/useTasks.ts` [NEW]
- `src/types/task.ts` [NEW]

**Storage key**: `pomodoro:tasks:v1`

**Task Type**:
```typescript
type Task = {
  id: string;
  title: string;
  estimatedPomodoros: number;
  completedPomodoros: number;
  done: boolean;
  createdAt: number;
};
```

---

### 2.2 Session Planning Calculator [COMPLETED]
**Priority**: Medium | **Effort**: Low

**Status**: Implemented directly in `TaskList.tsx`.
- **Completed**: Total pomodoros needed calculation.
- **Completed**: End time calculation based on incomplete tasks.
- **Skipped**: "Target end time" comparison (User deemed unnecessary).

---

## Phase 3: Animated Progress

### 3.1 Progress Bar with Animation
**Priority**: Medium | **Effort**: Medium-High

Options (pick one or make it selectable):

**Option A: Sun/Moon Journey**
- Sun rises during study sessions, sets during breaks
- Moon appears during long breaks
- Smooth CSS animation tied to timer percentage

**Option B: Walking Character**
- Small character walks along a path
- Reaches destination when timer completes
- Different backgrounds for study vs break

**Option C: Simple Gradient Bar**
- Animated gradient progress bar
- Color shifts based on phase (emerald for study, sky for break)

**Implementation**:
- `src/components/progress/ProgressAnimation.tsx` [NEW]
- `src/components/progress/SunMoonProgress.tsx` [NEW] (if Option A)
- Use `secondsLeft / totalDuration` for percentage

---

### 3.2 Congrats Celebration
**Priority**: Low | **Effort**: Low

When a study session completes:
- Confetti animation (use `canvas-confetti` package)
- Encouraging message ("Great work! Time for a break 🎉")
- Sound effect option

**Files**:
- `src/components/ui/Celebration.tsx` [NEW]

---

## Phase 4: Ambient Sounds

### 4.1 Sound Theme System [SKIPPED]
**Status**: Skipped by user request.

---

### 4.2 YouTube Embed (Media Dock) [COMPLETED]
**Status**: Implemented as the **Media Dock**.

---

## Phase 5: Visual Polish

### 5.1 Dynamic Backgrounds [SKIPPED]
**Status**: Skipped by user request.

### 5.2 Theme Selection System
**Priority**: Medium | **Effort**: Medium

**Tiers**:
1.  **Guest / Everyone**: Access to predefined solid color themes (Midnight, Ocean, Forest, Sunset, Lavender).
2.  **Signed In**: Access to **Custom Color Palette** builder (choose primary/background colors).
3.  **Premium**: Access to **Custom Background Images** (upload/URL).

**Technical Approach**:
- **State**: `useTheme` hook to manage current selection + derived CSS variables.
- **Storage**: `localStorage` `pomodoro:theme:v1` (synced to DB later for users).
- **UI**: New tab in Settings Modal for "Appearance".

**Files**:
- `src/types/theme.ts` [NEW]
- `src/config/themes.ts` [NEW] (Presets)
- `src/hooks/useTheme.ts` [NEW]
- `src/components/settings/ThemeSelector.tsx` [NEW]

---

## File Structure After Implementation

```
src/
├── components/
│   ├── timer/
│   │   ├── Timer.tsx
│   │   └── SidebarTabs.tsx
│   ├── tasks/
│   │   ├── TaskList.tsx
│   │   ├── TaskItem.tsx
│   │   └── AddTaskForm.tsx
│   ├── sounds/
│   │   ├── SoundMixer.tsx
│   │   ├── ThemeSelector.tsx
│   │   └── YouTubePlayer.tsx
│   ├── progress/
│   │   ├── ProgressAnimation.tsx
│   │   └── SunMoonProgress.tsx
│   ├── settings/
│   │   └── SettingsModal.tsx
│   ├── planner/
│   │   └── SessionPlanner.tsx
│   ├── background/
│   │   └── DynamicBackground.tsx
│   └── ui/
│       ├── PillButton.tsx
│       └── Celebration.tsx
├── hooks/
│   ├── usePomodoroTimer.ts
│   ├── usePersistence.ts
│   ├── useAudio.ts
│   ├── useTasks.ts [NEW]
│   ├── useSettings.ts [NEW]
│   ├── useAmbientSounds.ts [NEW]
│   └── useTimeOfDay.ts [NEW]
├── config/
│   ├── timer.ts
│   ├── soundThemes.ts [NEW]
│   └── visualThemes.ts [NEW]
├── lib/
│   ├── time.ts
│   ├── notifications.ts [NEW]
│   └── timeCalculations.ts [NEW]
└── types/
    └── task.ts [NEW]
```

---

## Implementation Order (Recommended)

| Order | Feature | Reason |
|-------|---------|--------|
| 1 | Settings Panel | Foundation for customization |
| 2 | Browser Notifications | Quick win, high value |
| 3 | Task Management | Core feature request |
| 4 | Ambient Sounds | High user demand |
| 5 | Progress Animation | Visual delight |
| 6 | Session Planner | Builds on tasks |
| 7 | Congrats Celebration | Polish |
| 8 | Dynamic Backgrounds | Polish |
| 9 | YouTube Embed | Nice to have |

---

## localStorage Keys Summary

| Key | Purpose |
|-----|---------|
| `pomodoro:v1` | Timer state (existing) |
| `pomodoro:settings:v1` | User preferences |
| `pomodoro:tasks:v1` | Task list |
| `pomodoro:sounds:v1` | Sound preferences & volumes |
| `pomodoro:theme:v1` | Visual theme selection |

---

## Future Considerations (Backend Required)

These features are **out of scope** for the localStorage MVP but could be added later with Supabase:

- [ ] User accounts & cross-device sync
- [ ] Account-based custom backgrounds (user uploads)
- [ ] Spotify integration (OAuth)
- [ ] Statistics & analytics dashboard
- [ ] Social features (study groups, leaderboards)

---

## Audio Assets Needed

Source from [Freesound.org](https://freesound.org) (CC0 license) or [Pixabay](https://pixabay.com/sound-effects/):

### Cafe Theme
- [ ] Coffee machine / espresso
- [ ] Quiet cafe chatter
- [ ] Cups and plates clinking
- [ ] Cash register (subtle)

### Cozy Theme
- [ ] Rain on window
- [ ] Fireplace crackling
- [ ] Distant thunder
- [ ] Wind outside

### Nature Theme
- [ ] Forest birds
- [ ] Gentle stream
- [ ] Wind through leaves

### Library Theme
- [ ] Page turning
- [ ] Quiet keyboard typing
- [ ] Clock ticking
- [ ] Pencil writing

### Ocean Theme
- [ ] Ocean waves
- [ ] Seagulls
- [ ] Beach ambiance

---

## Next Steps

1. Review this plan and adjust priorities
2. Start with Phase 1 (Settings + Notifications)
3. Build iteratively, testing each feature before moving on
4. Add tests for new hooks and critical components

Ready to begin implementation when you are! 🚀
