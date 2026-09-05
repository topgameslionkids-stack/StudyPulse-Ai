import { useEffect, useRef, useState } from "react";
import { api, API } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Sparkles, Send, Plus, Trash2, MessageSquare, Bot, User } from "lucide-react";
import { toast } from "sonner";

export default function Tutor() {
  const [models, setModels] = useState([]);
  const [defaultModel, setDefaultModel] = useState("gemini-3.5-flash");
  const [model, setModel] = useState("gemini-3.5-flash");
  const [sessions, setSessions] = useState([]);
  const [currentId, setCurrentId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [streamingText, setStreamingText] = useState("");
  const scrollRef = useRef(null);
  const abortRef = useRef(null);

  const loadModels = async () => {
    const r = await api.get("/tutor/models");
    setModels(r.data.models);
    setDefaultModel(r.data.default);
    setModel(r.data.default);
  };

  const loadSessions = async () => {
    const r = await api.get("/tutor/sessions");
    setSessions(r.data);
    return r.data;
  };

  const loadMessages = async (sid) => {
    if (!sid) { setMessages([]); return; }
    const r = await api.get(`/tutor/sessions/${sid}/messages`);
    setMessages(r.data);
  };

  useEffect(() => { loadModels(); loadSessions(); }, []);
  useEffect(() => { loadMessages(currentId); }, [currentId]);
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, streamingText]);

  const newSession = async () => {
    const r = await api.post("/tutor/sessions", { model });
    setSessions((s) => [r.data, ...s]);
    setCurrentId(r.data.id);
    setMessages([]);
    toast.success("New chat");
  };

  const deleteSession = async (id) => {
    if (!window.confirm("Delete this chat?")) return;
    await api.delete(`/tutor/sessions/${id}`);
    const next = sessions.filter((s) => s.id !== id);
    setSessions(next);
    if (currentId === id) {
      setCurrentId(null);
      setMessages([]);
    }
    toast.success("Chat deleted");
  };

  const send = async () => {
    const text = input.trim();
    if (!text || streaming) return;

    let sid = currentId;
    if (!sid) {
      const r = await api.post("/tutor/sessions", { model, title: text.slice(0, 60) });
      sid = r.data.id;
      setCurrentId(sid);
      setSessions((s) => [r.data, ...s]);
    }

    const userMsg = { role: "user", content: text };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setStreaming(true);
    setStreamingText("");

    const controller = new AbortController();
    abortRef.current = controller;
    try {
      const resp = await fetch(`${API}/tutor/chat/stream`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: sid, message: text, model }),
        signal: controller.signal,
      });
      if (!resp.ok || !resp.body) throw new Error(`HTTP ${resp.status}`);
      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let fullReply = "";
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split("\n\n");
        buffer = parts.pop() || "";
        for (const part of parts) {
          const line = part.trim();
          if (!line.startsWith("data:")) continue;
          try {
            const payload = JSON.parse(line.slice(5).trim());
            if (payload.type === "delta") {
              fullReply += payload.content;
              setStreamingText(fullReply);
            } else if (payload.type === "error") {
              throw new Error(payload.content);
            }
          } catch (err) {}
        }
      }
      setMessages((prev) => [...prev, { role: "assistant", content: fullReply }]);
      setStreamingText("");
      loadSessions();
    } catch (e) {
      toast.error(`Tutor failed: ${e.message}`);
    } finally {
      setStreaming(false);
      abortRef.current = null;
    }
  };

  const onKey = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  return (
    <div className="fade-in-up" data-testid="tutor-page">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-6">
        <div>
          <div className="text-xs uppercase tracking-wider text-slate-500 font-medium">AI Study Buddy</div>
          <h1 className="heading text-4xl sm:text-5xl font-extrabold text-slate-900">Tutor Chat</h1>
          <p className="text-slate-600 mt-1">Ask any homework question. Powered by Gemini.</p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={model} onValueChange={setModel}>
            <SelectTrigger data-testid="tutor-model-select" className="w-56">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {models.map((m) => (
                <SelectItem key={m.id} value={m.id} data-testid={`model-option-${m.id}`}>
                  {m.label}{m.id === defaultModel ? " (default)" : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button data-testid="tutor-new-chat-btn" onClick={newSession} className="rounded-full bg-indigo-600 hover:bg-indigo-700">
            <Plus className="w-4 h-4 mr-2" /> New chat
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <Card className="p-3 border-slate-200/80 lg:col-span-1" data-testid="tutor-sessions-list">
          <div className="text-xs uppercase tracking-wider text-slate-500 font-medium px-2 py-2">Chats</div>
          {sessions.length === 0 ? (
            <div className="text-sm text-slate-500 p-3">No chats yet. Start one below.</div>
          ) : (
            <div className="space-y-1 max-h-[500px] overflow-y-auto">
              {sessions.map((s) => (
                <div
                  key={s.id}
                  data-testid={`session-item-${s.id}`}
                  onClick={() => setCurrentId(s.id)}
                  className={`group flex items-center gap-2 p-2 rounded-lg cursor-pointer ${
                    currentId === s.id ? "bg-indigo-50 border border-indigo-200" : "hover:bg-slate-50"
                  }`}
                >
                  <MessageSquare className="w-4 h-4 text-slate-400 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-slate-900 truncate">{s.title}</div>
                    <div className="text-[10px] text-slate-500">{models.find((m) => m.id === s.model)?.label || s.model}</div>
                  </div>
                  <button
                    data-testid={`delete-session-${s.id}`}
                    onClick={(e) => { e.stopPropagation(); deleteSession(s.id); }}
                    className="opacity-0 group-hover:opacity-100 p-1 text-red-500 hover:bg-red-50 rounded"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card className="p-0 border-slate-200/80 lg:col-span-3 flex flex-col h-[70vh]" data-testid="tutor-chat-card">
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-4">
            {messages.length === 0 && !streamingText && (
              <div className="h-full flex flex-col items-center justify-center text-center max-w-md mx-auto">
                <div className="w-14 h-14 rounded-2xl bg-indigo-100 text-indigo-700 flex items-center justify-center mb-3">
                  <Sparkles className="w-6 h-6" />
                </div>
                <div className="heading text-xl font-bold text-slate-900">Ask your tutor anything</div>
                <p className="text-slate-600 text-sm mt-1">Try &ldquo;Explain the quadratic formula step by step&rdquo; or &ldquo;Help me structure a persuasive essay on climate change.&rdquo;</p>
              </div>
            )}
            {messages.map((m, i) => <ChatBubble key={i} role={m.role} content={m.content} />)}
            {streamingText && <ChatBubble role="assistant" content={streamingText} streaming />}
          </div>

          <div className="border-t border-slate-200 p-4">
            <div className="flex items-end gap-2">
              <Textarea
                data-testid="tutor-input"
                rows={2}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={onKey}
                placeholder="Ask a question… (Shift+Enter for newline)"
                className="resize-none"
                disabled={streaming}
              />
              <Button data-testid="tutor-send-btn" onClick={send} disabled={streaming || !input.trim()} className="rounded-full bg-slate-900 hover:bg-slate-800 h-11">
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

function ChatBubble({ role, content, streaming }) {
  const isUser = role === "user";
  return (
    <div data-testid={`chat-bubble-${role}`} className={`flex gap-3 ${isUser ? "justify-end" : "justify-start"}`}>
      {!isUser && (
        <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center shrink-0">
          <Bot className="w-4 h-4" />
        </div>
      )}
      <div className={`max-w-[85%] px-4 py-3 rounded-2xl ${isUser ? "bg-slate-900 text-white rounded-br-sm" : "bg-slate-50 border border-slate-200 text-slate-900 rounded-bl-sm"}`}>
        <div className="text-sm leading-relaxed whitespace-pre-wrap">{content}{streaming && <span className="inline-block w-1.5 h-4 bg-indigo-500 ml-1 animate-pulse align-middle" />}</div>
      </div>
      {isUser && (
        <div className="w-8 h-8 rounded-lg bg-slate-200 text-slate-700 flex items-center justify-center shrink-0">
          <User className="w-4 h-4" />
        </div>
      )}
    </div>
  );
}