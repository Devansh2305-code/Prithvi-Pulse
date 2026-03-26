/* ═══════════════════════════════════════════
   PRITHIVI PULSE – Application Logic
   Database: Supabase
═══════════════════════════════════════════ */

// ─── Supabase Configuration ──────────────────
const SUPABASE_URL  = 'https://ikfxcdpyspwpbhsocjno.supabase.co';
const SUPABASE_KEY  = 'sb_publishable_Ez54984qCEZC7Mg7gZhn6g_eeeABtzE';

// Initialise the Supabase client (SDK loaded via CDN)
const { createClient } = supabase;
const db = createClient(SUPABASE_URL, SUPABASE_KEY);

// ─── Table names ─────────────────────────────
const TABLES = {
  debate:      'debate_registrations',
  photography: 'photography_registrations',
  poster:      'poster_registrations',
};

// ─── Human-readable event names ──────────────
const EVENT_DISPLAY_NAMES = {
  debate:      'Green Vichaar Sabha: A debate competition',
  photography: 'Dharti Lens: A nature photography competition',
  poster:      'Green Canvas: a poster making competition',
};

// ─── localStorage fallback keys (used if Supabase unreachable) ───
const LS_KEYS = {
  debate:      'pp_debate',
  photography: 'pp_photography',
  poster:      'pp_poster',
};

// ─── Email Service API (Node.js / Express backend) ───────────────
// Uses a relative path so it works in both development and production.
// Override by setting window.EMAIL_API_URL before this script loads.
const EMAIL_API_URL = (typeof window.EMAIL_API_URL !== 'undefined' && window.EMAIL_API_URL)
  ? window.EMAIL_API_URL
  : '';
// Admin secret must match ADMIN_SECRET in your .env file.
// If left empty the server accepts all requests (dev mode).
const ADMIN_API_SECRET = '';

/* ════════════════════════════════════════════
   NAVBAR – scroll effect + hamburger
════════════════════════════════════════════ */
const navbar    = document.getElementById('navbar');
const hamburger = document.getElementById('hamburger');
const navLinks  = document.getElementById('navLinks');

window.addEventListener('scroll', () => {
  navbar.classList.toggle('scrolled', window.scrollY > 40);
});

hamburger.addEventListener('click', () => {
  navLinks.classList.toggle('open');
});

navLinks.querySelectorAll('a').forEach(link => {
  link.addEventListener('click', () => navLinks.classList.remove('open'));
});

/* ════════════════════════════════════════════
   HERO PARTICLES & FLOATING LEAVES
════════════════════════════════════════════ */
function createLeaves() {
  const container = document.getElementById('floatingLeaves');
  const leafEmojis = ['🍃', '🌿', '🍀', '🌱', '🍂', '🌾'];
  for (let i = 0; i < 18; i++) {
    const leaf = document.createElement('span');
    leaf.classList.add('leaf');
    leaf.textContent = leafEmojis[Math.floor(Math.random() * leafEmojis.length)];
    leaf.style.left             = `${Math.random() * 100}%`;
    leaf.style.fontSize         = `${0.8 + Math.random() * 1.4}rem`;
    leaf.style.opacity          = `${0.15 + Math.random() * 0.35}`;
    leaf.style.animationDuration = `${8 + Math.random() * 14}s`;
    leaf.style.animationDelay   = `${Math.random() * 10}s`;
    container.appendChild(leaf);
  }
}

function createParticles() {
  const container = document.getElementById('heroParticles');
  for (let i = 0; i < 50; i++) {
    const dot = document.createElement('div');
    dot.style.cssText = `
      position:absolute;
      width:${2 + Math.random() * 4}px;
      height:${2 + Math.random() * 4}px;
      left:${Math.random() * 100}%;
      top:${Math.random() * 100}%;
      border-radius:50%;
      background:rgba(58,175,106,${0.1 + Math.random() * 0.25});
      animation:pulse ${4 + Math.random() * 6}s ${Math.random() * 4}s ease-in-out infinite;
    `;
    container.appendChild(dot);
  }
}

createLeaves();
createParticles();

/* ════════════════════════════════════════════
   SCROLL REVEAL
════════════════════════════════════════════ */
window.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.event-card, .about-card, .stat-card, .contact-card, .guest-card').forEach(el => {
    el.classList.add('reveal');
  });

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12 });

  document.querySelectorAll('.reveal').forEach(el => observer.observe(el));
});

/* ════════════════════════════════════════════
   EVENT TAB SWITCHER (Registration)
════════════════════════════════════════════ */
function switchTab(event) {
  document.querySelectorAll('.event-tab').forEach(t => t.classList.remove('active'));
  document.getElementById(`tab-${event}`).classList.add('active');
  document.querySelectorAll('.reg-form-wrap').forEach(f => f.classList.remove('active'));
  document.getElementById(`form-${event}`).classList.add('active');
}

function selectEvent(event) {
  switchTab(event);
}

/* ════════════════════════════════════════════
   POSTER – Solo / Duo toggle
════════════════════════════════════════════ */
function togglePartnerFields(radio) {
  const partnerFields = document.getElementById('partnerFields');
  const partnerNameInput   = document.getElementById('pm-partner-name');
  const partnerRollInput   = document.getElementById('pm-partner-rollno');
  if (radio.value === 'Duo') {
    partnerFields.classList.remove('hidden');
    partnerNameInput.required = true;
    partnerRollInput.required = true;
  } else {
    partnerFields.classList.add('hidden');
    partnerNameInput.required = false;
    partnerRollInput.required = false;
    partnerNameInput.value = '';
    partnerRollInput.value = '';
  }
}

/* ════════════════════════════════════════════
   PAYMENT MODAL – State & Constants
════════════════════════════════════════════ */
const EXPECTED_UPI_ID    = '7678695012@ptyes';
const PAYMENT_BUCKET     = 'payment-screenshots';
const PAYMENT_AMOUNTS    = { debate: '₹50 — Debate Registration', photography: '₹50 — Photography Registration', poster: '₹50 — Poster Making Registration' };
const MS_PER_MINUTE      = 60 * 1000;
const PAYMENT_VERIFY_WINDOW_MS = 30 * MS_PER_MINUTE; // 30-minute tolerance window for screenshot timestamp
// UPI ID format: local-part@psp  (letters, digits, dots, hyphens, underscores)
const UPI_ID_REGEX       = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9]+$/;

