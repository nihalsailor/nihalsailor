/**
 * NIHALSAILOR MAIN APPLICATION CONTROLLER
 * Orchestrates interactions, audio state, verified armada projects, modals, and animations.
 */

// Global registry of all verified projects
window.allProjects = [];

document.addEventListener('DOMContentLoaded', async () => {
  initNavbar();
  initSoundToggle();
  initCursedMode();
  await loadAndRenderProjects();
  initProjectFilters();
  initProjectModals();
  initCaptainLogs();
  initContactForm();
  init3DTilt();
  initStatCounters();
});

/* --------------------------------------------------------------------------
   1. VERIFIED PROJECT REGISTRY & DYNAMIC RENDERING
   -------------------------------------------------------------------------- */
function sanitizeProjectUrl(url) {
  if (!url) return url;
  return url
    .replace(/streamsailor\.itlive\.in/gi, 'streamsailor.nihalsailor.com')
    .replace(/safeguardlite\.itlive\.in/gi, 'safeguardlite.nihalsailor.com')
    .replace(/itlive\.in\/nihalsailor\/?/gi, 'nihalsailor.com/');
}

async function loadAndRenderProjects() {
  let baseProjects = window.DEFAULT_PROJECTS || [];

  // Attempt to fetch latest data/projects.json if hosted on web server (bypass stale cache)
  try {
    const res = await fetch('data/projects.json?t=' + Date.now(), { cache: 'no-store' });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        baseProjects = data;
      }
    }
  } catch (e) {
    // Falls back seamlessly to window.DEFAULT_PROJECTS
  }

  window.allProjects = baseProjects.map(p => ({
    ...p,
    liveUrl: sanitizeProjectUrl(p.liveUrl)
  }));
  renderArmadaGrid(window.allProjects);
}

function renderArmadaGrid(projects) {
  const grid = document.querySelector('.armada-grid');
  if (!grid) return;

  grid.innerHTML = '';

  if (projects.length === 0) {
    grid.innerHTML = `
      <div style="grid-column: 1 / -1; text-align: center; padding: 3rem; color: var(--text-muted);">
        <p>No vessels currently docked in this harbor.</p>
      </div>
    `;
    return;
  }

  projects.forEach(proj => {
    const card = document.createElement('div');
    card.className = 'gilded-card project-card tilt-card';
    card.dataset.category = proj.category;
    card.dataset.id = proj.id;

    const tagsHtml = (proj.tags || []).map(t => `<span class="tag-pill">${escapeHtml(t)}</span>`).join('');

    card.innerHTML = `
      <div class="project-media">
        <img src="${escapeHtml(proj.image || 'BackgroundLogo.png')}" alt="${escapeHtml(proj.title)}" class="project-media-img">
        <div class="project-media-overlay"></div>
        <span class="project-category-tag">${escapeHtml(proj.categoryLabel || proj.category)}</span>
      </div>
      <h3 class="project-title font-cinzel">
        <span>${escapeHtml(proj.title)}</span>
        <i class="fas fa-ship text-gold" style="font-size: 1rem;"></i>
      </h3>
      <p class="project-desc">${escapeHtml(proj.desc)}</p>
      <div class="project-tags">${tagsHtml}</div>
      <div class="project-actions">
        <a href="projects/${escapeHtml(proj.id)}.html" class="btn-card-action btn-card-primary">
          <i class="fas fa-eye"></i> Details
        </a>
        ${proj.liveUrl && proj.liveUrl !== '#' ? `
          <a href="${escapeHtml(proj.liveUrl)}" target="_blank" rel="noopener" class="btn-card-action btn-card-secondary" style="border-color: var(--gold-primary); color: var(--gold-light);">
            <i class="fas fa-external-link-alt"></i> Live
          </a>
        ` : ''}
        ${proj.codeUrl && proj.codeUrl !== '#' ? `
          <a href="${escapeHtml(proj.codeUrl)}" target="_blank" rel="noopener" class="btn-card-action btn-card-secondary">
            <i class="fab fa-github"></i> Blueprint
          </a>
        ` : ''}
      </div>
    `;

    grid.appendChild(card);
  });

  // Re-attach 3D tilt and inspection listeners
  init3DTilt();
  attachProjectInspectors();
}

