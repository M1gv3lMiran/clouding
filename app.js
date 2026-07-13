/* Armario IA — chatbot de estilismo personal
   Llama a la API de Claude directamente desde el navegador con la clave del usuario. */

'use strict';

const API_URL = 'https://api.anthropic.com/v1/messages';
const LS_KEY = 'armario-ia-apikey';
const LS_MODEL = 'armario-ia-model';
const LS_HISTORY = 'armario-ia-history';

const SYSTEM_PROMPT = `Eres "Armario IA", una asesora de estilismo y moda personal: experta, cercana y muy práctica.
Ayudas a la persona usuaria a:
- Combinar prendas (colores, proporciones, calzado y accesorios).
- Decidir qué ponerse según la ocasión, el clima y el momento del día.
- Aconsejar en las compras: qué merece la pena, versatilidad, calidad-precio, tallaje y fondo de armario.

Cuando te envíen fotos de ropa, describe brevemente lo que ves y da recomendaciones concretas:
con qué combinarla, para qué ocasiones es ideal, en qué estación o momento del día luce mejor, y un consejo de compra si aplica.

Estilo de respuesta:
- Responde SIEMPRE en español, con tono amable, motivador y sin tecnicismos innecesarios.
- Sé concreta y accionable. Usa listas cortas y negritas para lo importante.
- Si falta información clave (ocasión, presupuesto, estilo preferido, talla o colorimetría), haz 1-2 preguntas breves.`;

const MAX_IMAGE_DIM = 1024;   // redimensiona las fotos para ahorrar datos y tokens
const MAX_HISTORY = 30;       // turnos guardados en el dispositivo

// --- Estado ---
let history = loadHistory();   // [{role, content:[...blocks]}]
let pending = [];              // imágenes adjuntas pendientes de enviar {dataUrl, media_type, data}
let sending = false;

// --- Elementos ---
const $ = (id) => document.getElementById(id);
const messagesEl = $('messages');
const inputEl = $('input');
const composerEl = $('composer');
const fileInput = $('fileInput');
const attachmentsEl = $('attachments');
const sendBtn = $('sendBtn');

// ---------- Inicio ----------
renderHistory();
if (!history.length) renderWelcome();
autoGrow();

// ---------- Eventos ----------
composerEl.addEventListener('submit', (e) => { e.preventDefault(); send(); });

inputEl.addEventListener('input', autoGrow);
inputEl.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey && !isMobile()) { e.preventDefault(); send(); }
});

fileInput.addEventListener('change', async (e) => {
  for (const file of e.target.files) await addImage(file);
  fileInput.value = '';
});

$('settingsBtn').addEventListener('click', openSettings);
$('closeSettings').addEventListener('click', closeSettings);
$('settingsOverlay').addEventListener('click', (e) => { if (e.target.id === 'settingsOverlay') closeSettings(); });
$('saveSettings').addEventListener('click', saveSettings);
$('clearChat').addEventListener('click', clearChat);

// ---------- Envío ----------
async function send() {
  if (sending) return;
  const text = inputEl.value.trim();
  if (!text && !pending.length) return;

  // Construye el contenido del mensaje del usuario
  const content = [];
  for (const img of pending) {
    content.push({ type: 'image', source: { type: 'base64', media_type: img.media_type, data: img.data } });
  }
  if (text) content.push({ type: 'text', text });

  const userMsg = { role: 'user', content };
  history.push(userMsg);
  renderMessage('user', content);

  // Limpia composer
  inputEl.value = '';
  pending = [];
  renderAttachments();
  autoGrow();
  clearWelcome();

  if (getKey()) await requestReply();
  else await demoReply();
}

// ---------- Modo demo (sin clave de API) ----------
let demoBannerShown = false;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function showDemoBannerOnce() {
  if (demoBannerShown) return;
  demoBannerShown = true;
  const n = document.createElement('div');
  n.className = 'notice';
  n.innerHTML = '✨ <strong>Modo demo</strong>: estas son respuestas de ejemplo. Añade tu clave de API en ⚙️ para activar la IA real que analiza tus fotos.';
  messagesEl.appendChild(n);
  scrollToBottom();
}

