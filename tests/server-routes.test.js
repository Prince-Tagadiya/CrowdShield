import { describe, expect, it } from 'vitest';
import { app } from '../server.js';

function getRouteStack(method, path) {
  const layer = app._router.stack.find(candidate =>
    candidate.route
    && candidate.route.path === path
    && candidate.route.methods?.[method],
  );

  if (!layer) {
    throw new Error(`Route not found: ${method.toUpperCase()} ${path}`);
  }

  return layer.route.stack.map(entry => entry.handle);
}

function createMockResponse() {
  const headers = {};
  const response = {
    statusCode: 200,
    body: undefined,
    headers,
    finished: false,
    locals: {},
    setHeader(name, value) {
      headers[name.toLowerCase()] = value;
    },
    getHeader(name) {
      return headers[name.toLowerCase()];
    },
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      this.finished = true;
      return this;
    },
  };

  return response;
}

async function invokeRoute(method, path, overrides = {}) {
  const handlers = getRouteStack(method, path);
  const req = {
    method: method.toUpperCase(),
    path,
    originalUrl: path,
    app,
    headers: {},
    ip: '127.0.0.1',
    body: {},
    get(name) {
      return this.headers[name.toLowerCase()];
    },
    ...overrides,
  };
  const res = createMockResponse();
  let index = 0;

  const dispatch = async (error) => {
    if (error) throw error;
    const handler = handlers[index++];
    if (!handler || res.finished) return;

    await new Promise((resolve, reject) => {
      const next = (nextError) => {
        if (nextError) reject(nextError);
        else resolve(dispatch());
      };

      try {
        const result = handler(req, res, next);
        if (result && typeof result.then === 'function') {
          result.then(() => {
            if (!res.finished && handler.length < 3) {
              resolve(dispatch());
            } else {
              resolve();
            }
          }).catch(reject);
        } else if (handler.length < 3 && !res.finished) {
          resolve(dispatch());
        } else if (res.finished) {
          resolve();
        }
      } catch (handlerError) {
        reject(handlerError);
      }
    });
  };

  await dispatch();
  return res;
}

describe('server routes', () => {
  it('returns health metadata', async () => {
    const response = await invokeRoute('get', '/api/health');

    expect(response.statusCode).toBe(200);
    expect(response.body.ok).toBe(true);
    expect(response.body.service).toBe('crowdshield');
    expect(response.body.aiProvider).toBeTruthy();
  });

  it('returns runtime config safely', async () => {
    const response = await invokeRoute('get', '/api/config');

    expect(response.statusCode).toBe(200);
    expect(response.body).toHaveProperty('hasFirebase');
    expect(response.body).toHaveProperty('hasGemini');
    expect(response.body).toHaveProperty('hasGoogleMaps');
    expect(typeof response.body.mapsApiKey).toBe('string');
    expect(response.getHeader('cache-control')).toBe('public, max-age=300');
  });

  it('rejects invalid ai payloads', async () => {
    const response = await invokeRoute('post', '/api/ai/process', {
      body: { userInput: '' },
    });

    expect(response.statusCode).toBe(400);
    expect(response.body.error).toBe('Invalid AI request payload');
  });
});