function attachProjectInspectors() {
  const inspectBtns = document.querySelectorAll('[data-inspect-project]');
  const modal = document.getElementById('project-modal');

  inspectBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const projId = btn.dataset.inspectProject;
      const data = window.allProjects.find(p => p.id === projId);
      if (!data) return;

      document.getElementById('modal-title').textContent = data.title;
      document.getElementById('modal-category').textContent = data.categoryLabel || data.category;
      document.getElementById('modal-desc').innerHTML = escapeHtml(data.details || data.desc).replace(/\n/g, '<br>');
      document.getElementById('modal-img').src = data.image || 'BackgroundLogo.png';

      const tagsContainer = document.getElementById('modal-tags');
      tagsContainer.innerHTML = '';
      (data.tags || []).forEach(t => {
        const span = document.createElement('span');
        span.className = 'tag-pill';
        span.textContent = t;
        tagsContainer.appendChild(span);
      });

      const metricsContainer = document.getElementById('modal-metrics');
      metricsContainer.innerHTML = '';
      const metrics = data.metrics || [
        { label: 'Status', val: 'Active' },
        { label: 'Security', val: 'Hardened' },
        { label: 'Deployment', val: 'Production' }
      ];
      metrics.forEach(m => {
        const div = document.createElement('div');
        div.className = 'stat-box';
        div.innerHTML = `<div class="stat-number" style="font-size: 1.3rem;">${escapeHtml(m.val)}</div><div class="stat-label">${escapeHtml(m.label)}</div>`;
        metricsContainer.appendChild(div);
      });

      const liveBtn = document.getElementById('modal-live-btn');
      if (liveBtn) {
        const cleanUrl = sanitizeProjectUrl(data.liveUrl);
        if (cleanUrl && cleanUrl !== '#') {
          liveBtn.href = cleanUrl;
          liveBtn.style.display = 'inline-flex';
        } else {
          liveBtn.style.display = 'none';
        }
      }

      const codeBtn = document.getElementById('modal-code-btn');
      if (codeBtn) {
        codeBtn.href = data.codeUrl || 'https://github.com/nihalsailor';
      }

      modal.classList.add('active');
      document.body.style.overflow = 'hidden';
    });
  });
}

/* --------------------------------------------------------------------------
   2. NAVIGATION & SCROLL TRACKING
   -------------------------------------------------------------------------- */
function initNavbar() {
  const nav = document.querySelector('.main-nav');
  const toggleBtn = document.querySelector('.mobile-nav-toggle');
  const navLinks = document.querySelector('.nav-links');
  const links = document.querySelectorAll('.nav-link');
  const sections = document.querySelectorAll('section[id]');

  window.addEventListener('scroll', () => {
    if (window.scrollY > 40) {
      nav.classList.add('scrolled');
    } else {
      nav.classList.remove('scrolled');
    }

    let currentId = '';
    sections.forEach(sec => {
      const top = sec.offsetTop - 120;
      const height = sec.offsetHeight;
      if (window.scrollY >= top && window.scrollY < top + height) {
        currentId = sec.getAttribute('id');
      }
    });

    links.forEach(l => {
      l.classList.remove('active');
      if (l.getAttribute('href') === `#${currentId}`) {
        l.classList.add('active');
      }
    });
  });

  if (toggleBtn && navLinks) {
    toggleBtn.addEventListener('click', () => {
      navLinks.classList.toggle('active');
      toggleBtn.innerHTML = navLinks.classList.contains('active') 
        ? '<i class="fas fa-times"></i>' 
        : '<i class="fas fa-bars"></i>';
    });

    links.forEach(link => {
      link.addEventListener('click', () => {
        navLinks.classList.remove('active');
        if (toggleBtn) toggleBtn.innerHTML = '<i class="fas fa-bars"></i>';
      });
    });
  }
}

