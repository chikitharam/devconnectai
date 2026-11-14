import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/authcontext";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const onChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const user = await login(form.email, form.password);
      // Redirect based on the role returned by the backend
      navigate(user.role === "client" ? "/customer/dashboard" : "/developer/dashboard");
    } catch (err) {
      setError(err.response?.data?.detail || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 420, margin: "80px auto", padding: 30, background: "#fff", borderRadius: 10, boxShadow: "0 4px 6px rgba(0,0,0,0.05)", border: "1px solid #C5BAC4" }}>
      <h2 style={{ color: "#191D23", marginBottom: 20 }}>Welcome Back</h2>
      <form onSubmit={onSubmit} style={{ display: "grid", gap: 15 }}>
        <div>
          <label style={{ fontSize: 14, fontWeight: "bold", color: "#7E919F" }}>Email</label>
          <input name="email" type="email" placeholder="Enter your email" value={form.email} onChange={onChange} required style={{ width: "100%", padding: 10, marginTop: 5, borderRadius: 5, border: "1px solid #C5BAC4", boxSizing: "border-box" }} />
        </div>
        <div>
          <label style={{ fontSize: 14, fontWeight: "bold", color: "#7E919F" }}>Password</label>
          <input name="password" type="password" placeholder="Enter your password" value={form.password} onChange={onChange} required style={{ width: "100%", padding: 10, marginTop: 5, borderRadius: 5, border: "1px solid #C5BAC4", boxSizing: "border-box" }} />
        </div>
        {error && <p style={{ color: "#b91c1c", background: "#fee2e2", padding: 10, borderRadius: 5, margin: 0, fontSize: 14 }}>{error}</p>}
        <button type="submit" disabled={loading} style={{ padding: 12, background: "#57707A", color: "white", border: "none", borderRadius: 5, fontSize: 16, fontWeight: "bold", cursor: "pointer", marginTop: 10 }}>
          {loading ? "Logging in..." : "Login"}
        </button>
      </form>
      <p style={{ textAlign: "center", marginTop: 20, color: "#7E919F", fontSize: 14 }}>
        Don't have an account? <Link to="/register" style={{ color: "#57707A", fontWeight: "bold", textDecoration: "none" }}>Register</Link>
      </p>
    </div>
  );
}