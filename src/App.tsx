import React from "react";

const App: React.FC = () => {
  return (
    <main className="min-h-screen grid place-items-center text-white">
      <div className="max-w-[1280px] mx-auto p-8 text-center">
        <h1 className="text-3xl font-bold mb-4">Tailwind v4 + Vite + React + TS 🎉</h1>
        <p className="text-lg text-gray-300">
          If this text is light gray on a dark background, Tailwind is working.
        </p>
      </div>
    </main>
  );
};

export default App;