const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');
const PROJECTS_DIR = path.join(ROOT_DIR, 'projects');
const DATA_DIR = path.join(ROOT_DIR, 'data');

if (!fs.existsSync(PROJECTS_DIR)) {
  fs.mkdirSync(PROJECTS_DIR, { recursive: true });
}

// Load data
const projects = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'projects.json'), 'utf8'));
const assets = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'assets.json'), 'utf8'));

// Specific SEO and template metadata for each project
const projectMetadata = {
  'wrx-battles': {
    metaTitle: 'WRX Battles by Nihal Sailor - Multiplayer Combat',
    metaDesc: 'Discover the latest software innovation from developer Nihal Sailor. Download WRX Battles Online for advanced optimization, seamless security, and custom tools.',
    niche: 'real-time multiplayer vehicular combat and physics simulation',
    feature1Title: 'Synchronized Multiplayer Warfare',
    feature1Desc: 'Engineered with low-latency client-side prediction, projectile trajectory ballistics, and high-concurrency Photon networking.',
    feature2Title: 'Resilient Client Architecture',
    feature2Desc: 'Hardened game state validation and physics verification to prevent cheat injection and latency desynchronization.',
    schemaType: 'VideoGame',
    appCategory: 'GameApplication',
    operatingSystem: 'Windows, WebGL, PC'
  },
  'apanibaat': {
    metaTitle: 'ApaniBaat by Nihal Sailor - Realtime Messaging',
    metaDesc: 'Discover the latest software innovation from developer Nihal Sailor. Download ApaniBaat for advanced optimization, seamless security, and custom tools.',
    niche: 'end-to-end encrypted real-time communication and messaging channels',
    feature1Title: 'Sub-25ms WebSocket Latency',
    feature1Desc: 'High-concurrency room dispatching, live presence tracking, instant message delivery acknowledgments, and typing indicators.',
    feature2Title: 'End-to-End Privacy Fortress',
    feature2Desc: 'Zero-knowledge session authentication, tamper-resistant encrypted message transport, and protected user data isolation.',
    schemaType: 'SoftwareApplication',
    appCategory: 'CommunicationApplication',
    operatingSystem: 'Web, Android, iOS, Windows'
  },
  'stream-sailor': {
    metaTitle: 'StreamSailor by Nihal Sailor - Creator Studio Suite',
    metaDesc: 'Discover the latest software innovation from developer Nihal Sailor. Download StreamSailor for advanced optimization, seamless security, and custom tools.',
    niche: 'broadcast orchestration, reactive audio DSP, and streaming automation',
    feature1Title: 'Sub-10ms OBS Integration & DSP',
    feature1Desc: 'Low-latency scene automation, real-time reactive audio signal filters, and telemetry health monitoring under 1% CPU overhead.',
    feature2Title: 'Local Sandbox Security',
    feature2Desc: 'Isolated bot token management and local REST API running purely on the creator machine with zero telemetry leakage.',
    schemaType: 'SoftwareApplication',
    appCategory: 'MultimediaApplication',
    operatingSystem: 'Windows, Linux, macOS'
  },
  'zai-security': {
    metaTitle: 'ZAI Security by Nihal Sailor - Threat Recon Radar',
    metaDesc: 'Discover the latest software innovation from developer Nihal Sailor. Download ZAI Security for advanced optimization, seamless security, and custom tools.',
    niche: 'automated penetration reconnaissance, network auditing, and vulnerability defense',
    feature1Title: 'High-Throughput Threat Recon',
    feature1Desc: 'Scans over 1,000 ports per second with automated CVE library correlation, misconfiguration sweeps, and packet inspection algorithms.',
    feature2Title: 'Adversarial Security Hardening',
    feature2Desc: 'Proactive reconnaissance pipeline discovering exposed endpoints and attack surfaces before external attackers can exploit them.',
    schemaType: 'SoftwareApplication',
    appCategory: 'SecurityApplication',
    operatingSystem: 'Linux, Docker, Windows'
  },
  'safeguard-lite': {
    metaTitle: 'SafeGuard Lite by Nihal Sailor - Device Security',
    metaDesc: 'Discover the latest software innovation from developer Nihal Sailor. Download SafeGuard Lite for advanced optimization, seamless security, and custom tools.',
    niche: 'privacy-first mobile parental controls and device policy enforcement',
    feature1Title: 'Instant Application Lockdown',
    feature1Desc: 'Native low-overhead background monitor enforcing scheduled screen lockouts, app restrictions, and instant policy triggers.',
    feature2Title: 'Zero-Cloud Privacy Guarantee',
    feature2Desc: 'All activity auditing, firewall rules, and encryption operate entirely on-device with SQLite and zero external data harvesting.',
    schemaType: 'SoftwareApplication',
    appCategory: 'SecurityApplication',
    operatingSystem: 'Android, Windows, PC'
  },
  'ghost-galleon-3d': {
    metaTitle: 'Ghost Galleon by Nihal Sailor - 3D Ocean Simulation',
    metaDesc: 'Discover the latest software innovation from developer Nihal Sailor. Download Ghost Galleon for advanced optimization, seamless security, and custom tools.',
    niche: 'GPU-accelerated browser WebGL simulation and dynamic shader rendering',
    feature1Title: '60 FPS Ultra WebGL Rendering',
    feature1Desc: 'Real-time GPU Gerstner wave displacement, volumetric fog atmospheric shaders, and lantern lighting in an ultra-lean 2.4 MB bundle.',
    feature2Title: 'Secure In-Browser Execution',
    feature2Desc: 'Zero external tracker footprint running in an isolated hardware-accelerated WebGL canvas context.',
    schemaType: 'WebApplication',
    appCategory: 'MultimediaApplication',
    operatingSystem: 'Any Modern Web Browser'
  },
  'stuck-cursed-ui': {
    metaTitle: 'Stuck Cursed UI by Nihal Sailor - Unity UI Kit',
    metaDesc: 'Discover the latest software innovation from developer Nihal Sailor. Download Stuck Cursed UI for advanced optimization, seamless security, and custom tools.',
    niche: 'dark fantasy maritime UI systems and responsive HUD frameworks for Unity games',
    feature1Title: '45+ Production-Ready Prefabs',
    feature1Desc: 'Handcrafted 9-sliced gothic brass borders, responsive modal windows, health bars, inventory grids, and synthesizer sound FX.',
    feature2Title: 'Clean Modularity & Zero Garbage Collection',
    feature2Desc: 'Engineered with clean C# namespaces, optimized draw-call batching, and zero runtime GC allocations for high-performance builds.',
    schemaType: 'SoftwareApplication',
    appCategory: 'DeveloperApplication',
    operatingSystem: 'Unity 2022.3 LTS, Unity 6'
  },
  'corsair-vehicle-physics': {
    metaTitle: 'Corsair Physics by Nihal Sailor - Unity Physics',
    metaDesc: 'Discover the latest software innovation from developer Nihal Sailor. Download Corsair Physics for advanced optimization, seamless security, and custom tools.',
    niche: 'arcade vehicle dynamics, combat suspension, and multiplayer netcode for Unity',
    feature1Title: 'Plug-and-Play Combat Driving',
    feature1Desc: 'Dynamic multi-wheel suspension, customizable torque curves, tire slip friction simulation, and ballistic projectile mechanics.',
    feature2Title: 'Multiplayer-Safe Client Prediction',
    feature2Desc: 'Built-in client prediction interfaces preventing vehicle desynchronization, packet tampering, and position spoofing.',
    schemaType: 'SoftwareApplication',
    appCategory: 'DeveloperApplication',
    operatingSystem: 'Unity 2022.3 LTS+'
  },
  'abyssal-ocean-shader': {
    metaTitle: 'Abyssal Shader by Nihal Sailor - Dynamic Ocean Shader',
    metaDesc: 'Discover the latest software innovation from developer Nihal Sailor. Download Abyssal Shader for advanced optimization, seamless security, and custom tools.',
    niche: 'real-time GPU water shaders and rigid-body maritime buoyancy physics',
    feature1Title: 'Photorealistic GPU Wave Displacement',
    feature1Desc: 'Multi-octave Gerstner wave displacement, dynamic crest foam, and underwater light caustics with under 0.4ms GPU pass time.',
    feature2Title: 'Mathematical Rigid Buoyancy Query',
    feature2Desc: 'Synchronous CPU/GPU wave height calculations allowing seafaring vessels to crest and pitch realistically without memory leaks.',
    schemaType: 'SoftwareApplication',
    appCategory: 'DeveloperApplication',
    operatingSystem: 'Unity URP & HDRP'
  },
  'guardian-security-unity': {
    metaTitle: 'Guardian AntiCheat by Nihal Sailor - Unity Security Kit',
    metaDesc: 'Discover the latest software innovation from developer Nihal Sailor. Download Guardian AntiCheat for advanced optimization, seamless security, and custom tools.',
    niche: 'client-side game security, memory obfuscation, and anti-tamper engineering',
    feature1Title: 'Real-Time Memory Obfuscation',
    feature1Desc: 'Prevents runtime memory scraping, variable manipulation, speedhacks, and debugger attachment on compiled client games.',
    feature2Title: 'AES-GCM Save & Network Encryption',
    feature2Desc: 'Military-grade authenticated save file encryption and protection against MITM packet forgery and unauthorized client modifications.',
    schemaType: 'SoftwareApplication',
    appCategory: 'SecurityApplication',
    operatingSystem: 'Unity All Platforms'
  },
  'flow-connect-free': {
    metaTitle: 'Flow Connect Free by Nihal Sailor - Google Flow MCP',
    metaDesc: 'Discover the latest software innovation from developer Nihal Sailor. Download Flow Connect Free for advanced optimization, seamless security, and custom tools.',
    niche: 'generative AI orchestration, Model Context Protocol (MCP) bridges, and browser automation',
    feature1Title: 'Hardware-Level Input Automation & CDP',
    feature1Desc: 'Dispatches trusted hardware clicks and keystrokes via Chrome DevTools Protocol to bypass synthetic event blocks and capture clean CDN media URLs in real time.',
    feature2Title: 'Local & Private Loopback Architecture',
    feature2Desc: 'Operates purely on local loopback (127.0.0.1:8791) with zero third-party telemetry, no cloud API key dependencies, and direct local download synchronization.',
    schemaType: 'SoftwareApplication',
    appCategory: 'DeveloperApplication',
    operatingSystem: 'Windows, macOS, Linux, Chrome/Edge'
  }
};

