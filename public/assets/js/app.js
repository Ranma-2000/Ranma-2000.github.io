// Resume data is loaded from assets/js/data.js
let resumeData = null;
let currentChatNode = null;

// --- 1. Navigation Menu Controls (Mobile Responsive Toggle) ---
const navToggle = document.getElementById('navToggle');
const navMenu = document.getElementById('navMenu');
const navLinks = document.querySelectorAll('.nav-link');
const header = document.getElementById('header');

navToggle.addEventListener('click', () => {
  navMenu.classList.toggle('active');
  const icon = navToggle.querySelector('i');
  if (navMenu.classList.contains('active')) {
    icon.className = 'fa-solid fa-xmark';
  } else {
    icon.className = 'fa-solid fa-bars';
  }
});

navLinks.forEach(link => {
  link.addEventListener('click', () => {
    navMenu.classList.remove('active');
    navToggle.querySelector('i').className = 'fa-solid fa-bars';
  });
});

window.addEventListener('scroll', () => {
  if (window.scrollY > 50) {
    header.classList.add('scrolled');
  } else {
    header.classList.remove('scrolled');
  }
});

// --- 2. Scroll Spy Highlight Menu ---
const sections = document.querySelectorAll('section');
window.addEventListener('scroll', () => {
  let currentSection = '';
  
  sections.forEach(section => {
    const sectionTop = section.offsetTop - 120;
    const sectionHeight = section.clientHeight;
    if (window.pageYOffset >= sectionTop) {
      currentSection = section.getAttribute('id');
    }
  });

  navLinks.forEach(link => {
    link.classList.remove('active');
    if (link.getAttribute('href') === `#${currentSection}`) {
      link.classList.add('active');
    }
  });
});

// --- 3. Language Translation System ---
const placeholders = {
  vi: {
    name: "Nguyễn Văn A",
    email: "email@viethoc.edu.vn",
    subject: "Hợp tác thiết kế bài giảng AI / STEM",
    msg: "Xin chào Thành, mình quan tâm đến..."
  },
  en: {
    name: "John Doe",
    email: "john.doe@edtech.com",
    subject: "AI / STEM Curriculum Partnership",
    msg: "Hello Thanh, I am interested in..."
  },
  tw: {
    name: "王小明",
    email: "xiaoming@edtech.tw",
    subject: "AI / STEM 課程合作洽談",
    msg: "你好，成，我對您的專案有興趣..."
  }
};

function switchLanguage(lang) {
  document.body.setAttribute('data-lang', lang);
  
  document.getElementById('formName').placeholder = placeholders[lang].name;
  document.getElementById('formEmail').placeholder = placeholders[lang].email;
  document.getElementById('formSubject').placeholder = placeholders[lang].subject;
  document.getElementById('formMessage').placeholder = placeholders[lang].msg;

  document.querySelectorAll('.lang-btn').forEach(btn => {
    btn.classList.remove('active');
    if (btn.getAttribute('data-lang-trigger') === lang) {
      btn.classList.add('active');
    }
  });

  // Re-render language-dependent dynamic parts
  if (resumeData) {
    renderResumeDynamicParts(lang);
  }
  
  resetChatbot();
}

// --- 4. Fetch Resume Data and Render Dynamic Contents ---
async function loadResumeData() {
  try {
    resumeData = embeddedResumeData;
    
    // Initial rendering with default language (vi)
    const activeLang = document.body.getAttribute('data-lang') || 'vi';
    renderResumeDynamicParts(activeLang);
    
  } catch (error) {
    console.error("Error loading embedded resume data:", error);
    showToast("Không thể tải dữ liệu CV.");
  }
}

