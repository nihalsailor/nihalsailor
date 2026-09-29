/**
 * NIHALSAILOR MAIN APPLICATION CONTROLLER
 * Orchestrates interactions, audio state, dynamic armada projects, modals, and project creation.
 */

// Global registry of all active projects
window.allProjects = [];

document.addEventListener('DOMContentLoaded', async () => {
  initNavbar();
  initSoundToggle();
  initCursedMode();
  await loadAndRenderProjects();
  initProjectFilters();
  initProjectModals();
  initAddProjectModal();
  initCaptainLogs();
  initContactForm();
  init3DTilt();
  initStatCounters();
});

/* --------------------------------------------------------------------------
   1. PROJECT REGISTRY & DYNAMIC RENDERING
   -------------------------------------------------------------------------- */
async function loadAndRenderProjects() {
  let baseProjects = window.DEFAULT_PROJECTS || [];

  // Attempt to fetch latest data/projects.json if hosted on web server
  try {
    const res = await fetch('data/projects.json');
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        baseProjects = data;
      }
    }
  } catch (e) {
    // Falls back seamlessly to window.DEFAULT_PROJECTS
  }

  // Load custom user projects from localStorage
  let customProjects = [];
  try {
    customProjects = JSON.parse(localStorage.getItem('nihalsailor_custom_projects') || '[]');
  } catch (e) {
    customProjects = [];
  }

  // Combine projects (custom first or appended)
  window.allProjects = [...customProjects, ...baseProjects];
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
    const isCustom = proj.isCustom ? true : false;
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
        ${isCustom ? `<button class="btn-delete-vessel" data-delete-id="${proj.id}" title="Remove Vessel from Browser"><i class="fas fa-trash-can"></i></button>` : ''}
      </div>
      <h3 class="project-title font-cinzel">
        <span>${escapeHtml(proj.title)}</span>
        <i class="fas fa-ship text-gold" style="font-size: 1rem;"></i>
      </h3>
      <p class="project-desc">${escapeHtml(proj.desc)}</p>
      <div class="project-tags">${tagsHtml}</div>
      <div class="project-actions">
        <button class="btn-card-action btn-card-primary" data-inspect-project="${escapeHtml(proj.id)}">
          <i class="fas fa-eye"></i> Inspect Vessel
        </button>
        ${proj.codeUrl && proj.codeUrl !== '#' ? `
          <a href="${escapeHtml(proj.codeUrl)}" target="_blank" rel="noopener" class="btn-card-action btn-card-secondary">
            <i class="fab fa-github"></i> Blueprint
          </a>
        ` : ''}
        ${proj.liveUrl && proj.liveUrl !== '#' ? `
          <a href="${escapeHtml(proj.liveUrl)}" target="_blank" rel="noopener" class="btn-card-action btn-card-secondary" style="border-color: var(--gold-primary); color: var(--gold-light);">
            <i class="fas fa-external-link-alt"></i> Live
          </a>
        ` : ''}
      </div>
    `;

    grid.appendChild(card);
  });

  // Re-attach 3D tilt and deletion listeners
  init3DTilt();
  attachProjectInspectors();
  attachDeleteListeners();
}

function attachDeleteListeners() {
  document.querySelectorAll('.btn-delete-vessel').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = btn.dataset.deleteId;
      if (confirm('Are you sure you want to dismiss this vessel from your harbor?')) {
        let customProjects = JSON.parse(localStorage.getItem('nihalsailor_custom_projects') || '[]');
        customProjects = customProjects.filter(p => p.id !== id);
        localStorage.setItem('nihalsailor_custom_projects', JSON.stringify(customProjects));
        loadAndRenderProjects();
        showToast('⚓ Vessel removed from your deck.');
      }
    });
  });
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
        liveBtn.href = data.liveUrl || '#';
        liveBtn.style.display = data.liveUrl && data.liveUrl !== '#' ? 'inline-flex' : 'none';
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
   2. ADD NEW PROJECT (COMMISSION VESSEL) MODAL WORKFLOW
   -------------------------------------------------------------------------- */
function initAddProjectModal() {
  const addModal = document.getElementById('add-project-modal');
  const openBtn = document.getElementById('btn-open-add-project');
  const closeBtn = addModal ? addModal.querySelector('.modal-close-btn') : null;
  const form = document.getElementById('add-project-form');
  const exportBtn = document.getElementById('btn-export-projects');
  const copyJsonBtn = document.getElementById('btn-copy-projects-json');
  const imageInput = document.getElementById('proj-image-file');
  let uploadedImageData = '';

  if (openBtn && addModal) {
    openBtn.addEventListener('click', () => {
      addModal.classList.add('active');
      document.body.style.overflow = 'hidden';
      if (window.maritimeAudio) window.maritimeAudio.playChime('blade');
    });
  }

  function closeAddModal() {
    if (!addModal) return;
    addModal.classList.remove('active');
    document.body.style.overflow = '';
  }

  if (closeBtn) closeBtn.addEventListener('click', closeAddModal);
  if (addModal) {
    addModal.addEventListener('click', (e) => {
      if (e.target === addModal) closeAddModal();
    });
  }

  // Handle image file upload to base64
  if (imageInput) {
    imageInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (uploadEvent) => {
          uploadedImageData = uploadEvent.target.result;
          document.getElementById('image-upload-preview').style.display = 'block';
          document.getElementById('image-upload-preview').src = uploadedImageData;
        };
        reader.readAsDataURL(file);
      }
    });
  }

  // Form Submission
  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();

      const title = document.getElementById('proj-title').value.trim();
      const category = document.getElementById('proj-category').value;
      const categoryLabel = document.getElementById('proj-category').selectedOptions[0].text;
      const desc = document.getElementById('proj-desc').value.trim();
      const details = document.getElementById('proj-details').value.trim() || desc;
      const tagsRaw = document.getElementById('proj-tags').value.trim();
      const liveUrl = document.getElementById('proj-live').value.trim() || '#';
      const codeUrl = document.getElementById('proj-code').value.trim() || 'https://github.com/nihalsailor';
      const metricLabel1 = document.getElementById('proj-metric-label-1').value.trim() || 'Engine';
      const metricVal1 = document.getElementById('proj-metric-val-1').value.trim() || 'Custom';
      const metricLabel2 = document.getElementById('proj-metric-label-2').value.trim() || 'Status';
      const metricVal2 = document.getElementById('proj-metric-val-2').value.trim() || 'Completed';

      const tags = tagsRaw.split(',').map(t => t.trim()).filter(Boolean);
      const imageUrlInput = document.getElementById('proj-image-url').value.trim();
      const finalImage = uploadedImageData || imageUrlInput || 'BackgroundLogo.png';

      const newProject = {
        id: 'vessel-' + Date.now(),
        title,
        category,
        categoryLabel,
        desc,
        details,
        tags: tags.length > 0 ? tags : ['Full-Stack', 'Engineering'],
        image: finalImage,
        liveUrl,
        codeUrl,
        metrics: [
          { label: metricLabel1, val: metricVal1 },
          { label: metricLabel2, val: metricVal2 },
          { label: 'Armada', val: 'Nihalsailor' }
        ],
        isCustom: true
      };

      // Save to localStorage
      let customProjects = JSON.parse(localStorage.getItem('nihalsailor_custom_projects') || '[]');
      customProjects.unshift(newProject);
      localStorage.setItem('nihalsailor_custom_projects', JSON.stringify(customProjects));

      // Re-render
      loadAndRenderProjects();
      form.reset();
      uploadedImageData = '';
      if (document.getElementById('image-upload-preview')) {
        document.getElementById('image-upload-preview').style.display = 'none';
      }

      closeAddModal();
      showToast(`⚓ New vessel "${title}" commissioned into your Armada!`);

      // Scroll to Armada section smoothly
      const armadaSection = document.getElementById('armada');
      if (armadaSection) {
        armadaSection.scrollIntoView({ behavior: 'smooth' });
      }

      // Open Export helper modal or show instruction
      setTimeout(() => {
        showDeployInstructionModal(newProject);
      }, 700);
    });
  }

  // Export JSON file download
  if (exportBtn) {
    exportBtn.addEventListener('click', () => {
      exportProjectsJsonFile();
    });
  }

  // Copy JSON snippet
  if (copyJsonBtn) {
    copyJsonBtn.addEventListener('click', () => {
      const jsonStr = JSON.stringify(window.allProjects, null, 2);
      navigator.clipboard.writeText(jsonStr).then(() => {
        showToast('📋 All projects copied to clipboard as JSON!');
      }).catch(() => {
        showToast('⚠️ Could not copy to clipboard.');
      });
    });
  }
}

function exportProjectsJsonFile() {
  const jsonStr = JSON.stringify(window.allProjects, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'projects.json';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  showToast('💾 projects.json downloaded! Replace data/projects.json to deploy for everyone.');
}

function showDeployInstructionModal(newProject) {
  const modal = document.getElementById('export-modal');
  if (!modal) return;

  const codeArea = document.getElementById('export-json-code');
  if (codeArea) {
    codeArea.textContent = JSON.stringify(newProject, null, 2);
  }

  modal.classList.add('active');
  document.body.style.overflow = 'hidden';
}

/* --------------------------------------------------------------------------
   3. NAVIGATION & SCROLL TRACKING
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
   4. MARITIME SOUNDSCAPE TOGGLE
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
   5. CURSED AURA (RED EYE MODE)
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
   6. PROJECT FILTERING
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
   7. PROJECT DETAILS MODAL
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
      const addModal = document.getElementById('add-project-modal');
      if (addModal) addModal.classList.remove('active');
      const exportModal = document.getElementById('export-modal');
      if (exportModal) exportModal.classList.remove('active');
      const logModal = document.getElementById('log-modal');
      if (logModal) logModal.classList.remove('active');
      document.body.style.overflow = '';
    }
  });

  // Export modal close listeners
  const exportModal = document.getElementById('export-modal');
  if (exportModal) {
    const exportClose = exportModal.querySelector('.modal-close-btn');
    if (exportClose) exportClose.addEventListener('click', () => {
      exportModal.classList.remove('active');
      document.body.style.overflow = '';
    });
  }
}

/* --------------------------------------------------------------------------
   8. CAPTAIN'S LOG READ-MORE MODAL
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
   9. CONTACT FORM (BOTTLE CAST) & DRAFT AUTOSAVE
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
   10. 3D TILT EFFECT ON CARDS
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
   11. ANIMATED STAT COUNTERS
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
   12. TOAST NOTIFICATION UTILITY
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
