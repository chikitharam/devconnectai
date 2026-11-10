import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";

export default function DeveloperProfile() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  
  // Form State
  const [formData, setFormData] = useState({
    bio: "", skills: [], experience_years: 0, education: "",
    github_link: "", linkedin_link: "", availability: "Available",
    expected_budget: 0, profile_photo_url: "", previous_projects: []
  });

  // Temporary states for adding new items
  const [newSkill, setNewSkill] = useState("");
  const [newProject, setNewProject] = useState({ name: "", description: "" });

  // Fetch profile on load
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await api.get("/developer/profile");
        setFormData(res.data);
        setIsEditing(true); // If it succeeds, we have a profile
      } catch (err) {
        if (err.response?.status === 404) {
          setIsEditing(false); // No profile yet, show create form
        }
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, []);

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  // Add Skill
  const addSkill = () => {
    if (newSkill.trim() && !formData.skills.includes(newSkill.trim())) {
      setFormData({ ...formData, skills: [...formData.skills, newSkill.trim()] });
      setNewSkill("");
    }
  };

  // Remove Skill
  const removeSkill = (skillToRemove) => {
    setFormData({ ...formData, skills: formData.skills.filter(s => s !== skillToRemove) });
  };

  // Add Project
  const addProject = () => {
    if (newProject.name.trim()) {
      setFormData({ ...formData, previous_projects: [...formData.previous_projects, newProject] });
      setNewProject({ name: "", description: "" });
    }
  };

  const submitForm = async (e) => {
    e.preventDefault();
    try {
      if (isEditing) {
        await api.put("/developer/profile", formData);
        alert("Profile updated successfully!");
      } else {
        await api.post("/developer/profile", formData);
        alert("Profile created successfully!");
        setIsEditing(true);
      }
    } catch (err) {
      alert("Error saving profile: " + (err.response?.data?.detail || err.message));
    }
  };

  if (loading) return <div style={{ padding: 40 }}>Loading...</div>;

  return (
    <div style={{ maxWidth: 800, margin: "40px auto", padding: 20, fontFamily: "sans-serif" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h2>{isEditing ? "Edit Developer Profile" : "Create Developer Profile"}</h2>
        <button onClick={() => navigate("/developer/dashboard")}>Back to Dashboard</button>
      </div>

      <form onSubmit={submitForm} style={{ display: "grid", gap: 15, marginTop: 20 }}>
        
        {/* Basic Info */}
        <label>Bio / Introduction</label>
        <textarea name="bio" value={formData.bio} onChange={handleChange} rows="3" placeholder="Short introduction about yourself..." />

        <label>Years of Experience</label>
        <input type="number" name="experience_years" value={formData.experience_years} onChange={handleChange} min="0" />

        <label>Education</label>
        <input type="text" name="education" value={formData.education} onChange={handleChange} placeholder="e.g. B.Tech in Computer Science" />

        {/* Skills */}
        <label>Skills</label>
        <div style={{ display: "flex", gap: 10 }}>
          <input type="text" value={newSkill} onChange={(e) => setNewSkill(e.target.value)} placeholder="e.g. Python, React" />
          <button type="button" onClick={addSkill}>Add Skill</button>
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          {formData.skills.map((skill, idx) => (
            <span key={idx} style={{ background: "#e0e7ff", padding: "5px 10px", borderRadius: 15 }}>
              {skill} <button type="button" onClick={() => removeSkill(skill)} style={{ border: "none", background: "transparent", color: "red", cursor: "pointer" }}>x</button>
            </span>
          ))}
        </div>

        {/* Previous Projects */}
        <label>Previous Projects</label>
        <div style={{ display: "flex", gap: 10 }}>
          <input type="text" placeholder="Project Name" value={newProject.name} onChange={(e) => setNewProject({ ...newProject, name: e.target.value })} />
          <input type="text" placeholder="Short Description" value={newProject.description} onChange={(e) => setNewProject({ ...newProject, description: e.target.value })} />
          <button type="button" onClick={addProject}>Add Project</button>
        </div>
        <ul>
          {formData.previous_projects.map((proj, idx) => (
            <li key={idx}><strong>{proj.name}</strong>: {proj.description}</li>
          ))}
        </ul>

        {/* Links & Availability */}
        <label>GitHub Link</label>
        <input type="url" name="github_link" value={formData.github_link} onChange={handleChange} placeholder="https://github.com/..." />

        <label>LinkedIn Link</label>
        <input type="url" name="linkedin_link" value={formData.linkedin_link} onChange={handleChange} placeholder="https://linkedin.com/in/..." />

        <label>Availability</label>
        <select name="availability" value={formData.availability} onChange={handleChange}>
          <option value="Available">Available</option>
          <option value="Busy">Busy</option>
        </select>

        <label>Expected Budget / Rate (Optional)</label>
        <input type="number" name="expected_budget" value={formData.expected_budget} onChange={handleChange} placeholder="$" />

        <button type="submit" style={{ padding: 12, background: "#2563eb", color: "white", border: "none", borderRadius: 5, fontSize: 16, marginTop: 20 }}>
          {isEditing ? "Update Profile" : "Create Profile"}
        </button>
      </form>
    </div>
  );
}