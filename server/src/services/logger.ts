import { Logging } from '@google-cloud/logging';

/**
 * Structured logger backed by Google Cloud Logging in production.
 *
 * In production (Cloud Run), logs are shipped to Cloud Logging with
 * proper severity levels for monitoring and alerting.
 * In development, falls back to the console with formatted output.
 *
 * @see https://cloud.google.com/logging/docs/reference/v2/rest/v2/LogEntry
 */

const isProduction = process.env.NODE_ENV === 'production';

type LogPayload = Record<string, unknown>;

let cloudLog: ReturnType<Logging['log']> | null = null;

if (isProduction) {
  try {
    const logging = new Logging();
    cloudLog = logging.log('venueflow-server');
  } catch {
    // Cloud Logging may not be available outside GCP — fall back silently
  }
}

/**
 * Write a structured log entry to Google Cloud Logging (production)
 * or to the console (development).
 */
async function writeLog(
  severity: 'INFO' | 'WARNING' | 'ERROR' | 'DEBUG',
  message: string,
  payload?: LogPayload,
): Promise<void> {
  const entry = {
    message,
    severity,
    timestamp: new Date().toISOString(),
    ...payload,
  };

  if (cloudLog) {
    try {
      const metadata = { severity, resource: { type: 'cloud_run_revision' } };
      const logEntry = cloudLog.entry(metadata, entry);
      await cloudLog.write(logEntry);
    } catch {
      // Fallback to structured JSON stdout (Cloud Run auto-ingests this)
      process.stdout.write(JSON.stringify(entry) + '\n');
    }
  } else {
    // Development: formatted console output
    const prefix = severity === 'ERROR' ? '❌' : severity === 'WARNING' ? '⚠️' : 'ℹ️';
    const fn = severity === 'ERROR' ? console.error : severity === 'WARNING' ? console.warn : console.info;
    fn(`${prefix} [${severity}] ${message}`, payload ?? '');
  }
}

/** Log an informational message. */
export function logInfo(message: string, payload?: LogPayload): void {
  void writeLog('INFO', message, payload);
}

/** Log a warning. */
export function logWarning(message: string, payload?: LogPayload): void {
  void writeLog('WARNING', message, payload);
}

/** Log an error with optional error object. */
export function logError(message: string, error?: unknown, payload?: LogPayload): void {
  const errorInfo = error instanceof Error
    ? { errorMessage: error.message, stack: error.stack }
    : { errorMessage: String(error) };
  void writeLog('ERROR', message, { ...errorInfo, ...payload });
}

/** Log a debug message (only in development). */
export function logDebug(message: string, payload?: LogPayload): void {
  if (!isProduction) {
    void writeLog('DEBUG', message, payload);
  }
}
