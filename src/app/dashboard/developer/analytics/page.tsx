'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { 
  ArrowLeftIcon,
  ChartBarIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon
} from '@heroicons/react/24/outline';
import Link from 'next/link';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Area,
  AreaChart
} from 'recharts';

// Echte Daten aus Firestore aggregieren
const aggregateAnalyticsData = async (user: any, timeRange: string) => {
  if (!user) return { hourlyData: [], dailyData: [], endpointData: [], statusCodeData: [] };

  try {
    const { db } = await import('@/lib/firebase/config');
    const { collection, query, where, getDocs, Timestamp } = await import('firebase/firestore');
    
    const now = new Date();
    let startTime: Date;
    
    // Zeitraum bestimmen
    switch (timeRange) {
      case '1h':
        startTime = new Date(now.getTime() - 60 * 60 * 1000);
        break;
      case '24h':
        startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case '7d':
        startTime = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startTime = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      default:
        startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    }

    // API Logs holen
    const logsQuery = query(
      collection(db, 'api_logs'),
      where('userId', '==', user.uid),
      where('timestamp', '>=', Timestamp.fromDate(startTime))
    );
    
    const logsSnapshot = await getDocs(logsQuery);
    const logs: any[] = [];
    
    logsSnapshot.forEach(doc => {
      const data = doc.data();
      logs.push({
        timestamp: data.timestamp?.toDate() || new Date(),
        endpoint: data.endpoint || '/unknown',
        status: data.status || 200,
        latency: data.latency || 50,
        method: data.method || 'GET'
      });
    });

    // Stündliche Daten aggregieren (letzte 24h)
    const hourlyData = [];
    for (let i = 23; i >= 0; i--) {
      const hourStart = new Date(now.getTime() - i * 60 * 60 * 1000);
      const hourEnd = new Date(hourStart.getTime() + 60 * 60 * 1000);
      
      const hourLogs = logs.filter(log => 
        log.timestamp >= hourStart && log.timestamp < hourEnd
      );
      
      hourlyData.push({
        time: hourStart.getHours().toString().padStart(2, '0') + ':00',
        requests: hourLogs.length,
        errors: hourLogs.filter(log => log.status >= 400).length,
        latency: hourLogs.length > 0 
          ? Math.round(hourLogs.reduce((sum, log) => sum + log.latency, 0) / hourLogs.length)
          : 0
      });
    }

    // Tägliche Daten aggregieren (letzte 7 Tage)
    const dailyData = [];
    const uniqueIpsByDay = new Map();
    
    for (let i = 6; i >= 0; i--) {
      const dayStart = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
      
      const dayLogs = logs.filter(log => 
        log.timestamp >= dayStart && log.timestamp < dayEnd
      );
      
      // Simuliere unique IPs (wäre normalerweise im Log gespeichert)
      const uniqueIps = Math.max(1, Math.floor(dayLogs.length / 10));
      
      dailyData.push({
        date: dayStart.toLocaleDateString('de-DE', { weekday: 'short' }),
        requests: dayLogs.length,
        unique_ips: uniqueIps
      });
    }

    // Endpoint-Statistiken aggregieren
    const endpointStats = new Map();
    logs.forEach(log => {
      const endpoint = log.endpoint;
      if (!endpointStats.has(endpoint)) {
        endpointStats.set(endpoint, { requests: 0, totalLatency: 0 });
      }
      const stats = endpointStats.get(endpoint);
      stats.requests++;
      stats.totalLatency += log.latency;
    });

    const endpointData = Array.from(endpointStats.entries())
      .map(([endpoint, stats]: [string, any]) => ({
        endpoint,
        requests: stats.requests,
        avgLatency: Math.round(stats.totalLatency / stats.requests)
      }))
      .sort((a, b) => b.requests - a.requests)
      .slice(0, 6);

    // Status Code Verteilung
    const statusCounts = { success: 0, clientError: 0, serverError: 0 };
    logs.forEach(log => {
      if (log.status >= 200 && log.status < 400) statusCounts.success++;
      else if (log.status >= 400 && log.status < 500) statusCounts.clientError++;
      else if (log.status >= 500) statusCounts.serverError++;
    });

    const statusCodeData = [
      { name: 'statusCodes.success', value: statusCounts.success, color: '#10b981' },
      { name: 'statusCodes.clientError', value: statusCounts.clientError, color: '#f59e0b' },
      { name: 'statusCodes.serverError', value: statusCounts.serverError, color: '#ef4444' }
    ].filter(item => item.value > 0);

    return { hourlyData, dailyData, endpointData, statusCodeData };
    
  } catch (error) {
    console.error('Fehler beim Aggregieren der Analytics-Daten:', error);
    // Fallback zu leeren Arrays
    return { hourlyData: [], dailyData: [], endpointData: [], statusCodeData: [] };
  }
};

