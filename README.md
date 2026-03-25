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
├── mobile/           # React Native mobile app
├── shared/           # Shared types and utilities
├── docker/           # Docker compose configuration
└── docs/             # Documentation and thesis materials
```

## 🛠️ Technology Stack

### Frontend
- **React Native** (0.73+) - Cross-platform mobile & web
- **Redux Toolkit** - State management
- **React Navigation** - Navigation
- **React Native Paper** - UI components

### Backend
- **NestJS** (TypeScript) - Backend framework
- **PostgreSQL** - Primary database
- **Redis** - Caching and sessions
- **MinIO** - File storage
- **OpenAI API** - LLM integration

### DevOps
- **Docker** - Containerization
- **Docker Compose** - Local development
- **Git** - Version control

## 🚀 Getting Started

### Prerequisites

- Node.js v20+ (currently using v25.2.0)
- Docker Desktop
- Git
- Android Studio (for mobile development)

### Installation

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

4. **Setup Mobile**
   ```bash
   cd mobile/BusinessTrackingApp
   npm install
   cp .env.example .env
   npm start
   ```

## 📚 Documentation

- [System Architecture](./docs/system_architecture.md)
- [Development Setup Guide](./docs/dev_setup_guide.md)
- [API Documentation](./docs/api_documentation.md) (Coming soon)
- [User Manual](./docs/user_manual.md) (Coming soon)

## 🎓 Thesis Information

**Title:** AI-Powered Task Prioritization and Assignment in Project Management Systems

**Research Questions:**
1. How does AI-assisted task prioritization affect decision-making time?
2. What factors influence user trust in AI-generated task assignments?
3. How does a hybrid (rule-based + LLM) approach compare to purely rule-based systems?

**Academic Advisor:** [To be filled]

**Institution:** [To be filled]

**Expected Completion:** [To be filled]

## 📝 Development Status

- [x] Project initialization
- [x] Architecture design
- [ ] Backend core modules
- [ ] Mobile app foundation
- [ ] AI integration
- [ ] User testing
- [ ] Thesis writing

## 🤝 Contributing

This is a thesis project and not open for external contributions. However, feedback and suggestions are welcome.

## 📄 License

This project is developed for academic purposes as part of a Software Engineering graduation thesis.

## 📧 Contact

Sıtkı Eray Akça
erayakca001@gmail.com
Manisa Celâl Bayar Üniversitesi

---

**Note:** This project is under active development as part of a graduation thesis.
