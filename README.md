<div align="center">

# ⚔️ CodeArena

**A full-stack competitive coding platform — built for developers, by developers.**

![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)
![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![MongoDB](https://img.shields.io/badge/MongoDB-4EA94B?style=for-the-badge&logo=mongodb&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-2CA5E0?style=for-the-badge&logo=docker&logoColor=white)
![Redis](https://img.shields.io/badge/Redis-DC382D?style=for-the-badge&logo=redis&logoColor=white)

*Solve problems. Run code securely. Track your growth.*

</div>

---

## 📌 Overview

**CodeArena** is a full-stack coding platform inspired by LeetCode, where users can solve algorithmic problems, execute code in an isolated sandbox, and monitor their progress over time.

Built on a scalable **MERN stack** architecture, CodeArena features Docker-based sandboxed execution and an asynchronous queue system to handle submissions reliably and at scale.

---

## ✨ Features

### 👤 Authentication & Authorization
- JWT-based auth stored securely in HTTP-only cookies
- User registration, login, and logout flows
- Protected routes with middleware-level authorization
- Secure session management

### 🧠 Problem Management
- Create and manage a library of coding problems
- Each problem includes:
  - Title, description, and constraints
  - Sample test cases (visible to user)
  - Hidden test cases (used for evaluation)
- Function-based execution model — just like LeetCode

### ⚡ Code Execution Engine
- **Docker-isolated sandbox** for safe, reproducible code runs
- Supported languages: **JavaScript**, **Python**
- Prevents infinite loops, unsafe syscalls, and resource abuse
- Enforces per-submission timeouts

### 🔁 Submission Pipeline
- Fully **asynchronous** submission processing
- Powered by **BullMQ** + **Redis** job queues
- Persists full submission history per user
- Returns clear verdicts:
  - ✅ Accepted
  - ❌ Wrong Answer
  - 💥 Runtime Error
  - Execution time per test case

### 📊 User Dashboard
- View your complete submission history
- Track which problems you've solved
- Quick stats: total submissions, acceptance rate

### 🌐 Real-time Updates
- **Socket.io** integration for live submission feedback
- No polling — results pushed directly to the browser

---

## 🏗️ Tech Stack

| Layer | Technologies |
|---|---|
| **Backend** | Node.js, Express.js, MongoDB, Redis, BullMQ, Docker |
| **Frontend** | React.js, Tailwind CSS, Redux Toolkit, Axios |
| **Infra** | Docker (sandbox), Socket.io (real-time), JWT (auth) |

---

## 📁 Project Structure

```
codearena/
├── backend/
│   ├── controllers/       # Route handlers
│   ├── routes/            # Express route definitions
│   ├── models/            # Mongoose schemas
│   ├── queue/             # BullMQ job producers & consumers
│   ├── sandbox/           # Docker execution logic
│   ├── utils/             # Helpers & middleware
│   └── app.js             # Entry point
│
├── frontend/
│   ├── src/
│   ├── components/        # Reusable UI components
│   ├── pages/             # Page-level components
│   ├── redux/             # State management (slices, store)
│   └── App.jsx
│
└── README.md
```

---

## 🔗 API Reference

### 🔐 Auth

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/v1/auth/register` | Register a new user |
| `POST` | `/api/v1/auth/login` | Login and receive token |
| `GET` | `/api/v1/auth/logout` | Invalidate session |
| `GET` | `/api/v1/auth/me` | Get authenticated user |

### 📚 Problems

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/v1/problems` | Create a new problem |
| `GET` | `/api/v1/problems` | List all problems |
| `GET` | `/api/v1/problems/:id` | Get a single problem |
| `PUT` | `/api/v1/problems/:id` | Update a problem |
| `DELETE` | `/api/v1/problems/:id` | Delete a problem |

### 🧪 Submissions

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/v1/submissions` | Submit code for evaluation |
| `GET` | `/api/v1/submissions` | Get all submissions |
| `GET` | `/api/v1/submissions/:id` | Get result of a submission |

---

## ⚙️ Environment Variables

Create a `.env` file in the `backend/` directory:

```env
PORT=8000
MONGO_URI=your_mongodb_connection_string
REDIS_URL=your_redis_url
ACCESS_TOKEN_SECRET=your_access_token_secret_key
REFRESH_TOKEN_SECRET=your_refresh_token_secret_key
ACCESS_TOKEN_EXPIRES_IN=your_access_token_expiry_time (e.g., 30m, 1h)
REFRESH_TOKEN_EXPIRES_IN=your_refresh_token_expiry_time (e.g., 7d)

```

---

## 🐳 Running Locally

### 1. Clone the repository

```bash
git clone https://github.com/your-username/codearena.git
cd codearena
```

### 2. Start the backend

```bash
cd backend
npm install
npm run dev
```

### 3. Start the frontend

```bash
cd frontend
npm install
npm run dev
```

### 4. Start Docker (for sandbox execution)

Make sure Docker Desktop (or Docker Engine) is installed and running on your machine before submitting any code. The sandbox spins up containers on demand for each execution.

---

## 🚀 Roadmap

- [ ] Additional language support — C++, Java
- [ ] AI-powered code hints and suggestions
- [ ] Contest / timed challenge mode
- [ ] Global leaderboard
- [ ] Community discussion threads per problem
- [ ] Video editorial solutions

---

## 🤝 Contributing

Contributions are welcome and appreciated!

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Commit your changes: `git commit -m 'Add your feature'`
4. Push to your branch: `git push origin feature/your-feature`
5. Open a Pull Request

---

<div align="center">

Made with ☕ and a lot of `console.log` debugging.

</div>