# 🍅 Pomodoro Focus
**A production-grade, immersive focus timer built with the latest modern web stack.**
**Live Demo:** [https://pomodoro.vaishakmenon.com](https://pomodoro.vaishakmenon.com)

## 📖 Overview
Pomodoro Focus is a productivity application designed to help users maintain flow state. It combines a customizable Pomodoro timer with an integrated "Media Dock" for ambient soundscapes, allowing users to create their perfect focus environment without leaving the tab. The app features secure authentication, persistent user settings, and a fully unresponsive, mobile-friendly UI.

## ✨ Key Features
*   **Precision Timer:** Custom work/break intervals with audio chimes and visual progress indicators.
*   **Immersive Media Dock:**
    *   **YouTube Integration:** Built-in "Lofi Girl" player with theater mode and distraction-free "Stealth Mode".
    *   **Ambient Mixer:** Mixable soundscapes (Rain, Forest, Cafe, Fireplace) with individual volume controls.
*   **Secure Authentication:** User accounts powered by **Clerk**, allowing users to save their preferences and settings.
*   **Modern UI/UX:** Glassmorphism design, smooth **Framer Motion** animations, and a fully responsive layout using **Tailwind CSS v4**.
*   **Production Security:** Hardened **Content Security Policy (CSP)**, strict SSL enforcement, and server-side validation.

## 🛠️ Tech Stack
*   **Frontend:** [Next.js 15 (App Router)](https://nextjs.org), [React 19](https://react.dev), [TypeScript](https://www.typescriptlang.org)
*   **Styling:** [Tailwind CSS v4](https://tailwindcss.com), [Framer Motion](https://www.framer.com/motion/)
*   **Authentication:** [Clerk](https://clerk.com) (Production Environment)
*   **Database:** [Neon](https://neon.tech) (Serverless Postgres), [Drizzle ORM](https://orm.drizzle.team)
*   **Infrastructure:** Deployed on **Netlify**, DNS managed via **Cloudflare**.

## 🚀 Technical Highlights
*   **Custom CSP Implementation:** Engineered a strict Content Security Policy to securely handle third-party iFrames (YouTube/Spotify) and scripts while preventing XSS attacks.
*   **Subdomain Auth:** Implemented Clerk production auth on a custom subdomain (`clerk.pomodoro...`) to solve third-party cookie restrictions.
*   **React 19 & Next.js 15:** Utilizes the bleeding-edge React Server Components and Next.js Architecture.

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

The app will be available at `http://localhost:3000`

## 🏗️ Project Structure

```
src/
├── app/               # Next.js App Router pages
├── components/        # React components
│   ├── auth/          # Authentication components
│   ├── layout/        # Layout components (MediaDock, etc.)
│   ├── media/         # Media players (YouTube, Ambient)
│   ├── settings/      # Settings panels
│   ├── tasks/         # Task management
│   └── timer/         # Timer logic and UI
├── config/            # Configuration constants
├── db/                # Drizzle ORM schema and connection
├── hooks/             # Custom React hooks
├── lib/               # Utility functions
├── types/             # TypeScript type definitions
└── ui/                # Reusable UI components (buttons, inputs)
```

## 🧪 Testing

The project uses [Vitest](https://vitest.dev/) with React Testing Library.

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch
```

## 🤝 Contributing
Contributions are welcome! Please feel free to submit a Pull Request.

## 📝 License
This project is open source and available under the [MIT License](LICENSE).

---

Built with ❤️ using React, TypeScript, Next.js, and Tailwind CSS
