import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { connectDatabase, disconnectDatabase } from '../db.js';
import { seed } from '../scripts/seed-data.js';
import { app } from '../app.js';
import { Organizer, Ngo, Listing, Notification } from '../models.js';

describe('FoodBridge Express API & State Machine', () => {
  let organizerId;
  let ngoAId;
  let ngoBId;

  beforeAll(async () => {
    await connectDatabase();
    await seed();
    const org = await Organizer.findOne();
    organizerId = String(org._id);
    const ngos = await Ngo.find().sort({ name: 1 });
    ngoAId = String(ngos.find(n => n.name.includes('NGO A'))._id);
    ngoBId = String(ngos.find(n => n.name.includes('NGO B'))._id);
  }, 30000);

  afterAll(async () => {
    await disconnectDatabase();
  });

  it('GET /api/bootstrap returns organizers, ngos, config, and demo flags', async () => {
    const res = await request(app).get('/api/bootstrap');
    expect(res.status).toBe(200);
    expect(res.body.organizers.length).toBeGreaterThan(0);
    expect(res.body.ngos.length).toBeGreaterThan(0);
    expect(res.body.config).toBeDefined();
    expect(res.body.demoMode).toBe(true);
  });

  it('POST /api/listings creates an eligible listing and sends alerts to feasible NGOs', async () => {
    const now = Date.now();
    const payload = {
      organizerId,
      eventName: 'Grand Banquet Dinner',
      eventType: 'Banquet',
      location: { lat: 28.592, lng: 77.046, address: 'Dwarka Sector 10' },
      foodItems: [{ name: 'Shahi Paneer and Naan', dietType: 'veg', category: 'Prepared meal' }],
      quantityMeals: 30,
      quantityKg: 12,
      preparedAt: new Date(now - 30 * 60000).toISOString(),
      holdingCondition: 'hot-held',
      packagingAvailable: true,
      pickupWindowStart: new Date(now).toISOString(),
      pickupWindowEnd: new Date(now + 120 * 60000).toISOString(),
      notes: 'Freshly packed'
    };

    const res = await request(app).post('/api/listings').send(payload);
    expect(res.status).toBe(201);
    expect(res.body.status).toBe('POSTED');
    expect(res.body.eligibility.eligible).toBe(true);

    // Verify simulated notifications were generated for NGOs
    const notifications = await Notification.find({ listingId: res.body._id });
    expect(notifications.length).toBeGreaterThan(0);
  });

  it('POST /api/listings with past deadline creates an INELIGIBLE listing', async () => {
    const now = Date.now();
    const payload = {
      organizerId,
      eventName: 'Yesterday Leftovers',
      eventType: 'Wedding',
      location: { lat: 28.592, lng: 77.046, address: 'Dwarka Sector 10' },
      foodItems: [{ name: 'Rice and Curry', dietType: 'veg', category: 'Prepared meal' }],
      quantityMeals: 20,
      preparedAt: new Date(now - 10 * 3600000).toISOString(),
      holdingCondition: 'hot-held',
      packagingAvailable: true,
      pickupWindowStart: new Date(now - 8 * 3600000).toISOString(),
      pickupWindowEnd: new Date(now - 6 * 3600000).toISOString()
    };

    const res = await request(app).post('/api/listings').send(payload);
    expect(res.status).toBe(201);
    expect(res.body.status).toBe('INELIGIBLE');
    expect(res.body.eligibility.eligible).toBe(false);
    expect(res.body.eligibility.reasons).toContain('Safe collection deadline has expired.');
  });

  it('GET /api/ngo/:ngoId/feed only returns eligible POSTED listings feasible for the NGO', async () => {
    const res = await request(app).get(`/api/ngo/${ngoAId}/feed`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    // Every listing in the feed must be POSTED and feasible
    for (const item of res.body) {
      expect(item.status).toBe('POSTED');
      expect(item.match.feasible).toBe(true);
      expect(['High', 'Medium', 'Low']).toContain(item.urgency);
    }
  });

  it('Atomic accept: prevents double accept with 409 conflict', async () => {
    // Find the Sample Wedding Reception listing (40 meals)
    const listing = await Listing.findOne({ eventName: 'Sample Wedding Reception', status: 'POSTED' });
    expect(listing).toBeDefined();

    const ngoA = await Ngo.findById(ngoAId);
    const initialCapacityA = ngoA.remainingCapacityMeals;

    // 1st Accept by NGO A (has 50 capacity) -> SUCCESS
    const res1 = await request(app)
      .post(`/api/listings/${listing._id}/accept`)
      .send({ ngoId: ngoAId });
    expect(res1.status).toBe(201);
    expect(res1.body.status).toBe('ACCEPTED');

    // Verify NGO A capacity was decremented by 40
    const updatedNgoA = await Ngo.findById(ngoAId);
    expect(updatedNgoA.remainingCapacityMeals).toBe(initialCapacityA - 40);

    // 2nd Accept attempt on the SAME listing by NGO B -> MUST FAIL with 409
    const res2 = await request(app)
      .post(`/api/listings/${listing._id}/accept`)
      .send({ ngoId: ngoBId });
    expect(res2.status).toBe(409);
    expect(res2.body.error).toMatch(/Already accepted by another NGO/);
  });

  it('State machine: enforces POSTED → ACCEPTED → COLLECTED → DELIVERED', async () => {
    // Find an NGO with sufficient capacity and 24h availability (e.g., NGO D or E)
    const bigNgo = await Ngo.findOne({ availableFrom: '00:00', remainingCapacityMeals: { $gte: 20 }, active: true });
    expect(bigNgo).toBeDefined();
    const bigNgoId = String(bigNgo._id);

    // Create a fresh listing for full lifecycle testing
    const now = Date.now();
    const createRes = await request(app).post('/api/listings').send({
      organizerId,
      eventName: 'Lifecycle Test Banquet',
      eventType: 'Banquet',
      location: { lat: 28.592, lng: 77.046, address: 'Dwarka Sector 10' },
      foodItems: [{ name: 'Thali', dietType: 'veg', category: 'Prepared meal' }],
      quantityMeals: 15,
      quantityKg: 6,
      preparedAt: new Date(now - 20 * 60000).toISOString(),
      holdingCondition: 'hot-held',
      packagingAvailable: true,
      pickupWindowStart: new Date(now).toISOString(),
      pickupWindowEnd: new Date(now + 120 * 60000).toISOString()
    });
    const listingId = createRes.body._id;

    // 1. Accept
    const acceptRes = await request(app)
      .post(`/api/listings/${listingId}/accept`)
      .send({ ngoId: bigNgoId });
    expect(acceptRes.status).toBe(201);
    const pickupId = acceptRes.body._id;

    // Invalid transition: Try to DELIVER before COLLECTING -> 409
    const prematureDeliver = await request(app)
      .post(`/api/pickups/${pickupId}/deliver`)
      .send({ deliveredMeals: 15, goodCondition: true });
    expect(prematureDeliver.status).toBe(409);
    expect(prematureDeliver.body.error).toContain('Only a collected pickup can be delivered');

    // 2. Collect
    const collectRes = await request(app).post(`/api/pickups/${pickupId}/collect`);
    expect(collectRes.status).toBe(200);
    expect(collectRes.body.status).toBe('COLLECTED');

    // Invalid transition: Try to COLLECT again -> 409
    const doubleCollect = await request(app).post(`/api/pickups/${pickupId}/collect`);
    expect(doubleCollect.status).toBe(409);

    // Invalid delivery: Try to deliver more meals than listed -> 400
    const overDeliver = await request(app)
      .post(`/api/pickups/${pickupId}/deliver`)
      .send({ deliveredMeals: 25, goodCondition: true });
    expect(overDeliver.status).toBe(400);

    // 3. Deliver successfully with confirmed meals & kg
    const deliverRes = await request(app)
      .post(`/api/pickups/${pickupId}/deliver`)
      .send({ deliveredMeals: 15, deliveredKg: 6, goodCondition: true });
    expect(deliverRes.status).toBe(200);
    expect(deliverRes.body.status).toBe('DELIVERED');
    expect(deliverRes.body.deliveredMeals).toBe(15);
    expect(deliverRes.body.deliveredKg).toBe(6);

    // Verify listing status is now DELIVERED
    const finalListing = await Listing.findById(listingId);
    expect(finalListing.status).toBe('DELIVERED');
  });

  it('Cancel listing restores NGO capacity', async () => {
    const now = Date.now();
    const createRes = await request(app).post('/api/listings').send({
      organizerId,
      eventName: 'Cancel Test Banquet',
      eventType: 'Banquet',
      location: { lat: 28.592, lng: 77.046, address: 'Dwarka Sector 10' },
      foodItems: [{ name: 'Buffet', dietType: 'veg', category: 'Prepared meal' }],
      quantityMeals: 10,
      preparedAt: new Date(now - 20 * 60000).toISOString(),
      holdingCondition: 'hot-held',
      packagingAvailable: true,
      pickupWindowStart: new Date(now).toISOString(),
      pickupWindowEnd: new Date(now + 120 * 60000).toISOString()
    });
    const listingId = createRes.body._id;

    // Accept by NGO A
    const ngoABefore = await Ngo.findById(ngoAId);
    const capBefore = ngoABefore.remainingCapacityMeals;

    await request(app).post(`/api/listings/${listingId}/accept`).send({ ngoId: ngoAId });
    const ngoAAfterAccept = await Ngo.findById(ngoAId);
    expect(ngoAAfterAccept.remainingCapacityMeals).toBe(capBefore - 10);

    // Cancel listing
    const cancelRes = await request(app).post(`/api/listings/${listingId}/cancel`);
    expect(cancelRes.status).toBe(200);

    // Capacity must be restored
    const ngoAAfterCancel = await Ngo.findById(ngoAId);
    expect(ngoAAfterCancel.remainingCapacityMeals).toBe(capBefore);

    // Listing must be CANCELLED
    const cancelledListing = await Listing.findById(listingId);
    expect(cancelledListing.status).toBe('CANCELLED');
  });

  it('GET /api/impact returns real confirmed totals and CO2e calculation', async () => {
    const res = await request(app).get('/api/impact?all=true');
    expect(res.status).toBe(200);
    expect(res.body.meals).toBeGreaterThan(0);
    expect(res.body.deliveries).toBeGreaterThan(0);
    expect(res.body.factor).toBe(2.5);
    expect(res.body.co2).toBe(res.body.kg * 2.5);
    expect(Array.isArray(res.body.history)).toBe(true);
    expect(Array.isArray(res.body.recent)).toBe(true);
  });

  it('POST /api/demo/reset re-seeds the database when DEMO_MODE=true', async () => {
    const res = await request(app).post('/api/demo/reset');
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);

    // Verify sample wedding reception is back in POSTED status
    const reception = await Listing.findOne({ eventName: 'Sample Wedding Reception' });
    expect(reception.status).toBe('POSTED');
  });
});
