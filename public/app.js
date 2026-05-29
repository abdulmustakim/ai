const prompts = [
  'A futuristic Indian village powered by solar energy, cinematic lighting, ultra realistic, 4K, highly detailed',
  'A premium YouTube thumbnail for AI technology tutorial, glowing blue interface, bold composition, modern style',
  'A luxury product advertisement for a smart watch, black background, studio lighting, reflective surface',
  'A cyberpunk Kolkata street at night, neon signs, rain reflections, cinematic atmosphere, ultra detailed',
  'A heroic anime character standing in front of a glowing portal, dramatic lighting, vibrant colors',
  'A professional medical clinic poster design, clean white and blue theme, trustworthy healthcare branding'
];

const templates = [
  { icon: '🎬', title: 'YouTube Thumbnail', prompt: 'A viral YouTube thumbnail for an AI image generator tutorial, bold text area, neon glow, dramatic face lighting, high CTR design', glow: '#ff5470' },
  { icon: '🏷️', title: 'Logo Concept', prompt: 'A modern minimal logo concept for an AI startup, geometric icon, premium gradient, clean vector style', glow: '#00e5ff' },
  { icon: '🛍️', title: 'Product Mockup', prompt: 'Luxury product mockup on dark studio background, soft spotlight, realistic shadows, premium branding space', glow: '#ffcf33' },
  { icon: '🖼️', title: 'Poster Design', prompt: 'A cinematic event poster design, bold center subject, modern typography area, dramatic lights, 4K print ready', glow: '#7c3cff' },
  { icon: '👾', title: 'Gaming Art', prompt: 'A futuristic gaming character with glowing armor, action pose, cyber arena background, highly detailed 3D render', glow: '#23d18b' },
  { icon: '🌄', title: 'Wallpaper', prompt: 'A breathtaking fantasy landscape wallpaper, floating islands, golden sunrise, ultra wide composition, 8K details', glow: '#ff8a00' },
  { icon: '👤', title: 'Avatar', prompt: 'A professional AI avatar portrait, clean background, cinematic lighting, sharp details, social profile ready', glow: '#f45bff' },
  { icon: '📱', title: 'Social Banner', prompt: 'A modern social media banner for a tech brand, glassmorphism panels, gradient background, clean layout', glow: '#4b7bff' }
];

const promptInput = document.getElementById('promptInput');
const styleSelect = document.getElementById('styleSelect');
const ratioSelect = document.getElementById('ratioSelect');
const qualitySelect = document.getElementById('qualitySelect');
const countSelect = document.getElementById('countSelect');
const negativePrompt = document.getElementById('negativePrompt');
const generateBtn = document.getElementById('generateBtn');
const resultsGrid = document.getElementById('resultsGrid');
const resultMeta = document.getElementById('resultMeta');
const historyCount = document.getElementById('historyCount');
const templateGrid = document.getElementById('templateGrid');
const themeToggle = document.getElementById('themeToggle');
const navToggle = document.getElementById('navToggle');
const navLinks = document.getElementById('navLinks');
const downloadAll = document.getElementById('downloadAll');

let currentResults = [];

function init() {
  promptInput.value = prompts[0];
  renderTemplates();
  setupReveal();
  updateHistoryCount();
  loadTheme();
}

function renderTemplates() {
  templateGrid.innerHTML = templates.map((item) => `
    <article class="template-card" style="--glow:${item.glow}" data-prompt="${escapeHtml(item.prompt)}">
      <span>${item.icon}</span>
      <h3>${item.title}</h3>
      <p>${item.prompt.slice(0, 88)}...</p>
    </article>
  `).join('');

  document.querySelectorAll('.template-card').forEach((card) => {
    card.addEventListener('click', () => {
      promptInput.value = card.dataset.prompt;
      document.querySelector('#generator').scrollIntoView({ behavior: 'smooth' });
      promptInput.focus();
    });
  });
}

