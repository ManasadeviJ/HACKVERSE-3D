# Hackverse 🚀

### Cloud-Native 3D Hackathon Management Platform

Hackverse is a full-stack hackathon management platform designed to manage the complete lifecycle of hackathon events through a single unified platform. The system provides real-time collaboration, automated evaluation, leaderboard ranking, secure role-based access control, cloud file storage, and an immersive 3D navigation experience.

One app. Three roles. Fourteen database collections. Everything from registration to result publishing, live — no refresh, no spreadsheet, no manual anything.

Built using React, TypeScript, Appwrite BaaS, and Three.js, Hackverse eliminates the need for multiple disconnected tools like Google Forms, spreadsheets, messaging apps, and manual score management. 

---

# ✨ Features

* Multi-role authentication system
* Participant, Judge, and Organizer dashboards
* Event creation and management
* Team creation with invite links and codes
* Real-time team chat using WebSockets
* Real-time notifications and announcements
* Project submission with cloud file uploads
* Multi-criteria evaluation engine
* Auto-generated leaderboard ranking
* OAuth login with Google and GitHub
* Presence tracking (online/offline/away)
* Interactive 3D Town Navigation Hub
* Fully responsive modern UI
* Zero backend server management

---

# 🛠 Tech Stack

## Frontend

* React 19
* TypeScript
* Vite
* Tailwind CSS
* Radix UI
* React Router DOM
* React Hook Form
* Zod

## Backend / BaaS

* Appwrite Cloud
* Appwrite Database
* Appwrite Authentication
* Appwrite Storage
* Appwrite Realtime
* Appwrite Functions

## 3D & Animation

* Three.js
* React Three Fiber
* @react-three/drei
* GSAP

## Visualization

* Recharts

---

# 🏗 Architecture

Hackverse follows a cloud-native three-tier architecture:

### Presentation Layer

React SPA with responsive UI, protected routes, and role-based dashboards.

### Service Layer

Modular TypeScript service modules handling authentication, events, teams, submissions, evaluations, chat, and notifications.

### Data Layer

Appwrite Cloud services for:

* Authentication
* Database
* Storage
* Realtime WebSockets
* Cloud Functions

The frontend communicates directly with Appwrite services without requiring a custom backend server. 

---

# 🔐 User Roles

## Participant

* Register for hackathons
* Create or join teams
* Collaborate in team chat
* Submit projects
* Track leaderboard rankings

## Judge

* Access assigned events
* Evaluate submissions
* Score projects on multiple criteria
* Publish results

## Organizer

* Create and manage events
* Assign judges
* Publish announcements
* Manage registrations and submissions
* Control leaderboard visibility

---

# 📂 Project Structure

```bash
src/
│
├── components/
├── pages/
├── services/
├── routes/
├── context/
├── hooks/
├── utils/
├── assets/
└── three/
```

---

# 🗄 Database Collections

Hackverse uses 14 Appwrite collections:

* profiles
* events
* event_details
* teams
* team_members
* registrations
* submissions
* evaluations
* leaderboard
* messages
* notifications
* announcements
* invites
* availability

---

# ⚙️ Core Modules

## Authentication Module

Supports Email/Password authentication and OAuth login with Google and GitHub using Appwrite Account services.

## Event Management Module

Allows organizers to create, publish, manage, and monitor hackathon events.

## Team Management Module

Supports team creation, invite codes, invite analytics, and membership management.

## Registration Module

Provides validated multi-step registration forms using React Hook Form and Zod.

## Submission Module

Enables draft saving, project submissions, and cloud file uploads up to 100MB.

## Evaluation Engine

Automatically computes scores, aggregates judge evaluations, and updates leaderboard rankings.

## Real-Time Chat Module

Implements instant messaging and presence tracking using Appwrite Realtime WebSockets.

## Notification Module

Provides real-time user notifications and announcement broadcasting.

## 3D Town Module

Interactive WebGL-based navigation hub built using Three.js and React Three Fiber. 

---

# ⚡ Real-Time Features

* Live team chat
* Instant notifications
* Live leaderboard updates
* Presence tracking
* Real-time announcement delivery

Average real-time latency is below 200ms.

---


# 🚀 Installation

## Clone Repository

```bash
git clone https://github.com/your-username/hackverse.git
cd hackverse
```

---

## Install Dependencies

```bash
npm install
```

---

## Configure Environment Variables

Create a `.env` file:

```env
VITE_APPWRITE_ENDPOINT=
VITE_APPWRITE_PROJECT_ID=
VITE_APPWRITE_DATABASE_ID=
VITE_APPWRITE_BUCKET_ID=
```

---

## Start Development Server

```bash
npm run dev
```

---

# 🌐 Deployment


Backend services hosted on:

* Appwrite Cloud (Singapore Region)

---


# 👨‍💻 Contributors

* Manasadevi J
* Menakha Priya N

---

# 📜 License

This project is developed for academic, research, and educational purposes.
