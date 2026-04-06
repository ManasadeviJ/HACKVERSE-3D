/**
 * APPWRITE FUNCTION: submission-notifier
 * Trigger: Database → Hackversedb → submissions → onUpdate (status = 'submitted')
 * Runtime: node-18.0
 * Provider: Resend (email) + Appwrite Messaging (in-app)
 * 
 * WHAT IT DOES:
 * 1. When a submission status changes to 'submitted':
 *    a. Sends confirmation email to the team leader
 *    b. Creates in-app notifications for all assigned judges
 *    c. Sends email alerts to judges (optional)
 * 
 * ENV VARS NEEDED:
 *   RESEND_API_KEY   - from resend.com (free)
 *   FROM_EMAIL       - your sender email
 *   APPWRITE_API_KEY - server API key (all scopes) from Appwrite console
 */

import { Client, Databases, Query } from 'node-appwrite';

const DB_ID = 'Hackversedb';

export default async ({ req, res, log, error }) => {
  const client = new Client()
    .setEndpoint(process.env.APPWRITE_FUNCTION_API_ENDPOINT)
    .setProject(process.env.APPWRITE_FUNCTION_PROJECT_ID)
    .setKey(process.env.APPWRITE_API_KEY);

  const db = new Databases(client);

  const submission = req.body;

  // Only act when status changes to 'submitted'
  if (submission.status !== 'submitted') {
    return res.json({ ok: true, skipped: 'not submitted status' });
  }

  try {
    // 1. Get team info
    const team = await db.getDocument(DB_ID, 'teams', submission.teamId);

    // 2. Get leader profile
    const leader = await db.getDocument(DB_ID, 'profiles', submission.leaderId);

    // 3. Get event info
    const event = await db.getDocument(DB_ID, 'events', submission.eventId);

    // 4. Get event_details (for judgeIds)
    const detailsRes = await db.listDocuments(DB_ID, 'event_details', [
      Query.equal('eventId', submission.eventId),
      Query.limit(1),
    ]);
    const judgeIds = detailsRes.documents[0]
      ? JSON.parse(detailsRes.documents[0].judgeIds || '[]')
      : [];

    // ── 5a. In-app notification to leader ──────────────────────────────────
    await db.createDocument(DB_ID, 'notifications', 'unique()', {
      userId:      leader.$id,
      title:       'Project Submitted Successfully! ✅',
      body:        `Your project "${submission.projectName}" for "${event.title}" has been submitted. Good luck!`,
      type:        'submission',
      referenceId: submission.$id,
      isRead:      false,
    });
    log(`In-app notification sent to leader ${leader.name}`);

    // ── 5b. Email confirmation to leader ──────────────────────────────────
    if (process.env.RESEND_API_KEY && leader.email) {
      await sendEmail(
        leader.email,
        `✅ Project Submitted — ${submission.projectName}`,
        buildSubmissionConfirmEmail(leader.name, submission.projectName, event.title, team.name)
      );
      log(`Confirmation email sent to ${leader.email}`);
    }

    // ── 5c. In-app notification to all judges ─────────────────────────────
    for (const judgeId of judgeIds) {
      try {
        await db.createDocument(DB_ID, 'notifications', 'unique()', {
          userId:      judgeId,
          title:       '📋 New Submission Ready for Review',
          body:        `Team "${team.name}" submitted "${submission.projectName}" for "${event.title}". Ready for your evaluation.`,
          type:        'submission',
          referenceId: submission.$id,
          isRead:      false,
        });

        // Email judges too (if RESEND available)
        if (process.env.RESEND_API_KEY) {
          const judge = await db.getDocument(DB_ID, 'profiles', judgeId).catch(() => null);
          if (judge?.email) {
            await sendEmail(
              judge.email,
              `New Submission: ${submission.projectName} — ${event.title}`,
              buildJudgeAlertEmail(judge.name, team.name, submission.projectName, event.title)
            );
          }
        }
      } catch (e) {
        error(`Failed to notify judge ${judgeId}: ${e.message}`);
      }
    }

    log(`Submission notifier completed for ${submission.$id}`);
    return res.json({ ok: true, notifiedJudges: judgeIds.length });

  } catch (err) {
    error(`Submission notifier failed: ${err.message}`);
    return res.json({ ok: false, error: err.message }, 500);
  }
};

// ── Email helper ──────────────────────────────────────────────────────────────
async function sendEmail(to, subject, html) {
  const response = await fetch('https://api.resend.com/emails', {
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
  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.message);
  }
  return response.json();
}

