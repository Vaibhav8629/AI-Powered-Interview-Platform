# 🤖 AI-Powered Interview Platform

## 🌟 Overview

**AI-Powered Interview Platform** is a full-stack web application built to provide a realistic and personalized interview preparation experience.

Instead of simply solving questions from a static question bank, users can actually **participate in an AI-driven interview** where the platform:

🎤 Conducts interactive interviews
🧠 Generates and evaluates questions using AI
⏱️ Tracks interview time and progress
📊 Scores candidate responses
💡 Provides detailed AI feedback
🛡️ Monitors suspicious interview activity
📚 Stores previous interview attempts
💳 Supports a credit-based usage system

The goal is simple:

> **Make interview preparation feel like a real interview.**

---

## ✨ Features

### 🧠 AI-Powered Interviewing

* 🤖 AI-generated technical interview questions
* 🎯 Role-specific interviews
* 📈 Difficulty-based question selection
* 🧩 Topic-specific interviews
* 📝 AI evaluation of candidate answers
* 💬 Detailed feedback for every response
* ⭐ Individual question scoring
* 📊 Overall interview performance

---

### 🎙️ Interactive Interview Experience

The interview isn't just a list of questions.

Users interact with an AI interviewer through a dedicated interview environment.

Features include:

* 🎤 Speech recognition
* 🔊 Text-to-speech
* 👨 Male AI interviewer
* 👩 Female AI interviewer
* ⏳ Question timer
* 📍 Interview progress tracking
* 🖥️ Fullscreen interview mode
* ⚡ Smooth animated interactions

---

### 🛡️ Anti-Cheating System

The platform includes an interview monitoring system designed to detect suspicious browser activity.

It monitors:

| Detection           | Supported |
| ------------------- | :-------: |
| 👀 Tab Switching    |     ✅     |
| 🪟 Window Blur      |     ✅     |
| 🖥️ Fullscreen Exit |     ✅     |
| 📋 Copy             |     ✅     |
| 📌 Paste            |     ✅     |
| ✂️ Cut              |     ✅     |
| 🖱️ Right Click     |     ✅     |

Violations are tracked during the interview and included in the final interview summary.

---

### ⚙️ Custom Interview Setup

Candidates can configure their interview before starting.

```text
🎯 Role
   ↓
💼 Experience
   ↓
🧠 Interview Type
   ↓
🔥 Difficulty
   ↓
📚 Topics
   ↓
❓ Number of Questions
   ↓
⏱️ Duration
```

This allows users to create interviews based on their exact preparation requirements.

---

### 📊 AI Feedback & Evaluation

After answering questions, the AI evaluates the candidate's response.

The feedback system provides:

* ⭐ Answer score
* 💬 Detailed feedback
* 💪 Strengths
* ⚠️ Weak areas
* 🧠 Areas for improvement
* 📈 Overall interview score

This turns every interview into a learning opportunity.

---

### 📚 Interview History

Every completed interview can be stored for future analysis.

Users can review:

📅 Previous interviews
🎯 Interview type
⭐ Scores
🧠 AI feedback
📈 Performance trends
📝 Previous answers

---

### 🔐 Authentication

Secure user authentication using:

* 🔑 JWT authentication
* 🔒 Protected API routes
* 👤 User-specific data
* 🔐 Password hashing
* 🛡️ Authentication middleware

---

### 💰 Credits & Subscription System

The platform uses a credit-based model.

| Interview       | 💳 Credits |
| --------------- | ---------: |
| 🟢 5 Questions  |          5 |
| 🟡 10 Questions |         10 |
| 🔴 15 Questions |         15 |

Users can receive monthly free credits, while paid plans can provide additional interview credits.

---

### 💳 Stripe Payments

Integrated payment infrastructure supports:

* 💰 Stripe Checkout
* 🔄 Subscription handling
* 📦 Credit allocation
* 🔔 Stripe Webhooks
* 💵 Payment event processing

---

# 🛠️ Tech Stack

## 🎨 Frontend

| Technology        | Purpose               |
| ----------------- | --------------------- |
| ⚛️ React          | UI development        |
| ⚡ Vite            | Frontend tooling      |
| 🎨 Material UI    | UI components         |
| 🎬 Framer Motion  | Animations            |
| 🧭 React Router   | Routing               |
| 📊 Recharts       | Analytics             |
| 🎤 Web Speech API | Voice interaction     |
| 🖼️ html2canvas   | Screenshot generation |
| 📄 jsPDF          | PDF generation        |
| ✨ Lucide React    | Icons                 |

---

## 🖥️ Backend

| Technology    | Purpose                     |
| ------------- | --------------------------- |
| 🟢 Node.js    | Runtime                     |
| 🚀 Express.js | Backend framework           |
| 🍃 MongoDB    | Database                    |
| 🦫 Mongoose   | ODM                         |
| 🔐 JWT        | Authentication              |
| 🌐 REST API   | Client-server communication |

---

## 🤖 AI

**Google Gemini API**

Used for:

* 🧠 Question generation
* 📝 Answer evaluation
* 💬 Feedback generation
* 🎯 Interview personalization

