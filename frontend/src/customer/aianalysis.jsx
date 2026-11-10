import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../services/api";

export default function AIAnalysis() {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [data, setData] = useState(null);
  const [rawDescription, setRawDescription] = useState("");
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // --- CLARIFICATION STATE ---
  const [showClarifyModal, setShowClarifyModal] = useState(false);
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [generatingQuestions, setGeneratingQuestions] = useState(false);
  const [refining, setRefining] = useState(false);

  // --- TTS AUDIO STATE ---
  const [loadingAudio, setLoadingAudio] = useState(false);

  useEffect(() => {
    const fetchAnalysis = async () => {
      try {
        const res = await api.get(`/projects/${id}/analysis`);
        setData(res.data.ai_analysis);
        setRawDescription(res.data.raw_description);
      } catch (err) {
        setError("Failed to load analysis.");
      } finally {
        setLoading(false);
      }
    };
    fetchAnalysis();
  }, [id]);

  // --- EDITING HANDLERS ---
  const handleChange = (e) => {
    setData({ ...data, [e.target.name]: e.target.value });
  };

  const handleArrayChange = (index, field, value) => {
    const newArray = [...data[field]];
    newArray[index] = value;
    setData({ ...data, [field]: newArray });
  };

  const addArrayItem = (field) => {
    setData({ ...data, [field]: [...data[field], ""] });
  };

  const removeArrayItem = (index, field) => {
    const newArray = data[field].filter((_, i) => i !== index);
    setData({ ...data, [field]: newArray });
  };

  const handleModuleChange = (index, field, value) => {
    const newModules = [...data.suggested_modules];
    newModules[index][field] = value;
    setData({ ...data, suggested_modules: newModules });
  };

  const addModule = () => {
    setData({ ...data, suggested_modules: [...data.suggested_modules, { module_name: "", description: "" }] });
  };

  const removeModule = (index) => {
    const newModules = data.suggested_modules.filter((_, i) => i !== index);
    setData({ ...data, suggested_modules: newModules });
  };

  // --- APPROVE HANDLER (UPDATED FOR DAY 15) ---
  const handleApprove = async () => {
    setSaving(true);
    try {
      await api.put(`/projects/${id}/requirements`, data);
      alert("Project requirements approved successfully!");
      // Redirect to the matching page
      navigate(`/customer/project/${id}/matching`);
    } catch (err) {
      alert("Failed to approve requirements.");
    } finally {
      setSaving(false);
    }
  };

  // --- TTS HANDLER ---
  const handleListenToSummary = async () => {
    if (!data) return;
    setLoadingAudio(true);
    try {
      const textToRead = `Your project is titled ${data.project_title}. Overview: ${data.project_overview}. The required skills include ${data.required_skills.join(", ")}. The complexity is ${data.complexity}.`;
      
      const response = await api.post("/ai/speak-summary", { text: textToRead }, {
        responseType: 'blob' 
      });

      const audioUrl = URL.createObjectURL(response.data);
      const audio = new Audio(audioUrl);
      audio.play();
      audio.onended = () => URL.revokeObjectURL(audioUrl);
    } catch (err) {
      alert("Failed to generate audio. The TTS service might be unavailable.");
    } finally {
      setLoadingAudio(false);
    }
  };

  // --- CLARIFICATION HANDLERS ---
  const generateQuestions = async () => {
    setGeneratingQuestions(true);
    try {
      const res = await api.post("/ai/clarify", {
        project_id: parseInt(id),
        description: rawDescription 
      });
      setQuestions(res.data.questions);
      setShowClarifyModal(true);
    } catch (err) {
      alert("Failed to generate questions.");
    } finally {
      setGeneratingQuestions(false);
    }
  };

  const submitClarifications = async () => {
    setRefining(true);
    try {
      const qaList = questions.map(q => ({
        question: q,
        answer: answers[q] || "No specific preference"
      }));

      const res = await api.post("/ai/analyze-project", {
        project_id: parseInt(id),
        description: rawDescription,
        clarification_qa: qaList
      });

      setData(res.data); 
      setShowClarifyModal(false);
      alert("Requirements refined successfully!");
    } catch (err) {
      alert("Failed to refine analysis.");
    } finally {
      setRefining(false);
    }
  };

  if (loading) return <div style={{ padding: 40 }}>Loading AI Analysis...</div>;
  if (error) return <div style={{ padding: 40, color: "red" }}>{error}</div>;
  if (!data) return <div style={{ padding: 40 }}>No analysis found for this project.</div>;

  return (
    <div style={{ maxWidth: 900, margin: "40px auto", padding: 20, fontFamily: "sans-serif" }}>
      
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 30 }}>
        <div>
          <h2 style={{ margin: 0 }}>Finalize Project Requirements</h2>
          <p style={{ color: "#64748b", marginTop: 5 }}>Review, edit, and approve before finding developers.</p>
        </div>
        
        {/* UPDATED BUTTON GROUP */}
        <div style={{ display: "flex", gap: 10 }}>
          <button 
            onClick={handleListenToSummary} 
            disabled={loadingAudio}
            style={{ padding: "10px 20px", background: "#10b981", color: "white", border: "none", borderRadius: 5, cursor: loadingAudio ? "not-allowed" : "pointer", fontWeight: "bold" }}
          >
            {loadingAudio ? "Generating Audio..." : "🔊 Listen to Summary"}
          </button>

          <button 
            onClick={generateQuestions} 
            disabled={generatingQuestions}
            style={{ padding: "10px 20px", background: "#e0e7ff", color: "#4338ca", border: "none", borderRadius: 5, cursor: "pointer", fontWeight: "bold" }}
          >
            {generatingQuestions ? "Thinking..." : "✨ Improve with AI"}
          </button>
          
          <button 
            onClick={() => navigate("/customer/dashboard")}
            style={{ padding: "10px 20px", background: "#f1f5f9", border: "none", borderRadius: 5, cursor: "pointer" }}
          >
            Back
          </button>
        </div>
      </div>

      {/* ORIGINAL DESCRIPTION (READ ONLY) */}
      <div style={{ background: "#f8fafc", padding: 20, borderRadius: 10, marginBottom: 20, border: "1px dashed #cbd5e1" }}>
        <h4 style={{ margin: "0 0 10px 0", color: "#64748b" }}>Original Idea Submitted by You:</h4>
        <p style={{ margin: 0, fontStyle: "italic", color: "#475569" }}>"{rawDescription}"</p>
      </div>

      <div style={{ background: "white", padding: 30, borderRadius: 10, boxShadow: "0 2px 4px rgba(0,0,0,0.05)" }}>
        
        <div style={{ marginBottom: 20 }}>
          <label style={{ fontWeight: "bold", display: "block", marginBottom: 5 }}>Project Title</label>
          {isEditing ? (
            <input name="project_title" value={data.project_title} onChange={handleChange} style={{ width: "100%", padding: 10, borderRadius: 5, border: "1px solid #cbd5e1" }} />
          ) : (
            <h3 style={{ margin: 0, color: "#1e293b" }}>{data.project_title}</h3>
          )}
        </div>

        <div style={{ marginBottom: 20 }}>
          <label style={{ fontWeight: "bold", display: "block", marginBottom: 5 }}>Project Overview</label>
          {isEditing ? (
            <textarea name="project_overview" value={data.project_overview} onChange={handleChange} rows="3" style={{ width: "100%", padding: 10, borderRadius: 5, border: "1px solid #cbd5e1" }} />
          ) : (
            <p style={{ margin: 0, color: "#475569" }}>{data.project_overview}</p>
          )}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 20 }}>
          <div>
            <label style={{ fontWeight: "bold", display: "block", marginBottom: 5 }}>Functional Requirements</label>
            {isEditing ? (
              <div>
                {data.functional_requirements.map((req, i) => (
                  <div key={i} style={{ display: "flex", gap: 5, marginBottom: 5 }}>
                    <input value={req} onChange={(e) => handleArrayChange(i, "functional_requirements", e.target.value)} style={{ flex: 1, padding: 8, borderRadius: 5, border: "1px solid #cbd5e1" }} />
                    <button onClick={() => removeArrayItem(i, "functional_requirements")} style={{ background: "#fee2e2", color: "#b91c1c", border: "none", borderRadius: 5, padding: "0 10px", cursor: "pointer" }}>X</button>
                  </div>
                ))}
                <button onClick={() => addArrayItem("functional_requirements")} style={{ padding: "5px 10px", background: "#f1f5f9", border: "none", borderRadius: 5, cursor: "pointer", fontSize: 12 }}>+ Add Feature</button>
              </div>
            ) : (
              <ul style={{ margin: 0, paddingLeft: 20 }}>{data.functional_requirements.map((r, i) => <li key={i}>{r}</li>)}</ul>
            )}
          </div>

          <div>
            <label style={{ fontWeight: "bold", display: "block", marginBottom: 5 }}>Non-Functional Requirements</label>
            {isEditing ? (
              <div>
                {data.non_functional_requirements.map((req, i) => (
                  <div key={i} style={{ display: "flex", gap: 5, marginBottom: 5 }}>
                    <input value={req} onChange={(e) => handleArrayChange(i, "non_functional_requirements", e.target.value)} style={{ flex: 1, padding: 8, borderRadius: 5, border: "1px solid #cbd5e1" }} />
                    <button onClick={() => removeArrayItem(i, "non_functional_requirements")} style={{ background: "#fee2e2", color: "#b91c1c", border: "none", borderRadius: 5, padding: "0 10px", cursor: "pointer" }}>X</button>
                  </div>
                ))}
                <button onClick={() => addArrayItem("non_functional_requirements")} style={{ padding: "5px 10px", background: "#f1f5f9", border: "none", borderRadius: 5, cursor: "pointer", fontSize: 12 }}>+ Add Requirement</button>
              </div>
            ) : (
              <ul style={{ margin: 0, paddingLeft: 20 }}>{data.non_functional_requirements.map((r, i) => <li key={i}>{r}</li>)}</ul>
            )}
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 20 }}>
          <div>
            <label style={{ fontWeight: "bold", display: "block", marginBottom: 5 }}>Required Skills</label>
            {isEditing ? (
              <div>
                {data.required_skills.map((skill, i) => (
                  <div key={i} style={{ display: "flex", gap: 5, marginBottom: 5 }}>
                    <input value={skill} onChange={(e) => handleArrayChange(i, "required_skills", e.target.value)} style={{ flex: 1, padding: 8, borderRadius: 5, border: "1px solid #cbd5e1" }} />
                    <button onClick={() => removeArrayItem(i, "required_skills")} style={{ background: "#fee2e2", color: "#b91c1c", border: "none", borderRadius: 5, padding: "0 10px", cursor: "pointer" }}>X</button>
                  </div>
                ))}
                <button onClick={() => addArrayItem("required_skills")} style={{ padding: "5px 10px", background: "#f1f5f9", border: "none", borderRadius: 5, cursor: "pointer", fontSize: 12 }}>+ Add Skill</button>
              </div>
            ) : (
              <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                {data.required_skills.map((s, i) => <span key={i} style={{ background: "#e0e7ff", color: "#4338ca", padding: "4px 10px", borderRadius: 15, fontSize: 14 }}>{s}</span>)}
              </div>
            )}
          </div>

          <div>
            <label style={{ fontWeight: "bold", display: "block", marginBottom: 5 }}>Suggested Technologies</label>
            {isEditing ? (
              <div>
                {data.suggested_technologies.map((tech, i) => (
                  <div key={i} style={{ display: "flex", gap: 5, marginBottom: 5 }}>
                    <input value={tech} onChange={(e) => handleArrayChange(i, "suggested_technologies", e.target.value)} style={{ flex: 1, padding: 8, borderRadius: 5, border: "1px solid #cbd5e1" }} />
                    <button onClick={() => removeArrayItem(i, "suggested_technologies")} style={{ background: "#fee2e2", color: "#b91c1c", border: "none", borderRadius: 5, padding: "0 10px", cursor: "pointer" }}>X</button>
                  </div>
                ))}
                <button onClick={() => addArrayItem("suggested_technologies")} style={{ padding: "5px 10px", background: "#f1f5f9", border: "none", borderRadius: 5, cursor: "pointer", fontSize: 12 }}>+ Add Technology</button>
              </div>
            ) : (
              <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                {data.suggested_technologies.map((t, i) => <span key={i} style={{ background: "#f1f5f9", color: "#334155", padding: "4px 10px", borderRadius: 15, fontSize: 14 }}>{t}</span>)}
              </div>
            )}
          </div>
        </div>

        <div style={{ marginBottom: 30 }}>
          <label style={{ fontWeight: "bold", display: "block", marginBottom: 5 }}>Complexity</label>
          {isEditing ? (
            <select name="complexity" value={data.complexity} onChange={handleChange} style={{ padding: 10, borderRadius: 5, border: "1px solid #cbd5e1" }}>
              <option value="Low">Low</option>
              <option value="Medium">Medium</option>
              <option value="High">High</option>
            </select>
          ) : (
            <span style={{ background: data.complexity === "High" ? "#fee2e2" : data.complexity === "Medium" ? "#fef3c7" : "#dcfce7", color: data.complexity === "High" ? "#991b1b" : data.complexity === "Medium" ? "#92400e" : "#166534", padding: "5px 15px", borderRadius: 5, fontWeight: "bold" }}>
              {data.complexity}
            </span>
          )}
        </div>

        <div style={{ marginBottom: 30 }}>
          <label style={{ fontWeight: "bold", display: "block", marginBottom: 10 }}>Suggested Project Modules</label>
          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
            <thead>
              <tr style={{ background: "#f8fafc", borderBottom: "2px solid #e2e8f0" }}>
                <th style={{ padding: 10, width: "30%" }}>Module</th>
                <th style={{ padding: 10 }}>Description</th>
                {isEditing && <th style={{ padding: 10, width: "50px" }}>Action</th>}
              </tr>
            </thead>
            <tbody>
              {data.suggested_modules.map((mod, i) => (
                <tr key={i} style={{ borderBottom: "1px solid #e2e8f0" }}>
                  <td style={{ padding: 10, fontWeight: "bold" }}>
                    {isEditing ? (
                      <input value={mod.module_name} onChange={(e) => handleModuleChange(i, "module_name", e.target.value)} style={{ width: "100%", padding: 5, borderRadius: 3, border: "1px solid #cbd5e1" }} />
                    ) : mod.module_name}
                  </td>
                  <td style={{ padding: 10 }}>
                    {isEditing ? (
                      <input value={mod.description} onChange={(e) => handleModuleChange(i, "description", e.target.value)} style={{ width: "100%", padding: 5, borderRadius: 3, border: "1px solid #cbd5e1" }} />
                    ) : mod.description}
                  </td>
                  {isEditing && (
                    <td style={{ padding: 10 }}>
                       <button onClick={() => removeModule(i)} style={{ background: "#fee2e2", color: "#b91c1c", border: "none", borderRadius: 5, padding: "5px 10px", cursor: "pointer" }}>X</button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
          {isEditing && (
            <button onClick={addModule} style={{ marginTop: 10, padding: "5px 10px", background: "#f1f5f9", border: "none", borderRadius: 5, cursor: "pointer", fontSize: 12 }}>+ Add Module</button>
          )}
        </div>

        <div style={{ display: "flex", gap: 15, justifyContent: "flex-end", borderTop: "1px solid #e2e8f0", paddingTop: 20 }}>
          {isEditing ? (
            <>
              <button onClick={() => setIsEditing(false)} style={{ padding: "10px 20px", background: "#f1f5f9", border: "none", borderRadius: 5, cursor: "pointer", fontWeight: "bold" }}>
                Cancel Edit
              </button>
              <button onClick={handleApprove} disabled={saving} style={{ padding: "10px 20px", background: "#16a34a", color: "white", border: "none", borderRadius: 5, cursor: "pointer", fontWeight: "bold" }}>
                {saving ? "Saving..." : "Approve Requirements"}
              </button>
            </>
          ) : (
            <button onClick={() => setIsEditing(true)} style={{ padding: "10px 20px", background: "#2563eb", color: "white", border: "none", borderRadius: 5, cursor: "pointer", fontWeight: "bold" }}>
              Edit / Add Missing Info
            </button>
          )}
        </div>

      </div>

      {/* CLARIFICATION MODAL */}
      {showClarifyModal && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.5)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 1000 }}>
          <div style={{ background: "white", padding: 30, borderRadius: 10, width: "100%", maxWidth: 600, maxHeight: "80vh", overflowY: "auto" }}>
            <h3 style={{ marginTop: 0 }}>Let's clarify a few things</h3>
            <p style={{ color: "#64748b", marginBottom: 20 }}>The AI needs a bit more information to generate a perfect plan.</p>
            
            {questions.map((q, index) => (
              <div key={index} style={{ marginBottom: 15 }}>
                <label style={{ fontWeight: "bold", display: "block", marginBottom: 5 }}>{q}</label>
                <textarea 
                  rows="2" 
                  value={answers[q] || ""} 
                  onChange={(e) => setAnswers({ ...answers, [q]: e.target.value })}
                  style={{ width: "100%", padding: 10, borderRadius: 5, border: "1px solid #cbd5e1", boxSizing: "border-box" }}
                  placeholder="Type your answer here..."
                />
              </div>
            ))}

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 20 }}>
              <button onClick={() => setShowClarifyModal(false)} style={{ padding: "10px 20px", background: "#f1f5f9", border: "none", borderRadius: 5, cursor: "pointer" }}>
                Cancel
              </button>
              <button onClick={submitClarifications} disabled={refining} style={{ padding: "10px 20px", background: "#2563eb", color: "white", border: "none", borderRadius: 5, cursor: "pointer", fontWeight: "bold" }}>
                {refining ? "Refining..." : "Submit Answers & Update"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}