---
name: "\U0001F9E0 EvalionMind"
about: " AI-Powered Skill Evaluation"
title: " AI-Powered Skill Evaluation"
labels: ''
assignees: hussnaintechcreation

---

🧠 EvalionMind: AI-Powered Skill Evaluation Ecosystem
EvalionMind is a comprehensive technical assessment platform designed to automate and enhance the hiring process. By integrating Google Gemini AI, the platform conducts interactive coding interviews, evaluates system architecture skills, and provides deep analytical feedback for both candidates and recruiters. 

🌟 Key Features

AI-Driven Interviews: Real-time technical interview sessions powered by Gemini AI to assess logic and problem-solving. 


Architectural Simulations: Specialized "Interview Architect" modules for testing high-level system design capabilities. 


Live Coding Playground: A secure, integrated environment for candidates to write and execute code during assessments. 


Immersive 3D UI: Interactive backgrounds and logos utilizing Three.js for a modern, engaging candidate experience. 


Automated Evaluation & Feedback: Generates detailed performance reports, scoring, and certificates upon completion. 


Smart Chatbot Assistant: An AI-powered guide to assist users through the onboarding and assessment process. 


Comprehensive Analytics: Dashboards for both candidates and companies to track skill growth and interview progress. 

🛠️ Technical Architecture

Frontend (Angular) 


Framework: Angular with TypeScript 


Visuals: Three.js for 3D scene rendering 


State Management: RxJS-based services for real-time data sync 


Real-time: WebSocket integration for live interview sessions 


Backend (Node.js & Express) 


AI Engine: Google Gemini API integration 


Security: JWT-based authentication and custom API Key middleware 


Database: Mongoose models for Users, Interviews, Evaluations, and Audit Logs 


Audit Logging: Built-in utility for tracking system-wide activities 

📂 Repository Structure
Plaintext
├── src/                    # Angular Frontend Application 
│   ├── components/         # Dashboard, Playground, Interview & 3D components [cite: 3, 4, 10, 23]
│   └── services/           # Gemini, Auth, WebSocket, and Code Runner services [cite: 2, 17, 19]
├── backend/                # Node.js Express Server 
│   ├── models/             # Database Schemas (User, Task, Evaluation, AuditLog) [cite: 7, 11, 26]
│   ├── routes/             # API Endpoints (Auth, Gemini, Interview, Feedback) [cite: 7, 14, 21]
│   └── middleware/         # Auth and API Key validation [cite: 16, 29]
└── .github/workflows/      # CI/CD automation via GitHub Actions [cite: 6]
🚀 Getting Started
Clone & Install:

Bash
git clone https://github.com/your-repo/EvalionMind.git
npm install && cd backend && npm install

Environment Setup: Configure your .env in the backend/ folder with your GEMINI_API_KEY, MONGO_URI, and JWT_SECRET. 

Run Development Server:


Backend: node server.ts 

Frontend: ng serve

🛡️ Security & Auditing
EvalionMind includes a robust auditing system and middleware to ensure every AI interaction and interview session is logged and secure.
