import { useState, useRef, useEffect, type FormEvent } from 'react';
import { sendAIChat } from '../../services/api';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

/**
 * AI Chat panel for attendees to ask natural language questions about the venue.
 * Powered by Gemini, grounded in live zone data.
 * Sends conversation history (last 6 messages) for multi-turn context.
 */
export default function AIChatPanel() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: "🏟️ **Welcome to Wankhede Stadium!** I'm your CrowdShield Assistant. Ask me about entry times, food stalls, or crowd situations across the stands. I'm monitoring live telemetry for your safety.",
      timestamp: Date.now(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  /**
   * Simple markdown-style parser for bold text.
   * Ensures the "Powerful Prompt" outputs from Gemini look great without extra heavy dependencies.
   */
  const renderMessageContent = (content: string) => {
    const parts = content.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, index) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={index}>{part.slice(2, -2)}</strong>;
      }
      return part;
    });
  };

  // Auto-scroll to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async (text: string) => {
    if (!text || isLoading) return;

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: Date.now(),
    };

    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInput('');
    setIsLoading(true);

    try {
      const history = updatedMessages
        .filter(m => m.id !== 'welcome')
        .slice(-6)
        .map(m => ({ role: m.role, content: m.content }));

      const response = await sendAIChat(text, history);
      setMessages(prev => [...prev, {
        id: `ai-${Date.now()}`,
        role: 'assistant',
        content: response.reply,
        timestamp: Date.now(),
      }]);
    } catch {
      setMessages(prev => [...prev, {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: "🚨 **Service Interruption**: My connection to the stadium AI core was interrupted. Please re-submit your query in a few seconds.",
        timestamp: Date.now(),
      }]);
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    await sendMessage(input.trim());
  };

  const handleQuickQuestion = (q: string) => {
    void sendMessage(q);
  };

  const quickQuestions = [
    "🏟️ Which gate has the shortest wait?",
    "🍔 Is the North Stand food court crowded?",
    "🚻 Find a clear restroom near Gate D",
    "🗺️ Safest route to MCA Stand?",
  ];

  return (
    <section className="chat-panel" aria-label="AI venue assistant">
      <div className="chat-header-group">
        <div className="chat-title-wrap">
          <h2 className="section-title">CrowdShield Tactical AI</h2>
          <div className="chat-engine-badge">
            <span className="sparkle">✨</span>
            Powered by Gemini 1.5 Flash
          </div>
        </div>
        
        {/* Quick actions moved to header for instant access */}
        <div className="chat-quick-questions" role="group" aria-label="Suggested questions">
          {quickQuestions.map((q) => (
            <button
              key={q}
              className="chat-quick-btn"
              onClick={() => handleQuickQuestion(q)}
              disabled={isLoading}
              aria-label={`Ask: ${q}`}
            >
              {q}
            </button>
          ))}
        </div>
      </div>
      <p className="section-subtitle">
        Real-time intelligence grounded in live stadium telemetry.
      </p>

      {/* Messages */}
      <div
        className="chat-messages"
        role="log"
        aria-label="Chat messages"
        aria-live="polite"
      >
        {messages.map(msg => (
          <div
            key={msg.id}
            className={`chat-message chat-message--${msg.role}`}
            aria-label={`${msg.role === 'user' ? 'You' : 'CrowdShield AI'}: ${msg.content}`}
          >
            <span className="chat-message__avatar" aria-hidden="true">
              {msg.role === 'user' ? '👤' : '🛡️'}
            </span>
            <div className="chat-message__content">
              <div>{renderMessageContent(msg.content)}</div>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="chat-message chat-message--assistant chat-message--loading">
            <span className="chat-message__avatar" aria-hidden="true">🤖</span>
            <div className="chat-message__content">
              <div className="chat-typing" aria-label="AI is thinking">
                <span></span><span></span><span></span>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form className="chat-input-form" onSubmit={handleSubmit} aria-label="Send a message">
        <input
          ref={inputRef}
          type="text"
          className="chat-input"
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Ask about the venue..."
          disabled={isLoading}
          aria-label="Type your question"
          maxLength={500}
          autoComplete="off"
        />
        <button
          type="submit"
          className="chat-send-btn"
          disabled={isLoading || !input.trim()}
          aria-label="Send message"
        >
          {isLoading ? '...' : '➤'}
        </button>
      </form>
    </section>
  );
}
