// ─── Auth ─────────────────────────────────────────────────────────────────────
export type UserRole = 'participant' | 'judge' | 'organizer';

// ─── Profile ──────────────────────────────────────────────────────────────────
export interface Profile {
  $id: string;
  $createdAt: string;
  $updatedAt: string;
  userId: string;
  name: string;
  email: string;
  role: UserRole;
  bio: string;
  location: string;
  website: string;
  github: string;
  linkedin: string;
  twitter: string;
  skills: string;           // JSON string: string[]
  avatarFileId: string;
  hackathonsCount: number;
  projectsCount: number;
  winsCount: number;
  teamsCount: number;
  onboardingComplete: boolean;
}

// ─── Event core  (collection: events) ────────────────────────────────────────
// Matches EXACTLY the columns visible in your Appwrite console screenshot
export interface HackEvent {
  $id: string;
  $createdAt: string;
  $updatedAt: string;
  organizerId: string;
  title: string;
  shortDescription: string;
  startDate: string;
  endDate: string;
  registrationDeadline: string;
  maxParticipants: number;
  teamSizeMin: number;
  teamSizeMax: number;
  category: string;
  location: string;
  status: 'draft' | 'published' | 'ongoing' | 'completed' | 'cancelled';
  resultsPublished: boolean;
}

// ─── Event details  (collection: event_details) ───────────────────────────────
// Matches the columns in your event_details screenshot
export interface EventDetails {
  $id: string;
  $createdAt: string;
  $updatedAt: string;
  eventId: string;          // FK → events.$id
  description: string;
  bannerFileId: string;
  prizes: string;           // JSON: [{place, amount, description}]
  rules: string;            // JSON: string[]
  eligibility: string;      // JSON: string[]
  judgeIds: string;         // JSON: string[]
}

// ─── Combined type used throughout the UI ─────────────────────────────────────
// Merge of both documents for convenience in pages/components
export interface FullEvent extends HackEvent, Omit<EventDetails, '$id' | '$createdAt' | '$updatedAt'> {
  detailsId: string;        // event_details.$id — needed for updates
}

// ─── Team ─────────────────────────────────────────────────────────────────────
export interface Team {
  $id: string;
  $createdAt: string;
  $updatedAt: string;
  eventId: string;
  leaderId: string;
  name: string;
  description: string;
  maxMembers: number;
  inviteCode: string;
  inviteLink: string;
  status: 'open' | 'closed' | 'submitted';
}

// ─── TeamMember ───────────────────────────────────────────────────────────────
export interface TeamMember {
  $id: string;
  $createdAt: string;
  teamId: string;
  userId: string;
  eventId: string;
  role: 'leader' | 'member';
  status: 'active' | 'pending' | 'rejected';
  joinedAt: string;
}

// ─── Registration ─────────────────────────────────────────────────────────────
export interface Registration {
  $id: string;
  $createdAt: string;
  eventId: string;
  userId: string;
  teamId: string;
  participantName: string;
  participantEmail: string;
  collegeName: string;
  yearOfStudy: string;
  phone: string;
  tShirtSize: string;
  dietaryRequirements: string;
  emergencyContact: string;
  emergencyPhone: string;
  linkedinUrl: string;
  githubUrl: string;
  experienceLevel: 'beginner' | 'intermediate' | 'advanced';
  motivation: string;
  projectIdea: string;
  status: 'pending' | 'confirmed' | 'waitlisted' | 'cancelled';
}

// ─── Submission ───────────────────────────────────────────────────────────────
export interface Submission {
  $id: string;
  $createdAt: string;
  $updatedAt: string;
  eventId: string;
  teamId: string;
  leaderId: string;
  projectName: string;
  description: string;
  techStack: string;
  githubUrl: string;
  demoUrl: string;
  videoUrl: string;
  presentationUrl: string;
  fileIds: string;
  status: 'draft' | 'submitted' | 'under_review' | 'evaluated';
  submittedAt: string;
}

// ─── Evaluation ───────────────────────────────────────────────────────────────
export interface Evaluation {
  $id: string;
  $createdAt: string;
  $updatedAt: string;
  submissionId: string;
  eventId: string;
  teamId: string;
  judgeId: string;
  innovation: number;
  execution: number;
  presentation: number;
  impact: number;
  totalScore: number;
  feedback: string;
  isVisible: boolean;
}

// ─── Leaderboard ──────────────────────────────────────────────────────────────
export interface LeaderboardEntry {
  $id: string;
  $updatedAt: string;
  eventId: string;
  teamId: string;
  teamName: string;
  projectName: string;
  rank: number;
  totalScore: number;
  innovation: number;
  execution: number;
  presentation: number;
  impact: number;
  memberCount: number;
  isVisible: boolean;
}

// ─── Message ──────────────────────────────────────────────────────────────────
export interface Message {
  $id: string;
  $createdAt: string;
  teamId: string;
  senderId: string;
  senderName: string;
  content: string;
  type: 'text' | 'file';
  fileName: string;
  fileId: string;
  fileSize: string;
  status: 'sent' | 'delivered' | 'read';
}

// ─── Notification ─────────────────────────────────────────────────────────────
export interface Notification {
  $id: string;
  $createdAt: string;
  userId: string;
  title: string;
  body: string;
  type: 'invite' | 'submission' | 'result' | 'announcement' | 'system';
  referenceId: string;
  isRead: boolean;
}

// ─── Invite ───────────────────────────────────────────────────────────────────
export interface Invite {
  $id: string;
  $createdAt: string;
  teamId: string;
  eventId: string;
  inviterId: string;
  inviterName: string;
  inviteCode: string;
  inviteLink: string;
  clicks: number;
  registrations: number;
  expiresAt: string;
}

// ─── Announcement ─────────────────────────────────────────────────────────────
export interface Announcement {
  $id: string;
  $createdAt: string;
  eventId: string;
  organizerId: string;
  title: string;
  content: string;
  type: 'general' | 'urgent' | 'result' | 'schedule';
  targetAudience: 'all' | 'participants' | 'judges';
  isPinned: boolean;
}

// ─── Availability ─────────────────────────────────────────────────────────────
export interface Availability {
  $id: string;
  $updatedAt: string;
  userId: string;
  teamId: string;
  status: 'online' | 'offline' | 'away' | 'busy';
  lastSeen: string;
  customMessage: string;
}
