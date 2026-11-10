import { useNavigate } from "react-router-dom";

export default function DeveloperCard({ dev }) {
  const navigate = useNavigate();

  return (
    <div style={{
      border: "1px solid #e2e8f0", borderRadius: "10px", padding: "20px",
      backgroundColor: "white", display: "flex", flexDirection: "column", gap: "10px"
    }}>
      <h3 style={{ margin: 0, color: "#1e293b" }}>{dev?.name || "Unknown Developer"}</h3>
      
      <div>
        <strong>Skills:</strong>
        <div style={{ display: "flex", gap: "5px", flexWrap: "wrap", marginTop: "5px" }}>
          {dev?.skills?.length > 0 ? dev.skills.map((skill, i) => (
            <span key={i} style={{ background: "#e0e7ff", color: "#4338ca", padding: "2px 8px", borderRadius: "12px", fontSize: "12px" }}>
              {skill}
            </span>
          )) : <span style={{ color: "#94a3b8", fontSize: "14px" }}>None listed</span>}
        </div>
      </div>

      <p style={{ margin: 0, fontSize: "14px" }}>
        <strong>Experience:</strong> {dev?.experience_years || 0} years
      </p>

      <div style={{ fontSize: "14px" }}>
        <strong>Previous Projects:</strong>
        {dev?.previous_projects?.length > 0 ? (
          <ul style={{ margin: "5px 0 0 20px", padding: 0 }}>
            {dev.previous_projects.slice(0, 2).map((proj, i) => (
              <li key={i}>{proj.name}</li>
            ))}
          </ul>
        ) : <p style={{ margin: 0, color: "#64748b" }}>No projects listed</p>}
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "10px" }}>
        <span style={{ 
          fontWeight: "bold", 
          color: dev?.availability === "Available" ? "#16a34a" : "#dc2626" 
        }}>
          {dev?.availability || "Unknown"}
        </span>
        <div style={{ display: "flex", gap: "10px" }}>
          <button 
            onClick={() => navigate(`/developer/public/${dev?.user_id}`)}
            style={{ padding: "6px 12px", background: "#f1f5f9", border: "none", borderRadius: "5px", cursor: "pointer" }}
          >
            View Profile
          </button>
          <button 
            style={{ padding: "6px 12px", background: "#2563eb", color: "white", border: "none", borderRadius: "5px", cursor: "pointer" }}
          >
            Send Request
          </button>
        </div>
      </div>
    </div>
  );
}