import { Navigate, Route, Routes } from "react-router-dom";

import Login from "./pages/Login.jsx";
import Register from "./pages/Register.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import MyFiles from "./pages/MyFiles.jsx";
import Profile from "./pages/Profile.jsx";
import AdminDashboard from "./pages/AdminDashboard.jsx";
import ManagerDashboard from "./pages/ManagerDashboard.jsx";

function App() {
return ( <Routes>
<Route path="/" element={<Navigate to="/login" replace />} />

  <Route path="/login" element={<Login />} />
  <Route path="/register" element={<Register />} />

  <Route path="/dashboard" element={<Dashboard />} />
  <Route path="/my-files" element={<MyFiles />} />
  <Route path="/profile" element={<Profile />} />

  <Route path="/admin" element={<AdminDashboard />} />
  <Route path="/manager" element={<ManagerDashboard />} />

  <Route path="*" element={<Navigate to="/login" replace />} />
</Routes>

);
}

export default App;
