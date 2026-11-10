import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";

export default function CreateProject() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [inputMode, setInputMode] = useState("text"); 

  // --- VOICE RECORDING STATE ---
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState(null);
  const [audioUrl, setAudioUrl] = useState(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  // --- TEXT FORM STATE ---
  const [formData, setFormData] = useState({
    project_title: "",
    raw_description: "",
    budget: "",
    deadline: "",
    platform: "web",
    additional_info: ""
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // --- AUDIO RECORDING FUNCTIONS ---
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        const audioUrl = URL.createObjectURL(audioBlob);
        setAudioBlob(audioBlob);
        setAudioUrl(audioUrl);
      };

      mediaRecorder.start();
      setIsRecording(true);
      setError("");
    } catch (err) {
      setError("Microphone access denied. Please allow microphone permissions.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
    }
  };

  const submitAudioForTranscription = async () => {
    if (!audioBlob) return;
    setLoading(true);
    setError("");

    const formData = new FormData();
    formData.append("file", audioBlob, "recording.webm");

    try {
      const res = await api.post("/ai/transcribe", formData);
      setFormData({ ...formData, raw_description: res.data.transcript });
      setInputMode("text"); 
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to transcribe audio");
    } finally {
      setLoading(false);
    }
  };

  // --- FINAL SUBMISSION + AI ANALYSIS ---
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.raw_description.trim()) {
      setError("Please describe your project idea.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const payload = {
        ...formData,
        input_type: inputMode,
        deadline: formData.deadline ? formData.deadline : null,
      };

      // 1. Save Project
      const projectRes = await api.post("/projects", payload);
      const newProject = projectRes.data;
      
      // 2. Analyze with AI
      await api.post("/ai/analyze-project", {
        project_id: newProject.project_id,
        description: newProject.raw_description
      });
      
      // 3. Redirect to Analysis Page
      navigate(`/customer/project/${newProject.project_id}/analysis`);
      
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to create project or analyze with AI");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 700, margin: "40px auto", padding: "20px", fontFamily: "sans-serif" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "30px" }}>
        <h2 style={{ margin: 0 }}>Create New Project</h2>
        <button onClick={() => navigate("/customer/dashboard")} style={{ padding: "8px 16px", cursor: "pointer" }}>
          Cancel
        </button>
      </div>

      {error && <div style={{ background: "#fee2e2", color: "#b91c1c", padding: "10px", borderRadius: "5px", marginBottom: "20px" }}>{error}</div>}

      <div style={{ marginBottom: "30px" }}>
        <h3 style={{ fontSize: "18px", marginBottom: "15px" }}>How would you like to explain your idea?</h3>
        <div style={{ display: "flex", gap: "20px" }}>
          <div 
            onClick={() => setInputMode("voice")}
            style={{ flex: 1, padding: "20px", border: inputMode === "voice" ? "2px solid #2563eb" : "1px solid #cbd5e1", borderRadius: "10px", cursor: "pointer", textAlign: "center", background: inputMode === "voice" ? "#eff6ff" : "white" }}
          >
            <div style={{ fontSize: "30px", marginBottom: "10px" }}>🎤</div>
            <strong>Voice Input</strong>
          </div>

          <div 
            onClick={() => setInputMode("text")}
            style={{ flex: 1, padding: "20px", border: inputMode === "text" ? "2px solid #2563eb" : "1px solid #cbd5e1", borderRadius: "10px", cursor: "pointer", textAlign: "center", background: inputMode === "text" ? "#eff6ff" : "white" }}
          >
            <div style={{ fontSize: "30px", marginBottom: "10px" }}>⌨️</div>
            <strong>Text Input</strong>
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gap: "20px", background: "white", padding: "30px", borderRadius: "10px", boxShadow: "0 2px 4px rgba(0,0,0,0.05)" }}>
        {inputMode === "voice" ? (
          <div style={{ padding: "40px", textAlign: "center", background: "#f8fafc", borderRadius: "10px", border: "1px dashed #cbd5e1" }}>
            <h3>Describe Your Project</h3>
            {!isRecording && !audioUrl && (
              <button type="button" onClick={startRecording} style={{ padding: "15px 30px", background: "#2563eb", color: "white", border: "none", borderRadius: "30px", fontSize: "18px", cursor: "pointer", margin: "0 auto" }}>
                🔴 Start Recording
              </button>
            )}

            {isRecording && (
              <div>
                <p style={{ color: "#ef4444", fontWeight: "bold", fontSize: "18px" }}>Recording... 🎙️</p>
                <button type="button" onClick={stopRecording} style={{ padding: "15px 30px", background: "#ef4444", color: "white", border: "none", borderRadius: "30px", fontSize: "18px", cursor: "pointer", margin: "20px auto" }}>
                  ⏹️ Stop Recording
                </button>
              </div>
            )}

            {audioUrl && (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "20px" }}>
                <audio src={audioUrl} controls style={{ width: "100%", maxWidth: "400px" }} />
                <button type="button" onClick={submitAudioForTranscription} disabled={loading} style={{ padding: "12px 24px", background: "#16a34a", color: "white", border: "none", borderRadius: "8px", fontSize: "16px", cursor: loading ? "not-allowed" : "pointer" }}>
                  {loading ? "Transcribing..." : "Submit Audio & Transcribe"}
                </button>
                <button type="button" onClick={() => { setAudioUrl(null); setAudioBlob(null); }} style={{ background: "transparent", color: "#64748b", border: "none", textDecoration: "underline", cursor: "pointer" }}>
                  Re-record
                </button>
              </div>
            )}
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: "grid", gap: "20px" }}>
            <div>
              <label style={{ fontWeight: "bold" }}>Describe your project *</label>
              <textarea 
                name="raw_description" 
                value={formData.raw_description} 
                onChange={handleChange} 
                rows="8" 
                placeholder="I need a website that does..."
                style={{ padding: "10px", fontSize: "16px", borderRadius: "5px", border: "1px solid #cbd5e1", width: "100%", boxSizing: "border-box" }}
                required
              />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
              <div>
                <label style={{ fontWeight: "bold" }}>Project Title (Optional)</label>
                <input type="text" name="project_title" value={formData.project_title} onChange={handleChange} style={{ width: "100%", padding: "10px", marginTop: "5px", borderRadius: "5px", border: "1px solid #cbd5e1", boxSizing: "border-box" }} />
              </div>
              <div>
                <label style={{ fontWeight: "bold" }}>Budget Range (Optional)</label>
                <input type="text" name="budget" value={formData.budget} onChange={handleChange} placeholder="e.g. $500 - $1000" style={{ width: "100%", padding: "10px", marginTop: "5px", borderRadius: "5px", border: "1px solid #cbd5e1", boxSizing: "border-box" }} />
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
              <div>
                <label style={{ fontWeight: "bold" }}>Expected Deadline (Optional)</label>
                <input type="date" name="deadline" value={formData.deadline} onChange={handleChange} style={{ width: "100%", padding: "10px", marginTop: "5px", borderRadius: "5px", border: "1px solid #cbd5e1", boxSizing: "border-box" }} />
              </div>
              <div>
                <label style={{ fontWeight: "bold" }}>Preferred Platform</label>
                <select name="platform" value={formData.platform} onChange={handleChange} style={{ width: "100%", padding: "10px", marginTop: "5px", borderRadius: "5px", border: "1px solid #cbd5e1", boxSizing: "border-box" }}>
                  <option value="web">Web Application</option>
                  <option value="mobile">Mobile App</option>
                  <option value="desktop">Desktop Software</option>
                </select>
              </div>
            </div>

            <div>
              <label style={{ fontWeight: "bold" }}>Additional Information (Optional)</label>
              <textarea name="additional_info" value={formData.additional_info} onChange={handleChange} rows="3" placeholder="Any other details..." style={{ width: "100%", padding: "10px", marginTop: "5px", borderRadius: "5px", border: "1px solid #cbd5e1", boxSizing: "border-box" }} />
            </div>

            <button type="submit" disabled={loading} style={{ padding: "15px", background: loading ? "#93c5fd" : "#2563eb", color: "white", border: "none", borderRadius: "5px", fontSize: "16px", fontWeight: "bold", cursor: loading ? "not-allowed" : "pointer", marginTop: "10px" }}>
              {loading ? "Analyzing..." : "Submit & Analyze with AI"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}