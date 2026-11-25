import { describe, it, expect } from 'vitest';
import { enrichMatchesWithPrune } from '../services/prune.js';

describe('Prune Memory & Recommendation Workflow', () => {
  const mockListing = {
    _id: '507f1f77bcf86cd799439011',
    eventName: 'Corporate Luncheon Leftovers',
    quantityMeals: 120,
    holdingCondition: 'hot-held',
    safeDeadline: new Date(Date.now() + 4 * 3600000).toISOString()
  };

  const mockMatches = [
    {
      ngoId: 'ngo-alpha',
      ngo: {
        _id: 'ngo-alpha',
        name: 'Feeding Hope Delhi',
        remainingCapacityMeals: 250
      },
      feasible: true,
      matchType: 'Full match',
      score: 80,
      baseScore: 80,
      travelMinutes: 10,
      distanceKm: 3.5
    },
    {
      ngoId: 'ngo-beta',
      ngo: {
        _id: 'ngo-beta',
        name: 'Roti Bank Noida',
        remainingCapacityMeals: 130
      },
      feasible: true,
      matchType: 'Full match',
      score: 75,
      baseScore: 75,
      travelMinutes: 25,
      distanceKm: 9.0
    }
  ];

  it('1. Enriches matches with Prune AI optimization telemetry', async () => {
    const enriched = await enrichMatchesWithPrune(mockListing, mockMatches);
    expect(Array.isArray(enriched)).toBe(true);
    expect(enriched.length).toBe(2);

    const first = enriched[0];
    expect(first).toHaveProperty('pruneOptimization');
    expect(first.pruneOptimization.active).toBe(true);
    expect(first.pruneOptimization.gateway).toBe('Prune AI Gateway');
    expect(first.pruneOptimization.receiptId).toMatch(/^prune_rcpt_/);
    expect(Array.isArray(first.pruneOptimization.logisticsInsights)).toBe(true);
  });

  it('2. Rewards rapid 15-minute delivery radius with score bonus', async () => {
    const enriched = await enrichMatchesWithPrune(mockListing, mockMatches);
    const alpha = enriched.find(m => m.ngoId === 'ngo-alpha');
    expect(alpha.score).toBeGreaterThan(alpha.baseScore);
    expect(alpha.pruneOptimization.scoreAdjustment).toBeGreaterThan(0);
  });

  it('3. Strictly preserves deterministic matching tiers (Full match ahead of Partial)', async () => {
    const mixedMatches = [
      {
        ngoId: 'ngo-partial',
        feasible: true,
        matchType: 'Partial',
        score: 95,
        baseScore: 95,
        travelMinutes: 5
      },
      {
        ngoId: 'ngo-full',
        feasible: true,
        matchType: 'Full match',
        score: 70,
        baseScore: 70,
        travelMinutes: 14
      }
    ];

    const enriched = await enrichMatchesWithPrune(mockListing, mixedMatches);
    expect(enriched[0].ngoId).toBe('ngo-full');
  });
});