export default function AnalyticsPage() {
  const t = useTranslations('developer.analytics');
  const { user, loading } = useAuth();
  const router = useRouter();
  const [timeRange, setTimeRange] = useState('24h');
  const [apiKeys, setApiKeys] = useState<any[]>([]);
  const [selectedKey, setSelectedKey] = useState<string>('all');
  const [stats, setStats] = useState({
    totalRequests: 0,
    requestsToday: 0,
    errorRate: 0,
    avgLatency: 0,
    activeKeys: 0,
    remainingQuota: 0,
    quotaLimit: 100000
  });
  const [chartData, setChartData] = useState({
    hourlyData: [] as any[],
    dailyData: [] as any[],
    endpointData: [] as any[],
    statusCodeData: [] as any[]
  });
  const [apiKeyStats, setApiKeyStats] = useState<Map<string, any>>(new Map());

  useEffect(() => {
    if (!loading && !user) {
      router.push('/');
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (user) {
      fetchApiKeys();
      fetchUsageStats();
      fetchChartData();
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchChartData();
    }
  }, [user, timeRange]);

  const fetchChartData = async () => {
    if (!user) return;
    
    const data = await aggregateAnalyticsData(user, timeRange);
    setChartData(data);
    
    // API Key spezifische Statistiken berechnen
    await calculateApiKeyStats();
  };

  const calculateApiKeyStats = async () => {
    if (!user || apiKeys.length === 0) return;

    try {
      const { db } = await import('@/lib/firebase/config');
      const { collection, query, where, getDocs } = await import('firebase/firestore');
      
      const keyStatsMap = new Map();
      
      // Für jeden API Key Statistiken berechnen
      for (const apiKey of apiKeys) {
        const keyLogsQuery = query(
          collection(db, 'api_logs'),
          where('apiKeyId', '==', apiKey.id)
        );
        
        const keyLogsSnapshot = await getDocs(keyLogsQuery);
        const keyLogs: any[] = [];
        
        keyLogsSnapshot.forEach(doc => {
          const data = doc.data();
          keyLogs.push({
            timestamp: data.timestamp?.toDate() || new Date(),
            status: data.status || 200,
            latency: data.latency || 50
          });
        });

        // Statistiken berechnen
        const totalRequests = keyLogs.length;
        const errorCount = keyLogs.filter(log => log.status >= 400).length;
        const errorRate = totalRequests > 0 ? (errorCount / totalRequests) * 100 : 0;
        const avgLatency = keyLogs.length > 0 
          ? Math.round(keyLogs.reduce((sum, log) => sum + log.latency, 0) / keyLogs.length)
          : 0;
        
        // Letzter Request
        const lastRequest = keyLogs.length > 0 
          ? Math.max(...keyLogs.map(log => log.timestamp.getTime()))
          : null;
        
        const lastRequestText = lastRequest 
          ? `vor ${Math.floor((Date.now() - lastRequest) / (1000 * 60))} Min.`
          : 'Nie verwendet';

        keyStatsMap.set(apiKey.id, {
          requests: totalRequests,
          errorRate: errorRate.toFixed(2),
          avgLatency,
          lastRequest: lastRequestText
        });
      }
      
      setApiKeyStats(keyStatsMap);
    } catch (error) {
      console.error('Fehler beim Berechnen der API Key Stats:', error);
    }
  };

  const fetchUsageStats = async () => {
    try {
      // DIREKT aus Firestore - KEIN Server-Endpoint nötig!
      if (!user) return;
      
      const { db } = await import('@/lib/firebase/config');
      const { collection, query, where, getDocs, Timestamp } = await import('firebase/firestore');
      
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      
      // API Logs für heute und Monat
      const todayLogsQuery = query(
        collection(db, 'api_logs'),
        where('userId', '==', user.uid),
        where('timestamp', '>=', Timestamp.fromDate(todayStart))
      );
      const todayLogsSnapshot = await getDocs(todayLogsQuery);
      const requestsToday = todayLogsSnapshot.size;
      
      const monthLogsQuery = query(
        collection(db, 'api_logs'),
        where('userId', '==', user.uid),
        where('timestamp', '>=', Timestamp.fromDate(monthStart))
      );
      const monthLogsSnapshot = await getDocs(monthLogsQuery);
      const requestsMonth = monthLogsSnapshot.size;
      
      // Fehlerrate und Latenz berechnen
      let errorCount = 0;
      let totalLatency = 0;
      let latencyCount = 0;
      
      monthLogsSnapshot.forEach(doc => {
        const data = doc.data();
        if (data.status >= 400) {
          errorCount++;
        }
        if (data.latency) {
          totalLatency += data.latency;
          latencyCount++;
        }
      });
      
      const errorRate = requestsMonth > 0 ? (errorCount / requestsMonth) * 100 : 0;
      const avgLatency = latencyCount > 0 ? Math.round(totalLatency / latencyCount) : 0;
      const quotaLimit = 100000; // Default
      
      setStats({
        totalRequests: requestsMonth,
        requestsToday: requestsToday,
        errorRate: parseFloat(errorRate.toFixed(2)),
        avgLatency: avgLatency,
        activeKeys: apiKeys.filter(k => k.status === 'active').length,
        remainingQuota: quotaLimit - requestsMonth,
        quotaLimit: quotaLimit
      });
    } catch (error) {
      console.error('Fehler beim Laden der Usage Stats:', error);
    }
  };

  const fetchApiKeys = async () => {
    try {
      // DIREKT aus Firestore - KEIN Server-Endpoint nötig!
      if (!user) return;
      
      const { db } = await import('@/lib/firebase/config');
      const { collection, query, where, getDocs } = await import('firebase/firestore');
      
      const keysQuery = query(
        collection(db, 'api_keys'),
        where('userId', '==', user.uid)
      );
      
      const keysSnapshot = await getDocs(keysQuery);
      const apiKeysData: any[] = [];
      
      keysSnapshot.forEach(doc => {
        const data = doc.data();
        apiKeysData.push({
          id: doc.id,
          name: data.name || 'Unnamed Key',
          key: data.key || data.keyPreview || 'N/A',
          status: data.status || 'active',
          createdAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
          lastUsed: data.lastUsed?.toDate?.()?.toISOString() || null
        });
      });
      
      setApiKeys(apiKeysData);
    } catch (error) {
      console.error('Fehler beim Laden der API Keys:', error);
      setApiKeys([]);
    }
  };

  const getQuotaPercentage = () => {
    return ((stats.quotaLimit - stats.remainingQuota) / stats.quotaLimit) * 100;
  };

  const getQuotaColor = () => {
    const percentage = getQuotaPercentage();
    if (percentage < 50) return 'bg-green-500';
    if (percentage < 80) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-4">
            <div className="flex items-center">
              <Link
                href="/dashboard/developer"
                className="inline-flex items-center bg-gray-50 hover:bg-gray-100 text-gray-900 border-0 rounded-md px-3 py-2 text-sm font-medium mr-4"
              >
                <ArrowLeftIcon className="h-4 w-4 mr-2" />
                {t('backToPortal')}
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{t('title')}</h1>
                <p className="text-sm text-gray-600">
                  {t('description')}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <select
                value={selectedKey}
                onChange={(e) => setSelectedKey(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">{t('filters.allKeys')}</option>
                {apiKeys.map(key => (
                  <option key={key.id} value={key.id}>
                    {key.name} ({key.key?.substring(0, 10) || 'N/A'}...)
                  </option>
                ))}
              </select>
              <select
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="1h">{t('filters.lastHour')}</option>
                <option value="24h">{t('filters.last24Hours')}</option>
                <option value="7d">{t('filters.last7Days')}</option>
                <option value="30d">{t('filters.last30Days')}</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">{t('metrics.requestsToday')}</p>
                <p className="text-2xl font-semibold text-gray-900 mt-1">
                  {stats.requestsToday.toLocaleString('de-DE')}
                </p>
                <div className="flex items-center mt-2">
                  <ArrowTrendingUpIcon className="h-4 w-4 text-green-500 mr-1" />
                  <span className="text-sm text-green-500">+12.5%</span>
                </div>
              </div>
              <ChartBarIcon className="h-10 w-10 text-blue-500" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">{t('metrics.errorRate')}</p>
                <p className="text-2xl font-semibold text-gray-900 mt-1">
                  {stats.errorRate}%
                </p>
                <div className="flex items-center mt-2">
                  <CheckCircleIcon className="h-4 w-4 text-green-500 mr-1" />
                  <span className="text-sm text-green-500">{t('metrics.errorRateLow')}</span>
                </div>
              </div>
              <ExclamationTriangleIcon className="h-10 w-10 text-yellow-500" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">{t('metrics.avgLatency')}</p>
                <p className="text-2xl font-semibold text-gray-900 mt-1">
                  {stats.avgLatency}ms
                </p>
                <div className="flex items-center mt-2">
                  <ArrowTrendingDownIcon className="h-4 w-4 text-green-500 mr-1" />
                  <span className="text-sm text-green-500">-8ms</span>
                </div>
              </div>
              <ClockIcon className="h-10 w-10 text-purple-500" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <div>
              <p className="text-sm text-gray-600">{t('metrics.quotaUsage')}</p>
              <p className="text-2xl font-semibold text-gray-900 mt-1">
                {getQuotaPercentage().toFixed(1)}%
              </p>
              <div className="mt-3">
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full ${getQuotaColor()}`}
                    style={{ width: `${getQuotaPercentage()}%` }}
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {stats.remainingQuota.toLocaleString('de-DE')} / {stats.quotaLimit.toLocaleString('de-DE')}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Charts Row 1 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Request Timeline */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-lg font-semibold mb-4">{t('charts.requestTimeline')}</h2>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={chartData.hourlyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="time" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Area
                  type="monotone"
                  dataKey="requests"
                  stroke="#3b82f6"
                  fill="#93c5fd"
                  name={t('charts.requests')}
                />
                <Area
                  type="monotone"
                  dataKey="errors"
                  stroke="#ef4444"
                  fill="#fca5a5"
                  name={t('charts.errors')}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Status Code Distribution */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-lg font-semibold mb-4">{t('charts.statusCodeDistribution')}</h2>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={chartData.statusCodeData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${t(name as any)}: ${(percent * 100).toFixed(1)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {chartData.statusCodeData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Charts Row 2 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Top Endpoints */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-lg font-semibold mb-4">{t('charts.topEndpoints')}</h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData.endpointData} layout="horizontal">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="endpoint" type="category" width={100} />
                <Tooltip />
                <Legend />
                <Bar dataKey="requests" fill="#3b82f6" name={t('charts.requests')} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Daily Usage */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-lg font-semibold mb-4">{t('charts.dailyUsage')}</h2>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData.dailyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="requests"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  name={t('charts.requests')}
                />
                <Line
                  type="monotone"
                  dataKey="unique_ips"
                  stroke="#10b981"
                  strokeWidth={2}
                  name={t('charts.uniqueIPs')}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Rate Limit Details */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
          <h2 className="text-lg font-semibold mb-4">{t('rateLimit.title')}</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2">{t('rateLimit.hourly')}</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">{t('rateLimit.used')}</span>
                  <span className="text-sm font-medium">342 / 1000</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-green-500 h-2 rounded-full" style={{ width: '34.2%' }} />
                </div>
                <p className="text-xs text-gray-500">{t('rateLimit.resetIn', { minutes: 42 })}</p>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2">{t('rateLimit.daily')}</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">{t('rateLimit.used')}</span>
                  <span className="text-sm font-medium">12,453 / 50,000</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-green-500 h-2 rounded-full" style={{ width: '24.9%' }} />
                </div>
                <p className="text-xs text-gray-500">{t('rateLimit.resetAtMidnight')}</p>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2">{t('rateLimit.monthly')}</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">{t('rateLimit.used')}</span>
                  <span className="text-sm font-medium">234,567 / 1,000,000</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-green-500 h-2 rounded-full" style={{ width: '23.5%' }} />
                </div>
                <p className="text-xs text-gray-500">{t('rateLimit.resetFirstOfMonth')}</p>
              </div>
            </div>
          </div>
        </div>

        {/* API Key Performance */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-semibold mb-4">{t('table.title')}</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('table.headers.apiKey')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('table.headers.requests')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('table.headers.errorRate')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('table.headers.avgLatency')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('table.headers.lastRequest')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('table.headers.status')}
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {apiKeys.map((key, index) => (
                  <tr key={key.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{key.name}</div>
                        <div className="text-sm text-gray-500">
                          {key.key?.substring(0, 20)}...
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {apiKeyStats.get(key.id)?.requests?.toLocaleString('de-DE') || '0'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-900">
                        {apiKeyStats.get(key.id)?.errorRate || '0.00'}%
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {apiKeyStats.get(key.id)?.avgLatency || '0'}ms
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {apiKeyStats.get(key.id)?.lastRequest || t('table.neverUsed')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                        {t('table.active')}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}