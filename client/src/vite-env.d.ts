/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_FIREBASE_API_KEY: string;
  readonly VITE_FIREBASE_AUTH_DOMAIN: string;
  readonly VITE_FIREBASE_DATABASE_URL: string;
  readonly VITE_FIREBASE_PROJECT_ID: string;
  readonly VITE_FIREBASE_STORAGE_BUCKET: string;
  readonly VITE_FIREBASE_MESSAGING_SENDER_ID: string;
  readonly VITE_FIREBASE_APP_ID: string;
  readonly VITE_GOOGLE_MAPS_API_KEY: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

// Google Maps type declarations (loaded via script tag)
declare namespace google {
  namespace maps {
    class Map {
      constructor(element: HTMLElement, options: MapOptions);
      fitBounds(bounds: LatLngBounds, padding?: number | { top: number; right: number; bottom: number; left: number }): void;
    }
    class Marker {
      constructor(options: MarkerOptions);
      addListener(event: string, handler: () => void): void;
      setMap(map: Map | null): void;
    }
    class InfoWindow {
      constructor(options: { content: string });
      open(map: Map, marker: Marker): void;
    }
    interface MapOptions {
      center: LatLngLiteral;
      zoom: number;
      mapTypeId?: string;
      mapTypeControl?: boolean;
      streetViewControl?: boolean;
      fullscreenControl?: boolean;
      zoomControl?: boolean;
      styles?: Array<{ featureType?: string; stylers: Array<{ visibility?: string }> }>;
    }
    interface MarkerOptions {
      map: Map;
      position: LatLngLiteral;
      title?: string;
      icon?: SymbolIcon;
    }
    interface LatLngLiteral {
      lat: number;
      lng: number;
    }
    interface SymbolIcon {
      path: number;
      fillColor: string;
      fillOpacity: number;
      strokeWeight: number;
      strokeColor: string;
      scale: number;
    }
    class Polyline {
      constructor(options: PolylineOptions);
      setMap(map: Map | null): void;
    }
    interface PolylineOptions {
      path: LatLngLiteral[];
      geodesic?: boolean;
      strokeColor?: string;
      strokeOpacity?: number;
      strokeWeight?: number;
      map?: Map;
      icons?: Array<{ icon: SymbolIcon & { path: number }; offset?: string; repeat?: string }>;
    }
    class LatLngBounds {
      constructor();
      extend(point: LatLngLiteral): LatLngBounds;
    }
    const SymbolPath: { CIRCLE: number; FORWARD_CLOSED_ARROW: number };
  }
}
