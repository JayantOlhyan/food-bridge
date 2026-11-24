import { describe, it, expect, beforeEach } from 'vitest';
import {
  eligibility,
  handleDemoApi,
  haversineKm,
  urgency,
  type Listing,
  type MatchResult,
  type Ngo,
  type Organizer,
  type Pickup
} from './demoEngine';

describe('Standalone Client Demo Engine', () => {
  beforeEach(async () => {
    await handleDemoApi('/demo/reset', {});
  });

  it('computes accurate haversine distance and urgency buckets', () => {
    const dist = haversineKm({ lat: 28.6139, lng: 77.209 }, { lat: 28.6139, lng: 77.209 });
    expect(dist).toBe(0);

    const now = Date.now();
    expect(urgency(new Date(now + 30 * 60000).toISOString(), new Date(now))).toBe('High');
    expect(urgency(new Date(now + 120 * 60000).toISOString(), new Date(now))).toBe('Medium');
    expect(urgency(new Date(now + 240 * 60000).toISOString(), new Date(now))).toBe('Low');
  });

  it('rejects expired room-temperature food in safety eligibility check', () => {
    const now = Date.now();
    const result = eligibility(
      {
        preparedAt: new Date(now - 3 * 3600000).toISOString(),
        holdingCondition: 'room-temperature',
        quantityMeals: 30,
        pickupWindowStart: new Date(now).toISOString(),
        pickupWindowEnd: new Date(now + 2 * 3600000).toISOString()
      },
      new Date(now)
    );
    expect(result.eligible).toBe(false);
    expect(result.reasons.length).toBeGreaterThan(0);
  });

  it('bootstraps seeded organizers, NGOs, and completes full rescue lifecycle', async () => {
    const boot = (await handleDemoApi('/bootstrap')) as {
      organizers: Organizer[];
      ngos: Ngo[];
      demoMode: boolean;
    };
    expect(boot.organizers.length).toBeGreaterThan(0);
    expect(boot.ngos.length).toBeGreaterThanOrEqual(7);
    expect(boot.demoMode).toBe(true);

    const organizer = boot.organizers[0];
    const now = Date.now();

    const created = (await handleDemoApi('/listings', {
      organizerId: organizer._id,
      eventName: 'Client Engine Verification Banquet',
      eventType: 'Wedding',
      location: organizer.location,
      foodItems: [{ name: 'Veg Pulao & Dal', dietType: 'veg', category: 'Main' }],
      quantityMeals: 25,
      quantityKg: 10,
      preparedAt: new Date(now - 20 * 60000).toISOString(),
      holdingCondition: 'hot-held',
      packagingAvailable: true,
      pickupWindowStart: new Date(now).toISOString(),
      pickupWindowEnd: new Date(now + 120 * 60000).toISOString()
    })) as Listing;
    expect(created.status).toBe('POSTED');

    const matches = (await handleDemoApi(`/listings/${created._id}/matches`)) as MatchResult[];
    const topFull = matches.find(m => m.feasible && m.matchType === 'Full match');
    expect(topFull).toBeDefined();

    const pickup = (await handleDemoApi(`/listings/${created._id}/accept`, {
      ngoId: topFull!.ngoId
    })) as Pickup;
    expect(pickup.status).toBe('ACCEPTED');

    const collected = (await handleDemoApi(`/pickups/${pickup._id}/collect`, {})) as Pickup;
    expect(collected.status).toBe('COLLECTED');

    const delivered = (await handleDemoApi(`/pickups/${pickup._id}/deliver`, {
      deliveredMeals: 25,
      deliveredKg: 10,
      goodCondition: true
    })) as Pickup;
    expect(delivered.status).toBe('DELIVERED');

    const impact = (await handleDemoApi('/impact')) as {
      meals: number;
      kg: number;
      co2: number;
      deliveries: number;
    };
    expect(impact.meals).toBeGreaterThanOrEqual(25);
    expect(impact.co2).toBeCloseTo(impact.kg * 2.5, 4);
  });

  it('restores NGO capacity when an accepted listing is cancelled', async () => {
    const boot = (await handleDemoApi('/bootstrap')) as {
      organizers: Organizer[];
      ngos: Ngo[];
    };
    const organizer = boot.organizers[0];
    const now = Date.now();

    const created = (await handleDemoApi('/listings', {
      organizerId: organizer._id,
      eventName: 'Cancellation Capacity Test',
      eventType: 'Banquet',
      location: organizer.location,
      foodItems: [{ name: 'Paneer & Roti', dietType: 'veg', category: 'Main' }],
      quantityMeals: 15,
      preparedAt: new Date(now - 15 * 60000).toISOString(),
      holdingCondition: 'hot-held',
      packagingAvailable: true,
      pickupWindowStart: new Date(now).toISOString(),
      pickupWindowEnd: new Date(now + 120 * 60000).toISOString()
    })) as Listing;

    const matches = (await handleDemoApi(`/listings/${created._id}/matches`)) as MatchResult[];
    const chosen = matches.find(m => m.feasible && m.matchType === 'Full match')!;
    const beforeCapacity = chosen.ngo.remainingCapacityMeals;

    await handleDemoApi(`/listings/${created._id}/accept`, { ngoId: chosen.ngoId });
    const midBoot = (await handleDemoApi('/bootstrap')) as { ngos: Ngo[] };
    const afterAccept = midBoot.ngos.find(n => n._id === chosen.ngoId)!.remainingCapacityMeals;
    expect(afterAccept).toBe(beforeCapacity - 15);

    await handleDemoApi(`/listings/${created._id}/cancel`, { reason: 'Test cancellation' });
    const finalBoot = (await handleDemoApi('/bootstrap')) as { ngos: Ngo[] };
    const afterCancel = finalBoot.ngos.find(n => n._id === chosen.ngoId)!.remainingCapacityMeals;
    expect(afterCancel).toBe(beforeCapacity);
  });

  it('treats haversine distance as symmetric between two Delhi coordinates', () => {
    const a = { lat: 28.6139, lng: 77.209 };
    const b = { lat: 28.5355, lng: 77.391 };
    expect(haversineKm(a, b)).toBeCloseTo(haversineKm(b, a), 8);
    expect(haversineKm(a, b)).toBeGreaterThan(15);
  });

  it('classifies deadline exactly at 60 minutes as Medium urgency', () => {
    const now = new Date('2026-11-10T10:00:00.000Z');
    const boundary = new Date(now.getTime() + 60 * 60000).toISOString();
    expect(urgency(boundary, now)).toBe('Medium');
  });

  it('classifies deadline exactly at 180 minutes as Low urgency', () => {
    const now = new Date('2026-11-10T10:00:00.000Z');
    const boundary = new Date(now.getTime() + 180 * 60000).toISOString();
    expect(urgency(boundary, now)).toBe('Low');
  });

  it('rejects listings with zero or negative meal quantities', () => {
    const now = new Date('2026-11-10T10:00:00.000Z');
    const res = eligibility(
      {
        preparedAt: new Date(now.getTime() - 15 * 60000).toISOString(),
        holdingCondition: 'hot-held',
        quantityMeals: 0,
        pickupWindowStart: now.toISOString(),
        pickupWindowEnd: new Date(now.getTime() + 120 * 60000).toISOString()
      },
      now
    );
    expect(res.eligible).toBe(false);
  });

  it('rejects listings when pickup window ends before it begins', () => {
    const now = new Date('2026-11-10T10:00:00.000Z');
    const res = eligibility(
      {
        preparedAt: new Date(now.getTime() - 10 * 60000).toISOString(),
        holdingCondition: 'refrigerated',
        quantityMeals: 20,
        pickupWindowStart: new Date(now.getTime() + 90 * 60000).toISOString(),
        pickupWindowEnd: new Date(now.getTime() + 30 * 60000).toISOString()
      },
      now
    );
    expect(res.eligible).toBe(false);
  });

  it('accepts refrigerated surplus prepared six hours prior with sufficient window', () => {
    const now = new Date('2026-11-10T10:00:00.000Z');
    const res = eligibility(
      {
        preparedAt: new Date(now.getTime() - 6 * 3600000).toISOString(),
        holdingCondition: 'refrigerated',
        quantityMeals: 35,
        pickupWindowStart: now.toISOString(),
        pickupWindowEnd: new Date(now.getTime() + 3 * 3600000).toISOString()
      },
      now
    );
    expect(res.eligible).toBe(true);
  });

  it('accepts packaged-sealed surplus within its six-hour holding limit', () => {
    const now = new Date('2026-11-10T10:00:00.000Z');
    const res = eligibility(
      {
        preparedAt: new Date(now.getTime() - 4 * 3600000).toISOString(),
        holdingCondition: 'packaged-sealed',
        quantityMeals: 50,
        pickupWindowStart: now.toISOString(),
        pickupWindowEnd: new Date(now.getTime() + 2 * 3600000).toISOString()
      },
      now
    );
    expect(res.eligible).toBe(true);
  });

  it('returns seeded notifications and impact summary immediately after reset', async () => {
    const notifications = (await handleDemoApi('/notifications')) as unknown[];
    const impact = (await handleDemoApi('/impact')) as { meals: number; deliveries: number };
    expect(Array.isArray(notifications)).toBe(true);
    expect(impact.deliveries).toBeGreaterThanOrEqual(2);
    expect(impact.meals).toBeGreaterThan(0);
  });

  it('reports live demo AI status and responds to copilot prompts offline', async () => {
    const status = (await handleDemoApi('/ai/status')) as { connected: boolean; mode: string };
    expect(status.connected).toBe(true);
    const reply = (await handleDemoApi('/ai/copilot', { question: 'Which NGO is most reliable?' })) as {
      answer: string;
    };
    expect(reply.answer.length).toBeGreaterThan(10);
  });
});