function renderResumeDynamicParts(lang) {
  if (!resumeData) return;
  
  // 1. Hero Content
  document.getElementById('heroBadge').textContent = resumeData.personal_info.badge;
  document.getElementById('heroTitle').innerHTML = `
    <span lang="${lang}">${resumeData.personal_info.name}</span>
  `;
  document.getElementById('heroSubtitle').innerHTML = `
    <span lang="${lang}">${resumeData.personal_info.title[lang]}</span>
  `;
  document.getElementById('heroTagline').innerHTML = `
    <span lang="${lang}">${resumeData.personal_info.tagline[lang]}</span>
  `;
  
  // 2. About Info Box Contacts
  const contactDetailsContainer = document.getElementById('aboutContactDetails');
  contactDetailsContainer.innerHTML = `
    <div class="about-info-item">
      <i class="fa-solid fa-envelope"></i>
      <span>${resumeData.personal_info.email}</span>
    </div>
    <div class="about-info-item">
      <i class="fa-solid fa-location-dot"></i>
      <span lang="${lang}">${resumeData.personal_info.location[lang]}</span>
    </div>
    <div class="about-info-item">
      <i class="fa-brands fa-linkedin"></i>
      <span><a href="https://${resumeData.personal_info.socials.linkedin.replace('https://', '')}" target="_blank">${resumeData.personal_info.socials.linkedin.replace('https://', '')}</a></span>
    </div>
    <div class="about-info-item">
      <i class="fa-brands fa-github"></i>
      <span><a href="https://${resumeData.personal_info.socials.github.replace('https://', '')}" target="_blank">${resumeData.personal_info.socials.github.replace('https://', '')}</a></span>
    </div>
  `;
  
  // 3. About Paragraphs
  const paragraphsContainer = document.getElementById('aboutParagraphs');
  paragraphsContainer.innerHTML = resumeData.about.paragraphs.map(p => `
    <p class="about-text-p lang-${lang}">${p[lang]}</p>
  `).join('');
  
  // 4. About Highlights
  const highlightsContainer = document.getElementById('aboutHighlights');
  highlightsContainer.innerHTML = resumeData.about.highlights.map(h => `
    <div class="highlight-card glass-card" style="border-left: 4px solid var(${h.color});">
      <h4>
        <i class="fa-solid ${h.icon}" style="color: var(${h.color});"></i>
        <span>${h.title[lang]}</span>
      </h4>
      <p>${h.desc[lang]}</p>
    </div>
  `).join('');
  
  // 5. Skills Section
  const skillsGrid = document.getElementById('skillsGrid');
  skillsGrid.innerHTML = resumeData.skills.map(skill => `
    <div class="skill-card glass-card">
      <div class="skill-card-header">
        <i class="fa-solid ${skill.icon}"></i>
        <h3>${skill.category[lang]}</h3>
      </div>
      <p class="skill-card-desc">${skill.desc[lang]}</p>
      <ul class="skill-items-list">
        ${skill.items.map(item => `<li>${item[lang]}</li>`).join('')}
      </ul>
    </div>
  `).join('');

  // 6. Experience Timeline
  const experienceTimeline = document.getElementById('experienceTimeline');
  experienceTimeline.innerHTML = resumeData.experience.map(job => `
    <div class="timeline-item">
      <div class="timeline-dot"></div>
      <div class="timeline-card glass-card">
        <div class="timeline-header">
          <div class="timeline-title">
            <h3>${job.role[lang]}</h3>
            <div class="timeline-company">
              <i class="fa-solid ${job.company_icon}"></i>
              <span>${job.company}</span>
            </div>
          </div>
          <span class="timeline-date">${job.date[lang]}</span>
        </div>

        <div class="timeline-details">
          <ul>
            ${job.details.map(detail => `<li>${detail[lang]}</li>`).join('')}
          </ul>

          ${job.sub_timelines ? job.sub_timelines.map(sub => `
            <div class="sub-timeline">
              <h4 class="sub-timeline-title" onclick="toggleSubTimeline(this)">
                <i class="fa-solid fa-network-wired"></i>
                <span lang="vi">Dự án & công việc phụ cùng kỳ</span>
                <span lang="en">Concurrent Projects & Side Roles</span>
                <span lang="tw">同期的兼職與獨立專案</span>
                <i class="fa-solid fa-chevron-down sub-timeline-toggle-icon"></i>
              </h4>
              
              <div class="sub-timeline-content">
                <div class="sub-timeline-track-container">
                  <div class="sub-timeline-line">
                    <div class="sub-timeline-progress" style="width: 0%;"></div>
                    ${sub.nodes.map(node => `
                      <div class="sub-timeline-node" style="left: ${node.left};" onclick="toggleSubJob('${node.id}', this)">
                        <span class="sub-tooltip">
                          <span>${node.tooltip[lang]}</span>
                        </span>
                      </div>
                    `).join('')}
                  </div>
                  <div class="sub-timeline-label start">${sub.start}</div>
                  <div class="sub-timeline-label end">${sub.end}</div>
                </div>

                <div class="sub-job-details-container">
                  ${sub.nodes.map(node => `
                    <div class="sub-job-card" id="details-${node.id}">
                      <div class="sub-job-card-header">
                        <div class="sub-job-card-title">
                          <h4>${node.title[lang]}</h4>
                          <div class="sub-job-card-company">
                            <i class="fa-solid ${node.company_icon}"></i>
                            <span>${node.company}</span>
                          </div>
                        </div>
                        <span class="sub-job-card-date">${node.date}</span>
                      </div>
                      <div class="sub-job-card-details">
                        <ul>
                          ${node.details.map(det => `<li>${det[lang]}</li>`).join('')}
                        </ul>
                      </div>
                    </div>
                  `).join('')}
                </div>
              </div>
            </div>
          `).join('') : ''}
        </div>
      </div>
    </div>
  `).join('');

  // Auto-initialize first sub-job dot for each sub-timeline
  document.querySelectorAll('.sub-timeline').forEach(subTimeline => {
    const firstDot = subTimeline.querySelector('.sub-timeline-node');
    if (firstDot) {
      firstDot.click();
    }
  });

  // 7. Projects Section
  const projectsGrid = document.getElementById('projectsGrid');
  projectsGrid.innerHTML = resumeData.projects.map(proj => {
    // Generate simple SVG icons for cards based on project type
    let cardIconSvg = '';
    if (proj.id === 'ai-limit-tracker') {
      cardIconSvg = `
        <rect width="100" height="100" fill="url(#p1-grad)" opacity="0.15"/>
        <rect x="20" y="25" width="60" height="50" rx="6" stroke="#2563eb" stroke-width="2" fill="white"/>
        <rect x="20" y="25" width="60" height="12" fill="#2563eb" rx="2"/>
        <circle cx="26" cy="31" r="2" fill="white"/>
        <circle cx="32" cy="31" r="2" fill="white"/>
        <circle cx="38" cy="31" r="2" fill="white"/>
        <path d="M30 55 H70 M30 63 H50" stroke="#0ea5e9" stroke-width="2" stroke-linecap="round"/>
        <circle cx="65" cy="59" r="6" stroke="#2563eb" stroke-width="1.5" fill="none"/>
        <path d="M69 63 L74 68" stroke="#2563eb" stroke-width="1.5" stroke-linecap="round"/>
        <defs>
          <linearGradient id="p1-grad" x1="0" y1="0" x2="100" y2="100">
            <stop stop-color="#2563eb"/><stop offset="1" stop-color="#0ea5e9"/>
          </linearGradient>
        </defs>
      `;
    } else if (proj.id === 'local-comfyui') {
      cardIconSvg = `
        <rect width="100" height="100" fill="url(#p2-grad)" opacity="0.15"/>
        <rect x="15" y="25" width="22" height="16" rx="3" stroke="#a855f7" stroke-width="1.5" fill="white"/>
        <line x1="37" y1="33" x2="48" y2="33" stroke="#9333ea" stroke-width="1.5"/>
        <rect x="48" y="25" width="22" height="16" rx="3" stroke="#a855f7" stroke-width="1.5" fill="white"/>
        <line x1="70" y1="33" x2="78" y2="48" stroke="#9333ea" stroke-width="1.5"/>
        <rect x="48" y="55" width="22" height="16" rx="3" stroke="#06b6d4" stroke-width="1.5" fill="white"/>
        <line x1="70" y1="63" x2="78" y2="48" stroke="#06b6d4" stroke-width="1.5"/>
        <rect x="78" y="40" width="16" height="16" rx="3" fill="#2563eb"/>
        <defs>
          <linearGradient id="p2-grad" x1="0" y1="0" x2="100" y2="100">
            <stop stop-color="#a855f7"/><stop offset="1" stop-color="#0ea5e9"/>
          </linearGradient>
        </defs>
      `;
    } else if (proj.id === 'iot-ecg') {
      cardIconSvg = `
        <rect width="100" height="100" fill="url(#p3-grad)" opacity="0.15"/>
        <path d="M15 50 H30 L35 30 L40 70 L45 45 L50 55 L55 50 H85" stroke="#ef4444" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M57 25 C54 22, 47 22, 44 26 C41 22, 34 22, 31 26 C27 30, 27 38, 31 42 L44 55 L57 42 C61 38, 61 30, 57 26 Z" fill="#ef4444" opacity="0.2"/>
        <defs>
          <linearGradient id="p3-grad" x1="0" y1="0" x2="100" y2="100">
            <stop stop-color="#ef4444"/><stop offset="1" stop-color="#f97316"/>
          </linearGradient>
        </defs>
      `;
    } else if (proj.id === 'delta-robot') {
      cardIconSvg = `
        <rect width="100" height="100" fill="url(#p4-grad)" opacity="0.15"/>
        <line x1="50" y1="20" x2="30" y2="55" stroke="#10b981" stroke-width="2" stroke-linecap="round"/>
        <line x1="50" y1="20" x2="50" y2="55" stroke="#10b981" stroke-width="2" stroke-linecap="round"/>
        <line x1="50" y1="20" x2="70" y2="55" stroke="#10b981" stroke-width="2" stroke-linecap="round"/>
        <rect x="25" y="55" width="50" height="8" rx="2" fill="#047857"/>
        <circle cx="50" cy="72" r="6" fill="#0ea5e9"/>
        <path d="M47 63 L47 70 M53 63 L53 70" stroke="#047857" stroke-width="1.5"/>
        <defs>
          <linearGradient id="p4-grad" x1="0" y1="0" x2="100" y2="100">
            <stop stop-color="#10b981"/><stop offset="1" stop-color="#06b6d4"/>
          </linearGradient>
        </defs>
      `;
    } else {
      cardIconSvg = `
        <rect width="100" height="100" fill="url(#p5-grad)" opacity="0.15"/>
        <circle cx="50" cy="30" r="12" stroke="#f59e0b" stroke-width="2" fill="white"/>
        <path d="M44 32 Q50 36 56 32" stroke="#f59e0b" stroke-width="1.5" fill="none"/>
        <circle cx="46" cy="27" r="1.5" fill="#f59e0b"/>
        <circle cx="54" cy="27" r="1.5" fill="#f59e0b"/>
        <line x1="50" y1="42" x2="25" y2="70" stroke="#f59e0b" stroke-width="1.5" stroke-dasharray="2 2"/>
        <line x1="50" y1="42" x2="50" y2="70" stroke="#f59e0b" stroke-width="1.5"/>
        <line x1="50" y1="42" x2="75" y2="70" stroke="#f59e0b" stroke-width="1.5" stroke-dasharray="2 2"/>
        <rect x="15" y="70" width="20" height="15" rx="3" fill="#ec4899"/>
        <rect x="40" y="70" width="20" height="15" rx="3" fill="#f59e0b"/>
        <rect x="65" y="70" width="20" height="15" rx="3" fill="#ec4899"/>
        <defs>
          <linearGradient id="p5-grad" x1="0" y1="0" x2="100" y2="100">
            <stop stop-color="#f59e0b"/><stop offset="1" stop-color="#ec4899"/>
          </linearGradient>
        </defs>
      `;
    }
    
    return `
      <div class="project-card glass-card" onclick="openProjectModal('${proj.id}')">
        <div class="project-img-wrapper">
          <div class="project-img-placeholder">
            <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
              ${cardIconSvg}
            </svg>
          </div>
        </div>
        <div class="project-body">
          <span class="project-tag">${proj.tag}</span>
          <h3>${proj.title}</h3>
          <p class="project-desc">${proj.desc[lang]}</p>
          <div class="project-techs">
            ${proj.techs.map(t => `<span class="tech-pill">${t}</span>`).join('')}
          </div>
        </div>
      </div>
    `;
  }).join('');

  // 8. Contact Form Static Placeholders / Values
  document.getElementById('contactEmailText').textContent = resumeData.personal_info.email;
  document.getElementById('contactLocationText').textContent = resumeData.personal_info.location_detailed[lang];
  
  // Contact Form Social Buttons
  const socialGroup = document.getElementById('contactSocialsGroup');
  socialGroup.innerHTML = `
    <a href="${resumeData.personal_info.socials.linkedin}" target="_blank" class="social-btn" aria-label="LinkedIn">
      <i class="fa-brands fa-linkedin-in"></i>
    </a>
    <a href="${resumeData.personal_info.socials.github}" target="_blank" class="social-btn" aria-label="GitHub">
      <i class="fa-brands fa-github"></i>
    </a>
    <a href="${resumeData.personal_info.socials.website}" target="_blank" class="social-btn" aria-label="Website">
      <i class="fa-solid fa-globe"></i>
    </a>
  `;
  
  // 9. Footer Content
  document.getElementById('footerLogoName').textContent = resumeData.personal_info.name;
  document.getElementById('footerTagline').textContent = resumeData.personal_info.tagline[lang];
}

