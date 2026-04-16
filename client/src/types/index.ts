/** Zone status derived from occupancy/capacity ratio */
export type ZoneStatus = 'clear' | 'moderate' | 'crowded' | 'critical';

/** Type of venue zone */
export type ZoneType = 'entry' | 'concession' | 'restroom' | 'seating' | 'medical';

/** Alert category */
export type AlertType = 'medical' | 'security' | 'maintenance' | 'overcrowding';

/** Alert severity level */
export type AlertSeverity = 'low' | 'medium' | 'high' | 'critical';

/** Alert lifecycle status */
export type AlertStatus = 'active' | 'acknowledged' | 'resolved';

/** Geographic coordinate */
export interface Coordinate {
  lat: number;
  lng: number;
}

/** Venue zone data model */
export interface Zone {
  id: string;
  name: string;
  type: ZoneType;
  capacity: number;
  currentOccupancy: number;
  status: ZoneStatus;
  waitTimeMinutes: number;
  coordinates: Coordinate;
  lastUpdated: number;
  updatedBy: string;
  adjacentZones: string[];
}

/** Operational alert data model */
export interface Alert {
  id: string;
  zoneId: string;
  type: AlertType;
  severity: AlertSeverity;
  description: string;
  status: AlertStatus;
  createdBy: string;
  createdAt: number;
  resolvedAt: number | null;
  resolvedBy: string | null;
  triageAdvice?: string;
}

/** Navigation result from Dijkstra algorithm */
export interface NavigationResult {
  path: Array<{
    zoneId: string;
    zoneName: string;
    status: ZoneStatus;
    waitTimeMinutes: number;
  }>;
  totalCongestionScore: number;
}

/** AI chat response */
export interface AIChatResponse {
  reply: string;
}

/** AI recommendations response */
export interface AIRecommendationsResponse {
  recommendations: string[];
  generatedAt: string;
}
