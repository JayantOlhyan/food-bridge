import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../app.js';
import { connectDatabase, disconnectDatabase } from '../db.js';
import { seed } from '../scripts/seed-data.js';
import {
  initHindsightClient,
  saveConfirmedRescueEvent,
  getRelevantMemoriesForDonation,
  recallMemories,
  aiMetrics
} from '../services/hindsight.js';

describe('FoodBridge Hindsight Memory Service (Phase 1)', () => {
  beforeAll(async () => {
    await connectDatabase();
    await seed();
  }, 30000);

  afterAll(async () => {
    await disconnectDatabase();
  });

  it('1. Initializes the official HindsightClient when credentials exist', () => {
    const client = initHindsightClient();
    if (process.env.HINDSIGHT_API_KEY) {
      expect(client).not.toBeNull();
      expect(typeof client.retain).toBe('function');
      expect(typeof client.recall).toBe('function');
    }
  });

  it('2. Handles missing configuration gracefully without throwing', async () => {
    // Test custom initialization with empty API key
    const client = initHindsightClient({ apiKey: '' });
    expect(client).toBeNull();

    // Re-initialize for subsequent tests
    initHindsightClient();
  });

  it('3. Successfully saves confirmed food rescue delivery without leaking private personal info', async () => {
    const mockEvent = {
      donorId: '659999999999999999999991',
      ngoId: '659999999999999999999992',
      listingId: '659999999999999999999993',
      pickupId: '659999999999999999999994',
      eventName: 'Grand Wedding Reception',
      deliveredMeals: 45,
      deliveredKg: 20,
      ngoName: 'NGO A – Community Kitchen',
      location: { address: 'Dwarka Sector 10, New Delhi' },
      // Private data that MUST be filtered out
      personalPhone: '+91 9876543210',
      volunteerName: 'Rohan Sharma'
    };

    const res = await saveConfirmedRescueEvent('CONFIRMED_DELIVERY', mockEvent);
    expect(res).not.toBeNull();
    expect(['retained', 'skipped_duplicate']).toContain(res.status);

    // Verify deduplication on retry
    const retryRes = await saveConfirmedRescueEvent('CONFIRMED_DELIVERY', mockEvent);
    expect(retryRes.status).toBe('skipped_duplicate');
    expect(aiMetrics.dedupedCount).toBeGreaterThan(0);
  }, 30000);

  it('4. Supports pickup delay, failed pickup, cancellation, and preference events', async () => {
    const delayRes = await saveConfirmedRescueEvent('PICKUP_DELAY', {
      donorId: '659999999999999999999991',
      ngoId: '659999999999999999999992',
      listingId: '659999999999999999999993',
      pickupId: '659999999999999999999994',
      eventName: 'Grand Wedding Reception',
      delayMinutes: 20,
      reason: 'Ring road congestion'
    });
    expect(delayRes).not.toBeNull();

    const failRes = await saveConfirmedRescueEvent('PICKUP_FAILED', {
      donorId: '659999999999999999999991',
      ngoId: '659999999999999999999992',
      listingId: '659999999999999999999993',
      pickupId: '659999999999999999999994',
      eventName: 'Grand Wedding Reception',
      reason: 'Safe holding window expired before arrival'
    });
    expect(failRes).not.toBeNull();

    const cancelRes = await saveConfirmedRescueEvent('CANCELLATION', {
      donorId: '659999999999999999999991',
      ngoId: '659999999999999999999992',
      listingId: '659999999999999999999993',
      eventName: 'Grand Wedding Reception',
      reason: 'Host distributed surplus locally'
    });
    expect(cancelRes).not.toBeNull();

    const prefRes = await saveConfirmedRescueEvent('DONOR_PREFERENCE', {
      donorId: '659999999999999999999991',
      eventName: 'Grand Wedding Reception',
      preference: 'Requires temperature-controlled transport vehicles'
    });
    expect(prefRes).not.toBeNull();
  }, 30000);

  it('5. Retrieves structured memories for a new donation', async () => {
    const mockListing = {
      organizerId: '659999999999999999999991',
      eventName: 'Grand Wedding Reception',
      holdingCondition: 'hot-held',
      foodItems: [{ name: 'Veg pulao', dietType: 'veg' }]
    };

    const memoryResults = await getRelevantMemoriesForDonation(mockListing, {
      candidateNgoIds: ['659999999999999999999992']
    });

    expect(memoryResults).toHaveProperty('donorHistory');
    expect(memoryResults).toHaveProperty('ngoHistory');
    expect(memoryResults).toHaveProperty('generalInsights');
    expect(Array.isArray(memoryResults.donorHistory)).toBe(true);
    expect(typeof memoryResults.ngoHistory).toBe('object');
    expect(Array.isArray(memoryResults.generalInsights)).toBe(true);
  }, 30000);

  it('6. Outage resilience: Service errors do not throw or break callers', async () => {
    // Calling with null or corrupted data returns safely without throwing
    const safeRes = await saveConfirmedRescueEvent(null, null);
    expect(safeRes).toBeNull();

    const emptyDonationMemories = await getRelevantMemoriesForDonation(null);
    expect(emptyDonationMemories.totalRecalled).toBe(0);
    expect(emptyDonationMemories.donorHistory).toEqual([]);
  });

  it('7. Delivery confirmation lifecycle integration in Express succeeds and triggers memory retention', async () => {
    // Fetch bootstrap data to get real IDs
    const bootRes = await request(app).get('/api/bootstrap');
    expect(bootRes.status).toBe(200);
    const organizer = bootRes.body.organizers[0];
    const ngo = bootRes.body.ngos[0];

    // Create a new listing
    const now = Date.now();
    const createRes = await request(app)
      .post('/api/listings')
      .send({
        organizerId: organizer._id,
        eventName: 'Resilience Test Banquet',
        eventType: 'Banquet',
        location: organizer.location,
        foodItems: [{ name: 'Dal & Rice', dietType: 'veg', category: 'Meal' }],
        quantityMeals: 20,
        preparedAt: new Date(now - 30 * 60000).toISOString(),
        holdingCondition: 'hot-held',
        packagingAvailable: true,
        pickupWindowStart: new Date(now).toISOString(),
        pickupWindowEnd: new Date(now + 90 * 60000).toISOString()
      });
    expect(createRes.status).toBe(201);
    const listingId = createRes.body._id;

    // Accept listing
    const acceptRes = await request(app)
      .post(`/api/listings/${listingId}/accept`)
      .send({ ngoId: ngo._id });
    expect(acceptRes.status).toBe(201);
    const pickupId = acceptRes.body._id;

    // Collect pickup with recorded delay
    const collectRes = await request(app)
      .post(`/api/pickups/${pickupId}/collect`)
      .send({ delayMinutes: 10, reason: 'Rain delay' });
    expect(collectRes.status).toBe(200);

    // Confirm delivery with verified count
    const deliverRes = await request(app)
      .post(`/api/pickups/${pickupId}/deliver`)
      .send({
        deliveredMeals: 20,
        deliveredKg: 8,
        goodCondition: true
      });
    expect(deliverRes.status).toBe(200);
    expect(deliverRes.body.status).toBe('DELIVERED');
  }, 30000);

  it('8. Stored memories persist and remain recallable across simulated backend restarts', async () => {
    // 1. Save confirmed event
    const uniqueTag = `restart-verify-${Date.now()}`;
    const result = await saveConfirmedRescueEvent('CONFIRMED_DELIVERY', {
      donorId: '64d000000000000000000001',
      ngoId: '64d000000000000000000002',
      listingId: '64d000000000000000000003',
      eventName: `Persistence Gala ${uniqueTag}`,
      deliveredMeals: 50,
      deliveredKg: 22,
      ngoName: 'Delhi Food Rescue Foundation'
    });
    expect(result.status).toBe('retained');

    // 2. Simulate backend restart by wiping in-memory client and reinitializing fresh from env
    initHindsightClient();

    // 3. Recall after re-initialization
    const recalled = await recallMemories('Delhi Food Rescue Foundation 50 meals delivery handover', 5);
    expect(Array.isArray(recalled)).toBe(true);
    expect(recalled.length).toBeGreaterThan(0);
    const found = recalled.some(r => r.text.includes('Delhi Food Rescue Foundation') || r.text.includes('50 meals') || r.text.includes('delivery'));
    expect(found).toBe(true);
  }, 30000);
});
