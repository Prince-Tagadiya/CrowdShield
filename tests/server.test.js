import { describe, expect, it } from 'vitest';
import { aiRequestSchema, buildFallbackResponse, validateAIResponse, requireRole } from '../server.js';

describe('server validation', () => {
  it('accepts valid AI request payloads', () => {
    const result = aiRequestSchema.safeParse({
      userInput: 'Medical emergency near Gate A',
      telemetry: {
        role: 'admin',
        alertCount: 2,
        gates: [{ id: 'ga', name: 'Gate A', level: 'med', wait: 9, dist: 100 }],
      },
    });

    expect(result.success).toBe(true);
  });

  it('rejects oversized prompts', () => {
    const result = aiRequestSchema.safeParse({
      userInput: 'x'.repeat(501),
    });

    expect(result.success).toBe(false);
  });

  it('keeps server fallback deterministic', () => {
    expect(buildFallbackResponse('Lost child near west wing').intent).toBe('lost_found');
    expect(validateAIResponse({ teams: ['fire', 'x'] }).teams).toEqual(['fire']);
  });

  it('allows admin role through role middleware', () => {
    const req = { user: { role: 'admin' } };
    const res = { status: () => ({ json: () => null }) };
    let called = false;
    requireRole('admin')(req, res, () => { called = true; });
    expect(called).toBe(true);
  });

  it('blocks non-admin users from admin middleware', () => {
    const req = { user: { role: 'attendee' } };
    const result = {};
    const res = {
      status(code) {
        result.code = code;
        return {
          json(payload) {
            result.payload = payload;
          },
        };
      },
    };

    requireRole('admin')(req, res, () => {});
    expect(result.code).toBe(403);
    expect(result.payload.error).toBe('Insufficient role');
  });
});
