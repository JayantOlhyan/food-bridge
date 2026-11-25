import { useState, useEffect } from 'react';
import {
  Bot,
  Zap,
  X,
  Send,
  Loader2,
  CheckCircle2,
  Layers,
  ArrowRight,
  ShieldCheck,
  TrendingDown,
  FileCheck,
  Cpu
} from 'lucide-react';
import { api } from './api';

interface PruneStatus {
  gateway: string;
  baseUrl: string;
  connected: boolean;
  totalRequests: number;
  cacheHits: number;
  tokensSaved: number;
  promptTokensPruned: number;
  totalCostSavedUsd: number;
  averageLatencyReductionMs: number;
  cacheHitRate: number;
  recentReceipts: any[];
  lastActive: string | null;
}

interface Message {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  receipt?: any;
  fromCache?: boolean;
  tokensSaved?: number;
  timestamp: string;
}

export default function AiCopilot({ onClose }: { onClose: () => void }) {
  const [activeTab, setActiveTab] = useState<'chat' | 'analytics'>('chat');
  const [status, setStatus] = useState<PruneStatus | null>(null);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      sender: 'ai',
      text: 'Hello! I am FoodBridge AI Copilot powered by Prune AI Gateway (withprune.com). I optimize food rescue operations, provide rapid dispatch and temperature-safety guidance, and minimize API overhead via real-time context pruning and semantic caching.',
      tokensSaved: 140,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 5000);
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
      const res = await api('/ai/ask', { query: q.trim() });
      const aiMsg: Message = {
        id: String(Date.now() + 1),
        sender: 'ai',
        text: res.answer || res.text || 'No response returned.',
        receipt: res.receipt,
        fromCache: res.fromCache,
        tokensSaved: res.tokensSaved,
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
          text: `Error connecting to Prune AI Gateway: ${err.message}`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } finally {
      setLoading(false);
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
            <div className="ai-icon-badge" style={{ background: '#f59e0b20', color: '#f59e0b' }}>
              <Zap size={20} className="ai-sparkle-icon" />
            </div>
            <div>
              <div className="ai-title-row">
                <h2>FoodBridge AI Copilot</h2>
                <span className="ai-powered-tag" style={{ background: '#f59e0b20', color: '#d97706', border: '1px solid #f59e0b40' }}>
                  ⚡ Powered by Prune AI Gateway
                </span>
              </div>
              <p className="ai-subtitle">
                Context Pruning, Semantic Caching & Real-Time Rescue Logistics
              </p>
            </div>
          </div>
          <button className="icon-button close-btn" onClick={onClose} aria-label="Close AI Copilot">
            <X size={20} />
          </button>
        </div>

        {/* Prune Gateway Telemetry Strip */}
        <div className="ai-status-strip">
          <div className="ai-stat-pill success">
            <CheckCircle2 size={14} />
            <span>Gateway: <strong>{status?.connected ? 'Live (withprune.com)' : 'Active (Demo Proxy)'}</strong></span>
          </div>

          <div className="ai-stat-pill token-saver">
            <Zap size={14} />
            <span>Tokens Saved: <strong>~{status ? status.tokensSaved.toLocaleString() : '0'}</strong></span>
          </div>

          <div className="ai-stat-pill">
            <Layers size={14} />
            <span>Cache Hits: <strong>{status?.cacheHits || 0}</strong> ({status?.cacheHitRate || 0}%)</span>
          </div>

          <div className="ai-stat-pill">
            <TrendingDown size={14} />
            <span>Cost Avoidance: <strong>${status ? status.totalCostSavedUsd.toFixed(4) : '0.0000'}</strong></span>
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
            className={`ai-tab-btn ${activeTab === 'analytics' ? 'active' : ''}`}
            onClick={() => setActiveTab('analytics')}
          >
            <Cpu size={16} />
            <span>Prune Gateway Receipts ({status?.recentReceipts?.length || 0})</span>
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
                        {msg.sender === 'ai' ? 'FoodBridge Copilot (Prune Proxy)' : 'You'}
                      </span>
                      {msg.fromCache && (
                        <span className="cache-pill">
                          <Zap size={11} /> 0 Tokens (Prune Cache HIT)
                        </span>
                      )}
                      <span className="ai-msg-time">{msg.timestamp}</span>
                    </div>

                    <div className="ai-msg-text" style={{ whiteSpace: 'pre-wrap' }}>{msg.text}</div>

                    {msg.receipt && (
                      <div className="ai-recalled-box" style={{ background: '#f8fafc', borderColor: '#e2e8f0', marginTop: '0.75rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span className="recalled-title" style={{ color: '#0284c7', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <FileCheck size={12} /> Prune Signed Receipt: <code>{msg.receipt.receiptId}</code>
                          </span>
                          <span style={{ fontSize: '0.75rem', color: '#16a34a', fontWeight: 600 }}>
                            +{msg.receipt.tokensSaved} tokens pruned
                          </span>
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '4px' }}>
                          Model: <strong>{msg.receipt.model}</strong> · Optimization: {msg.receipt.optimization} · Latency: {msg.receipt.latencyMs}ms
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {loading && (
                <div className="ai-message-row ai">
                  <div className="ai-message-bubble loading-bubble">
                    <Loader2 size={16} className="spin" />
                    <span>Routing request via Prune AI Gateway (api.withprune.com)...</span>
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

        {/* Tab 2: Prune Gateway Analytics & Receipts */}
        {activeTab === 'analytics' && (
          <div className="ai-memory-body">
            <p className="ai-memory-intro">
              Prune AI Gateway logs cryptographically verifiable optimization receipts for every request, measuring prompt token pruning, latency reduction, and cache performance.
            </p>

            <div className="ai-memory-results">
              {status?.recentReceipts && status.recentReceipts.length > 0 ? (
                <div className="memory-cards-grid">
                  {status.recentReceipts.map((item, idx) => (
                    <div key={item.receiptId || idx} className="memory-card" style={{ borderLeft: '4px solid #f59e0b' }}>
                      <div className="memory-card-top">
                        <span className="memory-type-badge" style={{ background: '#f59e0b20', color: '#d97706' }}>
                          {item.cacheHit ? 'CACHE HIT' : 'PRUNED'}
                        </span>
                        <span className="memory-score" style={{ color: '#16a34a' }}>
                          +{item.tokensSaved} tokens saved
                        </span>
                      </div>
                      <p className="memory-text" style={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>
                        ID: {item.receiptId}
                      </p>
                      <p className="memory-text" style={{ fontSize: '0.85rem' }}>
                        Query: "{item.query}"
                      </p>
                      <div className="memory-entities" style={{ marginTop: '0.5rem' }}>
                        <span className="entity-tag">Model: {item.model}</span>
                        <span className="entity-tag">Latency: {item.latencyMs}ms</span>
                        <span className="entity-tag">Optimization: {item.optimization}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="empty-state-box">
                  <FileCheck size={32} />
                  <p>Send a query to the AI Copilot to generate your first signed Prune optimization receipt!</p>
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
              All prompt transactions are secured and optimized by the Prune AI Gateway with automatic context pruning and zero redundant token billing.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
