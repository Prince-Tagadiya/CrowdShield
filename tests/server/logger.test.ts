import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock Google Cloud Logging before import
vi.mock('@google-cloud/logging', () => ({
  Logging: vi.fn().mockImplementation(() => ({
    log: vi.fn().mockReturnValue({
      entry: vi.fn().mockReturnValue({}),
      write: vi.fn().mockResolvedValue(undefined),
    }),
  })),
}));

describe('Logger', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('logInfo does not throw', async () => {
    // Force development mode for this test
    vi.stubEnv('NODE_ENV', 'development');
    const { logInfo } = await import('../../server/src/services/logger');
    expect(() => logInfo('test message')).not.toThrow();
  });

  it('logWarning does not throw', async () => {
    vi.stubEnv('NODE_ENV', 'development');
    const { logWarning } = await import('../../server/src/services/logger');
    expect(() => logWarning('warning message')).not.toThrow();
  });

  it('logError handles Error objects', async () => {
    vi.stubEnv('NODE_ENV', 'development');
    const { logError } = await import('../../server/src/services/logger');
    expect(() => logError('error occurred', new Error('test error'))).not.toThrow();
  });

  it('logError handles string errors', async () => {
    vi.stubEnv('NODE_ENV', 'development');
    const { logError } = await import('../../server/src/services/logger');
    expect(() => logError('error occurred', 'string error')).not.toThrow();
  });

  it('logError handles undefined error', async () => {
    vi.stubEnv('NODE_ENV', 'development');
    const { logError } = await import('../../server/src/services/logger');
    expect(() => logError('error occurred')).not.toThrow();
  });

  it('logDebug does not throw in development', async () => {
    vi.stubEnv('NODE_ENV', 'development');
    const { logDebug } = await import('../../server/src/services/logger');
    expect(() => logDebug('debug message', { key: 'value' })).not.toThrow();
  });

  it('logInfo accepts payload', async () => {
    vi.stubEnv('NODE_ENV', 'development');
    const { logInfo } = await import('../../server/src/services/logger');
    expect(() => logInfo('test', { port: 8080, env: 'dev' })).not.toThrow();
  });
});
