import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../app.js';
import { connectDatabase, disconnectDatabase } from '../db.js';
import { seed } from '../scripts/seed-data.js';
import { Listing, Ngo, Organizer } from '../models.js';
import { match } from '../services/matching.js';
import {
  saveConfirmedRescueEvent,
  enrichMatchesWithMemory
} from '../services/hindsight.js';

describe('Hindsight Memory-Enriched Recommendation Workflow', () => {
  let organizer;
  let ngos;
  let sampleListing;

  beforeAll(async () => {
    await connectDatabase();
    await seed();
    organizer = await Organizer.findOne();
    ngos = await Ngo.find().lean();
    sampleListing = await Listing.findOne({ status: 'POSTED' }).lean();
  }, 30000);

  afterAll(async () => {
    await disconnectDatabase();
  });

  it('1. Historical outcomes can influence recommendations among eligible NGOs when relevant', async () => {
    const ngoA = ngos.find(n => n.name.includes('NGO A'));
    const ngoB = ngos.find(n => n.name.includes('NGO B'));
    expect(ngoA).toBeDefined();
    expect(ngoB).toBeDefined();

    // 1. Record positive verified delivery history for NGO A
    await saveConfirmedRescueEvent('CONFIRMED_DELIVERY', {
      donorId: organizer._id,
      ngoId: ngoA._id,
      listingId: sampleListing._id,
      eventName: sampleListing.eventName,
      deliveredMeals: 40,
      deliveredKg: 18,
      ngoName: ngoA.name
    });

    // 2. Fetch matches with memory enabled
    const res = await request(app)
      .get(`/api/listings/${sampleListing._id}/matches?memory=true`);
    expect(res.status).toBe(200);

    const matchA = res.body.find(m => m.ngoId === String(ngoA._id));
    expect(matchA).toBeDefined();
    expect(matchA.feasible).toBe(true);
    expect(matchA.matchType).toBe('Full match');

    // Memory insights should reflect the positive history
    expect(matchA.memoryInsights.hasHistory).toBe(true);
    expect(matchA.memoryInsights.scoreAdjustment).toBeGreaterThan(0);
    expect(matchA.score).toBeGreaterThanOrEqual(matchA.baseScore);
  }, 30000);

  it('2. Unsafe or expired food remains strictly ineligible regardless of memory', async () => {
    const now = Date.now();
    // Create an expired/unsafe listing (prepared 8 hours ago with 2h room-temperature limit)
    const unsafeListing = await Listing.create({
      organizerId: organizer._id,
      eventName: 'Expired Midnight Banquet',
      eventType: 'Banquet',
      location: organizer.location,
      foodItems: [{ name: 'Rice & Curry', dietType: 'veg', category: 'Meal' }],
      quantityMeals: 30,
      preparedAt: new Date(now - 8 * 3600000).toISOString(),
      holdingCondition: 'room-temperature', // safe limit 2h -> expired 6 hours ago
      packagingAvailable: true,
      pickupWindowStart: new Date(now - 2 * 3600000).toISOString(),
      pickupWindowEnd: new Date(now - 1 * 3600000).toISOString(),
      safeDeadline: new Date(now - 6 * 3600000),
      status: 'INELIGIBLE',
      eligibility: {
        eligible: false,
        reasons: ['Safe collection deadline has expired.']
      }
    });

    const rawMatches = match(unsafeListing.toObject(), ngos);
    expect(rawMatches.every(m => !m.feasible)).toBe(true);
    expect(rawMatches.every(m => m.matchType === 'Excluded')).toBe(true);

    // Run memory enrichment
    const enriched = await enrichMatchesWithMemory(unsafeListing.toObject(), rawMatches, { enabled: true });

    // Assert: Every single NGO remains 100% Excluded and score is 0
    expect(enriched.every(m => !m.feasible)).toBe(true);
    expect(enriched.every(m => m.matchType === 'Excluded')).toBe(true);
    expect(enriched.every(m => m.score === 0)).toBe(true);
  });

  it('3. An NGO with no remaining capacity remains ineligible regardless of historical memories', async () => {
    // Create an NGO with 0 capacity
    const fullNgo = {
      _id: '659999999999999999999999',
      name: 'NGO Full – Zero Capacity Shelter',
      location: organizer.location,
      dailyCapacityMeals: 100,
      remainingCapacityMeals: 0, // No capacity
      acceptsVeg: true,
      acceptsNonVeg: true,
      availableFrom: '00:00',
      availableTo: '23:59',
      hasVehicle: true,
      active: true
    };

    const rawMatches = match(sampleListing, [fullNgo]);
    expect(rawMatches[0].feasible).toBe(false);
    expect(rawMatches[0].matchType).toBe('Excluded');
    expect(rawMatches[0].reasons).toContain('Excluded: no remaining capacity.');

    // Attempt memory enrichment
    const enriched = await enrichMatchesWithMemory(sampleListing, rawMatches, { enabled: true });

    // Assert: Capacity check is authoritative; NGO is NEVER promoted
    expect(enriched[0].feasible).toBe(false);
    expect(enriched[0].matchType).toBe('Excluded');
    expect(enriched[0].score).toBe(0);
    expect(enriched[0].reasons).toContain('Excluded: no remaining capacity.');
  });

  it('4. Empty memory does not break matching and preserves exact deterministic scores', async () => {
    // Donation from an unknown organizer with an unrecorded NGO
    const freshListing = {
      ...sampleListing,
      organizerId: '659999999999999999999888' // fresh ID
    };

    const rawMatches = match(freshListing, ngos);
    const enriched = await enrichMatchesWithMemory(freshListing, rawMatches, { enabled: true });

    expect(enriched.length).toBe(rawMatches.length);
    for (let i = 0; i < rawMatches.length; i++) {
      expect(enriched[i].feasible).toBe(rawMatches[i].feasible);
      expect(enriched[i].matchType).toBe(rawMatches[i].matchType);
      expect(enriched[i].baseScore).toBe(rawMatches[i].score);
    }
  });

  it('5. The recommendation explanation references actual retrieved evidence and distinguishes facts from inferred patterns', async () => {
    const ngoA = ngos.find(n => n.name.includes('NGO A'));
    expect(ngoA).toBeDefined();

    // Verify evidence is present in match response
    const res = await request(app).get(`/api/listings/${sampleListing._id}/matches?memory=true`);
    expect(res.status).toBe(200);

    const matchA = res.body.find(m => m.ngoId === String(ngoA._id));
    expect(matchA).toBeDefined();

    if (matchA.memoryInsights.hasHistory) {
      // 1. Must contain recorded facts array
      expect(Array.isArray(matchA.memoryInsights.facts)).toBe(true);
      expect(matchA.memoryInsights.facts.length).toBeGreaterThan(0);

      // 2. Facts must have valid text
      const firstFact = matchA.memoryInsights.facts[0];
      expect(firstFact).toHaveProperty('text');
      expect(firstFact.text.length).toBeGreaterThan(10);

      // 3. Explanation must cite evidence
      expect(matchA.memoryInsights.explanation).toContain('Historical evidence:');

      // 4. Inferred pattern must be explicitly separated from raw facts
      expect(typeof matchA.memoryInsights.inferredPattern).toBe('string');
      expect(matchA.memoryInsights.inferredPattern).toContain('track record');
    }
  }, 30000);
});
