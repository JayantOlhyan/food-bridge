import 'dotenv/config';
import { describe, it, expect, beforeEach } from 'vitest';
import {
  askPruneCopilot,
  optimizeListingWithPrune,
  getPruneMetrics,
  clearPruneCache
} from '../services/prune.js';

describe('FoodBridge Prune AI Gateway Service', () => {
  beforeEach(() => {
    clearPruneCache();
  });

  it('1. Initializes with Prune AI Gateway configuration', () => {
    const metrics = getPruneMetrics();
    expect(metrics.gateway).toBe('Prune AI Gateway');
    expect(metrics.baseUrl).toContain('withprune.com');
  });

  it('2. Successfully generates dispatch responses with verifiable receipts', async () => {
    const res = await askPruneCopilot('Which NGOs have capacity for 100 meals in Delhi?');
    expect(res).toHaveProperty('answer');
    expect(res.answer).toContain('FoodBridge Dispatch');
    expect(res).toHaveProperty('tokensSaved');
    expect(res.tokensSaved).toBeGreaterThan(0);
    expect(res.receipt.receiptId).toMatch(/^prune_rcpt_/);
  });

  it('3. Answers safe food handling guidelines accurately', async () => {
    const res = await askPruneCopilot('What is the safe holding deadline for hot-held food?');
    expect(res.answer).toContain('Hot-Held Meals');
    expect(res.answer).toContain('4 hours');
  });

  it('4. Provides environmental carbon offset calculations', async () => {
    const res = await askPruneCopilot('What is the carbon emission factor for rescued meals?');
    expect(res.answer).toContain('CO₂');
  });

  it('5. Optimizes logistics for refrigerated and large batch listings', async () => {
    const listing = {
      _id: '507f1f77bcf86cd799439012',
      eventName: 'Cold Salad Buffet Surplus',
      quantityMeals: 80,
      holdingCondition: 'refrigerated'
    };

    const optimization = await optimizeListingWithPrune(listing);
    expect(optimization.safetyRating).toBe('Temperature-Sensitive');
    expect(optimization.logisticsAdvice).toContain('insulated carriers');
    expect(optimization.receipt.tokensSaved).toBeGreaterThan(0);
  });
});
