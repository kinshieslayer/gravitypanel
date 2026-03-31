import React, { useEffect, useState, useCallback } from 'react';
import {
  Plus,
  X,
  Users,
  Trash2,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Instagram,
  Youtube,
} from 'lucide-react';
import toast from 'react-hot-toast';
import Spinner from '../components/Spinner';
import api from '../api';

const PLATFORM_META = {
  instagram: { label: 'Instagram', gradient: 'from-pink-600 to-purple-600',  color: 'text-pink-400' },
  youtube:   { label: 'YouTube',   gradient: 'from-red-600 to-red-500',      color: 'text-red-400' },
  tiktok:    { label: 'TikTok',    gradient: 'from-cyan-500 to-teal-500',    color: 'text-cyan-400' },
};

export default function Accounts() {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // form state
  const [platform, setPlatform] = useState('instagram');
  const [username, setUsername] = useState('');
  const [accessToken, setAccessToken] = useState('');
  const [apiKey, setApiKey] = useState('');

  const fetchAccounts = useCallback(async () => {
    try {
      const res = await api.get('/api/accounts');
      setAccounts(Array.isArray(res.data) ? res.data : []);
    } catch {
      toast.error('Failed to load accounts');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAccounts(); }, [fetchAccounts]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username) { toast.error('Username is required'); return; }

    setSubmitting(true);
    try {
      const creds = { access_token: accessToken };
      if (apiKey) creds.api_key = apiKey;

      await api.post('/api/accounts', { platform, username, credentials: creds });
      toast.success('Account added');
      setShowForm(false);
      setUsername(''); setAccessToken(''); setApiKey('');
      fetchAccounts();
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Failed to add account');
    } finally {
      setSubmitting(false);
    }
  };

  const refreshAccount = async (id) => {
    try {
      await api.put(`/api/accounts/${id}/refresh`);
      toast.success('Token refreshed');
      fetchAccounts();
    } catch {
      toast.error('Refresh failed');
    }
  };

  const deleteAccount = async (id) => {
    try {
      await api.delete(`/api/accounts/${id}`);
      toast.success('Account removed');
      fetchAccounts();
    } catch {
      toast.error('Failed to delete account');
    }
  };

  if (loading) return <Spinner size="lg" className="py-24" />;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Accounts</h1>
          <p className="text-sm text-dark-300 mt-1">Manage your connected social media accounts.</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="btn btn-primary">
          {showForm ? <X size={16} /> : <Plus size={16} />}
          {showForm ? 'Cancel' : 'Add Account'}
        </button>
      </div>

      {/* Add Account Form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="glass-card p-6 space-y-5 animate-fade-in">
          <h2 className="text-lg font-semibold">Connect New Account</h2>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-medium text-dark-200 mb-1.5">Platform</label>
              <div className="flex gap-2">
                {Object.entries(PLATFORM_META).map(([key, meta]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setPlatform(key)}
                    className={`px-4 py-2 rounded-lg text-xs font-medium capitalize transition-all ${
                      platform === key
                        ? `bg-gradient-to-r ${meta.gradient} text-white shadow-lg`
                        : 'bg-dark-600/40 text-dark-200 hover:bg-dark-500/50'
                    }`}
                  >
                    {meta.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-dark-200 mb-1.5">Username *</label>
              <input className="input" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="@username" />
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-medium text-dark-200 mb-1.5">Access Token</label>
              <input className="input" type="password" value={accessToken} onChange={(e) => setAccessToken(e.target.value)} placeholder="Paste access token" />
            </div>
            <div>
              <label className="block text-xs font-medium text-dark-200 mb-1.5">API Key (optional)</label>
              <input className="input" type="password" value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder="API key if required" />
            </div>
          </div>

          <div className="flex justify-end">
            <button type="submit" disabled={submitting} className="btn btn-primary">
              {submitting ? <Spinner size="sm" /> : <Plus size={16} />}
              Add Account
            </button>
          </div>
        </form>
      )}

      {/* Accounts Grid */}
      {accounts.length === 0 ? (
        <div className="glass-card p-16 text-center text-dark-300">
          <Users size={48} className="mx-auto mb-4 opacity-40" />
          <p className="text-sm">No accounts connected yet. Click "Add Account" to get started.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {accounts.map((acc, idx) => {
            const meta = PLATFORM_META[acc.platform] || PLATFORM_META.instagram;
            return (
              <div
                key={acc.id}
                className="glass-card p-5 animate-fade-in group"
                style={{ animationDelay: `${idx * 80}ms` }}
              >
                {/* Platform badge */}
                <div className="flex items-center justify-between mb-4">
                  <div className={`px-3 py-1 rounded-full text-xs font-medium bg-gradient-to-r ${meta.gradient} text-white`}>
                    {meta.label}
                  </div>
                  <div className="flex items-center gap-1">
                    {acc.token_status === 'connected' ? (
                      <span className="badge badge-active">
                        <CheckCircle2 size={12} /> Connected
                      </span>
                    ) : (
                      <span className="badge badge-failed">
                        <AlertTriangle size={12} /> Expired
                      </span>
                    )}
                  </div>
                </div>

                {/* Avatar + username */}
                <div className="flex items-center gap-3 mb-4">
                  <div className={`w-11 h-11 rounded-full bg-gradient-to-br ${meta.gradient} flex items-center justify-center text-white font-bold text-sm`}>
                    {acc.username.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-semibold text-sm">{acc.username}</p>
                    <p className="text-[11px] text-dark-400">Added {new Date(acc.created_at).toLocaleDateString()}</p>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => refreshAccount(acc.id)} className="btn btn-ghost flex-1 text-xs !py-2">
                    <RefreshCw size={14} /> Refresh
                  </button>
                  <button onClick={() => deleteAccount(acc.id)} className="btn btn-danger flex-1 text-xs !py-2">
                    <Trash2 size={14} /> Remove
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
