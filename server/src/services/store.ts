import { Zone, Alert } from '../types';

export const memZones: Record<string, Zone> = {
  'zone-north-entry': {
    id: 'zone-north-entry',
    name: 'North Stand Entry (Gate A)',
    type: 'entry',
    capacity: 8000,
    currentOccupancy: 3200, 
    status: 'clear',
    waitTimeMinutes: 2,
    coordinates: { lat: 18.9394712, lng: 72.8262613 }, 
    lastUpdated: Date.now(),
    updatedBy: 'system',
    adjacentZones: ['zone-east-food', 'zone-west-food', 'zone-garware'],
  },
  'zone-south-entry': {
    id: 'zone-south-entry',
    name: 'South Stand Entry (Gate D)',
    type: 'entry',
    capacity: 7000,
    currentOccupancy: 5250, 
    status: 'crowded',
    waitTimeMinutes: 15,
    coordinates: { lat: 18.9380028, lng: 72.825764 }, 
    lastUpdated: Date.now(),
    updatedBy: 'system',
    adjacentZones: ['zone-east-food', 'zone-west-food', 'zone-sachin'],
  },
  'zone-east-food': {
    id: 'zone-east-food',
    name: 'East Stand Food Court',
    type: 'concession',
    capacity: 3000,
    currentOccupancy: 1800, 
    status: 'moderate',
    waitTimeMinutes: 8,
    coordinates: { lat: 18.9388528, lng: 72.826764 }, 
    lastUpdated: Date.now(),
    updatedBy: 'system',
    adjacentZones: ['zone-north-entry', 'zone-south-entry', 'zone-garware', 'zone-sachin'],
  },
  'zone-west-food': {
    id: 'zone-west-food',
    name: 'West Stand Food Court',
    type: 'concession',
    capacity: 2500,
    currentOccupancy: 2125, 
    status: 'critical',
    waitTimeMinutes: 25,
    coordinates: { lat: 18.9388528, lng: 72.824764 }, 
    lastUpdated: Date.now(),
    updatedBy: 'system',
    adjacentZones: ['zone-north-entry', 'zone-south-entry', 'zone-garware', 'zone-sachin'],
  },
  'zone-garware': {
    id: 'zone-garware',
    name: 'Garware Pavilion Restrooms',
    type: 'restroom',
    capacity: 1500,
    currentOccupancy: 750, 
    status: 'moderate',
    waitTimeMinutes: 5,
    coordinates: { lat: 18.9376962, lng: 72.825283 }, 
    lastUpdated: Date.now(),
    updatedBy: 'system',
    adjacentZones: ['zone-north-entry', 'zone-east-food', 'zone-west-food', 'zone-sachin'],
  },
  'zone-sachin': {
    id: 'zone-sachin',
    name: 'Sachin Tendulkar Stand',
    type: 'seating',
    capacity: 6500,
    currentOccupancy: 5850, 
    status: 'critical',
    waitTimeMinutes: 0,
    coordinates: { lat: 18.9395695, lng: 72.8253287 }, 
    lastUpdated: Date.now(),
    updatedBy: 'system',
    adjacentZones: ['zone-south-entry', 'zone-east-food', 'zone-west-food', 'zone-garware', 'zone-mca'],
  },
  'zone-mca': {
    id: 'zone-mca',
    name: 'MCA Stand (Pavilion End)',
    type: 'seating',
    capacity: 5500,
    currentOccupancy: 1100,
    status: 'clear',
    waitTimeMinutes: 0,
    coordinates: { lat: 18.9385, lng: 72.8245 },
    lastUpdated: Date.now(),
    updatedBy: 'system',
    adjacentZones: ['zone-sachin', 'zone-west-food', 'zone-sunil'],
  },
  'zone-sunil': {
    id: 'zone-sunil',
    name: 'Sunil Gavaskar Stand',
    type: 'seating',
    capacity: 6000,
    currentOccupancy: 4200,
    status: 'moderate',
    waitTimeMinutes: 0,
    coordinates: { lat: 18.9378, lng: 72.8250 },
    lastUpdated: Date.now(),
    updatedBy: 'system',
    adjacentZones: ['zone-mca', 'zone-south-entry', 'zone-garware'],
  },
  'zone-merchant': {
    id: 'zone-merchant',
    name: 'Vijay Merchant Stand',
    type: 'seating',
    capacity: 7000,
    currentOccupancy: 6300,
    status: 'critical',
    waitTimeMinutes: 0,
    coordinates: { lat: 18.9392, lng: 72.8265 },
    lastUpdated: Date.now(),
    updatedBy: 'system',
    adjacentZones: ['zone-north-entry', 'zone-east-food'],
  },
  'zone-north-food': {
    id: 'zone-north-food',
    name: 'North Terrace Concessions',
    type: 'concession',
    capacity: 2000,
    currentOccupancy: 1600,
    status: 'crowded',
    waitTimeMinutes: 18,
    coordinates: { lat: 18.9400, lng: 72.8258 },
    lastUpdated: Date.now(),
    updatedBy: 'system',
    adjacentZones: ['zone-north-entry', 'zone-merchant'],
  },
};

export const memAlerts: Record<string, Alert> = {};

let ioInstance: any = null;

export function setIo(io: any) {
  ioInstance = io;
}

export function broadcastZones() {
  if (ioInstance) {
    ioInstance.emit('zones_update', memZones);
  }
}

export function broadcastAlerts() {
  if (ioInstance) {
    ioInstance.emit('alerts_update', memAlerts);
  }
}

export function getZones() {
  return typeof memZones === 'object' ? memZones : {};
}

export function getZone(id: string) {
  return memZones[id];
}

export function updateZone(id: string, updates: Partial<Zone>) {
  if (memZones[id]) {
    memZones[id] = { ...memZones[id], ...updates };
    broadcastZones();
  }
}

export function getAlerts() {
  return memAlerts;
}

export function getAlert(id: string) {
  return memAlerts[id];
}

export function createAlert(id: string, alert: Alert) {
  memAlerts[id] = alert;
  broadcastAlerts();
}

export function updateAlert(id: string, updates: Partial<Alert>) {
  if (memAlerts[id]) {
    memAlerts[id] = { ...memAlerts[id], ...updates };
    broadcastAlerts();
  }
}

export function clearAlerts() {
  for (const key in memAlerts) {
    delete memAlerts[key];
  }
  broadcastAlerts();
}