function demoText(hadImages) {
  const intro = hadImages
    ? 'He recibido tu foto 👗. En **modo demo** todavía no puedo analizarla de verdad, pero así se vería mi respuesta:\n\n'
    : '';
  return intro +
`**Cómo combinarla**
- Parte de una base neutra (blanco, beige, azul marino o gris) y añade un único punto de color con un accesorio.
- Juega con las proporciones: si la prenda es holgada arriba, elige algo más ajustado abajo (y al revés).

**Cuándo y dónde llevarla**
- Perfecta para un look de diario o una tarde informal.
- En invierno súmale una chaqueta estructurada o un abrigo largo; en verano, sandalias o zapatillas blancas.

**Consejo de compra**
- Prioriza tejidos versátiles y colores que combinen con lo que ya tienes: así cada prenda te cunde mucho más.

_Cuando añadas tu clave de API en ⚙️, responderé de verdad, analizando tus fotos, tu estilo y la ocasión._`;
}

async function demoReply() {
  sending = true;
  sendBtn.disabled = true;
  showDemoBannerOnce();
  const bubble = renderTyping();
  await sleep(650);

  const last = history[history.length - 1];
  const hadImages = last.content.some((b) => b.type === 'image');
  const text = demoText(hadImages);

  bubble.classList.remove('typing');
  bubble.innerHTML = '';
  const words = text.split(' ');
  let acc = '';
  for (let i = 0; i < words.length; i++) {
    acc += (i ? ' ' : '') + words[i];
    bubble.innerHTML = renderMarkdown(acc);
    scrollToBottom();
    await sleep(26);
  }

  history.push({ role: 'assistant', content: [{ type: 'text', text }] });
  trimHistory();
  saveHistory();
  sending = false;
  sendBtn.disabled = false;
}

async function requestReply() {
  sending = true;
  sendBtn.disabled = true;
  const bubble = renderTyping();

  try {
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': getKey(),
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model: getModel(),
        max_tokens: 1200,
        system: SYSTEM_PROMPT,
        stream: true,
        messages: history.map((m) => ({ role: m.role, content: m.content })),
      }),
    });

    if (!res.ok) {
      const errText = await safeError(res);
      bubble.closest('.msg').remove();
      showError(errText);
      sending = false; sendBtn.disabled = false;
      return;
    }

    // Lectura en streaming (SSE)
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let full = '';
    let buffer = '';
    bubble.classList.remove('typing');
    bubble.innerHTML = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop();
      for (const line of lines) {
        if (!line.startsWith('data:')) continue;
        const data = line.slice(5).trim();
        if (!data || data === '[DONE]') continue;
        try {
          const evt = JSON.parse(data);
          if (evt.type === 'content_block_delta' && evt.delta && evt.delta.type === 'text_delta') {
            full += evt.delta.text;
            bubble.innerHTML = renderMarkdown(full);
            scrollToBottom();
          } else if (evt.type === 'error') {
            throw new Error(evt.error ? evt.error.message : 'Error de la API');
          }
        } catch (_) { /* fragmento incompleto, se ignora */ }
      }
    }

    if (!full.trim()) {
      bubble.textContent = 'No he recibido respuesta. Inténtalo de nuevo.';
    } else {
      history.push({ role: 'assistant', content: [{ type: 'text', text: full }] });
      trimHistory();
      saveHistory();
    }
  } catch (err) {
    const msgEl = bubble.closest('.msg');
    if (msgEl) msgEl.remove();
    showError('No se pudo conectar con la IA: ' + (err && err.message ? err.message : err));
  } finally {
    sending = false;
    sendBtn.disabled = false;
    scrollToBottom();
  }
}

