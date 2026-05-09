<img width="1470" height="847" alt="Screenshot 2026-05-09 at 20 18 44" src="https://github.com/user-attachments/assets/197e61fc-a380-48f8-b8a1-720884e92d41" />
<img width="1469" height="843" alt="Screenshot 2026-05-09 at 20 19 46" src="https://github.com/user-attachments/assets/7bfc574d-1b25-43bc-b879-7ec8a5867808" />
<img width="1470" height="841" alt="Screenshot 2026-05-09 at 20 20 32" src="https://github.com/user-attachments/assets/7f796863-0d8d-438a-b894-f4ec643dc67d" />
# 🎫 TiGET | Full-Stack Event Ticketing System 

TiGET is a event management and social platform. It implements a dual-database architecture to handle relational business logic alongside real-time social interactions.

## 🛠️ Tech Stack

### **Frontend**
* **Framework:** React 18 with Vite (Ultra-fast HMR)
* **Testing:** Playwright (End-to-End) & Vitest (Unit Testing)
* **State & Logic:** Zod (Validation), JS-Cookie (Session management)

### **Backend**
* **Runtime:** Node.js & Express
* **API:** Apollo Server (GraphQL)
* **Real-time:** Native WebSockets (WS)
* **Security:** Custom Stealth-Logging Middleware & Cookie-Parser

### **Database**
* **Primary (Relational):** PostgreSQL via Prisma ORM (Users, Roles, Events, Logs)
* **Secondary (NoSQL):** MongoDB via Mongoose (Persistent Chat History)

---

## 🏗️ Current Features

### **1. Advanced Role-Based Access Control (RBAC)**
* Integrated database infrastructure for **MASTER_ADMIN**, **ORGANISER**, and **CONSUMER** roles.
* Granular permission management across GraphQL mutations and queries.

### **2. Real-Time Social Engine**
* Full-stack WebSocket implementation for instant messaging.
* Persistent message storage in MongoDB for high-velocity chat data.
* Dynamic "Recents" and "Search" tabs for user-to-user discovery.

### **3. Automated Security & Auditing**
* **Stealth Logger:** Backend utility that persists every user action in a strict `USER_ID:ROLE_ID[ROLE] ACTION:TIMESTAMP` format.
* **Intelligent Detective:** Automated mechanism that detects malevolent behavior (endpoint spamming or unauthorized access attempts).
* **Observation List:** Dynamic Admin-only interface to monitor and review users flagged for suspicious activity.

### **4. Reliable Event Management**
* Full CRUD operations for event handling with offline-sync capabilities.
* Interactive KPI dashboard for organisers (Revenue tracking, Sell-out rates, Volume share).

---

## 📂 Project Structure

```text
.
├── backend/
│   ├── prisma/           # PostgreSQL Schema & Migrations
│   └── src/
│       ├── controllers/  # Logic handlers
│       ├── models/       # MongoDB/Mongoose models (Chat)
│       ├── routes/       # REST Endpoints
│       ├── utils/        # Stealth Logger & Database Utilities
│       └── server.js     # Express & WebSocket entry point
├── frontend/
│   ├── src/
│   │   ├── assets/       # Styles & Media
│   │   └── components/   # React Components (Dashboard, SocialDrawer)
│   └── tests/            # Playwright E2E tests
└── docs/                 # Project documentation & Assignment specs
