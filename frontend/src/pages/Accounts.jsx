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
  const [displayName, setDisplayName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
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

      await api.post('/api/accounts', { 
        platform, 
        username, 
        display_name: displayName,
        avatar_url: avatarUrl,
        credentials: creds 
      });
      
      toast.success('Account added');
      setShowForm(false);
      setUsername(''); setDisplayName(''); setAvatarUrl(''); setAccessToken(''); setApiKey('');
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
          <p className="text-sm text-dark-300 mt-1">Manage your professional social media presence.</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="btn btn-primary">
          {showForm ? <X size={16} /> : <Plus size={16} />}
          {showForm ? 'Cancel' : 'Connect Account'}
        </button>
      </div>

      {/* Add Account Form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="glass-card p-6 space-y-5 animate-fade-in">
          <h2 className="text-lg font-semibold text-accent-400">Connect New Account</h2>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            <div className="lg:col-span-1">
              <label className="block text-xs font-medium text-dark-200 mb-2">Platform</label>
              <div className="flex flex-wrap gap-2">
                {Object.entries(PLATFORM_META).map(([key, meta]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setPlatform(key)}
                    className={`px-4 py-2 rounded-lg text-xs font-medium capitalize transition-all border ${
                      platform === key
                        ? `bg-gradient-to-r ${meta.gradient} text-white border-transparent shadow-lg`
                        : 'bg-dark-700/40 text-dark-300 border-dark-600/50 hover:bg-dark-600/60'
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
            <div>
              <label className="block text-xs font-medium text-dark-200 mb-1.5">Display Name</label>
              <input className="input" value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="e.g. My Business Page" />
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-medium text-dark-200 mb-1.5">Avatar URL (Optional)</label>
              <input className="input" value={avatarUrl} onChange={(e) => setAvatarUrl(e.target.value)} placeholder="https://..." />
            </div>
            <div>
              <label className="block text-xs font-medium text-dark-200 mb-1.5">Access Token</label>
              <input className="input" type="password" value={accessToken} onChange={(e) => setAccessToken(e.target.value)} placeholder="Paste your token here" />
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button type="submit" disabled={submitting} className="btn btn-primary px-8">
              {submitting ? <Spinner size="sm" /> : <Plus size={16} />}
              Connect Account
            </button>
          </div>
        </form>
      )}

      {/* Accounts Grid */}
      {accounts.length === 0 ? (
        <div className="glass-card p-20 text-center text-dark-300">
          <div className="w-16 h-16 rounded-2xl bg-dark-700/50 flex items-center justify-center mx-auto mb-4 border border-dark-600/30">
            <Users size={32} className="opacity-20" />
          </div>
          <h3 className="text-lg font-medium text-white mb-1">No Accounts Connected</h3>
          <p className="text-sm max-w-xs mx-auto">Click "Connect Account" to start managing multiple profiles from one place.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {accounts.map((acc, idx) => {
            const meta = PLATFORM_META[acc.platform] || PLATFORM_META.instagram;
            return (
              <div
                key={acc.id}
                className="glass-card overflow-hidden animate-fade-in group hover:border-accent-500/30 transition-all duration-300"
                style={{ animationDelay: `${idx * 100}ms` }}
              >
                {/* Visual Header */}
                <div className={`h-2 bg-gradient-to-r ${meta.gradient}`} />
                
                <div className="p-5">
                  {/* Status & Menu */}
                  <div className="flex items-center justify-between mb-5">
                    <div className="flex items-center gap-2">
                       {acc.platform === 'instagram' ? <Instagram size={14} className="text-pink-400" /> : <Youtube size={14} className="text-red-400" />}
                       <span className="text-[10px] font-bold uppercase tracking-widest text-dark-300">{meta.label}</span>
                    </div>
                    {acc.token_status === 'connected' ? (
                      <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-success-500/10 text-success-400 text-[10px] font-medium border border-success-500/20">
                        <div className="w-1 h-1 rounded-full bg-success-400 animate-pulse" /> Live
                      </span>
                    ) : (
                      <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-danger-500/10 text-danger-400 text-[10px] font-medium border border-danger-500/20">
                        <AlertTriangle size={10} /> Re-auth
                      </span>
                    )}
                  </div>

                  {/* Profile Info */}
                  <div className="flex items-center gap-4 mb-6">
                    <div className="relative">
                      {acc.avatar_url ? (
                        <img src={acc.avatar_url} alt={acc.username} className="w-14 h-14 rounded-2xl object-cover border-2 border-dark-600/50 shadow-xl" />
                      ) : (
                        <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${meta.gradient} flex items-center justify-center text-white font-bold text-xl shadow-xl`}>
                          {acc.username.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-lg bg-dark-800 border border-dark-600 flex items-center justify-center">
                         {acc.platform === 'instagram' ? <Instagram size={10} /> : <Youtube size={10} />}
                      </div>
                    </div>
                    <div>
                      <h4 className="font-bold text-white text-base leading-tight mb-0.5">{acc.display_name || acc.username}</h4>
                      <p className="text-xs text-dark-300 mb-1">@{acc.username}</p>
                      <div className="flex items-center gap-3">
                         <span className="text-[10px] text-accent-400 font-semibold">{acc.follower_count?.toLocaleString() || 0} followers</span>
                      </div>
                    </div>
                  </div>

                  {/* Quick Stats */}
                  <div className="grid grid-cols-2 gap-2 mb-6">
                    <div className="bg-dark-700/30 rounded-lg p-2 border border-dark-600/20">
                       <p className="text-[9px] uppercase tracking-tighter text-dark-400 font-bold mb-0.5">Connected</p>
                       <p className="text-xs text-white font-medium">{new Date(acc.created_at).toLocaleDateString()}</p>
                    </div>
                    <div className="bg-dark-700/30 rounded-lg p-2 border border-dark-600/20">
                       <p className="text-[9px] uppercase tracking-tighter text-dark-400 font-bold mb-0.5">Last Sync</p>
                       <p className="text-xs text-white font-medium">Just now</p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    <button 
                      onClick={() => refreshAccount(acc.id)} 
                      className="flex-1 h-9 rounded-lg bg-dark-600/50 hover:bg-dark-500/70 border border-dark-500/30 text-dark-100 text-xs font-medium transition-all flex items-center justify-center gap-2"
                    >
                      <RefreshCw size={14} className="group-hover:rotate-180 transition-transform duration-500" /> Sync
                    </button>
                    <button 
                      onClick={() => deleteAccount(acc.id)} 
                      className="w-9 h-9 rounded-lg bg-danger-500/10 hover:bg-danger-500 text-danger-400 hover:text-white border border-danger-500/20 transition-all flex items-center justify-center"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
