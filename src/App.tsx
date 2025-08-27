import React from "react";
import Timer from "./components/Timer";

const App: React.FC = () => {
  return (
    <main className="min-h-screen grid place-items-center text-white">
      <Timer />
    </main>
  );
};

export default App;