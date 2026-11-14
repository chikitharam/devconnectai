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

  useEffect(() => { fetchDashboardData(); }, []);

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
    if (!window.confirm("Are you sure you want to delete this project?")) return;
    try {
      await api.delete(`/projects/${projectId}`);
      fetchDashboardData();
    } catch (err) {
      alert("Failed to delete project.");
    }
  };

  if (loading) return <div style={{ padding: 40 }}>Loading dashboard...</div>;

  return (
    <div className="app-container">
      {/* SIDEBAR */}
      <aside className="sidebar">
        <div className="sidebar-logo">DevConnect<span>AI</span></div>
        <nav className="sidebar-nav">
          <div className="nav-item active">Dashboard</div>
        </nav>
        <button onClick={logout} className="btn btn-primary" style={{ marginTop: "auto" }}>Logout</button>
      </aside>

      {/* MAIN CONTENT */}
      <main className="main-content">
        <header className="header">
          <div>
            <h1 style={{ fontSize: "28px", margin: 0 }}>Welcome, {data?.welcome_name}!</h1>
            <p style={{ marginTop: "5px" }}>Manage your projects and requests here.</p>
          </div>
          <button onClick={() => navigate("/customer/project/new")} className="btn btn-primary">
            + Create New Project
          </button>
        </header>

        {/* STATS GRID */}
        <div className="stat-grid">
          <div className="stat-card"><div className="stat-title">My Projects</div><div className="stat-value">{data?.my_projects}</div></div>
          <div className="stat-card"><div className="stat-title">Sent Requests</div><div className="stat-value">{data?.sent_requests}</div></div>
          <div className="stat-card"><div className="stat-title">Active Projects</div><div className="stat-value">{data?.active_projects}</div></div>
          <div className="stat-card"><div className="stat-title">Completed</div><div className="stat-value">{data?.completed_projects}</div></div>
        </div>

        {/* PROJECT HISTORY */}
        <section style={{ marginBottom: 50 }}>
          <h2 style={{ fontSize: "20px", marginBottom: "20px" }}>Project History</h2>
          {projects.length === 0 ? (
            <div className="card" style={{ textAlign: "center", padding: "40px" }}><p>You haven't created any projects yet.</p></div>
          ) : (
            <div style={{ display: "grid", gap: 15 }}>
              {projects.map(proj => (
                <div key={proj.project_id} className="card" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <h3 style={{ margin: "0 0 8px 0", fontSize: "18px" }}>{proj.project_title || "Untitled Project"}</h3>
                    <div style={{ display: "flex", gap: 20, fontSize: 14 }}>
                      <span>Status: <span className="badge badge-neutral">{proj.project_status.replace("_", " ")}</span></span>
                      <span>Budget: <strong>{proj.budget || "N/A"}</strong></span>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 10 }}>
                    {proj.requirements_approved ? (
                      <button onClick={() => navigate(`/customer/project/${proj.project_id}/matching`)} className="btn btn-secondary">View Matches</button>
                    ) : (
                      <button onClick={() => navigate(`/customer/project/${proj.project_id}/analysis`)} className="btn btn-outline">Review AI Analysis</button>
                    )}
                    <button onClick={() => handleDeleteProject(proj.project_id)} className="btn btn-danger">Delete</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* SENT REQUESTS */}
        <section style={{ marginBottom: 50 }}>
          <h2 style={{ fontSize: "20px", marginBottom: "20px" }}>Sent Requests</h2>
          {requests.length === 0 ? (
            <div className="card" style={{ textAlign: "center", padding: "40px" }}><p>You haven't sent any requests yet.</p></div>
          ) : (
            <div style={{ display: "grid", gap: 15 }}>
              {requests.map(req => (
                <div key={req.request_id} className="card" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <h3 style={{ margin: "0 0 8px 0", fontSize: "18px" }}>{req.project_title}</h3>
                    <div style={{ display: "flex", gap: 20, fontSize: 14 }}>
                      <span>Status: <span className={`badge ${req.status === 'Pending' ? 'badge-pending' : 'badge-success'}`}>{req.status}</span></span>
                      <span>Budget: <strong>{req.proposed_budget}</strong></span>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 10 }}>
                    {(req.status === "Accepted" || req.status === "Negotiating") && (
                      <button onClick={() => navigate(`/request/${req.request_id}/negotiate`)} className="btn btn-primary">Open Negotiation</button>
                    )}
                    {req.status === "Active" && (
                      <button onClick={() => navigate(`/project/${req.project_id}/tracking`)} className="btn btn-primary">Track Progress</button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* RECOMMENDED DEVELOPERS */}
        <section>
          <h2 style={{ fontSize: "20px", marginBottom: "20px" }}>Recommended Developers</h2>
          {developers.length === 0 ? (
             <div className="card" style={{ textAlign: "center", padding: "40px" }}><p>No developers found yet.</p></div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "20px" }}>
              {developers.slice(0, 3).map(dev => <DeveloperCard key={dev.id} dev={dev} />)}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}