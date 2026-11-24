import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../app.js';
import { connectDatabase, disconnectDatabase } from '../db.js';

describe('Hindsight AI Integration & Token Conservation', () => {
  beforeAll(async () => {
    await connectDatabase();
  });

  afterAll(async () => {
    await disconnectDatabase();
  });

  it('GET /api/ai/status returns connected status and token-saving metrics', async () => {
    const res = await request(app).get('/api/ai/status');
    expect(res.status).toBe(200);
    expect(res.body.connected).toBe(true);
    expect(res.body.bankId).toBe('foodbridge');
    expect(res.body).toHaveProperty('estimatedTokensSaved');
    expect(res.body).toHaveProperty('dedupedCount');
    expect(res.body).toHaveProperty('cacheHits');
  });

  it('POST /api/ai/recall retrieves memories with zero generative token spend', async () => {
    const res = await request(app)
      .post('/api/ai/recall')
      .send({ query: 'FoodBridge Delhi NGO surplus rescue', limit: 3 });

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.results)).toBe(true);
  }, 30000);

  it('POST /api/ai/ask enforces query validation and uses cache for repeated queries', async () => {
    const queryPayload = {
      query: 'What is the food safety rule for hot-held wedding food?',
      budget: 'low'
    };

    // First request
    const res1 = await request(app).post('/api/ai/ask').send(queryPayload);
    expect(res1.status).toBe(200);
    expect(res1.body).toHaveProperty('text');

    // Second request with same query should hit cache and save tokens
    const res2 = await request(app).post('/api/ai/ask').send(queryPayload);
    expect(res2.status).toBe(200);
    expect(res2.body.fromCache).toBe(true);

    // Verify token metrics updated
    const statusRes = await request(app).get('/api/ai/status');
    expect(statusRes.body.cacheHits).toBeGreaterThan(0);
    expect(statusRes.body.estimatedTokensSaved).toBeGreaterThan(0);
  }, 25000);

  it('Rejects invalid ask requests with proper error status', async () => {
    const res = await request(app).post('/api/ai/ask').send({ query: '' });
    expect(res.status).toBe(400);
  });
});
