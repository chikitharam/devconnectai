import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../services/api";
import { useAuth } from "../context/authcontext";

export default function Negotiation() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [request, setRequest] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  
  const [agreement, setAgreement] = useState({ final_budget: "", final_deadline: "", project_scope: "" });
  const [isEditingAgreement, setIsEditingAgreement] = useState(false);

  const chatEndRef = useRef(null);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 3000); // Poll every 3 seconds
    return () => clearInterval(interval);
  }, [id]);

  const fetchData = async () => {
    try {
      const msgRes = await api.get(`/requests/${id}/messages`);
      setMessages(msgRes.data);
      
      const rolePath = user.role === "customer" ? "customer" : "developer";
      const reqRes = await api.get(`/${rolePath}/requests`);
      const currentReq = reqRes.data.find(r => r.request_id === parseInt(id));
      
      if (currentReq) {
        setRequest(currentReq);
        if (!isEditingAgreement) {
          setAgreement({
            final_budget: currentReq.final_budget || currentReq.proposed_budget || "",
            final_deadline: currentReq.final_deadline || currentReq.proposed_deadline || "",
            project_scope: currentReq.project_scope || currentReq.required_services || ""
          });
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;
    try {
      await api.post(`/requests/${id}/messages`, { message_text: newMessage });
      setNewMessage("");
      fetchData();
    } catch (err) {
      // Show the actual error from the backend to help debug
      const errorDetail = err.response?.data?.detail || err.message;
      alert("Failed to send message: " + errorDetail);
    }
  };

  const handleSaveAgreement = async () => {
    try {
      await api.put(`/requests/${id}/agreement`, agreement);
      setIsEditingAgreement(false);
      fetchData();
    } catch (err) {
      const errorDetail = err.response?.data?.detail || err.message;
      alert("Failed to update agreement: " + errorDetail);
    }
  };

  const handleConfirm = async () => {
    try {
      const res = await api.put(`/requests/${id}/confirm`);
      if (res.data.status === "Active") {
        alert("Both parties confirmed! The project is now Active.");
        navigate(user.role === "customer" ? "/customer/dashboard" : "/developer/dashboard");
      } else {
        alert("Confirmation saved. Waiting for the other party.");
        fetchData();
      }
    } catch (err) {
      const errorDetail = err.response?.data?.detail || err.message;
      alert("Failed to confirm: " + errorDetail);
    }
  };

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  if (loading || !request) return <div style={{ padding: 40 }}>Loading negotiation...</div>;

  const isMyConfirmed = user.role === "customer" ? request.customer_confirmed : request.developer_confirmed;

  return (
    <div style={{ display: "flex", height: "100vh", fontFamily: "sans-serif", backgroundColor: "#f4f7f6" }}>
      
      {/* LEFT: CHAT AREA */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", borderRight: "1px solid #e2e8f0" }}>
        <div style={{ padding: "20px 30px", background: "white", borderBottom: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h2 style={{ margin: 0 }}>Negotiation</h2>
            <p style={{ margin: "5px 0 0 0", color: "#64748b" }}>{request.project_title}</p>
          </div>
          <button onClick={() => navigate(user.role === "customer" ? "/customer/dashboard" : "/developer/dashboard")} style={{ padding: "8px 16px", background: "#f1f5f9", border: "none", borderRadius: 5, cursor: "pointer" }}>
            Back to Dashboard
          </button>
        </div>

        <div style={{ flex: 1, padding: 30, overflowY: "auto", display: "flex", flexDirection: "column", gap: 15 }}>
          {messages.map((msg) => {
            const isMe = msg.sender_id === user.id;
            return (
              <div key={msg.message_id} style={{ alignSelf: isMe ? "flex-end" : "flex-start", maxWidth: "70%" }}>
                <div style={{ fontSize: 12, color: "#64748b", marginBottom: 5, textAlign: isMe ? "right" : "left" }}>
                  {msg.sender_name}
                </div>
                <div style={{ padding: "12px 16px", borderRadius: 10, background: isMe ? "#2563eb" : "white", color: isMe ? "white" : "#1e293b", border: isMe ? "none" : "1px solid #e2e8f0" }}>
                  {msg.message_text}
                </div>
              </div>
            );
          })}
          <div ref={chatEndRef} />
        </div>

        <form onSubmit={handleSendMessage} style={{ padding: 20, background: "white", borderTop: "1px solid #e2e8f0", display: "flex", gap: 10 }}>
          <input 
            type="text" 
            placeholder="Type your message..." 
            value={newMessage} 
            onChange={(e) => setNewMessage(e.target.value)}
            style={{ flex: 1, padding: "12px 20px", borderRadius: 30, border: "1px solid #cbd5e1", outline: "none" }}
          />
          <button type="submit" style={{ padding: "12px 24px", background: "#2563eb", color: "white", border: "none", borderRadius: 30, cursor: "pointer", fontWeight: "bold" }}>
            Send
          </button>
        </form>
      </div>

      {/* RIGHT: AGREEMENT PANEL */}
      <div style={{ width: 400, background: "white", padding: 30, overflowY: "auto" }}>
        <h3 style={{ marginTop: 0 }}>Final Agreement</h3>
        <p style={{ color: "#64748b", fontSize: 14, marginBottom: 20 }}>Finalize the terms before starting the project.</p>

        <div style={{ display: "flex", flexDirection: "column", gap: 15 }}>
          <div>
            <label style={{ fontWeight: "bold", fontSize: 14 }}>Final Budget</label>
            <input 
              type="text" 
              value={agreement.final_budget} 
              onChange={(e) => { setAgreement({...agreement, final_budget: e.target.value}); setIsEditingAgreement(true); }}
              style={{ width: "100%", padding: 10, marginTop: 5, borderRadius: 5, border: "1px solid #cbd5e1" }} 
            />
          </div>
          <div>
            <label style={{ fontWeight: "bold", fontSize: 14 }}>Final Deadline</label>
            <input 
              type="date" 
              value={agreement.final_deadline} 
              onChange={(e) => { setAgreement({...agreement, final_deadline: e.target.value}); setIsEditingAgreement(true); }}
              style={{ width: "100%", padding: 10, marginTop: 5, borderRadius: 5, border: "1px solid #cbd5e1" }} 
            />
          </div>
          <div>
            <label style={{ fontWeight: "bold", fontSize: 14 }}>Project Scope</label>
            <textarea 
              value={agreement.project_scope} 
              onChange={(e) => { setAgreement({...agreement, project_scope: e.target.value}); setIsEditingAgreement(true); }}
              rows="4"
              style={{ width: "100%", padding: 10, marginTop: 5, borderRadius: 5, border: "1px solid #cbd5e1" }} 
            />
          </div>

          {isEditingAgreement ? (
            <button onClick={handleSaveAgreement} style={{ padding: 12, background: "#f59e0b", color: "white", border: "none", borderRadius: 5, cursor: "pointer", fontWeight: "bold", marginTop: 10 }}>
              Save Changes
            </button>
          ) : (
            <div style={{ background: "#f8fafc", padding: 15, borderRadius: 8, marginTop: 20 }}>
              <h4 style={{ margin: "0 0 10px 0" }}>Status</h4>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                <span>Customer:</span>
                <span style={{ color: request.customer_confirmed ? "#16a34a" : "#f59e0b", fontWeight: "bold" }}>
                  {request.customer_confirmed ? "✅ Confirmed" : "⏳ Waiting"}
                </span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 15 }}>
                <span>Developer:</span>
                <span style={{ color: request.developer_confirmed ? "#16a34a" : "#f59e0b", fontWeight: "bold" }}>
                  {request.developer_confirmed ? "✅ Confirmed" : "⏳ Waiting"}
                </span>
              </div>

              <button 
                onClick={handleConfirm} 
                disabled={isMyConfirmed}
                style={{ width: "100%", padding: 12, background: isMyConfirmed ? "#dcfce7" : "#16a34a", color: isMyConfirmed ? "#166534" : "white", border: "none", borderRadius: 5, cursor: isMyConfirmed ? "not-allowed" : "pointer", fontWeight: "bold" }}
              >
                {isMyConfirmed ? "You have confirmed" : "Confirm Agreement"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}