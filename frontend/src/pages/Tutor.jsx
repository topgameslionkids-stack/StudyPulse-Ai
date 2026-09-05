import React, { useState } from 'react';

export default function Tutor() {
  const [input, setInput] = useState("");
  const [aiReply, setAiReply] = useState("");
  const [loading, setLoading] = useState(false);

  const handleDeleteChat = () => {
    if (!globalThis.confirm("Delete this chat?")) return;
    setInput("");
    setAiReply("");
  };

  const sendMessage = async () => {
    if (!input.trim()) return;

    setLoading(true);
    try {
      const response = await fetch("http://127.0.0.1:8000/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ message: input }),
      });

      const data = await response.json();
      setAiReply(data.reply);
    } catch (_err) {
      setAiReply("Error connecting to the StudyPulse server.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h2>StudyPulse AI Tutor</h2>
      <div style={{ marginBottom: '10px' }}>
        <input 
          type="text" 
          value={input} 
          onChange={(e) => setInput(e.target.value)} 
          placeholder="Ask your AI tutor a question..."
          style={{ width: '300px', padding: '8px' }}
        />
        <button onClick={sendMessage} style={{ marginLeft: '10px', padding: '8px 15px' }}>
          {loading ? "Thinking..." : "Send"}
        </button>
        <button onClick={handleDeleteChat} style={{ marginLeft: '10px', padding: '8px 15px', background: '#ff4d4d', color: '#fff', border: 'none', cursor: 'pointer' }}>
          Clear
        </button>
      </div>
      <div style={{ marginTop: '20px', background: '#f4f4f4', padding: '15px', borderRadius: '5px' }}>
        <strong>AI Reply:</strong>
        <p>{aiReply || "Your answer will appear here..."}</p>
      </div>
    </div>
  );
}
