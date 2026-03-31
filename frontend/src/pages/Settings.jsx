import React, { useEffect, useState } from 'react';
import {
  Settings as SettingsIcon,
  Save,
  Key,
  Shield,
  Bot,
  Bell,
  Eye,
  EyeOff,
} from 'lucide-react';
import toast from 'react-hot-toast';
import Spinner from '../components/Spinner';
import api from '../api';

const SETTING_GROUPS = [
  {
    title: 'Meta (Instagram / Facebook)',
    icon: Key,
    fields: [
      { key: 'meta_app_id', label: 'Meta App ID', secret: false },
      { key: 'meta_app_secret', label: 'Meta App Secret', secret: true },
      { key: 'meta_access_token', label: 'Meta Access Token', secret: true },
      { key: 'instagram_user_id', label: 'Instagram Business User ID', secret: false },
    ],
  },
  {
    title: 'YouTube',
    icon: Key,
    fields: [
      { key: 'youtube_api_key', label: 'YouTube API Key', secret: false },
      { key: 'youtube_channel_id', label: 'YouTube Channel ID', secret: false },
    ],
  },
  {
    title: 'TikTok',
    icon: Key,
    fields: [
      { key: 'tiktok_client_key', label: 'TikTok Client Key', secret: false },
      { key: 'tiktok_client_secret', label: 'TikTok Client Secret', secret: true },
      { key: 'tiktok_access_token', label: 'TikTok Access Token', secret: true },
    ],
  },
  {
    title: 'Instagram DM Bot (instagrapi)',
    icon: Bot,
    fields: [
      { key: 'instagram_username', label: 'Instagram Username', secret: false },
      { key: 'instagram_password', label: 'Instagram Password', secret: true },
    ],
  },
  {
    title: 'DM Bot Rate Limiting',
    icon: Shield,
    fields: [
      { key: 'dm_max_per_hour', label: 'Max DMs Per Hour', secret: false },
      { key: 'dm_check_interval', label: 'Default Check Interval (min)', secret: false },
    ],
  },
];

export default function Settings() {
  const [values, setValues] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [revealed, setRevealed] = useState({});

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await api.get('/api/settings');
        setValues(res.data || {});
      } catch {
        toast.error('Failed to load settings');
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, []);

  const handleChange = (key, value) => {
    setValues((prev) => ({ ...prev, [key]: value }));
  };

  const toggleReveal = (key) => {
    setRevealed((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const settings = Object.entries(values).map(([key, value]) => ({ key, value: String(value) }));
      await api.put('/api/settings', { settings });
      toast.success('Settings saved');
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Spinner size="lg" className="py-24" />;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
          <p className="text-sm text-dark-300 mt-1">Configure API keys, credentials, and preferences.</p>
        </div>
        <button onClick={handleSave} disabled={saving} className="btn btn-primary">
          {saving ? <Spinner size="sm" /> : <Save size={16} />}
          {saving ? 'Saving…' : 'Save All'}
        </button>
      </div>

      {/* Settings groups */}
      <div className="space-y-6">
        {SETTING_GROUPS.map((group, gIdx) => {
          const Icon = group.icon;
          return (
            <div
              key={group.title}
              className="glass-card p-6 animate-fade-in"
              style={{ animationDelay: `${gIdx * 80}ms` }}
            >
              <h2 className="text-base font-semibold mb-5 flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-accent-600/15 flex items-center justify-center">
                  <Icon size={16} className="text-accent-400" />
                </div>
                {group.title}
              </h2>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {group.fields.map((field) => (
                  <div key={field.key}>
                    <label className="block text-xs font-medium text-dark-200 mb-1.5">{field.label}</label>
                    <div className="relative">
                      <input
                        type={field.secret && !revealed[field.key] ? 'password' : 'text'}
                        className="input !pr-10"
                        value={values[field.key] || ''}
                        onChange={(e) => handleChange(field.key, e.target.value)}
                        placeholder={`Enter ${field.label.toLowerCase()}`}
                      />
                      {field.secret && (
                        <button
                          type="button"
                          onClick={() => toggleReveal(field.key)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-dark-400 hover:text-dark-200 transition"
                        >
                          {revealed[field.key] ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Notification preferences */}
      <div className="glass-card p-6 animate-fade-in">
        <h2 className="text-base font-semibold mb-5 flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-accent-600/15 flex items-center justify-center">
            <Bell size={16} className="text-accent-400" />
          </div>
          Notification Preferences
        </h2>

        <div className="space-y-4">
          {[
            { key: 'notify_post_published', label: 'Notify when a post is published' },
            { key: 'notify_post_failed', label: 'Notify when a post fails' },
            { key: 'notify_dm_sent', label: 'Notify when DMs are sent' },
          ].map((pref) => (
            <div key={pref.key} className="flex items-center justify-between py-2">
              <span className="text-sm text-dark-200">{pref.label}</span>
              <div
                className={`toggle-track ${values[pref.key] === 'true' ? 'on' : 'off'}`}
                onClick={() => handleChange(pref.key, values[pref.key] === 'true' ? 'false' : 'true')}
              >
                <div className="toggle-thumb" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
