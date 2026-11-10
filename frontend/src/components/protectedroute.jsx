import { Navigate } from "react-router-dom";
import { useAuth } from "../context/authcontext";

export default function ProtectedRoute({ children, role }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (role && user.role !== role) {
    return (
      <Navigate
        to={user.role === "customer" ? "/customer/dashboard" : "/developer/dashboard"}
        replace
      />
    );
  }
  return children;
}