# Hidden Gambit — New PC Setup Guide

Everything you need to get this project running from scratch on a new Windows machine.

---

## 🔑 Step 0 — Save This Before Wiping Your Old PC

Create a file called `.env` in the project root with this exact content:

```
DATABASE_URL=postgresql://postgres.gisqgpgtxyuayngzutep:Vasu%409562716206@aws-1-ap-southeast-1.pooler.supabase.com:5432/postgres
PORT=5000
```

> ⚠️ This file is NOT in GitHub (intentionally). Without it the API will crash on startup.

---

## 📋 Step 1 — Install Required Software

Install these in order. Each link goes to the official download page.

### 1. Node.js v24
- Download from: https://nodejs.org/en/download
- Choose **Windows Installer (.msi)** — LTS or latest
- After install, verify in PowerShell:
  ```powershell
  node --version   # should show v24.x.x
  npm --version    # should show 11.x.x
  ```

### 2. pnpm (package manager)
This project uses `pnpm` instead of `npm`. Install it after Node:
```powershell
npm install -g pnpm
pnpm --version   # should show 10.x.x or higher
```

### 3. Git
- Download from: https://git-scm.com/download/win
- Use all default options during install
- Verify:
  ```powershell
  git --version
  ```

### 4. VS Code (optional but recommended)
- Download from: https://code.visualstudio.com/

---

## 📥 Step 2 — Clone the Repository

Open **PowerShell** and run:

```powershell
git clone https://github.com/vasudev196006/Hidden-Gambit.git
cd Hidden-Gambit
git checkout investigation_80%
```

---

## 🔐 Step 3 — Create the .env File

Inside the `Hidden-Gambit` folder, create a file named `.env` (no extension) with:

```
DATABASE_URL=postgresql://postgres.gisqgpgtxyuayngzutep:Vasu%409562716206@aws-1-ap-southeast-1.pooler.supabase.com:5432/postgres
PORT=5000
```

**How to create it in PowerShell:**
```powershell
@"
DATABASE_URL=postgresql://postgres.gisqgpgtxyuayngzutep:Vasu%409562716206@aws-1-ap-southeast-1.pooler.supabase.com:5432/postgres
PORT=5000
"@ | Out-File -FilePath .env -Encoding utf8
```

---

## 📦 Step 4 — Install Dependencies

From inside the `Hidden-Gambit` folder:

```powershell
pnpm install
```

This installs everything for the entire workspace (frontend + backend + shared libs) in one command.

---

## 🏗️ Step 5 — Build the API Server

The `start.ps1` script uses a pre-built version of the API. Build it once:

```powershell
pnpm --filter @workspace/api-server run build
```

If that fails, try:
```powershell
cd artifacts/api-server
pnpm run build
cd ../..
```

---

## ▶️ Step 6 — Run the App

From the project root:

```powershell
.\start.ps1
```

This will:
- Start the **API server** on `http://localhost:5000` (in a separate window)
- Start the **Frontend** on `http://localhost:3000`

Open your browser at **http://localhost:3000** 🎉

---

## 🔁 Alternative: Run in Dev Mode (hot reload)

If you want to edit code and see changes live:

```powershell
.\run-dev.ps1
```

---

## 🐛 Troubleshooting

### "pnpm: command not found"
```powershell
npm install -g pnpm
```

### "Cannot be loaded because running scripts is disabled"
PowerShell execution policy issue. Run this once:
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```
Then try `.\start.ps1` again.

### "Error: .env file not found"
You forgot to create the `.env` file. Go back to **Step 3**.

### "Cannot connect to database" / DB errors
- Check your internet connection (the database is on Supabase's cloud)
- Make sure the `DATABASE_URL` in `.env` is exactly correct (no extra spaces)
- Check https://supabase.com — log in with your account to verify the project is active

### "Port 5000 already in use"
Something else is using port 5000. Kill it:
```powershell
netstat -ano | findstr :5000
# Note the PID (last column), then:
taskkill /PID <PID> /F
```

### Dependencies broken / weird errors after reinstall
Nuclear option — delete everything and reinstall:
```powershell
Remove-Item -Recurse -Force node_modules
Remove-Item -Recurse -Force artifacts/api-server/node_modules
Remove-Item -Recurse -Force artifacts/deception-chess/node_modules
pnpm install
```

---

## 📁 Project Structure (for reference)

```
Hidden-Gambit/
├── artifacts/
│   ├── api-server/        ← Express backend (Node.js + TypeScript)
│   └── deception-chess/   ← React frontend (Vite)
├── lib/
│   └── db/                ← Drizzle ORM + Supabase schema
├── start.ps1              ← Run this to start everything
├── run-dev.ps1            ← Dev mode with hot reload
└── .env                   ← YOU must create this (not in GitHub)
```

---

## ☁️ Services Used (all cloud, nothing local)

| Service | What it does | Login |
|---------|-------------|-------|
| **Supabase** | PostgreSQL database | https://supabase.com |
| **GitHub** | Code repository | https://github.com/vasudev196006/Hidden-Gambit |

The database lives in the cloud — your game data and schema are safe even after wiping the PC.

---

*Last updated: June 2026 | Branch: investigation_80%*
