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
  const markersRef = useRef<google.maps.marker.AdvancedMarkerElement[]>([]);
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
  const initMap = useCallback(async () => {
    if (!mapRef.current || mapInstanceRef.current) return;
    if (!window.google?.maps) return;

    try {
      const { Map } = await google.maps.importLibrary('maps') as google.maps.MapsLibrary;
      
      mapInstanceRef.current = new Map(mapRef.current, {
        center: WANKHEDE_CENTER,
        zoom: MAP_ZOOM,
        mapTypeId: 'satellite',
        mapId: 'DEMO_MAP_ID', // Required for AdvancedMarkerElement
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: true,
        zoomControl: true,
      });
      setMapInited(true);
    } catch (e) {
      console.error('Failed to init Map', e);
    }
  }, []);

  // Init once Maps is ready
  useEffect(() => {
    if (mapsReady && !mapInstanceRef.current) {
      initMap();
    }
  }, [mapsReady, initMap]);

  // Update markers when zone data changes
  useEffect(() => {
    if (!mapInstanceRef.current || zones.length === 0 || !mapInited) return;

    const updateMarkers = async () => {
      // Clear existing markers
      markersRef.current.forEach(m => (m.map = null));
      markersRef.current = [];

      const { AdvancedMarkerElement } = await google.maps.importLibrary("marker") as google.maps.MarkerLibrary;
      const { InfoWindow } = await google.maps.importLibrary("maps") as google.maps.MapsLibrary;

      zones.forEach(zone => {
        const color = STATUS_COLORS[zone.status] ?? '#6b7280';
        const pct = zone.capacity > 0
          ? Math.round((zone.currentOccupancy / zone.capacity) * 100)
          : 0;

        const dot = document.createElement('div');
        dot.style.width = '24px';
        dot.style.height = '24px';
        dot.style.backgroundColor = color;
        dot.style.border = '2px solid white';
        dot.style.borderRadius = '50%';
        dot.style.opacity = '0.9';
        dot.style.boxShadow = '0 2px 4px rgba(0,0,0,0.3)';

        const marker = new AdvancedMarkerElement({
          map: mapInstanceRef.current!,
          position: zone.coordinates,
          title: `${zone.name}: ${zone.status} (${pct}%, ${zone.waitTimeMinutes} min wait)`,
          content: dot,
        });

        const infoWindow = new InfoWindow({
          content: `
            <div style="font-family: Inter, sans-serif; padding: 8px; color: #1e293b;">
              <strong style="font-size: 14px;">${zone.name}</strong><br/>
              <span style="color: ${color}; font-weight: 600;">● ${zone.status.toUpperCase()}</span><br/>
              Occupancy: <strong>${pct}%</strong> (${zone.currentOccupancy}/${zone.capacity})<br/>
              Wait: <strong>${zone.waitTimeMinutes} min</strong>
            </div>
          `,
        });

        marker.addListener('gmp-click', () => {
          infoWindow.open(mapInstanceRef.current!, marker);
        });

        markersRef.current.push(marker);
      });
    };

    updateMarkers();
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