async function safeError(res) {
  let detail = '';
  try {
    const j = await res.json();
    detail = j.error && j.error.message ? j.error.message : JSON.stringify(j);
  } catch { detail = res.statusText; }
  if (res.status === 401) return 'Clave de API no válida. Revísala en Ajustes ⚙️.';
  if (res.status === 429) return 'Demasiadas peticiones o crédito agotado. Espera un momento o revisa tu cuenta de Anthropic.';
  if (res.status === 400 && /credit|balance/i.test(detail)) return 'Tu cuenta de Anthropic no tiene crédito disponible.';
  return 'Error ' + res.status + ': ' + detail;
}

// ---------- Imágenes ----------
async function addImage(file) {
  if (!file.type.startsWith('image/')) return;
  try {
    const { dataUrl, media_type, data } = await resizeImage(file);
    pending.push({ dataUrl, media_type, data });
    renderAttachments();
  } catch {
    showError('No se pudo procesar la imagen.');
  }
}

function resizeImage(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        const scale = Math.min(1, MAX_IMAGE_DIM / Math.max(width, height));
        width = Math.round(width * scale);
        height = Math.round(height * scale);
        const canvas = document.createElement('canvas');
        canvas.width = width; canvas.height = height;
        canvas.getContext('2d').drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
        resolve({ dataUrl, media_type: 'image/jpeg', data: dataUrl.split(',')[1] });
      };
      img.onerror = reject;
      img.src = reader.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function renderAttachments() {
  attachmentsEl.innerHTML = '';
  attachmentsEl.hidden = pending.length === 0;
  pending.forEach((img, i) => {
    const el = document.createElement('div');
    el.className = 'attachment';
    el.innerHTML = `<img src="${img.dataUrl}" alt="adjunto" /><button aria-label="Quitar">✕</button>`;
    el.querySelector('button').onclick = () => { pending.splice(i, 1); renderAttachments(); };
    attachmentsEl.appendChild(el);
  });
}

// ---------- Render ----------
function renderMessage(role, content) {
  const msg = document.createElement('div');
  msg.className = 'msg ' + role;
  const avatar = role === 'user' ? '🧑' : '👗';

  let inner = '';
  for (const block of content) {
    if (block.type === 'image') {
      const src = block.source.type === 'base64'
        ? `data:${block.source.media_type};base64,${block.source.data}` : '';
      inner += `<img class="thumb" src="${src}" alt="prenda" />`;
    } else if (block.type === 'text') {
      inner += role === 'user' ? escapeHtml(block.text).replace(/\n/g, '<br>') : renderMarkdown(block.text);
    }
  }
  msg.innerHTML = `<div class="avatar">${avatar}</div><div class="bubble">${inner}</div>`;
  messagesEl.appendChild(msg);
  scrollToBottom();
  return msg.querySelector('.bubble');
}

function renderTyping() {
  const msg = document.createElement('div');
  msg.className = 'msg bot';
  msg.innerHTML = `<div class="avatar">👗</div><div class="bubble typing"><span></span><span></span><span></span></div>`;
  messagesEl.appendChild(msg);
  scrollToBottom();
  return msg.querySelector('.bubble');
}

function renderHistory() {
  history.forEach((m) => renderMessage(m.role, m.content));
}

function renderWelcome() {
  const w = document.createElement('div');
  w.className = 'welcome';
  w.id = 'welcome';
  w.innerHTML = `
    <div style="font-size:44px">👗✨</div>
    <h2>¡Hola! Soy tu asesora de estilo</h2>
    <p>Envíame una <strong>foto de una prenda</strong> 📷 o descríbeme lo que tienes, y te diré cómo combinarla, cuándo llevarla y qué te conviene comprar.</p>
    <p style="margin-top:10px;font-size:13px;opacity:.85">Puedes probar la interfaz ahora mismo en <strong>modo demo</strong> (respuestas de ejemplo). Para activar la IA real, añade tu clave en ⚙️.</p>
    <div class="chips">
      <button class="chip" data-p="Tengo unos vaqueros azules rectos, ¿con qué los combino para ir a la oficina?">👖 Combinar unos vaqueros</button>
      <button class="chip" data-p="¿Qué me pongo para una boda de tarde en verano?">💍 Look para una boda</button>
      <button class="chip" data-p="Quiero crear un fondo de armario básico con poco presupuesto. ¿Por dónde empiezo?">🛍️ Fondo de armario</button>
      <button class="chip" data-p="¿Qué colores me favorecen si tengo la piel clara y el pelo castaño?">🎨 Colores que me favorecen</button>
    </div>`;
  messagesEl.appendChild(w);
  w.querySelectorAll('.chip').forEach((c) => {
    c.onclick = () => { inputEl.value = c.dataset.p; autoGrow(); inputEl.focus(); };
  });
}

