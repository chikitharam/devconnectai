import { Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/authcontext"; 
import ProtectedRoute from "./components/protectedroute";

import Login from "./pages/login";
import Register from "./pages/register";
import Negotiation from "./pages/negotiation"; 
import ProjectTracking from "./pages/projecttracking"; 
import ProjectDelivery from "./pages/projectdelivery"; // <-- Add
import ProjectHistory from "./pages/projecthistory";   // <-- Add

import CustomerDashboard from "./customer/dashboard";
import CreateProject from "./customer/createproject"; 
import AIAnalysis from "./customer/aianalysis"; 
import ProjectMatching from "./customer/projectmatching"; 

import DeveloperDashboard from "./developer/dashboard";
import DeveloperProfile from "./developer/profile";

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* Shared Routes */}
        <Route path="/request/:id/negotiate" element={<ProtectedRoute><Negotiation /></ProtectedRoute>} />
        <Route path="/project/:id/tracking" element={<ProtectedRoute><ProjectTracking /></ProtectedRoute>} />
        <Route path="/project/:id/history" element={<ProtectedRoute><ProjectHistory /></ProtectedRoute>} /> {/* <-- Add */}
        
        {/* Developer Only Delivery Route */}
        <Route path="/project/:id/deliver" element={<ProtectedRoute role="developer"><ProjectDelivery /></ProtectedRoute>} /> {/* <-- Add */}

        {/* Customer Routes */}
        <Route path="/customer/dashboard" element={<ProtectedRoute role="customer"><CustomerDashboard /></ProtectedRoute>} />
        <Route path="/customer/project/new" element={<ProtectedRoute role="customer"><CreateProject /></ProtectedRoute>} />
        <Route path="/customer/project/:id/analysis" element={<ProtectedRoute role="customer"><AIAnalysis /></ProtectedRoute>} />
        <Route path="/customer/project/:id/matching" element={<ProtectedRoute role="customer"><ProjectMatching /></ProtectedRoute>} />

        {/* Developer Routes */}
        <Route path="/developer/dashboard" element={<ProtectedRoute role="developer"><DeveloperDashboard /></ProtectedRoute>} />
        <Route path="/developer/profile" element={<ProtectedRoute role="developer"><DeveloperProfile /></ProtectedRoute>} />
      </Routes>
    </AuthProvider>
  );
}