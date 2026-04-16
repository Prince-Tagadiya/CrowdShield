import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { JSDOM } from 'jsdom';

let window;
let document;

beforeEach(() => {
  const dom = new JSDOM('<!doctype html><html><head></head><body><div id="map"></div></body></html>', { url: 'http://localhost' });
  window = dom.window;
  document = window.document;
  global.window = window;
  global.document = document;
});

afterEach(() => {
  vi.restoreAllMocks();
  delete global.window;
  delete global.document;
});

describe('maps integration', () => {
  it('returns null when no API key is provided', async () => {
    const { loadGoogleMaps } = await import('../src/maps.js');
    await expect(loadGoogleMaps('')).resolves.toBeNull();
  });

  it('renders iframe fallback when maps are unavailable', async () => {
    const { renderVenueMap } = await import('../src/maps.js');
    const container = document.getElementById('map');
    const result = await renderVenueMap({ container, apiKey: '', gates: [] });
    expect(result.mode).toBe('fallback');
    expect(container.querySelector('iframe')).not.toBeNull();
  });

  it('uses existing google maps object when available', async () => {
    const markers = [];
    window.google = {
      maps: {
        Map: class {
          constructor(container) {
            this.container = container;
            this.markers = [];
          }
        },
        Marker: class {
          constructor(config) {
            this.config = config;
            this.setMap = vi.fn();
            markers.push(this);
          }
          addListener() {}
        },
        InfoWindow: class {
          constructor(config) {
            this.config = config;
          }
          open() {}
        },
        SymbolPath: { CIRCLE: 'circle' },
      },
    };

    const { loadGoogleMaps, renderVenueMap, getRenderedMaps } = await import('../src/maps.js');
    await expect(loadGoogleMaps('abc')).resolves.toBe(window.google.maps);

    const container = document.getElementById('map');
    const result = await renderVenueMap({
      container,
      apiKey: 'abc',
      gates: [
        { name: 'Gate A', wait: 10, level: 'high' },
        { name: 'Gate B', wait: 5, level: 'med' },
      ],
      mode: 'attendee',
    });

    expect(result.mode).toBe('interactive');
    expect(markers).toHaveLength(2);
    expect(getRenderedMaps().attendeeMap).toBeTruthy();
  });

  it('reuses map instance and clears previous markers', async () => {
    const oldMarkers = [];
    window.google = {
      maps: {
        Map: class {
          constructor() {
            this.markers = [];
          }
        },
        Marker: class {
          constructor(config) {
            this.setMap = vi.fn();
            this.config = config;
            oldMarkers.push(this);
          }
          addListener() {}
        },
        InfoWindow: class {
          open() {}
        },
        SymbolPath: { CIRCLE: 'circle' },
      },
    };

    const { renderVenueMap } = await import('../src/maps.js');
    const container = document.getElementById('map');

    await renderVenueMap({
      container,
      apiKey: 'abc',
      gates: [{ name: 'Gate A', wait: 8, level: 'low' }],
      mode: 'admin',
    });
    const firstMarker = oldMarkers[0];

    await renderVenueMap({
      container,
      apiKey: 'abc',
      gates: [{ name: 'Gate B', wait: 6, level: 'med' }],
      mode: 'admin',
    });

    expect(firstMarker.setMap).toHaveBeenCalledWith(null);
  });
});
