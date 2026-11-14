import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/authcontext";
import api from "../services/api";

export default function DeveloperDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewingReq, setViewingReq] = useState(null);

  useEffect(() => { fetchDashboard(); }, []);

  const fetchDashboard = async () => {
    try {
      const res = await api.get("/developer/dashboard");
      setData(res.data);
      const reqRes = await api.get("/developer/requests");
      setRequests(reqRes.data);
    } catch (err) {
      console.error("Failed to load developer dashboard", err);
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (requestId, action) => {
    try {
      await api.put(`/requests/${requestId}/${action}`);
      if (action === "accept") {
        navigate(`/request/${requestId}/negotiate`);
      } else {
        fetchDashboard();
      }
    } catch (err) {
      alert(`Failed to ${action} request.`);
    }
  };

  if (loading) return <div style={{ padding: 40 }}>Loading...</div>;

  return (
    <div className="app-container">
      {/* SIDEBAR */}
      <aside className="sidebar">
        <div className="sidebar-logo">DevConnect<span>AI</span></div>
        <nav className="sidebar-nav">
          <div className="nav-item active">Dashboard</div>
          <div className="nav-item" onClick={() => navigate("/developer/profile")}>Manage Profile</div>
        </nav>
        <button onClick={logout} className="btn btn-primary" style={{ marginTop: "auto" }}>Logout</button>
      </aside>

      {/* MAIN CONTENT */}
      <main className="main-content">
        <header className="header">
          <div>
            <h1 style={{ fontSize: "28px", margin: 0 }}>Welcome, {data?.welcome_name}!</h1>
            <p style={{ marginTop: "5px" }}>Here is your developer overview.</p>
          </div>
        </header>

        {/* STATS GRID */}
        <div className="stat-grid">
          <div className="stat-card"><div className="stat-title">Incoming Requests</div><div className="stat-value">{data?.incoming_requests || 0}</div></div>
          <div className="stat-card"><div className="stat-title">Active Projects</div><div className="stat-value">{data?.active_projects || 0}</div></div>
          <div className="stat-card"><div className="stat-title">Completed</div><div className="stat-value">{data?.completed_projects || 0}</div></div>
        </div>

        <h2 style={{ fontSize: "20px", marginBottom: "20px" }}>Incoming Project Requests</h2>
        {requests.length === 0 ? (
          <div className="card" style={{ textAlign: "center", padding: "40px" }}><p>No incoming requests yet.</p></div>
        ) : (
          <div style={{ display: "grid", gap: 20 }}>
            {requests.map(req => {
              const displayStatus = req.project_status || req.status;
              const isPending = req.status === "Pending";
              const isNegotiating = req.status === "Accepted" || req.status === "Negotiating";
              const isActive = ["Active", "In Progress", "Testing", "Delivered", "Project Started", "Agreement"].includes(displayStatus);
              const isCompleted = ["Completed", "Paid"].includes(displayStatus);

              return (
                <div key={req.request_id} className="card" style={{ 
                  borderLeft: isCompleted ? "4px solid var(--success)" : isActive ? "4px solid var(--primary)" : isPending ? "4px solid var(--warning)" : "4px solid var(--danger)"
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 15 }}>
                    <div>
                      <h3 style={{ margin: "0 0 5px 0", fontSize: "18px" }}>{req.project_title}</h3>
                      <span style={{ fontSize: 14 }}>From: <strong>{req.customer_name}</strong></span>
                    </div>
                    <span className={`badge ${isCompleted ? 'badge-neutral' : isActive ? 'badge-success' : isPending ? 'badge-pending' : 'badge-danger'}`}>
                      {displayStatus}
                    </span>
                  </div>
                  
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 15, fontSize: 14, marginBottom: 20 }}>
                    <div>Budget: <strong>{req.final_budget || req.proposed_budget || "N/A"}</strong></div>
                    <div>Deadline: <strong>{req.final_deadline || req.proposed_deadline || "N/A"}</strong></div>
                    <div>Services: <strong>{req.required_services || "N/A"}</strong></div>
                  </div>
                  
                  <div style={{ background: "var(--bg)", padding: 15, borderRadius: 8, fontSize: 14, fontStyle: "italic", marginBottom: 20, border: "1px solid rgba(0,0,0,0.05)" }}>
                    "{req.message || "No additional message."}"
                  </div>

                  <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                    <button onClick={() => setViewingReq(req)} className="btn btn-secondary">View Requirements</button>
                    
                    {isPending && (
                      <>
                        <button onClick={() => handleAction(req.request_id, "reject")} className="btn btn-danger">Reject</button>
                        <button onClick={() => handleAction(req.request_id, "negotiate")} className="btn btn-outline">Negotiate</button>
                        <button onClick={() => handleAction(req.request_id, "accept")} className="btn btn-primary">Accept Request</button>
                      </>
                    )}
                    {isNegotiating && <button onClick={() => navigate(`/request/${req.request_id}/negotiate`)} className="btn btn-primary">Open Negotiation Chat</button>}
                    {isActive && <button onClick={() => navigate(`/project/${req.project_id}/tracking`)} className="btn btn-primary">Manage Project Tracking</button>}
                    {isCompleted && <button onClick={() => navigate(`/project/${req.project_id}/tracking`)} className="btn btn-secondary">View Project History</button>}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* MODAL */}
      {viewingReq && viewingReq.ai_analysis && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2 style={{ marginBottom: 20 }}>Requirements: {viewingReq.project_title}</h2>
            
            <div style={{ background: "var(--bg)", padding: 20, borderRadius: 12, marginBottom: 25 }}>
              <h4 style={{ marginBottom: 8 }}>Project Overview</h4>
              <p style={{ margin: 0, color: "var(--text-main)" }}>{viewingReq.ai_analysis.project_overview}</p>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 25, marginBottom: 25 }}>
              <div>
                <h4 style={{ marginBottom: 10 }}>Functional Requirements</h4>
                <ul style={{ paddingLeft: 20, margin: 0, fontSize: 14 }}>
                  {viewingReq.ai_analysis.functional_requirements.map((r, i) => <li key={i} style={{ marginBottom: 5 }}>{r}</li>)}
                </ul>
              </div>
              <div>
                <h4 style={{ marginBottom: 10 }}>Required Skills</h4>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {viewingReq.ai_analysis.required_skills.map((s, i) => (
                    <span key={i} className="badge badge-neutral">{s}</span>
                  ))}
                </div>
              </div>
            </div>

            <div style={{ marginBottom: 30 }}>
              <h4 style={{ marginBottom: 10 }}>Suggested Modules</h4>
              <div style={{ border: "1px solid var(--muted)", borderRadius: 8, overflow: "hidden" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
                  <tbody>
                    {viewingReq.ai_analysis.suggested_modules.map((mod, i) => (
                      <tr key={i} style={{ borderBottom: "1px solid var(--bg)" }}>
                        <td style={{ padding: 12, fontWeight: "600", width: "35%", background: "#F8FAFC" }}>{mod.module_name}</td>
                        <td style={{ padding: 12 }}>{mod.description}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <button onClick={() => setViewingReq(null)} className="btn btn-primary">Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}