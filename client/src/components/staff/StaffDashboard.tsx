import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Navigate } from 'react-router-dom';
import { startChaos, resetStadium } from '../../services/api';
import ZoneControl from './ZoneControl';
import AlertManager from './AlertManager';
import AIRecommendations from './AIRecommendations';
import ErrorBoundary from '../shared/ErrorBoundary';
import LoadingSpinner from '../shared/LoadingSpinner';
import ZoneMap from '../attendee/ZoneMap';

type TabKey = 'zones' | 'alerts' | 'ai' | 'map';

export default function StaffDashboard() {
  const { user, loading } = useAuth();
  const [activeTab, setActiveTab] = useState<TabKey>('zones');
  const [demoAction, setDemoAction] = useState<string | null>(null);

  const handleChaos = async () => {
    setDemoAction('Activating Chaos Mode...');
    try {
      await startChaos();
      setActiveTab('ai'); // Jump to AI to show it reacting
    } finally {
      setDemoAction(null);
    }
  };

  const handleReset = async () => {
    setDemoAction('Resetting Stadium...');
    try {
      await resetStadium();
    } finally {
      setDemoAction(null);
    }
  };

  if (loading) {
    return <LoadingSpinner label="Checking authentication..." />;
  }

  if (!user) {
    return <Navigate to="/staff/login" replace />;
  }

  const tabs: Array<{ key: TabKey; label: string; icon: string }> = [
    { key: 'zones', label: 'Zone Control', icon: '📊' },
    { key: 'alerts', label: 'Alerts', icon: '🚨' },
    { key: 'ai', label: 'AI Tactical HUD', icon: '🤖' },
    { key: 'map', label: 'Stadium Map', icon: '🏟️' },
  ];

  return (
    <section className="staff-dashboard" aria-label="Staff operations dashboard">
      <div className="dashboard-header">
        <div className="dashboard-title-group">
          <h2 className="section-title">Admin Command Center</h2>
          <p className="section-subtitle">Logged in as {user.email}</p>
        </div>
        <div className="demo-controls">
          <button 
            className="btn-chaos" 
            onClick={handleChaos} 
            disabled={!!demoAction}
          >
            {demoAction === 'Activating Chaos Mode...' ? '🚨 ACTIVATING...' : '🚨 Start Emergency'}
          </button>
          <button 
            className="btn-reset" 
            onClick={handleReset} 
            disabled={!!demoAction}
          >
            {demoAction === 'Resetting Stadium...' ? '🛡️ RESETTING...' : '🛡️ Safety Reset'}
          </button>
        </div>
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
        {activeTab === 'map' && (
          <ErrorBoundary fallbackMessage="The tactical map encountered an error.">
            <ZoneMap />
          </ErrorBoundary>
        )}
      </div>
    </section>
  );
}
