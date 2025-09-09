"use client";
import { useState, useRef, useId } from "react";
import Image from "next/image";
import { getResponse } from "../lib/openrouter";
import "@/styles/chatbot.css";

interface Message {
  role: "user" | "assistant";
  content: string;
}

export default function DemoChatbot() {
  const inputId = useId();
  const initialMessage = { role: "assistant" as const, content: "👋 Hi! I'm Intaj AI. Ask me anything about automation, chatbots, or our platform!" };
  const [messages, setMessages] = useState<Message[]>([initialMessage]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const chatRef = useRef<HTMLDivElement>(null);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || loading) return;
    
    const userMsg: Message = { role: "user", content: input };
    setMessages((msgs) => [...msgs, userMsg]);
    setInput("");
    setLoading(true);

    try {
      // Call OpenRouter API
      const response = await getResponse([
        { role: "system", content: "You are Intaj AI, a helpful assistant focused on explaining Intaj's AI automation platform features, integrations, and capabilities. Be concise, friendly, and enthusiastic about helping businesses automate their processes." },
        ...messages,
        userMsg
      ]);

      if (response) {
        setMessages((msgs) => [...msgs, { role: "assistant", content: response }]);
      }
    } catch (error) {
      console.error('Error getting response:', error);
      setMessages((msgs) => [...msgs, { role: "assistant", content: "I apologize, but I'm having trouble connecting right now. Please try again in a moment." }]);
    }

    setLoading(false);
    
    setTimeout(() => {
      chatRef.current?.scrollTo({ top: chatRef.current.scrollHeight, behavior: "smooth" });
    }, 100);
  }

  return (
    <div className="w-[400px] h-[600px] bg-white dark:bg-gray-900 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
      {/* Header */}
      <div className="p-4 bg-gradient-to-r from-blue-600 to-purple-600">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-lg">
            <Image src="/logo2.png" alt="Intaj AI" width={24} height={24} className="w-6 h-6" />
          </div>
          <div>
            <div className="font-semibold text-white text-lg">Intaj AI</div>
            <div className="text-xs text-white/90 flex items-center space-x-1.5">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              <span>Ready to help</span>
            </div>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div ref={chatRef} className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50 dark:bg-gray-900">
        {messages.map((msg, i) => (
          <div key={`${msg.role}-${i}`} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[80%] p-3.5 rounded-2xl shadow-sm ${
              msg.role === "user"
                ? "bg-gradient-to-r from-blue-600 to-purple-600 text-white"
                : "bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200"
            }`}>
              {msg.content}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="max-w-[80%] p-3.5 rounded-2xl bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 shadow-sm">
              <div className="flex space-x-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-purple-500 rounded-full typing-dot-2"></div>
                <div className="w-2 h-2 bg-pink-500 rounded-full typing-dot-3"></div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <form onSubmit={handleSend} className="p-4 bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800">
        <div className="flex space-x-2">
          <input
            id={inputId}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask me anything..."
            className="flex-1 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2.5 text-gray-800 dark:text-gray-200 placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
            disabled={loading}
            suppressHydrationWarning
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="bg-gradient-to-r from-blue-600 to-purple-600 px-5 py-2.5 rounded-xl text-white font-medium hover:opacity-95 transition-all disabled:opacity-50 shadow-lg shadow-blue-500/20 flex items-center"
            title="Send message"
            aria-label="Send message"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
              <path d="M3.105 2.289a.75.75 0 00-.826.95l1.414 4.925A1.5 1.5 0 005.135 9.25h6.115a.75.75 0 010 1.5H5.135a1.5 1.5 0 00-1.442 1.086l-1.414 4.926a.75.75 0 00.826.95 28.896 28.896 0 0015.293-7.154.75.75 0 000-1.115A28.897 28.897 0 003.105 2.289z" />
            </svg>
          </button>
        </div>
      </form>
    </div>
  );
}
