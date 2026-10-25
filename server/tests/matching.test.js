import { describe, it, expect } from 'vitest';
import { haversineKm, eligibility, match, urgency } from '../services/matching.js';
import { config } from '../config.js';

describe('FoodBridge Safety Filter & Matching Engine', () => {
  const baseLocation = { lat: 28.592, lng: 77.046, address: 'Sample venue, Dwarka, New Delhi' };

  const validListing = (overrides = {}) => {
    const now = new Date('2026-10-25T12:00:00.000Z');
    return {
      eventName: 'Sample Wedding Reception',
      eventType: 'Wedding',
      location: baseLocation,
      foodItems: [{ name: 'Veg pulao, dal makhani, paneer butter masala, roti', dietType: 'veg', category: 'Prepared meal' }],
      quantityMeals: 40,
      quantityKg: 18,
      preparedAt: new Date(now.getTime() - 60 * 60000).toISOString(), // prepared 1h ago
      holdingCondition: 'hot-held',
      packagingAvailable: true,
      pickupWindowStart: new Date(now.getTime() - 15 * 60000).toISOString(),
      pickupWindowEnd: new Date(now.getTime() + 120 * 60000).toISOString(), // 2h window
      notes: 'Packed in sealed containers',
      ...overrides
    };
  };

  const sampleNgos = () => [
    {
      _id: 'ngo-a',
      name: 'NGO A – Community Kitchen',
      location: { lat: baseLocation.lat + 0.017986, lng: baseLocation.lng, address: 'Mock Delhi A' }, // ~2.0 km
      dailyCapacityMeals: 50,
      remainingCapacityMeals: 50,
      acceptsVeg: true,
      acceptsNonVeg: true,
      availableFrom: '00:00',
      availableTo: '23:59',
      hasVehicle: true,
      active: true
    },
    {
      _id: 'ngo-b',
      name: 'NGO B – Seva Kitchen',
      location: { lat: baseLocation.lat + 0.008993, lng: baseLocation.lng, address: 'Mock Delhi B' }, // ~1.0 km
      dailyCapacityMeals: 10,
      remainingCapacityMeals: 10,
      acceptsVeg: true,
      acceptsNonVeg: false,
      availableFrom: '00:00',
      availableTo: '23:59',
      hasVehicle: true,
      active: true
    }
  ];

  it('1. The 40-meal scenario: NGO A (2 km, 50 cap) is a feasible full match ranked above NGO B (1 km, 10 cap), which is partial', () => {
    const now = new Date('2026-10-25T12:00:00.000Z');
    const listing = validListing();
    const ngos = sampleNgos();

    const results = match(listing, ngos, now, config);

    expect(results).toHaveLength(2);

    // NGO A must be rank 1 (Full match)
    const [first, second] = results;
    expect(first.ngoId).toBe('ngo-a');
    expect(first.matchType).toBe('Full match');
    expect(first.feasible).toBe(true);
    expect(first.distanceKm).toBeCloseTo(2.0, 1);
    expect(first.score).toBeGreaterThan(0);
    expect(first.reasons.some(r => r.includes('Capacity 50 ≥ 40 needed'))).toBe(true);

    // NGO B must be rank 2 (Partial)
    expect(second.ngoId).toBe('ngo-b');
    expect(second.matchType).toBe('Partial');
    expect(second.feasible).toBe(true);
    expect(second.distanceKm).toBeCloseTo(1.0, 1);
    expect(second.reasons.some(r => r.includes('Partial — can accept 10 of 40 meals'))).toBe(true);
  });

  it('2. An expired listing → ineligible with a reason', () => {
    const now = new Date('2026-10-25T12:00:00.000Z');
    // Prepared 6 hours ago with 4 hour hot-held hold -> safe deadline passed 2 hours ago
    const expiredListing = validListing({
      preparedAt: new Date(now.getTime() - 6 * 3600000).toISOString(),
      pickupWindowEnd: new Date(now.getTime() - 1 * 3600000).toISOString()
    });

    const check = eligibility(expiredListing, now, config);
    expect(check.eligible).toBe(false);
    expect(check.reasons).toContain('Safe collection deadline has expired.');

    // Matching engine should exclude all NGOs if listing is ineligible
    const matches = match(expiredListing, sampleNgos(), now, config);
    expect(matches.every(m => !m.feasible)).toBe(true);
    expect(matches.every(m => m.reasons.includes('Excluded: listing is not safety-eligible.'))).toBe(true);
  });

  it('3. An NGO that cannot arrive before the deadline → excluded even though it is nearest', () => {
    const now = new Date('2026-10-25T12:00:00.000Z');
    // Listing has safeDeadline in 10 minutes (pickupWindowEnd: +10 min, but minLeadMinutes requires at least 30)
    // Let's set safeDeadline in 35 minutes
    const tightListing = validListing({
      pickupWindowEnd: new Date(now.getTime() + 35 * 60000).toISOString()
    });

    // NGO Near is 1 km away, but average speed is 20 km/h with 8 min buffer -> eta = (1/20)*60 + 8 = 11 min (can arrive)
    // NGO Far is 30 km away -> eta = (30/20)*60 + 8 = 98 min (cannot arrive before 35 min deadline)
    const ngos = [
      {
        _id: 'ngo-far',
        name: 'NGO Far – Rapid Relief',
        location: { lat: baseLocation.lat + 0.3, lng: baseLocation.lng, address: 'Far Location' }, // ~33 km
        dailyCapacityMeals: 100,
        remainingCapacityMeals: 100,
        acceptsVeg: true,
        acceptsNonVeg: true,
        availableFrom: '00:00',
        availableTo: '23:59',
        hasVehicle: true,
        active: true
      }
    ];

    const results = match(tightListing, ngos, now, config);
    expect(results).toHaveLength(1);
    expect(results[0].ngoId).toBe('ngo-far');
    expect(results[0].feasible).toBe(false);
    expect(results[0].matchType).toBe('Excluded');
    expect(results[0].reasons).toContain('Excluded: cannot arrive before deadline.');
  });

  it('4. Diet mismatch excluded', () => {
    const now = new Date('2026-10-25T12:00:00.000Z');
    // Listing contains chicken biryani (non-veg)
    const nonVegListing = validListing({
      foodItems: [{ name: 'Chicken Biryani', dietType: 'non-veg', category: 'Prepared meal' }]
    });

    // NGO B does NOT accept non-veg
    const ngos = sampleNgos();
    const results = match(nonVegListing, ngos, now, config);

    const ngoB = results.find(r => r.ngoId === 'ngo-b');
    expect(ngoB).toBeDefined();
    expect(ngoB?.feasible).toBe(false);
    expect(ngoB?.matchType).toBe('Excluded');
    expect(ngoB?.reasons).toContain('Excluded: diet mismatch.');
  });

  it('5. Ties resolved deterministically', () => {
    const now = new Date('2026-10-25T12:00:00.000Z');
    const listing = validListing();

    // Two identical NGOs at the same distance, capacity, availability
    const twinNgos = [
      {
        _id: 'ngo-twin-2',
        name: 'NGO Twin B',
        location: { lat: baseLocation.lat + 0.017986, lng: baseLocation.lng, address: 'Mock Twin' },
        dailyCapacityMeals: 50,
        remainingCapacityMeals: 50,
        acceptsVeg: true,
        acceptsNonVeg: true,
        availableFrom: '00:00',
        availableTo: '23:59',
        hasVehicle: true,
        active: true
      },
      {
        _id: 'ngo-twin-1',
        name: 'NGO Twin A',
        location: { lat: baseLocation.lat + 0.017986, lng: baseLocation.lng, address: 'Mock Twin' },
        dailyCapacityMeals: 50,
        remainingCapacityMeals: 50,
        acceptsVeg: true,
        acceptsNonVeg: true,
        availableFrom: '00:00',
        availableTo: '23:59',
        hasVehicle: true,
        active: true
      }
    ];

    // Running match multiple times must always return identical order
    const run1 = match(listing, twinNgos, now, config);
    const run2 = match(listing, twinNgos, now, config);

    expect(run1.map(r => r.ngoId)).toEqual(['ngo-twin-1', 'ngo-twin-2']);
    expect(run2.map(r => r.ngoId)).toEqual(['ngo-twin-1', 'ngo-twin-2']);
  });

  it('6. Empty NGO list → empty result, no crash', () => {
    const now = new Date('2026-10-25T12:00:00.000Z');
    const listing = validListing();
    const results = match(listing, [], now, config);
    expect(results).toEqual([]);
  });

  it('7. Inactive NGO or NGO outside availability hours is excluded', () => {
    const now = new Date('2026-10-25T12:00:00.000Z');
    const listing = validListing();

    const ngos = [
      {
        _id: 'ngo-inactive',
        name: 'NGO Inactive',
        location: { lat: baseLocation.lat + 0.01, lng: baseLocation.lng, address: 'Address' },
        dailyCapacityMeals: 100,
        remainingCapacityMeals: 100,
        acceptsVeg: true,
        acceptsNonVeg: true,
        availableFrom: '00:00',
        availableTo: '23:59',
        hasVehicle: true,
        active: false
      },
      {
        _id: 'ngo-night-only',
        name: 'NGO Night Only',
        location: { lat: baseLocation.lat + 0.01, lng: baseLocation.lng, address: 'Address' },
        dailyCapacityMeals: 100,
        remainingCapacityMeals: 100,
        acceptsVeg: true,
        acceptsNonVeg: true,
        availableFrom: '02:00',
        availableTo: '03:00',
        hasVehicle: true,
        active: true
      }
    ];

    const results = match(listing, ngos, now, config);
    const inactive = results.find(r => r.ngoId === 'ngo-inactive');
    expect(inactive?.reasons).toContain('Excluded: NGO is inactive.');

    const night = results.find(r => r.ngoId === 'ngo-night-only');
    expect(night?.reasons).toContain('Excluded: outside NGO availability hours.');
  });

  it('8. Eligibility checks: future prep time, negative meals, missing fields', () => {
    const now = new Date('2026-10-25T12:00:00.000Z');

    const futurePrep = eligibility(validListing({
      preparedAt: new Date(now.getTime() + 60 * 60000).toISOString()
    }), now, config);
    expect(futurePrep.eligible).toBe(false);
    expect(futurePrep.reasons).toContain('Preparation time cannot be in the future.');

    const zeroMeals = eligibility(validListing({ quantityMeals: 0 }), now, config);
    expect(zeroMeals.eligible).toBe(false);
    expect(zeroMeals.reasons).toContain('Quantity must be greater than zero.');

    const missingEnd = eligibility(validListing({ pickupWindowEnd: 'invalid-date' }), now, config);
    expect(missingEnd.eligible).toBe(false);
    expect(missingEnd.reasons).toContain('Required listing fields are missing or invalid.');
  });

  it('9. Urgency calculator: High (<60m), Medium (<180m), Low (>=180m)', () => {
    const now = new Date('2026-10-25T12:00:00.000Z');

    expect(urgency(new Date(now.getTime() + 45 * 60000), now, config)).toBe('High');
    expect(urgency(new Date(now.getTime() + 120 * 60000), now, config)).toBe('Medium');
    expect(urgency(new Date(now.getTime() + 240 * 60000), now, config)).toBe('Low');
  });

  it('10. Haversine distance accuracy', () => {
    const p1 = { lat: 28.592, lng: 77.046 };
    const p2 = { lat: 28.592 + 0.017986, lng: 77.046 }; // approx 2 km north
    const dist = haversineKm(p1, p2);
    expect(dist).toBeCloseTo(2.0, 1);
  });
});