// Temporary state while payment modal is open
let _pendingEventType = null;
let _pendingFormData  = null;
let _pendingFormEl    = null;
let _pendingBtn       = null;
let _registrationTime = null;
let _screenshotFile   = null;

/* ════════════════════════════════════════════
   PAYMENT MODAL – Show / Close
════════════════════════════════════════════ */
function showPaymentModal(eventType, formData, formEl, btn) {
  _pendingEventType  = eventType;
  _pendingFormData   = formData;
  _pendingFormEl     = formEl;
  _pendingBtn        = btn;
  _registrationTime  = Date.now();
  _screenshotFile    = null;

  // Reset modal UI
  document.getElementById('modal-payment-screenshot').value = '';
  document.getElementById('modal-screenshotPreviewWrap').classList.add('hidden');
  document.getElementById('modal-screenshotPreview').src    = '';
  document.getElementById('modal-paymentStatus').classList.add('hidden');
  document.getElementById('modal-payer-upi').value          = '';
  document.getElementById('paymentSubmitBtn').disabled      = true;

  // Set event-specific text
  document.getElementById('paymentQrAmount').textContent    = PAYMENT_AMOUNTS[eventType] || '₹50 — Registration';

  document.getElementById('paymentModal').classList.add('active');
}

function closePaymentModal() {
  document.getElementById('paymentModal').classList.remove('active');
  // Re-enable the form submit button so user can try again
  if (_pendingBtn) {
    _pendingBtn.disabled    = false;
    _pendingBtn.textContent = _pendingBtn.getAttribute('data-label') || 'Register';
  }
  _pendingEventType = null;
  _pendingFormData  = null;
  _pendingFormEl    = null;
  _pendingBtn       = null;
  _screenshotFile   = null;
}

// Close modal when clicking backdrop
document.getElementById('paymentModal').addEventListener('click', function (e) {
  if (e.target === this) closePaymentModal();
});

/* ════════════════════════════════════════════
   PAYMENT MODAL – Screenshot Handler
════════════════════════════════════════════ */
function handleModalScreenshot(input) {
  const file        = input.files[0];
  const previewWrap = document.getElementById('modal-screenshotPreviewWrap');
  const previewImg  = document.getElementById('modal-screenshotPreview');
  const statusBox   = document.getElementById('modal-paymentStatus');
  const submitBtn   = document.getElementById('paymentSubmitBtn');

  _screenshotFile = null;
  submitBtn.disabled = true;

  if (!file) {
    previewWrap.classList.add('hidden');
    statusBox.classList.add('hidden');
    return;
  }

  if (file.size > 5 * 1024 * 1024) {
    statusBox.classList.remove('hidden');
    statusBox.className = 'payment-status payment-status--warn';
    statusBox.textContent = '⚠️ File too large. Please upload an image under 5 MB.';
    input.value = '';
    return;
  }

  const reader = new FileReader();
  reader.onload = (e) => {
    previewImg.src = e.target.result;
    previewWrap.classList.remove('hidden');
    statusBox.classList.remove('hidden');
    statusBox.className = 'payment-status payment-status--pending';
    statusBox.textContent = '⏳ Screenshot uploaded — click "Verify & Complete Registration" to proceed.';
    _screenshotFile    = file;
    submitBtn.disabled = false;
  };
  reader.readAsDataURL(file);
}

/* ════════════════════════════════════════════
   PAYMENT VERIFICATION
════════════════════════════════════════════ */
/**
 * Validate the payment:
 *  1. Screenshot must be uploaded
 *  2. File last-modified time should be within PAYMENT_VERIFY_WINDOW_MS of registration time
 *  3. If payer UPI ID entered, validate format and check against expected UPI
 * Returns { verified: boolean, upiId: string, paymentTimestamp: string, notes: string }
 */
function verifyPayment(screenshotFile, payerUpi) {
  const now  = Date.now();
  const fileTime     = screenshotFile.lastModified || now;
  const timeDiff     = Math.abs(now - fileTime);
  const withinWindow = timeDiff <= PAYMENT_VERIFY_WINDOW_MS;

  const upiId    = (payerUpi || '').trim();
  const upiValid = upiId.length === 0 || UPI_ID_REGEX.test(upiId);
  const upiMatch = upiId === EXPECTED_UPI_ID;

  const paymentTimestamp = new Date(fileTime).toISOString();

  // Determine verification status and notes
  let verified = false;
  let notes    = '';

  if (!upiValid) {
    // Invalid UPI format – cannot verify, needs manual review
    notes = `Invalid UPI ID format entered: "${upiId}". Manual verification needed.`;
  } else if (!withinWindow) {
    notes = `Screenshot timestamp is ${Math.round(timeDiff / MS_PER_MINUTE)} min away from registration time. Manual verification needed.`;
  } else if (upiId.length > 0 && !upiMatch) {
    notes = `Payer UPI (${upiId}) does not match expected UPI (${EXPECTED_UPI_ID}). Manual verification needed.`;
  } else if (upiId.length > 0 && upiMatch) {
    verified = true;
    notes = 'UPI ID matches and screenshot is recent. Auto-verified.';
  } else {
    // Screenshot within window but no UPI provided – pending admin review
    notes = 'Screenshot uploaded. Awaiting admin verification.';
  }

  return { verified, upiId: upiId || null, paymentTimestamp, notes };
}

