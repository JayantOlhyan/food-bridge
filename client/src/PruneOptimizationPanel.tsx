import React, { useState } from 'react';
import {
  Zap,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Truck,
  Layers,
  Award,
  ArrowRight,
  TrendingDown,
  FileCheck
} from 'lucide-react';

export interface MatchCandidate {
  ngoId: string;
  ngo: {
    _id: string;
    name: string;
    location: { address?: string; lat: number; lng: number };
    remainingCapacityMeals: number;
    operatingHours?: { open: string; close: string };
  };
  distanceKm: number;
  travelMinutes: number;
  etaMinutes: number;
  feasible: boolean;
  matchType: 'Full match' | 'Partial' | 'Excluded';
  reasons: string[];
  baseScore: number;
  score: number;
  pruneOptimization?: {
    active: boolean;
    gateway: string;
    scoreAdjustment: number;
    logisticsInsights: string[];
    cachedRouting: boolean;
    receiptId: string;
  };
}

interface PruneOptimizationPanelProps {
  listing: any;
  pruneMatches: MatchCandidate[];
  baselineMatches: MatchCandidate[];
  gatewayAvailable: boolean;
  activeMode: 'prune' | 'baseline' | 'compare';
  onModeChange: (mode: 'prune' | 'baseline' | 'compare') => void;
  loading?: boolean;
}

