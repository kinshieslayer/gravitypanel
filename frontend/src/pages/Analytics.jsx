import React, { useState } from 'react';
import {
  BarChart3,
  TrendingUp,
  Eye,
  Users,
  Heart,
  PlayCircle,
  Activity,
} from 'lucide-react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
} from 'recharts';
import toast from 'react-hot-toast';
import Spinner from '../components/Spinner';
import api from '../api';

const PLATFORMS = [
  { key: 'instagram', label: 'Instagram', color: '#E1306C' },
  { key: 'youtube',   label: 'YouTube',   color: '#FF0000' },
  { key: 'tiktok',    label: 'TikTok',    color: '#00F2EA' },
];

const DEMO_GROWTH = Array.from({ length: 30 }, (_, i) => ({
  day: `Day ${i + 1}`,
  followers: Math.floor(1200 + i * 45 + Math.random() * 80),
  views: Math.floor(5000 + i * 200 + Math.random() * 500),
  engagement: Math.floor(300 + i * 15 + Math.random() * 60),
}));

const DEMO_ENGAGEMENT = [
  { name: 'Likes', value: 12400 },
  { name: 'Comments', value: 3200 },
  { name: 'Shares', value: 1800 },
  { name: 'Saves', value: 2100 },
  { name: 'Reach', value: 45000 },
];

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-dark-700 border border-dark-500/50 rounded-lg px-3 py-2 shadow-xl">
      <p className="text-xs font-medium text-dark-200 mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} className="text-xs" style={{ color: p.color }}>
          {p.name}: {p.value.toLocaleString()}
        </p>
      ))}
    </div>
  );
};

export default function Analytics() {
  const [activePlatform, setActivePlatform] = useState('instagram');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [dateRange, setDateRange] = useState({ from: '', to: '' });

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const params = {};
      if (dateRange.from) params.since = dateRange.from;
      if (dateRange.to) params.until = dateRange.to;
      const res = await api.get(`/api/analytics/${activePlatform}`, { params });
      setData(res.data);
      if (res.data?.errors?.length) {
        res.data.errors.forEach((e) => toast.error(e));
      }
    } catch (err) {
      const msg = err?.response?.data?.detail || 'Failed to fetch analytics';
      toast.error(msg);
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    { label: 'Total Views',   value: '48.2K', icon: Eye,        delta: '+12.5%' },
    { label: 'Followers',     value: '2,847',  icon: Users,      delta: '+3.2%' },
    { label: 'Engagement',    value: '18.6K',  icon: Heart,      delta: '+8.1%' },
    { label: 'Watch Time',    value: '1,240h', icon: PlayCircle, delta: '+5.7%' },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Analytics</h1>
        <p className="text-sm text-dark-300 mt-1">Track your social media performance across platforms.</p>
      </div>

      {/* Platform tabs + date range */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex gap-2">
          {PLATFORMS.map((p) => (
            <button
              key={p.key}
              onClick={() => setActivePlatform(p.key)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activePlatform === p.key
                  ? 'text-white shadow-lg'
                  : 'bg-dark-600/40 text-dark-200 hover:bg-dark-500/50'
              }`}
              style={activePlatform === p.key ? { backgroundColor: p.color + '30', color: p.color, boxShadow: `0 0 20px ${p.color}20` } : {}}
            >
              {p.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-3">
          <input
            type="date"
            className="input !w-auto !py-2 text-xs"
            value={dateRange.from}
            onChange={(e) => setDateRange((r) => ({ ...r, from: e.target.value }))}
          />
          <span className="text-dark-400 text-xs">to</span>
          <input
            type="date"
            className="input !w-auto !py-2 text-xs"
            value={dateRange.to}
            onChange={(e) => setDateRange((r) => ({ ...r, to: e.target.value }))}
          />
          <button onClick={fetchAnalytics} className="btn btn-primary text-xs !px-4 !py-2">
            {loading ? <Spinner size="sm" /> : <BarChart3 size={14} />}
            Fetch
          </button>
        </div>
      </div>

      {/* Data display conditionally rendered */}
      {!data ? (
        <div className="glass-card p-12 text-center flex flex-col items-center justify-center text-dark-400 min-h-[400px]">
          <BarChart3 size={64} className="mb-4 opacity-20" />
          <p className="text-lg font-medium text-dark-200">No Analytics Displayed</p>
          <p className="text-sm mt-2 max-w-sm mx-auto">
            Click "Fetch" to load data for the selected platform. Make sure your API keys are configured in Settings.
          </p>
        </div>
      ) : (
        <div className="glass-card p-6 animate-fade-in">
          <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
            <Activity size={16} className="text-accent-400" /> Live Data Retrieved
          </h3>
          <p className="text-xs text-dark-400 mb-4">Raw API payload from the connected account:</p>
          <pre className="text-xs text-dark-300 overflow-x-auto bg-dark-900/50 border border-dark-600/30 rounded-lg p-4 max-h-[600px] whitespace-pre-wrap">
            {JSON.stringify(data, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
