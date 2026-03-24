/* ═══════════════════════════════════════════════════════════════════════════
   PRITHIVI PULSE – Email Service Server
   Node.js / Express + Nodemailer

   Start:  node server.js   (or: npm start)
   Requires .env – copy .env.example and fill in values.

   Endpoints:
     POST /api/admin/verify-payment        – Approve or reject a payment
     POST /api/admin/send-reminder         – Send reminder to participants
     POST /api/admin/resend-confirmation   – Resend confirmation email
     POST /api/admin/delete-registration   – Delete a registration record
═══════════════════════════════════════════════════════════════════════════ */

'use strict';

const path       = require('path');
const fs         = require('fs');
const express    = require('express');
const cors       = require('cors');
const nodemailer = require('nodemailer');
const rateLimit  = require('express-rate-limit');
const dotenv     = require('dotenv');

// Load environment variables
dotenv.config();

// ─── Supabase ────────────────────────────────────────────────────────────────
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl        = process.env.SUPABASE_URL  || 'https://ikfxcdpyspwpbhsocjno.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || '';

let db = null;
if (supabaseServiceKey) {
  db = createClient(supabaseUrl, supabaseServiceKey);
} else {
  console.warn('⚠️  SUPABASE_SERVICE_KEY not set – database updates will be skipped.');
}

// Table names (must match Supabase)
const TABLES = {
  debate:      'debate_registrations',
  photography: 'photography_registrations',
  poster:      'poster_registrations',
};

// ─── Email Transporter ────────────────────────────────────────────────────────
const transporter = nodemailer.createTransport({
  host:   process.env.SMTP_HOST     || 'smtp.gmail.com',
  port:   parseInt(process.env.SMTP_PORT || '587', 10),
  secure: false, // STARTTLS on port 587
  auth: {
    user: process.env.SMTP_USER     || '',
    pass: process.env.SMTP_PASSWORD || '',
  },
});

const EMAIL_FROM = `"${process.env.EMAIL_FROM_NAME || 'Prithvi Pulse'}" <${process.env.EMAIL_FROM_ADDRESS || process.env.SMTP_USER}>`;
const ADMIN_CC   = process.env.EVENT_ADMIN_EMAIL || '';

// ─── Helpers: load HTML template + fill placeholders ─────────────────────────
function loadTemplate(name) {
  return fs.readFileSync(
    path.join(__dirname, 'email-templates', name),
    'utf8'
  );
}

/**
 * Replace {{key}} and handle {{#if key}}...{{/if}} blocks in an HTML template.
 */
function renderTemplate(html, data) {
  // Handle {{#if key}}...{{/if}} blocks
  html = html.replace(/\{\{#if (\w+)\}\}([\s\S]*?)\{\{\/if\}\}/g, (_, key, content) => {
    return data[key] ? content : '';
  });
  // Replace {{key}} placeholders
  return html.replace(/\{\{(\w+)\}\}/g, (_, key) => {
    return data[key] !== undefined && data[key] !== null ? String(data[key]) : '';
  });
}

// ─── Event name display mapping ───────────────────────────────────────────────
const EVENT_NAMES = {
  debate:      'Green Vichaar Sabha: A debate competition',
  photography: 'Dharti Lens: A nature photography competition',
  poster:      'Green Canvas: a poster making competition',
};

const WHATSAPP_LINKS = {
  debate:      'https://chat.whatsapp.com/D4JeWwV7mLG3H2Y5K58rUl',
  photography: 'https://chat.whatsapp.com/DpvNYjtESfBIOcIIa73HwX',
  poster:      'https://chat.whatsapp.com/CrNcags0xDeG0iJz4QK6Nk',
};

const EVENT_FORMATS = {
  debate:      'Individual participation — In Favour or Against the topic',
  photography: 'Individual participation — Submit your best nature photograph',
  poster:      'Solo or Duo participation — Environment & Sustainability theme',
};

const WHAT_TO_BRING = {
  debate:
    '<li>Valid college ID card</li>' +
    '<li>Confidence and your best arguments</li>' +
    '<li>Pen and notepad for quick notes</li>',
  photography:
    '<li>Valid college ID card</li>' +
    '<li>Your camera (DSLR / mirrorless / mobile — all allowed)</li>' +
    '<li>Charged batteries and sufficient memory card space</li>' +
    '<li>Photography release form (if required by the venue)</li>',
  poster:
    '<li>Valid college ID card</li>' +
    '<li>Your creative ideas — all materials will be provided on-site</li>' +
    '<li>Reference sketches or concept notes (optional)</li>',
};

// ─── Express App ─────────────────────────────────────────────────────────────
const app = express();

// Parse JSON bodies
app.use(express.json());

// CORS – allow the frontend origin
const allowedOrigin = process.env.ALLOWED_ORIGIN || 'http://127.0.0.1:5500';
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (e.g. direct curl / Postman) and the configured frontend origin
    if (!origin || origin === allowedOrigin) {
      callback(null, true);
    } else {
      callback(new Error(`CORS policy: origin ${origin} not allowed`));
    }
  },
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'x-admin-secret'],
}));