/* --------------------------------------------------------------------------
   3. MARITIME SOUNDSCAPE TOGGLE
   -------------------------------------------------------------------------- */
function initSoundToggle() {
  const soundBtns = document.querySelectorAll('.btn-sound-toggle');

  soundBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const isPlaying = window.maritimeAudio.toggleSound();
      soundBtns.forEach(b => {
        b.classList.toggle('playing', isPlaying);
        b.innerHTML = isPlaying 
          ? '<i class="fas fa-volume-high"></i>' 
          : '<i class="fas fa-volume-xmark"></i>';
        b.setAttribute('title', isPlaying ? 'Mute Ocean Ambience' : 'Play Ocean Ambience');
      });

      showToast(isPlaying ? '🌊 Ambient ocean storm awakened' : '🔇 Ocean ambience silenced');
    });
  });

  document.querySelectorAll('.btn-corsair').forEach(btn => {
    btn.addEventListener('mouseenter', () => {
      if (window.maritimeAudio && window.maritimeAudio.ctx) {
        window.maritimeAudio.playChime('chime');
      }
    });
  });
}

/* --------------------------------------------------------------------------
   4. CURSED AURA (RED EYE MODE)
   -------------------------------------------------------------------------- */
function initCursedMode() {
  const cursedBtns = document.querySelectorAll('[data-action="toggle-cursed"]');
  const captainAvatar = document.querySelector('.hero-emblem');

  cursedBtns.forEach(btn => {
    btn.addEventListener('click', toggleCursedState);
  });

  if (captainAvatar) {
    captainAvatar.style.cursor = 'pointer';
    captainAvatar.addEventListener('click', () => {
      toggleCursedState();
    });
  }

  function toggleCursedState() {
    const isNowCursed = document.body.classList.toggle('cursed-mode');
    if (window.maritimeCanvas) {
      window.maritimeCanvas.toggleCursedMode(isNowCursed);
    }
    if (window.maritimeAudio) {
      window.maritimeAudio.playChime('blade');
    }

    cursedBtns.forEach(btn => {
      if (btn.querySelector('.cursed-btn-text')) {
        btn.querySelector('.cursed-btn-text').textContent = isNowCursed 
          ? 'Calm The Blood Tide' 
          : 'Awaken Cursed Aura';
      }
    });

    showToast(isNowCursed ? '👁️ The Captain\'s Red Eye blazes! Cursed Tide active.' : '⚔️ Calm returns to the stormy waters.');
  }
}

/* --------------------------------------------------------------------------
   5. PROJECT FILTERING
   -------------------------------------------------------------------------- */
function initProjectFilters() {
  const filterBtns = document.querySelectorAll('.filter-btn');

  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      filterBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      const filter = btn.dataset.filter;
      const cards = document.querySelectorAll('.armada-grid .project-card');

      cards.forEach(card => {
        const category = card.dataset.category;
        if (filter === 'all' || category === filter) {
          card.style.display = 'flex';
          card.style.opacity = '0';
          setTimeout(() => {
            card.style.opacity = '1';
            card.style.transform = 'translateY(0)';
          }, 30);
        } else {
          card.style.display = 'none';
        }
      });
    });
  });
}

/* --------------------------------------------------------------------------
   6. PROJECT DETAILS MODAL
   -------------------------------------------------------------------------- */
