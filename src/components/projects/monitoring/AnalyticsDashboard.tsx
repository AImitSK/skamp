// src/components/projects/monitoring/AnalyticsDashboard.tsx
'use client';

import React, { useState, useEffect } from 'react';
import {
  ChartBarIcon,
  DocumentChartBarIcon,
  ArrowTrendingUpIcon,
  EyeIcon,
  TrophyIcon
} from '@heroicons/react/24/outline';
import { ProjectAnalytics, AnalyticsTimeline, MediaOutlet } from '@/types/project';
import { projectService } from '@/lib/firebase/project-service';

interface AnalyticsDashboardProps {
  projectId: string;
  organizationId: string;
  analytics?: ProjectAnalytics;
  className?: string;
}

interface KPICardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ComponentType<{ className?: string }>;
  trend?: {
    value: number;
    isPositive: boolean;
  };
}

const KPICard: React.FC<KPICardProps> = ({ title, value, subtitle, icon: Icon, trend }) => (
  <div className="bg-white rounded-lg border border-gray-200 p-6">
    <div className="flex items-center justify-between">
      <div className="flex-1">
        <div className="flex items-center">
          <Icon className="h-5 w-5 text-gray-400 mr-2" />
          <p className="text-sm font-medium text-gray-600">{title}</p>
        </div>
        <div className="mt-2">
          <p className="text-2xl font-semibold text-gray-900">
            {typeof value === 'number' && value > 999 
              ? `${(value / 1000).toFixed(1)}K` 
              : value}
          </p>
          {subtitle && (
            <p className="text-xs text-gray-500 mt-1">{subtitle}</p>
          )}
        </div>
      </div>
      {trend && (
        <div className={`flex items-center text-sm ${
          trend.isPositive ? 'text-green-600' : 'text-red-600'
        }`}>
          <ArrowTrendingUpIcon className={`h-4 w-4 mr-1 ${
            !trend.isPositive ? 'transform rotate-180' : ''
          }`} />
          {Math.abs(trend.value)}%
        </div>
      )}
    </div>
  </div>
);

interface TimelineChartProps {
  data: AnalyticsTimeline[];
  className?: string;
}

const TimelineChart: React.FC<TimelineChartProps> = ({ data, className }) => {
  if (!data || data.length === 0) {
    return (
      <div className={`bg-white rounded-lg border border-gray-200 p-6 ${className}`}>
        <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
          <ChartBarIcon className="h-5 w-5 mr-2" />
          Reichweiten-Entwicklung
        </h3>
        <div className="flex items-center justify-center h-32 text-gray-500">
          Keine Daten verfügbar
        </div>
      </div>
    );
  }

  // Einfache Balkendiagramm-Darstellung
  const maxReach = Math.max(...data.map(d => d.dailyReach));
  
  return (
    <div className={`bg-white rounded-lg border border-gray-200 p-6 ${className}`}>
      <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
        <ChartBarIcon className="h-5 w-5 mr-2" />
        Reichweiten-Entwicklung
      </h3>
      <div className="space-y-3">
        {data.slice(-7).map((item, index) => {
          const date = new Date(item.date.seconds * 1000);
          const percentage = maxReach > 0 ? (item.dailyReach / maxReach) * 100 : 0;
          
          return (
            <div key={index} className="flex items-center space-x-3">
              <div className="w-16 text-xs text-gray-500">
                {date.toLocaleDateString('de-DE', { 
                  month: 'numeric', 
                  day: 'numeric' 
                })}
              </div>
              <div className="flex-1 bg-gray-100 rounded-full h-4 relative">
                <div
                  className="bg-blue-500 h-4 rounded-full transition-all duration-300"
                  style={{ width: `${percentage}%` }}
                />
              </div>
              <div className="w-16 text-xs font-medium text-gray-900 text-right">
                {item.dailyReach.toLocaleString()}
              </div>
            </div>
          );
        })}
      </div>
      {data.length > 7 && (
        <p className="text-xs text-gray-500 mt-3">
          Zeigt die letzten 7 Tage
        </p>
      )}
    </div>
  );
};

interface OutletRankingProps {
  outlets: MediaOutlet[];
  className?: string;
}