/* ════════════════════════════════════════════
   VERIFY & SUBMIT (called from payment modal)
════════════════════════════════════════════ */
async function verifyAndSubmit() {
  if (!_screenshotFile || !_pendingEventType || !_pendingFormData) return;

  const submitBtn = document.getElementById('paymentSubmitBtn');
  const statusBox = document.getElementById('modal-paymentStatus');
  const payerUpi  = document.getElementById('modal-payer-upi').value;

  submitBtn.disabled    = true;
  submitBtn.textContent = 'Verifying…';

  // Run payment verification
  const { verified, upiId, paymentTimestamp, notes } = verifyPayment(_screenshotFile, payerUpi);

  // Try to upload screenshot to Supabase Storage
  let screenshotUrl = null;
  try {
    const ext      = _screenshotFile.name.split('.').pop() || 'jpg';
    const uuid     = (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const fileName = `${_pendingEventType}/${uuid}.${ext}`;
    const { data: uploadData, error: uploadError } = await db.storage
      .from(PAYMENT_BUCKET)
      .upload(fileName, _screenshotFile, { cacheControl: '3600', upsert: false });
    if (!uploadError && uploadData) {
      const { data: urlData } = db.storage.from(PAYMENT_BUCKET).getPublicUrl(fileName);
      screenshotUrl = urlData?.publicUrl || null;
    }
  } catch (_) {
    // Storage upload failure is non-fatal
  }

  // Merge payment data into registration payload
  const fullData = {
    ..._pendingFormData,
    payment_uploaded:        true,
    payment_upi_id:          upiId,
    payment_timestamp:       paymentTimestamp,
    payment_verified:        verified,
    payment_screenshot_url:  screenshotUrl,
    payment_notes:           notes,
  };

  try {
    const { error } = await db.from(TABLES[_pendingEventType]).insert([fullData]);
    if (error) throw error;
  } catch (err) {
    console.error('Supabase insert failed:', err.message, err);

    let userMessage = '❌ Registration failed. Please try again.';

    const msg = (err.message || '').toLowerCase();
    const code = err.code || '';

    if (msg.includes('failed to fetch') || msg.includes('networkerror') || msg.includes('network request failed') || err.name === 'TypeError') {
      userMessage = '❌ Network error: unable to reach the registration server. Please check your internet connection and try again.';
    } else if (msg.includes('cors') || msg.includes('cross-origin') || msg.includes('blocked by cors')) {
      userMessage = '❌ Connection blocked (CORS). Please contact support or try again later.';
    } else if (code === '23505' || msg.includes('duplicate') || msg.includes('already exists') || msg.includes('unique')) {
      userMessage = `❌ You are already registered for ${EVENT_DISPLAY_NAMES[_pendingEventType] || 'this event'}. Duplicate registrations are not allowed.`;
    } else if (code === '42501' || msg.includes('permission denied') || msg.includes('not authorized')) {
      userMessage = '❌ Registration is currently disabled. Please contact the event organiser.';
    } else if (code === '23503' || msg.includes('violates foreign key')) {
      userMessage = '❌ Invalid registration data. Please refresh and try again.';
    } else if (msg.includes('jwt') || msg.includes('token') || msg.includes('auth')) {
      userMessage = '❌ Authentication error. Please refresh the page and try again.';
    } else if (err.message) {
      userMessage = `❌ Registration failed: ${err.message}`;
    }

    statusBox.classList.remove('hidden');
    statusBox.className   = 'payment-status payment-status--warn';
    statusBox.textContent = userMessage;
    submitBtn.disabled    = false;
    submitBtn.textContent = 'Verify & Complete Registration ✅';
    return;
  }

  // Reset form
  _pendingFormEl.reset();
  if (_pendingBtn) {
    _pendingBtn.disabled    = false;
    _pendingBtn.textContent = _pendingBtn.getAttribute('data-label') || 'Register';
  }

  // Close payment modal
  document.getElementById('paymentModal').classList.remove('active');

  // Show success modal (with payment status context)
  showSuccessModal(_pendingEventType, _pendingFormData.name, verified);

  // Clear pending state
  _pendingEventType = null;
  _pendingFormData  = null;
  _pendingFormEl    = null;
  _pendingBtn       = null;
  _screenshotFile   = null;
}

/* ════════════════════════════════════════════
   INLINE FORM ERROR DISPLAY
════════════════════════════════════════════ */
function showFormError(btn, message) {
  const formWrap = btn.closest('form');
  if (!formWrap) return;
  let errEl = formWrap.querySelector('.form-error-msg');
  if (!errEl) {
    errEl = document.createElement('p');
    errEl.className = 'form-error-msg';
    errEl.style.cssText = 'color:#e74c3c;font-size:.9rem;margin:.75rem 0 0;text-align:center;font-weight:500;';
    btn.insertAdjacentElement('afterend', errEl);
  }
  errEl.textContent = message;
  setTimeout(() => { if (errEl.parentNode) errEl.remove(); }, 6000);
}

/* ════════════════════════════════════════════
   DUPLICATE REGISTRATION CHECK
════════════════════════════════════════════ */
async function checkDuplicateRegistration(email) {
  if (!email) return null;
  const lowerEmail = email.toLowerCase().trim();
  try {
    const checks = await Promise.all(
      Object.entries(TABLES).map(([type, table]) =>
        db.from(table).select('id').ilike('email', lowerEmail).limit(1)
          .then(({ data }) => (data && data.length > 0 ? EVENT_DISPLAY_NAMES[type] : null))
      )
    );
    return checks.find(Boolean) || null;
  } catch (err) {
    console.error('Duplicate registration check failed:', err.message);
    return null;
  }
}

/* ════════════════════════════════════════════
   FORM SUBMISSION  →  Show Payment Modal (for all events)
════════════════════════════════════════════ */
async function handleSubmit(e, eventType) {
  e.preventDefault();

  const btn = e.target.querySelector('.btn-submit');
  btn.disabled    = true;
  btn.textContent = 'Processing…';

  const data = buildRegistrationData(eventType);
  if (!data) { btn.disabled = false; btn.textContent = 'Try Again'; return; }

  // Check for duplicate registration across all events
  const dupCheck = await checkDuplicateRegistration(data.email);
  if (dupCheck) {
    btn.disabled    = false;
    btn.textContent = btn.getAttribute('data-label') || 'Register';
    showFormError(btn, `⚠️ Already registered for "${dupCheck}". Only one event allowed.`);
    return;
  }

  // All events are paid – show payment modal
  showPaymentModal(eventType, data, e.target, btn);
}

/* ── Build payload objects for each event type ── */
function buildRegistrationData(eventType) {
  if (eventType === 'debate') {
    return {
      name:       cleanVal('d-name'),
      contact:    cleanVal('d-contact'),
      email:      cleanVal('d-email'),
      university: cleanVal('d-university'),
      roll_no:    cleanVal('d-rollno'),
      stance:     cleanVal('d-stance'),
      experience: cleanVal('d-experience') || null,
    };
  }
  if (eventType === 'photography') {
    return {
      name:       cleanVal('p-name'),
      contact:    cleanVal('p-contact'),
      email:      cleanVal('p-email'),
      university: cleanVal('p-university'),
      roll_no:    cleanVal('p-rollno'),
      theme:      cleanVal('p-theme') || null,
      experience: cleanVal('p-experience') || null,
    };
  }
  if (eventType === 'poster') {
    const participationType = document.querySelector('input[name="pm-participation"]:checked')?.value || 'Solo';
    const partnerName   = participationType === 'Duo' ? (cleanVal('pm-partner-name') || null) : null;
    const partnerRollNo = participationType === 'Duo' ? (cleanVal('pm-partner-rollno') || null) : null;
    return {
      name:               cleanVal('pm-name'),
      contact:            cleanVal('pm-contact'),
      email:              cleanVal('pm-email'),
      university:         cleanVal('pm-university'),
      roll_no:            cleanVal('pm-rollno'),
      medium:             cleanVal('pm-medium'),
      concept:            cleanVal('pm-concept') || null,
      participation_type: participationType,
      partner_name:       partnerName,
      partner_roll_no:    partnerRollNo,
    };
  }
  return null;
}

function cleanVal(id) {
  const el = document.getElementById(id);
  return el ? el.value.trim() : '';
}

function getLocalRegistrations(eventType) {
  try { return JSON.parse(localStorage.getItem(LS_KEYS[eventType])) || []; }
  catch { return []; }
}

/* ════════════════════════════════════════════
   SUCCESS MODAL
════════════════════════════════════════════ */
const MODAL_MESSAGES = {
  debate:      "You're registered for Green Vichaar Sabha: A debate competition! We'll confirm your stance and share topic details soon.",
  photography: "You're registered for Dharti Lens: A nature photography competition! Bring your best lens and let nature speak.",
  poster:      "You're registered for Green Canvas: a poster making competition! Get your creative juices flowing. See you there!",
};

const WHATSAPP_LINKS = {
  debate:      'https://chat.whatsapp.com/D4JeWwV7mLG3H2Y5K58rUl',
  photography: 'https://chat.whatsapp.com/DpvNYjtESfBIOcIIa73HwX',
  poster:      'https://chat.whatsapp.com/CrNcags0xDeG0iJz4QK6Nk',
};

function showSuccessModal(eventType, name, paymentVerified) {
  document.getElementById('modalTitle').textContent = `Welcome, ${name || 'Participant'}! 🎉`;
  let msg = MODAL_MESSAGES[eventType];
  if (paymentVerified === true) {
    msg += ' ✅ Payment verified automatically.';
  } else if (paymentVerified === false) {
    msg += ' ⏳ Your payment screenshot has been received and will be verified by our team shortly.';
  }
  document.getElementById('modalMsg').textContent = msg;

  // Show WhatsApp group link
  const whatsappLink = WHATSAPP_LINKS[eventType];
  let waEl = document.getElementById('modalWhatsapp');
  if (whatsappLink) {
    if (!waEl) {
      waEl = document.createElement('p');
      waEl.id = 'modalWhatsapp';
      waEl.style.cssText = 'margin-top:14px;font-size:.95rem;';
      document.getElementById('modalMsg').insertAdjacentElement('afterend', waEl);
    }
    waEl.innerHTML = `📲 Join our WhatsApp group for updates: <a href="${whatsappLink}" target="_blank" rel="noopener noreferrer" style="color:#3aaf6a;font-weight:600;word-break:break-all;">${whatsappLink}</a>`;
  } else if (waEl) {
    waEl.remove();
  }

  document.getElementById('successModal').classList.add('active');
}

function closeModal() {
  document.getElementById('successModal').classList.remove('active');
}

document.getElementById('successModal').addEventListener('click', function(e) {
  if (e.target === this) closeModal();
});

/* ════════════════════════════════════════════
   ADMIN – Login / Logout
════════════════════════════════════════════ */
const ADMIN_CREDS = { username: 'admin', password: 'prithivi2026' };

function adminLogin() {
  const user = document.getElementById('admin-user').value.trim();
  const pass = document.getElementById('admin-pass').value;

  if (user === ADMIN_CREDS.username && pass === ADMIN_CREDS.password) {
    document.getElementById('adminLogin').classList.add('hidden');
    document.getElementById('adminDashboard').classList.remove('hidden');
    renderAdminDashboard();
  } else {
    alert('❌ Invalid credentials.');
  }
}

function adminLogout() {
  document.getElementById('adminDashboard').classList.add('hidden');
  document.getElementById('adminLogin').classList.remove('hidden');
  document.getElementById('admin-user').value = '';
  document.getElementById('admin-pass').value = '';
}

/* ════════════════════════════════════════════
   ADMIN – Dashboard: fetch from Supabase
════════════════════════════════════════════ */
async function renderAdminDashboard() {
  // Show loading state
  document.getElementById('adminSummary').innerHTML = `
    <div class="admin-stat"><div class="count">…</div><div class="label">🎙️ Debate</div></div>
    <div class="admin-stat"><div class="count">…</div><div class="label">📷 Photography</div></div>
    <div class="admin-stat"><div class="count">…</div><div class="label">🖼️ Poster Making</div></div>
  `;

  // Fetch all three tables concurrently
  const [debateRes, photoRes, posterRes] = await Promise.all([
    db.from(TABLES.debate).select('*').order('registered_at', { ascending: false }),
    db.from(TABLES.photography).select('*').order('registered_at', { ascending: false }),
    db.from(TABLES.poster).select('*').order('registered_at', { ascending: false }),
  ]);

  // Use only Supabase data
  const debateRegs = debateRes.data || [];
  const photoRegs  = photoRes.data  || [];
  const posterRegs = posterRes.data  || [];

  const debateVerified = debateRegs.filter(r => r.payment_verified).length;
  const posterVerified = posterRegs.filter(r => r.payment_verified).length;

  // Summary cards
  document.getElementById('adminSummary').innerHTML = `
    <div class="admin-stat">
      <div class="count">${debateRegs.length}</div>
      <div class="label">🎙️ Debate Registrations</div>
      <div class="stat-meta">${debateVerified} verified</div>
    </div>
    <div class="admin-stat">
      <div class="count">${photoRegs.length}</div>
      <div class="label">📷 Photography Registrations</div>
    </div>
    <div class="admin-stat">
      <div class="count">${posterRegs.length}</div>
      <div class="label">🖼️ Poster Making Registrations</div>
      <div class="stat-meta">${posterVerified} verified</div>
    </div>
  `;

  // Build tables
  document.getElementById('admin-table-debate').innerHTML      = buildDebateTable(debateRegs);
  document.getElementById('admin-table-photography').innerHTML = buildPhotoTable(photoRegs);
  document.getElementById('admin-table-poster').innerHTML      = buildPosterTable(posterRegs);

  // Attach reminder-modal openers (after tables are in DOM)
  document.getElementById('admin-reminder-debate').onclick = () => openReminderModal('debate', debateRegs);
  document.getElementById('admin-reminder-photography').onclick = () => openReminderModal('photography', photoRegs);
  document.getElementById('admin-reminder-poster').onclick = () => openReminderModal('poster', posterRegs);
}

/* ── Admin tab switching ── */
function switchAdminTab(tab) {
  document.querySelectorAll('.admin-tab').forEach(t => t.classList.remove('active'));
  document.getElementById(`atab-${tab}`).classList.add('active');
  document.querySelectorAll('.admin-table-wrap').forEach(w => w.classList.add('hidden'));
  document.getElementById(`admin-table-${tab}`).classList.remove('hidden');
}

/* ── Table Builders ── */
function stanceBadge(stance) {
  const cls = stance && stance.toLowerCase().includes('favour') ? 'badge-for' : 'badge-against';
  return `<span class="badge-stance ${cls}">${stance || '—'}</span>`;
}

function formatDate(ts) {
  if (!ts || ts === '—') return '—';
  try { return new Date(ts).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }); }
  catch { return ts; }
}