function generateProjectPage(item, isUnity) {
  const meta = projectMetadata[item.id] || {
    metaTitle: `${item.title} by Nihal Sailor - Software Project`,
    metaDesc: `Discover the latest software innovation from developer Nihal Sailor. Download ${item.title} for advanced optimization, seamless security, and custom tools.`,
    niche: item.desc,
    feature1Title: 'High-Performance Architecture',
    feature1Desc: item.details || item.desc,
    feature2Title: 'Security & Integrity First',
    feature2Desc: 'Engineered with clean code practices, minimal attack surfaces, and user privacy guarantees.',
    schemaType: 'SoftwareApplication',
    appCategory: 'SoftwareApplication',
    operatingSystem: 'Cross-Platform'
  };

  const tagsHtml = (item.tags || []).map(t => `<span class="tag-pill">${escapeHtml(t)}</span>`).join('');
  
  const metricsList = item.metrics || [
    { label: 'Status', val: item.status || 'Active' },
    { label: 'Platform', val: item.unityVersion || 'Cross-Platform' },
    { label: 'Developer', val: 'Nihal Sailor' }
  ];

  const metricsHtml = metricsList.map(m => `
    <div class="spec-box">
      <div class="spec-number">${escapeHtml(m.val)}</div>
      <div class="spec-label">${escapeHtml(m.label)}</div>
    </div>
  `).join('');

  const liveUrl = isUnity ? (item.assetStoreUrl || '#') : (item.liveUrl || '#');
  const codeUrl = isUnity ? (item.githubUrl || 'https://github.com/nihalsailor') : (item.codeUrl || 'https://github.com/nihalsailor');
  const hasLive = liveUrl && liveUrl !== '#';
  const hasCode = codeUrl && codeUrl !== '#';

  const categoryName = item.categoryLabel || (isUnity ? 'Unity Asset Package' : item.category);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(meta.metaTitle)}</title>
  
  <!-- Meta Information & SEO -->
  <meta name="description" content="${escapeHtml(meta.metaDesc)}">
  <meta name="keywords" content="${escapeHtml((item.tags || []).join(', '))}, Nihal Sailor, software developer, portfolio, ${escapeHtml(item.title)}">
  <meta name="author" content="Nihal Sailor">
  <meta name="p:domain_verify" content="e11746ca856d30727b4935c454664b37"/>

  <!-- Canonical URL -->
  <link rel="canonical" href="https://nihalsailor.com/projects/${item.id}.html">

  <!-- OpenGraph / Social Sharing -->
  <meta property="og:title" content="${escapeHtml(meta.metaTitle)}">
  <meta property="og:description" content="${escapeHtml(meta.metaDesc)}">
  <meta property="og:image" content="https://nihalsailor.com/${escapeHtml(item.image || 'BackgroundLogo.png')}">
  <meta property="og:url" content="https://nihalsailor.com/projects/${item.id}.html">
  <meta property="og:type" content="article">

  <!-- Twitter Card -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${escapeHtml(meta.metaTitle)}">
  <meta name="twitter:description" content="${escapeHtml(meta.metaDesc)}">
  <meta name="twitter:image" content="https://nihalsailor.com/${escapeHtml(item.image || 'BackgroundLogo.png')}">

  <!-- Schema.org JSON-LD Structured Data (Google Knowledge Graph & Rich Snippets) -->
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "${meta.schemaType}",
    "name": "${escapeHtml(item.title)}",
    "url": "https://nihalsailor.com/projects/${item.id}.html",
    "image": "https://nihalsailor.com/${escapeHtml(item.image || 'BackgroundLogo.png')}",
    "description": "${escapeHtml(meta.metaDesc)}",
    "applicationCategory": "${meta.appCategory}",
    "operatingSystem": "${meta.operatingSystem}",
    "author": {
      "@type": "Person",
      "name": "Nihal Sailor",
      "url": "https://nihalsailor.com",
      "sameAs": [
        "https://www.youtube.com/@nihalsailor",
        "https://github.com/nihalsailor",
        "https://instagram.com/nihalsailor"
      ]
    },
    "offers": {
      "@type": "Offer",
      "price": "0.00",
      "priceCurrency": "USD"
    }
  }
  </script>

  <!-- Favicon Suite -->
  <link rel="icon" type="image/x-icon" href="../favicon.ico">
  <link rel="icon" type="image/png" sizes="32x32" href="../favicon-32x32.png">
  <link rel="icon" type="image/png" sizes="16x16" href="../favicon-16x16.png">
  <link rel="apple-touch-icon" sizes="180x180" href="../apple-touch-icon.png">
  <link rel="manifest" href="../site.webmanifest">
  <meta name="theme-color" content="#d4af37">

  <!-- Google Fonts & FontAwesome -->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Cinzel+Decorative:wght@700;900&family=Cinzel:wght@500;600;700;800;900&family=JetBrains+Mono:wght@400;600&family=Plus+Jakarta+Sans:wght@300;400;500;600;700&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css" crossorigin="anonymous" referrerpolicy="no-referrer" />
  
  <!-- Main Stylesheet -->
  <link rel="stylesheet" href="../css/style.css">

  <style>
    .launch-container {
      max-width: 960px;
      margin: 0 auto;
      padding: 7.5rem 1.5rem 5rem;
      position: relative;
      z-index: 2;
    }
    .launch-card {
      background: var(--bg-card);
      border: 1px solid var(--border-gold);
      border-radius: 8px;
      box-shadow: var(--shadow-gilded);
      backdrop-filter: blur(14px);
      padding: 2.75rem;
      position: relative;
      overflow: hidden;
    }
    .launch-banner-wrap {
      width: 100%;
      height: 320px;
      overflow: hidden;
      border-radius: 6px;
      border: 1px solid var(--border-subtle);
      margin-bottom: 2rem;
      position: relative;
    }
    .launch-banner-img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
    }
    .press-badge {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.35rem 0.85rem;
      border-radius: 4px;
      font-size: 0.75rem;
      font-family: var(--font-mono);
      text-transform: uppercase;
      letter-spacing: 0.1em;
      background: rgba(229, 185, 92, 0.12);
      border: 1px solid var(--border-gold);
      color: var(--gold-light);
      margin-bottom: 1.25rem;
    }
    .press-headline {
      font-size: 2.2rem;
      line-height: 1.25;
      margin-bottom: 1rem;
      color: var(--text-primary);
    }
    .press-body {
      font-size: 1.05rem;
      line-height: 1.85;
      color: var(--text-parchment);
      margin-bottom: 2.25rem;
    }
    .feature-list {
      list-style: none;
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
      margin: 1.5rem 0 2.5rem;
    }
    .feature-item {
      display: flex;
      gap: 1.25rem;
      align-items: flex-start;
      background: rgba(5, 9, 17, 0.65);
      border: 1px solid var(--border-subtle);
      border-radius: 6px;
      padding: 1.25rem 1.5rem;
      transition: var(--transition-smooth);
    }
    .feature-item:hover {
      border-color: var(--gold-primary);
      transform: translateX(4px);
    }
    .feature-icon {
      color: var(--gold-primary);
      font-size: 1.35rem;
      margin-top: 0.2rem;
      flex-shrink: 0;
    }
    .feature-title {
      font-family: var(--font-cinzel);
      font-size: 1.05rem;
      color: var(--gold-light);
      margin-bottom: 0.25rem;
    }
    .feature-desc {
      color: var(--text-parchment);
      font-size: 0.95rem;
      line-height: 1.6;
    }
    .spec-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: 1rem;
      margin-bottom: 2.5rem;
    }
    .spec-box {
      background: rgba(5, 9, 17, 0.8);
      border: 1px solid var(--border-subtle);
      border-radius: 6px;
      padding: 1rem;
      text-align: center;
    }
    .spec-number {
      font-family: var(--font-cinzel);
      font-size: 1.3rem;
      color: var(--gold-primary);
      margin-bottom: 0.25rem;
    }
    .spec-label {
      font-family: var(--font-mono);
      font-size: 0.72rem;
      text-transform: uppercase;
      color: var(--text-muted);
      letter-spacing: 0.08em;
    }
    .action-row {
      display: flex;
      flex-wrap: wrap;
      gap: 1rem;
      margin-bottom: 3rem;
    }
    .author-card {
      background: rgba(5, 9, 17, 0.75);
      border: 1px solid var(--border-gold);
      border-radius: 6px;
      padding: 1.75rem;
      margin-top: 2.5rem;
      display: flex;
      gap: 1.5rem;
      align-items: center;
    }
    .author-avatar {
      width: 76px;
      height: 76px;
      border-radius: 50%;
      border: 2px solid var(--gold-primary);
      object-fit: cover;
      flex-shrink: 0;
    }
    @media (max-width: 640px) {
      .launch-container { padding-top: 6rem; }
      .launch-card { padding: 1.5rem; }
      .press-headline { font-size: 1.75rem; }
      .author-card { flex-direction: column; text-align: center; }
      .action-row { flex-direction: column; }
    }
  </style>
