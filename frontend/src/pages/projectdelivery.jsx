import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../services/api";

export default function ProjectDelivery() {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [formData, setFormData] = useState({
    delivery_description: "",
    github_link: ""
  });
  const [zipFile, setZipFile] = useState(null);
  const [docFile, setDocFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!zipFile) return setError("Please upload the software ZIP file");
    
    setLoading(true);
    setError("");

    const data = new FormData();
    data.append("delivery_description", formData.delivery_description);
    data.append("github_link", formData.github_link);
    data.append("zip_file", zipFile);
    if (docFile) data.append("doc_file", docFile);

    try {
      await api.post(`/projects/${id}/deliver`, data, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      alert("Project delivered successfully!");
      navigate(`/project/${id}/tracking`);
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to deliver project");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 600, margin: "40px auto", padding: 20, fontFamily: "sans-serif" }}>
      <h2>Deliver Project</h2>
      <p style={{ color: "#64748b" }}>Upload the final files for the customer to review.</p>

      {error && <div style={{ background: "#fee2e2", color: "#b91c1c", padding: 10, borderRadius: 5, marginBottom: 15 }}>{error}</div>}

      <form onSubmit={handleSubmit} style={{ display: "grid", gap: 20, background: "white", padding: 30, borderRadius: 10, border: "1px solid #e2e8f0" }}>
        <div>
          <label style={{ fontWeight: "bold" }}>Delivery Description *</label>
          <textarea required rows="4" value={formData.delivery_description} onChange={e => setFormData({...formData, delivery_description: e.target.value})} style={{ width: "100%", padding: 10, marginTop: 5, borderRadius: 5, border: "1px solid #cbd5e1" }} placeholder="Summarize what was built and how to run it..." />
        </div>

        <div>
          <label style={{ fontWeight: "bold" }}>Software ZIP File (Max 50MB) *</label>
          <input type="file" accept=".zip" required onChange={e => setZipFile(e.target.files[0])} style={{ width: "100%", marginTop: 5 }} />
        </div>

        <div>
          <label style={{ fontWeight: "bold" }}>Documentation (PDF/DOCX)</label>
          <input type="file" accept=".pdf,.docx" onChange={e => setDocFile(e.target.files[0])} style={{ width: "100%", marginTop: 5 }} />
        </div>

        <div>
          <label style={{ fontWeight: "bold" }}>GitHub Repository Link</label>
          <input type="url" value={formData.github_link} onChange={e => setFormData({...formData, github_link: e.target.value})} style={{ width: "100%", padding: 10, marginTop: 5, borderRadius: 5, border: "1px solid #cbd5e1" }} placeholder="https://github.com/..." />
        </div>

        <button type="submit" disabled={loading} style={{ padding: 15, background: "#2563eb", color: "white", border: "none", borderRadius: 5, fontSize: 16, fontWeight: "bold", cursor: "pointer", marginTop: 10 }}>
          {loading ? "Uploading..." : "Submit Delivery"}
        </button>
      </form>
    </div>
  );
}