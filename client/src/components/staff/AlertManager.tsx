import { useState, type FormEvent } from 'react';
import { useZones } from '../../context/ZoneContext';
import { useAlerts } from '../../hooks/useAlerts';
import { createAlert, acknowledgeAlert, resolveAlert } from '../../services/api';
import { SEVERITY_CLASSES } from '../../utils/status';
import { formatRelativeTime } from '../../utils/formatters';
import type { Alert, AlertType, AlertSeverity } from '../../types';

/**
 * Alert manager for creating, viewing, and resolving operational alerts.
 * All changes sync in real-time to all connected staff.
 */
export default function AlertManager() {
  const { zones } = useZones();
  const { alerts } = useAlerts();

  // New alert form state
  const [showForm, setShowForm] = useState(false);
  const [newAlert, setNewAlert] = useState({
    zoneId: '',
    type: 'security' as AlertType,
    severity: 'medium' as AlertSeverity,
    description: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const handleCreateAlert = async (e: FormEvent) => {
    e.preventDefault();
    if (!newAlert.zoneId || !newAlert.description.trim()) return;

    setSubmitting(true);
    setError(null);

    try {
      await createAlert({
        ...newAlert,
        description: newAlert.description.trim(),
      });
      setNewAlert({ zoneId: '', type: 'security', severity: 'medium', description: '' });
      setShowForm(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create alert');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAcknowledge = async (alertId: string) => {
    setActionLoading(alertId);
    try {
      await acknowledgeAlert(alertId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Action failed');
    } finally {
      setActionLoading(null);
    }
  };

  const handleResolve = async (alertId: string) => {
    setActionLoading(alertId);
    try {
      await resolveAlert(alertId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Action failed');
    } finally {
      setActionLoading(null);
    }
  };

  const activeAlerts = alerts.filter(a => a.status !== 'resolved');
  const resolvedAlerts = alerts.filter(a => a.status === 'resolved');

  return (
    <div className="alert-manager" aria-label="Alert management">
      <div className="alert-manager__header">
        <div>
          <span className="alert-count" aria-live="polite">
            {activeAlerts.length} active alert{activeAlerts.length !== 1 ? 's' : ''}
          </span>
        </div>
        <button
          className="alert-create-btn"
          onClick={() => setShowForm(!showForm)}
          aria-expanded={showForm}
          aria-controls="new-alert-form"
        >
          {showForm ? '✕ Cancel' : '+ New Alert'}
        </button>
      </div>

      {error && (
        <div className="alert-error" role="alert">{error}</div>
      )}

      {/* Create alert form */}
      {showForm && (
        <form
          id="new-alert-form"
          className="alert-form"
          onSubmit={handleCreateAlert}
          aria-label="Create new alert"
        >
          <div className="alert-form__row">
            <div className="alert-form__field">
              <label htmlFor="alert-zone">Zone</label>
              <select
                id="alert-zone"
                value={newAlert.zoneId}
                onChange={e => setNewAlert(prev => ({ ...prev, zoneId: e.target.value }))}
                required
              >
                <option value="">Select zone</option>
                {zones.map(z => (
                  <option key={z.id} value={z.id}>{z.name}</option>
                ))}
              </select>
            </div>

            <div className="alert-form__field">
              <label htmlFor="alert-type">Type</label>
              <select
                id="alert-type"
                value={newAlert.type}
                onChange={e => setNewAlert(prev => ({ ...prev, type: e.target.value as AlertType }))}
              >
                <option value="medical">🏥 Medical</option>
                <option value="security">🔒 Security</option>
                <option value="maintenance">🔧 Maintenance</option>
                <option value="overcrowding">👥 Overcrowding</option>
              </select>
            </div>

            <div className="alert-form__field">
              <label htmlFor="alert-severity">Severity</label>
              <select
                id="alert-severity"
                value={newAlert.severity}
                onChange={e => setNewAlert(prev => ({ ...prev, severity: e.target.value as AlertSeverity }))}
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>
          </div>

          <div className="alert-form__field">
            <label htmlFor="alert-description">Description</label>
            <textarea
              id="alert-description"
              value={newAlert.description}
              onChange={e => setNewAlert(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Describe the incident..."
              required
              minLength={5}
              maxLength={500}
              rows={3}
            />
          </div>

          <button
            type="submit"
            className="alert-form__submit"
            disabled={submitting}
            aria-busy={submitting}
          >
            {submitting ? 'Creating...' : 'Create Alert'}
          </button>
        </form>
      )}

      {/* Active alerts */}
      <div className="alert-list" role="list" aria-label="Active alerts">
        {activeAlerts.length === 0 && (
          <p className="alert-empty">No active alerts. All clear! ✅</p>
        )}
        {activeAlerts.map(alert => (
          <AlertCard
            key={alert.id}
            alert={alert}
            zones={zones}
            onAcknowledge={() => handleAcknowledge(alert.id)}
            onResolve={() => handleResolve(alert.id)}
            isLoading={actionLoading === alert.id}
          />
        ))}
      </div>

      {/* Resolved alerts (collapsible) */}
      {resolvedAlerts.length > 0 && (
        <details className="alert-resolved-section">
          <summary className="alert-resolved-summary">
            {resolvedAlerts.length} resolved alert{resolvedAlerts.length !== 1 ? 's' : ''}
          </summary>
          <div className="alert-list alert-list--resolved" role="list">
            {resolvedAlerts.map(alert => (
              <AlertCard
                key={alert.id}
                alert={alert}
                zones={zones}
                isLoading={false}
              />
            ))}
          </div>
        </details>
      )}
    </div>
  );
}

/** Individual alert card */
function AlertCard({
  alert,
  zones,
  onAcknowledge,
  onResolve,
  isLoading,
}: {
  alert: Alert;
  zones: Array<{ id: string; name: string }>;
  onAcknowledge?: () => void;
  onResolve?: () => void;
  isLoading: boolean;
}) {
  const zoneName = zones.find(z => z.id === alert.zoneId)?.name ?? alert.zoneId;
  const typeIcons: Record<string, string> = {
    medical: '🏥',
    security: '🔒',
    maintenance: '🔧',
    overcrowding: '👥',
  };

  return (
    <div
      className={`alert-card ${SEVERITY_CLASSES[alert.severity]} alert-card--${alert.status}`}
      role="listitem"
      aria-label={`${alert.severity} ${alert.type} alert in ${zoneName}`}
    >
      <div className="alert-card__header">
        <span className="alert-card__icon" aria-hidden="true">
          {typeIcons[alert.type] ?? '⚠️'}
        </span>
        <div className="alert-card__meta">
          <span className="alert-card__type">{alert.type.toUpperCase()}</span>
          <span className={`alert-card__severity ${SEVERITY_CLASSES[alert.severity]}`}>
            {alert.severity}
          </span>
        </div>
        <span className={`alert-card__status-badge alert-card__status-badge--${alert.status}`}>
          {alert.status}
        </span>
      </div>

      <p className="alert-card__zone">📍 {zoneName}</p>
      <p className="alert-card__description">{alert.description}</p>
      <span className="alert-card__time">{formatRelativeTime(alert.createdAt)}</span>

      {alert.triageAdvice && (
        <div className="alert-card__triage" aria-label="AI triage assessment">
          <span className="alert-card__triage-label">🤖 AI Assessment:</span>
          <p>{alert.triageAdvice}</p>
        </div>
      )}

      {alert.status !== 'resolved' && (
        <div className="alert-card__actions">
          {alert.status === 'active' && onAcknowledge && (
            <button
              className="alert-action-btn alert-action-btn--acknowledge"
              onClick={onAcknowledge}
              disabled={isLoading}
              aria-label={`Acknowledge ${alert.type} alert in ${zoneName}`}
            >
              {isLoading ? '...' : 'Acknowledge'}
            </button>
          )}
          {onResolve && (
            <button
              className="alert-action-btn alert-action-btn--resolve"
              onClick={onResolve}
              disabled={isLoading}
              aria-label={`Resolve ${alert.type} alert in ${zoneName}`}
            >
              {isLoading ? '...' : 'Resolve'}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