// Rate limiting – max 30 email API requests per 10 minutes per IP
const emailLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests – please wait before sending more emails.' },
});
app.use('/api/admin', emailLimiter);

// ─── Admin Secret Middleware ─────────────────────────────────────────────────
const ADMIN_SECRET = process.env.ADMIN_SECRET || '';

function requireAdminSecret(req, res, next) {
  if (!ADMIN_SECRET) {
    // No secret configured – skip check (dev mode)
    return next();
  }
  const provided = req.headers['x-admin-secret'] || req.body?.adminSecret;
  if (!provided || provided !== ADMIN_SECRET) {
    return res.status(401).json({ error: 'Unauthorized – invalid admin secret.' });
  }
  next();
}

// ─── Utility: safe text sanitizer ────────────────────────────────────────────
function safeText(val) {
  if (!val) return '';
  return String(val).replace(/[<>&"]/g, c =>
    ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' }[c])
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   ENDPOINT 1: POST /api/admin/verify-payment
   Payload: { registrationId, eventType, approved, notes, adminSecret }
   – Updates payment_verified + emails participant
══════════════════════════════════════════════════════════════════════════ */
app.post('/api/admin/verify-payment', requireAdminSecret, async (req, res) => {
  const { registrationId, eventType, approved, notes } = req.body;

  if (!registrationId || !eventType || approved === undefined) {
    return res.status(400).json({ error: 'Missing required fields: registrationId, eventType, approved.' });
  }
  if (!TABLES[eventType]) {
    return res.status(400).json({ error: `Unknown eventType: ${eventType}` });
  }

  // ── 1. Update database ──────────────────────────────────────────────────────
  let registration = null;

  if (db) {
    const receiptNumber = `${eventType.toUpperCase().slice(0, 3)}-${registrationId}`;
    const updatePayload = {
      payment_verified:         approved === true,
      payment_notes:            notes || null,
      verification_timestamp:   new Date().toISOString(),
      verification_admin_notes: notes || null,
      confirmation_receipt_number: receiptNumber,
    };

    if (approved) {
      updatePayload.confirmation_email_sent_at = new Date().toISOString();
    }

    const { data, error } = await db
      .from(TABLES[eventType])
      .update(updatePayload)
      .eq('id', registrationId)
      .select()
      .single();

    if (error) {
      console.error('DB update error:', error.message);
      return res.status(500).json({ error: 'Database update failed: ' + error.message });
    }
    registration = data;
  } else {
    // No DB – still send email if payload is complete
    registration = req.body.registrationData || null;
  }

  if (!registration) {
    return res.status(404).json({ error: 'Registration record not found.' });
  }

  // ── 2. Send email ───────────────────────────────────────────────────────────
  const participantEmail = registration.email;
  if (!participantEmail) {
    return res.status(400).json({ error: 'Participant email not found in registration.' });
  }

  try {
    if (approved) {
      // Confirmation email
      const html = renderTemplate(loadTemplate('confirmation-email.html'), {
        participantName:  safeText(registration.name),
        receiptNumber:    safeText(registration.confirmation_receipt_number || `${eventType.toUpperCase().slice(0, 3)}-${registrationId}`),
        eventName:        safeText(EVENT_NAMES[eventType] || eventType),
        rollNo:           safeText(registration.roll_no),
        university:       safeText(registration.university),
        email:            safeText(participantEmail),
        registeredAt:     registration.registered_at
          ? new Date(registration.registered_at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })
          : '—',
        eventFormat:      EVENT_FORMATS[eventType] || '',
        whatToBring:      WHAT_TO_BRING[eventType] || '<li>College ID card</li>',
        whatsappLink:     WHATSAPP_LINKS[eventType] || '',
      });

      await transporter.sendMail({
        from:    EMAIL_FROM,
        to:      participantEmail,
        cc:      ADMIN_CC || undefined,
        subject: '✅ Registration Confirmed – Prithvi Pulse',
        html,
      });
    } else {
      // Rejection email
      const html = renderTemplate(loadTemplate('rejection-email.html'), {
        participantName: safeText(registration.name),
        eventName:       safeText(EVENT_NAMES[eventType] || eventType),
        rejectionReason: safeText(notes) || 'Payment proof could not be verified. Please re-submit with a valid screenshot.',
      });

      await transporter.sendMail({
        from:    EMAIL_FROM,
        to:      participantEmail,
        cc:      ADMIN_CC || undefined,
        subject: '⚠️ Payment Verification Failed – Prithvi Pulse',
        html,
      });
    }

    return res.json({
      success: true,
      message: approved
        ? 'Payment approved and confirmation email sent.'
        : 'Payment rejected and rejection email sent.',
    });

  } catch (emailErr) {
    console.error('Email send error:', emailErr.message);
    // DB was already updated – return partial success
    return res.status(207).json({
      success: false,
      dbUpdated: !!db,
      error: 'DB updated but email failed: ' + emailErr.message,
    });
  }
});

/* ═══════════════════════════════════════════════════════════════════════════
   ENDPOINT 2: POST /api/admin/send-reminder
   Payload: { registrationIds[], eventType, message, customMessage, adminSecret }
   – Sends reminder email(s) to selected participants
══════════════════════════════════════════════════════════════════════════ */
app.post('/api/admin/send-reminder', requireAdminSecret, async (req, res) => {
  const { registrationIds, eventType, customMessage } = req.body;

  if (!registrationIds || !Array.isArray(registrationIds) || registrationIds.length === 0) {
    return res.status(400).json({ error: 'registrationIds must be a non-empty array.' });
  }
  if (!eventType || !TABLES[eventType]) {
    return res.status(400).json({ error: `Unknown or missing eventType.` });
  }

  // Fetch registrations from Supabase
  let registrations = [];
  if (db) {
    const { data, error } = await db
      .from(TABLES[eventType])
      .select('*')
      .in('id', registrationIds);

    if (error) {
      return res.status(500).json({ error: 'Failed to fetch registrations: ' + error.message });
    }
    registrations = data || [];
  } else if (req.body.registrations) {
    registrations = req.body.registrations;
  }

  if (!registrations.length) {
    return res.status(404).json({ error: 'No matching registrations found.' });
  }

  const results = { sent: [], failed: [] };
  const now = new Date().toISOString();

  for (const reg of registrations) {
    if (!reg.email) {
      results.failed.push({ id: reg.id, reason: 'No email address' });
      continue;
    }

    try {
      const html = renderTemplate(loadTemplate('reminder-email.html'), {
        participantName: safeText(reg.name),
        eventName:       safeText(EVENT_NAMES[eventType] || eventType),
        receiptNumber:   safeText(reg.confirmation_receipt_number || `${eventType.toUpperCase().slice(0, 3)}-${reg.id}`),
        eventFormat:     EVENT_FORMATS[eventType] || '',
        whatToBring:     WHAT_TO_BRING[eventType] || '<li>College ID card</li>',
        customMessage:   safeText(customMessage || ''),
        whatsappLink:    WHATSAPP_LINKS[eventType] || '',
      });

      await transporter.sendMail({
        from:    EMAIL_FROM,
        to:      reg.email,
        cc:      ADMIN_CC || undefined,
        subject: `🔔 Reminder: ${EVENT_NAMES[eventType] || 'Prithvi Pulse'} – See You Soon!`,
        html,
      });

      // Update reminder_email_sent_at in DB
      if (db) {
        await db
          .from(TABLES[eventType])
          .update({ reminder_email_sent_at: now })
          .eq('id', reg.id);
      }

      results.sent.push({ id: reg.id, email: reg.email });

    } catch (err) {
      console.error(`Failed to send reminder to ${reg.email}:`, err.message);
      results.failed.push({ id: reg.id, email: reg.email, reason: err.message });
    }
  }

  return res.json({
    success: results.sent.length > 0,
    sent:    results.sent.length,
    failed:  results.failed.length,
    details: results,
  });
});

/* ═══════════════════════════════════════════════════════════════════════════
   ENDPOINT 3: POST /api/admin/resend-confirmation
   Payload: { registrationId, eventType, adminSecret }
   – Resends confirmation email to a participant
══════════════════════════════════════════════════════════════════════════ */
app.post('/api/admin/resend-confirmation', requireAdminSecret, async (req, res) => {
  const { registrationId, eventType } = req.body;

  if (!registrationId || !eventType || !TABLES[eventType]) {
    return res.status(400).json({ error: 'Missing or invalid registrationId / eventType.' });
  }

  let registration = null;
  if (db) {
    const { data, error } = await db
      .from(TABLES[eventType])
      .select('*')
      .eq('id', registrationId)
      .single();

    if (error || !data) {
      return res.status(404).json({ error: 'Registration not found.' });
    }
    registration = data;
  } else if (req.body.registrationData) {
    registration = req.body.registrationData;
  }

  if (!registration?.email) {
    return res.status(400).json({ error: 'No email address on file for this registration.' });
  }

  try {
    const html = renderTemplate(loadTemplate('confirmation-email.html'), {
      participantName:  safeText(registration.name),
      receiptNumber:    safeText(registration.confirmation_receipt_number || `${eventType.toUpperCase().slice(0, 3)}-${registrationId}`),
      eventName:        safeText(EVENT_NAMES[eventType] || eventType),
      rollNo:           safeText(registration.roll_no),
      university:       safeText(registration.university),
      email:            safeText(registration.email),
      registeredAt:     registration.registered_at
        ? new Date(registration.registered_at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })
        : '—',
      eventFormat:      EVENT_FORMATS[eventType] || '',
      whatToBring:      WHAT_TO_BRING[eventType] || '<li>College ID card</li>',
      whatsappLink:     WHATSAPP_LINKS[eventType] || '',
    });

    await transporter.sendMail({
      from:    EMAIL_FROM,
      to:      registration.email,
      cc:      ADMIN_CC || undefined,
      subject: '✅ Registration Confirmed – Prithvi Pulse (Resent)',
      html,
    });

    // Update confirmation_email_sent_at
    if (db) {
      await db
        .from(TABLES[eventType])
        .update({ confirmation_email_sent_at: new Date().toISOString() })
        .eq('id', registrationId);
    }

    return res.json({ success: true, message: 'Confirmation email resent successfully.' });

  } catch (err) {
    console.error('Resend confirmation error:', err.message);
    return res.status(500).json({ error: 'Failed to send email: ' + err.message });
  }
});

// ─── Delete Registration ──────────────────────────────────────────────────────
app.post('/api/admin/delete-registration', requireAdminSecret, async (req, res) => {
  const { registrationId, eventType } = req.body;

  if (!registrationId || !eventType) {
    return res.status(400).json({ error: 'Missing required fields: registrationId, eventType.' });
  }
  if (!TABLES[eventType]) {
    return res.status(400).json({ error: `Unknown eventType: ${eventType}` });
  }
  if (!db) {
    return res.status(503).json({ error: 'Database not configured.' });
  }

  const { data, error, count } = await db
    .from(TABLES[eventType])
    .delete()
    .eq('id', registrationId)
    .select('id');

  if (error) {
    console.error('DB delete error:', error.message);
    return res.status(500).json({ error: 'Database delete failed: ' + error.message });
  }

  if (!data || data.length === 0) {
    return res.status(404).json({ error: 'Registration not found.' });
  }

  res.json({ success: true, message: 'Registration deleted successfully.' });
});

// ─── Health check ─────────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    smtp:   !!process.env.SMTP_USER,
    db:     !!db,
    time:   new Date().toISOString(),
  });
});

// ─── Serve static frontend files ──────────────────────────────────────────────
app.use(express.static(path.join(__dirname)));

// ─── Start Server ─────────────────────────────────────────────────────────────
const PORT = parseInt(process.env.PORT || '3001', 10);
app.listen(PORT, () => {
  console.log(`\n🌿 Prithivi Pulse Email Server running on http://localhost:${PORT}`);
  console.log(`   SMTP host  : ${process.env.SMTP_HOST || '(not configured)'}`);
  console.log(`   SMTP user  : ${process.env.SMTP_USER || '(not configured)'}`);
  console.log(`   Supabase   : ${supabaseUrl}`);
  console.log(`   Admin CC   : ${ADMIN_CC || '(not configured)'}`);
  console.log(`   Allowed origin: ${allowedOrigin}\n`);
});
