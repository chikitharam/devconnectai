import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../services/api";

export default function ProjectMatching() {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // --- REQUEST MODAL STATE ---
  const [selectedDev, setSelectedDev] = useState(null);
  const [requestForm, setRequestForm] = useState({
    proposed_budget: "",
    proposed_deadline: "",
    required_services: "",
    message: ""
  });
  const [sending, setSending] = useState(false);

  useEffect(() => {
    const fetchMatches = async () => {
      try {
        const res = await api.get(`/projects/${id}/recommendations`); 
        setData(res.data);
      } catch (err) {
        setError(err.response?.data?.detail || "Failed to load matched developers.");
      } finally {
        setLoading(false);
      }
    };
    fetchMatches();
  }, [id]);

  const handleSendRequest = async (e) => {
    e.preventDefault();
    setSending(true);
    try {
      await api.post("/requests", {
        project_id: parseInt(id),
        developer_id: selectedDev.user_id,
        ...requestForm,
        proposed_deadline: requestForm.proposed_deadline || null
      });
      alert("Request sent successfully! The developer will review it shortly.");
      setSelectedDev(null); // Close modal
    } catch (err) {
      alert("Failed to send request: " + (err.response?.data?.detail || err.message));
    } finally {
      setSending(false);
    }
  };

  if (loading) return <div style={{ padding: 40 }}>Running matching algorithm...</div>;
  if (error) return <div style={{ padding: 40, color: "red" }}>{error}</div>;

  return (
    <div style={{ maxWidth: 1100, margin: "40px auto", padding: 20, fontFamily: "sans-serif" }}>
      
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div>
          <h2 style={{ margin: 0 }}>Top Recommended Developers</h2>
          <p style={{ color: "#64748b", marginTop: 5 }}>Based on: <strong>{data.project_title}</strong></p>
        </div>
        <button onClick={() => navigate("/customer/dashboard")} style={{ padding: "10px 20px", background: "#f1f5f9", border: "none", borderRadius: 5, cursor: "pointer" }}>
          Back to Dashboard
        </button>
      </div>

      <div style={{ background: "#fffbeb", borderLeft: "4px solid #f59e0b", padding: "15px", borderRadius: "4px", marginBottom: 20 }}>
        <strong style={{ color: "#92400e", display: "block", marginBottom: 5 }}>Recommendation Disclaimer</strong>
        <p style={{ margin: 0, color: "#b45309", fontSize: "14px" }}>
          A matching score is a recommendation aid, not a guarantee of developer quality. Please review profiles and interview candidates before hiring.
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 30 }}>
        {data.matched_developers.map((dev, index) => (
          <div key={dev.id} style={{ display: "flex", gap: 20, alignItems: "stretch", background: "white", borderRadius: 10, border: "1px solid #e2e8f0", overflow: "hidden" }}>
            <div style={{ flex: 2, padding: 25 }}>
              <div style={{ display: "flex", gap: 15, alignItems: "center", marginBottom: 15 }}>
                <div style={{ width: 60, height: 60, borderRadius: "50%", background: "#e0e7ff", display: "flex", justifyContent: "center", alignItems: "center", fontSize: 24, fontWeight: "bold", color: "#4338ca" }}>
                  {dev.name.charAt(0)}
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: 22, color: "#1e293b" }}>{dev.name}</h3>
                  <span style={{ fontWeight: "bold", color: dev.availability === "Available" ? "#16a34a" : "#dc2626" }}>{dev.availability}</span>
                </div>
              </div>
              <div style={{ marginBottom: 15 }}>
                <strong>Skills:</strong>
                <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginTop: 5 }}>
                  {dev.skills?.map((skill, i) => (
                    <span key={i} style={{ background: "#f1f5f9", color: "#334155", padding: "4px 10px", borderRadius: 15, fontSize: 13 }}>{skill}</span>
                  ))}
                </div>
              </div>
              <div style={{ marginBottom: 15 }}><strong>Experience:</strong> {dev.experience_years} years</div>
              
              <div style={{ display: "flex", gap: 10 }}>
                <button style={{ flex: 1, padding: "10px", background: "#f1f5f9", border: "1px solid #cbd5e1", borderRadius: 5, cursor: "pointer", fontWeight: "bold" }}>
                  View Full Profile
                </button>
                <button 
                  onClick={() => setSelectedDev(dev)}
                  style={{ flex: 1, padding: "10px", background: "#2563eb", color: "white", border: "none", borderRadius: 5, cursor: "pointer", fontWeight: "bold" }}
                >
                  Send Project Request
                </button>
              </div>
            </div>

            <div style={{ flex: 1, background: "#f8fafc", padding: 25, borderLeft: "1px solid #e2e8f0" }}>
              <div style={{ textAlign: "center", marginBottom: 20 }}>
                <h2 style={{ margin: 0, color: "#16a34a", fontSize: 36 }}>{dev.match_percentage}%</h2>
                <span style={{ fontSize: 12, fontWeight: "bold", color: "#64748b", textTransform: "uppercase" }}>Overall Match</span>
              </div>
              <h4 style={{ margin: "0 0 10px 0", color: "#1e293b" }}>Why recommended?</h4>
              <ul style={{ margin: 0, paddingLeft: 20, fontSize: 14, color: "#475569", display: "flex", flexDirection: "column", gap: 8 }}>
                {dev.why_recommended.map((reason, i) => (
                  <li key={i}>{reason}</li>
                ))}
              </ul>
            </div>
          </div>
        ))}
      </div>

      {/* REQUEST MODAL */}
      {selectedDev && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.6)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 1000 }}>
          <div style={{ background: "white", padding: 30, borderRadius: 10, width: "100%", maxWidth: 600 }}>
            <h3 style={{ marginTop: 0 }}>Send Request to {selectedDev.name}</h3>
            <form onSubmit={handleSendRequest} style={{ display: "grid", gap: 15 }}>
              <div>
                <label style={{ fontWeight: "bold", fontSize: 14 }}>Project Title</label>
                <input type="text" value={data.project_title} disabled style={{ width: "100%", padding: 10, background: "#f1f5f9", border: "1px solid #cbd5e1", borderRadius: 5 }} />
              </div>
              <div>
                <label style={{ fontWeight: "bold", fontSize: 14 }}>Project Description</label>
                <textarea value={data.project_overview || "See AI analysis for full details"} disabled rows="2" style={{ width: "100%", padding: 10, background: "#f1f5f9", border: "1px solid #cbd5e1", borderRadius: 5 }} />
              </div>
              <div style={{ display: "flex", gap: 15 }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontWeight: "bold", fontSize: 14 }}>Proposed Budget ($)</label>
                  <input required type="text" value={requestForm.proposed_budget} onChange={e => setRequestForm({...requestForm, proposed_budget: e.target.value})} style={{ width: "100%", padding: 10, border: "1px solid #cbd5e1", borderRadius: 5 }} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ fontWeight: "bold", fontSize: 14 }}>Deadline</label>
                  <input type="date" value={requestForm.proposed_deadline} onChange={e => setRequestForm({...requestForm, proposed_deadline: e.target.value})} style={{ width: "100%", padding: 10, border: "1px solid #cbd5e1", borderRadius: 5 }} />
                </div>
              </div>
              <div>
                <label style={{ fontWeight: "bold", fontSize: 14 }}>Required Services</label>
                <input required type="text" placeholder="e.g. Frontend Development, API Integration" value={requestForm.required_services} onChange={e => setRequestForm({...requestForm, required_services: e.target.value})} style={{ width: "100%", padding: 10, border: "1px solid #cbd5e1", borderRadius: 5 }} />
              </div>
              <div>
                <label style={{ fontWeight: "bold", fontSize: 14 }}>Additional Message</label>
                <textarea rows="3" value={requestForm.message} onChange={e => setRequestForm({...requestForm, message: e.target.value})} style={{ width: "100%", padding: 10, border: "1px solid #cbd5e1", borderRadius: 5 }} placeholder="Hi, I loved your profile..."></textarea>
              </div>
              
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 10 }}>
                <button type="button" onClick={() => setSelectedDev(null)} style={{ padding: "10px 20px", background: "#f1f5f9", border: "none", borderRadius: 5, cursor: "pointer" }}>Cancel</button>
                <button type="submit" disabled={sending} style={{ padding: "10px 20px", background: "#2563eb", color: "white", border: "none", borderRadius: 5, cursor: "pointer", fontWeight: "bold" }}>
                  {sending ? "Sending..." : "Send Request"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}