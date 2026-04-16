import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import { ref, onValue } from 'firebase/database';
import { firebaseDb, useMockMode } from '../services/firebase';
import type { Zone } from '../types';

interface ZoneContextValue {
  zones: Zone[];
  loading: boolean;
  error: string | null;
  getZoneById: (id: string) => Zone | undefined;
}

const ZoneContext = createContext<ZoneContextValue | null>(null);

// Example seed data for mock mode
const MOCK_INITIAL_ZONES: Zone[] = [
  { id: 'gate_a', name: 'Gate A Entrance', type: 'entry', capacity: 2000, currentOccupancy: 850, status: 'moderate', waitTimeMinutes: 12, coordinates: { lat: 18.9388, lng: 72.8252 }, lastUpdated: Date.now(), updatedBy: 'system', adjacentZones: [] },
  { id: 'gate_b', name: 'Gate B Entrance', type: 'entry', capacity: 2000, currentOccupancy: 1800, status: 'critical', waitTimeMinutes: 45, coordinates: { lat: 18.9385, lng: 72.8250 }, lastUpdated: Date.now(), updatedBy: 'system', adjacentZones: [] },
  { id: 'food_1', name: 'Food Court North', type: 'concession', capacity: 1000, currentOccupancy: 700, status: 'crowded', waitTimeMinutes: 20, coordinates: { lat: 18.9390, lng: 72.8255 }, lastUpdated: Date.now(), updatedBy: 'system', adjacentZones: [] },
  { id: 'rest_1', name: 'Restrooms East', type: 'restroom', capacity: 300, currentOccupancy: 120, status: 'clear', waitTimeMinutes: 2, coordinates: { lat: 18.9387, lng: 72.8258 }, lastUpdated: Date.now(), updatedBy: 'system', adjacentZones: [] },
  { id: 'stand_v', name: 'V. Mankad Stand', type: 'seating', capacity: 5000, currentOccupancy: 4200, status: 'crowded', waitTimeMinutes: 0, coordinates: { lat: 18.9389, lng: 72.8251 }, lastUpdated: Date.now(), updatedBy: 'system', adjacentZones: [] },
];

export function ZoneProvider({ children }: { children: React.ReactNode }) {
  const [zones, setZones] = useState<Zone[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (useMockMode) {
      // No Firebase API keys found — running with mock data for demonstration
      let currentZones = [...MOCK_INITIAL_ZONES];
      setZones(currentZones);
      setLoading(false);

      // Simulate live updates every 5 seconds
      const interval = setInterval(() => {
        currentZones = currentZones.map(z => {
          const shift = Math.floor(Math.random() * (z.capacity * 0.08 * 2)) - (z.capacity * 0.08);
          const currentOccupancy = Math.max(0, Math.min(z.capacity, Math.floor(z.currentOccupancy + shift)));
          const ratio = currentOccupancy / z.capacity;
          const status = ratio >= 0.85 ? 'critical' : ratio >= 0.65 ? 'crowded' : ratio >= 0.40 ? 'moderate' : 'clear';
          const waitTimeMinutes = Math.floor(ratio * 15 * (z.type === 'entry' ? 3 : 1));
          
          return { ...z, currentOccupancy, status, waitTimeMinutes, lastUpdated: Date.now() };
        });
        setZones(currentZones);
      }, 5000);

      return () => clearInterval(interval);
    }

    if (!firebaseDb) {
      setError('Firebase Realtime Database is not initialized.');
      setLoading(false);
      return;
    }

    const zonesRef = ref(firebaseDb, 'zones');

    const unsubscribe = onValue(
      zonesRef,
      (snapshot) => {
        const data = snapshot.val();
        if (data) {
          const zoneList: Zone[] = Object.entries(data).map(([id, val]) => ({
            id,
            ...(val as Omit<Zone, 'id'>),
          }));
          setZones(zoneList);
        } else {
          setZones([]);
        }
        setLoading(false);
        setError(null);
      },
      (err) => {
        // Error surfaced in UI via the error state
        void err;
        setError('Failed to connect to live data. Retrying...');
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const getZoneById = useMemo(() => {
    const zoneMap = new Map(zones.map(z => [z.id, z]));
    return (id: string) => zoneMap.get(id);
  }, [zones]);

  const value = useMemo(() => ({
    zones,
    loading,
    error,
    getZoneById,
  }), [zones, loading, error, getZoneById]);

  return (
    <ZoneContext.Provider value={value}>
      {children}
    </ZoneContext.Provider>
  );
}

/**
 * Hook to access real-time zone data.
 * Must be used within a ZoneProvider.
 */
export function useZones(): ZoneContextValue {
  const context = useContext(ZoneContext);
  if (!context) {
    throw new Error('useZones must be used within a ZoneProvider');
  }
  return context;
}
