import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { app } from '../server.js';

describe('server routes', () => {
  it('returns health metadata and a request id', async () => {
    const response = await request(app).get('/api/health');

    expect(response.status).toBe(200);
    expect(response.body.ok).toBe(true);
    expect(response.body.service).toBe('crowdshield');
    expect(response.headers['x-request-id']).toBeTruthy();
  });

  it('returns runtime config safely', async () => {
    const response = await request(app).get('/api/config');

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('hasFirebase');
    expect(response.body).toHaveProperty('hasGemini');
    expect(response.body).toHaveProperty('hasGoogleMaps');
    expect(typeof response.body.mapsApiKey).toBe('string');
  });

  it('rejects invalid ai payloads', async () => {
    const response = await request(app)
      .post('/api/ai/process')
      .send({ userInput: '' });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('Invalid AI request payload');
  });
});
