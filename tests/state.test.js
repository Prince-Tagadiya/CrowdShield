import { beforeEach, describe, expect, it, vi } from 'vitest';

const { subscribe, setState, getState, resetState, getSnapshot } = await import('../src/state.js');

describe('state manager', () => {
  beforeEach(() => {
    resetState();
  });

  it('returns current state values', () => {
    expect(getState('activeView')).toBe('login');
    expect(Array.isArray(getState('alerts'))).toBe(true);
    expect(Array.isArray(getState('workers'))).toBe(true);
    expect(Array.isArray(getState('gates'))).toBe(true);
  });

  it('updates known keys', () => {
    setState('activeView', 'admin');
    setState('role', 'admin');
    expect(getState('activeView')).toBe('admin');
    expect(getState('role')).toBe('admin');
  });

  it('ignores unknown keys safely', () => {
    const before = getState('activeView');
    setState('doesNotExist', 'x');
    expect(getState('activeView')).toBe(before);
  });

  it('notifies subscribers when state changes', () => {
    const callback = vi.fn();
    const unsub = subscribe('role', callback);
    setState('role', 'medical');
    expect(callback).toHaveBeenCalledWith('medical', 'role');
    unsub();
  });

  it('supports multiple subscribers for the same key', () => {
    const a = vi.fn();
    const b = vi.fn();
    subscribe('activeView', a);
    subscribe('activeView', b);
    setState('activeView', 'team');
    expect(a).toHaveBeenCalledOnce();
    expect(b).toHaveBeenCalledOnce();
  });

  it('unsubscribe stops future notifications', () => {
    const callback = vi.fn();
    const unsub = subscribe('role', callback);
    unsub();
    setState('role', 'fire');
    expect(callback).not.toHaveBeenCalled();
  });

  it('handles subscriber exceptions without breaking other listeners', () => {
    const good = vi.fn();
    const badUnsub = subscribe('role', () => {
      throw new Error('boom');
    });
    const goodUnsub = subscribe('role', good);
    setState('role', 'police');
    expect(good).toHaveBeenCalledWith('police', 'role');
    badUnsub();
    goodUnsub();
  });

  it('reset restores auth state', () => {
    setState('currentUser', { email: 'admin@test.com', uid: '1' });
    setState('role', 'admin');
    resetState();
    expect(getState('currentUser')).toBeNull();
    expect(getState('role')).toBeNull();
  });

  it('reset restores UI state', () => {
    setState('activeView', 'admin');
    setState('pendingReport', { foo: 'bar' });
    setState('pendingAIAction', { foo: 'baz' });
    resetState();
    expect(getState('activeView')).toBe('login');
    expect(getState('pendingReport')).toBeNull();
    expect(getState('pendingAIAction')).toBeNull();
  });

  it('reset restores data arrays to defaults', () => {
    setState('alerts', [{ id: '1' }]);
    setState('gates', [{ id: 'g' }]);
    setState('workers', [{ id: 'w' }]);
    resetState();
    expect(getState('alerts')).toEqual([]);
    expect(getState('gates').length).toBeGreaterThan(0);
    expect(getState('workers').length).toBeGreaterThan(0);
  });

  it('calls unsubscribe handler during reset', () => {
    const unsub = vi.fn();
    setState('_unsubscribe', unsub);
    resetState();
    expect(unsub).toHaveBeenCalledOnce();
    expect(getState('_unsubscribe')).toBeNull();
  });

  it('getSnapshot returns a readonly-style clone', () => {
    setState('currentUser', { email: 'user@test.com', uid: '7' });
    setState('role', 'attendee');
    const snapshot = getSnapshot();
    expect(snapshot.user).toBe('user@test.com');
    expect(snapshot.role).toBe('attendee');
    expect(Array.isArray(snapshot.gates)).toBe(true);
  });

  it('getSnapshot reflects alert count', () => {
    setState('alerts', [{ id: '1' }, { id: '2' }, { id: '3' }]);
    expect(getSnapshot().alertCount).toBe(3);
  });

  it('snapshot gates are cloned from state', () => {
    const snapshot = getSnapshot();
    snapshot.gates[0].name = 'Changed';
    expect(getState('gates')[0].name).not.toBe('Changed');
  });
});