</head>
<body>

  <!-- Background Mist & Canvas -->
  <canvas id="atmosphere-canvas"></canvas>

  <div class="content-wrapper">

    <!-- Header / Navigation Deck -->
    <header class="main-nav scrolled">
      <div class="container nav-container">
        <a href="../index.html" class="brand-link" title="Nihalsailor Flagship">
          <div class="brand-avatar-wrap">
            <img src="../MainLogo.jpg" alt="Nihalsailor Crest" class="brand-avatar">
          </div>
          <div>
            <span class="brand-name gold-gradient-text">NIHALSAILOR</span>
            <span class="brand-tag">Digital Corsair</span>
          </div>
        </a>

        <nav>
          <ul class="nav-links">
            <li><a href="../index.html" class="nav-link"><i class="fas fa-home"></i> Flagship Home</a></li>
            <li><a href="../projects.html" class="nav-link active"><i class="fas fa-ship"></i> All Projects</a></li>
            <li><a href="https://www.youtube.com/@nihalsailor" target="_blank" rel="noopener" class="nav-link"><i class="fab fa-youtube"></i> YouTube</a></li>
            <li><a href="../index.html#contact" class="nav-link"><i class="fas fa-envelope"></i> Contact</a></li>
          </ul>
        </nav>

        <div class="nav-actions">
          <button class="btn-sound-toggle" aria-label="Toggle Sea Ambience">
            <i class="fas fa-volume-xmark"></i>
          </button>
          <a href="../projects.html" class="btn-corsair" style="font-size: 0.78rem; padding: 0.5rem 1rem;">
            <i class="fas fa-arrow-left"></i> Fleet Vault
          </a>
        </div>
      </div>
    </header>

    <!-- Main Content: SEO-Optimized Product Launch Template -->
    <main class="launch-container">
      <article class="launch-card">
        
        <!-- Media Banner -->
        <div class="launch-banner-wrap">
          <img src="../${escapeHtml(item.image || 'BackgroundLogo.png')}" alt="${escapeHtml(item.title)} by Nihal Sailor" class="launch-banner-img">
          <span class="project-category-tag" style="position: absolute; top: 1rem; right: 1rem;">
            ${escapeHtml(categoryName)}
          </span>
        </div>

        <!-- Press Release Title & Badge -->
        <div class="press-badge">
          <i class="fas fa-bullhorn text-gold"></i> Official Product Release • Nihal Sailor
        </div>

        <h1 class="press-headline font-cinzel">
          ${escapeHtml(meta.metaTitle)}
        </h1>

        <div class="project-tags" style="margin-bottom: 1.5rem;">
          ${tagsHtml}
        </div>

        <hr style="border: 0; border-top: 1px solid var(--border-subtle); margin-bottom: 1.75rem;">

        <!-- Main Content / Press Release Body -->
        <p class="press-body">
          Independent software engineer and developer <strong>Nihal Sailor</strong> has officially announced the launch of his newest project, <strong>${escapeHtml(item.title)}</strong>. Following the release of mobile utilities like SafeGuard Lite, this latest software addresses critical needs in <em>${escapeHtml(meta.niche)}</em>.
        </p>

        <!-- Key Features of [Product Name] -->
        <h2 class="font-cinzel gold-gradient-text" style="font-size: 1.45rem; margin-bottom: 0.5rem;">
          Key Features of ${escapeHtml(item.title)}
        </h2>
        
        <ul class="feature-list">
          <li class="feature-item">
            <i class="fas fa-award feature-icon"></i>
            <div>
              <div class="feature-title">Engineered by Nihal Sailor</div>
              <div class="feature-desc">Built from the ground up prioritizing clean architecture, high reliability, and efficient runtime performance.</div>
            </div>
          </li>
          <li class="feature-item">
            <i class="fas fa-bolt feature-icon"></i>
            <div>
              <div class="feature-title">${escapeHtml(meta.feature1Title)}</div>
              <div class="feature-desc">${escapeHtml(meta.feature1Desc)}</div>
            </div>
          </li>
          <li class="feature-item">
            <i class="fas fa-shield-halved feature-icon"></i>
            <div>
              <div class="feature-title">${escapeHtml(meta.feature2Title)}</div>
              <div class="feature-desc">${escapeHtml(meta.feature2Desc)}</div>
            </div>
          </li>
        </ul>

        <!-- Technical Specifications -->
        <h3 class="font-cinzel text-gold" style="font-size: 1.15rem; margin-bottom: 1rem; text-transform: uppercase;">
          Vessel & Asset Specifications
        </h3>
        <div class="spec-grid">
          ${metricsHtml}
        </div>

        <!-- Live Links & Direct Actions -->
        <div class="action-row">
          ${hasLive ? `
            <a href="${escapeHtml(liveUrl)}" target="_blank" rel="noopener" class="btn-corsair" style="border-color: var(--gold-primary); flex: 1; text-align: center;">
              <i class="${isUnity ? 'fab fa-unity' : 'fas fa-external-link-alt'}"></i> ${isUnity ? 'View on Asset Store' : 'Launch Live / Download'}
            </a>
          ` : ''}
          ${hasCode ? `
            <a href="${escapeHtml(codeUrl)}" target="_blank" rel="noopener" class="btn-corsair" style="flex: 1; text-align: center;">
              <i class="fab fa-github"></i> Blueprint Source Code
            </a>
          ` : ''}
          <a href="../projects.html" class="btn-corsair" style="flex: 1; text-align: center;">
            <i class="fas fa-arrow-left"></i> Return to Fleet Archive
          </a>
        </div>

        <!-- About the Developer (Structured Bio & Brand Coordinates) -->
        <section class="author-card">
          <img src="../MainLogo.jpg" alt="Developer Nihal Sailor" class="author-avatar">
          <div>
            <h3 class="font-cinzel text-gold" style="font-size: 1.15rem; margin-bottom: 0.35rem;">
              About the Developer: Nihal Sailor
            </h3>
            <p style="font-size: 0.95rem; line-height: 1.7; color: var(--text-parchment); margin-bottom: 0.85rem;">
              <strong>Nihal Sailor</strong> is a digital creator, 3D artist, and programmer dedicated to building accessible software tools. Through his official platform at <a href="https://nihalsailor.com" class="text-gold" style="text-decoration: underline;">nihalsailor.com</a>, he continues to build projects that bridge the gap between user privacy and functional utility.
            </p>
            <p style="font-size: 0.88rem; color: var(--text-muted); line-height: 1.6;">
              For documentation, source repositories, or to download the utility, visit the official <a href="../projects.html" class="text-gold" style="text-decoration: underline;">Nihal Sailor Project Hub</a> or subscribe to the <a href="https://www.youtube.com/@nihalsailor" target="_blank" rel="noopener" class="text-gold" style="text-decoration: underline;">Nihal Sailor YouTube Channel</a> for video deep-dives.
            </p>
          </div>
        </section>

      </article>
    </main>

    <!-- Footer -->
    <footer class="main-footer" style="margin-top: 4rem;">
      <div class="container footer-container">
        <div class="footer-bottom">
          <div>&copy; 2026 <strong>NIHALSAILOR</strong>. All rights reserved.</div>
          <div><a href="../projects.html" class="btn-corsair" style="padding: 0.4rem 0.9rem; font-size: 0.72rem;"><i class="fas fa-arrow-up"></i> Return to Fleet Archive</a></div>
        </div>
      </div>
    </footer>

  </div>

  <!-- Ambient Audio & Canvas Scripts -->
  <script src="../js/audio.js?v=2.0.1"></script>
  <script src="../js/canvas.js?v=2.0.1"></script>
  <script>
    document.addEventListener('DOMContentLoaded', () => {
      const soundBtn = document.querySelector('.btn-sound-toggle');
      if (soundBtn && window.maritimeAudio) {
        soundBtn.addEventListener('click', () => {
          const isPlaying = window.maritimeAudio.toggleSound();
          soundBtn.classList.toggle('playing', isPlaying);
          soundBtn.innerHTML = isPlaying ? '<i class="fas fa-volume-high"></i>' : '<i class="fas fa-volume-xmark"></i>';
        });
      }
    });
  </script>
