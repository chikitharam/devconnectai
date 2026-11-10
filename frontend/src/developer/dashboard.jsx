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

  useEffect(() => {
    fetchDashboard();
  }, []);

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
      alert(`Request ${action}ed successfully!`);
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
    <div style={{ display: "flex", minHeight: "100vh", fontFamily: "sans-serif", backgroundColor: "#F4F5F7" }}>
      <aside style={{ width: "250px", backgroundColor: "#191D23", color: "#DEDCDC", padding: "20px" }}>
        <h2 style={{ fontSize: "20px", marginBottom: "30px", color: "#7E919F", fontWeight: "bold" }}>DevConnect AI</h2>
        <nav style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
          <span style={{ fontWeight: "bold", color: "#DEDCDC" }}>Dashboard</span>
          <span onClick={() => navigate("/developer/profile")} style={{ cursor: "pointer", color: "#979DAB" }}>Manage Profile</span>
        </nav>
        <button onClick={logout} style={{ marginTop: "50px", padding: "10px", width: "100%", backgroundColor: "#57707A", color: "white", border: "none", borderRadius: "5px", cursor: "pointer", fontWeight: "bold" }}>
          Logout
        </button>
      </aside>

      <main style={{ flex: 1, padding: "40px" }}>
        <header style={{ marginBottom: "30px" }}>
          <h1 style={{ margin: 0, fontSize: "28px", color: "#191D23" }}>Welcome, {data?.welcome_name}!</h1>
          <p style={{ color: "#7E919F", marginTop: "5px" }}>Here is your developer overview.</p>
        </header>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "20px", marginBottom: "40px" }}>
          <div style={statCardStyle}><h3 style={statTitleStyle}>Incoming Requests</h3><p style={statNumberStyle}>{data?.incoming_requests || 0}</p></div>
          <div style={statCardStyle}><h3 style={statTitleStyle}>Active Projects</h3><p style={statNumberStyle}>{data?.active_projects || 0}</p></div>
          <div style={statCardStyle}><h3 style={statTitleStyle}>Completed</h3><p style={statNumberStyle}>{data?.completed_projects || 0}</p></div>
        </div>

        <h2 style={{ fontSize: "20px", color: "#191D23", marginBottom: "15px" }}>Incoming Project Requests</h2>
        {requests.length === 0 ? (
          <div style={{ background: "white", padding: 30, borderRadius: 10, textAlign: "center", border: "1px solid #C5BAC4" }}>
            <p style={{ color: "#7E919F" }}>No incoming requests yet.</p>
          </div>
        ) : (
          <div style={{ display: "grid", gap: 20 }}>
            {requests.map(req => {
              const displayStatus = req.project_status || req.status;
              const isPending = req.status === "Pending";
              const isNegotiating = req.status === "Accepted" || req.status === "Negotiating";
              const isActive = ["Active", "In Progress", "Testing", "Delivered", "Project Started", "Agreement"].includes(displayStatus);
              const isCompleted = ["Completed", "Paid"].includes(displayStatus);

              return (
                <div key={req.request_id} style={{ 
                  background: "white", padding: 20, borderRadius: 10, 
                  borderLeft: isCompleted ? "4px solid #4F7B6B" : isActive ? "4px solid #57707A" : isPending ? "4px solid #f59e0b" : "4px solid #ef4444",
                  borderTop: "1px solid #C5BAC4", borderRight: "1px solid #C5BAC4", borderBottom: "1px solid #C5BAC4"
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 15 }}>
                    <div>
                      <h3 style={{ margin: "0 0 5px 0", color: "#191D23" }}>{req.project_title}</h3>
                      <span style={{ fontSize: 14, color: "#7E919F" }}>From: <strong>{req.customer_name}</strong></span>
                    </div>
                    <span style={{ 
                      background: isCompleted ? "#DEDCDC" : isActive ? "#DEDCDC" : isPending ? "#fef3c7" : "#fee2e2", 
                      color: isCompleted ? "#4F7B6B" : isActive ? "#57707A" : isPending ? "#92400e" : "#991b1b", 
                      padding: "4px 10px", borderRadius: 15, fontSize: 12, fontWeight: "bold" 
                    }}>
                      {displayStatus}
                    </span>
                  </div>
                  
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 15, fontSize: 14, marginBottom: 15, color: "#7E919F" }}>
                    <div><strong style={{ color: "#191D23" }}>Budget:</strong> {req.final_budget || req.proposed_budget || "Not specified"}</div>
                    <div><strong style={{ color: "#191D23" }}>Deadline:</strong> {req.final_deadline || req.proposed_deadline || "Not specified"}</div>
                    <div><strong style={{ color: "#191D23" }}>Services:</strong> {req.required_services || "Not specified"}</div>
                  </div>
                  
                  <div style={{ background: "#F4F5F7", padding: 15, borderRadius: 5, fontSize: 14, color: "#191D23", fontStyle: "italic", marginBottom: 15, border: "1px solid #DEDCDC" }}>
                    "{req.message || "No additional message."}"
                  </div>

                  <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                    <button onClick={() => setViewingReq(req)} style={{ padding: "8px 16px", background: "#DEDCDC", color: "#191D23", border: "none", borderRadius: 5, cursor: "pointer", fontWeight: "bold" }}>
                      View Requirements
                    </button>
                    
                    {isPending && (
                      <>
                        <button onClick={() => handleAction(req.request_id, "negotiate")} style={{ padding: "8px 16px", background: "#979DAB", color: "white", border: "none", borderRadius: 5, cursor: "pointer", fontWeight: "bold" }}>
                          Negotiate
                        </button>
                        <button onClick={() => handleAction(req.request_id, "reject")} style={{ padding: "8px 16px", background: "#fee2e2", color: "#b91c1c", border: "none", borderRadius: 5, cursor: "pointer", fontWeight: "bold" }}>
                          Reject
                        </button>
                        <button onClick={() => handleAction(req.request_id, "accept")} style={{ padding: "8px 16px", background: "#57707A", color: "white", border: "none", borderRadius: 5, cursor: "pointer", fontWeight: "bold" }}>
                          Accept Request
                        </button>
                      </>
                    )}

                    {isNegotiating && (
                      <button onClick={() => navigate(`/request/${req.request_id}/negotiate`)} style={{ padding: "8px 16px", background: "#57707A", color: "white", border: "none", borderRadius: 5, cursor: "pointer", fontWeight: "bold" }}>
                        Open Negotiation Chat
                      </button>
                    )}

                    {isActive && (
                      <button onClick={() => navigate(`/project/${req.project_id}/tracking`)} style={{ padding: "8px 16px", background: "#57707A", color: "white", border: "none", borderRadius: 5, cursor: "pointer", fontWeight: "bold" }}>
                        Manage Project Tracking
                      </button>
                    )}

                    {isCompleted && (
                      <button onClick={() => navigate(`/project/${req.project_id}/tracking`)} style={{ padding: "8px 16px", background: "#DEDCDC", color: "#191D23", border: "none", borderRadius: 5, cursor: "pointer", fontWeight: "bold" }}>
                        View Project History
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* VIEW REQUIREMENTS MODAL */}
      {viewingReq && viewingReq.ai_analysis && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(25, 29, 35, 0.7)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 1000 }}>
          <div style={{ background: "white", padding: 30, borderRadius: 10, width: "100%", maxWidth: 700, maxHeight: "85vh", overflowY: "auto", border: "1px solid #C5BAC4" }}>
            <h3 style={{ marginTop: 0, color: "#191D23" }}>Requirements: {viewingReq.project_title}</h3>
            
            <div style={{ background: "#F4F5F7", padding: 15, borderRadius: 5, marginBottom: 20, border: "1px solid #DEDCDC" }}>
              <strong style={{ color: "#191D23" }}>Project Overview:</strong>
              <p style={{ margin: "5px 0 0 0", color: "#57707A" }}>{viewingReq.ai_analysis.project_overview}</p>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 20 }}>
              <div>
                <strong style={{ color: "#191D23" }}>Functional Requirements:</strong>
                <ul style={{ margin: "5px 0 0 20px", padding: 0, fontSize: 14, color: "#57707A" }}>
                  {viewingReq.ai_analysis.functional_requirements.map((r, i) => <li key={i}>{r}</li>)}
                </ul>
              </div>
              <div>
                <strong style={{ color: "#191D23" }}>Required Skills:</strong>
                <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginTop: 5 }}>
                  {viewingReq.ai_analysis.required_skills.map((s, i) => (
                    <span key={i} style={{ background: "#DEDCDC", color: "#57707A", padding: "4px 10px", borderRadius: 15, fontSize: 12, fontWeight: "bold" }}>{s}</span>
                  ))}
                </div>
              </div>
            </div>

            <div style={{ marginBottom: 20 }}>
              <strong style={{ color: "#191D23" }}>Suggested Modules:</strong>
              <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 10, fontSize: 14 }}>
                <tbody>
                  {viewingReq.ai_analysis.suggested_modules.map((mod, i) => (
                    <tr key={i} style={{ borderBottom: "1px solid #DEDCDC" }}>
                      <td style={{ padding: "8px 0", fontWeight: "bold", width: "30%", color: "#191D23" }}>{mod.module_name}</td>
                      <td style={{ padding: "8px 0", color: "#7E919F" }}>{mod.description}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 20 }}>
              <button onClick={() => setViewingReq(null)} style={{ padding: "10px 20px", background: "#57707A", color: "white", border: "none", borderRadius: 5, cursor: "pointer", fontWeight: "bold" }}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const statCardStyle = { backgroundColor: "white", padding: "20px", borderRadius: "10px", boxShadow: "0 2px 4px rgba(0,0,0,0.05)", borderLeft: "4px solid #57707A", borderTop: "1px solid #C5BAC4", borderRight: "1px solid #C5BAC4", borderBottom: "1px solid #C5BAC4" };
const statTitleStyle = { margin: "0 0 10px 0", fontSize: "14px", color: "#7E919F", textTransform: "uppercase", letterSpacing: "1px" };
const statNumberStyle = { margin: 0, fontSize: "32px", fontWeight: "bold", color: "#191D23" };