async function generateImages() {
  const prompt = promptInput.value.trim();
  if (!prompt) {
    promptInput.focus();
    promptInput.placeholder = 'Please write your image prompt first...';
    return;
  }

  const payload = {
    prompt,
    style: styleSelect.value,
    ratio: ratioSelect.value,
    quality: qualitySelect.value,
    count: Number(countSelect.value),
    negativePrompt: negativePrompt.value.trim()
  };

  setGeneratingState(true, 'Generating real AI images from the secure backend...');

  try {
    const response = await fetch('/api/generate-image', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(data.message || data.error || 'Image generation failed. Check your server and API key.');
    }

    currentResults = data.images.map((item, index) => ({
      src: item.src,
      filename: item.filename || `pixelforge-ai-${Date.now()}-${index + 1}.png`,
      label: item.label || `${payload.style} #${index + 1}`,
      ratio: payload.ratio
    }));

    renderResults(currentResults);
    saveHistory(prompt);
    updateHistoryCount();
    resultMeta.textContent = `${currentResults.length} real AI image${currentResults.length > 1 ? 's' : ''} generated • ${payload.style} • ${payload.quality}`;
  } catch (error) {
    console.error(error);
    resultMeta.textContent = error.message;

    // Keep the website usable during setup. If the API key is missing or the backend is offline,
    // this creates local demo images so the UI can still be tested.
    const demoCount = Math.min(Number(countSelect.value), 4);
    currentResults = Array.from({ length: demoCount }, (_, index) => createDemoImage({
      prompt,
      style: payload.style,
      quality: payload.quality,
      negative: payload.negativePrompt,
      ratio: payload.ratio,
      index
    }));
    renderResults(currentResults);
  } finally {
    setGeneratingState(false);
  }
}

function setGeneratingState(isGenerating, message) {
  generateBtn.classList.toggle('loading', isGenerating);
  generateBtn.disabled = isGenerating;
  if (message) resultMeta.textContent = message;
}

function createDemoImage({ prompt, style, quality, negative, ratio, index }) {
  const palettes = [
    ['#7c3cff', '#00e5ff', '#101325'],
    ['#ff5470', '#ffcf33', '#17111f'],
    ['#23d18b', '#00e5ff', '#06151a'],
    ['#f45bff', '#7c3cff', '#10091d'],
    ['#ff8a00', '#ffcf33', '#180c06'],
    ['#4b7bff', '#00e5ff', '#081329']
  ];
  const palette = palettes[(index + prompt.length) % palettes.length];
  const width = ratio === 'landscape' ? 1280 : ratio === 'portrait' ? 900 : 1024;
  const height = ratio === 'landscape' ? 720 : ratio === 'portrait' ? 1125 : 1024;
  const safePrompt = escapeHtml(prompt.slice(0, 78));
  const safeStyle = escapeHtml(style);
  const seed = Math.abs(hashCode(prompt + index + style));
  const circleX = 25 + (seed % 50);
  const circleY = 18 + ((seed >> 3) % 56);

  const svg = `
  <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
    <defs>
      <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="${palette[0]}"/>
        <stop offset="48%" stop-color="${palette[2]}"/>
        <stop offset="100%" stop-color="${palette[1]}"/>
      </linearGradient>
      <radialGradient id="glow" cx="${circleX}%" cy="${circleY}%" r="55%">
        <stop offset="0%" stop-color="#ffffff" stop-opacity="0.6"/>
        <stop offset="35%" stop-color="${palette[1]}" stop-opacity="0.42"/>
        <stop offset="100%" stop-color="#000000" stop-opacity="0"/>
      </radialGradient>
      <filter id="blur"><feGaussianBlur stdDeviation="34"/></filter>
      <pattern id="grid" width="44" height="44" patternUnits="userSpaceOnUse">
        <path d="M 44 0 L 0 0 0 44" fill="none" stroke="rgba(255,255,255,.12)" stroke-width="1"/>
      </pattern>
    </defs>
    <rect width="100%" height="100%" fill="url(#bg)"/>
    <rect width="100%" height="100%" fill="url(#grid)" opacity="0.55"/>
    <rect width="100%" height="100%" fill="url(#glow)"/>
    <circle cx="${width * 0.22}" cy="${height * 0.2}" r="${Math.min(width,height) * 0.2}" fill="${palette[1]}" opacity="0.32" filter="url(#blur)"/>
    <circle cx="${width * 0.76}" cy="${height * 0.78}" r="${Math.min(width,height) * 0.28}" fill="${palette[0]}" opacity="0.42" filter="url(#blur)"/>
    <g transform="translate(${width/2} ${height/2})">
      <circle r="${Math.min(width,height)*0.2}" fill="rgba(255,255,255,.11)" stroke="rgba(255,255,255,.35)" stroke-width="2"/>
      <ellipse rx="${Math.min(width,height)*0.34}" ry="${Math.min(width,height)*0.11}" fill="none" stroke="rgba(255,255,255,.48)" stroke-width="3" transform="rotate(-18)"/>
      <ellipse rx="${Math.min(width,height)*0.43}" ry="${Math.min(width,height)*0.15}" fill="none" stroke="rgba(255,255,255,.22)" stroke-width="2" transform="rotate(22)"/>
      <text x="0" y="12" text-anchor="middle" font-family="Inter, Arial" font-size="${Math.min(width,height)*0.045}" fill="#ffffff" font-weight="900">AI IMAGE</text>
    </g>
    <rect x="${width*0.06}" y="${height*0.07}" width="${width*0.42}" height="52" rx="26" fill="rgba(0,0,0,.25)" stroke="rgba(255,255,255,.22)"/>
    <text x="${width*0.09}" y="${height*0.07 + 34}" font-family="Inter, Arial" font-size="22" fill="#ffffff" font-weight="800">${safeStyle}</text>
    <foreignObject x="${width*0.06}" y="${height*0.78}" width="${width*0.88}" height="${height*0.17}">
      <div xmlns="http://www.w3.org/1999/xhtml" style="font-family:Inter,Arial;color:white;background:rgba(0,0,0,.32);border:1px solid rgba(255,255,255,.22);border-radius:24px;padding:22px;line-height:1.45;font-size:24px;font-weight:800;backdrop-filter:blur(10px);">
        ${safePrompt}<br/><span style="font-size:16px;color:rgba(255,255,255,.68);font-weight:700;">${escapeHtml(quality)} ${negative ? '• Avoid: ' + escapeHtml(negative.slice(0, 35)) : '• Professional demo output'}</span>
      </div>
    </foreignObject>
  </svg>`;

  return {
    src: `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`,
    filename: `pixelforge-ai-${Date.now()}-${index + 1}.svg`,
    label: `${style} #${index + 1}`,
    ratio
  };
}

