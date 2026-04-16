import { useState, useEffect, useRef, useCallback } from 'react';

const TICK_INTERVAL_MS = 8000; // 8 seconds between ticks

/**
 * Floating simulation toggle button.
 * When active, sends POST /api/simulate/tick every 8 seconds to shift zone
 * occupancy, making the demo feel alive with real-time data changes.
 */
export default function SimulationToggle() {
  const [active, setActive] = useState(false);
  const [tickCount, setTickCount] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const doTick = useCallback(async () => {
    try {
      await fetch('/api/simulate/tick', { method: 'POST' });
      setTickCount(prev => prev + 1);
    } catch {
      // Silently ignore tick failures
    }
  }, []);

  useEffect(() => {
    if (active) {
      // Fire immediately, then on interval
      doTick();
      intervalRef.current = setInterval(doTick, TICK_INTERVAL_MS);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [active, doTick]);

  return (
    <button
      className={`sim-toggle ${active ? 'sim-toggle--active' : ''}`}
      onClick={() => setActive(prev => !prev)}
      aria-label={active ? 'Stop live simulation' : 'Start live simulation'}
      title={active ? `Simulation running (${tickCount} ticks)` : 'Start live demo simulation'}
    >
      <span className="sim-toggle__icon" aria-hidden="true">
        {active ? '⏸' : '▶'}
      </span>
      <span className="sim-toggle__label">
        {active ? 'Simulation Active' : 'Start Demo'}
      </span>
      {active && <span className="sim-toggle__pulse" aria-hidden="true" />}
    </button>
  );
}
