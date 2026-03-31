import React, { useEffect, useState } from 'react';
import {
  CalendarClock,
  MessageSquareMore,
  Users,
  TrendingUp,
  CheckCircle2,
  XCircle,
  Clock,
  BarChart3,
} from 'lucide-react';
import { PageSpinner } from '../components/Spinner';
import api from '../api';

const STAT_CARDS = [
  { key: 'total_posts',     label: 'Total Posts',      icon: CalendarClock,     color: 'accent' },
  { key: 'pending_posts',   label: 'Pending',          icon: Clock,             color: 'warning' },
  { key: 'posted_count',    label: 'Published',        icon: CheckCircle2,      color: 'success' },
  { key: 'failed_count',    label: 'Failed',           icon: XCircle,           color: 'danger' },
  { key: 'total_accounts',  label: 'Accounts',         icon: Users,             color: 'accent' },
  { key: 'active_watchers', label: 'Active Watchers',  icon: MessageSquareMore, color: 'success' },
];

const colorMap = {
  accent:  { bg: 'bg-accent-600/15', text: 'text-accent-400', ring: 'ring-accent-500/20' },
  success: { bg: 'bg-success-500/15', text: 'text-success-400', ring: 'ring-success-500/20' },
  danger:  { bg: 'bg-danger-500/15', text: 'text-danger-400', ring: 'ring-danger-500/20' },
  warning: { bg: 'bg-warning-500/15', text: 'text-warning-400', ring: 'ring-warning-500/20' },
};

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [recentPosts, setRecentPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [summaryRes, postsRes] = await Promise.all([
          api.get('/api/analytics/summary'),
          api.get('/api/posts', { params: { limit: 5 } }),
        ]);
        setStats(summaryRes.data);
        setRecentPosts(Array.isArray(postsRes.data) ? postsRes.data.slice(0, 5) : []);
      } catch (err) {
        console.error('Dashboard fetch error:', err);
        setStats({ total_posts: 0, pending_posts: 0, posted_count: 0, failed_count: 0, total_accounts: 0, active_watchers: 0 });
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) return <PageSpinner />;

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-sm text-dark-300 mt-1">Welcome back — here's your overview.</p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {STAT_CARDS.map(({ key, label, icon: Icon, color }, idx) => {
          const c = colorMap[color];
          return (
            <div
              key={key}
              className="glass-card p-4 flex flex-col gap-3 animate-fade-in"
              style={{ animationDelay: `${idx * 60}ms` }}
            >
              <div className={`w-10 h-10 rounded-xl ${c.bg} ring-1 ${c.ring} flex items-center justify-center`}>
                <Icon size={18} className={c.text} />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats?.[key] ?? 0}</p>
                <p className="text-xs text-dark-300 mt-0.5">{label}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Recent posts */}
      <div className="glass-card p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <BarChart3 size={18} className="text-accent-400" />
            Recent Scheduled Posts
          </h2>
        </div>

        {recentPosts.length === 0 ? (
          <div className="text-center py-12 text-dark-300">
            <CalendarClock size={40} className="mx-auto mb-3 opacity-40" />
            <p className="text-sm">No scheduled posts yet. Head over to the Scheduler to create one.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-dark-600/40 text-dark-300 text-xs uppercase tracking-wider">
                  <th className="text-left py-3 px-2">Title</th>
                  <th className="text-left py-3 px-2">Platforms</th>
                  <th className="text-left py-3 px-2">Scheduled</th>
                  <th className="text-left py-3 px-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {recentPosts.map((post) => (
                  <tr key={post.id} className="border-b border-dark-700/30 hover:bg-dark-700/20 transition">
                    <td className="py-3 px-2 font-medium">{post.title}</td>
                    <td className="py-3 px-2">
                      <div className="flex gap-1 flex-wrap">
                        {post.platforms.split(',').map((p) => (
                          <span key={p} className="badge bg-dark-600/50 text-dark-100">{p.trim()}</span>
                        ))}
                      </div>
                    </td>
                    <td className="py-3 px-2 text-dark-200">
                      {new Date(post.scheduled_time).toLocaleString()}
                    </td>
                    <td className="py-3 px-2">
                      <span className={`badge badge-${post.status}`}>
                        {post.status === 'posted' && <CheckCircle2 size={12} />}
                        {post.status === 'failed' && <XCircle size={12} />}
                        {post.status === 'pending' && <Clock size={12} />}
                        {post.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
