<div align="center">

<img src="https://img.shields.io/badge/EvalX-Competitive%20Coding%20Platform-f0a500?style=for-the-badge&logoColor=white&labelColor=07090f" />

# ⚡ EvalX

### **The Competitive Coding Platform Built for the Next Generation of Engineers**

**[ Live Platform](https://evalx.in)** · **[ Docs](#)** · **[ Report Bug](https://github.com/yourusername/evalx/issues)** · **[ Request Feature](https://github.com/yourusername/evalx/issues)**

<br/>

![Node.js](https://img.shields.io/badge/Node.js-339933?style=flat-square&logo=node.js&logoColor=white)
![React](https://img.shields.io/badge/React_18-61DAFB?style=flat-square&logo=react&logoColor=black)
![MongoDB](https://img.shields.io/badge/MongoDB_Atlas-47A248?style=flat-square&logo=mongodb&logoColor=white)
![Redis](https://img.shields.io/badge/Redis-DC382D?style=flat-square&logo=redis&logoColor=white)
![Socket.io](https://img.shields.io/badge/Socket.io-010101?style=flat-square&logo=socket.io&logoColor=white)
![Razorpay](https://img.shields.io/badge/Razorpay-02042B?style=flat-square&logo=razorpay&logoColor=3395FF)
![Vercel](https://img.shields.io/badge/Vercel-000000?style=flat-square&logo=vercel&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-f0a500?style=flat-square)
![Version](https://img.shields.io/badge/Version-v0.2.0-success?style=flat-square)

<br/>

> **EvalX** is a full-stack, production-grade competitive programming platform engineered from the ground up — featuring real-time contest leaderboards, async code evaluation, end-to-end payment infrastructure, and a multi-tier admin ecosystem. Deployed at [evalx.in](https://evalx.in).

</div>

---

##  Table of Contents

- [The Problem](#-the-problem)
- [Why EvalX](#-why-evalx)
- [Live Demo](#-live-demo)
- [Architecture](#-architecture)
- [Feature Deep-Dive](#-feature-deep-dive)
- [Tech Stack](#-tech-stack)
- [Getting Started](#-getting-started)
- [Environment Variables](#-environment-variables)
- [API Reference](#-api-reference)
- [Deployment](#-deployment)
- [Roadmap](#-roadmap)
- [Engineering Decisions & Lessons](#-engineering-decisions--lessons)
- [Contributing](#-contributing)
- [Author](#-author)

---

##  The Problem

The competitive programming ecosystem is dominated by platforms that are either:

- **Too generic** — LeetCode and Codeforces aren't tailored for college communities, internal hackathons, or custom contest formats.
- **Too expensive** — Hosted judge infrastructure, white-label tools, and contest APIs cost thousands per month.
- **Too closed** — No way to self-host, customize scoring logic, or own your community's data.

Universities, coding clubs, and bootcamps need a **self-sovereign, extensible, production-grade platform** they can actually run — without vendor lock-in.

---

##  Why EvalX

EvalX is engineered with a single thesis: **build the infrastructure that the competitive programming world is missing.**

| Capability | EvalX | LeetCode | Codeforces |
|---|:---:|:---:|:---:|
| Self-hostable | ✅ | ❌ | ❌ |
| Custom contest creation | ✅ | ❌ | ✅ |
| Real-time leaderboards | ✅ | Limited | ✅ |
| Payment-gated contests | ✅ | ❌ | ❌ |
| College/community mode | ✅ (Roadmap) | ❌ | ❌ |
| Open admin ecosystem | ✅ | ❌ | ❌ |
| Zero vendor lock-in | ✅ | ❌ | ❌ |

---

##  Live Demo

> **Production URL**: [https://evalx.in](https://evalx.in)

| Role | Credentials |
|---|---|
| Public User | Register at evalx.in |
| Demo Admin | Contact maintainer |

---

##  Architecture

```
                          ┌─────────────────────────────────┐
                          │         evalx.in (Vercel)        │
                          │   React 18 + Vite + Redux TK     │
                          │   Monaco Editor + Socket.io-cli  │
                          └───────────────┬─────────────────┘
                                          │ HTTPS / WSS
                          ┌───────────────▼─────────────────┐
                          │     Express 4 API (Render)       │
                          │  Auth · Contest · Judge · Admin  │
                          │  Socket.io · Bull · Pino logs    │
                          └───┬───────────┬──────────┬──────┘
                              │           │          │
              ┌───────────────▼──┐  ┌─────▼────┐ ┌──▼───────────┐
              │  MongoDB Atlas   │  │ Upstash  │ │    Resend     │
              │  Primary DB      │  │  Redis   │ │  Email API    │
              │  Atlas Search    │  │ Queue +  │ │  OTP + Alerts │
              └──────────────────┘  │  Cache   │ └──────────────┘
                                    └──────────┘
                                         │
                              ┌──────────▼───────────┐
                              │   Bull Worker Pool   │
                              │   Code Eval Queue    │
                              │   Async Judge Jobs   │
                              └──────────────────────┘
```

### Request Lifecycle: Code Submission

```
User submits code
      │
      ▼
POST /api/submissions
      │
      ▼
Job enqueued → Bull Queue (Upstash Redis)
      │
      ▼
Worker picks up job → runs test cases
      │
      ▼
Result stored in MongoDB
      │
      ▼
Socket.io emits verdict → Client updates in real-time
      │
      ▼
Leaderboard recomputed + broadcast
```

---

##  Feature Deep-Dive

###  Authentication & Security
- **JWT dual-token flow** — short-lived access tokens + long-lived refresh tokens
- **HttpOnly cookie** storage for refresh tokens with **bcrypt-hashed DB persistence** (rotation-safe)
- **Email OTP verification** via Resend — zero SMTP dependency
- **RBAC** — three-tier hierarchy: `user` → `admin` → `superadmin`
- **HMAC webhook verification** for Razorpay payment events

###  Contest Engine
- Full **Contest + Problem CRUD** with ownership guards
- **Draft-only edit protection** — live contests are immutable
- Payment-gated registration with **atomic idempotent transactions** (no double-charge on retry)
- **Real-time leaderboards** over Socket.io — sub-second rank updates as submissions arrive

###  Code Evaluation Pipeline
- **Async evaluation** via Bull job queues backed by Upstash Redis
- Decoupled worker architecture — horizontal scale-ready
- Submission results pushed live over WebSocket — no polling
- Structured verdict: `AC / WA / TLE / CE / RE` with per-test-case breakdown

###  Admin Ecosystem
- `/admin` — contest and problem governance for admins
- `/superadmin` — system health aggregation, audit log viewer, access-control governance, user role management
- **Pino structured logging** — JSON in production, pretty-printed in dev, fully queryable

###  Payments
- **Razorpay integration** — order creation, payment verification, webhook processing
- Idempotent registration guard — retries don't create duplicate records
- Full audit trail per transaction

---

##  Tech Stack

### Frontend
| Layer | Technology |
|---|---|
| Framework | React 18 + Vite |
| State | Redux Toolkit |
| Styling | Tailwind CSS + Custom Design Tokens |
| Code Editor | Monaco Editor (custom EvalX dark theme) |
| Realtime | Socket.io-client |
| Hosting | Vercel |

### Backend
| Layer | Technology |
|---|---|
| Runtime | Node.js + Express 4 |
| Database | MongoDB Atlas + Mongoose |
| Queue | Bull + Upstash Redis |
| Cache | Upstash Redis |
| Realtime | Socket.io |
| Payments | Razorpay |
| Email | Resend |
| Logging | Pino |
| Hosting | Render |

### Design System
- **Base color**: `#07090f` (near-black)
- **Accent**: `#f0a500` (amber)
- **Display font**: Barlow Condensed
- **Code font**: IBM Plex Mono
- **Aesthetic**: Industrial terminal — built for engineers, by an engineer

---

##  Getting Started

### Prerequisites

```bash
node >= 18.x
npm >= 9.x
MongoDB Atlas account
Upstash Redis account
Resend account
Razorpay account (for payments)
```

### Local Setup

```bash
# 1. Clone the repository
git clone https://github.com/yourusername/evalx.git
cd evalx

# 2. Install backend dependencies
cd server && npm install

# 3. Install frontend dependencies
cd ../client && npm install

# 4. Configure environment variables (see below)
cp server/.env.example server/.env
cp client/.env.example client/.env

# 5. Start the backend
cd server && npm run dev

# 6. Start the frontend
cd client && npm run dev
```

Frontend runs at `http://localhost:5173`
Backend runs at `http://localhost:5000`

---

##  Environment Variables

### Server (`server/.env`)

```env
# App
NODE_ENV=development
PORT=5000
CLIENT_URL=http://localhost:5173

# MongoDB
MONGODB_URI=mongodb+srv://<user>:<pass>@cluster.mongodb.net/evalx

# JWT
JWT_ACCESS_SECRET=your_access_secret
JWT_REFRESH_SECRET=your_refresh_secret
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d

# Redis (Upstash)
REDIS_URL=rediss://<upstash-url>
REDIS_TOKEN=your_upstash_token

# Email (Resend)
RESEND_API_KEY=re_xxxxxxxxxxxx
RESEND_FROM=noreply@evalx.in

# Payments (Razorpay)
RAZORPAY_KEY_ID=rzp_live_xxxx
RAZORPAY_KEY_SECRET=your_razorpay_secret
RAZORPAY_WEBHOOK_SECRET=your_webhook_secret
```

### Client (`client/.env`)

```env
VITE_API_URL=http://localhost:5000
VITE_SOCKET_URL=http://localhost:5000
```

---

##  API Reference

### Auth
| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/auth/register` | Register with email OTP |
| `POST` | `/api/auth/verify-otp` | Verify email OTP |
| `POST` | `/api/auth/login` | Login → access + refresh tokens |
| `POST` | `/api/auth/refresh` | Rotate refresh token |
| `POST` | `/api/auth/logout` | Invalidate refresh token |

### Contests
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/contests` | List all public contests |
| `POST` | `/api/contests` | Create contest (admin) |
| `GET` | `/api/contests/:id` | Contest detail |
| `POST` | `/api/contests/:id/register` | Register (payment flow) |
| `GET` | `/api/contests/:id/leaderboard` | Live leaderboard |

### Submissions
| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/submissions` | Submit code → async eval |
| `GET` | `/api/submissions/:id` | Poll submission result |

### Admin
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/admin/health` | System health metrics |
| `GET` | `/api/admin/audit-logs` | Audit log viewer |
| `PATCH` | `/api/superadmin/users/:id/role` | Promote / demote users |

> Full Postman collection available on request.

---

##  Deployment

### Frontend → Vercel

```bash
# Push to main branch — Vercel auto-deploys
git push origin main
```

Set environment variables in Vercel dashboard under **Project Settings → Environment Variables**.

### Backend → Render

1. Connect GitHub repo to Render
2. Set **Build Command**: `npm install`
3. Set **Start Command**: `node src/index.js`
4. Add all environment variables from `server/.env`
5. Ensure host binding is `0.0.0.0` (required for Render port detection)

### Custom Domain

EvalX is live at [evalx.in](https://evalx.in) — configured via Vercel DNS with CNAME records.

---

##  Roadmap

> Current release: `v0.2.0` — Core platform complete.

### v0.3.0 — Retention Engine (In Progress)
- [ ] **Elo Rating System** — skill-based dynamic ranking
- [ ] **Daily Streaks** — habit loop + engagement mechanics
- [ ] **College Battalion Mode** — institution-vs-institution leaderboards
- [ ] **Daily Puzzle** — one problem, 24 hours, global ranking
- [ ] **Redis Leaderboard Migration** — `ZADD`/`ZREVRANK` for O(log n) ranking
- [ ] **Redis Caching Layer** — hot path cache for contest/problem reads

### v0.4.0 — Scale & Governance
- [ ] Socket handshake authentication
- [ ] Feature flags + maintenance mode toggle
- [ ] Superadmin surface for system toggles
- [ ] Audit coverage: auth flows + organizer actions
- [ ] Real judge integration (replacing mock judge)

### v0.5.0 — Monetization
- [ ] Phased monetization: premium problems, contest hosting subscriptions
- [ ] Organization accounts for colleges and bootcamps
- [ ] Public contest marketplace

---

##  Engineering Decisions & Lessons

This project was built zero-budget with zero shortcuts. Every architectural decision was earned through debugging in production.

| Problem Encountered | Root Cause | Fix |
|---|---|---|
| Refresh tokens silently corrupted | Synchronous bcrypt in Mongoose pre-save hook | Always `async/await` inside hooks |
| All `findById` calls returning null | Missing DB name in MongoDB URI | Include `/dbname` in connection string |
| SMTP `ECONNREFUSED` on deploy | Node.js defaulting to IPv6 binding | Explicit IPv4 binding for mail |
| Outbound email blocked on Railway | Railway free tier blocks all SMTP ports | Migrated to Resend HTTP API |
| Express 5 wildcard routes crashing | `path-to-regexp` v8 breaking change | Pinned to Express 4 |
| Browser misreporting 5xx as CORS | CORS headers missing from error responses | Attach CORS headers to all responses |
| Port not detected on Render | Default localhost binding | Explicit `0.0.0.0` binding |
| Named exports silently failing | Import/export name mismatch | Verify all export names at compile time |

---

##  Contributing

EvalX is open to contributions. If you're interested in competitive programming infrastructure, real-time systems, or developer tooling:

```bash
# 1. Fork the repo
# 2. Create a feature branch
git checkout -b feat/your-feature-name

# 3. Commit with conventional commits
git commit -m "feat(contests): add penalty time scoring"

# 4. Push and open a PR
git push origin feat/your-feature-name
```

**Commit convention**: `type(scope): summary`
Types: `feat` · `fix` · `perf` · `refactor` · `docs` · `chore`

---

##  Creator

**Shashank Ranjan**
B.Tech (3rd Year) · Full-Stack Development 

[![LinkedIn](https://img.shields.io/badge/LinkedIn-Connect-0A66C2?style=flat-square&logo=linkedin)](https://www.linkedin.com/in/shash-hq/)
[![GitHub](https://img.shields.io/badge/GitHub-Follow-181717?style=flat-square&logo=github)](https://github.com/shash-hq)
[![EvalX](https://img.shields.io/badge/EvalX-evalx.in-f0a500?style=flat-square)](https://evalx.in)

> *"Built this from scratch — zero team, zero budget, zero compromises on production quality."*

---

<div align="center">

**⭐ Star this repo if EvalX impressed you — it helps more than you think.**

<sub>Made with ⚡ and too much caffeine · EvalX v0.2.0 · MIT License</sub>

</div>