// --- 5. Interactive Sub-timeline (Nested Minor Jobs) Toggle ---
function toggleSubJob(subJobId, dotEl) {
  if (!dotEl) return;
  
  const subTimeline = dotEl.closest('.sub-timeline');
  if (!subTimeline) return;

  subTimeline.querySelectorAll('.sub-timeline-node').forEach(node => {
    node.classList.remove('active');
  });
  dotEl.classList.add('active');

  const leftPercent = dotEl.style.left || '0%';
  const progressLine = subTimeline.querySelector('.sub-timeline-progress');
  if (progressLine) {
    progressLine.style.width = leftPercent;
  }

  subTimeline.querySelectorAll('.sub-job-card').forEach(card => {
    card.classList.remove('active');
  });
  
  const targetCard = subTimeline.querySelector(`#details-${subJobId}`);
  if (targetCard) {
    targetCard.classList.add('active');
  }
}

function toggleSubTimeline(titleEl) {
  if (!titleEl) return;
  const subTimeline = titleEl.closest('.sub-timeline');
  if (!subTimeline) return;
  
  subTimeline.classList.toggle('expanded');
}

// --- 6. Dynamic Project Modal System ---
const overlay = document.getElementById('projectModalOverlay');
const modalContainer = document.getElementById('projectModalContainer');