</body>
</html>`;
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

// 1. Generate flagship project pages
projects.forEach(p => {
  const html = generateProjectPage(p, false);
  const outPath = path.join(PROJECTS_DIR, `${p.id}.html`);
  fs.writeFileSync(outPath, html, 'utf8');
  console.log(`Generated: projects/${p.id}.html`);
});

// 2. Generate unity asset pages
assets.forEach(a => {
  const html = generateProjectPage(a, true);
  const outPath = path.join(PROJECTS_DIR, `${a.id}.html`);
  fs.writeFileSync(outPath, html, 'utf8');
  console.log(`Generated: projects/${a.id}.html`);
});

// 3. Create index.html inside projects/ that redirects to ../projects.html
const projectsIndexHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="refresh" content="0; url=../projects.html">
  <title>Redirecting to Nihalsailor Project Hub...</title>
  <link rel="canonical" href="https://nihalsailor.com/projects.html">
  <script>window.location.replace('../projects.html');</script>
</head>
<body>
  <p>Navigating to <a href="../projects.html">Nihalsailor Complete Fleet Archive</a>...</p>
</body>
</html>`;
fs.writeFileSync(path.join(PROJECTS_DIR, 'index.html'), projectsIndexHtml, 'utf8');
console.log('Generated: projects/index.html (redirect to projects.html)');

