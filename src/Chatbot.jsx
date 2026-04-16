import "./Chatbot.css";
import { useState, useRef, useEffect } from "react";

export default function Chatbot() {
  const [messages, setMessages] = useState([
    { sender: "bot", text: "👋 مرحبا! أنا AI تاع المخزون" }
  ]);

  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const chatRef = useRef(null);
  const inputRef = useRef(null);

  // Auto scroll
  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || loading) return;

    const userText = input;

    setMessages((prev) => [
      ...prev,
      { sender: "user", text: userText }
    ]);

    setInput("");
    setLoading(true);

    inputRef.current?.focus();

    try {
      const res = await fetch("http://localhost:5000/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ message: userText })
      });

      const data = await res.json();

      setMessages((prev) => [
        ...prev,
        {
          sender: "bot",
          text: data?.message || "🤖 ماكانش رد من السيرفر"
        }
      ]);

    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { sender: "bot", text: "❌ خطأ في الاتصال بالسيرفر" }
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="chatbot-container">

      <div className="chatbot-header">
        🤖 Smart Stock AI Chatbot
      </div>

      <div className="chatbot-box" ref={chatRef}>
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`message ${msg.sender}`}
          >
            {msg.text}
          </div>
        ))}

        {loading && (
          <div className="typing">
            🤖 يكتب...
          </div>
        )}
      </div>

      <div className="chatbot-input">
        <input
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="اكتب سؤالك..."
          onKeyDown={(e) => e.key === "Enter" && sendMessage()}
        />

        <button onClick={sendMessage}>
          إرسال 🚀
        </button>
      </div>

    </div>
  );
}