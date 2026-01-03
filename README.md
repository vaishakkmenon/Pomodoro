# 🍅 Pomodoro Timer

A modern, feature-rich Pomodoro timer built with React, TypeScript, and Tailwind CSS. Designed for productivity with a beautiful dark UI and full keyboard accessibility.

![Pomodoro Timer](https://img.shields.io/badge/React-19-blue) ![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue) ![Vite](https://img.shields.io/badge/Vite-6-purple) ![Tailwind](https://img.shields.io/badge/Tailwind-4-cyan)

## ✨ Features

- **Three timer modes**: Study (25 min), Short Break (5 min), Long Break (15 min)
- **Automatic transitions**: Timer automatically moves to the next phase
- **Long break scheduling**: Every 4th study session triggers a long break
- **Click-to-edit time**: Flexible input supports `MM:SS`, `MMSS`, or just minutes
- **Catch-up prompt**: Resume where you left off if you were away
- **Persistent state**: Timer survives page refreshes and browser restarts
- **Audio chime**: Notification sound when study sessions complete
- **Keyboard accessible**: Full arrow key navigation between tabs and controls
- **Dark mode**: Beautiful glassmorphic dark UI

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- npm or pnpm

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/pomodoro.git
cd pomodoro

# Install dependencies
npm install

# Start development server
npm run dev
```

The app will be available at `http://localhost:5173`

### Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server with HMR |
| `npm run build` | Build for production |
| `npm run preview` | Preview production build locally |
| `npm run test` | Run tests with Vitest |
| `npm run test:watch` | Run tests in watch mode |
| `npm run lint` | Run ESLint |

## 🏗️ Project Structure

```
src/
├── components/
│   ├── timer/
│   │   ├── Timer.tsx          # Main timer component
│   │   ├── SidebarTabs.tsx    # Session mode tabs
│   │   ├── TimeDisplay.tsx    # Editable time display
│   │   ├── TimerControls.tsx  # Start/Pause/Reset buttons
│   │   └── CatchupToast.tsx   # Catch-up notification
│   └── ui/
│       └── PillButton.tsx     # Styled button component
├── hooks/
│   ├── usePomodoroTimer.ts    # Core timer logic
│   ├── usePersistence.ts      # localStorage persistence
│   ├── useAudio.ts            # Audio playback
│   └── useChime.ts            # Chime sound wrapper
├── config/
│   └── timer.ts               # Timer configuration & constants
├── lib/
│   └── time.ts                # Time formatting & parsing utilities
├── types/
│   └── timer.ts               # Shared TypeScript types
└── ui/
    ├── cx.ts                  # Class name utility
    ├── Pill.ts                # Pill styling
    ├── PillBase.ts            # Base pill styles
    ├── PhaseAccent.ts         # Phase-based accent colors
    └── types.ts               # UI type definitions
```

## 🧪 Testing

The project uses [Vitest](https://vitest.dev/) with React Testing Library.

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with UI
npm run test:ui
```

### Test Coverage

| Module | Tests |
|--------|-------|
| Time utilities (`time.test.ts`) | 22 |
| Pomodoro timer hook | 8 |
| Persistence hook | 11 |
| Stored state hook | 8 |
| Audio hook | 8 |
| Chime hook | 5 |
| PillButton component | 9 |
| SidebarTabs component | 11 |
| Timer component | 8 |
| **Total** | **90** |

## ⚙️ Configuration

Default timer durations can be modified in `src/config/timer.ts`:

```typescript
export const DURATIONS: Record<Tab, number> = {
    study: 25 * 60,  // 25 minutes
    short: 5 * 60,   // 5 minutes
    long: 15 * 60,   // 15 minutes
};

export const LONG_EVERY = 4; // Long break every N study sessions
```

## 🛣️ Roadmap

See [IMPLEMENTATION_PLAN.md](./IMPLEMENTATION_PLAN.md) for planned features:

- [ ] Settings panel for custom durations
- [ ] Browser notifications
- [ ] Task management with pomodoro estimates
- [ ] Ambient sounds (Cafe, Cozy, Nature themes)
- [ ] Animated progress bar (sun/moon journey)
- [ ] Session planning calculator
- [ ] Dynamic backgrounds

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📝 License

This project is open source and available under the [MIT License](LICENSE).

---

Built with ❤️ using React, TypeScript, Vite, and Tailwind CSS
