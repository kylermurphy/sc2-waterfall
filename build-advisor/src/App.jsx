import { BrowserRouter, Routes, Route } from "react-router-dom";
import BuildAdvisor from "./BuildAdvisor";
import { BuildJsonTutorial } from "./pages/BuildJsonTutorial";

export default function App() {
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <Routes>
      <Route path="/" element={<BuildAdvisor />} />
      <Route path="/tutorial" element={<BuildJsonTutorial />} />
      </Routes>
    </BrowserRouter>
  );
}