import { useEffect, useRef, useCallback, useState } from 'react';
import { useZones } from '../../context/ZoneContext';
import LoadingSpinner from '../shared/LoadingSpinner';
import { loadGoogleMaps, mapsLoadError } from '../../utils/loadGoogleMaps';

/** Wankhede Stadium center coordinates */
const WANKHEDE_CENTER = { lat: 18.9388, lng: 72.8254 };
const MAP_ZOOM = 17;

/** Status → map marker color */
const STATUS_COLORS: Record<string, string> = {
  clear: '#22c55e',
  moderate: '#eab308',
  crowded: '#f97316',
  critical: '#ef4444',
};

/**
 * Interactive Google Maps view of Wankhede Stadium with zone markers.
 * Markers are color-coded by congestion status and update in real-time.
 * Dynamically loads Google Maps JS API with error handling and retry.
 */
export default function ZoneMap() {
  const { zones, loading } = useZones();
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const [mapsReady, setMapsReady] = useState(!!window.google?.maps);
  const [mapInited, setMapInited] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);

  // Load Google Maps dynamically
  useEffect(() => {
    if (loading || mapsReady) return;

    loadGoogleMaps()
      .then(() => {
        setMapsReady(true);
        setMapError(null);
      })
      .catch((err: Error) => {
        setMapError(err.message || mapsLoadError || 'Failed to load Google Maps');
      });
  }, [loading, mapsReady]);

  // Listen for Google Maps auth failures (RefererNotAllowedMapError etc.)
  useEffect(() => {
    const handleAuthFailure = () => {
      setMapError(
        'Google Maps API key authorization failed (RefererNotAllowedMapError). ' +
        'Please update the API key\'s HTTP referrer restrictions in the Google Cloud Console ' +
        'to include this domain.'
      );
    };

    // Google Maps calls this global function on auth errors
    (window as unknown as Record<string, unknown>).gm_authFailure = handleAuthFailure;

    return () => {
      delete (window as unknown as Record<string, unknown>).gm_authFailure;
    };
  }, []);

  // Initialize map
  const initMap = useCallback(() => {
    if (!mapRef.current || mapInstanceRef.current) return;
    if (!window.google?.maps) return;

    mapInstanceRef.current = new google.maps.Map(mapRef.current, {
      center: WANKHEDE_CENTER,
      zoom: MAP_ZOOM,
      mapTypeId: 'satellite',
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: true,
      zoomControl: true,
      styles: [
        { featureType: 'poi', stylers: [{ visibility: 'off' }] },
        { featureType: 'transit', stylers: [{ visibility: 'off' }] },
      ],
    });
  }, []);

  // Init once Maps is ready
  useEffect(() => {
    if (mapsReady && !mapInstanceRef.current) {
      initMap();
      setMapInited(true);
    }
  }, [mapsReady, initMap]);

  // Update markers when zone data changes
  useEffect(() => {
    if (!mapInstanceRef.current || zones.length === 0) return;

    // Clear existing markers
    markersRef.current.forEach(m => m.setMap(null));
    markersRef.current = [];

    zones.forEach(zone => {
      const color = STATUS_COLORS[zone.status] ?? '#6b7280';
      const pct = zone.capacity > 0
        ? Math.round((zone.currentOccupancy / zone.capacity) * 100)
        : 0;

      const marker = new google.maps.Marker({
        map: mapInstanceRef.current!,
        position: zone.coordinates,
        title: `${zone.name}: ${zone.status} (${pct}%, ${zone.waitTimeMinutes} min wait)`,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          fillColor: color,
          fillOpacity: 0.9,
          strokeWeight: 2,
          strokeColor: '#ffffff',
          scale: 12,
        },
      });

      const infoWindow = new google.maps.InfoWindow({
        content: `
          <div style="font-family: Inter, sans-serif; padding: 8px; color: #1e293b;">
            <strong style="font-size: 14px;">${zone.name}</strong><br/>
            <span style="color: ${color}; font-weight: 600;">● ${zone.status.toUpperCase()}</span><br/>
            Occupancy: <strong>${pct}%</strong> (${zone.currentOccupancy}/${zone.capacity})<br/>
            Wait: <strong>${zone.waitTimeMinutes} min</strong>
          </div>
        `,
      });

      marker.addListener('click', () => {
        infoWindow.open(mapInstanceRef.current!, marker);
      });

      markersRef.current.push(marker);
    });
  }, [zones, mapInited]);

  if (loading) {
    return <LoadingSpinner label="Loading venue map..." />;
  }

  return (
    <section className="zone-map-container" aria-label="Wankhede Stadium venue map">
      <h2 className="section-title">Wankhede Stadium — Live Map</h2>
      <p className="section-subtitle">Zones are color-coded by congestion level. Click a marker for details.</p>

      {mapError && (
        <div className="map-error" role="alert" aria-live="assertive">
          <span aria-hidden="true" className="map-error__icon">⚠️</span>
          <div className="map-error__content">
            <strong>Map Unavailable</strong>
            <p>{mapError}</p>
          </div>
        </div>
      )}

      {!mapsReady && !mapError && (
        <div className="map-loading" aria-live="polite">
          <LoadingSpinner label="Loading Google Maps..." />
        </div>
      )}

      <div
        ref={mapRef}
        className="zone-map"
        role="img"
        aria-label="Interactive map of Wankhede Stadium showing real-time zone congestion levels"
        tabIndex={0}
        style={{ display: mapsReady && !mapError ? 'block' : 'none' }}
      />
      {/* Accessible legend */}
      <div className="map-legend" role="list" aria-label="Map color legend">
        {Object.entries(STATUS_COLORS).map(([status, color]) => (
          <div key={status} className="map-legend__item" role="listitem">
            <span
              className="map-legend__dot"
              style={{ background: color }}
              aria-hidden="true"
            />
            <span className="map-legend__label">{status.charAt(0).toUpperCase() + status.slice(1)}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
