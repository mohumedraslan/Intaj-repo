'use client';

import { useState, useRef, useEffect } from 'react';
import { Send, Paperclip, X, Download, Minimize2, Maximize2, MessageCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface Message {
  id: string;
  content: string;
  sender: 'user' | 'bot';
  timestamp: Date;
  attachments?: FileAttachment[];
}

interface FileAttachment {
  id: string;
  name: string;
  size: number;
  type: string;
  url: string;
}

interface ChatWidgetProps {
  botName?: string;
  welcomeMessage?: string;
  primaryColor?: string;
  position?: 'bottom-right' | 'bottom-left';
  allowFileUpload?: boolean;
  maxFileSize?: number; // in MB
  allowedFileTypes?: string[];
}

export default function ChatWidget({
  botName = 'Intaj Assistant',
  welcomeMessage = 'Hello! How can I help you today?',
  primaryColor = '#3b82f6',
  position = 'bottom-right',
  allowFileUpload = true,
  maxFileSize = 10,
  allowedFileTypes = ['image/*', 'application/pdf', '.doc', '.docx', '.txt'],
}: ChatWidgetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      content: welcomeMessage,
      sender: 'bot',
      timestamp: new Date(),
    },
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [attachments, setAttachments] = useState<FileAttachment[]>([]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async () => {
    if (!inputValue.trim() && attachments.length === 0) return;

    const newMessage: Message = {
      id: Date.now().toString(),
      content: inputValue,
      sender: 'user',
      timestamp: new Date(),
      attachments: attachments.length > 0 ? [...attachments] : undefined,
    };

    setMessages(prev => [...prev, newMessage]);
    setInputValue('');
    setAttachments([]);
    setIsTyping(true);

    // Simulate bot response
    setTimeout(() => {
      const botResponse: Message = {
        id: (Date.now() + 1).toString(),
        content: generateBotResponse(inputValue, attachments),
        sender: 'bot',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, botResponse]);
      setIsTyping(false);
    }, 1500);
  };

  const generateBotResponse = (userMessage: string, files: FileAttachment[]): string => {
    if (files.length > 0) {
      return `I've received your message along with ${files.length} file(s). Let me analyze them and get back to you shortly.`;
    }

    const responses = [
      "Thank you for your message! I'm here to help you with any questions about our AI automation platform.",
      'I understand your inquiry. Let me provide you with the information you need.',
      "That's a great question! Our team can definitely assist you with that.",
      "I'd be happy to help you with that. Would you like me to connect you with a specialist?",
      'Thanks for reaching out! I can help you explore our solutions for your business needs.',
    ];

    return responses[Math.floor(Math.random() * responses.length)];
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);

    files.forEach(file => {
      if (file.size > maxFileSize * 1024 * 1024) {
        alert(`File ${file.name} is too large. Maximum size is ${maxFileSize}MB.`);
        return;
      }

      const newAttachment: FileAttachment = {
        id: Date.now().toString() + Math.random(),
        name: file.name,
        size: file.size,
        type: file.type,
        url: URL.createObjectURL(file),
      };

      setAttachments(prev => [...prev, newAttachment]);
    });

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeAttachment = (id: string) => {
    setAttachments(prev => prev.filter(att => att.id !== id));
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const exportTranscript = () => {
    const transcript = messages
      .map(
        msg =>
          `[${msg.timestamp.toLocaleString()}] ${msg.sender === 'user' ? 'You' : botName}: ${msg.content}`
      )
      .join('\n');

    const blob = new Blob([transcript], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chat-transcript-${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const positionClasses = position === 'bottom-right' ? 'bottom-4 right-4' : 'bottom-4 left-4';

  if (!isOpen) {
    return (
      <div className={`fixed ${positionClasses} z-50`}>
        <button
          onClick={() => setIsOpen(true)}
          className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white p-4 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 animate-pulse"
          style={{ backgroundColor: primaryColor }}
        >
          <MessageCircle size={24} />
        </button>
      </div>
    );
  }

  return (
    <div className={`fixed ${positionClasses} z-50`}>
      <Card
        className={`w-96 bg-white dark:bg-gray-900 shadow-2xl border-0 ${isMinimized ? 'h-16' : 'h-[500px]'} transition-all duration-300`}
      >
        <CardHeader className="p-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-t-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                <MessageCircle size={16} />
              </div>
              <div>
                <CardTitle className="text-sm font-semibold">{botName}</CardTitle>
                <p className="text-xs opacity-90">Online</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={exportTranscript}
                className="p-1 hover:bg-white/20 rounded transition-colors"
                title="Export transcript"
              >
                <Download size={16} />
              </button>
              <button
                onClick={() => setIsMinimized(!isMinimized)}
                className="p-1 hover:bg-white/20 rounded transition-colors"
              >
                {isMinimized ? <Maximize2 size={16} /> : <Minimize2 size={16} />}
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 hover:bg-white/20 rounded transition-colors"
              >
                <X size={16} />
              </button>
            </div>
          </div>
        </CardHeader>

        {!isMinimized && (
          <CardContent className="p-0 flex flex-col h-[436px]">
            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map(message => (
                <div
                  key={message.id}
                  className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] p-3 rounded-lg ${
                      message.sender === 'user'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100'
                    }`}
                  >
                    <p className="text-sm">{message.content}</p>
                    {message.attachments && message.attachments.length > 0 && (
                      <div className="mt-2 space-y-1">
                        {message.attachments.map(file => (
                          <div
                            key={file.id}
                            className="flex items-center space-x-2 text-xs opacity-80"
                          >
                            <Paperclip size={12} />
                            <span>{file.name}</span>
                            <span>({formatFileSize(file.size)})</span>
                          </div>
                        ))}
                      </div>
                    )}
                    <p className="text-xs opacity-70 mt-1">
                      {message.timestamp.toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                </div>
              ))}

              {isTyping && (
                <div className="flex justify-start">
                  <div className="bg-gray-100 dark:bg-gray-800 p-3 rounded-lg">
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-100"></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-200"></div>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Attachments Preview */}
            {attachments.length > 0 && (
              <div className="px-4 py-2 border-t border-gray-200 dark:border-gray-700">
                <div className="flex flex-wrap gap-2">
                  {attachments.map(file => (
                    <Badge
                      key={file.id}
                      variant="secondary"
                      className="flex items-center space-x-1"
                    >
                      <span className="text-xs">{file.name}</span>
                      <button
                        onClick={() => removeAttachment(file.id)}
                        className="ml-1 hover:bg-gray-300 dark:hover:bg-gray-600 rounded-full p-0.5"
                      >
                        <X size={12} />
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Input */}
            <div className="p-4 border-t border-gray-200 dark:border-gray-700">
              <div className="flex items-center space-x-2">
                {allowFileUpload && (
                  <>
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
                    >
                      <Paperclip size={20} />
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      multiple
                      accept={allowedFileTypes.join(',')}
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </>
                )}
                <input
                  type="text"
                  value={inputValue}
                  onChange={e => setInputValue(e.target.value)}
                  onKeyPress={e => e.key === 'Enter' && handleSendMessage()}
                  placeholder="Type your message..."
                  className="flex-1 p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={handleSendMessage}
                  disabled={!inputValue.trim() && attachments.length === 0}
                  className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <Send size={20} />
                </button>
              </div>
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  );
}
