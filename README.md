# GravityPanel 🚀
A powerful Desktop Application to automatically schedule, plan, and execute social media posts across TikTok, YouTube, and Instagram. 

Built using a **FastAPI (Python)** backend and an **Electron/React** frontend.

## 🛠️ Prerequisites
Before you begin, ensure you have installed:
- [Node.js](https://nodejs.org/) (v18+)
- [Python](https://www.python.org/downloads/) (3.10+)

---

## 🚀 How to Run Locally for Development

To test the application locally, you must run both the backend server and the frontend interface side-by-side.

### 1. Start the Python Backend
Open a terminal in the project directory, navigate to the `backend` folder, install the dependencies, and start the local API:
```bash
cd backend
pip install -r requirements.txt
python main.py
```
*(The backend will start running on port 8000).*

### 2. Start the React/Electron Frontend
Open a **new** terminal window in the main project folder. Install the Node modules and launch the Electron application:
```bash
npm install
npm run start
```

---

## 📦 How to Compile/Package the App (Windows)
If you want to convert the codebase into a portable Windows executable that you can share with people who don't have Python or Node.js installed:

```bash
# 1. Compile the backend to a hidden executable
cd backend
pip install pyinstaller
pyinstaller --name gravitypanel-backend --onefile --noconsole --collect-all fastapi --collect-all uvicorn --collect-all sqlalchemy --collect-all apscheduler --collect-all instagrapi --collect-all pydantic main.py

# 2. Package the application
cd ..
npm run pack:win
```
The compiled, ready-to-share application will be located in the `release/win-unpacked` folder!
