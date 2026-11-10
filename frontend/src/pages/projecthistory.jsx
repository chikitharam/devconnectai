import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../services/api";

export default function ProjectHistory() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const res = await api.get(`/projects/${id}/history`);
        setData(res.data);
      } catch (err) {
        alert("Failed to load history");
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
  }, [id]);

  if (loading) return <div style={{ padding: 40 }}>Loading history...</div>;
  if (!data) return <div style={{ padding: 40 }}>No history found.</div>;

  return (
    <div style={{ maxWidth: 800, margin: "40px auto", padding: 20, fontFamily: "sans-serif" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 30 }}>
        <div>
          <h2 style={{ margin: 0 }}>Project History</h2>
          <p style={{ color: "#64748b" }}>{data.project_title}</p>
        </div>
        <button onClick={() => navigate(-1)} style={{ padding: "8px 16px", background: "#f1f5f9", border: "none", borderRadius: 5, cursor: "pointer" }}>Back</button>
      </div>

      <div style={{ background: "white", padding: 30, borderRadius: 10, border: "1px solid #e2e8f0", marginBottom: 20 }}>
        <h3 style={{ marginTop: 0 }}>Original Idea</h3>
        <p style={{ fontStyle: "italic", color: "#475569" }}>"{data.original_description}"</p>
        
        <h3 style={{ marginTop: 30 }}>Final Agreement Terms</h3>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 15 }}>
          <div><strong>Budget:</strong> {data.final_budget || "N/A"}</div>
          <div><strong>Deadline:</strong> {data.final_deadline || "N/A"}</div>
          <div style={{ gridColumn: "1 / -1" }}><strong>Scope:</strong> {data.project_scope || "N/A"}</div>
        </div>

        <h3 style={{ marginTop: 30 }}>Milestones</h3>
        <ul>
          {data.milestones.map((m, i) => (
            <li key={i} style={{ marginBottom: 5 }}>
              {m.title} - <strong style={{ color: m.status === "Completed" ? "#16a34a" : "#f59e0b" }}>{m.status}</strong>
            </li>
          ))}
        </ul>

        {data.delivery && (
          <>
            <h3 style={{ marginTop: 30 }}>Final Delivery</h3>
            <p>{data.delivery.delivery_description}</p>
            <div style={{ display: "flex", gap: 10, marginTop: 10 }}>
              <a href={`http://127.0.0.1:8000${data.delivery.zip_file_path}`} target="_blank" rel="noreferrer" style={{ padding: "8px 16px", background: "#2563eb", color: "white", textDecoration: "none", borderRadius: 5 }}>Download ZIP</a>
              {data.delivery.doc_file_path && <a href={`http://127.0.0.1:8000${data.delivery.doc_file_path}`} target="_blank" rel="noreferrer" style={{ padding: "8px 16px", background: "#f1f5f9", border: "1px solid #cbd5e1", color: "#334155", textDecoration: "none", borderRadius: 5 }}>Documentation</a>}
            </div>
          </>
        )}
      </div>
    </div>
  );
}