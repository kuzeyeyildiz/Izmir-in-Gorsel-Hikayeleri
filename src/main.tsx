import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import "maplibre-gl/dist/maplibre-gl.css";
// @ts-ignore: no declaration file for './router'
import { router } from "./router";
import { RouterProvider } from "react-router-dom";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>
);