function paymentBadge(r) {
  if (r.payment_verified === true) {
    return `<span class="badge-stance badge-for">✅ Verified</span>`;
  }
  if (r.payment_uploaded) {
    return `<span class="badge-stance badge-pending">⏳ Pending</span>`;
  }
  return `<span class="badge-stance badge-against">❌ None</span>`;
}

function buildDebateTable(rows) {
  if (!rows.length) return emptyState('No debate registrations yet.');
  return `<table class="admin-table">
    <thead><tr>
      <th>#</th><th>Name</th><th>Contact</th><th>Email</th>
      <th>University</th><th>Roll No.</th><th>Stance</th><th>Experience</th>
      <th>Payment</th><th>UPI ID</th><th>Registered At</th><th>Actions</th>
    </tr></thead>
    <tbody>
      ${rows.map((r, i) => `<tr>
        <td>${i + 1}</td>
        <td><strong>${esc(r.name)}</strong></td>
        <td>${esc(r.contact)}</td>
        <td>${esc(r.email)}</td>
        <td>${esc(r.university)}</td>
        <td>${esc(r.roll_no || r.rollNo)}</td>
        <td>${stanceBadge(r.stance)}</td>
        <td>${esc(r.experience)}</td>
        <td>${paymentBadge(r)}${r.payment_screenshot_url ? ` <a href="${esc(r.payment_screenshot_url)}" target="_blank" style="font-size:.78rem;color:var(--green-600)">View</a>` : ''}<br><small style="color:var(--text-muted);font-size:.72rem">${esc(r.payment_notes)}</small></td>
        <td>${esc(r.payment_upi_id)}</td>
        <td>${formatDate(r.registered_at)}</td>
        <td class="admin-actions-cell">${adminActionButtons(r, 'debate')}</td>
      </tr>`).join('')}
    </tbody>
  </table>`;
}

