# 🌷 Peachy Tasks — Cute To-do List

A full-stack To-do List web app built with **HTML, CSS, JavaScript, Node.js, Express and SQLite**. Responsive pastel interface, CRUD task management, status updates and dashboard statistics.

## Features
- Create, view, edit and delete tasks.
- Update task status: To do / In progress / Completed.
- Set category, priority and due date.
- Search by task title or description; filter by status and category; sort tasks.
- Dashboard statistics: total, in progress, completed and overdue tasks.
- SQLite database is created automatically at `data/tasks.db`.
- Responsive layout for desktop, tablet and mobile.

## Requirements
- Node.js 18 or newer
- npm

## Run locally
```bash
# 1. Install dependencies
npm install

# 2. Start the server
npm start

# 3. Open in your browser
http://localhost:3000
```

For development with auto-restart:
```bash
npm run dev
```

## Database
SQLite database file: `data/tasks.db`. The `tasks` table is created automatically on first run. The database stores task title, description, category, priority, status, due date and timestamps.

> The `data/` folder is excluded from Git so your local database is not accidentally committed. SQLite data is local to the machine/container where the server runs.

## API endpoints

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/tasks` | List tasks. Supports `search`, `status`, `category` query params |
| GET | `/api/stats` | Dashboard statistics |
| POST | `/api/tasks` | Create a task |
| PUT | `/api/tasks/:id` | Edit a task |
| PATCH | `/api/tasks/:id/status` | Update task status |
| DELETE | `/api/tasks/:id` | Delete a task |

Example request body:
```json
{
  "title": "Finish web assignment",
  "description": "Complete the UI and test CRUD",
  "category": "Study",
  "priority": "high",
  "status": "todo",
  "due_date": "2026-12-01"
}
```

## Upload to GitHub
1. Create a new empty repository on GitHub.
2. Extract this project ZIP.
3. Open a terminal in the extracted `cutie-todo` folder and run:
```bash
git init
git add .
git commit -m "Initial commit - Peachy Tasks To-do app"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPOSITORY.git
git push -u origin main
```
4. Replace `YOUR_USERNAME` and `YOUR_REPOSITORY` with your GitHub details.

## Project structure
```text
cutie-todo/
├── public/
│   ├── index.html
│   ├── style.css
│   └── app.js
├── data/              # created automatically; ignored by Git
├── .gitignore
├── package.json
├── server.js
└── README.md
```

## Deployment note
This app needs a Node.js hosting service (not GitHub Pages alone), because Express and SQLite run on a server. For deployment, choose a host that supports persistent disk storage and mount the SQLite database on that disk. If the host has an ephemeral filesystem, database changes may disappear after redeploy/restart.
