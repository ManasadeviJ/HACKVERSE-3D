/**
 * APPWRITE FUNCTION: deadline-reminder
 * Trigger: CRON — every day at 09:00 UTC → "0 9 * * *"
 * Runtime: node-18.0
 *
 * WHAT IT DOES:
 * Checks events whose registration deadline OR end date is within 24 hours.
 * Sends:
 *   - In-app notification to all registered participants
 *   - Email reminder via Resend (free)
 *   - SMS via Vonage (free credits on signup, ~€0.05/SMS after)
 *     OR Twilio Verify free tier
 *
 * ENV VARS:
 *   RESEND_API_KEY    - from resend.com
 *   FROM_EMAIL        - sender email
 *   VONAGE_API_KEY    - from dashboard.vonage.com (free signup)
 *   VONAGE_API_SECRET - same
 *   SMS_FROM          - your Vonage virtual number or brand name
 *   APPWRITE_API_KEY  - server API key
 */

import { Client, Databases, Query } from 'node-appwrite';

const DB_ID = 'Hackversedb';
const HOURS_24 = 24 * 60 * 60 * 1000;

export default async ({ req, res, log, error }) => {
  const client = new Client()
    .setEndpoint(process.env.APPWRITE_FUNCTION_API_ENDPOINT)
    .setProject(process.env.APPWRITE_FUNCTION_PROJECT_ID)
    .setKey(process.env.APPWRITE_API_KEY);

  const db = new Databases(client);
  const now = Date.now();
  let reminded = 0;

  try {
    // Fetch all published/ongoing events
    const eventsRes = await db.listDocuments(DB_ID, 'events', [
      Query.equal('status', ['published', 'ongoing']),
      Query.limit(100),
    ]);

    for (const event of eventsRes.documents) {
      const regDeadline = new Date(event.registrationDeadline).getTime();
      const endDate     = new Date(event.endDate).getTime();

      const regDue = regDeadline - now;
      const endDue = endDate - now;

      const isRegReminder = regDue > 0 && regDue <= HOURS_24;
      const isSubReminder = endDue > 0 && endDue <= HOURS_24;

      if (!isRegReminder && !isSubReminder) continue;

      const subject = isSubReminder
        ? `⏰ Submission deadline in <24h — ${event.title}`
        : `⏰ Registration closes in <24h — ${event.title}`;

      const bodyText = isSubReminder
        ? `Your project submission window closes in less than 24 hours for "${event.title}". Submit now!`
        : `Registration for "${event.title}" closes in less than 24 hours. Don't miss out!`;

      // Get all registrations for this event
      const regsRes = await db.listDocuments(DB_ID, 'registrations', [
        Query.equal('eventId', event.$id),
        Query.equal('status', 'confirmed'),
        Query.limit(500),
      ]);

      for (const reg of regsRes.documents) {
        // In-app notification
        try {
          await db.createDocument(DB_ID, 'notifications', 'unique()', {
            userId:      reg.userId,
            title:       subject,
            body:        bodyText,
            type:        'announcement',
            referenceId: event.$id,
            isRead:      false,
          });
        } catch { /* non-critical */ }

        // Email
        if (process.env.RESEND_API_KEY) {
          try {
            const profile = await db.getDocument(DB_ID, 'profiles', reg.userId).catch(() => null);
            if (profile?.email) {
              await sendEmail(profile.email, subject, buildReminderEmail(
                profile.name, event.title, bodyText,
                isSubReminder ? event.endDate : event.registrationDeadline,
                isSubReminder
              ));
            }
          } catch { /* non-critical */ }
        }

        // SMS via Vonage (optional — only if phone exists)
        if (process.env.VONAGE_API_KEY && reg.phone) {
          try {
            await sendSMS(reg.phone, `[Hackverse] ${bodyText}`);
          } catch { /* non-critical */ }
        }

        reminded++;
      }
    }

    log(`Deadline reminders sent to ${reminded} participants`);
    return res.json({ ok: true, reminded });
  } catch (err) {
    error(`Deadline reminder failed: ${err.message}`);
    return res.json({ ok: false, error: err.message }, 500);
  }
};

