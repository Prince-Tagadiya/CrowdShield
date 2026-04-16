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
      content: "👋 Hi! I'm VenueFlow AI. Ask me anything about Wankhede Stadium — like \"Where's the shortest food queue?\" or \"Which gate has the least wait?\" I have access to live crowd data!",
      timestamp: Date.now(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  /**
   * Core message sender — shared by form submission and quick question buttons.
   * Appends the user message, sends to AI with conversation history, and
   * appends the AI response. Deduplicates the logic that was previously
   * copy-pasted between handleSubmit and handleQuickQuestion.
   */
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
        content: "I'm having trouble connecting right now. Please try again in a moment.",
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
    "Where's the shortest food queue?",
    "Which gate has the least wait?",
    "Are the restrooms crowded?",
    "What's the overall crowd situation?",
  ];

  return (
    <section className="chat-panel" aria-label="AI venue assistant">
      <h2 className="section-title">Ask VenueFlow AI</h2>
      <p className="section-subtitle">
        <span className="live-indicator" aria-hidden="true">●</span>
        {' '}Powered by live venue data • Multi-turn conversation
      </p>

      {/* Quick questions */}
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
            aria-label={`${msg.role === 'user' ? 'You' : 'VenueFlow AI'}: ${msg.content}`}
          >
            <span className="chat-message__avatar" aria-hidden="true">
              {msg.role === 'user' ? '👤' : '🤖'}
            </span>
            <div className="chat-message__content">
              <p>{msg.content}</p>
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
