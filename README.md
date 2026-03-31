# GravityPanel

A full-stack social media management desktop app built with **FastAPI**, **Electron**, **React**, and **TailwindCSS**.

## Features

- **Post Scheduler** — Schedule posts to Instagram, YouTube, and TikTok with video upload, calendar view, and auto-posting via APScheduler.
- **DM Bot** — Instagram comment-trigger DM automation via instagrapi with anti-duplicate protection and rate limiting.
- **Analytics** — Multi-platform analytics with charts (Recharts), date range picker, and top content tracking.
- **Account Manager** — Add/remove social media accounts with encrypted credential storage (Fernet).
- **Settings** — Configure API keys, DM bot rate limits, and notification preferences.

## Tech Stack

| Layer     | Technology                                   |
| --------- | -------------------------------------------- |
| Backend   | Python 3.11+, FastAPI, SQLAlchemy, APScheduler |
| Frontend  | Electron, React 18, TailwindCSS v3, Recharts |
| Database  | SQLite                                       |
| APIs      | Meta Graph API, YouTube Data API v3, TikTok Content Posting API |
| DM Bot    | instagrapi                                   |
| Security  | cryptography (Fernet encryption)             |

## Prerequisites

- **Python 3.11+** — [python.org](https://www.python.org/downloads/)
- **Node.js 18+** — [nodejs.org](https://nodejs.org/)
- **npm** (comes with Node.js)

## Setup Instructions

### 1. Clone / Navigate to the Project

```bash
cd gravity-panel
```

### 2. Install Backend Dependencies

```bash
pip install -r requirements.txt
```

### 3. Install Frontend Dependencies

```bash
npm install
```

### 4. Start the Backend

```bash
cd backend
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

The API will be live at `http://localhost:8000`. Swagger docs at `http://localhost:8000/docs`.

### 5. Start the Frontend (Dev Mode)

In a new terminal:

```bash
npm run dev
```

Open `http://localhost:5173` in your browser.

### 6. Start as Electron Desktop App (Optional)

```bash
npm run electron
```

Or run both Vite + Electron together:

```bash
npm start
```

## Project Structure

```
gravity-panel/
├── backend/
│   ├── main.py              # FastAPI entry point
│   ├── database.py           # DB connection + encryption
│   ├── models.py             # SQLAlchemy models
│   ├── scheduler.py          # APScheduler jobs
│   ├── dm_bot.py             # Instagram DM automation
│   ├── instagram_api.py      # Meta Graph API
│   ├── youtube_api.py        # YouTube Data API
│   ├── tiktok_api.py         # TikTok API
│   └── routes/
│       ├── posts.py          # Post CRUD
│       ├── accounts.py       # Account management
│       ├── analytics.py      # Analytics endpoints
│       ├── dm.py             # DM bot endpoints
│       └── settings.py       # Settings endpoints
├── frontend/
│   ├── main.js               # Electron main process
│   ├── index.html            # HTML entry
│   └── src/
│       ├── main.jsx          # React entry
│       ├── App.jsx           # Router + layout
│       ├── api.js            # Axios instance
│       ├── index.css         # TailwindCSS + custom styles
│       ├── components/
│       │   ├── Sidebar.jsx
│       │   ├── Spinner.jsx
│       │   └── Calendar.jsx
│       └── pages/
│           ├── Dashboard.jsx
│           ├── Scheduler.jsx
│           ├── DMBot.jsx
│           ├── Analytics.jsx
│           ├── Accounts.jsx
│           └── Settings.jsx
├── package.json
├── vite.config.js
├── tailwind.config.js
├── postcss.config.js
├── requirements.txt
└── README.md
```

## Configuration

After launching, go to the **Settings** page to enter:

1. **Meta App ID & Secret** + access token for Instagram
2. **YouTube API Key** + channel ID
3. **TikTok Client Key/Secret** + access token
4. **Instagram credentials** for the DM bot (instagrapi)

All secrets are encrypted at rest using Fernet (AES-128-CBC).

## API Endpoints

| Method   | Endpoint                         | Description              |
| -------- | -------------------------------- | ------------------------ |
| `GET`    | `/api/posts`                     | List scheduled posts     |
| `POST`   | `/api/posts`                     | Create scheduled post    |
| `DELETE`  | `/api/posts/{id}`               | Delete a post            |
| `GET`    | `/api/accounts`                  | List accounts            |
| `POST`   | `/api/accounts`                  | Add account              |
| `GET`    | `/api/analytics/{platform}`      | Fetch platform analytics |
| `GET`    | `/api/analytics/summary`         | Dashboard summary        |
| `POST`   | `/api/dm/watchers`               | Create DM watcher        |
| `GET`    | `/api/dm/logs`                   | DM activity log          |
| `GET`    | `/api/settings`                  | Get settings             |
| `PUT`    | `/api/settings`                  | Update settings          |

## License

Private — All rights reserved.