function buildPhotoTable(rows) {
  if (!rows.length) return emptyState('No photography registrations yet.');
  return `<table class="admin-table">
    <thead><tr>
      <th>#</th><th>Name</th><th>Contact</th><th>Email</th>
      <th>University</th><th>Roll No.</th><th>Theme</th><th>Experience</th><th>Registered At</th><th>Actions</th>
    </tr></thead>
    <tbody>
      ${rows.map((r, i) => `<tr>
        <td>${i + 1}</td>
        <td><strong>${esc(r.name)}</strong></td>
        <td>${esc(r.contact)}</td>
        <td>${esc(r.email)}</td>
        <td>${esc(r.university)}</td>
        <td>${esc(r.roll_no || r.rollNo)}</td>
        <td>${esc(r.theme)}</td>
        <td>${esc(r.experience)}</td>
        <td>${formatDate(r.registered_at)}</td>
        <td class="admin-actions-cell">${adminActionButtons(r, 'photography')}</td>
      </tr>`).join('')}
    </tbody>
  </table>`;
}

function buildPosterTable(rows) {
  if (!rows.length) return emptyState('No poster making registrations yet.');
  return `<table class="admin-table">
    <thead><tr>
      <th>#</th><th>Name</th><th>Type</th><th>Partner</th><th>Contact</th><th>Email</th>
      <th>University</th><th>Roll No.</th><th>Medium</th><th>Concept</th>
      <th>Payment</th><th>UPI ID</th><th>Registered At</th><th>Actions</th>
    </tr></thead>
    <tbody>
      ${rows.map((r, i) => `<tr>
        <td>${i + 1}</td>
        <td><strong>${esc(r.name)}</strong></td>
        <td><span class="badge-stance ${r.participation_type === 'Duo' ? 'badge-duo' : 'badge-solo'}">${esc(r.participation_type) || 'Solo'}</span></td>
        <td>${r.partner_name ? `${esc(r.partner_name)}<br><small>${esc(r.partner_roll_no)}</small>` : '—'}</td>
        <td>${esc(r.contact)}</td>
        <td>${esc(r.email)}</td>
        <td>${esc(r.university)}</td>
        <td>${esc(r.roll_no || r.rollNo)}</td>
        <td>${esc(r.medium)}</td>
        <td>${esc(r.concept)}</td>
        <td>${paymentBadge(r)}${r.payment_screenshot_url ? ` <a href="${esc(r.payment_screenshot_url)}" target="_blank" style="font-size:.78rem;color:var(--green-600)">View</a>` : ''}<br><small style="color:var(--text-muted);font-size:.72rem">${esc(r.payment_notes)}</small></td>
        <td>${esc(r.payment_upi_id)}</td>
        <td>${formatDate(r.registered_at)}</td>
        <td class="admin-actions-cell">${adminActionButtons(r, 'poster')}</td>
      </tr>`).join('')}
    </tbody>
  </table>`;
}

