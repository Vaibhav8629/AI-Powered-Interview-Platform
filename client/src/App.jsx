import {Navigate,Route,Routes} from "react-router-dom";
import LandingPage from "./pages/LandingPage";
import InterviewSetup from "./pages/InterviewSetup";
import InterviewScreen from "./pages/InterviewScreen";

export default function App() {
  return (
    <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/interview/setup" element={<InterviewSetup />} />
        <Route path="/interview/screen" element={<InterviewScreen />} />
    </Routes>
  );
}