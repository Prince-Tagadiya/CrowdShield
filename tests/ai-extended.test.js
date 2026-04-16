import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { buildFallbackResponse, processAIInput, validateAIResponse } from '../src/ai.js';

describe('ai module extended coverage', () => {
  beforeEach(() => {
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it.each([
    ['fire in stand a', 'fire', true, ['fire', 'police']],
    ['smoke near gate b', 'fire', true, ['fire', 'police']],
    ['someone fainted', 'medical', true, ['medical']],
    ['injured person bleeding', 'medical', true, ['medical']],
    ['lost child', 'lost_found', false, ['police']],
    ['crowd pushing near entry', 'crowd', true, ['police']],
    ['where is the nearest exit', 'navigation', false, ['police']],
    ['best food stall', 'navigation', false, ['police']],
    ['closest washroom', 'navigation', false, ['police']],
    ['', 'crowd', false, ['police']],
  ])('fallback parses "%s"', (input, intent, critical, teams) => {
    const result = buildFallbackResponse(input);
    expect(result.intent).toBe(intent);
    expect(result.isCritical).toBe(critical);
    expect(result.teams).toEqual(teams);
  });

  it.each([
    [{ intent: 'fire', location: 'Gate A', severity: 'high', actions: ['dispatch_fire'], teams: ['fire', 'police'], response: 'Go', isCritical: true }, 'fire', 'Gate A', 'high', ['fire', 'police'], true],
    [{ intent: 'invalid', location: 3, severity: 'extreme', actions: 'x', teams: ['medical', 'x'], response: 3, isCritical: 'yes' }, 'crowd', 'Unknown Area', 'medium', ['medical'], false],
    [{}, 'crowd', 'Unknown Area', 'medium', ['police'], false],
  ])('normalizes responses', (raw, intent, location, severity, teams, critical) => {
    const result = validateAIResponse(raw);
    expect(result.intent).toBe(intent);
    expect(result.location).toBe(location);
    expect(result.severity).toBe(severity);
    expect(result.teams).toEqual(teams);
    expect(result.isCritical).toBe(critical);
  });

  it('returns local fallback for empty input', async () => {
    const result = await processAIInput('', {});
    expect(result.intent).toBe('crowd');
  });

  it('sends sanitized input to the backend', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ intent: 'navigation', teams: ['police'], response: 'ok' }),
    });

    await processAIInput('<fire>{test}', { role: 'admin' });
    const [, options] = global.fetch.mock.calls[0];
    const payload = JSON.parse(options.body);
    expect(payload.userInput).toBe('firetest');
    expect(payload.telemetry).toEqual({ role: 'admin' });
  });

  it('truncates oversized input before sending', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ intent: 'navigation', teams: ['police'], response: 'ok' }),
    });

    const large = 'a'.repeat(700);
    await processAIInput(large, {});
    const [, options] = global.fetch.mock.calls[0];
    const payload = JSON.parse(options.body);
    expect(payload.userInput.length).toBe(500);
  });

  it('falls back when backend returns non-ok status', async () => {
    global.fetch.mockResolvedValueOnce({ ok: false, status: 500 });
    const result = await processAIInput('fire at gate', {});
    expect(result.intent).toBe('fire');
    expect(result.response).toContain('offline fallback');
  });

  it('falls back when fetch throws', async () => {
    global.fetch.mockRejectedValueOnce(new Error('network'));
    const result = await processAIInput('medical help', {});
    expect(result.intent).toBe('medical');
  });

  it('returns normalized backend response', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ intent: 'invalid', teams: ['police', 'bad'] }),
    });
    const result = await processAIInput('route me', {});
    expect(result.intent).toBe('crowd');
    expect(result.teams).toEqual(['police']);
  });
});
