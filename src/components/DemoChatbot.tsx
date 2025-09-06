"use client";
import { useState, useRef, useId } from "react";

interface Message {
  role: "user" | "bot";
  text: string;
}

type ResponseCategory = "greeting" | "features" | "pricing" | "integration" | "capabilities" | "default";

export default function DemoChatbot() {
  const inputId = useId();
  const initialMessage = { role: "bot" as const, text: "👋 Hi! I'm Intaj AI. Ask me anything about automation, chatbots, or our platform!" };
  const [messages, setMessages] = useState<Message[]>([initialMessage]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const chatRef = useRef<HTMLDivElement>(null);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim()) return;
    
    const userMsg: Message = { role: "user", text: input };
    setMessages((msgs) => [...msgs, userMsg]);
    setInput("");
    setLoading(true);

    // GPT-like responses with more detailed, natural language interactions
    const responses = {
      "greeting": [
        "Hello! I'm excited to help you today. What would you like to know about our platform?",
        "Hi there! I'm the Intaj AI assistant. How can I assist you?",
        "Welcome! I'm here to help you with anything related to our platform. What's on your mind?"
      ],
      "features": [
        "Our platform offers several key features:\n\n1. AI-powered chatbots that can handle customer inquiries 24/7\n2. Multi-channel support across various platforms\n3. Advanced analytics and reporting\n4. Automated workflow management\n5. Custom integration options\n\nWhich feature would you like to learn more about?",
      ],
      "pricing": [
        "Great news! We're currently offering our platform completely free for a limited time. This includes:\n\n• Full access to all features\n• Unlimited conversations\n• Priority support\n• Custom integrations\n\nWould you like to get started?",
      ],
      "integration": [
        "Integration is straightforward! We support:\n\n1. Website chat\n2. Facebook Messenger\n3. Instagram DM\n4. WhatsApp Business\n5. Custom API integration\n\nWhich platform would you like to integrate with?",
      ],
      "capabilities": [
        "Let me explain what Intaj can do for your business:\n\n• Automate customer support 24/7\n• Handle multiple conversations simultaneously\n• Provide instant responses in multiple languages\n• Generate detailed analytics and insights\n• Integrate with your existing tools\n\nWhat aspect interests you most?",
      ],
      "default": [
        "I understand you're interested in learning more. Let me help explain how our platform can meet your needs. Could you specify what aspect you'd like to know more about?",
        "That's a great question. Our platform is designed to be comprehensive and user-friendly. Would you like me to elaborate on any specific aspect?",
      ]
    };

    // Simulate natural typing delay
    await new Promise(resolve => setTimeout(resolve, 500));

    // Find most relevant response category
    const lowercaseInput = input.toLowerCase();
    let responseCategory: ResponseCategory = "default";

    if (lowercaseInput.match(/hi|hello|hey|greetings/i)) {
      responseCategory = "greeting";
    } else if (lowercaseInput.match(/feature|capability|can|do|what|offer/i)) {
      responseCategory = "features";
    } else if (lowercaseInput.match(/price|cost|pricing|free|trial/i)) {
      responseCategory = "pricing";
    } else if (lowercaseInput.match(/integrate|connection|connect|platform/i)) {
      responseCategory = "integration";
    } else if (lowercaseInput.match(/capability|able|possible|handle|support/i)) {
      responseCategory = "capabilities";
    }

    // Get random response from category
    const categoryResponses = responses[responseCategory];
    const botResponse = categoryResponses[Math.floor(Math.random() * categoryResponses.length)];

    setMessages((msgs) => [...msgs, { role: "bot", text: botResponse }]);
    setLoading(false);
    
    setTimeout(() => {
      chatRef.current?.scrollTo({ top: chatRef.current.scrollHeight, behavior: "smooth" });
    }, 100);
  }

  return (
    <div className="w-[400px] h-[600px] bg-[#1f2024] rounded-xl shadow-2xl flex flex-col overflow-hidden border border-gray-700/50">
      {/* Header */}
      <div className="p-4 bg-[#23242a] border-b border-gray-700/50">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
            <div className="w-4 h-4 bg-white rounded-sm opacity-90"></div>
          </div>
          <div>
            <div className="font-medium text-gray-200">Intaj Demo Bot</div>
            <div className="text-xs text-gray-400 flex items-center space-x-1">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span>Online</span>
            </div>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div ref={chatRef} className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg, i) => (
          <div key={`${msg.role}-${i}`} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[80%] p-3 rounded-xl ${
              msg.role === "user"
                ? "bg-gradient-to-r from-blue-500 to-purple-500 text-white"
                : "bg-[#2a2d35] text-gray-200"
            }`}>
              {msg.text}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="max-w-[80%] p-3 rounded-xl bg-[#2a2d35] text-gray-200">
              <div className="flex space-x-2">
                <div className="w-2 h-2 bg-gray-500 rounded-full typing-dot-1"></div>
                <div className="w-2 h-2 bg-gray-500 rounded-full typing-dot-2"></div>
                <div className="w-2 h-2 bg-gray-500 rounded-full typing-dot-3"></div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <form onSubmit={handleSend} className="p-4 border-t border-gray-700/50">
        <div className="flex space-x-2">
          <input
            id={inputId}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 bg-[#2a2d35] border border-gray-700 rounded-lg px-4 py-2 text-gray-200 focus:outline-none focus:border-blue-500"
            disabled={loading}
            suppressHydrationWarning
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="bg-gradient-to-r from-blue-500 to-purple-500 px-4 py-2 rounded-lg text-white font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            Send
          </button>
        </div>
      </form>
    </div>
  );
}
