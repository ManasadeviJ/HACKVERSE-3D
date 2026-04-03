# Hackverse — Full Appwrite Backend

Complete backend integration for the Hackverse hackathon platform.

## Quick Start

### 1. Install Appwrite SDK in your frontend project
```bash
cd your-project
npm install appwrite
```

### 2. Copy all `src/` files into your project's `src/` folder
Replace the originals — every file in this zip is a drop-in replacement.

### 3. Set up environment variables
Copy `.env.example` to `.env`:
```
VITE_APPWRITE_ENDPOINT=https://sgp.cloud.appwrite.io/v1
VITE_APPWRITE_PROJECT_ID=69cd5240001829f7ebfc
VITE_APPWRITE_PROJECT_NAME=Hackverse
```

### 4. Create Appwrite Database
Run the automated setup script:
```bash
npm install node-appwrite
APPWRITE_API_KEY=your_server_api_key node setup-appwrite.js
```

Get your API key from: Appwrite Console → Project Settings → API Keys → Create API Key (all scopes)

### 5. Create Storage Buckets manually in Appwrite Console
Go to **Storage** and create three buckets:

| Bucket ID | Name | Max Size | File Types |
|-----------|------|----------|------------|
| `avatars` | Avatars | 5 MB | jpg, jpeg, png, webp, gif |
| `submission_files` | Submission Files | 100 MB | any |
| `event_banners` | Event Banners | 10 MB | jpg, jpeg, png, webp |

Set permissions on each bucket:
- Read: `any`
- Create/Update/Delete: `users`

### 6. Enable Appwrite Auth Providers (Console → Auth)
- Email/Password: ✅ Enabled (default)
- Google OAuth: Add Client ID + Secret from Google Cloud Console
- GitHub OAuth: Add Client ID + Secret from GitHub Developer Settings

### 7. Set Collection Permissions in Appwrite Console
For security, update collection-level permissions:

| Collection | Read | Write |
|------------|------|-------|
| profiles | users | users |
| events | any | users |
| teams | users | users |
| team_members | users | users |
| registrations | users | users |
| submissions | users | users |
| evaluations | users | users |
| leaderboard | any | users |
| messages | users | users |
| notifications | users | users |
| invites | any | users |
| announcements | any | users |
| availability | users | users |

---

## File Structure

```
src/
├── lib/
│   └── appwrite.ts          # Appwrite client + IDs
├── types/
│   └── index.ts             # All TypeScript interfaces
├── context/
│   └── AuthContext.tsx      # Global auth state (useAuth hook)
├── layouts/
│   ├── AuthLayout.tsx       # Auth pages wrapper
│   └── MainLayout.tsx       # Main app shell with nav
├── services/
│   ├── authService.ts       # Signup, signin, OAuth, profile, avatar
│   ├── eventService.ts      # CRUD events, publish, assign judges
│   ├── teamService.ts       # Create team, invite code, join, leave
│   ├── registrationService.ts  # Event registration
│   ├── submissionService.ts # Draft/submit projects, file upload
│   ├── evaluationService.ts # Judge scoring, leaderboard auto-rank
│   ├── chatService.ts       # Real-time messages, availability status
│   ├── notificationService.ts  # Real-time notifications
│   └── announcementService.ts  # Organizer announcements + fan-out
├── pages/
│   ├── auth/
│   │   ├── SignIn.tsx        # Email + Google + GitHub
│   │   ├── SignUp.tsx        # 2-step with role selection
│   │   ├── ForgotPassword.tsx
│   │   ├── ResetPassword.tsx
│   │   └── OAuthCallback.tsx
│   ├── participant/
│   │   ├── Dashboard.tsx    # Stats + quick actions
│   │   ├── MyEvents.tsx     # Registered events
│   │   ├── MyTeam.tsx       # Team mgmt + invite link
│   │   ├── Collaboration.tsx  # Real-time team chat
│   │   ├── Submission.tsx   # File upload + submit
│   │   └── Leaderboard.tsx  # Public rankings
│   ├── judge/
│   │   ├── Dashboard.tsx    # Assigned events + submissions
│   │   └── Evaluation.tsx   # Score sliders + feedback
│   ├── organizer/
│   │   ├── Dashboard.tsx    # Events overview + publish
│   │   ├── CreateEvent.tsx  # Multi-step event creation
│   │   ├── ManageTeams.tsx  # All registered teams
│   │   ├── ResultsManagement.tsx  # Leaderboard + publish
│   │   └── Announcements.tsx  # Notify participants/judges
│   ├── Events.tsx           # Browse public events
│   ├── EventDetail.tsx      # Event page + register CTA
│   ├── RegistrationForm.tsx # Multi-step team registration
│   ├── PostInvite.tsx       # Join via invite code/link
│   ├── Profile.tsx          # Edit profile + avatar + password
│   ├── Notifications.tsx    # Real-time notification centre
│   └── Town3D.tsx           # 3D navigation hub
├── App.tsx                  # Routes + auth guards
└── main.tsx                 # Entry point
```

---

## Key Features Implemented

### Auth
- Email/password signup with role selection (participant/judge/organizer)
- Google & GitHub OAuth with auto profile creation
- Password reset via email
- Email verification
- Session persistence (Appwrite handles cookies)
- Protected routes with role-based access control

### Participant
- Browse and filter events
- Multi-step team registration form (saves to Appwrite)
- Create team → auto-generates invite code + link
- Join team via invite code or link (click tracking)
- Real-time team chat with file sharing (Appwrite Realtime)
- Live online/away/offline presence status
- Project submission with file upload to Appwrite Storage
- View evaluations + scores after judging
- Leaderboard with per-criteria breakdown
- 3D town navigation hub (post-event entry point)

### Judge
- View only events they're assigned to
- Score submissions on 4 criteria (0–100 sliders)
- Auto-computed average total score
- Toggle submission visibility on leaderboard
- Edit previous evaluations

### Organizer
- Create events with banner upload, prizes, rules, eligibility
- Publish / manage event status
- Assign judges to events
- View all registered teams + members
- Leaderboard management (auto-ranked from judge scores)
- One-click publish results (notifies all participants)
- Announcements with fan-out push notifications
- Pin/unpin announcements

### Security
- All routes protected by Appwrite session
- Role-based route guards (ProtectedRoute component)
- Organizers can only manage their own events
- Judges can only evaluate events they're assigned to
- Participants can only submit for their own team
- Leaders can only remove members from their own team
- File URLs are gated behind Appwrite Storage auth
