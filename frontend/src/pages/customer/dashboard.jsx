import { useAuth } from "../../context/authcontext";

export default function CustomerDashboard() {
  const { user, logout } = useAuth();
  return (
    <div style={{ padding: 20 }}>
      <h2>Customer Dashboard</h2>
      <p>Welcome, {user.full_name} ({user.email})</p>
      <button onClick={logout}>Logout</button>
    </div>
  );
}