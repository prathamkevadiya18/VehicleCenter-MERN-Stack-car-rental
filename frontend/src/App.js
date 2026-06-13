import "../src/dist/styles.css";
import About from "./Pages/About";
import Home from "./Pages/Home";
import Navbar from "../src/components/Navbar";
import { Route, Routes, useLocation } from "react-router-dom";
import Models from "./Pages/Models";
import TestimonialsPage from "./Pages/TestimonialsPage";
import Team from "./Pages/Team";
import Contact from "./Pages/Contact";
import Admin from "./Pages/Admin";
import ProtectedRoute from "./components/ProtectedRoute";
import SignIn from "./Pages/SignIn";
import Register from "./Pages/Register";
import AdminLogin from "./Pages/AdminLogin";
import ForgotPassword from "./Pages/ForgotPassword";
import { BookingProvider } from "./contexts/BookingContext";

function App() {
  const location = useLocation();
  const showNavbar = location.pathname !== "/admin";

  return (
    <BookingProvider>
      {showNavbar && <Navbar />}
      <Routes>
        <Route index path="/" element={<Home />} />
        <Route path="about" element={<About />} />
        <Route path="models" element={<Models />} />
        <Route path="testimonials" element={<TestimonialsPage />} />
        <Route path="team" element={<Team />} />
        <Route path="contact" element={<Contact />} />
        <Route
          path="admin"
          element={
            <ProtectedRoute requireAdmin={true}>
              <Admin />
            </ProtectedRoute>
          }
        />
        <Route path="signin" element={<SignIn />} />
        <Route path="register" element={<Register />} />
        <Route path="admin-login" element={<AdminLogin />} />
        <Route path="forgot-password" element={<ForgotPassword />} />
      </Routes>
    </BookingProvider>
  );
}

export default App;