function openProjectModal(projectId) {
  const lang = document.body.getAttribute('data-lang') || 'vi';
  const proj = resumeData.projects.find(p => p.id === projectId);
  if (!proj) return;
  
  overlay.classList.add('active');
  modalContainer.style.display = 'block';
  
  // Generate showcase HTML based on project type (supports SVG and dynamic webp/images)
  let showcaseHtml = '';
  if (proj.id === 'ai-limit-tracker') {
    showcaseHtml = `
      <svg viewBox="0 0 200 120" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="200" height="120" rx="8" fill="#1e293b"/>
        <rect width="200" height="15" fill="#0f172a" rx="4"/>
        <circle cx="10" cy="7.5" r="2.5" fill="#ef4444"/>
        <circle cx="18" cy="7.5" r="2.5" fill="#eab308"/>
        <circle cx="26" cy="7.5" r="2.5" fill="#22c55e"/>
        <text x="15" y="40" font-family="Outfit" font-size="9" fill="#94a3b8" font-weight="bold">API LIMIT MONITOR</text>
        <text x="15" y="55" font-family="Outfit" font-size="14" fill="#ffffff" font-weight="bold">$18.42 / $25.00</text>
        <rect x="15" y="65" width="170" height="8" rx="4" fill="#334155"/>
        <rect x="15" y="65" width="125" height="8" rx="4" fill="#3b82f6"/>
        <text x="15" y="88" font-family="Outfit" font-size="8" fill="#cbd5e1">Active Session Hooks: 12 requests captured today</text>
        <text x="15" y="100" font-family="Outfit" font-size="8" fill="#f43f5e" font-weight="bold">Warn threshold reached at 70% budget usage.</text>
      </svg>
    `;
  } else if (proj.id === 'local-comfyui') {
    showcaseHtml = `
      <svg viewBox="0 0 200 120" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="200" height="120" rx="8" fill="#0f172a"/>
        <rect x="10" y="15" width="70" height="35" rx="5" fill="#1e293b" stroke="#a855f7" stroke-width="1.5"/>
        <text x="20" y="30" font-family="Outfit" font-size="8" fill="#ffffff" font-weight="bold">Google Colab</text>
        <text x="20" y="42" font-family="Outfit" font-size="6" fill="#a855f7">Cloud GPU (A100)</text>
        <path d="M80 32 H120" stroke="#cbd5e1" stroke-width="1.5" stroke-dasharray="4 2"/>
        <path d="M115 28 L120 32 L115 36" fill="#cbd5e1"/>
        <text x="88" y="25" font-family="Outfit" font-size="6" fill="#0ea5e9" font-weight="bold">Sync API</text>
        <rect x="120" y="15" width="70" height="35" rx="5" fill="#1e293b" stroke="#0ea5e9" stroke-width="1.5"/>
        <text x="130" y="30" font-family="Outfit" font-size="8" fill="#ffffff" font-weight="bold">Local Storage</text>
        <text x="130" y="42" font-family="Outfit" font-size="6" fill="#0ea5e9">Fast Caching</text>
        <rect x="15" y="65" width="50" height="45" rx="4" fill="#3b82f6" opacity="0.8"/>
        <text x="20" y="77" font-family="Outfit" font-size="7" fill="white" font-weight="bold">KSampler</text>
        <rect x="75" y="65" width="50" height="45" rx="4" fill="#9333ea" opacity="0.8"/>
        <text x="80" y="77" font-family="Outfit" font-size="7" fill="white" font-weight="bold">VAE Decode</text>
        <rect x="135" y="65" width="50" height="45" rx="4" fill="#10b981" opacity="0.8"/>
        <text x="140" y="77" font-family="Outfit" font-size="7" fill="white" font-weight="bold">Save Image</text>
      </svg>
    `;
  } else if (proj.id === 'iot-ecg') {
    showcaseHtml = `
      <svg viewBox="0 0 200 120" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="200" height="120" rx="8" fill="#1e293b"/>
        <path d="M0 20 H200 M0 40 H200 M0 60 H200 M0 80 H200 M0 100 H200 M20 0 V120 M40 0 V120 M60 0 V120 M80 0 V120 M100 0 V120 M120 0 V120 M140 0 V120 M160 0 V120 M180 0 V120" stroke="#334155" stroke-width="0.5"/>
        <path d="M10 60 H50 L55 45 L60 85 L65 30 L70 95 L75 55 L80 65 L85 60 H130 L135 45 L140 85 L145 30 L150 95 L155 55 L160 65 L165 60 H190" stroke="#ef4444" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        <rect x="10" y="10" width="70" height="18" rx="4" fill="#0f172a" stroke="#f97316" stroke-width="1"/>
        <text x="16" y="21" font-family="Outfit" font-size="7" fill="#f97316" font-weight="bold">AI: NORMAL ECG</text>
        <text x="145" y="21" font-family="Outfit" font-size="9" fill="#ffffff" font-weight="bold">BPM: 74</text>
        <circle cx="138" cy="18" r="3.5" fill="#ef4444"/>
      </svg>
    `;
  } else if (proj.id === 'delta-robot') {
    showcaseHtml = `
      <svg viewBox="0 0 200 120" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="200" height="120" rx="8" fill="#0f172a"/>
        <line x1="100" y1="15" x2="60" y2="70" stroke="#10b981" stroke-width="3" stroke-linecap="round"/>
        <line x1="100" y1="15" x2="100" y2="70" stroke="#10b981" stroke-width="3" stroke-linecap="round"/>
        <line x1="100" y1="15" x2="140" y2="70" stroke="#10b981" stroke-width="3" stroke-linecap="round"/>
        <circle cx="100" cy="15" r="5" fill="#cbd5e1"/>
        <rect x="50" y="70" width="100" height="10" rx="3" fill="#047857"/>
        <path d="M90 80 L90 92 M110 80 L110 92" stroke="#047857" stroke-width="2"/>
        <circle cx="100" cy="98" r="7" fill="#f59e0b"/>
        <rect x="10" y="108" width="180" height="6" rx="3" fill="#475569"/>
        <text x="15" y="25" font-family="Outfit" font-size="8" fill="#06b6d4" font-weight="bold">MATLAB PID Simulation</text>
        <text x="15" y="37" font-family="Outfit" font-size="6" fill="#94a3b8">GA Optimized Parameters</text>
      </svg>
    `;
  } else {
    showcaseHtml = `
      <svg viewBox="0 0 200 120" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="200" height="120" rx="8" fill="#1e293b"/>
        <circle cx="30" cy="60" r="16" stroke="#f59e0b" stroke-width="2" fill="#0f172a"/>
        <text x="24" y="63" font-family="Outfit" font-size="8" fill="#f59e0b" font-weight="bold">USER</text>
        <line x1="46" y1="60" x2="100" y2="30" stroke="#94a3b8" stroke-width="1.5"/>
        <line x1="46" y1="60" x2="100" y2="60" stroke="#94a3b8" stroke-width="2" stroke-dasharray="2 2"/>
        <line x1="46" y1="60" x2="100" y2="90" stroke="#94a3b8" stroke-width="1.5"/>
        <rect x="100" y="18" width="80" height="24" rx="4" fill="#0f172a" stroke="#ec4899" stroke-width="1.5"/>
        <text x="108" y="33" font-family="Outfit" font-size="8" fill="#ffffff">Clicks: Product 1042</text>
        <rect x="100" y="48" width="80" height="24" rx="4" fill="#0f172a" stroke="#f59e0b" stroke-width="1.5"/>
        <text x="108" y="63" font-family="Outfit" font-size="8" fill="#ffffff">Carts: Product 0891</text>
        <rect x="100" y="78" width="80" height="24" rx="4" fill="#0f172a" stroke="#ec4899" stroke-width="1.5"/>
        <text x="108" y="93" font-family="Outfit" font-size="8" fill="#ffffff">Orders: Product 3350</text>
      </svg>
    `;
  }

  // Check if we need chatbot box
  const chatbotDemoHtml = (proj.id === 'ai-limit-tracker') ? `
    <div style="margin-top: 1.5rem;">
      <h4 style="margin-bottom: 0.75rem;">
        <i class="fa-solid fa-comments"></i> 
        <span lang="vi">Trải nghiệm Trợ lý AI (Demo Live)</span>
        <span lang="en">Try the AI Portfolio Assistant (Live Demo)</span>
        <span lang="tw">體驗個人 AI 助理 (線上展示)</span>
      </h4>
      <div class="chatbot-demo-box">
        <div class="chatbot-header">
          <div class="chatbot-avatar"><i class="fa-solid fa-robot"></i></div>
          <div class="chatbot-info">
            <h5>
              <span lang="vi">Trợ lý AI của Thành</span>
              <span lang="en">Thanh's AI Assistant</span>
              <span lang="tw">阿成的 AI 助理</span>
            </h5>
            <span>
              <span lang="vi">Đang hoạt động • Hỏi đáp năng lực</span>
              <span lang="en">Active • Ask about my skills</span>
              <span lang="tw">線上 • 詢問我的專業能力</span>
            </span>
          </div>
          <button class="chatbot-reset-btn" onclick="resetChatbot()">
            <i class="fa-solid fa-rotate-right"></i> 
            <span lang="vi">Làm mới</span>
            <span lang="en">Reset</span>
            <span lang="tw">重設</span>
          </button>
        </div>
        <div class="chat-messages" id="chatMessages">
          <!-- Injected dynamically -->
        </div>
        <div class="chat-options-container">
          <div class="chat-options-title">
            <span lang="vi">Chọn câu hỏi của bạn:</span>
            <span lang="en">Choose your question:</span>
            <span lang="tw">請選擇您的問題：</span>
          </div>
          <div class="chat-options-grid" id="chatOptions">
            <!-- Injected dynamically -->
          </div>
        </div>
      </div>
    </div>
  ` : '';

  // Render modal structure
  modalContainer.innerHTML = `
    <div class="modal-header">
      <div class="modal-title">
        <h3>${proj.title}</h3>
      </div>
      <button class="modal-close" onclick="closeProjectModal()">&times;</button>
    </div>
    <div class="modal-body">
      <div class="modal-showcase">
        ${showcaseHtml}
      </div>
      <div class="modal-info-grid">
        <div class="modal-desc-col">
          <h4>${proj.modal.desc_title[lang]}</h4>
          ${proj.modal.paragraphs.map(p => `<p class="modal-desc-text">${p[lang]}</p>`).join('')}
          ${chatbotDemoHtml}
        </div>
        <div class="modal-meta-col">
          <h4>${proj.modal.tech_specs_title[lang]}</h4>
          <div class="meta-list">
            ${proj.modal.specs.map(spec => `
              <div class="meta-item">
                <span class="meta-label">${spec.label[lang]}</span>
                <span class="meta-value">${spec.value}</span>
              </div>
            `).join('')}
          </div>
          <a href="${proj.modal.link_url}" target="_blank" class="btn btn-primary" style="margin-top: 1rem; width: 100%; font-size: 0.9rem; padding: 0.6rem;">
            <i class="fa-brands fa-github"></i>
            <span>${proj.modal.link_text[lang]}</span>
          </a>
        </div>
      </div>
    </div>
  `;

  if (projectId === 'ai-limit-tracker') {
    resetChatbot();
  }
}

