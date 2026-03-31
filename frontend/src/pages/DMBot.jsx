import React, { useEffect, useState, useCallback } from 'react';
import {
  Plus,
  X,
  MessageSquareMore,
  Trash2,
  Power,
  Send,
  Activity,
  AlertCircle,
  LogIn,
} from 'lucide-react';
import toast from 'react-hot-toast';
import Spinner from '../components/Spinner';
import api from '../api';

export default function DMBot() {
  const [watchers, setWatchers] = useState([]);
  const [logs, setLogs] = useState([]);
  const [botStatus, setBotStatus] = useState({ logged_in: false });
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // form state
  const [postUrl, setPostUrl] = useState('');
  const [triggerKeyword, setTriggerKeyword] = useState('');
  const [dmTemplate, setDmTemplate] = useState('Hey {username}! Thanks for your interest. Here\'s the link: ');
  const [interval, setInterval_] = useState(5);
  const [maxDms, setMaxDms] = useState(10);

  // login state
  const [igUsername, setIgUsername] = useState('');
  const [igPassword, setIgPassword] = useState('');
  const [igCode, setIgCode] = useState('');
  const [needs2FA, setNeeds2FA] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [watchersRes, logsRes, statusRes] = await Promise.all([
        api.get('/api/dm/watchers'),
        api.get('/api/dm/logs', { params: { limit: 50 } }),
        api.get('/api/dm/status'),
      ]);
      setWatchers(Array.isArray(watchersRes.data) ? watchersRes.data : []);
      setLogs(logsRes.data?.logs || []);
      setBotStatus(statusRes.data);
    } catch {
      toast.error('Failed to load DM bot data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Login
  const handleLogin = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post('/api/dm/login', {
        username: igUsername,
        password: igPassword,
        verification_code: igCode,
      });
      toast.success('Logged into Instagram');
      setShowLogin(false);
      setNeeds2FA(false);
      fetchData();
    } catch (err) {
      const detail = err?.response?.data?.detail;
      if (detail?.error === '2FA_REQUIRED') {
        setNeeds2FA(true);
        toast('Enter your 2FA code', { icon: '🔐' });
      } else {
        toast.error(detail?.message || detail?.error || 'Login failed');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleLogout = async () => {
    try {
      await api.post('/api/dm/logout');
      toast.success('Logged out');
      fetchData();
    } catch {
      toast.error('Logout failed');
    }
  };

  // Create watcher
  const handleCreateWatcher = async (e) => {
    e.preventDefault();
    if (!postUrl || !triggerKeyword || !dmTemplate) {
      toast.error('Fill all required fields');
      return;
    }
    setSubmitting(true);
    try {
      await api.post('/api/dm/watchers', {
        post_url: postUrl,
        trigger_keyword: triggerKeyword,
        dm_template: dmTemplate,
        check_interval_minutes: interval,
        max_dms_per_hour: maxDms,
      });
      toast.success('Watcher created');
      setShowForm(false);
      setPostUrl(''); setTriggerKeyword('');
      fetchData();
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Failed to create watcher');
    } finally {
      setSubmitting(false);
    }
  };

  // Toggle watcher
  const toggleWatcher = async (id, currentActive) => {
    try {
      await api.put(`/api/dm/watchers/${id}`, { is_active: !currentActive });
      toast.success(`Watcher ${!currentActive ? 'activated' : 'paused'}`);
      fetchData();
    } catch {
      toast.error('Failed to update watcher');
    }
  };

  // Delete watcher
  const deleteWatcher = async (id) => {
    try {
      await api.delete(`/api/dm/watchers/${id}`);
      toast.success('Watcher deleted');
      fetchData();
    } catch {
      toast.error('Failed to delete watcher');
    }
  };

  if (loading) return <Spinner size="lg" className="py-24" />;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">DM Bot</h1>
          <p className="text-sm text-dark-300 mt-1">Automate Instagram DMs based on comment triggers.</p>
        </div>
        <div className="flex items-center gap-3">
          {botStatus.logged_in ? (
            <>
              <span className="badge badge-active">
                <span className="w-2 h-2 rounded-full bg-success-400 animate-pulse" /> Connected
              </span>
              <button onClick={handleLogout} className="btn btn-ghost text-xs">Logout</button>
            </>
          ) : (
            <button onClick={() => setShowLogin(true)} className="btn btn-primary">
              <LogIn size={16} /> Login to Instagram
            </button>
          )}
          <button onClick={() => setShowForm(!showForm)} className="btn btn-primary">
            {showForm ? <X size={16} /> : <Plus size={16} />}
            {showForm ? 'Cancel' : 'New Watcher'}
          </button>
        </div>
      </div>

      {/* Login modal */}
      {showLogin && (
        <div className="glass-card p-6 animate-fade-in">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <LogIn size={18} className="text-accent-400" /> Instagram Login
          </h2>
          <form onSubmit={handleLogin} className="space-y-4 max-w-md">
            <input className="input" placeholder="Username" value={igUsername} onChange={(e) => setIgUsername(e.target.value)} />
            <input className="input" type="password" placeholder="Password" value={igPassword} onChange={(e) => setIgPassword(e.target.value)} />
            {needs2FA && (
              <input className="input" placeholder="2FA Code" value={igCode} onChange={(e) => setIgCode(e.target.value)} />
            )}
            <div className="flex gap-3">
              <button type="submit" disabled={submitting} className="btn btn-primary">
                {submitting ? <Spinner size="sm" /> : <LogIn size={16} />}
                {needs2FA ? 'Verify' : 'Login'}
              </button>
              <button type="button" onClick={() => { setShowLogin(false); setNeeds2FA(false); }} className="btn btn-ghost">Cancel</button>
            </div>
          </form>
        </div>
      )}

      {/* New Watcher Form */}
      {showForm && (
        <form onSubmit={handleCreateWatcher} className="glass-card p-6 space-y-5 animate-fade-in">
          <h2 className="text-lg font-semibold">Create Comment Watcher</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-medium text-dark-200 mb-1.5">Post URL *</label>
              <input className="input" value={postUrl} onChange={(e) => setPostUrl(e.target.value)} placeholder="https://instagram.com/p/..." />
            </div>
            <div>
              <label className="block text-xs font-medium text-dark-200 mb-1.5">Trigger Keyword *</label>
              <input className="input" value={triggerKeyword} onChange={(e) => setTriggerKeyword(e.target.value)} placeholder="e.g. INFO, LINK, FREE" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-dark-200 mb-1.5">DM Template * <span className="text-dark-400">(use {'{username}'} for commenter's name)</span></label>
            <textarea className="input min-h-[80px] resize-y" value={dmTemplate} onChange={(e) => setDmTemplate(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-medium text-dark-200 mb-1.5">Check Interval (min)</label>
              <input type="number" className="input" value={interval} onChange={(e) => setInterval_(+e.target.value)} min={1} />
            </div>
            <div>
              <label className="block text-xs font-medium text-dark-200 mb-1.5">Max DMs / Hour</label>
              <input type="number" className="input" value={maxDms} onChange={(e) => setMaxDms(+e.target.value)} min={1} />
            </div>
          </div>
          <div className="flex justify-end">
            <button type="submit" disabled={submitting} className="btn btn-primary">
              {submitting ? <Spinner size="sm" /> : <MessageSquareMore size={16} />}
              Create Watcher
            </button>
          </div>
        </form>
      )}

      {/* Active Watchers */}
      <div className="glass-card p-6">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Activity size={18} className="text-accent-400" />
          Active Watchers ({watchers.length})
        </h2>

        {watchers.length === 0 ? (
          <div className="text-center py-12 text-dark-300">
            <MessageSquareMore size={40} className="mx-auto mb-3 opacity-40" />
            <p className="text-sm">No watchers configured. Create one above.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {watchers.map((w) => (
              <div key={w.id} className="flex items-center justify-between p-4 rounded-lg bg-dark-700/30 border border-dark-600/20 hover:border-dark-500/40 transition group">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`badge ${w.is_active ? 'badge-active' : 'badge-inactive'}`}>
                      {w.is_active ? 'Active' : 'Paused'}
                    </span>
                    <span className="text-xs text-dark-300">Trigger: <strong className="text-accent-300">{w.trigger_keyword}</strong></span>
                  </div>
                  <p className="text-sm text-dark-200 truncate">{w.post_url}</p>
                  <p className="text-[11px] text-dark-400 mt-1">Every {w.check_interval_minutes}min • Max {w.max_dms_per_hour} DMs/hr</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => toggleWatcher(w.id, w.is_active)}
                    className={`p-2 rounded-lg transition ${w.is_active ? 'text-success-400 hover:bg-success-500/10' : 'text-dark-400 hover:bg-dark-500/30'}`}
                    title={w.is_active ? 'Pause' : 'Activate'}
                  >
                    <Power size={16} />
                  </button>
                  <button
                    onClick={() => deleteWatcher(w.id)}
                    className="p-2 rounded-lg text-dark-400 hover:text-danger-400 hover:bg-danger-500/10 transition opacity-0 group-hover:opacity-100"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Activity Log */}
      <div className="glass-card p-6">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Send size={18} className="text-accent-400" />
          Activity Log
        </h2>

        {logs.length === 0 ? (
          <p className="text-sm text-dark-300 text-center py-8">No DM activity yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-dark-600/40 text-dark-300 text-xs uppercase tracking-wider">
                  <th className="text-left py-3 px-2">Username</th>
                  <th className="text-left py-3 px-2">Comment</th>
                  <th className="text-left py-3 px-2">DM Sent</th>
                  <th className="text-left py-3 px-2">Time</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id} className="border-b border-dark-700/30 hover:bg-dark-700/20 transition">
                    <td className="py-3 px-2 font-medium">@{log.commenter_username}</td>
                    <td className="py-3 px-2 text-dark-200 max-w-[200px] truncate">{log.comment_text}</td>
                    <td className="py-3 px-2">
                      {log.dm_sent ? (
                        <span className="badge badge-posted"><CheckCircle2 size={12} /> Sent</span>
                      ) : (
                        <span className="badge badge-failed"><AlertCircle size={12} /> Failed</span>
                      )}
                    </td>
                    <td className="py-3 px-2 text-dark-400 text-xs">{new Date(log.created_at).toLocaleString()}</td>
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
