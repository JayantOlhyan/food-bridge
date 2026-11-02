import { useState, useEffect } from 'react';
import {
  Sparkles,
  Bot,
  Database,
  Zap,
  X,
  Send,
  Loader2,
  CheckCircle2,
  Layers,
  ArrowRight,
  ShieldCheck,
  Search
} from 'lucide-react';
import { api } from './api';

/** Runtime health and token-conservation telemetry for the Hindsight copilot. */
interface AiStatus {
  connected: boolean;
  bankId: string;
  baseUrl: string;
  retainsCount: number;
  dedupedCount: number;
  cacheHits: number;
  reflectCalls: number;
  recallCalls: number;
  estimatedTokensSaved: number;
  lastSync: string | null;
}

interface Message {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  recalled?: any[];
  fromCache?: boolean;
  timestamp: string;
}

export default function AiCopilot({ onClose }: { onClose: () => void }) {
  const [activeTab, setActiveTab] = useState<'chat' | 'memory'>('chat');
  const [status, setStatus] = useState<AiStatus | null>(null);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      sender: 'ai',
      text: 'Hello! I am FoodBridge AI Copilot powered by Vectorize Hindsight. I monitor food rescue operations, retain event and pickup memories, and provide dispatch guidance while actively conserving your API tokens with deduplication and response caching.',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);

  // Memory search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 6000);
    return () => clearInterval(interval);
  }, []);

  async function fetchStatus() {
    try {
      const data = await api('/ai/status');
      setStatus(data);
    } catch {
      // Silently ignore if offline
    }
  }

  async function handleSend(textToSend?: string) {
    const q = textToSend || input;
    if (!q.trim() || loading) return;

    const userMsg: Message = {
      id: String(Date.now()),
      sender: 'user',
      text: q.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const res = await api('/ai/ask', { query: q.trim(), budget: 'low' });
      const aiMsg: Message = {
        id: String(Date.now() + 1),
        sender: 'ai',
        text: res.text || 'No response returned.',
        recalled: res.recalled,
        fromCache: res.fromCache,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, aiMsg]);
      await fetchStatus();
    } catch (err: any) {
      setMessages(prev => [
        ...prev,
        {
          id: String(Date.now() + 1),
          sender: 'ai',
          text: `Error connecting to AI service: ${err.message}`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } finally {
      setLoading(false);
    }
  }

  async function handleMemorySearch() {
    if (!searchQuery.trim() || searchLoading) return;
    setSearchLoading(true);
    try {
      const res = await api('/ai/recall', { query: searchQuery.trim(), limit: 6 });
      setSearchResults(res.results || []);
      await fetchStatus();
    } catch {
      setSearchResults([]);
    } finally {
      setSearchLoading(false);
    }
  }

  const promptChips = [
    'What is the food safety rule for hot-held wedding food?',
    'Which NGOs in Delhi have capacity for 50+ meals?',
    'What is the best dispatch strategy for late-night banquet surplus?',
    'Explain the CO2 emission offset factor used in FoodBridge'
  ];

  return (
    <div className="ai-modal-overlay" onClick={onClose}>
      <div className="ai-modal-container" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="ai-modal-header">
          <div className="ai-title-wrap">
            <div className="ai-icon-badge">
              <Sparkles size={20} className="ai-sparkle-icon" />
            </div>
            <div>
              <div className="ai-title-row">
                <h2>FoodBridge AI Copilot</h2>
                <span className="ai-powered-tag">Vectorize Hindsight</span>
              </div>
              <p className="ai-subtitle">
                Long-Term Memory Bank & Token-Conserved Rescue Intelligence
              </p>
            </div>
          </div>
          <button className="icon-button close-btn" onClick={onClose} aria-label="Close AI Copilot">
            <X size={20} />
          </button>
        </div>

        {/* Token Conservation & Memory Bank Status Strip */}
        <div className="ai-status-strip">
          <div className="ai-stat-pill success">
            <CheckCircle2 size={14} />
            <span>Bank: <strong>{status?.bankId || 'foodbridge'}</strong></span>
          </div>

          <div className="ai-stat-pill token-saver">
            <Zap size={14} />
            <span>Tokens Saved: <strong>~{status ? status.estimatedTokensSaved.toLocaleString() : '0'}</strong></span>
          </div>

          <div className="ai-stat-pill">
            <Layers size={14} />
            <span>Cache Hits: <strong>{status?.cacheHits || 0}</strong></span>
          </div>

          <div className="ai-stat-pill">
            <Database size={14} />
            <span>Retained: <strong>{status?.retainsCount || 0}</strong> ({status?.dedupedCount || 0} deduped)</span>
          </div>
        </div>

        {/* Tabs */}
        <div className="ai-tab-bar">
          <button
            className={`ai-tab-btn ${activeTab === 'chat' ? 'active' : ''}`}
            onClick={() => setActiveTab('chat')}
          >
            <Bot size={16} />
            <span>Rescue Copilot</span>
          </button>
          <button
            className={`ai-tab-btn ${activeTab === 'memory' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('memory');
              if (!searchResults.length && !searchQuery) {
                setSearchQuery('Food rescue listings Delhi');
                api('/ai/recall', { query: 'Food rescue listings Delhi', limit: 5 })
                  .then(r => setSearchResults(r.results || []))
                  .catch(() => {});
              }
            }}
          >
            <Database size={16} />
            <span>Memory Bank Recall</span>
          </button>
        </div>

        {/* Tab 1: Copilot Chat */}
        {activeTab === 'chat' && (
          <div className="ai-chat-body">
            {/* Quick Prompts */}
            <div className="ai-prompt-chips">
              <span className="chips-label">Quick Suggestions:</span>
              <div className="chips-list">
                {promptChips.map((chip, idx) => (
                  <button
                    key={idx}
                    className="ai-chip"
                    onClick={() => handleSend(chip)}
                    disabled={loading}
                  >
                    <span>{chip}</span>
                    <ArrowRight size={12} />
                  </button>
                ))}
              </div>
            </div>

            {/* Messages Thread */}
            <div className="ai-messages-list">
              {messages.map(msg => (
                <div key={msg.id} className={`ai-message-row ${msg.sender}`}>
                  <div className="ai-message-bubble">
                    <div className="ai-msg-header">
                      <span className="ai-sender-name">
                        {msg.sender === 'ai' ? 'FoodBridge Copilot' : 'You'}
                      </span>
                      {msg.fromCache && (
                        <span className="cache-pill">
                          <Zap size={11} /> 0 Tokens (Cached)
                        </span>
                      )}
                      <span className="ai-msg-time">{msg.timestamp}</span>
                    </div>

                    <div className="ai-msg-text">{msg.text}</div>

                    {msg.recalled && msg.recalled.length > 0 && (
                      <div className="ai-recalled-box">
                        <span className="recalled-title">
                          <Database size={12} /> Recalled Facts from Memory Bank:
                        </span>
                        <ul>
                          {msg.recalled.slice(0, 3).map((r, i) => (
                            <li key={i}>{r.text}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {loading && (
                <div className="ai-message-row ai">
                  <div className="ai-message-bubble loading-bubble">
                    <Loader2 size={16} className="spin" />
                    <span>Consulting Hindsight memory bank (budget: low)...</span>
                  </div>
                </div>
              )}
            </div>

            {/* Input Bar */}
            <form
              className="ai-input-form"
              onSubmit={e => {
                e.preventDefault();
                handleSend();
              }}
            >
              <input
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder="Ask AI Copilot about safety, matching, dispatch, or food rescues..."
                disabled={loading}
              />
              <button type="submit" disabled={!input.trim() || loading} className="ai-send-btn">
                {loading ? <Loader2 size={18} className="spin" /> : <Send size={18} />}
              </button>
            </form>
          </div>
        )}

        {/* Tab 2: Memory Bank Recall */}
        {activeTab === 'memory' && (
          <div className="ai-memory-body">
            <p className="ai-memory-intro">
              Semantic recall queries the Vectorize Hindsight knowledge graph without consuming LLM generative tokens. Search past events, NGO actions, or verified rescues.
            </p>

            <form
              className="ai-memory-search-bar"
              onSubmit={e => {
                e.preventDefault();
                handleMemorySearch();
              }}
            >
              <Search size={18} />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search memories (e.g. 'Dwarka wedding', 'NGO A capacity', 'hot-held meals')..."
              />
              <button type="submit" disabled={searchLoading} className="button small">
                {searchLoading ? 'Recalling...' : 'Recall'}
              </button>
            </form>

            <div className="ai-memory-results">
              {searchLoading ? (
                <div className="ai-loading-box">
                  <Loader2 size={24} className="spin" />
                  <p>Searching memory bank...</p>
                </div>
              ) : searchResults.length > 0 ? (
                <div className="memory-cards-grid">
                  {searchResults.map((item, idx) => (
                    <div key={item.id || idx} className="memory-card">
                      <div className="memory-card-top">
                        <span className="memory-type-badge">{item.type || 'fact'}</span>
                        <span className="memory-score">Score: {Number(item.score).toFixed(2)}</span>
                      </div>
                      <p className="memory-text">{item.text}</p>
                      {item.entities && item.entities.length > 0 && (
                        <div className="memory-entities">
                          {item.entities.map((ent: string, ei: number) => (
                            <span key={ei} className="entity-tag">#{ent}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="empty-state-box">
                  <Database size={32} />
                  <p>No matching memories recalled for this search query.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Footer info */}
        <div className="ai-modal-footer">
          <div className="ai-footer-note">
            <ShieldCheck size={14} />
            <span>
              All listings, NGO accepts, and deliveries automatically retain concise summaries in the Vectorize memory bank with hash-deduplication.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
