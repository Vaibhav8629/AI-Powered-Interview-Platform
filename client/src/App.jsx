import { Route, Routes } from "react-router-dom";
import LandingPage from "./pages/LandingPage";
import InterviewSetup from "./pages/InterviewSetup";
import InterviewScreen from "./pages/InterviewScreen";
import Login from "./pages/Login";
import Register from "./pages/Register";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/interview/setup" element={<InterviewSetup />} />
      <Route path="/interview/:id" element={<InterviewScreen />} />
    </Routes>
  );
}