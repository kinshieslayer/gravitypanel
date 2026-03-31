import React, { useEffect, useState, useCallback } from 'react';
import {
  Plus,
  Upload,
  X,
  Clock,
  CheckCircle2,
  XCircle,
  Trash2,
  CalendarDays,
} from 'lucide-react';
import toast from 'react-hot-toast';
import Calendar from '../components/Calendar';
import Spinner from '../components/Spinner';
import api from '../api';

const PLATFORMS = ['instagram', 'youtube', 'tiktok'];

export default function Scheduler() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(new Date());

  // form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [hashtags, setHashtags] = useState('');
  const [platforms, setPlatforms] = useState([]);
  const [scheduledTime, setScheduledTime] = useState('');
  const [videoFile, setVideoFile] = useState(null);
  const [videoPreview, setVideoPreview] = useState(null);

  const handleFileChange = (e) => {
    if (videoPreview) {
      URL.revokeObjectURL(videoPreview);
    }
    const file = e.target.files[0];
    if (file) {
      setVideoFile(file);
      setVideoPreview(URL.createObjectURL(file));
    } else {
      setVideoFile(null);
      setVideoPreview(null);
    }
  };

  const fetchPosts = useCallback(async () => {
    try {
      const res = await api.get('/api/posts');
      setPosts(Array.isArray(res.data) ? res.data : []);
    } catch {
      toast.error('Failed to load posts');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchPosts(); }, [fetchPosts]);

  const togglePlatform = (p) =>
    setPlatforms((prev) => (prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]));

  const resetForm = () => {
    if (videoPreview) URL.revokeObjectURL(videoPreview);
    setTitle(''); setDescription(''); setHashtags('');
    setPlatforms([]); setScheduledTime(''); setVideoFile(null);
    setVideoPreview(null);
    setShowForm(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title || !platforms.length || !scheduledTime || !videoFile) {
      toast.error('Please fill all required fields');
      return;
    }

    setSubmitting(true);
    try {
      const form = new FormData();
      form.append('title', title);
      form.append('description', description);
      form.append('hashtags', hashtags);
      form.append('platforms', platforms.join(','));
      form.append('scheduled_time', scheduledTime);
      form.append('video', videoFile);

      await api.post('/api/posts', form, { headers: { 'Content-Type': 'multipart/form-data' } });
      toast.success('Post scheduled!');
      resetForm();
      fetchPosts();
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Failed to schedule post');
    } finally {
      setSubmitting(false);
    }
  };

  const deletePost = async (id) => {
    try {
      await api.delete(`/api/posts/${id}`);
      toast.success('Post deleted');
      fetchPosts();
    } catch {
      toast.error('Failed to delete post');
    }
  };

  const statusIcon = {
    pending: <Clock size={14} className="text-warning-400" />,
    posted: <CheckCircle2 size={14} className="text-success-400" />,
    failed: <XCircle size={14} className="text-danger-400" />,
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Post Scheduler</h1>
          <p className="text-sm text-dark-300 mt-1">Schedule and manage posts across platforms.</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="btn btn-primary">
          {showForm ? <X size={16} /> : <Plus size={16} />}
          {showForm ? 'Cancel' : 'New Post'}
        </button>
      </div>

      {/* New Post Form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="glass-card p-6 space-y-5 animate-fade-in">
          <h2 className="text-lg font-semibold">Schedule New Post</h2>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-medium text-dark-200 mb-1.5">Title *</label>
              <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Post title" />
            </div>
            <div>
              <label className="block text-xs font-medium text-dark-200 mb-1.5">Hashtags / Tags</label>
              <input className="input" value={hashtags} onChange={(e) => setHashtags(e.target.value)} placeholder="#viral, #trending" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-dark-200 mb-1.5">Description</label>
            <textarea className="input min-h-[80px] resize-y" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Post description..." />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* Platforms */}
            <div>
              <label className="block text-xs font-medium text-dark-200 mb-1.5">Platforms *</label>
              <div className="flex gap-2">
                {PLATFORMS.map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => togglePlatform(p)}
                    className={`px-3 py-2 rounded-lg text-xs font-medium capitalize transition-all ${
                      platforms.includes(p)
                        ? 'bg-accent-600/20 text-accent-300 ring-1 ring-accent-500/40'
                        : 'bg-dark-600/40 text-dark-200 hover:bg-dark-500/50'
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            {/* Date/Time */}
            <div>
              <label className="block text-xs font-medium text-dark-200 mb-1.5">Schedule Date & Time *</label>
              <input
                type="datetime-local"
                className="input"
                value={scheduledTime}
                onChange={(e) => setScheduledTime(e.target.value)}
              />
            </div>

            {/* Video Upload */}
            <div>
              <label className="block text-xs font-medium text-dark-200 mb-1.5">Video File *</label>
              <label className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-dark-600/40 border border-dark-500/50 cursor-pointer hover:bg-dark-500/50 transition text-sm text-dark-200">
                <Upload size={16} className="shrink-0" />
                <span className="truncate">{videoFile ? videoFile.name : 'Choose video…'}</span>
                <input type="file" accept="video/*" className="hidden" onChange={handleFileChange} />
              </label>
            </div>
          </div>

          {/* Video Preview Player */}
          {videoPreview && (
            <div className="mt-4 rounded-lg flex items-center gap-4 bg-dark-800/50 p-4 border border-dark-600/30">
              <div className="rounded overflow-hidden bg-black flex justify-center shadow-lg border border-dark-600/50 shrink-0">
                <video 
                  src={videoPreview} 
                  controls 
                  className="max-h-[200px] w-auto object-contain"
                />
              </div>
              <div className="flex-1 text-xs text-dark-300">
                <p className="font-medium text-dark-200 mb-1">Previewing: {videoFile?.name}</p>
                <p>Use the player controls to review your clip before scheduling to ensure it is the correct cut.</p>
              </div>
            </div>
          )}

          <div className="flex justify-end pt-4 mt-2 border-t border-dark-600/30">
            <button type="submit" disabled={submitting} className="btn btn-primary">
              {submitting ? <Spinner size="sm" /> : <CalendarDays size={16} />}
              {submitting ? 'Scheduling…' : 'Schedule Post'}
            </button>
          </div>
        </form>
      )}

      {/* Calendar + Table layout */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Calendar */}
        <div className="xl:col-span-1">
          <Calendar
            posts={posts}
            month={calendarMonth}
            onPrev={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1))}
            onNext={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1))}
          />
        </div>

        {/* Posts List */}
        <div className="xl:col-span-2 glass-card p-5">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <CalendarDays size={18} className="text-accent-400" />
            All Scheduled Posts
          </h2>

          {loading ? (
            <Spinner size="md" className="py-12" />
          ) : posts.length === 0 ? (
            <div className="text-center py-16 text-dark-300">
              <CalendarDays size={40} className="mx-auto mb-3 opacity-40" />
              <p className="text-sm">No posts scheduled. Click "New Post" to get started.</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
              {posts.map((post) => (
                <div
                  key={post.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-dark-700/30 border border-dark-600/20 hover:border-dark-500/40 transition group"
                >
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className="pt-0.5">{statusIcon[post.status]}</div>
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate">{post.title}</p>
                      <div className="flex items-center gap-2 mt-1">
                        {post.platforms.split(',').map((p) => (
                          <span key={p} className="text-[10px] uppercase tracking-wider text-dark-300 bg-dark-600/40 px-1.5 py-0.5 rounded">
                            {p.trim()}
                          </span>
                        ))}
                        <span className="text-[11px] text-dark-400">
                          {new Date(post.scheduled_time).toLocaleString()}
                        </span>
                      </div>
                      {post.error_message && (
                        <p className="text-[11px] text-danger-400 mt-1 truncate">{post.error_message}</p>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => deletePost(post.id)}
                    className="p-2 rounded-lg text-dark-400 hover:text-danger-400 hover:bg-danger-500/10 transition opacity-0 group-hover:opacity-100"
                    title="Delete post"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
