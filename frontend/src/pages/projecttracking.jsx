import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../services/api";
import { useAuth } from "../context/authcontext";

// Helper function to dynamically load the Razorpay SDK
const loadRazorpayScript = () => {
  return new Promise((resolve) => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
};

export default function ProjectTracking() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [data, setData] = useState(null);
  const [delivery, setDelivery] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Developer Update States
  const [newStatus, setNewStatus] = useState("");
  const [newMilestone, setNewMilestone] = useState({ title: "", status: "Pending" });
  const [updating, setUpdating] = useState(false);

  // Payment State
  const [paying, setPaying] = useState(false);

  useEffect(() => {
    fetchData();
  }, [id]);

  const fetchData = async () => {
    try {
      const res = await api.get(`/projects/${id}/status`);
      setData(res.data);
      setNewStatus(res.data.project_status);

      const historyRes = await api.get(`/projects/${id}/history`);
      setDelivery(historyRes.data.delivery);
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to load tracking data.");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async () => {
    setUpdating(true);
    try {
      await api.put(`/projects/${id}/status`, { status: newStatus });
      alert("Project status updated!");
      fetchData();
    } catch (err) {
      alert(err.response?.data?.detail || "Failed to update status");
    } finally {
      setUpdating(false);
    }
  };

  const handleAddMilestone = async (e) => {
    e.preventDefault();
    if (!newMilestone.title.trim()) return;
    try {
      await api.post(`/projects/${id}/milestones`, newMilestone);
      setNewMilestone({ title: "", status: "Pending" });
      fetchData();
    } catch (err) {
      alert(err.response?.data?.detail || "Failed to add milestone");
    }
  };

  const handleCompleteProject = async () => {
    if (!window.confirm("Are you sure you want to mark this project as complete?")) return;
    try {
      await api.put(`/projects/${id}/complete`);
      alert("Project marked as completed!");
      fetchData();
    } catch (err) {
      alert(err.response?.data?.detail || "Failed to mark complete");
    }
  };

  // --- REAL PAYMENT HANDLER ---
  const handlePayment = async () => {
    const scriptLoaded = await loadRazorpayScript();
    if (!scriptLoaded) {
      alert("Razorpay SDK failed to load. Are you online?");
      return;
    }

    setPaying(true);
    try {
      // 1. Get Order ID from Backend
      const { data: orderData } = await api.post(`/projects/${id}/pay`);

      // 2. Open Razorpay Modal
      const options = {
        key: import.meta.env.VITE_RAZORPAY_KEY_ID, // Must be set in frontend/.env
        amount: orderData.amount,
        currency: orderData.currency,
        name: "DevConnect AI",
        description: `Payment for Project #${id}`,
        order_id: orderData.order_id,
        handler: function (response) {
          // This triggers on frontend success, but backend webhook updates the DB.
          alert(`Payment Successful! ID: ${response.razorpay_payment_id}`);
          
          // Poll backend after 2 seconds to let the webhook process
          setTimeout(() => fetchData(), 2000); 
        },
        prefill: {
          name: user.full_name,
          email: user.email,
        },
        theme: { color: "#2563eb" },
      };

      const paymentObject = new window.Razorpay(options);
      paymentObject.open();

    } catch (err) {
      alert(err.response?.data?.detail || "Payment failed to initialize.");
    } finally {
      setPaying(false);
    }
  };

  if (loading) return <div style={{ padding: 40 }}>Loading project tracking...</div>;
  if (error) return <div style={{ padding: 40, color: "red" }}>{error}</div>;

  return (
    <div style={{ maxWidth: 900, margin: "40px auto", padding: 20, fontFamily: "sans-serif" }}>
      
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 30 }}>
        <div>
          <h2 style={{ margin: 0 }}>Project Tracking</h2>
          <p style={{ color: "#64748b", marginTop: 5 }}>{data.project_title}</p>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={() => navigate(`/project/${id}/history`)} style={{ padding: "8px 16px", background: "#e0e7ff", color: "#4338ca", border: "none", borderRadius: 5, cursor: "pointer", fontWeight: "bold" }}>
            View Full History
          </button>
          <button onClick={() => navigate(user.role === "customer" ? "/customer/dashboard" : "/developer/dashboard")} style={{ padding: "8px 16px", background: "#f1f5f9", border: "none", borderRadius: 5, cursor: "pointer" }}>
            Back to Dashboard
          </button>
        </div>
      </div>

      <div style={{ background: "white", padding: 30, borderRadius: 10, border: "1px solid #e2e8f0", marginBottom: 30 }}>
        <h3 style={{ marginTop: 0, marginBottom: 15 }}>Current Status</h3>
        
        {data.role === "developer" && data.project_status !== "Delivered" && data.project_status !== "Completed" && data.project_status !== "Paid" ? (
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <select value={newStatus} onChange={(e) => setNewStatus(e.target.value)} style={{ padding: 10, borderRadius: 5, border: "1px solid #cbd5e1", flex: 1, maxWidth: 300 }}>
              <option value="Project Started">Project Started</option>
              <option value="In Progress">In Progress</option>
              <option value="Testing">Testing</option>
            </select>
            <button onClick={handleUpdateStatus} disabled={updating} style={{ padding: "10px 20px", background: "#2563eb", color: "white", border: "none", borderRadius: 5, cursor: "pointer", fontWeight: "bold" }}>
              {updating ? "Updating..." : "Update Status"}
            </button>
          </div>
        ) : (
          <div style={{ display: "inline-block", padding: "10px 20px", background: "#eff6ff", color: "#2563eb", border: "1px solid #bfdbfe", borderRadius: 5, fontWeight: "bold", fontSize: 18 }}>
            {data.project_status}
          </div>
        )}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 30, marginBottom: 30 }}>
        {/* MILESTONES LIST */}
        <div style={{ background: "white", padding: 30, borderRadius: 10, border: "1px solid #e2e8f0" }}>
          <h3 style={{ marginTop: 0, marginBottom: 20 }}>Milestones</h3>
          
          {data.milestones.length === 0 ? (
            <p style={{ color: "#64748b" }}>No milestones created yet.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 15 }}>
              {data.milestones.map((m, index) => (
                <div key={m.milestone_id} style={{ display: "flex", alignItems: "center", gap: 15, padding: 15, background: "#f8fafc", borderRadius: 8 }}>
                  <div style={{ width: 30, height: 30, borderRadius: "50%", background: m.status === "Completed" ? "#16a34a" : m.status === "In Progress" ? "#f59e0b" : "#cbd5e1", color: "white", display: "flex", justifyContent: "center", alignItems: "center", fontWeight: "bold", fontSize: 14 }}>
                    {m.status === "Completed" ? "✓" : index + 1}
                  </div>
                  <div style={{ flex: 1 }}>
                    <h4 style={{ margin: 0, color: "#1e293b" }}>{m.title}</h4>
                    <span style={{ fontSize: 13, color: m.status === "Completed" ? "#16a34a" : m.status === "In Progress" ? "#f59e0b" : "#64748b", fontWeight: "bold" }}>
                      {m.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* DEVELOPER ONLY: ADD MILESTONE FORM */}
        {data.role === "developer" && (
          <div style={{ background: "white", padding: 30, borderRadius: 10, border: "1px solid #e2e8f0", height: "fit-content" }}>
            <h3 style={{ marginTop: 0, marginBottom: 15 }}>Add Milestone</h3>
            <form onSubmit={handleAddMilestone} style={{ display: "flex", flexDirection: "column", gap: 15 }}>
              <div>
                <label style={{ fontSize: 13, fontWeight: "bold", color: "#475569" }}>Title</label>
                <input type="text" value={newMilestone.title} onChange={(e) => setNewMilestone({...newMilestone, title: e.target.value})} placeholder="e.g. Frontend Development" style={{ width: "100%", padding: 10, marginTop: 5, borderRadius: 5, border: "1px solid #cbd5e1" }} />
              </div>
              <div>
                <label style={{ fontSize: 13, fontWeight: "bold", color: "#475569" }}>Status</label>
                <select value={newMilestone.status} onChange={(e) => setNewMilestone({...newMilestone, status: e.target.value})} style={{ width: "100%", padding: 10, marginTop: 5, borderRadius: 5, border: "1px solid #cbd5e1" }}>
                  <option value="Pending">Pending</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Completed">Completed</option>
                </select>
              </div>
              <button type="submit" style={{ padding: 10, background: "#16a34a", color: "white", border: "none", borderRadius: 5, cursor: "pointer", fontWeight: "bold", marginTop: 10 }}>
                + Add Milestone
              </button>
            </form>
          </div>
        )}
      </div>

      {/* DELIVERY SECTION */}
      {delivery ? (
        <div style={{ background: "white", padding: 30, borderRadius: 10, border: "1px solid #e2e8f0", marginBottom: 30 }}>
          <h3 style={{ marginTop: 0 }}>Project Delivery</h3>
          <p style={{ color: "#475569" }}>{delivery.delivery_description}</p>
          
          <div style={{ display: "flex", gap: 15, marginTop: 20 }}>
            <a href={`http://127.0.0.1:8000${delivery.zip_file_path}`} target="_blank" rel="noreferrer" style={{ padding: "10px 20px", background: "#2563eb", color: "white", textDecoration: "none", borderRadius: 5, fontWeight: "bold" }}>
              ⬇️ Download Software (ZIP)
            </a>
            {delivery.doc_file_path && (
              <a href={`http://127.0.0.1:8000${delivery.doc_file_path}`} target="_blank" rel="noreferrer" style={{ padding: "10px 20px", background: "#f1f5f9", color: "#334155", textDecoration: "none", borderRadius: 5, fontWeight: "bold", border: "1px solid #cbd5e1" }}>
                📄 View Documentation
              </a>
            )}
            {delivery.github_link && (
              <a href={delivery.github_link} target="_blank" rel="noreferrer" style={{ padding: "10px 20px", background: "#1e293b", color: "white", textDecoration: "none", borderRadius: 5, fontWeight: "bold" }}>
                🐙 GitHub Repo
              </a>
            )}
          </div>

          {/* CUSTOMER: ACCEPT DELIVERY */}
          {data.role === "customer" && data.project_status === "Delivered" && (
            <button onClick={handleCompleteProject} style={{ marginTop: 20, padding: "12px 24px", background: "#16a34a", color: "white", border: "none", borderRadius: 5, fontWeight: "bold", cursor: "pointer", width: "100%" }}>
              ✅ Accept Delivery & Mark Project Complete
            </button>
          )}

          {/* CUSTOMER: PAY DEVELOPER */}
          {data.role === "customer" && data.project_status === "Completed" && (
            <div style={{ marginTop: 20, padding: 20, background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 8, textAlign: "center" }}>
              <h4 style={{ margin: "0 0 10px 0", color: "#166534" }}>Project Completed!</h4>
              <p style={{ color: "#15803d", marginBottom: 15 }}>Please release the final payment to the developer.</p>
              <button onClick={handlePayment} disabled={paying} style={{ padding: "12px 24px", background: "#16a34a", color: "white", border: "none", borderRadius: 5, fontWeight: "bold", cursor: paying ? "not-allowed" : "pointer", width: "100%", fontSize: 16 }}>
                {paying ? "Processing Payment..." : "💳 Pay Developer"}
              </button>
            </div>
          )}

          {/* PAID STATE */}
          {data.project_status === "Paid" && (
            <div style={{ marginTop: 20, padding: 20, background: "#f8fafc", border: "1px solid #cbd5e1", borderRadius: 8, textAlign: "center" }}>
              <h4 style={{ margin: 0, color: "#475569" }}>✅ Payment Completed</h4>
              <p style={{ margin: "5px 0 0 0", color: "#64748b" }}>This project has been successfully paid and closed.</p>
            </div>
          )}
        </div>
      ) : (
        data.role === "developer" && data.project_status !== "Completed" && data.project_status !== "Paid" && (
          <div style={{ background: "white", padding: 30, borderRadius: 10, border: "1px solid #e2e8f0", marginBottom: 30, textAlign: "center" }}>
            <h3 style={{ marginTop: 0 }}>Ready to deliver?</h3>
            <p style={{ color: "#64748b", marginBottom: 20 }}>Upload your final files for the customer to review.</p>
            <button onClick={() => navigate(`/project/${id}/deliver`)} style={{ padding: "12px 24px", background: "#2563eb", color: "white", border: "none", borderRadius: 5, fontWeight: "bold", cursor: "pointer" }}>
              🚀 Deliver Project Files
            </button>
          </div>
        )
      )}
    </div>
  );
}