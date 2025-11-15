import "./styles/globals.css"

import { StrictMode } from "react"
import { createRoot } from "react-dom/client"

import { AppNew } from "./app-new"

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AppNew />
  </StrictMode>
)