---

## 💳 Payments

**Stripe**

Used for:

* Checkout
* Payments
* Subscriptions
* Webhooks
* Credit management

---

## ☁️ Deployment

| Service    | Usage    |
| ---------- | -------- |
| ▲ Vercel   | Frontend |
| 🚀 Render  | Backend  |
| 🍃 MongoDB | Database |

---

# 🏗️ Architecture

```text
                         👤 USER
                           │
                           ▼
                  ┌─────────────────┐
                  │  ⚛️ React App   │
                  │                 │
                  │ UI + Interview  │
                  │ Voice + State   │
                  └────────┬────────┘
                           │
                           │ REST API
                           ▼
                  ┌─────────────────┐
                  │ 🚀 Express API  │
                  │                 │
                  │ Auth            │
                  │ Interviews      │
                  │ Feedback        │
                  │ Credits         │
                  └───────┬─────────┘
                          │
             ┌────────────┼────────────┐
             ▼            ▼            ▼
       🍃 MongoDB    🤖 Gemini      💳 Stripe
```

---

# 🧠 AI Interview Flow

```text
             ⚙️ Interview Configuration
                       │
                       ▼
               📝 Create Interview
                       │
                       ▼
               🤖 Generate Question
                       │
                       ▼
                  🎤 Ask Question
                       │
                       ▼
                  👤 User Answers
                       │
                       ▼
                🧠 AI Evaluation
                       │
             ┌─────────┴─────────┐
             ▼                   ▼
          ⭐ Score          💬 Feedback
             │                   │
             └─────────┬─────────┘
                       ▼
                ➡️ Next Question
                       │
                       ▼
                 🏁 Final Result
```

---

# 🗄️ Database Design

### 👤 User

```text
User
 ├── name
 ├── email
 ├── password
 ├── credits
 └── subscription
```

### 🎯 Interview

```text
Interview
 ├── user
 ├── role
 ├── experience
 ├── interviewType
 ├── difficulty
 ├── topics[]
 ├── numberOfQuestions
 ├── duration
 └── questions[]
       ├── question
       ├── answer
       ├── feedback
       └── score
```

---

# 📁 Project Structure

```text
AI-Interview-Platform/
│
├── 🎨 frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── hooks/
│   │   ├── services/
│   │   ├── utils/
│   │   └── App.jsx
│   │
│   └── package.json
│
├── 🖥️ backend/
│   ├── controllers/
│   ├── middleware/
│   ├── models/
│   ├── routes/
│   ├── services/
│   ├── config/
│   ├── server.js
│   └── package.json
│
└── 📖 README.md
```

---

# 🚀 Getting Started

## 1️⃣ Clone the Repository

```bash
git clone https://github.com/your-username/ai-interview-platform.git

cd ai-interview-platform
```

## 2️⃣ Install Backend Dependencies

```bash
cd backend
npm install
```

## 3️⃣ Configure Environment Variables

Create a `.env` file inside the backend directory.

```env
PORT=5000

MONGO_URI=your_mongodb_connection_string

JWT_SECRET=your_jwt_secret

GEMINI_API_KEY=your_gemini_api_key

STRIPE_SECRET_KEY=your_stripe_secret_key

STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret

CLIENT_URL=http://localhost:5173
```

Frontend `.env`:

```env
VITE_BASE_URL=http://localhost:5000

VITE_GOOGLE_CLIENT_ID=

VITE_STRIPE_PUBLISHABLE_KEY=

VITE_STRIPE_PRICE_ID_STANDARD=

VITE_STRIPE_PRICE_ID_PREMIUM=

VITE_STRIPE_WEBHOOK_SECRET=

```

> 🔒 Never commit API keys, database credentials, or `.env` files to GitHub.

---

## 4️⃣ Start Backend

```bash
npm run dev
```

---

## 5️⃣ Start Frontend

Open another terminal:

```bash
cd frontend
npm install
npm run dev
```

---


# 💡 Engineering Highlights

### 🔐 Authentication

JWT-based authentication with protected routes and user-specific resources.

### 🤖 AI Integration

Gemini is integrated into the interview pipeline for dynamic question generation and response evaluation.

### 🎤 Browser APIs

The application uses browser speech capabilities to create a more realistic voice-based interview experience.

### 🛡️ Anti-Cheating

Browser events such as visibility changes, fullscreen changes, copy/paste, and context-menu actions are monitored.

### 💳 Payment Infrastructure

Stripe Checkout and webhook events are used to manage subscriptions and interview credits.

### 📦 Scalable Backend Structure

Controllers, routes, models, middleware, and services are separated to keep the backend maintainable.

---

# 🧪 Future Improvements

* [ ] 📄 Resume-based personalized interviews
* [ ] 🧠 RAG-powered interview generation
* [ ] 💬 Real-time conversational follow-up questions
* [ ] 🏢 Company-specific interview modes
* [ ] 💻 Integrated coding environment
* [ ] ⚙️ Code execution & evaluation
* [ ] 📊 Advanced performance analytics
* [ ] 🗣️ Communication analysis
* [ ] 🏆 Leaderboards
---