function clearWelcome() { const w = $('welcome'); if (w) w.remove(); }

function showError(text) {
  const n = document.createElement('div');
  n.className = 'notice';
  n.innerHTML = escapeHtml(text);
  messagesEl.appendChild(n);
  scrollToBottom();
}

// Markdown ligero (negritas, listas, encabezados, código, saltos)
function renderMarkdown(text) {
  const esc = escapeHtml(text);
  const lines = esc.split('\n');
  let html = '';
  let inList = false, listType = '';
  const closeList = () => { if (inList) { html += `</${listType}>`; inList = false; } };

  for (let raw of lines) {
    let line = raw;
    line = line.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    line = line.replace(/`([^`]+)`/g, '<code>$1</code>');

    const h3 = line.match(/^###?\s+(.*)/);
    const ol = line.match(/^\s*\d+[.)]\s+(.*)/);
    const ul = line.match(/^\s*[-*•]\s+(.*)/);

    if (h3) { closeList(); html += `<h3>${h3[1]}</h3>`; }
    else if (ol) { if (!inList || listType !== 'ol') { closeList(); html += '<ol>'; inList = true; listType = 'ol'; } html += `<li>${ol[1]}</li>`; }
    else if (ul) { if (!inList || listType !== 'ul') { closeList(); html += '<ul>'; inList = true; listType = 'ul'; } html += `<li>${ul[1]}</li>`; }
    else if (line.trim() === '') { closeList(); }
    else { closeList(); html += `<p>${line}</p>`; }
  }
  closeList();
  return html;
}

function escapeHtml(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

// ---------- Ajustes / almacenamiento ----------
function getKey() { return localStorage.getItem(LS_KEY) || ''; }
function getModel() { return localStorage.getItem(LS_MODEL) || 'claude-sonnet-5'; }

function openSettings() {
  $('apiKey').value = getKey();
  $('model').value = getModel();
  $('settingsOverlay').hidden = false;
}
function closeSettings() { $('settingsOverlay').hidden = true; }

function saveSettings() {
  const key = $('apiKey').value.trim();
  if (key) localStorage.setItem(LS_KEY, key); else localStorage.removeItem(LS_KEY);
  localStorage.setItem(LS_MODEL, $('model').value);
  closeSettings();
}

function clearChat() {
  if (!confirm('¿Borrar toda la conversación?')) return;
  history = [];
  saveHistory();
  messagesEl.innerHTML = '';
  renderWelcome();
  closeSettings();
}

function loadHistory() {
  try { return JSON.parse(localStorage.getItem(LS_HISTORY)) || []; }
  catch { return []; }
}
function saveHistory() {
  try { localStorage.setItem(LS_HISTORY, JSON.stringify(history)); } catch {}
}
function trimHistory() {
  if (history.length > MAX_HISTORY) history = history.slice(-MAX_HISTORY);
}

// ---------- Utilidades ----------
function autoGrow() {
  inputEl.style.height = 'auto';
  inputEl.style.height = Math.min(inputEl.scrollHeight, 140) + 'px';
}
function scrollToBottom() { messagesEl.scrollTop = messagesEl.scrollHeight; }
function isMobile() { return /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent); }