// 4. Update sitemap.xml with all project pages
const sitemapPath = path.join(ROOT_DIR, 'sitemap.xml');
const today = new Date().toISOString().split('T')[0];

const allUrls = [
  { loc: 'https://nihalsailor.com/', prio: '1.0', freq: 'weekly' },
  { loc: 'https://nihalsailor.com/projects.html', prio: '0.9', freq: 'weekly' },
  { loc: 'https://streamsailor.nihalsailor.com/', prio: '0.9', freq: 'weekly' },
  { loc: 'https://safeguardlite.nihalsailor.com/', prio: '0.9', freq: 'weekly' }
];

projects.forEach(p => {
  allUrls.push({
    loc: `https://nihalsailor.com/projects/${p.id}.html`,
    prio: '0.8',
    freq: 'weekly'
  });
});

assets.forEach(a => {
  allUrls.push({
    loc: `https://nihalsailor.com/projects/${a.id}.html`,
    prio: '0.7',
    freq: 'weekly'
  });
});

const sitemapXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
        xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9
        http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd">

${allUrls.map(u => `  <url>
    <loc>${u.loc}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${u.freq}</changefreq>
    <priority>${u.prio}</priority>
  </url>`).join('\n\n')}

</urlset>
`;

fs.writeFileSync(sitemapPath, sitemapXml, 'utf8');
console.log('Updated: sitemap.xml with all individual project pages for Google Search Console!');