function initProjectModals() {
  const modal = document.getElementById('project-modal');
  const closeBtn = modal ? modal.querySelector('.modal-close-btn') : null;

  function closeModal() {
    if (!modal) return;
    modal.classList.remove('active');
    document.body.style.overflow = '';
  }

  if (closeBtn) closeBtn.addEventListener('click', closeModal);
  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeModal();
    });
  }

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeModal();
      const logModal = document.getElementById('log-modal');
      if (logModal) logModal.classList.remove('active');
      document.body.style.overflow = '';
    }
  });
}

/* --------------------------------------------------------------------------
   7. CAPTAIN'S LOG READ-MORE MODAL
   -------------------------------------------------------------------------- */
const LOGS_DATA = {
  'log-1': {
    title: 'Surviving the Digital Tempest: Resilient System Architecture',
    date: 'Captain\'s Log #412 • Abyssal Waters',
    content: `When the winds of unexpected traffic surges and infrastructure outages blow at full gale force, only ships forged with redundancy will stay afloat. In modern software engineering, reliance on a single point of failure is a guaranteed shipwreck.<br><br>
    Our philosophy builds on three non-negotiable principles:<br>
    1. <strong>Decoupled Subsystems:</strong> If the cargo bay floods, the bridge remains intact. Isolate synchronous calls behind circuit breakers and event-driven message queues.<br>
    2. <strong>Autonomous Recovery:</strong> Systems must self-heal without waking the captain at 3 AM. Dynamic autoscaling, stateless edge runtimes, and health-checked orchestrators.<br>
    3. <strong>Predictive Monitoring:</strong> Watching logs after downtime is too late; detecting pressure spikes in database queues lets us adjust sails before the mast snaps.`
  },
  'log-2': {
    title: 'Forging Dark Atmospheric UIs with WebGL & Custom Shaders',
    date: 'Captain\'s Log #389 • The Cursed Isles',
    content: `Clean minimalism has its place, but true immersion demands texture, mood, and tactile weight. When crafting the aesthetic of Nihalsailor, every shadow, gold filigree, and ember carries intention.<br><br>
    By blending lightweight WebGL fragment shaders for particle mist with mathematical Web Audio soundscapes, we transform a static webpage into an interactive living deck. The user doesn't just read information — they step aboard the vessel.`
  },
  'log-3': {
    title: 'The Corsair\'s Code: Precision Craftsmanship Under Pressure',
    date: 'Captain\'s Log #354 • Dead Man\'s Horizon',
    content: `A pirate captain values only what works when steel meets storm. Clean code, zero unnecessary dependencies, relentless performance profiling, and an obsession with detail are the true treasure of digital craft.<br><br>
    Write code as if the person who maintains it after you is an armed pirate who knows your ship's coordinates.`
  }
};

function initCaptainLogs() {
  const logModal = document.getElementById('log-modal');
  const closeBtn = logModal ? logModal.querySelector('.modal-close-btn') : null;
  const readBtns = document.querySelectorAll('[data-read-log]');

  readBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const logId = btn.dataset.readLog;
      const data = LOGS_DATA[logId];
      if (!data) return;

      document.getElementById('log-modal-title').textContent = data.title;
      document.getElementById('log-modal-date').textContent = data.date;
      document.getElementById('log-modal-content').innerHTML = data.content;

      logModal.classList.add('active');
      document.body.style.overflow = 'hidden';
    });
  });

  function closeLogModal() {
    if (!logModal) return;
    logModal.classList.remove('active');
    document.body.style.overflow = '';
  }

  if (closeBtn) closeBtn.addEventListener('click', closeLogModal);
  if (logModal) {
    logModal.addEventListener('click', (e) => {
      if (e.target === logModal) closeLogModal();
    });
  }
}

/* --------------------------------------------------------------------------
   8. CONTACT FORM (BOTTLE CAST) & DRAFT AUTOSAVE
   -------------------------------------------------------------------------- */