function buildSubmissionConfirmEmail(name, projectName, eventTitle, teamName) {
  return `<!DOCTYPE html><html><head><style>
    body{font-family:-apple-system,sans-serif;background:#070A1F;color:#fff;margin:0;padding:0}
    .c{max-width:560px;margin:40px auto;background:#0D1025;border:1px solid rgba(0,240,255,.2);border-radius:16px;overflow:hidden}
    .h{background:linear-gradient(135deg,#0D1025,#0B2040);padding:32px;text-align:center;border-bottom:1px solid rgba(0,240,255,.15)}
    .logo{font-size:28px;font-weight:800;color:#fff}.logo span{color:#00F0FF}
    .b{padding:36px}.h1{font-size:22px;margin:0 0 12px;color:#fff}
    p{color:#8899BB;line-height:1.6;margin:0 0 14px}
    .row{display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px solid rgba(255,255,255,.06)}
    .label{color:#8899BB;font-size:14px}.value{color:#fff;font-weight:600;font-size:14px}
    .badge{display:inline-block;padding:10px 20px;background:rgba(0,240,255,.1);border:1px solid rgba(0,240,255,.3);border-radius:10px;color:#00F0FF;font-weight:700;margin:16px 0}
    .f{padding:20px 36px;border-top:1px solid rgba(255,255,255,.06);color:#445566;font-size:12px;text-align:center}
  </style></head><body>
  <div class="c">
    <div class="h"><div class="logo">HACK<span>VERSE</span></div></div>
    <div class="b">
      <div class="badge">✅ Submission Confirmed</div>
      <div class="h1">Great work, ${name}!</div>
      <p>Your project has been successfully submitted and is now queued for evaluation by our judges.</p>
      <div class="row"><span class="label">Project</span><span class="value">${projectName}</span></div>
      <div class="row"><span class="label">Event</span><span class="value">${eventTitle}</span></div>
      <div class="row"><span class="label">Team</span><span class="value">${teamName}</span></div>
      <p style="margin-top:20px">Results will be published on the leaderboard once all submissions are evaluated. Stay tuned!</p>
    </div>
    <div class="f">© ${new Date().getFullYear()} Hackverse</div>
  </div></body></html>`;
}

function buildJudgeAlertEmail(judgeName, teamName, projectName, eventTitle) {
  return `<!DOCTYPE html><html><head><style>
    body{font-family:-apple-system,sans-serif;background:#070A1F;color:#fff;margin:0;padding:0}
    .c{max-width:560px;margin:40px auto;background:#0D1025;border:1px solid rgba(0,240,255,.2);border-radius:16px;overflow:hidden}
    .h{background:linear-gradient(135deg,#0D1025,#0B2040);padding:32px;text-align:center;border-bottom:1px solid rgba(0,240,255,.15)}
    .logo{font-size:28px;font-weight:800;color:#fff}.logo span{color:#00F0FF}
    .b{padding:36px}.h1{font-size:22px;margin:0 0 12px;color:#fff}
    p{color:#8899BB;line-height:1.6;margin:0 0 14px}
    .row{display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px solid rgba(255,255,255,.06)}
    .label{color:#8899BB;font-size:14px}.value{color:#fff;font-weight:600;font-size:14px}
    .btn{display:inline-block;padding:12px 24px;background:#00F0FF;color:#070A1F;border-radius:10px;text-decoration:none;font-weight:700;margin-top:16px}
    .f{padding:20px 36px;border-top:1px solid rgba(255,255,255,.06);color:#445566;font-size:12px;text-align:center}
  </style></head><body>
  <div class="c">
    <div class="h"><div class="logo">HACK<span>VERSE</span></div></div>
    <div class="b">
      <div class="h1">📋 New Submission Ready, ${judgeName}</div>
      <p>A team has submitted their project and is awaiting your evaluation.</p>
      <div class="row"><span class="label">Project</span><span class="value">${projectName}</span></div>
      <div class="row"><span class="label">Team</span><span class="value">${teamName}</span></div>
      <div class="row"><span class="label">Event</span><span class="value">${eventTitle}</span></div>
      <p style="margin-top:20px">Log in to your judge dashboard to review and score this submission.</p>
      <a href="https://hackverse.app/judge/dashboard" class="btn">Go to Judge Dashboard →</a>
    </div>
    <div class="f">© ${new Date().getFullYear()} Hackverse</div>
  </div></body></html>`;
}
