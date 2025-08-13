'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
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

// Mock data für Charts
const generateMockData = () => {
  const now = new Date();
  const hourlyData = [];
  for (let i = 23; i >= 0; i--) {
    const hour = new Date(now.getTime() - i * 60 * 60 * 1000);
    hourlyData.push({
      time: hour.getHours() + ':00',
      requests: Math.floor(Math.random() * 100) + 20,
      errors: Math.floor(Math.random() * 5),
      latency: Math.floor(Math.random() * 200) + 50
    });
  }

  const dailyData = [];
  for (let i = 6; i >= 0; i--) {
    const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    dailyData.push({
      date: date.toLocaleDateString('de-DE', { weekday: 'short' }),
      requests: Math.floor(Math.random() * 1000) + 500,
      unique_ips: Math.floor(Math.random() * 50) + 20
    });
  }

  const endpointData = [
    { endpoint: '/contacts', requests: 2847, avgLatency: 45 },
    { endpoint: '/companies', requests: 1923, avgLatency: 52 },
    { endpoint: '/search', requests: 1567, avgLatency: 123 },
    { endpoint: '/publications', requests: 892, avgLatency: 67 },
    { endpoint: '/webhooks', requests: 456, avgLatency: 34 },
    { endpoint: '/export', requests: 234, avgLatency: 890 }
  ];

  const statusCodeData = [
    { name: '2xx Success', value: 8234, color: '#10b981' },
    { name: '4xx Client Error', value: 423, color: '#f59e0b' },
    { name: '5xx Server Error', value: 12, color: '#ef4444' }
  ];

  return { hourlyData, dailyData, endpointData, statusCodeData };
};

export default function AnalyticsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [timeRange, setTimeRange] = useState('24h');
  const [apiKeys, setApiKeys] = useState<any[]>([]);
  const [selectedKey, setSelectedKey] = useState<string>('all');
  const [stats, setStats] = useState({
    totalRequests: 12453,
    requestsToday: 2341,
    errorRate: 0.3,
    avgLatency: 67,
    activeKeys: 5,
    remainingQuota: 87650,
    quotaLimit: 100000
  });

  const { hourlyData, dailyData, endpointData, statusCodeData } = generateMockData();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/');
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (user) {
      fetchApiKeys();
      fetchUsageStats();
    }
  }, [user]);

  const fetchUsageStats = async () => {
    try {
      // Echte Stats vom neuen Developer Endpoint
      const response = await fetch('/api/v1/developer/stats', {
        headers: {
          'Authorization': `Bearer ${await user?.getIdToken()}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setStats({
          totalRequests: data.requests_total || data.requests_month,
          requestsToday: data.requests_today,
          errorRate: data.error_rate,
          avgLatency: data.avg_latency,
          activeKeys: apiKeys.filter(k => k.status === 'active').length,
          remainingQuota: data.quota_limit - data.quota_used,
          quotaLimit: data.quota_limit
        });
      } else {
        console.error('Failed to fetch usage stats:', response.status);
      }
    } catch (error) {
      console.error('Fehler beim Laden der Usage Stats:', error);
    }
  };

  const fetchApiKeys = async () => {
    try {
      // Echte API Keys vom neuen Developer Endpoint
      const response = await fetch('/api/v1/developer/keys', {
        headers: {
          'Authorization': `Bearer ${await user?.getIdToken()}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setApiKeys(data.data || []);
      } else {
        console.error('Failed to fetch API keys:', response.status);
        setApiKeys([]);
      }
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
                Zurück zum Developer Portal
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">API Analytics</h1>
                <p className="text-sm text-gray-600">
                  Überwache deine API-Nutzung und Performance
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <select
                value={selectedKey}
                onChange={(e) => setSelectedKey(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">Alle API Keys</option>
                {apiKeys.map(key => (
                  <option key={key.id} value={key.id}>
                    {key.name} ({key.key.substring(0, 10)}...)
                  </option>
                ))}
              </select>
              <select
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="1h">Letzte Stunde</option>
                <option value="24h">Letzte 24 Stunden</option>
                <option value="7d">Letzte 7 Tage</option>
                <option value="30d">Letzte 30 Tage</option>
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
                <p className="text-sm text-gray-600">Requests heute</p>
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
                <p className="text-sm text-gray-600">Fehlerrate</p>
                <p className="text-2xl font-semibold text-gray-900 mt-1">
                  {stats.errorRate}%
                </p>
                <div className="flex items-center mt-2">
                  <CheckCircleIcon className="h-4 w-4 text-green-500 mr-1" />
                  <span className="text-sm text-green-500">Niedrig</span>
                </div>
              </div>
              <ExclamationTriangleIcon className="h-10 w-10 text-yellow-500" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Avg. Latenz</p>
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
              <p className="text-sm text-gray-600">Quota Verbrauch</p>
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
            <h2 className="text-lg font-semibold mb-4">Request Timeline</h2>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={hourlyData}>
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
                  name="Requests"
                />
                <Area
                  type="monotone"
                  dataKey="errors"
                  stroke="#ef4444"
                  fill="#fca5a5"
                  name="Errors"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Status Code Distribution */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-lg font-semibold mb-4">Status Code Distribution</h2>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={statusCodeData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(1)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {statusCodeData.map((entry, index) => (
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
            <h2 className="text-lg font-semibold mb-4">Top Endpoints</h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={endpointData} layout="horizontal">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="endpoint" type="category" width={100} />
                <Tooltip />
                <Legend />
                <Bar dataKey="requests" fill="#3b82f6" name="Requests" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Daily Usage */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-lg font-semibold mb-4">Daily Usage</h2>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={dailyData}>
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
                  name="Requests"
                />
                <Line
                  type="monotone"
                  dataKey="unique_ips"
                  stroke="#10b981"
                  strokeWidth={2}
                  name="Unique IPs"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Rate Limit Details */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
          <h2 className="text-lg font-semibold mb-4">Rate Limit Details</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2">Stündliches Limit</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Verbraucht</span>
                  <span className="text-sm font-medium">342 / 1000</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-green-500 h-2 rounded-full" style={{ width: '34.2%' }} />
                </div>
                <p className="text-xs text-gray-500">Reset in 42 Minuten</p>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2">Tägliches Limit</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Verbraucht</span>
                  <span className="text-sm font-medium">12,453 / 50,000</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-green-500 h-2 rounded-full" style={{ width: '24.9%' }} />
                </div>
                <p className="text-xs text-gray-500">Reset um Mitternacht</p>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2">Monatliches Limit</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Verbraucht</span>
                  <span className="text-sm font-medium">234,567 / 1,000,000</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-green-500 h-2 rounded-full" style={{ width: '23.5%' }} />
                </div>
                <p className="text-xs text-gray-500">Reset am 1. des Monats</p>
              </div>
            </div>
          </div>
        </div>

        {/* API Key Performance */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-semibold mb-4">API Key Performance</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    API Key
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Requests
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Fehlerrate
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Avg. Latenz
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Letzter Request
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
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
                      {Math.floor(Math.random() * 5000).toLocaleString('de-DE')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-900">
                        {(Math.random() * 2).toFixed(2)}%
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {Math.floor(Math.random() * 100) + 30}ms
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      vor {Math.floor(Math.random() * 60)} Min.
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                        Aktiv
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