function initContactForm() {
  const form = document.getElementById('bottle-dispatch-form');
  if (!form) return;

  const nameInput = document.getElementById('sender-name');
  const emailInput = document.getElementById('sender-email');
  const msgInput = document.getElementById('sender-msg');

  try {
    const saved = JSON.parse(localStorage.getItem('nihalsailor_draft') || '{}');
    if (saved.name) nameInput.value = saved.name;
    if (saved.email) emailInput.value = saved.email;
    if (saved.msg) msgInput.value = saved.msg;
  } catch (e) {}

  [nameInput, emailInput, msgInput].forEach(inp => {
    inp && inp.addEventListener('input', () => {
      const draft = {
        name: nameInput.value,
        email: emailInput.value,
        msg: msgInput.value
      };
      localStorage.setItem('nihalsailor_draft', JSON.stringify(draft));
    });
  });

  form.addEventListener('submit', (e) => {
    e.preventDefault();

    const name = nameInput.value.trim();
    const email = emailInput.value.trim();
    const msg = msgInput.value.trim();

    if (!name || !email || !msg) {
      showToast('⚠️ Please fill in all fields before casting the bottle.');
      return;
    }

    const submitBtn = form.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sealing with wax...';

    setTimeout(() => {
      submitBtn.disabled = false;
      submitBtn.innerHTML = originalText;
      form.reset();
      localStorage.removeItem('nihalsailor_draft');

      showToast(`🍾 Message sealed in wax and cast to sea! Captain Nihalsailor will receive your missive at nihalsailor14@gmail.com.`);
      if (window.maritimeAudio) {
        window.maritimeAudio.playChime('blade');
      }
    }, 1200);
  });
}

/* --------------------------------------------------------------------------
   9. 3D TILT EFFECT ON CARDS
   -------------------------------------------------------------------------- */
function init3DTilt() {
  const cards = document.querySelectorAll('.tilt-card');
  cards.forEach(card => {
    card.addEventListener('mousemove', (e) => {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;

      const rotateX = ((y - centerY) / centerY) * -6;
      const rotateY = ((x - centerX) / centerX) * 6;

      card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-4px)`;
    });

    card.addEventListener('mouseleave', () => {
      card.style.transform = `perspective(1000px) rotateX(0deg) rotateY(0deg) translateY(0)`;
    });
  });
}

/* --------------------------------------------------------------------------
   10. ANIMATED STAT COUNTERS
   -------------------------------------------------------------------------- */
function initStatCounters() {
  const statNumbers = document.querySelectorAll('.stat-number[data-target]');
  let counted = false;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting && !counted) {
        counted = true;
        statNumbers.forEach(stat => {
          const target = parseInt(stat.dataset.target, 10);
          const suffix = stat.dataset.suffix || '';
          let count = 0;
          const duration = 1600;
          const stepTime = 25;
          const steps = duration / stepTime;
          const increment = target / steps;

          const timer = setInterval(() => {
            count += increment;
            if (count >= target) {
              stat.textContent = target + suffix;
              clearInterval(timer);
            } else {
              stat.textContent = Math.floor(count) + suffix;
            }
          }, stepTime);
        });

        document.querySelectorAll('.skill-bar-fill').forEach(bar => {
          const w = bar.dataset.width || '80%';
          bar.style.width = w;
        });
      }
    });
  }, { threshold: 0.3 });

  const statsSection = document.querySelector('.hero-stats-deck');
  if (statsSection) observer.observe(statsSection);
}

/* --------------------------------------------------------------------------
   11. TOAST NOTIFICATION UTILITY
   -------------------------------------------------------------------------- */
function showToast(message) {
  let toast = document.getElementById('brand-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'brand-toast';
    toast.className = 'toast-notice';
    document.body.appendChild(toast);
  }

  toast.innerHTML = `<span style="color: var(--gold-primary); font-size: 1.2rem;">⚓</span> <span>${message}</span>`;
  toast.classList.add('show');

  clearTimeout(toast._timeout);
  toast._timeout = setTimeout(() => {
    toast.classList.remove('show');
  }, 4000);
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
