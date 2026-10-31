import React, { useState } from 'react';
import {
  BrainCircuit,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Truck,
  History,
  Layers,
  Info,
  Award,
  Zap,
  Check,
  ArrowRight
} from 'lucide-react';

/** Individual historical delivery or incident fact recalled for an NGO. */
export interface MemoryFact {
  id: string;
  text: string;
  type: 'delivery' | 'delay' | 'incident' | 'preference' | 'general';
  score?: number;
}

/** Enriched NGO candidate combining deterministic score and memory adjustment. */
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
  memoryInsights?: {
    hasHistory: boolean;
    facts: MemoryFact[];
    inferredPattern: string | null;
    confidenceScore: number;
    scoreAdjustment: number;
    hindsightAvailable?: boolean;
    explanation: string;
  };
}

interface MemoryInsightsPanelProps {
  listing: any;
  memoryMatches: MatchCandidate[];
  baselineMatches: MatchCandidate[];
  hindsightAvailable: boolean;
  activeMode: 'memory' | 'baseline' | 'compare';
  onModeChange: (mode: 'memory' | 'baseline' | 'compare') => void;
  loading?: boolean;
}

export default function MemoryInsightsPanel({
  listing,
  memoryMatches,
  baselineMatches,
  hindsightAvailable,
  activeMode,
  onModeChange,
  loading = false
}: MemoryInsightsPanelProps) {
  const [selectedNgoId, setSelectedNgoId] = useState<string | null>(null);

  // Authoritative full matches only with defensive array guards
  const safeMemoryMatches = Array.isArray(memoryMatches) ? memoryMatches : [];
  const safeBaselineMatches = Array.isArray(baselineMatches) ? baselineMatches : [];

  const eligibleMemoryMatches = safeMemoryMatches.filter(m => Boolean(m && m.feasible && m.matchType === 'Full match'));
  const eligibleBaselineMatches = safeBaselineMatches.filter(m => Boolean(m && m.feasible && m.matchType === 'Full match'));

  // Aggregate all unique facts retrieved across eligible candidates
  const allFactsMap = new Map<string, MemoryFact>();
  eligibleMemoryMatches.forEach(m => {
    (m.memoryInsights?.facts || []).forEach(f => {
      if (f && f.text && !allFactsMap.has(f.text)) {
        allFactsMap.set(f.text, f);
      }
    });
  });
  const allRetrievedMemories = Array.from(allFactsMap.values());

  // Count past outcomes across retrieved facts
  let totalConfirmedDeliveries = 0;
  let totalTransitDelays = 0;
  let totalCancellations = 0;
  let totalCapabilities = 0;

  allRetrievedMemories.forEach(f => {
    if (f.type === 'delivery') totalConfirmedDeliveries++;
    else if (f.type === 'delay') totalTransitDelays++;
    else if (f.type === 'incident') totalCancellations++;
    else if (f.type === 'preference') totalCapabilities++;
  });

  const hasAnyMemories = allRetrievedMemories.length > 0;

  // Active top recommendations
  const topMemoryCandidate = eligibleMemoryMatches[0] || null;
  const topBaselineCandidate = eligibleBaselineMatches[0] || null;
  const rankChanged = Boolean(
    topMemoryCandidate &&
    topBaselineCandidate &&
    topMemoryCandidate.ngoId !== topBaselineCandidate.ngoId
  );

  // Selected candidate for deep-dive or default to top
  const activeCandidate = eligibleMemoryMatches.find(m => m.ngoId === (selectedNgoId || topMemoryCandidate?.ngoId)) || topMemoryCandidate;

  return (
    <section className="memory-insights-card card">
      {/* Top Banner / Mode Controller */}
      <div className="insights-header-wrap">
        <div className="insights-title-group">
          <div className="insights-icon-circle">
            <BrainCircuit size={22} />
          </div>
          <div>
            <div className="insights-badge-row">
              <span className="insights-eyebrow">HINDSIGHT MEMORY INSIGHTS</span>
              {hindsightAvailable ? (
                <span className="insights-status-pill online">
                  <span className="status-dot green" /> Hindsight Memory Bank Connected
                </span>
              ) : (
                <span className="insights-status-pill offline">
                  <span className="status-dot red" /> Hindsight Offline · Safe Fallback Active
                </span>
              )}
            </div>
            <h2>Historical Memory & Recommendation Intelligence</h2>
            <p className="muted">
              Evaluates past rescue delivery outcomes, verified delays, and handling track records alongside deterministic safety.
            </p>
          </div>
        </div>

        {/* Demonstration Mode Switcher */}
        <div className="demo-mode-switcher-container">
          <div className="demo-mode-label">Demonstration Mode:</div>
          <div className="demo-mode-pills" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={activeMode === 'memory'}
              className={`demo-pill ${activeMode === 'memory' ? 'active' : ''}`}
              onClick={() => onModeChange('memory')}
            >
              <Sparkles size={14} />
              <span>Memory-Informed</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeMode === 'baseline'}
              className={`demo-pill ${activeMode === 'baseline' ? 'active' : ''}`}
              onClick={() => onModeChange('baseline')}
            >
              <ShieldCheck size={14} />
              <span>Baseline (No Memory)</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeMode === 'compare'}
              className={`demo-pill ${activeMode === 'compare' ? 'active' : ''}`}
              onClick={() => onModeChange('compare')}
            >
              <Layers size={14} />
              <span>Compare Modes</span>
            </button>
          </div>
        </div>
      </div>

      {/* Fallback Notice when Hindsight is unavailable */}
      {!hindsightAvailable && (
        <div className="insights-fallback-banner">
          <AlertTriangle size={20} className="amber-icon" />
          <div className="fallback-text">
            <strong>Hindsight Service Unavailable (Deterministic Fallback Engaged)</strong>
            <p>
              Recommendations are operating on 100% authoritative safety, distance, and capacity checks. No AI or memory output can compromise food rescue safety.
            </p>
          </div>
        </div>
      )}

      {/* Safety Constraint Reminder Banner */}
      <div className="safety-guarantee-strip">
        <span className="guarantee-item">
          <CheckCircle2 size={13} className="green-icon" /> Authoritative Safety Checks Unmodified
        </span>
        <span className="guarantee-item">
          <ShieldCheck size={13} className="green-icon" /> Zero Ineligible Candidate Promotion
        </span>
        <span className="guarantee-item">
          <Award size={13} className="green-icon" /> Grounded in Verified Rescue Logs
        </span>
      </div>

      {loading && (
        <div className="insights-loading">
          <div className="spin-dot" />
          <span>Refreshing memory context and candidate rankings…</span>
        </div>
      )}

      {/* MODE 1: MEMORY-INFORMED VIEW */}
      {activeMode === 'memory' && (
        <div className="insights-body-grid">
          {/* Top Recommendation Spotlight */}
          {topMemoryCandidate ? (
            <div className="spotlight-card">
              <div className="spotlight-badge">
                <Sparkles size={14} /> Top Memory-Informed Recommendation
              </div>
              <div className="spotlight-content">
                <div className="spotlight-header">
                  <div>
                    <h3>{topMemoryCandidate.ngo.name}</h3>
                    <p className="spotlight-location">
                      {topMemoryCandidate.ngo.location.address || 'New Delhi'} · {topMemoryCandidate.distanceKm.toFixed(1)} km · ETA {topMemoryCandidate.etaMinutes} min
                    </p>
                  </div>
                  <div className="spotlight-score-box">
                    <span className="score-label">Recommendation Score</span>
                    <strong className="score-val">{topMemoryCandidate.score}</strong>
                    <span className="score-breakdown">
                      Base {topMemoryCandidate.baseScore}
                      {topMemoryCandidate.memoryInsights?.scoreAdjustment ? (
                        <span className={topMemoryCandidate.memoryInsights.scoreAdjustment > 0 ? 'text-green' : 'text-amber'}>
                          {' '}{topMemoryCandidate.memoryInsights.scoreAdjustment > 0 ? `+${topMemoryCandidate.memoryInsights.scoreAdjustment}` : topMemoryCandidate.memoryInsights.scoreAdjustment} memory
                        </span>
                      ) : (
                        ' (no adj.)'
                      )}
                    </span>
                  </div>
                </div>

                <div className="spotlight-explanation">
                  <p className="explanation-title">
                    <History size={14} /> Historical Influence on Recommendation:
                  </p>
                  <p className="explanation-text">
                    {topMemoryCandidate.memoryInsights?.explanation ||
                      'Candidate selected on strong proximity and vehicle capacity. No adverse history recorded.'}
                  </p>
                  {topMemoryCandidate.memoryInsights?.inferredPattern && (
                    <p className="pattern-pill">
                      <strong>Operational Track Record:</strong> {topMemoryCandidate.memoryInsights.inferredPattern}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="no-candidates-card">
              <AlertTriangle size={24} className="amber-icon" />
              <h3>No Eligible Candidates Available</h3>
              <p>This donation currently has zero candidates passing strict food-safety and capacity checks.</p>
            </div>
          )}

          {/* Historical Outcomes & Verified Events Summary */}
          <div className="outcomes-summary-row">
            <div className="outcome-stat-box">
              <span className="stat-num text-green">{totalConfirmedDeliveries}</span>
              <span className="stat-label">Confirmed Deliveries</span>
              <small>Verified meal handovers</small>
            </div>
            <div className="outcome-stat-box">
              <span className="stat-num text-amber">{totalTransitDelays}</span>
              <span className="stat-label">Transit Delays Logged</span>
              <small>Volunteer or traffic delays</small>
            </div>
            <div className="outcome-stat-box">
              <span className="stat-num text-red">{totalCancellations}</span>
              <span className="stat-label">Cancellations / Incidents</span>
              <small>Prior aborted pickups</small>
            </div>
            <div className="outcome-stat-box">
              <span className="stat-num text-blue">{totalCapabilities}</span>
              <span className="stat-label">Verified Capabilities</span>
              <small>Insulated / holding alignment</small>
            </div>
          </div>

          {/* Candidate Comparison / Candidate Memory Inspector */}
          <div className="candidate-insights-section">
            <div className="section-subheading">
              <h3>Currently Eligible Candidates & Memory Adjustments</h3>
              <span className="tiny-label">{eligibleMemoryMatches.length} Safety-Verified NGOs</span>
            </div>

            <div className="candidate-pills-list">
              {eligibleMemoryMatches.map(m => {
                const adj = m.memoryInsights?.scoreAdjustment || 0;
                const isSelected = m.ngoId === activeCandidate?.ngoId;
                return (
                  <button
                    key={m.ngoId}
                    type="button"
                    className={`candidate-pill-btn ${isSelected ? 'selected' : ''}`}
                    onClick={() => setSelectedNgoId(m.ngoId)}
                  >
                    <div className="pill-ngo-name">{m.ngo.name}</div>
                    <div className="pill-score-badges">
                      <span className="pill-base">Base: {m.baseScore}</span>
                      {adj !== 0 && (
                        <span className={`pill-adj ${adj > 0 ? 'pos' : 'neg'}`}>
                          {adj > 0 ? `+${adj}` : adj}
                        </span>
                      )}
                      <span className="pill-final">Score: {m.score}</span>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Selected Candidate Deep-Dive */}
            {activeCandidate && (
              <div className="candidate-detail-box">
                <div className="detail-header">
                  <h4>{activeCandidate.ngo.name} — Evidence & Rationale</h4>
                  <span className="detail-meta">
                    Capacity: {activeCandidate.ngo.remainingCapacityMeals} meals · Distance: {activeCandidate.distanceKm.toFixed(1)} km
                  </span>
                </div>

                <div className="detail-explanation">
                  <p>
                    <strong>Recommendation Explanation:</strong>{' '}
                    {activeCandidate.memoryInsights?.explanation || 'Authoritative match based on proximity and capacity.'}
                  </p>
                  {activeCandidate.memoryInsights?.inferredPattern && (
                    <p className="detail-pattern">
                      <strong>Observed Pattern:</strong> {activeCandidate.memoryInsights.inferredPattern}
                    </p>
                  )}
                </div>

                {/* Retrieved facts for this specific candidate */}
                <div className="candidate-facts-wrap">
                  <h5>Relevant Historical Facts Retrieved from Hindsight:</h5>
                  {activeCandidate.memoryInsights?.facts && activeCandidate.memoryInsights.facts.length > 0 ? (
                    <ul className="facts-list">
                      {activeCandidate.memoryInsights.facts.map((fact, i) => (
                        <li key={fact.id || i} className={`fact-item ${fact.type}`}>
                          <span className={`fact-type-badge ${fact.type}`}>
                            {fact.type === 'delivery' ? 'Confirmed Delivery' :
                             fact.type === 'delay' ? 'Transit Delay' :
                             fact.type === 'incident' ? 'Cancellation' :
                             fact.type === 'preference' ? 'Capability' : 'Fact'}
                          </span>
                          <span className="fact-text">{fact.text}</span>
                          {fact.score && <span className="fact-relevance">Rel: {Math.round(fact.score * 100)}%</span>}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="no-facts-note">
                      <Info size={14} /> No prior recorded incidents or delivery logs found for this NGO. Evaluated strictly on authoritative capacity and transit metrics.
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Aggregated Retrieved Memories for Current Donation */}
          <div className="retrieved-memories-section">
            <div className="section-subheading">
              <h3>
                <History size={16} /> All Historical Memories Retrieved for Current Donation
              </h3>
              <span className="tiny-label">
                {allRetrievedMemories.length} Contextual Record(s) Found
              </span>
            </div>

            {hasAnyMemories ? (
              <div className="all-memories-grid">
                {allRetrievedMemories.map((fact, idx) => (
                  <div key={fact.id || idx} className={`memory-quote-card ${fact.type}`}>
                    <div className="quote-top">
                      <span className={`fact-type-pill ${fact.type}`}>
                        {fact.type === 'delivery' && <Check size={11} />}
                        {fact.type === 'delay' && <Clock size={11} />}
                        {fact.type === 'incident' && <AlertTriangle size={11} />}
                        {fact.type === 'preference' && <Truck size={11} />}
                        {fact.type.toUpperCase()}
                      </span>
                      {fact.score && (
                        <span className="relevance-score">
                          Semantic match: {Math.round(fact.score * 100)}%
                        </span>
                      )}
                    </div>
                    <p className="quote-text">"{fact.text}"</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-memories-card">
                <Info size={24} className="blue-icon" />
                <h4>No Relevant Historical Memories on Record</h4>
                <p>
                  Hindsight queried the food rescue memory bank for records matching donor{' '}
                  <code>{listing.organizerId ? listing.organizerId.slice(-6) : 'Current Donor'}</code> and candidate NGOs.
                  No prior rescue logs or delays exist for this pairing yet. The matching workflow safely relies on base deterministic scores.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODE 2: BASELINE (NO MEMORY) VIEW */}
      {activeMode === 'baseline' && (
        <div className="baseline-view-container">
          <div className="baseline-notice-card">
            <ShieldCheck size={24} className="green-icon" />
            <div>
              <h3>Baseline Recommendation Mode (Historical Memory Excluded)</h3>
              <p>
                In baseline mode, recommendations are determined purely by the original matching engine using distance,
                travel time buffer, NGO capacity, and operating hours. Historical delivery records and transit delays are
                <strong> strictly excluded</strong> from the scoring equation.
              </p>
            </div>
          </div>

          <div className="baseline-candidates-list">
            <h4>Safety-Verified Baseline Rankings:</h4>
            {eligibleBaselineMatches.length > 0 ? (
              <div className="baseline-table-wrap">
                <table className="baseline-table">
                  <thead>
                    <tr>
                      <th>Rank</th>
                      <th>Candidate NGO</th>
                      <th>Capacity</th>
                      <th>Distance / ETA</th>
                      <th>Deterministic Score</th>
                      <th>Baseline Evaluation</th>
                    </tr>
                  </thead>
                  <tbody>
                    {eligibleBaselineMatches.map((m, idx) => (
                      <tr key={m.ngoId} className={idx === 0 ? 'top-baseline-row' : ''}>
                        <td>
                          <span className={`rank-badge ${idx === 0 ? 'first' : ''}`}>#{idx + 1}</span>
                        </td>
                        <td>
                          <strong>{m.ngo.name}</strong>
                          <div className="table-sub">{m.ngo.location.address || 'New Delhi'}</div>
                        </td>
                        <td>{m.ngo.remainingCapacityMeals} meals</td>
                        <td>{m.distanceKm.toFixed(1)} km · {m.etaMinutes} min</td>
                        <td>
                          <strong className="base-score-num">{m.baseScore}</strong>
                        </td>
                        <td>
                          <span className="text-muted">Proximity & Capacity only (Memory disabled)</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="muted">No eligible candidates available under baseline checks.</p>
            )}
          </div>
        </div>
      )}

      {/* MODE 3: SIDE-BY-SIDE COMPARISON VIEW */}
      {activeMode === 'compare' && (
        <div className="comparison-view-container">
          {/* Comparison summary banner */}
          <div className="comparison-summary-banner">
            <div className="summary-left">
              <Layers size={22} />
              <div>
                <h4>Demonstration Comparison: Baseline vs Memory-Informed</h4>
                <p>
                  Both modes evaluate the <strong>identical donation listing</strong> and adhere to the <strong>same authoritative safety checks</strong>.
                </p>
              </div>
            </div>
            <div className="summary-right">
              {rankChanged ? (
                <div className="rank-change-indicator alert">
                  <Zap size={14} />
                  <span>Recommendation Changed based on Historical Evidence</span>
                </div>
              ) : (
                <div className="rank-change-indicator neutral">
                  <CheckCircle2 size={14} />
                  <span>Recommendation Rank Preserved with Confidence Delta</span>
                </div>
              )}
            </div>
          </div>

          {/* Side by side cards */}
          <div className="compare-columns-grid">
            {/* Column A: Baseline */}
            <div className="compare-column baseline">
              <div className="compare-col-header">
                <ShieldCheck size={18} />
                <div>
                  <h4>Baseline Recommendation</h4>
                  <small>Memory Genuine Exclusion (?memory=false)</small>
                </div>
              </div>

              {topBaselineCandidate ? (
                <div className="compare-candidate-card">
                  <div className="candidate-rank-pill">#1 Recommended (Baseline)</div>
                  <h5>{topBaselineCandidate.ngo.name}</h5>
                  <p className="comp-meta">
                    {topBaselineCandidate.distanceKm.toFixed(1)} km · Capacity: {topBaselineCandidate.ngo.remainingCapacityMeals} meals
                  </p>
                  <div className="comp-score-box">
                    <span className="score-desc">Baseline Score:</span>
                    <strong className="score-val">{topBaselineCandidate.baseScore}</strong>
                  </div>
                  <p className="comp-reasoning">
                    Selected primarily on physical proximity ({topBaselineCandidate.distanceKm.toFixed(1)} km) and available meal capacity. Historical rescue reliability was not considered.
                  </p>
                </div>
              ) : (
                <p className="muted">No candidate eligible.</p>
              )}

              <div className="column-rankings-mini">
                <h6>Full Baseline Candidate Order:</h6>
                <ol>
                  {eligibleBaselineMatches.map((m, idx) => (
                    <li key={m.ngoId}>
                      <span>#{idx + 1} {m.ngo.name}</span>
                      <strong>Score {m.baseScore}</strong>
                    </li>
                  ))}
                </ol>
              </div>
            </div>

            {/* Column B: Memory-Informed */}
            <div className="compare-column memory-informed">
              <div className="compare-col-header">
                <Sparkles size={18} />
                <div>
                  <h4>Memory-Informed Recommendation</h4>
                  <small>Hindsight Historical Memory (?memory=true)</small>
                </div>
              </div>

              {topMemoryCandidate ? (
                <div className="compare-candidate-card memory-highlight">
                  <div className="candidate-rank-pill memory">#1 Recommended (Memory-Informed)</div>
                  <h5>{topMemoryCandidate.ngo.name}</h5>
                  <p className="comp-meta">
                    {topMemoryCandidate.distanceKm.toFixed(1)} km · Capacity: {topMemoryCandidate.ngo.remainingCapacityMeals} meals
                  </p>
                  <div className="comp-score-box">
                    <span className="score-desc">Memory-Enriched Score:</span>
                    <strong className="score-val memory-score">{topMemoryCandidate.score}</strong>
                    <span className="score-delta">
                      ({topMemoryCandidate.baseScore} base{' '}
                      {topMemoryCandidate.memoryInsights?.scoreAdjustment ? (
                        <span className={topMemoryCandidate.memoryInsights.scoreAdjustment > 0 ? 'text-green' : 'text-amber'}>
                          {topMemoryCandidate.memoryInsights.scoreAdjustment > 0 ? `+${topMemoryCandidate.memoryInsights.scoreAdjustment}` : topMemoryCandidate.memoryInsights.scoreAdjustment}
                        </span>
                      ) : ''})
                    </span>
                  </div>
                  <p className="comp-reasoning">
                    <strong>Evidence Rationale:</strong>{' '}
                    {topMemoryCandidate.memoryInsights?.explanation ||
                      'Maintains top spot with zero recorded transit delays.'}
                  </p>
                  {topMemoryCandidate.memoryInsights?.inferredPattern && (
                    <div className="comp-pattern">
                      <History size={12} /> {topMemoryCandidate.memoryInsights.inferredPattern}
                    </div>
                  )}
                </div>
              ) : (
                <p className="muted">No candidate eligible.</p>
              )}

              <div className="column-rankings-mini">
                <h6>Full Memory-Informed Candidate Order:</h6>
                <ol>
                  {eligibleMemoryMatches.map((m, idx) => {
                    const adj = m.memoryInsights?.scoreAdjustment || 0;
                    return (
                      <li key={m.ngoId} className={m.ngoId === topMemoryCandidate?.ngoId ? 'highlight-item' : ''}>
                        <span>#{idx + 1} {m.ngo.name}</span>
                        <div className="li-scores">
                          {adj !== 0 && (
                            <span className={`mini-adj ${adj > 0 ? 'pos' : 'neg'}`}>
                              {adj > 0 ? `+${adj}` : adj}
                            </span>
                          )}
                          <strong>Score {m.score}</strong>
                        </div>
                      </li>
                    );
                  })}
                </ol>
              </div>
            </div>
          </div>

          {/* Key Differences Breakdown */}
          <div className="differences-breakdown-card">
            <h5>
              <ArrowRight size={15} /> What Changed & Why:
            </h5>
            <div className="diff-explanations">
              {rankChanged ? (
                <p>
                  <strong>Ranking Shift:</strong> NGO ranking changed between baseline and memory-informed modes.
                  While <em>{topBaselineCandidate?.ngo.name}</em> had a strong baseline proximity score ({topBaselineCandidate?.baseScore}),
                  historical rescue evidence retrieved from Hindsight elevated <em>{topMemoryCandidate?.ngo.name}</em> to #1 due to proven successful delivery completions and zero incident delays.
                </p>
              ) : (
                <p>
                  <strong>Ranking Preserved:</strong> <em>{topMemoryCandidate?.ngo.name}</em> remains the top recommended candidate in both modes.
                  Historical memory confirms its operational reliability with a confidence adjustment of{' '}
                  <span className="text-green">
                    +{topMemoryCandidate?.memoryInsights?.scoreAdjustment || 0}
                  </span>{' '}
                  backed by {totalConfirmedDeliveries} verified past delivery log(s).
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
