import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.jsx";
import reducer, { initialState } from "./Componets/ContextApi/reducer";
import { StateProvider } from "./Componets/ContextApi/StateProvider";
import { SpeedInsights } from "@vercel/speed-insights/react";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <StateProvider initialState={initialState} reducer={reducer}>
      <App />
      <SpeedInsights />
    </StateProvider>
  </StrictMode>
);