function closeProjectModal() {
  overlay.classList.remove('active');
  modalContainer.style.display = 'none';
  modalContainer.innerHTML = '';
}

// --- 7. Socratic Chatbot Logic calling Backend API ---
function resetChatbot() {
  const messagesContainer = document.getElementById('chatMessages');
  if (messagesContainer) {
    messagesContainer.innerHTML = '';
    goToChatNode('start');
  }
}

async function goToChatNode(nodeId) {
  const activeLang = document.body.getAttribute('data-lang') || 'vi';
  const messagesContainer = document.getElementById('chatMessages');
  if (!messagesContainer) return;
  
  currentChatNode = nodeId;

  // Add temporary typing bubble
  const botBubble = document.createElement('div');
  botBubble.className = 'chat-bubble bot';
  
  let typingMsg = "Gia sư đang gõ...";
  if (activeLang === 'en') typingMsg = "Tutor is typing...";
  if (activeLang === 'tw') typingMsg = "助教正在輸入...";

  botBubble.innerHTML = `<i class="fa-solid fa-spinner fa-spin" style="margin-right:5px"></i> ${typingMsg}`;
  messagesContainer.appendChild(botBubble);
  messagesContainer.scrollTop = messagesContainer.scrollHeight;

  try {
    const langScript = embeddedChatbotData[activeLang];
    if (!langScript || !langScript[nodeId]) {
      throw new Error("Chat node not found: " + nodeId);
    }
    const node = langScript[nodeId];
    
    setTimeout(() => {
      botBubble.innerHTML = node.botText;
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
      renderChatOptions(node.options);
    }, 600);
    
  } catch (error) {
    console.error("Chatbot error:", error);
    setTimeout(() => {
      botBubble.innerHTML = activeLang === 'en' ? "Error loading chat node." : "Lỗi khi tải dữ liệu đối thoại.";
    }, 600);
  }
}

