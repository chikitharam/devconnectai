import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../services/api";

export default function Register() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    full_name: "",
    email: "",
    password: "",
    confirm_password: "",
    role: "customer",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const onChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (form.password !== form.confirm_password) {
      setError("Passwords do not match");
      return;
    }
    setLoading(true);
    try {
      await api.post("/auth/register", form);
      navigate("/login");
    } catch (err) {
      const detail = err.response?.data?.detail;
      setError(typeof detail === "string" ? detail : "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 450, margin: "40px auto", padding: 30, background: "#fff", borderRadius: 10, boxShadow: "0 4px 6px rgba(0,0,0,0.05)", border: "1px solid #C5BAC4" }}>
      <h2 style={{ color: "#191D23", marginBottom: 20 }}>Create Account</h2>
      <form onSubmit={onSubmit} style={{ display: "grid", gap: 15 }}>
        <div>
          <label style={{ fontSize: 14, fontWeight: "bold", color: "#7E919F" }}>Full Name</label>
          <input name="full_name" placeholder="John Doe" value={form.full_name} onChange={onChange} required style={{ width: "100%", padding: 10, marginTop: 5, borderRadius: 5, border: "1px solid #C5BAC4", boxSizing: "border-box" }} />
        </div>
        <div>
          <label style={{ fontSize: 14, fontWeight: "bold", color: "#7E919F" }}>Email</label>
          <input name="email" type="email" placeholder="john@example.com" value={form.email} onChange={onChange} required style={{ width: "100%", padding: 10, marginTop: 5, borderRadius: 5, border: "1px solid #C5BAC4", boxSizing: "border-box" }} />
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <div style={{ flex: 1 }}>
            <label style={{ fontSize: 14, fontWeight: "bold", color: "#7E919F" }}>Password</label>
            <input name="password" type="password" placeholder="Min 8 chars" value={form.password} onChange={onChange} required minLength={8} style={{ width: "100%", padding: 10, marginTop: 5, borderRadius: 5, border: "1px solid #C5BAC4", boxSizing: "border-box" }} />
          </div>
          <div style={{ flex: 1 }}>
            <label style={{ fontSize: 14, fontWeight: "bold", color: "#7E919F" }}>Confirm</label>
            <input name="confirm_password" type="password" placeholder="Confirm" value={form.confirm_password} onChange={onChange} required style={{ width: "100%", padding: 10, marginTop: 5, borderRadius: 5, border: "1px solid #C5BAC4", boxSizing: "border-box" }} />
          </div>
        </div>

        <fieldset style={{ border: "1px solid #C5BAC4", padding: 15, borderRadius: 5 }}>
          <legend style={{ fontSize: 14, fontWeight: "bold", color: "#7E919F", padding: "0 5px" }}>I am a...</legend>
          <div style={{ display: "flex", gap: 20 }}>
            <label style={{ display: "flex", alignItems: "center", gap: 5, color: "#191D23" }}>
              <input type="radio" name="role" value="customer" checked={form.role === "customer"} onChange={onChange} /> Customer
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: 5, color: "#191D23" }}>
              <input type="radio" name="role" value="developer" checked={form.role === "developer"} onChange={onChange} /> Developer
            </label>
          </div>
        </fieldset>

        {error && <p style={{ color: "#b91c1c", background: "#fee2e2", padding: 10, borderRadius: 5, margin: 0, fontSize: 14 }}>{error}</p>}

        <button type="submit" disabled={loading} style={{ padding: 12, background: "#57707A", color: "white", border: "none", borderRadius: 5, fontSize: 16, fontWeight: "bold", cursor: "pointer", marginTop: 10 }}>
          {loading ? "Creating..." : "Register"}
        </button>
      </form>
      <p style={{ textAlign: "center", marginTop: 20, color: "#7E919F", fontSize: 14 }}>
        Already have an account? <Link to="/login" style={{ color: "#57707A", fontWeight: "bold", textDecoration: "none" }}>Login</Link>
      </p>
    </div>
  );
}