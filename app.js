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
   FORM SUBMISSION  →  Supabase INSERT
════════════════════════════════════════════ */
async function handleSubmit(e, eventType) {
  e.preventDefault();
  const btn = e.target.querySelector('.btn-submit');
  btn.disabled = true;
  btn.textContent = 'Submitting…';

  const data = buildRegistrationData(eventType);
  if (!data) { btn.disabled = false; btn.textContent = 'Try Again'; return; }

  let saved = false;

  try {
    const { error } = await db.from(TABLES[eventType]).insert([data]);
    if (error) throw error;
    saved = true;
  } catch (err) {
    console.warn('Supabase insert failed, falling back to localStorage:', err.message);
    // localStorage fallback so registrations aren't lost if Supabase is unreachable
    const existing = getLocalRegistrations(eventType);
    existing.push({ ...data, id: Date.now() });
    localStorage.setItem(LS_KEYS[eventType], JSON.stringify(existing));
    saved = true;
  }

  if (saved) {
    e.target.reset();
    btn.disabled = false;
    btn.textContent = btn.getAttribute('data-label') || 'Register';
    showSuccessModal(eventType, data.name);
  }
}

/* ── Build payload objects for each event type ── */
function buildRegistrationData(eventType) {
  const ts = new Date().toISOString();
  if (eventType === 'debate') {
    return {
      name:        cleanVal('d-name'),
      contact:     cleanVal('d-contact'),
      email:       cleanVal('d-email'),
      university:  cleanVal('d-university'),
      roll_no:     cleanVal('d-rollno'),
      stance:      cleanVal('d-stance'),
      experience:  cleanVal('d-experience') || null,
    };
  }
  if (eventType === 'photography') {
    return {
      name:        cleanVal('p-name'),
      contact:     cleanVal('p-contact'),
      email:       cleanVal('p-email'),
      university:  cleanVal('p-university'),
      roll_no:     cleanVal('p-rollno'),
      camera:      cleanVal('p-camera'),
      theme:       cleanVal('p-theme') || null,
      experience:  cleanVal('p-experience') || null,
    };
  }
  if (eventType === 'poster') {
    return {
      name:        cleanVal('pm-name'),
      contact:     cleanVal('pm-contact'),
      email:       cleanVal('pm-email'),
      university:  cleanVal('pm-university'),
      roll_no:     cleanVal('pm-rollno'),
      medium:      cleanVal('pm-medium'),
      concept:     cleanVal('pm-concept') || null,
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

function showSuccessModal(eventType, name) {
  document.getElementById('modalTitle').textContent = `Welcome, ${name || 'Participant'}! 🎉`;
  document.getElementById('modalMsg').textContent   = MODAL_MESSAGES[eventType];
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

function buildDebateTable(rows) {
  if (!rows.length) return emptyState('No debate registrations yet.');
  return `<table class="admin-table">
    <thead><tr>
      <th>#</th><th>Name</th><th>Contact</th><th>Email</th>
      <th>University</th><th>Roll No.</th><th>Stance</th><th>Experience</th><th>Registered At</th>
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
      <th>University</th><th>Roll No.</th><th>Device</th><th>Theme</th><th>Experience</th><th>Registered At</th>
    </tr></thead>
    <tbody>
      ${rows.map((r, i) => `<tr>
        <td>${i + 1}</td>
        <td><strong>${esc(r.name)}</strong></td>
        <td>${esc(r.contact)}</td>
        <td>${esc(r.email)}</td>
        <td>${esc(r.university)}</td>
        <td>${esc(r.roll_no || r.rollNo)}</td>
        <td>${esc(r.camera)}</td>
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
      <th>#</th><th>Name</th><th>Contact</th><th>Email</th>
      <th>University</th><th>Roll No.</th><th>Medium</th><th>Concept</th><th>Registered At</th>
    </tr></thead>
    <tbody>
      ${rows.map((r, i) => `<tr>
        <td>${i + 1}</td>
        <td><strong>${esc(r.name)}</strong></td>
        <td>${esc(r.contact)}</td>
        <td>${esc(r.email)}</td>
        <td>${esc(r.university)}</td>
        <td>${esc(r.roll_no || r.rollNo)}</td>
        <td>${esc(r.medium)}</td>
        <td>${esc(r.concept)}</td>
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