function renderChatOptions(options) {
  const optionsContainer = document.getElementById('chatOptions');
  if (!optionsContainer) return;
  optionsContainer.innerHTML = '';
  
  options.forEach(opt => {
    const btn = document.createElement('button');
    btn.className = 'chat-opt-btn';
    btn.textContent = opt.text;
    btn.onclick = () => handleUserSelection(opt.text, opt.nextNode);
    optionsContainer.appendChild(btn);
  });
}

function handleUserSelection(text, nextNodeId) {
  const messagesContainer = document.getElementById('chatMessages');
  if (!messagesContainer) return;
  
  const userBubble = document.createElement('div');
  userBubble.className = 'chat-bubble user';
  userBubble.textContent = text;
  messagesContainer.appendChild(userBubble);
  messagesContainer.scrollTop = messagesContainer.scrollHeight;

  const buttons = document.querySelectorAll('.chat-opt-btn');
  buttons.forEach(b => b.disabled = true);

  goToChatNode(nextNodeId);
}

// --- 8. Contact Form submission calling Backend API ---
async function handleFormSubmit(event) {
  event.preventDefault();
  
  const form = document.getElementById('contactForm');
  const name = document.getElementById('formName').value;
  const email = document.getElementById('formEmail').value;
  const subject = document.getElementById('formSubject').value;
  const message = document.getElementById('formMessage').value;

  if (name && email && subject && message) {
    const activeLang = document.body.getAttribute('data-lang') || 'vi';
    
    const toastMsgs = {
      vi: `Cảm ơn ${name}! Tin nhắn của bạn đã gửi thành công.`,
      en: `Thank you ${name}! Your message has been sent successfully.`,
      tw: `感謝您的聯絡，${name}！您的訊息已成功送出。`
    };

    showToast(toastMsgs[activeLang]);
    console.log("Form submission saved client-side:", { name, email, subject, message });
    form.reset();
  }
}

function showToast(message) {
  const container = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.innerHTML = `
    <i class="fa-solid fa-circle-check toast-icon"></i>
    <span class="toast-message">${message}</span>
  `;
  
  container.appendChild(toast);
  
  setTimeout(() => {
    toast.classList.add('show');
  }, 50);

  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => {
      toast.remove();
    }, 400);
  }, 4000);
}

// --- 9. Initial Load on Mount ---
document.addEventListener('DOMContentLoaded', () => {
  // Try loading resume data from API
  loadResumeData();
  
  // Set default active language
  switchLanguage('vi');
});
