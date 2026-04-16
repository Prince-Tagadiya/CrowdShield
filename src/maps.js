let mapsPromise = null;
let attendeeMap = null;
let adminMap = null;

const VENUE_CENTER = { lat: 19.0421, lng: 72.8258 };
const FALLBACK_URL = 'https://maps.google.com/maps?q=Wankhede%20Stadium%20Mumbai&t=k&z=17&output=embed';

function loadScript(apiKey) {
  if (window.google?.maps) {
    return Promise.resolve(window.google.maps);
  }

  if (mapsPromise) {
    return mapsPromise;
  }

  mapsPromise = new Promise((resolve, reject) => {
    window.gm_authFailure = () => reject(new Error('Google Maps authorization failed'));

    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&loading=async`;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve(window.google?.maps ?? null);
    script.onerror = () => reject(new Error('Google Maps failed to load'));
    document.head.appendChild(script);
  });

  return mapsPromise;
}

function renderIframeFallback(container) {
  container.innerHTML = '';
  const iframe = document.createElement('iframe');
  iframe.className = 'map-frame';
  iframe.src = FALLBACK_URL;
  iframe.loading = 'lazy';
  iframe.referrerPolicy = 'no-referrer-when-downgrade';
  iframe.title = 'Venue map fallback';
  container.appendChild(iframe);
  return { mode: 'fallback', map: iframe };
}

function clearContainer(container) {
  container.innerHTML = '';
}

export async function loadGoogleMaps(apiKey) {
  if (!apiKey) {
    return null;
  }

  try {
    return await loadScript(apiKey);
  } catch (error) {
    console.warn('[Maps]', error instanceof Error ? error.message : error);
    return null;
  }
}

export async function renderVenueMap({ container, apiKey, gates = [], mode = 'attendee' }) {
  if (!container) {
    return null;
  }

  const maps = await loadGoogleMaps(apiKey);
  if (!maps?.Map) {
    return renderIframeFallback(container);
  }

  clearContainer(container);

  const map = new maps.Map(container, {
    center: VENUE_CENTER,
    zoom: 17,
    mapTypeId: 'satellite',
    disableDefaultUI: mode === 'admin',
    zoomControl: mode !== 'admin',
    streetViewControl: false,
    fullscreenControl: false,
    clickableIcons: false,
    gestureHandling: 'cooperative',
  });

  const offsets = [
    { lat: 0.0014, lng: -0.0015 },
    { lat: -0.0012, lng: 0.0012 },
    { lat: 0.0010, lng: 0.0018 },
    { lat: -0.0011, lng: -0.0017 },
  ];

  gates.slice(0, offsets.length).forEach((gate, index) => {
    const offset = offsets[index];
    const marker = new maps.Marker({
      map,
      position: { lat: VENUE_CENTER.lat + offset.lat, lng: VENUE_CENTER.lng + offset.lng },
      title: `${gate.name} • ${gate.wait} min`,
      label: {
        text: gate.name.replace('Gate ', ''),
        color: '#08131f',
        fontWeight: '700',
      },
      icon: {
        path: maps.SymbolPath.CIRCLE,
        scale: mode === 'attendee' ? 11 : 9,
        fillColor: gate.level === 'high' ? '#f97316' : gate.level === 'med' ? '#facc15' : '#34d399',
        fillOpacity: 0.92,
        strokeColor: '#ffffff',
        strokeWeight: 2,
      },
    });

    const infoWindow = new maps.InfoWindow({
      content: `<strong>${gate.name}</strong><br>Wait: ${gate.wait} min<br>Crowd: ${gate.level}`,
    });

    marker.addListener('click', () => infoWindow.open({ anchor: marker, map }));
  });

  if (mode === 'attendee') {
    attendeeMap = map;
  } else {
    adminMap = map;
  }

  return { mode: 'interactive', map };
}

export function getRenderedMaps() {
  return { attendeeMap, adminMap };
}
