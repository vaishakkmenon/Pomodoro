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

### 2.2 Session Planning Calculator
**Priority**: Medium | **Effort**: Low

Before starting, user can:
1. See total pomodoros needed for all tasks
2. Calculate end time based on current time + session durations
3. Optionally set a "target end time" and see if tasks fit

**Files**:
- `src/components/planner/SessionPlanner.tsx` [NEW]
- `src/lib/timeCalculations.ts` [NEW]

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

### 4.1 Sound Theme System
**Priority**: High | **Effort**: Medium

**Theme Structure**:
```typescript
type SoundTheme = {
  id: string;
  name: string;
  icon: string;
  sounds: {
    name: string;
    src: string;
    defaultVolume: number;
  }[];
};
```

**Preset Themes**:

| Theme | Sounds |
|-------|--------|
| ☕ Cafe | Coffee machine, quiet chatter, cups clinking |
| 🌧 Cozy | Rain on window, fireplace crackle, thunder (distant) |
| 🌲 Nature | Forest birds, gentle stream, wind through trees |
| 📚 Library | Page turning, quiet typing, clock ticking |
| 🌊 Ocean | Waves, seagulls, beach ambiance |

**Files to create**:
- `src/components/sounds/SoundMixer.tsx` [NEW] — individual volume sliders
- `src/components/sounds/ThemeSelector.tsx` [NEW] — dropdown to pick theme
- `src/hooks/useAmbientSounds.ts` [NEW]
- `src/config/soundThemes.ts` [NEW]
- `public/sounds/ambient/` [NEW] — audio files (source from freesound.org, use CC0 licensed)

**Storage key**: `pomodoro:sounds:v1`

**UI Concept**:
```
┌─────────────────────────────┐
│ 🎵 Ambient Sounds           │
├─────────────────────────────┤
│ Theme: [☕ Cafe        ▾]   │
├─────────────────────────────┤
│ Coffee Machine   ████░░ 60% │
│ Background Chat  ██░░░░ 30% │
│ Cups & Plates    ███░░░ 50% │
├─────────────────────────────┤
│ [Master Volume]  ██████ 80% │
└─────────────────────────────┘
```

---

### 4.2 YouTube Embed (Optional Background)
**Priority**: Low | **Effort**: Low

- User pastes a YouTube URL (lo-fi streams, study music)
- Embed as background audio with IFrame API
- Respects master volume

**Files**:
- `src/components/sounds/YouTubePlayer.tsx` [NEW]

**Note**: YouTube embeds can't be fully controlled (ads, availability). This is a "nice to have" feature.

---

## Phase 5: Visual Polish

### 5.1 Dynamic Backgrounds
**Priority**: Medium | **Effort**: Medium

Backgrounds that change based on:
- Time of day (morning/afternoon/evening/night gradients)
- Current phase (warm colors for study, cool for breaks)

**Implementation**:
- CSS custom properties for background
- Smooth transitions between states
- Optional: Parallax effect with layered SVGs

**Files**:
- `src/components/background/DynamicBackground.tsx` [NEW]
- `src/hooks/useTimeOfDay.ts` [NEW]

---

### 5.2 Theme Selection (Non-Account Based)
**Priority**: Low | **Effort**: Low

Preset visual themes stored in localStorage:
- Default Dark
- Warm Sunset
- Ocean Blue
- Forest Green
- Minimal Light

**Files**:
- `src/config/visualThemes.ts` [NEW]
- Update `index.css` with theme CSS variables

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
