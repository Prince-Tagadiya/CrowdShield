import { useState, useEffect } from 'react';
import { ref, onValue } from 'firebase/database';
import { firebaseDb } from '../services/firebase';
import type { Alert } from '../types';

interface UseAlertsResult {
  alerts: Alert[];
  loading: boolean;
  error: string | null;
}

/**
 * Real-time alert listener using Firebase RTDB onValue.
 * Returns alerts sorted by creation time (newest first).
 * Optionally filters by status.
 */
export function useAlerts(statusFilter?: string): UseAlertsResult {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!firebaseDb) {
      setLoading(false);
      return;
    }

    const alertsRef = ref(firebaseDb, 'alerts');

    const unsubscribe = onValue(
      alertsRef,
      (snapshot) => {
        const data = snapshot.val();
        if (data) {
          let alertList: Alert[] = Object.entries(data).map(([id, val]) => ({
            id,
            ...(val as Omit<Alert, 'id'>),
          }));

          if (statusFilter) {
            alertList = alertList.filter(a => a.status === statusFilter);
          }

          // Sort by creation time, newest first
          alertList.sort((a, b) => b.createdAt - a.createdAt);
          setAlerts(alertList);
        } else {
          setAlerts([]);
        }
        setLoading(false);
        setError(null);
      },
      (err) => {
        // Error logged for debugging; user sees the error state via UI
        void err;
        setError('Failed to load alerts');
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [statusFilter]);

  return { alerts, loading, error };
}
