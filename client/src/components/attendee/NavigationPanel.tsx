import { useState, useMemo, useEffect, useRef, useCallback, type FormEvent } from 'react';
import { useZones } from '../../context/ZoneContext';
import { navigateZones } from '../../services/api';
import StatusBadge from '../shared/StatusBadge';
import LoadingSpinner from '../shared/LoadingSpinner';
import { ZONE_TYPE_ICONS } from '../../utils/status';
import { formatWaitTime } from '../../utils/formatters';
import { loadGoogleMaps } from '../../utils/loadGoogleMaps';
import type { NavigationResult } from '../../types';

/** Wankhede Stadium center coordinates */
const WANKHEDE_CENTER = { lat: 18.9388, lng: 72.8254 };

/** Status → color for markers & polyline segments */
const STATUS_COLORS: Record<string, string> = {
  clear: '#22c55e',
  moderate: '#eab308',
  crowded: '#f97316',
  critical: '#ef4444',
};

/**
 * Navigation panel with Dijkstra pathfinding and map visualization.
 * When a route is found, it's drawn as a polyline on an embedded Google Map.
 */
export default function NavigationPanel() {
  const { zones, loading: zonesLoading } = useZones();
  const [startZone, setStartZone] = useState('');
  const [endZone, setEndZone] = useState('');
  const [result, setResult] = useState<NavigationResult | null>(null);
  const [navLoading, setNavLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mapsReady, setMapsReady] = useState(!!window.google?.maps);

  // Map refs
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const polylineRef = useRef<google.maps.Polyline | null>(null);

  const sortedZones = useMemo(() =>
    [...zones].sort((a, b) => a.name.localeCompare(b.name)),
    [zones]
  );

  // Build a lookup for zone coordinates
  const zoneMap = useMemo(() => {
    const m = new Map<string, { lat: number; lng: number; status: string }>();
    zones.forEach(z => m.set(z.id, { lat: z.coordinates.lat, lng: z.coordinates.lng, status: z.status }));
    return m;
  }, [zones]);

  // Load Google Maps dynamically
  useEffect(() => {
    if (mapsReady) return;
    loadGoogleMaps()
      .then(() => setMapsReady(true))
      .catch(() => { /* ZoneMap already handles the error display */ });
  }, [mapsReady]);

  // Initialize the navigation map
  const initMap = useCallback(() => {
    if (!mapRef.current || mapInstanceRef.current) return;
    if (!window.google?.maps) return;

    mapInstanceRef.current = new google.maps.Map(mapRef.current, {
      center: WANKHEDE_CENTER,
      zoom: 17,
      mapTypeId: 'satellite',
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: false,
      zoomControl: true,
      styles: [
        { featureType: 'poi', stylers: [{ visibility: 'off' }] },
        { featureType: 'transit', stylers: [{ visibility: 'off' }] },
      ],
    });
  }, []);

  useEffect(() => {
    if (mapsReady && !mapInstanceRef.current) {
      initMap();
    }
  }, [mapsReady, initMap]);

  // Draw path on map when result changes
  useEffect(() => {
    if (!mapInstanceRef.current) return;

    // Clear previous markers and polyline
    markersRef.current.forEach(m => m.setMap(null));
    markersRef.current = [];
    if (polylineRef.current) {
      polylineRef.current.setMap(null);
      polylineRef.current = null;
    }

    if (!result || result.path.length === 0) return;

    const pathCoords: Array<{ lat: number; lng: number }> = [];

    result.path.forEach((step, index) => {
      const coords = zoneMap.get(step.zoneId);
      if (!coords) return;
      pathCoords.push({ lat: coords.lat, lng: coords.lng });

      const isStart = index === 0;
      const isEnd = index === result.path.length - 1;
      const color = STATUS_COLORS[step.status] ?? '#6b7280';

      const marker = new google.maps.Marker({
        map: mapInstanceRef.current!,
        position: { lat: coords.lat, lng: coords.lng },
        title: `${isStart ? '🟢 START: ' : isEnd ? '🏁 END: ' : ''}${step.zoneName}`,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          fillColor: isStart ? '#22c55e' : isEnd ? '#ef4444' : color,
          fillOpacity: 1,
          strokeWeight: isStart || isEnd ? 3 : 2,
          strokeColor: '#ffffff',
          scale: isStart || isEnd ? 16 : 10,
        },
      });

      const infoWindow = new google.maps.InfoWindow({
        content: `
          <div style="font-family: Inter, sans-serif; padding: 6px; color: #1e293b;">
            <strong>${isStart ? '🟢 ' : isEnd ? '🏁 ' : ''}Step ${index + 1}: ${step.zoneName}</strong><br/>
            <span style="color: ${color}; font-weight: 600;">● ${step.status.toUpperCase()}</span><br/>
            Wait: <strong>${step.waitTimeMinutes} min</strong>
          </div>
        `,
      });

      marker.addListener('click', () => {
        infoWindow.open(mapInstanceRef.current!, marker);
      });

      markersRef.current.push(marker);
    });

    // Draw polyline along the path
    if (pathCoords.length >= 2) {
      polylineRef.current = new google.maps.Polyline({
        path: pathCoords,
        geodesic: true,
        strokeColor: '#3b82f6',
        strokeOpacity: 0.9,
        strokeWeight: 4,
        map: mapInstanceRef.current!,
        icons: [{
          icon: { path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW, scale: 3, strokeColor: '#ffffff', fillColor: '#3b82f6', fillOpacity: 1 },
          offset: '50%',
        }],
      } as google.maps.PolylineOptions);

      // Fit map bounds to show entire path
      const bounds = new google.maps.LatLngBounds();
      pathCoords.forEach(c => bounds.extend(c));
      mapInstanceRef.current!.fitBounds(bounds, 80);
    }
  }, [result, zoneMap]);

  const handleNavigate = async (e: FormEvent) => {
    e.preventDefault();
    if (!startZone || !endZone) return;
    if (startZone === endZone) {
      setError('Start and destination must be different zones.');
      return;
    }

    setNavLoading(true);
    setError(null);
    setResult(null);

    try {
      const navResult = await navigateZones(startZone, endZone);
      setResult(navResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Navigation failed');
    } finally {
      setNavLoading(false);
    }
  };

  if (zonesLoading) return <LoadingSpinner label="Loading zones..." />;

  return (
    <section className="navigation-panel" aria-label="Congestion-aware navigation">
      <h2 className="section-title">Navigate the Venue</h2>
      <p className="section-subtitle">
        Find the least congested route between any two zones
      </p>

      <form className="nav-form" onSubmit={handleNavigate} aria-label="Navigation form">
        <div className="nav-form__fields">
          <div className="nav-form__field">
            <label htmlFor="nav-start" className="nav-form__label">From</label>
            <select
              id="nav-start"
              className="nav-form__select"
              value={startZone}
              onChange={e => setStartZone(e.target.value)}
              required
              aria-required="true"
            >
              <option value="">Select starting zone</option>
              {sortedZones.map(z => (
                <option key={z.id} value={z.id}>
                  {ZONE_TYPE_ICONS[z.type]} {z.name}
                </option>
              ))}
            </select>
          </div>

          <div className="nav-form__arrow" aria-hidden="true">→</div>

          <div className="nav-form__field">
            <label htmlFor="nav-end" className="nav-form__label">To</label>
            <select
              id="nav-end"
              className="nav-form__select"
              value={endZone}
              onChange={e => setEndZone(e.target.value)}
              required
              aria-required="true"
            >
              <option value="">Select destination</option>
              {sortedZones.map(z => (
                <option key={z.id} value={z.id}>
                  {ZONE_TYPE_ICONS[z.type]} {z.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <button
          type="submit"
          className="nav-form__submit"
          disabled={navLoading || !startZone || !endZone}
          aria-busy={navLoading}
        >
          {navLoading ? 'Finding Route...' : '🧭 Find Best Route'}
        </button>
      </form>

      {error && (
        <div className="nav-error" role="alert">
          <p>{error}</p>
        </div>
      )}

      {/* Navigation Map — always visible */}
      <div className="nav-map-container" aria-label="Navigation route map">
        <div
          ref={mapRef}
          className="nav-map"
          role="img"
          aria-label="Map showing the stadium"
        />
      </div>

      {result && (
        <div className="nav-result" aria-live="polite">
          <div className="nav-result__header">
            <h3 className="nav-result__title">Recommended Route</h3>
            <div className="nav-result__score-pill">
              <span className="nav-result__score-label">Congestion Score</span>
              <span className="nav-result__score-value">{result.totalCongestionScore}</span>
            </div>
          </div>

          <ol className="nav-result__path" aria-label="Navigation path">
            {result.path.map((step, index) => (
              <li key={step.zoneId} className={`nav-step nav-step--${step.status}`}>
                <span className="nav-step__number" aria-hidden="true">
                  {index === 0 ? '🟢' : index === result.path.length - 1 ? '🏁' : index + 1}
                </span>
                <div className="nav-step__info">
                  <span className="nav-step__name">{step.zoneName}</span>
                  <div className="nav-step__meta">
                    <StatusBadge status={step.status} size="sm" />
                    <span className="nav-step__wait">
                      {formatWaitTime(step.waitTimeMinutes)} wait
                    </span>
                  </div>
                </div>
                {index < result.path.length - 1 && (
                  <span className="nav-step__connector" aria-hidden="true">↓</span>
                )}
              </li>
            ))}
          </ol>
        </div>
      )}
    </section>
  );
}
