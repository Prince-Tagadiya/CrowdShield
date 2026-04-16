import { firebaseAuth } from './firebase';
import type {
  Zone,
  Alert,
  NavigationResult,
  AIChatResponse,
  AIRecommendationsResponse,
} from '../types';

const API_BASE = '/api';

/**
 * Typed fetch wrapper that automatically injects the Firebase auth token
 * for authenticated requests. Handles error responses uniformly.
 */
async function apiFetch<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> ?? {}),
  };

  // Inject auth token if a user is signed in
  const user = firebaseAuth?.currentUser;
  if (user) {
    const token = await user.getIdToken();
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(errorData.error ?? `HTTP ${response.status}`);
  }

  return response.json();
}

// ─── Zone API ───

export function fetchZones(): Promise<Zone[]> {
  return apiFetch<Zone[]>('/zones');
}

export function updateZoneOccupancy(
  zoneId: string,
  currentOccupancy: number
): Promise<{ id: string; status: string; waitTimeMinutes: number }> {
  return apiFetch(`/zones/${zoneId}/occupancy`, {
    method: 'PATCH',
    body: JSON.stringify({ currentOccupancy }),
  });
}

export function navigateZones(
  startZoneId: string,
  endZoneId: string
): Promise<NavigationResult> {
  return apiFetch<NavigationResult>('/zones/navigate', {
    method: 'POST',
    body: JSON.stringify({ startZoneId, endZoneId }),
  });
}

// ─── Alert API ───

export function fetchAlerts(status?: string): Promise<Alert[]> {
  const query = status ? `?status=${status}` : '';
  return apiFetch<Alert[]>(`/alerts${query}`);
}

export function createAlert(data: {
  zoneId: string;
  type: string;
  severity: string;
  description: string;
}): Promise<Alert> {
  return apiFetch<Alert>('/alerts', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function acknowledgeAlert(alertId: string): Promise<{ id: string; status: string }> {
  return apiFetch(`/alerts/${alertId}/acknowledge`, { method: 'PATCH' });
}

export function resolveAlert(alertId: string): Promise<{ id: string; status: string }> {
  return apiFetch(`/alerts/${alertId}/resolve`, { method: 'PATCH' });
}

// ─── AI API ───

export function sendAIChat(
  message: string,
  history?: Array<{ role: string; content: string }>
): Promise<AIChatResponse> {
  return apiFetch<AIChatResponse>('/ai/chat', {
    method: 'POST',
    body: JSON.stringify({ message, history }),
  });
}

export function getAIRecommendations(): Promise<AIRecommendationsResponse> {
  return apiFetch<AIRecommendationsResponse>('/ai/recommendations', {
    method: 'POST',
  });
}
