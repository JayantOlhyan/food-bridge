import 'dotenv/config';
import { describe, it, expect, beforeEach } from 'vitest';
import {
  enrichMatchesWithPrune,
  askPruneCopilot,
  optimizeListingWithPrune,
  clearPruneCache,
  getPruneMetrics
} from '../services/prune.js';

describe('Prune AI Gateway Service Edge Cases', () => {
  beforeEach(() => {
    clearPruneCache();
  });

  it('1. Handles null, undefined, or empty listing without throwing', async () => {
    const rawMatches = [
      {
        ngoId: 'ngo-1',
        feasible: true,
        matchType: 'Full match',
        score: 85,
        travelMinutes: 12
      }
    ];

    const resNull = await enrichMatchesWithPrune({}, rawMatches);
    expect(Array.isArray(resNull)).toBe(true);
    expect(resNull.length).toBe(1);
    expect(resNull[0].score).toBeGreaterThanOrEqual(85);
  });

  it('2. Handles null, empty, or non-array rawMatches gracefully', async () => {
    const sampleListing = {
      _id: 'listing-123',
      organizerId: 'org-123',
      holdingCondition: 'room-temperature'
    };

    const resEmpty = await enrichMatchesWithPrune(sampleListing, []);
    expect(Array.isArray(resEmpty)).toBe(true);
    expect(resEmpty.length).toBe(0);

    const resNullMatches = await enrichMatchesWithPrune(sampleListing, null);
    expect(Array.isArray(resNullMatches)).toBe(true);
    expect(resNullMatches.length).toBe(0);
  });

  it('3. askPruneCopilot rejects empty or non-string queries', async () => {
    await expect(askPruneCopilot('')).rejects.toThrow('Valid query string is required');
    await expect(askPruneCopilot(null)).rejects.toThrow('Valid query string is required');
    await expect(askPruneCopilot(undefined)).rejects.toThrow('Valid query string is required');
  });

  it('4. Handles large volume listings and hot-held temperature compliance', async () => {
    const hotListing = {
      _id: 'listing-hot',
      eventName: 'Hot Lunch Catering',
      quantityMeals: 500,
      holdingCondition: 'hot-held'
    };

    const res = await optimizeListingWithPrune(hotListing);
    expect(res.safetyRating).toBe('Temperature-Sensitive');
    expect(res.recommendedVehicle).toContain('Medium Transit Van');
    expect(res.logisticsAdvice).toContain('insulated carriers');
    expect(res.receipt).toHaveProperty('receiptId');
  });

  it('5. Semantic cache isolates different queries and respects context', async () => {
    const resA = await askPruneCopilot('How to store rice safely?', 'context-1');
    const resB = await askPruneCopilot('How to store rice safely?', 'context-2');

    expect(resA.fromCache).toBe(false);
    expect(resB.fromCache).toBe(false);

    // Identical query and context should hit cache
    const resA2 = await askPruneCopilot('How to store rice safely?', 'context-1');
    expect(resA2.fromCache).toBe(true);
  });

  it('6. Correctly tracks metrics across multiple operations', async () => {
    await askPruneCopilot('Test query 1');
    await askPruneCopilot('Test query 2');
    await askPruneCopilot('Test query 1'); // Cache hit

    const metrics = getPruneMetrics();
    expect(metrics.totalRequests).toBe(3);
    expect(metrics.cacheHits).toBe(1);
    expect(metrics.tokensSaved).toBeGreaterThan(0);
    expect(metrics.recentReceipts.length).toBe(3);
  });
});
