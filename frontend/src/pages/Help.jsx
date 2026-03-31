import React from 'react';
import { HelpCircle, Key, Users, CalendarClock, MessageSquareMore, BarChart3, ChevronRight, BookOpen } from 'lucide-react';

export default function Help() {
  const integrationGuides = [
    {
      platform: 'YouTube',
      color: 'text-red-500',
      bgColor: 'bg-red-500/10',
      steps: [
        'Go to the Google Cloud Console and create a new project.',
        'Navigate to "APIs & Services" > "Library" and enable "YouTube Data API v3".',
        'Go to "Credentials" and "Create Credentials" > "API key".',
        'Copy the API key and paste it into the YouTube API Key field in the Settings tab.',
        'Find your YouTube Channel ID (e.g. UCxxxx) in your YouTube Advanced Settings and paste it in the Settings tab.',
      ],
    },
    {
      platform: 'Instagram (Meta)',
      color: 'text-pink-500',
      bgColor: 'bg-pink-500/10',
      steps: [
        'Go to the Meta for Developers portal and create an app.',
        'Add the "Instagram Graph API" product to your app.',
        'Generate a System User Access Token or a long-lived User Access Token with the required permissions (instagram_basic, instagram_manage_insights).',
        'Paste the Token and your Instagram Professional Account User ID into the Meta settings.',
      ],
    },
    {
      platform: 'TikTok',
      color: 'text-teal-400',
      bgColor: 'bg-teal-400/10',
      steps: [
        'Go to the TikTok for Developers portal.',
        'Create an application and apply for the "Content Posting API" scope.',
        'Generate your Access Token.',
        'Paste the Developer Token into the TikTok configuration in the Settings tab.',
      ],
    },
  ];

  const usingTheApp = [
    {
      title: 'Connecting Accounts',
      icon: Users,
      desc: 'Go to the Accounts tab to connect multiple professional profiles. You can add unique profile pictures and display names for each brand you manage.',
    },
    {
      title: 'Scheduling Posts',
      icon: CalendarClock,
      desc: 'Upload videos and write captions, then use the Visual Account Picker to choose which specific profiles should receive the post. You can select multiple accounts at once!',
    },
    {
      title: 'DM Bot Automation',
      icon: MessageSquareMore,
      desc: 'The DM Bot uses your Instagram Username and Password to log in directly. You can set it to "Watch" specific posts. If someone comments your trigger word, it automatically DMs them your message!',
    },
    {
      title: 'Viewing Analytics',
      icon: BarChart3,
      desc: 'The Analytics tab connects via your provided API keys. If you see "No Analytics Displayed," make sure you have generated the keys and entered them into the Settings tab, then click Fetch.',
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Help & Documentation</h1>
        <p className="text-sm text-dark-300 mt-1">
          Learn how to configure your API keys and use GravityPanel.
        </p>
      </div>

      {/* Guide Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="glass-card p-6 h-full">
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
            <Key size={18} className="text-accent-400" /> Connecting Platforms
          </h2>
          <p className="text-sm text-dark-300 mb-6">
            To use the Dashboard, you must provide your own API keys. GravityPanel does not come with keys pre-installed. Follow the steps below for each provider.
          </p>
          <div className="space-y-6">
            {integrationGuides.map((guide, idx) => (
              <div key={idx} className="bg-dark-800/50 rounded-lg p-4 border border-dark-600/30">
                <h3 className={`text-sm font-bold flex items-center gap-2 mb-3 ${guide.color}`}>
                  <div className={`w-2 h-2 rounded-full ${guide.bgColor} border border-current`} />
                  {guide.platform}
                </h3>
                <ul className="space-y-2">
                  {guide.steps.map((step, sIdx) => (
                    <li key={sIdx} className="text-xs text-dark-200 flex items-start gap-2">
                      <ChevronRight size={14} className="mt-0.5 text-dark-500 shrink-0" />
                      <span className="leading-relaxed">{step}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="glass-card p-6 h-full">
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
            <BookOpen size={18} className="text-purple-400" /> Using GravityPanel
          </h2>
          <p className="text-sm text-dark-300 mb-6">
            Once your API keys are registered, follow these steps to manage your content.
          </p>
          <div className="space-y-4">
            {usingTheApp.map((item, idx) => (
              <div key={idx} className="flex gap-4 p-4 rounded-lg bg-dark-700/30 border border-dark-600/30 hover:border-dark-500/50 transition">
                <div className="w-10 h-10 rounded-xl bg-dark-800 flex items-center justify-center shrink-0 shadow-inner">
                  <item.icon size={18} className="text-accent-300" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold">{item.title}</h4>
                  <p className="text-xs text-dark-300 mt-1 leading-relaxed">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