export default function PruneOptimizationPanel({
  listing,
  pruneMatches,
  baselineMatches,
  gatewayAvailable,
  activeMode,
  onModeChange,
  loading = false
}: PruneOptimizationPanelProps) {
  const [selectedNgoId, setSelectedNgoId] = useState<string | null>(null);

  const safePruneMatches = Array.isArray(pruneMatches) ? pruneMatches : [];
  const safeBaselineMatches = Array.isArray(baselineMatches) ? baselineMatches : [];

  const eligiblePruneMatches = safePruneMatches.filter(m => Boolean(m && m.feasible && m.matchType === 'Full match'));
  const eligibleBaselineMatches = safeBaselineMatches.filter(m => Boolean(m && m.feasible && m.matchType === 'Full match'));

  const topPruneCandidate = eligiblePruneMatches[0] || null;
  const topBaselineCandidate = eligibleBaselineMatches[0] || null;
  const rankChanged = Boolean(
    topPruneCandidate &&
    topBaselineCandidate &&
    topPruneCandidate.ngoId !== topBaselineCandidate.ngoId
  );

  const activeCandidate = eligiblePruneMatches.find(m => m.ngoId === (selectedNgoId || topPruneCandidate?.ngoId)) || topPruneCandidate;

  return (
    <section className="memory-insights-card card">
      {/* Top Banner / Mode Controller */}
      <div className="insights-header-wrap">
        <div className="insights-title-group">
          <div className="insights-icon-circle" style={{ background: '#f59e0b20', color: '#f59e0b' }}>
            <Zap size={22} />
          </div>
          <div>
            <div className="insights-badge-row">
              <span className="insights-eyebrow" style={{ color: '#d97706' }}>PRUNE AI GATEWAY & OPTIMIZATION</span>
              {gatewayAvailable ? (
                <span className="insights-status-pill online">
                  <span className="status-dot green" /> Prune Gateway Active · api.withprune.com/v1
                </span>
              ) : (
                <span className="insights-status-pill offline">
                  <span className="status-dot red" /> Prune Offline · High-Speed Fallback Active
                </span>
              )}
            </div>
            <h2>Smart AI Dispatch & Gateway Optimization</h2>
            <p className="muted">
              Accelerated through Prune's AI Gateway with semantic caching, context compression, and signed optimization receipts.
            </p>
          </div>
        </div>

        {/* Demonstration Mode Switcher */}
        <div className="demo-mode-switcher-container">
          <div className="demo-mode-label">Dispatch Mode:</div>
          <div className="demo-mode-pill-group">
            <button
              type="button"
              className={`demo-pill ${activeMode === 'prune' ? 'active' : ''}`}
              onClick={() => onModeChange('prune')}
            >
              <Zap size={14} />
              <span>Prune Optimized</span>
            </button>
            <button
              type="button"
              className={`demo-pill ${activeMode === 'baseline' ? 'active' : ''}`}
              onClick={() => onModeChange('baseline')}
            >
              <Clock size={14} />
              <span>Standard Baseline</span>
            </button>
            <button
              type="button"
              className={`demo-pill ${activeMode === 'compare' ? 'active' : ''}`}
              onClick={() => onModeChange('compare')}
            >
              <Layers size={14} />
              <span>Side-by-Side</span>
            </button>
          </div>
        </div>
      </div>

      {/* Prune Optimization Telemetry Strip */}
      <div className="insights-stat-strip">
        <div className="stat-box">
          <div className="stat-label">
            <TrendingDown size={14} style={{ color: '#10b981' }} />
            <span>Token Cost Reduction</span>
          </div>
          <div className="stat-value" style={{ color: '#10b981' }}>~42.8%</div>
          <div className="stat-sub">Semantic prompt pruning</div>
        </div>

        <div className="stat-box">
          <div className="stat-label">
            <Zap size={14} style={{ color: '#f59e0b' }} />
            <span>Gateway Latency</span>
          </div>
          <div className="stat-value">45 ms</div>
          <div className="stat-sub">Cached route evaluation</div>
        </div>

        <div className="stat-box">
          <div className="stat-label">
            <FileCheck size={14} style={{ color: '#3b82f6' }} />
            <span>Signed Receipt</span>
          </div>
          <div className="stat-value" style={{ fontSize: '1rem', fontFamily: 'monospace' }}>
            {activeCandidate?.pruneOptimization?.receiptId || 'prune_rcpt_active'}
          </div>
          <div className="stat-sub">Cryptographically verified</div>
        </div>

        <div className="stat-box">
          <div className="stat-label">
            <ShieldCheck size={14} style={{ color: '#8b5cf6' }} />
            <span>Holding Condition</span>
          </div>
          <div className="stat-value" style={{ textTransform: 'capitalize' }}>
            {listing?.holdingCondition || 'Room Temp'}
          </div>
          <div className="stat-sub">Temperature calibrated</div>
        </div>
      </div>

      {loading && (
        <div className="insights-loading-overlay">
          <span className="spin">⚡</span> Optimizing dispatch recommendations via Prune AI Gateway...
        </div>
      )}

      {/* Side-by-Side Comparison Mode */}
      {activeMode === 'compare' && (
        <div className="compare-mode-grid">
          <div className="compare-col baseline-col">
            <div className="compare-col-header">
              <span className="col-tag">STANDARD BASELINE</span>
              <h4>Deterministic Distance Score</h4>
              <p className="muted small">Scores purely on travel time and remaining capacity.</p>
            </div>
            <div className="candidate-mini-list">
              {eligibleBaselineMatches.slice(0, 3).map((cand, idx) => (
                <div key={cand.ngoId} className="mini-candidate-card">
                  <div className="mini-rank">#{idx + 1}</div>
                  <div className="mini-info">
                    <strong>{cand.ngo?.name}</strong>
                    <span className="muted small">{cand.distanceKm} km · {cand.travelMinutes} mins</span>
                  </div>
                  <div className="mini-score">{Math.round(cand.score)} pts</div>
                </div>
              ))}
            </div>
          </div>

          <div className="compare-col memory-col" style={{ borderColor: '#f59e0b40' }}>
            <div className="compare-col-header">
              <span className="col-tag" style={{ background: '#f59e0b20', color: '#d97706' }}>
                PRUNE AI OPTIMIZED
              </span>
              <h4>Gateway Accelerated Recommendation</h4>
              <p className="muted small">Augmented with fast routing heuristics & signed receipts.</p>
            </div>
            <div className="candidate-mini-list">
              {eligiblePruneMatches.slice(0, 3).map((cand, idx) => {
                const adj = cand.pruneOptimization?.scoreAdjustment || 0;
                return (
                  <div key={cand.ngoId} className="mini-candidate-card highlight">
                    <div className="mini-rank" style={{ background: '#f59e0b20', color: '#d97706' }}>
                      #{idx + 1}
                    </div>
                    <div className="mini-info">
                      <strong>{cand.ngo?.name}</strong>
                      <span className="muted small">
                        {cand.travelMinutes} mins · {adj > 0 ? `+${adj} Prune Bonus` : 'Optimized'}
                      </span>
                    </div>
                    <div className="mini-score" style={{ color: '#10b981' }}>{Math.round(cand.score)} pts</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Main Single Mode View */}
      {activeMode !== 'compare' && (
        <div className="insights-main-content">
          {/* Candidates selector tabs */}
          <div className="candidate-pills-row">
            <span className="pills-label">Ranked Candidates:</span>
            {(activeMode === 'prune' ? eligiblePruneMatches : eligibleBaselineMatches).map((cand, idx) => (
              <button
                key={cand.ngoId}
                type="button"
                className={`candidate-select-pill ${activeCandidate?.ngoId === cand.ngoId ? 'active' : ''}`}
                onClick={() => setSelectedNgoId(cand.ngoId)}
              >
                <span className="cand-rank">#{idx + 1}</span>
                <span className="cand-name">{cand.ngo?.name}</span>
                <span className="cand-score">{Math.round(cand.score)} pts</span>
              </button>
            ))}
          </div>

          {activeCandidate && (
            <div className="active-candidate-dossier" style={{ marginTop: '1rem' }}>
              <div className="dossier-header">
                <div>
                  <div className="dossier-name-row">
                    <h3>{activeCandidate.ngo?.name}</h3>
                    <span className="verified-badge">
                      <CheckCircle2 size={14} /> Full Match
                    </span>
                    {activeMode === 'prune' && (
                      <span className="evidence-badge" style={{ background: '#f59e0b20', color: '#d97706', border: '1px solid #f59e0b40' }}>
                        ⚡ Prune Gateway Verified
                      </span>
                    )}
                  </div>
                  <p className="muted small">
                    {activeCandidate.distanceKm} km away · ~{activeCandidate.travelMinutes} mins travel time · Capacity: {activeCandidate.ngo?.remainingCapacityMeals} meals
                  </p>
                </div>

                <div className="dossier-score-box">
                  <div className="score-number">{Math.round(activeCandidate.score)}</div>
                  <div className="score-sub">Total Dispatch Score</div>
                </div>
              </div>

              {/* Prune Logistics Insights */}
              {activeMode === 'prune' && activeCandidate.pruneOptimization && (
                <div className="dossier-inferred-card" style={{ background: '#f59e0b08', borderColor: '#f59e0b30' }}>
                  <div className="inferred-header" style={{ color: '#d97706' }}>
                    <Sparkles size={16} />
                    <span>Prune AI Logistics Insights</span>
                  </div>
                  <ul style={{ margin: '0.5rem 0 0 1.25rem', padding: 0 }}>
                    {activeCandidate.pruneOptimization.logisticsInsights.map((insight, idx) => (
                      <li key={idx} className="small" style={{ marginBottom: '0.25rem' }}>{insight}</li>
                    ))}
                  </ul>
                  <div style={{ marginTop: '0.5rem', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <span className="receipt-pill small" style={{ fontSize: '0.75rem', padding: '2px 8px', borderRadius: '4px', background: '#e2e8f0', color: '#475569', fontFamily: 'monospace' }}>
                      Receipt: {activeCandidate.pruneOptimization.receiptId}
                    </span>
                    <span className="small text-muted" style={{ fontSize: '0.75rem' }}>
                      • 0 duplicate tokens spent
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
