/**
 * Dynamic Google Maps JS API loader with error handling and retry.
 * Replaces the static `<script>` tag in index.html to provide:
 * - Singleton loading (only one script injected)
 * - Error detection for RefererNotAllowedMapError
 * - Retry with exponential backoff
 * - Promise-based API for components
 */

/** Tracks the current loading state */
let loadPromise: Promise<typeof google.maps> | null = null;

/** Max retries for loading Maps API */
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 2000;

/**
 * Load the Google Maps JavaScript API dynamically.
 * Returns a promise that resolves with `google.maps` once loaded.
 * Uses a singleton pattern — calling this multiple times returns the same promise.
 */
export function loadGoogleMaps(): Promise<typeof google.maps> {
  // Already loaded
  if (window.google?.maps) {
    return Promise.resolve(window.google.maps);
  }

  // Loading in progress
  if (loadPromise) {
    return loadPromise;
  }

  loadPromise = attemptLoad(0);
  return loadPromise;
}

/**
 * Get the current Maps API load error, if any.
 * Components can use this to display a user-friendly message.
 */
export let mapsLoadError: string | null = null;

function attemptLoad(attempt: number): Promise<typeof google.maps> {
  return new Promise((resolve, reject) => {
    // Check if already loaded (e.g., from a previous page load or cached)
    if (window.google?.maps) {
      mapsLoadError = null;
      resolve(window.google.maps);
      return;
    }

    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY ?? '';
    if (!apiKey) {
      const msg = 'Google Maps API key is missing (VITE_GOOGLE_MAPS_API_KEY not set)';
      mapsLoadError = msg;
      reject(new Error(msg));
      return;
    }

    // Remove any previously failed script tags
    const existingScript = document.querySelector('script[data-google-maps]');
    if (existingScript) {
      existingScript.remove();
    }

    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=geometry,marker`;
    script.async = true;
    script.defer = true;
    script.setAttribute('data-google-maps', 'true');

    const timeout = setTimeout(() => {
      mapsLoadError = 'Google Maps timed out loading';
      reject(new Error(mapsLoadError));
    }, 15000);

    script.onload = () => {
      clearTimeout(timeout);
      // Give Maps a moment to initialize its global
      const checkReady = (retries: number) => {
        if (window.google?.maps) {
          mapsLoadError = null;
          resolve(window.google.maps);
        } else if (retries > 0) {
          setTimeout(() => checkReady(retries - 1), 200);
        } else {
          // Script loaded but google.maps not available — likely a key error
          const msg = 'Google Maps script loaded but API failed to initialize. Check API key restrictions in Google Cloud Console.';
          mapsLoadError = msg;
          if (attempt < MAX_RETRIES - 1) {
            // Retry silently — error already tracked in mapsLoadError
            loadPromise = null; // Reset so retry creates a new promise
            setTimeout(() => {
              attemptLoad(attempt + 1).then(resolve).catch(reject);
            }, RETRY_DELAY_MS * (attempt + 1));
          } else {
            reject(new Error(msg));
          }
        }
      };
      checkReady(10); // Check up to 10 times with 200ms intervals
    };

    script.onerror = () => {
      clearTimeout(timeout);
      const msg = 'Failed to load Google Maps script — check network connection or API key';
      mapsLoadError = msg;
      if (attempt < MAX_RETRIES - 1) {
        // Retry silently — error already tracked in mapsLoadError
        loadPromise = null;
        setTimeout(() => {
          attemptLoad(attempt + 1).then(resolve).catch(reject);
        }, RETRY_DELAY_MS * (attempt + 1));
      } else {
        reject(new Error(msg));
      }
    };

    document.head.appendChild(script);
  });
}

/**
 * Check if Maps API loaded with an error (e.g., RefererNotAllowedMapError).
 * Google Maps injects error info into the global scope when key restrictions fail.
 */
export function checkMapsAuthError(): string | null {
  // Google Maps sets this global function when auth fails
  if (typeof (window as unknown as Record<string, unknown>).gm_authFailure === 'function') {
    return 'Google Maps API key authorization failed. The API key may have incorrect HTTP referrer restrictions in the Google Cloud Console.';
  }
  return null;
}