/**
 * Build HTML for action buttons in a registration row.
 */
function adminActionButtons(r, eventType) {
  const regJson = encodeURIComponent(JSON.stringify(r));
  let html = '';

  // "Verify Payment" button – shown for all paid events when screenshot is uploaded
  if (r.payment_uploaded) {
    html += `<button class="btn-admin-action btn-verify-pay" onclick="openAdminVerifyModal(decodeURIComponent('${regJson}'), '${eventType}')">
      🔍 Verify Payment
    </button>`;
  }

  // "Resend Confirmation" – shown if payment was verified
  if (r.payment_verified) {
    html += `<button class="btn-admin-action btn-resend-confirm" onclick="resendConfirmationEmail(${r.id}, '${eventType}', this)">
      📧 Resend Email
    </button>`;
  }

  // "Delete Registration" – always available for all events
  html += `<button class="btn-admin-action btn-delete-reg" onclick="deleteRegistration(${r.id}, '${eventType}')">
    🗑️ Delete
  </button>`;

  return html || '<span style="color:var(--text-muted);font-size:.8rem">—</span>';
}

function emptyState(msg) {
  return `<div class="empty-state"><div class="empty-icon">🗂️</div><p>${msg}</p></div>`;
}

/* ════════════════════════════════════════════
   ADMIN – Delete Registration
════════════════════════════════════════════ */
let _pendingDeleteId   = null;
let _pendingDeleteType = null;

function deleteRegistration(registrationId, eventType) {
  _pendingDeleteId   = registrationId;
  _pendingDeleteType = eventType;

  const modal = document.getElementById('deleteConfirmModal');
  modal.classList.add('active');

  document.getElementById('deleteConfirmBtn').onclick = confirmDeleteRegistration;
}

function closeDeleteConfirmModal() {
  document.getElementById('deleteConfirmModal').classList.remove('active');
  _pendingDeleteId   = null;
  _pendingDeleteType = null;
}

// Close modal when clicking backdrop
document.getElementById('deleteConfirmModal').addEventListener('click', function (e) {
  if (e.target === this) closeDeleteConfirmModal();
});

async function confirmDeleteRegistration() {
  if (!_pendingDeleteId || !_pendingDeleteType) return;

  const btn = document.getElementById('deleteConfirmBtn');
  btn.disabled   = true;
  btn.textContent = '⏳ Deleting…';

  try {
    const res = await fetch('/api/admin/delete-registration', {
      method:  'POST',
      headers: {
        'Content-Type':    'application/json',
        'x-admin-secret':  ADMIN_API_SECRET,
      },
      body: JSON.stringify({ registrationId: _pendingDeleteId, eventType: _pendingDeleteType }),
    });

    const data = await res.json();

    if (!res.ok) {
      alert('❌ Delete failed: ' + (data.error || 'Unknown error'));
    } else {
      closeDeleteConfirmModal();
      await renderAdminDashboard();
    }
  } catch (err) {
    alert('❌ Network error: ' + err.message);
  } finally {
    btn.disabled    = false;
    btn.textContent = '🗑️ Delete';
  }
}

