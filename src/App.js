import React from "react";
import { HashRouter, Routes, Route } from "react-router-dom";
import LoginPage from "./pages/LoginPage";
import SuccessPage from "./pages/SuccessPage";

function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<LoginPage />} />
        <Route path="/success" element={<SuccessPage />} />
      </Routes>
    </HashRouter>
  );
}

export default App;
