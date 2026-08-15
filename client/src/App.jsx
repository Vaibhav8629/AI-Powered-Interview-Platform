import { Route, Routes } from "react-router-dom";
import LandingPage from "./pages/LandingPage";
import InterviewSetup from "./pages/InterviewSetup";
import InterviewScreen from "./pages/InterviewScreen";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Pricing from "./pages/Pricing";
import PaymentSuccess from "./pages/PaymentSuccess";
import PaymentCancel from "./pages/PaymentCancel";
import InterviewFeedback from "./pages/FeedbackPage";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/interview/setup" element={<InterviewSetup />} />
      <Route path="/interview/:id" element={<InterviewScreen />} />
      <Route path="/feedback/:interviewId" element={<InterviewFeedback />} />
      <Route path="/feedback" element={<InterviewFeedback />} />

      {/* Subscription / payment routes */}
      <Route path="/pricing" element={<Pricing />} />
      <Route path="/payment/success" element={<PaymentSuccess />} />
      <Route path="/payment/cancel" element={<PaymentCancel />} />
    </Routes>
  );
}