// ── Email (Resend) ─────────────────────────────────────────────────────────────
async function sendEmail(to, subject, html) {
  const r = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: process.env.FROM_EMAIL || 'onboarding@resend.dev',
      to: [to], subject, html,
    }),
  });
  if (!r.ok) { const e = await r.json(); throw new Error(e.message); }
}

// ── SMS (Vonage — free signup tier) ───────────────────────────────────────────
async function sendSMS(to, text) {
  // Vonage REST API — free trial gives 2 EUR credits
  const params = new URLSearchParams({
    api_key:    process.env.VONAGE_API_KEY,
    api_secret: process.env.VONAGE_API_SECRET,
    to:         to.replace(/\D/g, ''),  // digits only
    from:       process.env.SMS_FROM || 'Hackverse',
    text,
  });
  const r = await fetch(`https://rest.nexmo.com/sms/json?${params}`);
  const data = await r.json();
  if (data.messages?.[0]?.status !== '0') {
    throw new Error(`SMS failed: ${data.messages?.[0]?.['error-text']}`);
  }
}

// ── Email HTML template ───────────────────────────────────────────────────────
function buildReminderEmail(name, eventTitle, message, deadline, isSubmission) {
  const deadlineStr = new Date(deadline).toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit',
  });
  return `<!DOCTYPE html><html><head><style>
    body{font-family:-apple-system,sans-serif;background:#070A1F;color:#fff;margin:0;padding:0}
    .c{max-width:560px;margin:40px auto;background:#0D1025;border:1px solid rgba(255,160,0,.3);border-radius:16px;overflow:hidden}
    .h{background:linear-gradient(135deg,#1A0A00,#0D1025);padding:32px;text-align:center;border-bottom:1px solid rgba(255,160,0,.2)}
    .logo{font-size:28px;font-weight:800;color:#fff}.logo span{color:#00F0FF}
    .alert-badge{display:inline-block;padding:8px 20px;background:rgba(255,160,0,.15);border:1px solid rgba(255,160,0,.4);border-radius:20px;color:#FFA500;font-weight:700;margin-top:12px}
    .b{padding:36px}.h1{font-size:22px;margin:0 0 12px;color:#fff}
    p{color:#8899BB;line-height:1.6;margin:0 0 14px}
    .deadline{background:rgba(255,160,0,.08);border:1px solid rgba(255,160,0,.2);border-radius:10px;padding:16px;margin:16px 0;text-align:center}
    .dl-label{color:#FFA500;font-size:12px;text-transform:uppercase;letter-spacing:.08em}
    .dl-time{color:#fff;font-size:18px;font-weight:700;margin-top:4px}
    .btn{display:inline-block;padding:12px 24px;background:${isSubmission?'#00F0FF':'#FFA500'};color:#070A1F;border-radius:10px;text-decoration:none;font-weight:700;margin-top:8px}
    .f{padding:20px 36px;border-top:1px solid rgba(255,255,255,.06);color:#445566;font-size:12px;text-align:center}
  </style></head><body>
  <div class="c">
    <div class="h">
      <div class="logo">HACK<span>VERSE</span></div>
      <div class="alert-badge">⏰ Deadline Reminder</div>
    </div>
    <div class="b">
      <div class="h1">Hey ${name}, don't miss out!</div>
      <p>${message}</p>
      <div class="deadline">
        <div class="dl-label">${isSubmission ? 'Submission closes' : 'Registration closes'}</div>
        <div class="dl-time">${deadlineStr}</div>
      </div>
      <p>Event: <strong style="color:#fff">${eventTitle}</strong></p>
      <a href="https://hackverse.app/participant/${isSubmission?'submission':'my-events'}" class="btn">
        ${isSubmission ? 'Submit Now →' : 'Register Now →'}
      </a>
    </div>
    <div class="f">© ${new Date().getFullYear()} Hackverse · You're registered for this event.</div>
  </div></body></html>`;
}
