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
  /** Adjacent zone IDs for navigation graph */
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
}

/** Request body for zone occupancy update */
export interface UpdateOccupancyRequest {
  currentOccupancy: number;
}

/** Request body for creating an alert */
export interface CreateAlertRequest {
  zoneId: string;
  type: AlertType;
  severity: AlertSeverity;
  description: string;
}

/** Request body for AI chat */
export interface AIChatRequest {
  message: string;
}

/** Dijkstra navigation result */
export interface NavigationResult {
  path: Array<{
    zoneId: string;
    zoneName: string;
    status: ZoneStatus;
    waitTimeMinutes: number;
  }>;
  totalCongestionScore: number;
}

/** Express request augmented with auth */
export interface AuthenticatedRequest {
  uid: string;
  email: string;
  role: string;
}

declare global {
  namespace Express {
    interface Request {
      auth?: AuthenticatedRequest;
    }
  }
}
