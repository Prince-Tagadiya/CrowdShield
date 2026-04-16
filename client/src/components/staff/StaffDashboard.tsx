import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Navigate } from 'react-router-dom';
import ZoneControl from './ZoneControl';
import AlertManager from './AlertManager';
import AIRecommendations from './AIRecommendations';
import ErrorBoundary from '../shared/ErrorBoundary';
import LoadingSpinner from '../shared/LoadingSpinner';

type TabKey = 'zones' | 'alerts' | 'ai';

/**
 * Staff dashboard — protected route requiring authentication.
 * Three tabs: Zone Control, Alert Management, AI Recommendations.
 */
export default function StaffDashboard() {
  const { user, loading } = useAuth();
  const [activeTab, setActiveTab] = useState<TabKey>('zones');

  if (loading) {
    return <LoadingSpinner label="Checking authentication..." />;
  }

  if (!user) {
    return <Navigate to="/staff/login" replace />;
  }

  const tabs: Array<{ key: TabKey; label: string; icon: string }> = [
    { key: 'zones', label: 'Zone Control', icon: '📊' },
    { key: 'alerts', label: 'Alerts', icon: '🚨' },
    { key: 'ai', label: 'AI Recommendations', icon: '🤖' },
  ];

  return (
    <section className="staff-dashboard" aria-label="Staff operations dashboard">
      <div className="dashboard-header">
        <h2 className="section-title">Operations Dashboard</h2>
        <p className="section-subtitle">
          Logged in as <strong>{user.email}</strong>
        </p>
      </div>

      {/* Tab navigation */}
      <div className="dashboard-tabs" role="tablist" aria-label="Dashboard sections">
        {tabs.map(tab => (
          <button
            key={tab.key}
            role="tab"
            className={`dashboard-tab ${activeTab === tab.key ? 'dashboard-tab--active' : ''}`}
            onClick={() => setActiveTab(tab.key)}
            aria-selected={activeTab === tab.key}
            aria-controls={`tabpanel-${tab.key}`}
            id={`tab-${tab.key}`}
          >
            <span aria-hidden="true">{tab.icon}</span> {tab.label}
          </button>
        ))}
      </div>

      {/* Tab panels */}
      <div
        role="tabpanel"
        id={`tabpanel-${activeTab}`}
        aria-labelledby={`tab-${activeTab}`}
        className="dashboard-panel"
      >
        {activeTab === 'zones' && <ZoneControl />}
        {activeTab === 'alerts' && <AlertManager />}
        {activeTab === 'ai' && (
          <ErrorBoundary fallbackMessage="AI recommendations encountered an error. Please try refreshing.">
            <AIRecommendations />
          </ErrorBoundary>
        )}
      </div>
    </section>
  );
}
