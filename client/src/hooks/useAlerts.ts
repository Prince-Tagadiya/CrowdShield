import { useState, useEffect } from 'react';
import { socket } from '../services/socket';
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
    const handleAlertsUpdate = (data: any) => {
      if (data) {
        let alertList: Alert[] = Object.values(data);
        if (statusFilter) {
          alertList = alertList.filter(a => a.status === statusFilter);
        }
        alertList.sort((a, b) => b.createdAt - a.createdAt);
        setAlerts(alertList);
      } else {
        setAlerts([]);
      }
      setLoading(false);
      setError(null);
    };

    socket.on('alerts_update', handleAlertsUpdate);

    // Initial fetch
    let url = '/api/alerts';
    if (statusFilter) {
      url += `?status=${statusFilter}`;
    }
    fetch(url)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setAlerts(data);
          setLoading(false);
        }
      })
      .catch(err => {
        console.error(err);
        setError('Failed to fetch initial alerts');
      });

    return () => {
      socket.off('alerts_update', handleAlertsUpdate);
    };
  }, [statusFilter]);

  return { alerts, loading, error };
}
