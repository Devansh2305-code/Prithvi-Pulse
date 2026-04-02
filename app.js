/* ═══════════════════════════════════════════
   PRITHIVI PULSE – Application Logic
═══════════════════════════════════════════ */

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
   REGISTRATION MODAL
════════════════════════════════════════════ */
// Replace the placeholder form IDs below with your actual Google Form embed URLs.
const FORM_URLS = {
  debate:  'https://docs.google.com/forms/d/e/1FAIpQLSe9uCVtqY79bSSGoRtObagwh4bHzZD2PZCK2G7q1a5LtvXJmA/viewform?usp=dialog',
  fashion: 'https://docs.google.com/forms/d/e/1FAIpQLScPZJv5Iz9j0uzGd14oGlp_Ioq_4j5zMd_XmdGvI49Bf26jqw/viewform?usp=dialog',
  poster:  'https://docs.google.com/forms/d/e/1FAIpQLSdI5gLIoP7CciJbT-btP24wmg21gD8ZDRblBbyUCF1mUFNQOA/viewform?usp=dialog',
};

const EVENT_TITLES = {
  debate:  'Register – Green Vichaar Sabha',
  fashion: 'Register – Nature on the Ramp',
  poster:  'Register – Green Canvas',
};

const registerModal = document.getElementById('registerModal');
const modalFrame    = document.getElementById('modalFrame');
const modalTitle    = document.getElementById('modalTitle');
const modalClose    = document.getElementById('modalClose');

function openRegisterModal(eventType) {
  modalTitle.textContent = EVENT_TITLES[eventType] || 'Register';
  modalFrame.src = FORM_URLS[eventType] || '';
  registerModal.classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closeRegisterModal() {
  registerModal.classList.remove('active');
  modalFrame.src = '';
  document.body.style.overflow = '';
}

modalClose.addEventListener('click', closeRegisterModal);
registerModal.addEventListener('click', (e) => {
  if (e.target === registerModal) closeRegisterModal();
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeRegisterModal();
});

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