function renderResults(results) {
  resultsGrid.innerHTML = results.map((item, index) => `
    <article class="result-card ${item.ratio}">
      <img class="result-img" src="${item.src}" alt="Generated image ${index + 1}">
      <div class="result-info">
        <span>${item.label}</span>
        <button data-index="${index}">Download</button>
      </div>
    </article>
  `).join('');

  document.querySelectorAll('.result-info button').forEach((btn) => {
    btn.addEventListener('click', () => downloadImage(Number(btn.dataset.index)));
  });
}

function downloadImage(index) {
  const item = currentResults[index];
  if (!item) return;
  const link = document.createElement('a');
  link.href = item.src;
  link.download = item.filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
}

function downloadAllImages() {
  if (!currentResults.length) return;
  currentResults.forEach((_, index) => window.setTimeout(() => downloadImage(index), index * 180));
}

function saveHistory(prompt) {
  const history = JSON.parse(localStorage.getItem('pf_history') || '[]');
  history.unshift({ prompt, style: styleSelect.value, createdAt: new Date().toISOString() });
  localStorage.setItem('pf_history', JSON.stringify(history.slice(0, 50)));
}

function updateHistoryCount() {
  const history = JSON.parse(localStorage.getItem('pf_history') || '[]');
  historyCount.textContent = history.length;
}

function setupReveal() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) entry.target.classList.add('visible');
    });
  }, { threshold: 0.12 });
  document.querySelectorAll('.reveal').forEach((el) => observer.observe(el));
}

function loadTheme() {
  const mode = localStorage.getItem('pf_theme');
  if (mode === 'light') document.body.classList.add('light-mode');
  themeToggle.textContent = document.body.classList.contains('light-mode') ? '☀' : '☾';
}

function toggleTheme() {
  document.body.classList.toggle('light-mode');
  const isLight = document.body.classList.contains('light-mode');
  localStorage.setItem('pf_theme', isLight ? 'light' : 'dark');
  themeToggle.textContent = isLight ? '☀' : '☾';
}

function enhancePromptText() {
  const base = promptInput.value.trim() || 'A creative AI image';
  const additions = 'cinematic composition, ultra detailed, professional lighting, high contrast, sharp focus, premium color grading, 4K, no watermark';
  if (!base.toLowerCase().includes('cinematic')) promptInput.value = `${base}, ${additions}`;
}

function randomPrompt() {
  promptInput.value = prompts[Math.floor(Math.random() * prompts.length)];
}

function clearPrompt() {
  promptInput.value = '';
  promptInput.focus();
}

function toggleMobileNav() {
  const open = navLinks.classList.toggle('open');
  navToggle.setAttribute('aria-expanded', String(open));
}

function escapeHtml(text) {
  return String(text)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function hashCode(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return hash;
}

generateBtn.addEventListener('click', generateImages);
downloadAll.addEventListener('click', downloadAllImages);
document.getElementById('enhancePrompt').addEventListener('click', enhancePromptText);
document.getElementById('randomPrompt').addEventListener('click', randomPrompt);
document.getElementById('clearPrompt').addEventListener('click', clearPrompt);
themeToggle.addEventListener('click', toggleTheme);
navToggle.addEventListener('click', toggleMobileNav);
navLinks.querySelectorAll('a').forEach((link) => link.addEventListener('click', () => navLinks.classList.remove('open')));

document.querySelectorAll('.accordion-item').forEach((item) => {
  item.addEventListener('click', () => {
    document.querySelectorAll('.accordion-item').forEach((i) => i.classList.remove('active'));
    item.classList.add('active');
  });
});

init();
