import { describe, expect, it } from 'vitest';
import { buildFallbackResponse, validateAIResponse } from '../src/ai.js';

describe('ai fallbacks', () => {
  it('routes fire incidents to fire and police teams', () => {
    const result = buildFallbackResponse('There is smoke and fire in gate A');
    expect(result.intent).toBe('fire');
    expect(result.teams).toEqual(['fire', 'police']);
    expect(result.isCritical).toBe(true);
  });

  it('maps navigation requests to a low severity guidance response', () => {
    const result = buildFallbackResponse('Where is the nearest exit?');
    expect(result.intent).toBe('navigation');
    expect(result.severity).toBe('low');
  });

  it('normalizes malformed AI responses', () => {
    const normalized = validateAIResponse({
      intent: 'wildcard',
      teams: ['medical', 'unknown'],
      response: 42,
    });

    expect(normalized.intent).toBe('crowd');
    expect(normalized.teams).toEqual(['medical']);
    expect(normalized.response).toBe('Alert processed.');
  });
});
