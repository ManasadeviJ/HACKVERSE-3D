/**
 * APPWRITE FUNCTION: welcome-email
 * Trigger: Database → Hackversedb → profiles → onCreate
 * Runtime: node-18.0
 * Provider: Resend (free tier: 3000 emails/month, no credit card)
 * 
 * SETUP STEPS:
 * 1. Go to https://resend.com → Sign up free → Create API key
 * 2. In Appwrite Console → Functions → Create Function
 *    - Name: welcome-email
 *    - Runtime: Node.js 18
 *    - Events: databases.Hackversedb.collections.profiles.documents.*.create
 * 3. Add env var: RESEND_API_KEY = re_xxxxx
 * 4. Add env var: FROM_EMAIL = noreply@yourdomain.com (or onboarding@resend.dev for testing)
 * 5. Deploy this file as index.js
 */

import { Client, Databases } from 'node-appwrite';

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM_EMAIL     = process.env.FROM_EMAIL || 'onboarding@resend.dev';

export default async ({ req, res, log, error }) => {
  const client = new Client()
    .setEndpoint(process.env.APPWRITE_FUNCTION_API_ENDPOINT)
    .setProject(process.env.APPWRITE_FUNCTION_PROJECT_ID)
    .setKey(req.headers['x-appwrite-key'] ?? '');

  // Parse the triggered document
  const profile = req.body;
  const { name, email, role } = profile;

  if (!email) {
    error('No email in profile document');
    return res.json({ ok: false, reason: 'no email' });
  }

  const roleGreetings = {
    participant: 'Ready to build, compete, and win? Explore hackathons and form your team.',
    judge:       'Get ready to review innovative projects. Your evaluations help crown the best builders.',
    organizer:   'You can now create and manage hackathons. Start by creating your first event.',
  };

  const html = `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"><style>
      body { font-family: -apple-system, sans-serif; background: #070A1F; color: #fff; margin: 0; padding: 0; }
      .container { max-width: 560px; margin: 40px auto; background: #0D1025; border: 1px solid rgba(0,240,255,0.2); border-radius: 16px; overflow: hidden; }
      .header { background: linear-gradient(135deg, #0D1025 0%, #0B2040 100%); padding: 40px; text-align: center; border-bottom: 1px solid rgba(0,240,255,0.15); }
      .logo { font-size: 32px; font-weight: 800; color: #fff; letter-spacing: -1px; }
      .logo span { color: #00F0FF; }
      .body { padding: 40px; }
      h1 { font-size: 24px; margin: 0 0 12px; color: #fff; }
      p { color: #8899BB; line-height: 1.6; margin: 0 0 16px; }
      .badge { display: inline-block; padding: 4px 12px; background: rgba(0,240,255,0.1); border: 1px solid rgba(0,240,255,0.3); border-radius: 20px; color: #00F0FF; font-size: 13px; font-weight: 600; text-transform: capitalize; margin-bottom: 20px; }
      .btn { display: inline-block; padding: 14px 28px; background: #00F0FF; color: #070A1F; border-radius: 10px; text-decoration: none; font-weight: 700; font-size: 15px; margin-top: 8px; }
      .footer { padding: 24px 40px; border-top: 1px solid rgba(255,255,255,0.06); color: #445566; font-size: 13px; text-align: center; }
    </style></head>
    <body>
    <div class="container">
      <div class="header">
        <div class="logo">HACK<span>VERSE</span></div>
        <p style="color:#8899BB;margin-top:8px;font-size:14px;">Where Code Meets Cosmos</p>
      </div>
      <div class="body">
        <h1>Welcome, ${name}! 👋</h1>
        <div class="badge">${role}</div>
        <p>${roleGreetings[role] || 'Welcome to the Hackverse community!'}</p>
        <p>Your account is ready. Dive in and start your hackathon journey.</p>
        <a href="${process.env.APPWRITE_FUNCTION_PROJECT_ID ? 'https://hackverse.app' : 'http://localhost:5173'}" class="btn">Go to Hackverse →</a>
      </div>
      <div class="footer">© ${new Date().getFullYear()} Hackverse · You're receiving this because you signed up.</div>
    </div>
    </body></html>
  `;

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from:    FROM_EMAIL,
        to:      [email],
        subject: `Welcome to Hackverse, ${name}! 🚀`,
        html,
      }),
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.message || 'Resend API error');
    log(`Welcome email sent to ${email} (id: ${data.id})`);
    return res.json({ ok: true, emailId: data.id });
  } catch (err) {
    error(`Failed to send welcome email: ${err.message}`);
    return res.json({ ok: false, error: err.message }, 500);
  }
};
