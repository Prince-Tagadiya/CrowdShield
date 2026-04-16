import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ZoneProvider } from './context/ZoneContext';
import Header from './components/shared/Header';
import ErrorBoundary from './components/shared/ErrorBoundary';
import SimulationToggle from './components/shared/SimulationToggle';
import HeroBanner from './components/attendee/HeroBanner';
import ZoneMap from './components/attendee/ZoneMap';
import ZoneStatusGrid from './components/attendee/ZoneStatusGrid';
import NavigationPanel from './components/attendee/NavigationPanel';
import AIChatPanel from './components/attendee/AIChatPanel';
import LoginForm from './components/staff/LoginForm';
import StaffDashboard from './components/staff/StaffDashboard';
import './App.css';

/**
 * Root application component with routing.
 * - / → Attendee home (hero + map + zone grid)
 * - /navigate → Congestion-aware navigation with map polylines
 * - /ask → AI chat with multi-turn conversation
 * - /staff/login → Staff login
 * - /staff → Staff dashboard (auth-protected)
 */
export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ZoneProvider>
          <div className="app">
            <a href="#main-content" className="skip-link">
              Skip to main content
            </a>
            <Header />
            <main className="app-main" id="main-content">
              <Routes>
                <Route path="/" element={
                  <div className="attendee-home">
                    <HeroBanner />
                    <ZoneMap />
                    <ZoneStatusGrid />
                  </div>
                } />
                <Route path="/navigate" element={<NavigationPanel />} />
                <Route path="/ask" element={
                  <ErrorBoundary fallbackMessage="AI chat encountered an error.">
                    <AIChatPanel />
                  </ErrorBoundary>
                } />
                <Route path="/staff/login" element={<LoginForm />} />
                <Route path="/staff" element={<StaffDashboard />} />
              </Routes>
            </main>
            <footer className="app-footer" role="contentinfo">
              <div className="footer-content">
                <div className="footer-brand">
                  <span className="footer-logo">🏟️ VenueFlow</span>
                  <p>Real-time Crowd Intelligence for scale.</p>
                </div>
                <div className="footer-links">
                  <a href="https://console.cloud.google.com/" target="_blank" rel="noreferrer" className="footer-link">Google Cloud</a>
                  <a href="https://firebase.google.com" target="_blank" rel="noreferrer" className="footer-link">Firebase</a>
                  <a href="https://github.com/pranavg21/venueflow" target="_blank" rel="noreferrer" className="footer-link">GitHub</a>
                </div>
              </div>
              <div className="footer-bottom">
                <p>© 2026 VenueFlow — Built for Google PromptWars</p>
              </div>
            </footer>
            {/* Floating simulation toggle for demo mode */}
            <SimulationToggle />
          </div>
        </ZoneProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
