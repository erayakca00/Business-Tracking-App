# Business Tracking App - Graduation Thesis Project

> AI-Powered Cross-Platform Business Tracking Application

## 📋 Project Overview

This is a Software Engineering graduation thesis project that implements a cross-platform business/project tracking application with AI-assisted task prioritization and assignment capabilities.

**Key Features:**
- 🌐 Cross-platform (Web & Mobile) using React Native
- 👥 Group-based task management with role-based access control
- 🤖 AI-powered task prioritization and assignment recommendations
- 💬 Team communication (optional)
- 📊 Explainable AI with confidence scoring

## 🏗️ Architecture

```
business-tracking-app/
├── backend/          # NestJS backend API
├── web/              # Vite React web application
├── mobile/           # React Native mobile app
├── shared/           # Shared types and utilities
├── docker/           # Docker compose configuration
└── docs/             # Documentation and thesis materials
```

## 🛠️ Technology Stack

### Frontend
- **React** (v18) - Web frontend built with Vite, TailwindCSS, and Recharts (for analytics)
- **React Native** - Cross-platform mobile client built with Expo Custom Dev Client
- **Redux Toolkit** - Global state management & RTK Query for data fetching
- **React Navigation** - Dynamic, nested mobile route stack
- **React Native Paper** - Sleek, custom-theme-aware mobile UI components
- **Expo Notifications** - Rich, foreground & background push notification handler

### Backend
- **NestJS** (TypeScript, v11) - Enterprise-grade backend API framework
- **TypeORM** - Database Object-Relational Mapper
- **PostgreSQL** - Primary persistent relational database
- **Redis** - Local session storage and server caching
- **Cloudflare R2** - Production S3-compatible cloud object storage for file attachments
- **Google Gemini API** (`gemini-2.5-flash`) - LLM-powered automatic task summaries with a database-backed invalidation cache
- **Firebase Admin SDK** - Direct Firebase Cloud Messaging (FCM) push notification engine
- **Resend** - Transactional email delivery (invitations, verifications, credentials reset)

### DevOps & Security
- **Docker & Docker Compose** - Containerization and local service orchestrator
- **Render Blueprints** - Infrastructure as Code (IaC) deployment (`render.yaml`)
- **Helmet** - Global HTTP security headers configuration
- **Throttler** - NestJS route rate-limiting guards
- **XSS Sanitizer** - Dynamic input sanitization middleware

## 🚀 Getting Started

### Prerequisites
- Node.js v20+
- Docker Desktop
- Git
- Expo CLI / Android Studio / Xcode (for mobile development)

### Local Installation
1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd "Business Tracking App"
   ```
2. **Start Docker services**
   ```bash
   cd docker
   docker compose up -d
   ```
3. **Setup Backend**
   ```bash
   cd backend
   npm install
   cp .env.example .env
   npm run start:dev
   ```
4. **Setup Web Frontend**
   ```bash
   cd web
   npm install
   npm run dev
   ```
   *The web client runs on `http://localhost:5173`. Webpack proxies `/api` requests to the backend.*
5. **Setup Mobile Client**
   ```bash
   cd mobile
   npm install
   cp .env.example .env
   npm start
   ```

### Production Deployment
The application is pre-configured for deployment on **Render** (via `render.yaml`) and **Firebase** (for Push Notifications).

## 🎓 Thesis Information

**Title:** AI-Powered Task Prioritization and Assignment in Project Management Systems

**Research Questions:**
1. How does AI-assisted task prioritization affect decision-making time?
2. What factors influence user trust in AI-generated task assignments?
3. How does a hybrid (rule-based + LLM) approach compare to purely rule-based systems?

**Academic Advisor:** [To be filled]
**Institution:** Manisa Celâl Bayar Üniversitesi
**Expected Completion:** June 2026

## 📝 Development Status

- [x] Project initialization
- [x] Architecture design
- [x] Backend core modules & security hardening (v1.0 - v1.4)
- [x] Web & Mobile client foundations (v1.0 - v1.4)
- [x] Real-time collaboration & WebSocket sync (v1.2)
- [x] Email system, verify flow, password reset, group invites (v1.3)
- [x] Agile sprint & backlog management (v1.5)
- [x] Burndown charts & Analytics dashboard (v1.6)
- [x] Mobile Parity & Push Notifications (v1.8)
- [x] AI Task Summarizer & Recommendations (v2.0)
- [x] Task dependencies & time tracking (v1.7)
- [ ] Thesis writing & evaluation

## 🤝 Contributing
This is a thesis project and not open for external contributions. However, feedback and suggestions are welcome.

## 📄 License
This project is developed for academic purposes as part of a Software Engineering graduation thesis.

## 📧 Contact
**Sıtkı Eray Akça**
erayakca001@gmail.com
Manisa Celâl Bayar Üniversitesi

---

**Note:** This project has successfully reached its major implementation milestones and is ready for production staging.
