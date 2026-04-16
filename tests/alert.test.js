import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockAddDoc = vi.fn();
const mockGetDocs = vi.fn();
const mockOnSnapshot = vi.fn();
const mockUpdateDoc = vi.fn();
const mockSetState = vi.fn();

vi.mock('../src/firebase.js', () => ({
  db: {},
  collection: vi.fn((_db, name) => ({ name })),
  addDoc: (...args) => mockAddDoc(...args),
  getDocs: (...args) => mockGetDocs(...args),
  query: vi.fn((...args) => ({ queryArgs: args })),
  orderBy: vi.fn((field, dir) => ({ field, dir })),
  serverTimestamp: vi.fn(() => 'SERVER_TS'),
  onSnapshot: (...args) => mockOnSnapshot(...args),
  doc: vi.fn((_db, collectionName, id) => ({ collectionName, id })),
  updateDoc: (...args) => mockUpdateDoc(...args),
}));

vi.mock('../src/state.js', () => ({
  setState: (...args) => mockSetState(...args),
}));

const {
  saveAlertToDB,
  fetchAlerts,
  listenToAlerts,
  updateAlertStatus,
  routeAlert,
} = await import('../src/alert.js');

describe('alert module', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it.each([
    [{ intent: 'fire', location: 'Gate A', teams: [], response: 'Fire', severity: 'high' }, ['fire', 'police'], 'fire'],
    [{ type: 'medical', location: 'Gate B', teams: [], message: 'Medical', severity: 'medium' }, ['medical'], 'medical'],
    [{ type: 'crowd', location: 'Gate C', teams: [], message: 'Crowd', severity: 'low' }, ['police'], 'crowd'],
    [{ type: 'lost_found', location: 'Food Court', teams: [], message: 'Lost child', severity: 'medium' }, ['police'], 'lost_found'],
    [{ type: 'unknown', location: 'Area', teams: [], message: 'Unknown', severity: 'medium' }, ['police'], 'unknown'],
  ])('routes alerts to expected teams', (input, expectedTeams, expectedType) => {
    const result = routeAlert(input);
    expect(result.type).toBe(expectedType);
    expect(result.teams).toEqual(expectedTeams);
    expect(result.status).toBe('pending');
  });

  it('preserves pre-assigned teams when given', () => {
    const result = routeAlert({ intent: 'fire', teams: ['medical'], location: 'Gate A', response: 'manual' });
    expect(result.teams).toEqual(['medical']);
  });

  it.each([
    [{}, 'Unknown Area', '', 'medium'],
    [{ location: 'Gate A', message: 'msg', severity: 'high', teams: ['fire'] }, 'Gate A', 'msg', 'high'],
    [{ response: 'hello' }, 'Unknown Area', 'hello', 'medium'],
  ])('normalizes routed alert fields', (input, expectedLocation, expectedMessage, expectedSeverity) => {
    const result = routeAlert(input);
    expect(result.location).toBe(expectedLocation);
    expect(result.message).toBe(expectedMessage);
    expect(result.severity).toBe(expectedSeverity);
  });

  it('saves alert documents with defaults', async () => {
    mockAddDoc.mockResolvedValueOnce({ id: 'abc123' });
    const id = await saveAlertToDB({ type: 'fire' });
    expect(id).toBe('abc123');
    expect(mockAddDoc).toHaveBeenCalledTimes(1);
  });

  it('returns null when save fails', async () => {
    mockAddDoc.mockRejectedValueOnce(new Error('write failed'));
    await expect(saveAlertToDB({ type: 'fire' })).resolves.toBeNull();
  });

  it('fetches and maps alert documents', async () => {
    mockGetDocs.mockResolvedValueOnce({
      docs: [
        { id: 'a1', data: () => ({ type: 'fire' }) },
        { id: 'a2', data: () => ({ type: 'medical' }) },
      ],
    });

    const alerts = await fetchAlerts();
    expect(alerts).toEqual([
      { id: 'a1', type: 'fire' },
      { id: 'a2', type: 'medical' },
    ]);
  });

  it('returns empty list when fetch fails', async () => {
    mockGetDocs.mockRejectedValueOnce(new Error('fetch failed'));
    await expect(fetchAlerts()).resolves.toEqual([]);
  });

  it('subscribes to alerts and updates state', () => {
    const unsubscribe = vi.fn();
    mockOnSnapshot.mockImplementationOnce((_query, success) => {
      success({
        docs: [
          { id: 'x1', data: () => ({ type: 'crowd' }) },
          { id: 'x2', data: () => ({ type: 'fire' }) },
        ],
      });
      return unsubscribe;
    });

    const callback = vi.fn();
    const result = listenToAlerts(callback);

    expect(mockSetState).toHaveBeenCalledWith('alerts', [
      { id: 'x1', type: 'crowd' },
      { id: 'x2', type: 'fire' },
    ]);
    expect(callback).toHaveBeenCalledWith([
      { id: 'x1', type: 'crowd' },
      { id: 'x2', type: 'fire' },
    ]);
    expect(result).toBe(unsubscribe);
  });

  it('returns no-op unsubscribe when listener setup fails', () => {
    mockOnSnapshot.mockImplementationOnce(() => {
      throw new Error('listener fail');
    });

    const unsub = listenToAlerts();
    expect(typeof unsub).toBe('function');
    expect(() => unsub()).not.toThrow();
  });

  it('updates alert status without assigned teams', async () => {
    mockUpdateDoc.mockResolvedValueOnce(undefined);
    await updateAlertStatus('id-1', 'approved');
    expect(mockUpdateDoc).toHaveBeenCalledTimes(1);
  });

  it('updates alert status with assigned teams', async () => {
    mockUpdateDoc.mockResolvedValueOnce(undefined);
    await updateAlertStatus('id-2', 'dispatched', ['fire', 'police']);
    expect(mockUpdateDoc).toHaveBeenCalledTimes(1);
  });

  it('swallows update failures', async () => {
    mockUpdateDoc.mockRejectedValueOnce(new Error('update fail'));
    await expect(updateAlertStatus('id-3', 'resolved')).resolves.toBeUndefined();
  });
});