function esc(str) {
  if (!str) return '—';
  return String(str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/* ════════════════════════════════════════════
   ADMIN – keyboard shortcut (Enter to login)
════════════════════════════════════════════ */
['admin-pass', 'admin-user'].forEach(id => {
  document.getElementById(id).addEventListener('keydown', e => {
    if (e.key === 'Enter') adminLogin();
  });
});

/* ════════════════════════════════════════════
   ADMIN – Payment Verification Modal
════════════════════════════════════════════ */
// State for the currently open admin verification modal
let _adminVerifyReg      = null; // full registration object
let _adminVerifyEventType = null;

/**
 * Open the admin payment verification modal for a given registration.
 * `reg` is the full registration row from Supabase.
 */
function openAdminVerifyModal(regJson, eventType) {
  const reg = typeof regJson === 'string' ? JSON.parse(regJson) : regJson;
  _adminVerifyReg       = reg;
  _adminVerifyEventType = eventType;

  // Populate participant details
  document.getElementById('avm-name').textContent       = esc(reg.name);
  document.getElementById('avm-email').textContent      = esc(reg.email);
  document.getElementById('avm-contact').textContent    = esc(reg.contact);
  document.getElementById('avm-university').textContent = esc(reg.university);
  document.getElementById('avm-rollno').textContent     = esc(reg.roll_no || reg.rollNo || '—');
  document.getElementById('avm-event').textContent      =
    eventType === 'debate' ? 'Green Vichaar Sabha: A debate competition'
    : eventType === 'poster' ? 'Green Canvas: a poster making competition'
    : 'Dharti Lens: A nature photography competition';

  // Payment details
  document.getElementById('avm-upi').textContent        = reg.payment_upi_id || '—';
  document.getElementById('avm-timestamp').textContent  = reg.payment_timestamp ? formatDate(reg.payment_timestamp) : '—';
  document.getElementById('avm-notes-display').textContent = reg.payment_notes || '—';

  // Screenshot
  const screenshotWrap = document.getElementById('avm-screenshot-wrap');
  const screenshotImg  = document.getElementById('avm-screenshot-img');
  const screenshotLink = document.getElementById('avm-screenshot-link');
  const noScreenshot   = document.getElementById('avm-no-screenshot');
  if (reg.payment_screenshot_url) {
    screenshotImg.src   = reg.payment_screenshot_url;
    screenshotLink.href = reg.payment_screenshot_url;
    screenshotWrap.classList.remove('hidden');
    noScreenshot.classList.add('hidden');
  } else {
    screenshotWrap.classList.add('hidden');
    noScreenshot.classList.remove('hidden');
  }

  // Reset admin notes and status
  document.getElementById('avm-admin-notes').value = '';
  document.getElementById('avm-status').classList.add('hidden');

  document.getElementById('adminVerifyModal').classList.add('active');
}

function closeAdminVerifyModal() {
  document.getElementById('adminVerifyModal').classList.remove('active');
  _adminVerifyReg       = null;
  _adminVerifyEventType = null;
}

document.getElementById('adminVerifyModal').addEventListener('click', function(e) {
  if (e.target === this) closeAdminVerifyModal();
});

/**
 * Called by Approve / Reject buttons inside the admin verify modal.
 * `approved` – true for approve, false for reject.
 */
async function submitAdminVerify(approved) {
  if (!_adminVerifyReg || !_adminVerifyEventType) return;

  const adminNotes   = document.getElementById('avm-admin-notes').value.trim();
  const statusBox    = document.getElementById('avm-status');
  const approvBtn    = document.getElementById('avm-approve-btn');
  const rejectBtn    = document.getElementById('avm-reject-btn');

  approvBtn.disabled = true;
  rejectBtn.disabled = true;

  statusBox.className   = 'avm-status avm-status--pending';
  statusBox.textContent = '⏳ Processing…';
  statusBox.classList.remove('hidden');

  const regId     = _adminVerifyReg.id;
  const eventType = _adminVerifyEventType;
  const receiptNo = `${eventType.toUpperCase().slice(0, 3)}-${regId}`;

  // ── 1. Update Supabase directly (anon client with UPDATE policy) ────────────
  let dbOk = false;
  try {
    const updatePayload = {
      payment_verified:              approved,
      payment_notes:                 adminNotes || null,
      verification_timestamp:        new Date().toISOString(),
      verification_admin_notes:      adminNotes || null,
      confirmation_receipt_number:   receiptNo,
    };
    if (approved) {
      updatePayload.confirmation_email_sent_at = new Date().toISOString();
    }
    const { error } = await db
      .from(TABLES[eventType])
      .update(updatePayload)
      .eq('id', regId);
    if (error) throw error;
    dbOk = true;
  } catch (err) {
    console.warn('Supabase update failed:', err.message);
  }

  // ── 2. Call backend email service ──────────────────────────────────────────
  let emailOk = false;
  try {
    const resp = await fetch(`${EMAIL_API_URL}/api/admin/verify-payment`, {
      method:  'POST',
      headers: {
        'Content-Type':    'application/json',
        'x-admin-secret':  ADMIN_API_SECRET,
      },
      body: JSON.stringify({
        registrationId:   regId,
        eventType,
        approved,
        notes:            adminNotes,
        // Pass registration data as fallback when DB has no service key
        registrationData: _adminVerifyReg,
      }),
    });
    const result = await resp.json();
    emailOk = result.success === true;
    if (!emailOk) console.warn('Email API error:', result.error);
  } catch (fetchErr) {
    console.warn('Email service unreachable:', fetchErr.message);
  }

  // ── 3. Update UI ────────────────────────────────────────────────────────────
  approvBtn.disabled = false;
  rejectBtn.disabled = false;

  if (dbOk && emailOk) {
    statusBox.className   = 'avm-status avm-status--success';
    statusBox.textContent = approved
      ? '✅ Payment approved and confirmation email sent.'
      : '❌ Payment rejected and rejection email sent.';
  } else if (dbOk) {
    statusBox.className   = 'avm-status avm-status--warn';
    statusBox.textContent = approved
      ? '✅ Payment approved in database. Email service unavailable — start the server to enable emails.'
      : '❌ Payment rejected in database. Email service unavailable.';
  } else {
    statusBox.className   = 'avm-status avm-status--warn';
    statusBox.textContent = '⚠️ Could not update database. Check Supabase UPDATE policy and try again.';
  }

  // Refresh admin dashboard table after a short delay
  setTimeout(() => {
    closeAdminVerifyModal();
    renderAdminDashboard();
  }, 2200);
}

/* ════════════════════════════════════════════
   ADMIN – Reminder Email Modal
════════════════════════════════════════════ */
let _reminderEventType    = null;
let _reminderRegistrations = []; // all verified registrations for the selected event

// 24-hour cooldown tracking (keyed by "eventType:regId")
const REMINDER_COOLDOWN_KEY = 'pp_reminder_cooldown';

function getReminderCooldowns() {
  try { return JSON.parse(localStorage.getItem(REMINDER_COOLDOWN_KEY)) || {}; }
  catch { return {}; }
}

function setReminderCooldown(eventType, regId) {
  const cooldowns = getReminderCooldowns();
  cooldowns[`${eventType}:${regId}`] = Date.now();
  localStorage.setItem(REMINDER_COOLDOWN_KEY, JSON.stringify(cooldowns));
}

function isOnReminderCooldown(eventType, regId) {
  const cooldowns = getReminderCooldowns();
  const lastSent  = cooldowns[`${eventType}:${regId}`];
  if (!lastSent) return false;
  return (Date.now() - lastSent) < 24 * 60 * 60 * 1000;
}

/**
 * Open the reminder email modal for a specific event type.
 * `regs` – array of registration rows already loaded in the admin dashboard.
 */
function openReminderModal(eventType, regs) {
  _reminderEventType     = eventType;
  _reminderRegistrations = regs || [];

  const eventName = eventType === 'debate' ? 'Green Vichaar Sabha: A debate competition'
    : eventType === 'poster' ? 'Green Canvas: a poster making competition'
    : 'Dharti Lens: A nature photography competition';

  document.getElementById('rm-event-name').textContent = eventName;

  // Build recipient checkboxes
  const listEl = document.getElementById('rm-recipient-list');
  listEl.innerHTML = '';

  if (!_reminderRegistrations.length) {
    listEl.innerHTML = '<p style="color:var(--text-muted);font-size:.9rem">No registrations found.</p>';
  } else {
    _reminderRegistrations.forEach(r => {
      const onCooldown = isOnReminderCooldown(eventType, r.id);
      const label      = document.createElement('label');
      label.className  = 'rm-recipient-row';
      label.innerHTML  = `
        <input type="checkbox" class="rm-chk" data-id="${r.id}" ${onCooldown ? 'disabled' : 'checked'} />
        <span class="rm-recipient-name">${esc(r.name)}</span>
        <span class="rm-recipient-email">${esc(r.email)}</span>
        ${onCooldown ? '<span class="rm-cooldown-badge">Sent &lt;24h ago</span>' : ''}
      `;
      listEl.appendChild(label);
    });
  }

  // Pre-fill default message
  const defaultMsg = `Dear Participant,\n\nThis is a friendly reminder about the upcoming ${eventName} at Prithivi Pulse.\n\nPlease ensure you arrive 30 minutes before the event starts with your valid college ID.\n\nWe look forward to seeing you!\n\nBest regards,\nPrithivi Pulse Team`;
  document.getElementById('rm-custom-message').value = defaultMsg;

  document.getElementById('rm-status').classList.add('hidden');
  document.getElementById('reminderModal').classList.add('active');
}

function closeReminderModal() {
  document.getElementById('reminderModal').classList.remove('active');
  _reminderEventType    = null;
  _reminderRegistrations = [];
}

document.getElementById('reminderModal').addEventListener('click', function(e) {
  if (e.target === this) closeReminderModal();
});

/** Toggle all reminder recipient checkboxes */
function toggleAllReminders(checked) {
  document.querySelectorAll('.rm-chk:not(:disabled)').forEach(chk => {
    chk.checked = checked;
  });
}

/** Send reminder emails */
async function sendReminderEmails() {
  const customMessage = document.getElementById('rm-custom-message').value.trim();
  const checkedBoxes  = Array.from(document.querySelectorAll('.rm-chk:checked'));
  const selectedIds   = checkedBoxes.map(chk => parseInt(chk.dataset.id, 10));

  const statusBox = document.getElementById('rm-status');
  const sendBtn   = document.getElementById('rm-send-btn');

  if (!selectedIds.length) {
    statusBox.className   = 'rm-status rm-status--warn';
    statusBox.textContent = '⚠️ Please select at least one recipient.';
    statusBox.classList.remove('hidden');
    return;
  }

  sendBtn.disabled     = true;
  statusBox.className  = 'rm-status rm-status--pending';
  statusBox.textContent = `⏳ Sending to ${selectedIds.length} recipient(s)…`;
  statusBox.classList.remove('hidden');

  try {
    const resp = await fetch(`${EMAIL_API_URL}/api/admin/send-reminder`, {
      method: 'POST',
      headers: {
        'Content-Type':   'application/json',
        'x-admin-secret': ADMIN_API_SECRET,
      },
      body: JSON.stringify({
        registrationIds: selectedIds,
        eventType:       _reminderEventType,
        customMessage:   customMessage || '',
      }),
    });
    const result = await resp.json();

    if (result.success || result.sent > 0) {
      // Mark cooldowns for sent registrations
      (result.details?.sent || []).forEach(item => {
        setReminderCooldown(_reminderEventType, item.id);
      });

      statusBox.className   = 'rm-status rm-status--success';
      statusBox.textContent = `✅ Reminder sent to ${result.sent} participant(s).${result.failed > 0 ? ` ⚠️ ${result.failed} failed.` : ''}`;

      // Update reminder_email_sent_at in Supabase for each sent ID
      for (const item of (result.details?.sent || [])) {
        try {
          await db.from(TABLES[_reminderEventType])
            .update({ reminder_email_sent_at: new Date().toISOString() })
            .eq('id', item.id);
        } catch (_) {}
      }
    } else {
      statusBox.className   = 'rm-status rm-status--warn';
      statusBox.textContent = '❌ Failed to send reminder emails. Is the email server running?';
    }
  } catch (err) {
    statusBox.className   = 'rm-status rm-status--warn';
    statusBox.textContent = `❌ Email service unreachable. Start the Node.js server (npm start) and try again.`;
    console.warn('Reminder send error:', err.message);
  }

  sendBtn.disabled = false;
}

/* ════════════════════════════════════════════
   ADMIN – Resend Confirmation Email
════════════════════════════════════════════ */
async function resendConfirmationEmail(regId, eventType, btn) {
  if (!regId || !eventType) return;

  const originalText = btn.textContent;
  btn.disabled    = true;
  btn.textContent = '⏳ Sending…';

  try {
    const resp = await fetch(`${EMAIL_API_URL}/api/admin/resend-confirmation`, {
      method:  'POST',
      headers: {
        'Content-Type':   'application/json',
        'x-admin-secret': ADMIN_API_SECRET,
      },
      body: JSON.stringify({ registrationId: regId, eventType }),
    });
    const result = await resp.json();
    btn.textContent = result.success ? '✅ Sent!' : '❌ Failed';
    setTimeout(() => { btn.textContent = originalText; btn.disabled = false; }, 2500);
  } catch (err) {
    btn.textContent = '❌ Offline';
    setTimeout(() => { btn.textContent = originalText; btn.disabled = false; }, 2500);
    console.warn('Resend confirmation error:', err.message);
  }
}
