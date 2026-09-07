"use client";

import { useState } from "react";

export default function TutorPage() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");

  const sendMessage = async () => {
    if (!input.trim()) return;

    // Add user message
    const userMessage = { role: "user", text: input };
    setMessages(prev => [...prev, userMessage]);

    // Send to backend
    const response = await fetch("https://YOUR-RENDER-URL/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: input }),
    });

    const data = await response.json();

    // Add AI message
    const aiMessage = { role: "assistant", text: data.reply };
    setMessages(prev => [...prev, aiMessage]);

    setInput("");
  };

  return (
    <div className="p-10 font-sans">
      <h1 className="text-3xl font-bold mb-6">Tutor AI</h1>

      <div className="bg-white p-6 rounded-xl shadow mb-6 h-[400px] overflow-y-auto">
        {messages.map((msg, i) => (
          <div key={i} className={`mb-4 ${msg.role === "user" ? "text-blue-600" : "text-purple-600"}`}>
            <strong>{msg.role === "user" ? "You:" : "Tutor:"}</strong> {msg.text}
          </div>
        ))}
      </div>

      <div className="flex gap-4">
        <input
          className="border p-3 rounded w-full"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask your tutor..."
        />
        <button
          onClick={sendMessage}
          className="bg-indigo-600 text-white px-6 py-3 rounded-lg"
        >
          Send
        </button>
      </div>
    </div>
  );
}
