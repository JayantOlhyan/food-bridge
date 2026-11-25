import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../app.js';
import { connectDatabase, disconnectDatabase } from '../db.js';
import { clearPruneCache } from '../services/prune.js';

describe('Prune AI Gateway Integration & Optimization', () => {
  beforeAll(async () => {
    await connectDatabase();
    clearPruneCache();
  });

  afterAll(async () => {
    await disconnectDatabase();
  });

  it('GET /api/ai/status returns Prune AI Gateway metrics and status', async () => {
    const res = await request(app).get('/api/ai/status');
    expect(res.status).toBe(200);
    expect(res.body.gateway).toBe('Prune AI Gateway');
    expect(res.body).toHaveProperty('tokensSaved');
    expect(res.body).toHaveProperty('cacheHits');
    expect(res.body).toHaveProperty('totalCostSavedUsd');
    expect(res.body).toHaveProperty('recentReceipts');
  });

  it('POST /api/ai/ask enforces query validation and generates signed Prune receipts', async () => {
    const queryPayload = {
      query: 'What is the food safety rule for hot-held wedding food?'
    };

    // First request
    const res1 = await request(app).post('/api/ai/ask').send(queryPayload);
    expect(res1.status).toBe(200);
    expect(res1.body).toHaveProperty('answer');
    expect(res1.body).toHaveProperty('receipt');
    expect(res1.body.receipt).toHaveProperty('receiptId');
    expect(res1.body.receipt.receiptId).toMatch(/^prune_rcpt_/);
    expect(res1.body.fromCache).toBe(false);

    // Second request with same query should hit cache and save tokens
    const res2 = await request(app).post('/api/ai/ask').send(queryPayload);
    expect(res2.status).toBe(200);
    expect(res2.body.fromCache).toBe(true);
    expect(res2.body.tokensSaved).toBeGreaterThan(0);

    // Verify status endpoint reflects cache hit
    const statusRes = await request(app).get('/api/ai/status');
    expect(statusRes.body.cacheHits).toBeGreaterThan(0);
    expect(statusRes.body.tokensSaved).toBeGreaterThan(0);
  });

  it('POST /api/ai/optimize-listing provides safe transit advice and signed receipts', async () => {
    const res = await request(app)
      .post('/api/ai/optimize-listing')
      .send({
        listing: {
          _id: '507f1f77bcf86cd799439011',
          eventName: 'Grand Banquet Surplus',
          quantityMeals: 350,
          holdingCondition: 'hot-held'
        }
      });

    expect(res.status).toBe(200);
    expect(res.body.safetyRating).toBe('Temperature-Sensitive');
    expect(res.body).toHaveProperty('recommendedVehicle');
    expect(res.body).toHaveProperty('receipt');
    expect(res.body.receipt.receiptId).toMatch(/^prune_rcpt_/);
  });

  it('Rejects invalid ask requests with proper error status', async () => {
    const res = await request(app).post('/api/ai/ask').send({ query: '' });
    expect(res.status).toBe(400);
  });
});
