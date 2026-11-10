import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/authcontext";
import api from "../services/api";
import DeveloperCard from "../components/developercard";

export default function CustomerDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  
  const [data, setData] = useState(null);
  const [projects, setProjects] = useState([]);
  const [requests, setRequests] = useState([]);
  const [developers, setDevelopers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [statsRes, projectsRes, reqsRes, devsRes] = await Promise.all([
        api.get("/customer/dashboard"),
        api.get("/customer/projects"),
        api.get("/customer/requests"),
        api.get("/customer/dashboard")
      ]);
      
      setData(statsRes.data);
      setProjects(projectsRes.data);
      setRequests(reqsRes.data);
      setDevelopers(devsRes.data.recommended_developers || []);
    } catch (err) {
      console.error("Failed to load dashboard", err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteProject = async (projectId) => {
    if (!window.confirm("Are you sure you want to delete this project? This action cannot be undone.")) return;
    try {
      await api.delete(`/projects/${projectId}`);
      alert("Project deleted successfully.");
      fetchDashboardData();
    } catch (err) {
      alert("Failed to delete project.");
    }
  };

  if (loading) return <div style={{ padding: 40 }}>Loading dashboard...</div>;

  return (
    <div style={{ display: "flex", minHeight: "100vh", fontFamily: "sans-serif", backgroundColor: "#F4F5F7" }}>
      
      <aside style={{ width: "250px", backgroundColor: "#191D23", color: "#DEDCDC", padding: "20px" }}>
        <h2 style={{ fontSize: "20px", marginBottom: "30px", color: "#7E919F", fontWeight: "bold" }}>DevConnect AI</h2>
        <nav style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
          <span style={{ fontWeight: "bold", color: "#DEDCDC", cursor: "pointer" }}>Dashboard</span>
        </nav>
        <button onClick={logout} style={{ marginTop: "50px", padding: "10px", width: "100%", backgroundColor: "#57707A", color: "white", border: "none", borderRadius: "5px", cursor: "pointer", fontWeight: "bold" }}>
          Logout
        </button>
      </aside>

      <main style={{ flex: 1, padding: "40px", overflowY: "auto" }}>
        <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "30px" }}>
          <div>
            <h1 style={{ margin: 0, fontSize: "28px", color: "#191D23" }}>
              Welcome, {data?.welcome_name}!
            </h1>
            <p style={{ color: "#7E919F", marginTop: "5px" }}>Manage your projects and requests here.</p>
          </div>
          <button 
            onClick={() => navigate("/customer/project/new")}
            style={{ padding: "12px 24px", backgroundColor: "#57707A", color: "white", border: "none", borderRadius: "8px", fontSize: "16px", fontWeight: "bold", cursor: "pointer" }}
          >
            + Create New Project
          </button>
        </header>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "20px", marginBottom: "40px" }}>
          <div style={statCardStyle}><h3 style={statTitleStyle}>My Projects</h3><p style={statNumberStyle}>{data?.my_projects}</p></div>
          <div style={statCardStyle}><h3 style={statTitleStyle}>Sent Requests</h3><p style={statNumberStyle}>{data?.sent_requests}</p></div>
          <div style={statCardStyle}><h3 style={statTitleStyle}>Active Projects</h3><p style={statNumberStyle}>{data?.active_projects}</p></div>
          <div style={statCardStyle}><h3 style={statTitleStyle}>Completed</h3><p style={statNumberStyle}>{data?.completed_projects}</p></div>
        </div>

        <section style={{ marginBottom: 50 }}>
          <h2 style={{ fontSize: "20px", color: "#191D23", marginBottom: "15px" }}>Project History</h2>
          {projects.length === 0 ? (
            <div style={{ background: "white", padding: 30, borderRadius: 10, textAlign: "center", border: "1px solid #C5BAC4" }}>
              <p style={{ color: "#7E919F" }}>You haven't created any projects yet.</p>
            </div>
          ) : (
            <div style={{ display: "grid", gap: 15 }}>
              {projects.map(proj => (
                <div key={proj.project_id} style={{ background: "white", padding: 20, borderRadius: 10, display: "flex", justifyContent: "space-between", alignItems: "center", border: "1px solid #C5BAC4" }}>
                  <div>
                    <h3 style={{ margin: "0 0 5px 0", color: "#191D23" }}>{proj.project_title || "Untitled Project"}</h3>
                    <div style={{ display: "flex", gap: 15, fontSize: 14, color: "#7E919F" }}>
                      <span>Status: <strong style={{ color: "#57707A", textTransform: "capitalize" }}>{proj.project_status.replace("_", " ")}</strong></span>
                      <span>Budget: {proj.budget || "N/A"}</span>
                      <span>Created: {new Date(proj.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 10 }}>
                    {proj.requirements_approved ? (
                      <button onClick={() => navigate(`/customer/project/${proj.project_id}/matching`)} style={{ padding: "8px 16px", background: "#DEDCDC", color: "#191D23", border: "none", borderRadius: 5, cursor: "pointer", fontWeight: "bold" }}>
                        View Matches
                      </button>
                    ) : (
                      <button onClick={() => navigate(`/customer/project/${proj.project_id}/analysis`)} style={{ padding: "8px 16px", background: "#7E919F", color: "white", border: "none", borderRadius: 5, cursor: "pointer", fontWeight: "bold" }}>
                        Review AI Analysis
                      </button>
                    )}
                    <button onClick={() => handleDeleteProject(proj.project_id)} style={{ padding: "8px 16px", background: "#fee2e2", color: "#b91c1c", border: "none", borderRadius: 5, cursor: "pointer", fontWeight: "bold" }}>
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section style={{ marginBottom: 50 }}>
          <h2 style={{ fontSize: "20px", color: "#191D23", marginBottom: "15px" }}>Sent Requests</h2>
          {requests.length === 0 ? (
            <div style={{ background: "white", padding: 30, borderRadius: 10, textAlign: "center", border: "1px solid #C5BAC4" }}>
              <p style={{ color: "#7E919F" }}>You haven't sent any requests to developers yet.</p>
            </div>
          ) : (
            <div style={{ display: "grid", gap: 15 }}>
              {requests.map(req => (
                <div key={req.request_id} style={{ background: "white", padding: 20, borderRadius: 10, display: "flex", justifyContent: "space-between", alignItems: "center", border: "1px solid #C5BAC4" }}>
                  <div>
                    <h3 style={{ margin: "0 0 5px 0", color: "#191D23" }}>{req.project_title}</h3>
                    <div style={{ display: "flex", gap: 15, fontSize: 14, color: "#7E919F" }}>
                      <span>Status: <strong style={{ color: req.status === "Pending" ? "#f59e0b" : req.status === "Rejected" ? "#ef4444" : "#4F7B6B" }}>{req.status}</strong></span>
                      <span>Proposed Budget: {req.proposed_budget}</span>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 10 }}>
                    {(req.status === "Accepted" || req.status === "Negotiating") && (
                      <button onClick={() => navigate(`/request/${req.request_id}/negotiate`)} style={{ padding: "8px 16px", background: "#57707A", color: "white", border: "none", borderRadius: 5, cursor: "pointer", fontWeight: "bold" }}>
                        Open Negotiation
                      </button>
                    )}
                    {req.status === "Active" && (
                      <button onClick={() => navigate(`/project/${req.project_id}/tracking`)} style={{ padding: "8px 16px", background: "#57707A", color: "white", border: "none", borderRadius: 5, cursor: "pointer", fontWeight: "bold" }}>
                        Track Progress
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section>
          <h2 style={{ fontSize: "20px", color: "#191D23", marginBottom: "15px" }}>Recommended Developers</h2>
          {developers.length === 0 ? (
            <div style={{ backgroundColor: "white", padding: "30px", borderRadius: "10px", textAlign: "center", border: "1px solid #C5BAC4" }}>
              <p style={{ color: "#7E919F", margin: 0 }}>No developers found yet.</p>
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "20px" }}>
              {developers.slice(0, 3).map(dev => (
                <DeveloperCard key={dev.id} dev={dev} />
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

const statCardStyle = { backgroundColor: "white", padding: "20px", borderRadius: "10px", boxShadow: "0 2px 4px rgba(0,0,0,0.05)", borderLeft: "4px solid #57707A", borderTop: "1px solid #C5BAC4", borderRight: "1px solid #C5BAC4", borderBottom: "1px solid #C5BAC4" };
const statTitleStyle = { margin: "0 0 10px 0", fontSize: "14px", color: "#7E919F", textTransform: "uppercase", letterSpacing: "1px" };
const statNumberStyle = { margin: 0, fontSize: "32px", fontWeight: "bold", color: "#191D23" };