# GrowQR Admin Hub

A comprehensive administrative dashboard for managing GrowQR business operations, candidates, and AI-driven workflows.

## Features
- **Candidate Management**: Manage resumes, onboarding, and status tracking.
- **Business Dashboard**: Real-time stats and growth metrics.
- **Native Authentication**: Secure email/password login and magic links.
- **AI Integration**: Custom resume parsing and candidate profiling.

## Getting Started

### Prerequisites
- Node.js (v18+)
- Python 3.10+
- PostgreSQL

### Installation

#### Backend Setup
```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
# Configure your .env file
python3 main.py
```

#### Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

## Deployment
This project is structured for easy deployment to platforms like Vercel (Frontend) and Render/Heroku/Railway (Backend).

### Production Build
```bash
cd frontend
npm run build
```

---
© 2025 GrowQR. All rights reserved.
