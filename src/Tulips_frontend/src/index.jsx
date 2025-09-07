import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./main.css";

window.addEventListener("error", e => {
  document.body.innerHTML = `<div style="font-family:sans-serif;margin:2em;font-size:20px;color:#bf1023;">App Error: ${(e.error || e.message || e).toString()}</div>`;
});

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App/>
  </React.StrictMode>
);
