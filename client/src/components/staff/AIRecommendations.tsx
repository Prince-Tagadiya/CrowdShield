import { useState } from 'react';
import { getAIRecommendations } from '../../services/api';

/**
 * AI-generated crowd management recommendations for staff.
 * Fetches from Gemini with live zone data context.
 * Enhanced with priority indicators and visual hierarchy.
 */
export default function AIRecommendations() {
  const [recommendations, setRecommendations] = useState<string[]>([]);
  const [generatedAt, setGeneratedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<'all' | 'fire' | 'police' | 'medical'>('all');

  const handleGenerate = async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await getAIRecommendations();
      setRecommendations(result.recommendations);
      setGeneratedAt(result.generatedAt);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate recommendations');
    } finally {
      setLoading(false);
    }
  };

  // Assign priority colors based on position
  const getPriorityClass = (index: number) => {
    if (index === 0) return 'ai-rec--critical';
    if (index === 1) return 'ai-rec--high';
    if (index === 2) return 'ai-rec--medium';
    return 'ai-rec--low';
  };

  const getPriorityLabel = (index: number) => {
    if (index === 0) return 'CRITICAL';
    if (index === 1) return 'HIGH';
    if (index === 2) return 'MEDIUM';
    return 'ADVISORY';
  };

  return (
    <div className="ai-recommendations" aria-label="AI crowd management recommendations">
      <div className="ai-recommendations__header">
        <div className="ai-recommendations__intro">
          <div className="ai-recommendations__icon" aria-hidden="true">🧠</div>
          <div>
            <p className="ai-recommendations__info">
              Gemini analyzes live zone data, occupancy trends, and active alerts
              to generate actionable crowd management advice.
            </p>
            <div className="ai-recommendations__badges">
              <span className="ai-rec-badge">🤖 Gemini 2.0 Flash</span>
              <span className="ai-rec-badge">📊 Live Data Grounded</span>
              <span className="ai-rec-badge">🚨 Alert-Aware</span>
            </div>
          </div>
        </div>
        <button
          className="ai-recommendations__btn"
          onClick={handleGenerate}
          disabled={loading}
          aria-busy={loading}
        >
          {loading ? (
            <>
              <span className="ai-btn-spinner" aria-hidden="true" />
              Analyzing...
            </>
        </button>
      </div>

      <div className="ai-recommendations__tabs">
        <button 
          className={`ai-tab ${activeCategory === 'all' ? 'active' : ''}`} 
          onClick={() => setActiveCategory('all')}
        >
          🌐 Overall Center
        </button>
        <button 
          className={`ai-tab ai-tab--fire ${activeCategory === 'fire' ? 'active' : ''}`} 
          onClick={() => setActiveCategory('fire')}
        >
          🔥 Fire Dept
        </button>
        <button 
          className={`ai-tab ai-tab--police ${activeCategory === 'police' ? 'active' : ''}`} 
          onClick={() => setActiveCategory('police')}
        >
          🛡️ Police Op
        </button>
        <button 
          className={`ai-tab ai-tab--medical ${activeCategory === 'medical' ? 'active' : ''}`} 
          onClick={() => setActiveCategory('medical')}
        >
          🚑 Medical Unit
        </button>
      </div>

      {error && (
        <div className="ai-recommendations__error" role="alert">{error}</div>
      )}

      {recommendations.length > 0 && (
        <div className="ai-recommendations__results" aria-live="polite">
          {generatedAt && (
            <div className="ai-recommendations__meta">
              <span className="ai-recommendations__timestamp">
                Generated at {new Date(generatedAt).toLocaleTimeString()}
              </span>
              <span className="ai-recommendations__count">
                {recommendations.length} recommendation{recommendations.length !== 1 ? 's' : ''}
              </span>
            </div>
          )}
          <div className="ai-recommendations__list">
            {recommendations
              .filter(rec => activeCategory === 'all' || (rec as any).category === activeCategory)
              .map((rec: any, index) => (
              <div key={index} className={`ai-recommendations__item ai-rec--${rec.color_code?.toLowerCase() || 'yellow'}`}>
                <div className="ai-rec__header">
                  <span className={`ai-rec__priority risk--${rec.risk_level?.toLowerCase().replace(' ', '-')}`}>
                    {rec.risk_level}
                  </span>
                  <span className="ai-rec__zone">📍 {rec.zone}</span>
                  <span className="ai-rec__density">👥 {rec.density}</span>
                  {rec.category && (
                    <span className={`ai-rec__category ai-rec__category--${rec.category}`}>
                      {rec.category.toUpperCase()}
                    </span>
                  )}
                </div>
                <div className="ai-rec__body">
                  <div className="ai-rec__field">
                    <strong>🔮 Prediction:</strong> {rec.prediction}
                  </div>
                  <div className="ai-rec__field">
                    <strong>🛡️ Action:</strong> {rec.action}
                  </div>
                  <div className="ai-rec__field">
                    <strong>🧠 Reasoning:</strong> {rec.reasoning}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {!loading && recommendations.length === 0 && !error && (
        <div className="ai-recommendations__empty">
          <div className="ai-empty__icon" aria-hidden="true">🎯</div>
          <p>Click &quot;Generate Recommendations&quot; to get AI-powered crowd management advice based on current conditions.</p>
        </div>
      )}
    </div>
  );
}