const OutletRanking: React.FC<OutletRankingProps> = ({ outlets, className }) => {
  if (!outlets || outlets.length === 0) {
    return (
      <div className={`bg-white rounded-lg border border-gray-200 p-6 ${className}`}>
        <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
          <TrophyIcon className="h-5 w-5 mr-2" />
          Top Outlets
        </h3>
        <div className="text-gray-500 text-center py-8">
          Keine Outlet-Daten verfügbar
        </div>
      </div>
    );
  }

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'tier1': return 'bg-yellow-100 text-yellow-800';
      case 'tier2': return 'bg-green-100 text-green-800';
      case 'tier3': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getSentimentColor = (sentiment: number) => {
    if (sentiment > 0.1) return 'text-green-600';
    if (sentiment < -0.1) return 'text-red-600';
    return 'text-gray-600';
  };

  return (
    <div className={`bg-white rounded-lg border border-gray-200 p-6 ${className}`}>
      <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
        <TrophyIcon className="h-5 w-5 mr-2" />
        Top Outlets
      </h3>
      <div className="space-y-3">
        {outlets.slice(0, 5).map((outlet, index) => (
          <div key={index} className="flex items-center justify-between py-2">
            <div className="flex-1">
              <div className="flex items-center space-x-2">
                <span className="text-sm font-medium text-gray-900">
                  {outlet.name}
                </span>
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getTierColor(outlet.tier)}`}>
                  {outlet.tier.toUpperCase()}
                </span>
              </div>
              <p className="text-xs text-gray-500">
                {outlet.clippingCount} Clippings • {outlet.totalReach.toLocaleString()} Reichweite
              </p>
            </div>
            <div className={`text-sm font-medium ${getSentimentColor(outlet.averageSentiment)}`}>
              {outlet.averageSentiment > 0 ? '+' : ''}{outlet.averageSentiment.toFixed(2)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

interface SentimentDistributionProps {
  analytics: ProjectAnalytics;
  className?: string;
}

const SentimentDistribution: React.FC<SentimentDistributionProps> = ({ analytics, className }) => {
  // Berechne Sentiment-Verteilung aus Timeline-Daten
  const calculateSentimentDistribution = () => {
    if (!analytics.timelineData || analytics.timelineData.length === 0) {
      return { positive: 0, neutral: 0, negative: 0 };
    }

    const total = analytics.timelineData.length;
    let positive = 0, neutral = 0, negative = 0;

    analytics.timelineData.forEach(item => {
      if (item.dailySentiment > 0.1) positive++;
      else if (item.dailySentiment < -0.1) negative++;
      else neutral++;
    });

    return {
      positive: (positive / total) * 100,
      neutral: (neutral / total) * 100,
      negative: (negative / total) * 100
    };
  };

  const distribution = calculateSentimentDistribution();

  return (
    <div className={`bg-white rounded-lg border border-gray-200 p-6 ${className}`}>
      <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
        <EyeIcon className="h-5 w-5 mr-2" />
        Sentiment-Verteilung
      </h3>
      
      <div className="space-y-4">
        {/* Sentiment-Balken */}
        <div className="flex rounded-lg overflow-hidden h-4">
          <div 
            className="bg-green-500" 
            style={{ width: `${distribution.positive}%` }}
          />
          <div 
            className="bg-gray-400" 
            style={{ width: `${distribution.neutral}%` }}
          />
          <div 
            className="bg-red-500" 
            style={{ width: `${distribution.negative}%` }}
          />
        </div>

        {/* Legende */}
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="flex items-center justify-center space-x-2">
              <div className="w-3 h-3 bg-green-500 rounded-full" />
              <span className="text-sm font-medium text-gray-900">Positiv</span>
            </div>
            <p className="text-lg font-semibold text-gray-900 mt-1">
              {distribution.positive.toFixed(1)}%
            </p>
          </div>
          <div>
            <div className="flex items-center justify-center space-x-2">
              <div className="w-3 h-3 bg-gray-400 rounded-full" />
              <span className="text-sm font-medium text-gray-900">Neutral</span>
            </div>
            <p className="text-lg font-semibold text-gray-900 mt-1">
              {distribution.neutral.toFixed(1)}%
            </p>
          </div>
          <div>
            <div className="flex items-center justify-center space-x-2">
              <div className="w-3 h-3 bg-red-500 rounded-full" />
              <span className="text-sm font-medium text-gray-900">Negativ</span>
            </div>
            <p className="text-lg font-semibold text-gray-900 mt-1">
              {distribution.negative.toFixed(1)}%
            </p>
          </div>
        </div>

        {/* Durchschnitts-Score */}
        <div className="border-t pt-4">
          <div className="text-center">
            <p className="text-sm text-gray-600">Durchschnittliches Sentiment</p>
            <p className={`text-2xl font-bold ${
              analytics.sentimentScore > 0.1 ? 'text-green-600' :
              analytics.sentimentScore < -0.1 ? 'text-red-600' : 'text-gray-600'
            }`}>
              {analytics.sentimentScore > 0 ? '+' : ''}{analytics.sentimentScore.toFixed(2)}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({
  projectId,
  organizationId,
  analytics: providedAnalytics,
  className = ''
}) => {
  const [analytics, setAnalytics] = useState<ProjectAnalytics | null>(providedAnalytics || null);
  const [loading, setLoading] = useState(!providedAnalytics);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadAnalytics = async () => {
      if (providedAnalytics) return;
      
      try {
        setLoading(true);
        const dashboard = await projectService.getAnalyticsDashboard(projectId, { organizationId });
        setAnalytics(dashboard.analytics);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Fehler beim Laden der Analytics');
        console.error('Analytics loading error:', err);
      } finally {
        setLoading(false);
      }
    };

    loadAnalytics();
  }, [projectId, organizationId, providedAnalytics]);

  if (loading) {
    return (
      <div className={`p-6 ${className}`}>
        <div className="animate-pulse space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="bg-gray-200 rounded-lg h-24" />
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-gray-200 rounded-lg h-64" />
            <div className="bg-gray-200 rounded-lg h-64" />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`p-6 ${className}`}>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">Fehler: {error}</p>
        </div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className={`p-6 ${className}`}>
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
          <EyeIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Keine Analytics-Daten
          </h3>
          <p className="text-gray-500">
            Monitoring für dieses Projekt wurde noch nicht gestartet oder es sind keine Daten verfügbar.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* KPI-Karten */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          title="Gesamtreichweite"
          value={analytics.totalReach}
          subtitle="Personen erreicht"
          icon={EyeIcon}
        />
        <KPICard
          title="Clippings"
          value={analytics.clippingCount}
          subtitle="Medienerwähnungen"
          icon={DocumentChartBarIcon}
        />
        <KPICard
          title="Media Value"
          value={`€${(analytics.mediaValue / 1000).toFixed(1)}K`}
          subtitle="Berechneter Medienwert"
          icon={TrophyIcon}
        />
        <KPICard
          title="Sentiment"
          value={analytics.sentimentScore > 0 ? `+${analytics.sentimentScore.toFixed(2)}` : analytics.sentimentScore.toFixed(2)}
          subtitle="Durchschnittsbewertung"
          icon={ChartBarIcon}
        />
      </div>

      {/* Charts und Rankings */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <TimelineChart data={analytics.timelineData} />
        <SentimentDistribution analytics={analytics} />
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <OutletRanking outlets={analytics.topOutlets} />
        
        {/* Export-Aktionen */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
            <DocumentChartBarIcon className="h-5 w-5 mr-2" />
            Report-Export
          </h3>
          <div className="space-y-3">
            <button className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
              PDF-Report generieren
            </button>
            <button className="w-full bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors">
              Excel-Export
            </button>
            <button className="w-full bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors">
              PowerPoint-Präsentation
            </button>
          </div>
        </div>
      </div>

      {/* Letzte Aktualisierung */}
      {analytics.lastUpdated && (
        <div className="text-center text-sm text-gray-500">
          Letzte Aktualisierung: {new Date(analytics.lastUpdated.seconds * 1000).toLocaleString('de-DE')}
        </div>
      )}
    </div>
  );
};

export default AnalyticsDashboard;