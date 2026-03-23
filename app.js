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

// ─── localStorage fallback keys (used if Supabase unreachable) ───
const LS_KEYS = {
  debate:      'pp_debate',
  photography: 'pp_photography',
  poster:      'pp_poster',
};

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
const PAYMENT_AMOUNTS    = { debate: '₹50 — Debate Registration', poster: '₹50 — Poster Making Registration' };
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

  let saved = false;
  try {
    const { error } = await db.from(TABLES[_pendingEventType]).insert([fullData]);
    if (error) throw error;
    saved = true;
  } catch (err) {
    console.warn('Supabase insert failed, falling back to localStorage:', err.message);
    const existing = getLocalRegistrations(_pendingEventType);
    existing.push({ ...fullData, id: Date.now() });
    localStorage.setItem(LS_KEYS[_pendingEventType], JSON.stringify(existing));
    saved = true;
  }

  if (saved) {
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
  } else {
    statusBox.classList.remove('hidden');
    statusBox.className   = 'payment-status payment-status--warn';
    statusBox.textContent = '❌ Registration failed. Please try again.';
    submitBtn.disabled    = false;
    submitBtn.textContent = 'Verify & Complete Registration ✅';
  }
}

/* ════════════════════════════════════════════
   FORM SUBMISSION  →  Show Payment Modal (for paid events)
                    →  Supabase INSERT (for free events)
════════════════════════════════════════════ */
async function handleSubmit(e, eventType) {
  e.preventDefault();

  const btn = e.target.querySelector('.btn-submit');
  btn.disabled    = true;
  btn.textContent = 'Processing…';

  const data = buildRegistrationData(eventType);
  if (!data) { btn.disabled = false; btn.textContent = 'Try Again'; return; }

  // Photography is free – submit directly without payment modal
  if (eventType === 'photography') {
    let saved = false;
    try {
      const { error } = await db.from(TABLES[eventType]).insert([data]);
      if (error) throw error;
      saved = true;
    } catch (err) {
      console.warn('Supabase insert failed, falling back to localStorage:', err.message);
      const existing = getLocalRegistrations(eventType);
      existing.push({ ...data, id: Date.now() });
      localStorage.setItem(LS_KEYS[eventType], JSON.stringify(existing));
      saved = true;
    }
    if (saved) {
      e.target.reset();
      btn.disabled    = false;
      btn.textContent = btn.getAttribute('data-label') || 'Register';
      showSuccessModal(eventType, data.name, null);
    }
    return;
  }

  // Paid events (debate, poster) – show payment modal
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
  debate:      "You're registered for the Debate Competition! We'll confirm your stance and share topic details soon.",
  photography: "You're registered for Nature Photography! Bring your best lens and let nature speak.",
  poster:      "You're registered for Poster Making! Get your creative juices flowing. See you there!",
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

  // Merge with any localStorage fallback records
  const debateRegs = mergeWithLocal(debateRes.data || [], 'debate');
  const photoRegs  = mergeWithLocal(photoRes.data  || [], 'photography');
  const posterRegs = mergeWithLocal(posterRes.data  || [], 'poster');

  // Summary cards
  document.getElementById('adminSummary').innerHTML = `
    <div class="admin-stat">
      <div class="count">${debateRegs.length}</div>
      <div class="label">🎙️ Debate Registrations</div>
    </div>
    <div class="admin-stat">
      <div class="count">${photoRegs.length}</div>
      <div class="label">📷 Photography Registrations</div>
    </div>
    <div class="admin-stat">
      <div class="count">${posterRegs.length}</div>
      <div class="label">🖼️ Poster Making Registrations</div>
    </div>
  `;

  // Build tables
  document.getElementById('admin-table-debate').innerHTML      = buildDebateTable(debateRegs);
  document.getElementById('admin-table-photography').innerHTML = buildPhotoTable(photoRegs);
  document.getElementById('admin-table-poster').innerHTML      = buildPosterTable(posterRegs);
}

/** Merge Supabase rows with any localStorage fallback entries (avoid duplicates by name+email) */
function mergeWithLocal(supabaseRows, eventType) {
  const local = getLocalRegistrations(eventType);
  if (!local.length) return supabaseRows;
  // Only add local entries not already present in Supabase
  const supabaseEmails = new Set(supabaseRows.map(r => r.email?.toLowerCase()));
  const newLocal = local.filter(r => !supabaseEmails.has(r.email?.toLowerCase()));
  return [...supabaseRows, ...newLocal.map(r => ({ ...r, registered_at: r.registeredAt || '—' }))];
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
      <th>Payment</th><th>UPI ID</th><th>Registered At</th>
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
      </tr>`).join('')}
    </tbody>
  </table>`;
}

function buildPhotoTable(rows) {
  if (!rows.length) return emptyState('No photography registrations yet.');
  return `<table class="admin-table">
    <thead><tr>
      <th>#</th><th>Name</th><th>Contact</th><th>Email</th>
      <th>University</th><th>Roll No.</th><th>Theme</th><th>Experience</th><th>Registered At</th>
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
      <th>Payment</th><th>UPI ID</th><th>Registered At</th>
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
      </tr>`).join('')}
    </tbody>
  </table>`;
}

function emptyState(msg) {
  return `<div class="empty-state"><div class="empty-icon">🗂️</div><p>${msg}</p></div>`;
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
