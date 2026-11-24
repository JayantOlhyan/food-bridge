import 'dotenv/config';
import { describe, it, expect } from 'vitest';
import {
  enrichMatchesWithMemory,
  saveConfirmedRescueEvent,
  recallMemories,
  aiMetrics
} from '../services/hindsight.js';

describe('Hindsight Service & Recommendation Edge Cases', () => {
  it('1. Handles null, undefined, or empty listing without throwing', async () => {
    const rawMatches = [
      {
        ngoId: 'ngo-1',
        feasible: true,
        matchType: 'Full match',
        score: 85,
        distanceKm: 4.2
      }
    ];

    const resNull = await enrichMatchesWithMemory(null, rawMatches);
    expect(Array.isArray(resNull)).toBe(true);
    expect(resNull.length).toBe(1);
    expect(resNull[0].score).toBe(85);

    const resUndef = await enrichMatchesWithMemory(undefined, rawMatches);
    expect(Array.isArray(resUndef)).toBe(true);
    expect(resUndef.length).toBe(1);
  });

  it('2. Handles null, empty, or non-array rawMatches gracefully', async () => {
    const sampleListing = {
      _id: 'listing-123',
      organizerId: 'org-123',
      eligibility: { eligible: true }
    };

    const resEmpty = await enrichMatchesWithMemory(sampleListing, []);
    expect(Array.isArray(resEmpty)).toBe(true);
    expect(resEmpty.length).toBe(0);

    const resNullMatches = await enrichMatchesWithMemory(sampleListing, null);
    expect(Array.isArray(resNullMatches)).toBe(true);
    expect(resNullMatches.length).toBe(0);
  });

  it('3. Handles candidates with missing score, missing distanceKm, or missing ngoId', async () => {
    const sampleListing = {
      _id: 'listing-123',
      organizerId: 'org-123',
      eligibility: { eligible: true }
    };

    const malformedMatches = [
      {
        feasible: true,
        matchType: 'Full match'
        // Missing score, distanceKm, ngoId
      },
      {
        feasible: false,
        matchType: 'Excluded'
      }
    ];

    const result = await enrichMatchesWithMemory(sampleListing, malformedMatches, { enabled: false });
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBe(2);
    // Baseline defaults score to 50 and distanceKm to 0
    expect(result[0].score).toBe(50);
    expect(result[0].distanceKm).toBe(0);
    expect(typeof result[0].ngoId).toBe('string');
  });

  it('4. Ineligible listings (expired or unsafe) are never enriched with memory', async () => {
    const unsafeListing = {
      _id: 'listing-unsafe',
      organizerId: 'org-unsafe',
      eligibility: { eligible: false, reasons: ['Holding time exceeded 240 minutes'] }
    };

    const rawMatches = [
      {
        ngoId: 'ngo-1',
        feasible: false,
        matchType: 'Excluded',
        score: 0
      }
    ];

    const enriched = await enrichMatchesWithMemory(unsafeListing, rawMatches, { enabled: true });
    expect(enriched[0].score).toBe(0);
    expect(enriched[0].memoryInsights.hasHistory).toBe(false);
  });

  it('5. Enforces deterministic tie-breaking when candidates have identical scores and distances', async () => {
    const sampleListing = {
      _id: 'listing-tie',
      organizerId: 'org-tie',
      eligibility: { eligible: true }
    };

    const tieMatches = [
      {
        ngoId: 'ngo-zebra',
        feasible: true,
        matchType: 'Full match',
        score: 90,
        distanceKm: 5.0
      },
      {
        ngoId: 'ngo-alpha',
        feasible: true,
        matchType: 'Full match',
        score: 90,
        distanceKm: 5.0
      }
    ];

    const sorted = await enrichMatchesWithMemory(sampleListing, tieMatches, { enabled: false });
    // Should sort alphabetically by ngoId when scores and distances are equal
    expect(sorted[0].ngoId).toBe('ngo-alpha');
    expect(sorted[1].ngoId).toBe('ngo-zebra');
  });

  it('6. saveConfirmedRescueEvent safely handles 0 meal count and unusual characters without PII leak', async () => {
    const weirdPayload = {
      donorId: '64d000000000000000000010',
      ngoId: '64d000000000000000000020',
      listingId: '64d000000000000000000030',
      eventName: 'Edge Gala <script>alert("test")</script>',
      deliveredMeals: 0,
      deliveredKg: 0,
      ngoName: 'NGO & Partners (Delhi NCR)'
    };

    const res = await saveConfirmedRescueEvent('CONFIRMED_DELIVERY', weirdPayload);
    expect(res).not.toBeNull();
    expect(res.status).toBe('retained');
  }, 30000);

  it('7. recallMemories returns empty array on empty query without throwing', async () => {
    const resEmpty = await recallMemories('');
    expect(Array.isArray(resEmpty)).toBe(true);
    expect(resEmpty.length).toBe(0);

    const resSpaces = await recallMemories('   ');
    expect(Array.isArray(resSpaces)).toBe(true);
  });

  it('8. Deduplication avoids redundant retentions of identical content', async () => {
    const initialDeduped = aiMetrics.dedupedCount;
    const initialSaved = aiMetrics.estimatedTokensSaved;

    const payload = {
      donorId: '64d000000000000000000088',
      ngoId: '64d000000000000000000099',
      listingId: '64d000000000000000000077',
      eventName: 'Deduplication Test Charity Dinner',
      deliveredMeals: 35,
      deliveredKg: 14,
      ngoName: 'Deduplication NGO'
    };

    // First retention
    await saveConfirmedRescueEvent('CONFIRMED_DELIVERY', payload);

    // Second retention with exact same payload
    const duplicateRes = await saveConfirmedRescueEvent('CONFIRMED_DELIVERY', payload);
    expect(duplicateRes.status).toBe('skipped_duplicate');
    expect(aiMetrics.dedupedCount).toBeGreaterThan(initialDeduped);
    expect(aiMetrics.estimatedTokensSaved).toBeGreaterThan(initialSaved);
  }, 30000);
});
