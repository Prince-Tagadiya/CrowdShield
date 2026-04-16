import { describe, it, expect, vi } from 'vitest';

/**
 * Tests for API validation schemas.
 * Imports the ACTUAL Zod schemas used in production routes — not re-created copies.
 * This ensures tests validate the same logic that runs in production.
 */

// Mock Firebase Admin (required because route files import it at module level)
vi.mock('../../server/src/services/firebase-admin', () => {
  const mockRef = vi.fn();
  const mockOnce = vi.fn();
  const mockUpdate = vi.fn();
  const mockSet = vi.fn();
  const mockPush = vi.fn(() => ({ key: 'test-id', set: mockSet }));

  mockRef.mockReturnValue({
    once: mockOnce,
    update: mockUpdate,
    push: mockPush,
    set: mockSet,
  });

  return {
    db: { ref: mockRef },
    auth: {
      verifyIdToken: vi.fn(),
    },
  };
});

// Mock Gemini service (imported by alerts route)
vi.mock('../../server/src/services/gemini', () => ({
  triageAlert: vi.fn(),
  chatWithContext: vi.fn(),
  generateRecommendations: vi.fn(),
}));

// Mock logger (imported by route files)
vi.mock('../../server/src/services/logger', () => ({
  logInfo: vi.fn(),
  logWarning: vi.fn(),
  logError: vi.fn(),
  logDebug: vi.fn(),
}));

// Import ACTUAL schemas from production route files
import { updateOccupancySchema, navigationSchema } from '../../server/src/routes/zones';
import { createAlertSchema } from '../../server/src/routes/alerts';
import { chatSchema } from '../../server/src/routes/ai';

describe('Zone API — Occupancy Update Schema', () => {
  it('rejects negative occupancy', () => {
    const result = updateOccupancySchema.safeParse({ currentOccupancy: -1 });
    expect(result.success).toBe(false);
  });

  it('rejects non-integer occupancy', () => {
    const result = updateOccupancySchema.safeParse({ currentOccupancy: 3.5 });
    expect(result.success).toBe(false);
  });

  it('accepts valid occupancy', () => {
    const result = updateOccupancySchema.safeParse({ currentOccupancy: 5000 });
    expect(result.success).toBe(true);
  });

  it('rejects occupancy above maximum', () => {
    const result = updateOccupancySchema.safeParse({ currentOccupancy: 100001 });
    expect(result.success).toBe(false);
  });

  it('accepts zero occupancy', () => {
    const result = updateOccupancySchema.safeParse({ currentOccupancy: 0 });
    expect(result.success).toBe(true);
  });

  it('accepts maximum occupancy', () => {
    const result = updateOccupancySchema.safeParse({ currentOccupancy: 100000 });
    expect(result.success).toBe(true);
  });
});

describe('Zone API — Navigation Schema', () => {
  it('rejects empty zone IDs', () => {
    expect(navigationSchema.safeParse({ startZoneId: '', endZoneId: 'b' }).success).toBe(false);
    expect(navigationSchema.safeParse({ startZoneId: 'a', endZoneId: '' }).success).toBe(false);
  });

  it('accepts valid zone IDs', () => {
    expect(navigationSchema.safeParse({ startZoneId: 'zone-north', endZoneId: 'zone-south' }).success).toBe(true);
  });

  it('rejects missing fields', () => {
    expect(navigationSchema.safeParse({ startZoneId: 'a' }).success).toBe(false);
    expect(navigationSchema.safeParse({}).success).toBe(false);
  });
});

describe('Alert API — Create Alert Schema', () => {
  it('rejects alert with short description', () => {
    const result = createAlertSchema.safeParse({
      zoneId: 'zone-1',
      type: 'medical',
      severity: 'high',
      description: 'Hi',
    });
    expect(result.success).toBe(false);
  });

  it('rejects invalid alert type', () => {
    const result = createAlertSchema.safeParse({
      zoneId: 'zone-1',
      type: 'fire',
      severity: 'high',
      description: 'There is a fire',
    });
    expect(result.success).toBe(false);
  });

  it('rejects invalid severity', () => {
    const result = createAlertSchema.safeParse({
      zoneId: 'zone-1',
      type: 'medical',
      severity: 'extreme',
      description: 'Medical emergency at gate',
    });
    expect(result.success).toBe(false);
  });

  it('accepts valid alert data', () => {
    const result = createAlertSchema.safeParse({
      zoneId: 'zone-north-entry',
      type: 'security',
      severity: 'medium',
      description: 'Unauthorized person near gate area',
    });
    expect(result.success).toBe(true);
  });

  it('rejects missing zoneId', () => {
    const result = createAlertSchema.safeParse({
      type: 'medical',
      severity: 'high',
      description: 'Emergency at north gate',
    });
    expect(result.success).toBe(false);
  });

  it('rejects description over 500 characters', () => {
    const result = createAlertSchema.safeParse({
      zoneId: 'zone-1',
      type: 'security',
      severity: 'low',
      description: 'x'.repeat(501),
    });
    expect(result.success).toBe(false);
  });
});

describe('AI API — Chat Schema', () => {
  it('rejects empty messages', () => {
    expect(chatSchema.safeParse({ message: '' }).success).toBe(false);
  });

  it('rejects messages over 500 characters', () => {
    expect(chatSchema.safeParse({ message: 'a'.repeat(501) }).success).toBe(false);
  });

  it('accepts valid messages', () => {
    expect(chatSchema.safeParse({ message: "Where's the shortest food queue?" }).success).toBe(true);
  });

  it('accepts messages with history', () => {
    const result = chatSchema.safeParse({
      message: 'Follow up question',
      history: [
        { role: 'user', content: 'Hello' },
        { role: 'assistant', content: 'Hi there!' },
      ],
    });
    expect(result.success).toBe(true);
  });

  it('rejects history with more than 10 items', () => {
    const history = Array.from({ length: 11 }, (_, i) => ({
      role: 'user',
      content: `Message ${i}`,
    }));
    const result = chatSchema.safeParse({ message: 'test', history });
    expect(result.success).toBe(false);
  });

  it('accepts messages without history (optional)', () => {
    const result = chatSchema.safeParse({ message: 'test' });
    expect(result.success).toBe(true);
  });
});
