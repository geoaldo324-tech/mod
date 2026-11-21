import './style.css';
import { World } from './world.js';
import { INTENTS, isExample, predict, train } from './brain.js';
import { actionFor, appendActivity, decodeAsset, encodeAsset, isStopOrder, MAX_ASSET_BYTES,
  newProject, orderFor, validateProject } from './project.js';

const glyphs = {
  grid: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
  cube: '<path d="M12 3 3.5 7.5v9L12 21l8.5-4.5v-9L12 3Z M3.5 7.5 12 12l8.5-4.5M12 12v9"/>',
  brain: '<path d="M12 17h.01M7 6a3 3 0 0 1 5-2 3 3 0 0 1 5 2 4 4 0 0 1 2 7 4 4 0 0 1-3 6 3 3 0 0 1-4 1 3 3 0 0 1-4-1 4 4 0 0 1-3-6 4 4 0 0 1 2-7ZM12 4v16m-5-9 2 2m8-2-2 2"/>',
  book: '<path d="M5 4h14v16H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Zm0 12h14M7 8h7m-7 4h5"/>',
  logo: '<path fill="#b9a8ff" stroke="none" d="M5 4h6v7H4V5a1 1 0 0 1 1-1Zm8 0h6a1 1 0 0 1 1 1v6h-7Zm-9 9h7v7H5a1 1 0 0 1-1-1Zm9 0h7v6a1 1 0 0 1-1 1h-6Z"/><path fill="#f1ecff" stroke="none" d="M13 4h6a1 1 0 0 1 1 1v6h-7Z"/>',
  play: '<path fill="currentColor" d="m9 5 11 7-11 7V5Z"/>',
  stop: '<rect x="6" y="6" width="12" height="12" rx="2" fill="currentColor"/>',
  save: '<path d="M5 3h12l4 4v14H3V3h2Zm2 0v6h9V3M7 21v-7h10v7"/>',
  robot: '<rect x="4" y="7" width="16" height="12" rx="4"/><path d="M12 7V4m-2 0h4M8 13h.01M16 13h.01M10 16h4"/>',
  desk: '<path d="M3 8h18v4H3zm2 4v7m14-7v7M5 16h14"/>',
  upload: '<path d="M12 15V4m-4 4 4-4 4 4M4 15v5h16v-5"/>',
  download: '<path d="M12 4v11m-4-4 4 4 4-4M4 16v4h16v-4"/>',
  arrow: '<path d="M5 12h14m-6-6 6 6-6 6"/>',
  send: '<path d="M12 20V4m-6 6 6-6 6 6"/>',
  reset: '<path d="M4 11a8 8 0 1 1 2 6M4 11V5m0 6h6"/>',
  focus: '<path d="M8 4H4v4m12-4h4v4m0 8v4h-4m-8 0H4v-4"/><circle cx="12" cy="12" r="2"/>',
  chevron: '<path d="m9 18 6-6-6-6"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  close: '<path d="m6 6 12 12M6 18 18 6"/>',
  spark: '<path d="M12 2l2.5 7.5L22 12l-7.5 2.5L12 22l-2.5-7.5L2 12l7.5-2.5L12 2Z"/>',
  clock: '<circle cx="12" cy="12" r="8"/><path d="M12 7v5l3 2"/>',
  sound: '<path d="M3 9h4l5-4v14l-5-4H3V9Zm13-1a5 5 0 0 1 0 8m3-11a9 9 0 0 1 0 14"/>',
};
const icon = (key, cls = '') => `<svg class="${cls}" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${glyphs[key]}</svg>`;
const nav = [['home', 'Inicio', 'grid'], ['scene', 'Escena', 'cube'], ['brain', 'IA', 'brain'], ['journal', 'Diario', 'book']];
const intents = Object.entries(INTENTS).map(([key, label]) => `<option value="${key}">${label}</option>`).join('');
const $ = (selector) => document.querySelector(selector);

$('#app').innerHTML = `
  <header class="appbar">
    <a class="brand" href="#inicio" id="brand" aria-label="Mosaico Studio, inicio"><span class="brand-mark"><img src="/mosaico.svg" alt="" width="35" height="35"></span><span>Mosaico<span class="brand-light"> Studio</span></span></a>
    <nav class="top-nav" aria-label="Áreas de trabajo">${nav.map(([id, label, glyph]) => `<button type="button" data-view="${id}">${icon(glyph)}<span>${label}</span></button>`).join('')}</nav>
    <div class="app-actions">
      <button type="button" class="button quiet" id="save" aria-label="Guardar proyecto">${icon('save')}<span>Guardar</span></button>
      <button type="button" class="button primary" id="toggle-run">${icon('play')}<span>Ejecutar</span></button>
    </div>
  </header>
  <main>
    <div id="home" class="page wide-page" hidden>
      <header class="page-heading"><p class="eyebrow">TU ESPACIO DE TRABAJO</p><h1>Proyectos</h1><p>Abre tu proyecto, continúa probando tu agente o importa un archivo de Mosaico.</p></header>
      <div class="home-grid">
        <section class="card project-card"><div class="project-art">${icon('cube')}</div><div class="card-content"><p class="eyebrow">PROYECTO ACTUAL</p><h2 id="home-name"></h2><p>Escena de laboratorio, agente y diario de pruebas.</p><button class="button primary" type="button" id="open-scene">Abrir escena ${icon('arrow')}</button> <button class="button quiet boxed" type="button" id="new-project">${icon('plus')} Nuevo proyecto</button></div></section>
        <section class="card card-content file-card"><p class="eyebrow">ARCHIVOS DEL PROYECTO</p><h2>Importar o exportar</h2><p>Un archivo .mosaico conserva el cerebro, la escena, el modelo importado y el diario.</p><div class="button-row"><button type="button" class="button secondary" id="open-project">${icon('upload')} Abrir archivo</button><button type="button" class="button quiet boxed" id="export-project">${icon('download')} Exportar</button></div><label class="field project-name">Nombre del proyecto<input id="project-name" maxlength="80"></label></section>
      </div>
    </div>
    <div id="scene" class="page scene-page">
      <aside class="scene-sidebar" aria-label="Jerarquía de escena">
        <div class="panel-bar"><span>Jerarquía</span><span class="panel-caption">ESCENA</span></div>
        <div class="tree-root">${icon('chevron', 'tree-open')}${icon('cube')}<span id="scene-name"></span></div>
        <div class="scene-tree">
          <button type="button" data-object="lola">${icon('robot')} Lola <span>IA</span></button>
          <button type="button" data-object="desk">${icon('desk')} Mesa de trabajo</button>
          <button type="button" data-object="box">${icon('cube')} Caja azul</button>
          <button type="button" data-object="asset" id="asset-row" hidden>${icon('cube')} <span id="asset-name"></span></button>
        </div>
        <div class="inspector"><div class="panel-bar"><span>Inspector</span>${icon('focus')}</div><div id="object-info" class="object-info"></div></div>
        <div class="sidebar-footer">
          <button type="button" class="button secondary import-button" id="pick-asset">${icon('upload')} Importar modelo</button>
          <p>Archivo GLB · hasta 12 MB</p>
        </div>
      </aside>
      <section class="scene-main" aria-label="Simulador">
        <div class="workspace-bar">
          <div class="workspace-label">${icon('cube')}<span>Escena</span><span class="workspace-divider">/</span><span id="workspace-name"></span></div>
          <div class="workspace-actions"><span class="workspace-mode">Vista 3D</span>
            <button type="button" class="icon-button" id="center-camera" title="Centrar cámara" aria-label="Centrar cámara">${icon('focus')}</button>
            <button type="button" class="icon-button" id="reset-scene" title="Reiniciar escena" aria-label="Reiniciar escena">${icon('reset')}</button>
          </div>
        </div>
        <div class="viewport" id="drop-zone">
          <div class="world" id="world"></div>
          <div class="viewport-top">
            <div class="location">${icon('cube')} <span>Laboratorio 3D</span></div>
            <div class="run-badge" id="run-badge"><i></i><span>En espera</span></div>
          </div>
          <div id="world-error" class="world-error" hidden>La vista 3D necesita WebGL. El taller de IA sigue disponible.</div>
          <div class="viewport-bottom">
            <span class="view-tip"><kbd>Arrastra</kbd> para orbitar <span>·</span> <kbd>Rueda</kbd> para acercar</span>

          </div>
          <div class="drop-overlay" id="drop-overlay" hidden>${icon('upload')} Suelta el archivo GLB</div>
        </div>
      </section>
      <aside class="assistant" aria-label="Conversación con Lola">
        <div class="panel-bar assistant-panel-bar"><span>Consola de agente</span><span class="panel-caption">LOLA</span></div>
        <div class="assistant-header">
          <div class="avatar">${icon('robot')}</div><div><h2>Lola</h2><p id="assistant-model">Modelo de referencia</p></div>
          <button class="icon-button" id="speak" type="button" aria-label="Leer última respuesta" title="Leer última respuesta">${icon('sound')}</button>
        </div>
        <div class="chat-mode-indicator" id="chat-mode-indicator"></div>
        <div class="chat" id="chat" role="log" aria-label="Mensajes de Lola"></div>
        <div class="assistant-bottom">
          <div class="suggestions" aria-label="Órdenes de ejemplo">
            <button type="button" data-order="Lleva la caja azul a la mesa">${icon('cube')} Llevar la caja</button>
            <button type="button" data-order="Ve a la mesa">${icon('arrow')} Ir a la mesa</button>
          </div>
          <form id="chat-form" class="composer">
            <label class="sr-only" for="chat-input">Escribe una orden</label><input id="chat-input" maxlength="220" placeholder="Escribe una orden…" required>
            <button type="submit" class="send" aria-label="Enviar orden">${icon('send')}</button>
          </form>
        </div>
      </aside>
    </div>
    <div id="brain" class="page wide-page" hidden>
      <header class="page-heading"><p class="eyebrow">UNIVERSAL AI ENGINE</p><h1>Estudio de IA</h1><p>Configura a Lola, conecta un cerebro local y entrena acciones para la escena.</p></header>
      <div class="brain-grid conversation-grid">
        <section class="card card-content">
          <div class="card-heading"><div><h2>Cerebro de conversación</h2><p>Conecta un modelo instalado en Ollama, en este equipo.</p></div>${icon('brain')}</div>
          <label class="field">Modelo local<select id="chat-model"><option value="">Buscar modelos disponibles</option></select></label>
          <div class="button-row"><button type="button" class="button secondary" id="refresh-models">${icon('reset')} Buscar modelos</button><button type="button" class="button primary" id="chat-mode">Usar para conversar</button></div>
          <p id="chat-model-status" class="inline-status" role="status">Inicia Ollama e instala un modelo para conectarlo.</p>
        </section>
        <section class="card card-content">
          <div class="card-heading"><div><h2>Identidad y memoria</h2><p>Se guardan con el proyecto y se envían al modelo local al conversar.</p></div>${icon('book')}</div>
          <label class="field">Personalidad<textarea id="personality" maxlength="3000" rows="3"></textarea></label>
          <label class="field">Recuerdos<textarea id="memory" maxlength="4000" rows="3" placeholder="Escribe lo que Lola debe recordar…"></textarea></label>
        </section>
      </div>
      <div class="section-heading"><p class="eyebrow">SIMULADOR 3D</p><h2>Entrena acciones</h2><p>Enseña frases para las acciones disponibles en la escena.</p></div>
      <div class="brain-grid">
        <section class="card card-content">
          <label class="field">Nombre del cerebro<input id="brain-name" maxlength="60"></label>
          <div class="card-heading"><div><h2>Ejemplos de entrenamiento</h2><p>Agrega al menos dos por acción que quieras enseñar.</p></div><span class="count" id="example-count"></span></div>
          <div class="examples" id="examples"></div>
          <form id="example-form" class="example-form"><label class="sr-only" for="example-input">Frase de ejemplo</label><input id="example-input" required minlength="3" maxlength="140" placeholder="Escribe una frase de ejemplo…"><label class="sr-only" for="intent">Acción</label><select id="intent">${intents}</select><button class="button secondary" type="submit">${icon('plus')} Agregar</button></form>
          <div class="button-row"><button type="button" class="button primary" id="train">${icon('spark')} Entrenar</button><button type="button" class="button quiet boxed" id="toggle-brain">Usar con Lola</button></div>
          <p id="training-status" class="inline-status" role="status"></p>
        </section>
        <section class="card card-content probe"><div class="probe-icon">${icon('brain')}</div><h2>Probar una orden</h2><p>Usa una frase que no agregaste al entrenamiento para ver si el cerebro reconoce la acción.</p>
          <form id="probe-form"><label class="field">Frase de prueba<input id="probe-input" maxlength="220" placeholder="Ej. Acércate a la mesa" required></label><button type="submit" class="button secondary" id="probe-submit">Probar ${icon('arrow')}</button></form>
          <p class="probe-result" id="probe-result" role="status">Entrena el cerebro para probarlo.</p>
        </section>
      </div>
    </div>
    <div id="journal" class="page wide-page" hidden>
      <header class="page-heading"><p class="eyebrow">HISTORIAL DEL PROYECTO</p><h1>Diario</h1><p>Anota lo que aprendes y revisa qué órdenes ejecutó la IA.</p></header>
      <div class="journal-grid">
        <section class="card card-content"><div class="card-heading"><div><h2>Mis notas</h2><p>Ideas y observaciones sobre esta prueba.</p></div>${icon('book')}</div>
          <label class="sr-only" for="notes">Notas del diario</label><textarea id="notes" placeholder="Empieza a escribir aquí…" maxlength="20000"></textarea><button type="button" class="button quiet boxed" id="export-notes">${icon('download')} Exportar notas</button>
        </section>
        <section class="card card-content"><div class="card-heading"><div><h2>Actividad</h2><p>Órdenes, resultados y cambios del proyecto.</p></div>${icon('clock')}</div><ol class="timeline" id="activity"></ol></section>
      </div>
    </div>
  </main>
  <footer class="statusbar"><span><i></i> Entorno local</span><span id="footer-status" role="status">Abriendo proyecto…</span><span class="version">Mosaico Studio · 0.1</span></footer>
  <input type="file" id="asset-input" accept=".glb,model/gltf-binary" hidden>
  <input type="file" id="project-input" accept=".mosaico,application/json" hidden>
  <div class="toast" id="toast" hidden role="status"></div>
`;

let project = newProject();
let world;
let model;
let currentView = 'scene';
let selected = 'lola';
let running = false;
let pending = false;
let lastReply = '';
let revision = 0;
let savedRevision = 0;
let working = false;
let toastTimeout;
let availableModels = [];
let chatSending = false;
const footer = $('#footer-status');
try {
  world = new World($('#world'));
  world.visible = true;
  world.renderState(project.scene);
} catch {
  $('#world-error').hidden = false;
  $('#center-camera').disabled = true;
}
if (!('speechSynthesis' in window)) $('#speak').hidden = true;

function notify(message) {
  const box = $('#toast');
  box.textContent = message;
  box.hidden = false;
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => { box.hidden = true; }, 3400);
}

function edited() {
  revision++;
  footer.textContent = 'Cambios sin guardar';
}

function activity(kind, text) {
  appendActivity(project, kind, text);
  edited();
  if (currentView === 'journal') renderActivity();
}

function setBusy(value) {
  working = value;
  $('#save').disabled = value;
  $('#open-project').disabled = value;
  $('#new-project').disabled = value;
  $('#pick-asset').disabled = value;
  $('#export-project').disabled = value;
  $('#chat-model').disabled = value;
  $('#refresh-models').disabled = value;
  $('#chat-mode').disabled = value || !project.profile.model;
  $('#chat-form button').disabled = value;
  $('#chat-input').disabled = value;
}

function renderRun() {
  $('#toggle-run').innerHTML = running ? `${icon('stop')}<span>Detener</span>` : `${icon('play')}<span>Ejecutar</span>`;
  $('#toggle-run').classList.toggle('run-active', running);
  $('#run-badge').classList.toggle('live', running);
  $('#run-badge span').textContent = pending ? 'Ejecutando orden' : running ? 'En ejecución' : 'En espera';
}

function changeView(view) {
  currentView = view;
  for (const [id] of nav) {
    document.getElementById(id).hidden = id !== view;
    const navItem = document.querySelector(`[data-view="${id}"]`);
    if (id === view) navItem.setAttribute('aria-current', 'page');
    else navItem.removeAttribute('aria-current');
  }
  if (world) {
    world.visible = view === 'scene';
    if (world.visible) world.resize();
  }
  if (view === 'journal') renderActivity();
  if (view === 'brain') { renderBrain(); renderProfile(); }
}

function setSelected(id) {
  selected = id;
  for (const button of document.querySelectorAll('[data-object]')) {
    button.classList.toggle('selected', button.dataset.object === id);
    button.setAttribute('aria-pressed', String(button.dataset.object === id));
  }
  const options = {
    lola: ['Agente', 'Lola', project.profile.mode === 'chat' ? project.profile.model : project.brain.active ? project.brain.name : 'Modelo de referencia'],
    desk: ['Destino', 'Mesa de trabajo', 'Punto de llegada de la caja.'],
    box: ['Objeto manipulable', 'Caja azul', project.scene.box === 'desk' ? 'Sobre la mesa de trabajo.' : 'En su posición de inicio.'],
    asset: ['Recurso importado', project.asset?.name ?? '', 'Modelo visual de la escena.'],
  };
  const [type, name, description] = options[id];
  const content = $('#object-info');
  const label = document.createElement('p');
  label.className = 'eyebrow';
  label.textContent = type;
  const title = document.createElement('strong');
  title.textContent = name;
  const subtitle = document.createElement('p');
  subtitle.textContent = description;
  content.replaceChildren(label, title, subtitle);
  if (id === 'asset' && project.asset) {
    const remove = document.createElement('button');
    remove.className = 'button quiet';
    remove.textContent = 'Quitar modelo';
    remove.disabled = working;
    remove.addEventListener('click', () => {
      if (working) return;
      world?.clearAsset();
      project.asset = null;
      activity('note', 'Se quitó el modelo importado.');
      selected = 'lola';
      renderNames();
    });
    content.append(remove);
  }
}

function renderNames() {
  $('#home-name').textContent = project.name;
  $('#scene-name').textContent = project.name;
  $('#workspace-name').textContent = project.name;
  $('#project-name').value = project.name;
  $('#asset-name').textContent = project.asset?.name ?? '';
  $('#asset-row').hidden = !project.asset;
  $('#assistant-model').textContent = project.profile.mode === 'chat' ? project.profile.model : project.brain.active ? project.brain.name : 'Modelo de referencia';
  $('#chat-mode-indicator').textContent = project.profile.mode === 'chat' ? 'Conversación · modelo local' : 'Órdenes de la escena';
  $('.suggestions').hidden = project.profile.mode === 'chat';
  $('#chat-input').placeholder = project.profile.mode === 'chat' ? 'Escribe un mensaje…' : 'Escribe una orden…';
  setSelected(selected === 'asset' && !project.asset ? 'lola' : selected);
}

function message(author, text) {
  const item = document.createElement('div');
  item.className = author === 'Lola' ? 'message' : 'message user-message';
  const heading = document.createElement('span');
  heading.textContent = author;
  const copy = document.createElement('p');
  copy.textContent = text;
  item.append(heading, copy);
  $('#chat').append(item);
  if ($('#chat').childElementCount > 80) $('#chat').firstElementChild.remove();
  $('#chat').scrollTop = $('#chat').scrollHeight;
  if (author === 'Lola') lastReply = text;
}

function stopRun(log = true) {
  if (pending) {
    // Cancel the in-flight order and restore the most recent completed scene state.
    pending = false;
    world?.renderState(project.scene);
    if (log) activity('action', 'Se canceló la orden. La escena volvió al último estado completado.');
  }
  running = false;
  renderRun();
}

async function sendChat(text) {
  if (chatSending) return;
  if (!project.profile.model) {
    notify('Selecciona un modelo local en IA.');
    return;
  }
  chatSending = true;
  setBusy(true);
  const profile = project.profile;
  const history = [...profile.messages, { role: 'user', content: text }].slice(-19);
  const system = `Personalidad: ${profile.personality || 'Eres Lola, una asistente.'}\nRecuerdos proporcionados por el usuario: ${profile.memory || '(sin recuerdos guardados)'}`;
  message('Tú', text);
  try {
    const response = await fetch('/api/core/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Mosaico-Client': 'studio' },
      body: JSON.stringify({ model: profile.model, messages: [{ role: 'system', content: system }, ...history] }),
    });
    const data = await response.json();
    if (!response.ok || typeof data.reply !== 'string' || !data.reply.trim()) {
      throw new Error(data.error || 'No se pudo obtener una respuesta.');
    }
    profile.messages = [...history, { role: 'assistant', content: data.reply.slice(0, 2000) }].slice(-20);
    activity('note', `Conversación con ${profile.model}.`);
    message('Lola', data.reply);
  } catch (error) {
    message('Lola', error.message || 'No se pudo conectar al modelo.');
    $('#chat-input').value = text;
  } finally {
    chatSending = false;
    setBusy(false);
  }
}

function renderProfile() {
  const profile = project.profile;
  $('#personality').value = profile.personality;
  $('#memory').value = profile.memory;
  const select = $('#chat-model');
  select.replaceChildren(new Option('Selecciona un modelo', ''));
  if (profile.model && !availableModels.includes(profile.model)) {
    select.add(new Option(`${profile.model} (guardado)`, profile.model));
  }
  for (const name of availableModels) select.add(new Option(name, name));
  select.value = profile.model;
  $('#chat-mode').disabled = working || !profile.model;
  $('#chat-mode').textContent = profile.mode === 'chat' ? 'Volver a órdenes 3D' : 'Usar para conversar';
}

async function refreshModels() {
  $('#refresh-models').disabled = true;
  try {
    const response = await fetch('/api/core/models', { cache: 'no-store' });
    const result = await response.json();
    if (!response.ok || !Array.isArray(result.models)) throw new Error(result.error || 'No se pudieron buscar modelos.');
    availableModels = result.models;
    $('#chat-model-status').textContent = availableModels.length
      ? `${availableModels.length} modelo(s) disponibles en este equipo.`
      : 'Ollama está conectado, pero todavía no tiene modelos instalados.';
    renderProfile();
  } catch (error) {
    availableModels = [];
    $('#chat-model-status').textContent = `${error.message} Inicia Ollama e instala un modelo.`;
    renderProfile();
  } finally {
    $('#refresh-models').disabled = working;
  }
}

function renderChatHistory() {
  $('#chat').replaceChildren();
  if (project.profile.mode === 'chat') {
    if (!project.profile.messages.length) message('Lola', 'Hola. Puedes escribirme para iniciar una conversación.');
    for (const entry of project.profile.messages) message(entry.role === 'user' ? 'Tú' : 'Lola', entry.content);
  } else {
    message('Lola', 'Prueba una orden de la escena o ve a IA para cambiar de cerebro.');
  }
}

function sendOrder(input) {
  const text = input.trim().slice(0, 220);
  if (!text) return;
  if (project.profile.mode === 'chat') {
    sendChat(text);
    return;
  }
  message('Tú', text);
  activity('order', text);
  if (isStopOrder(text)) {
    stopRun();
    message('Lola', 'Prueba detenida.');
    activity('action', 'Prueba detenida por el usuario.');
    return;
  }
  if (pending) {
    message('Lola', 'Ya estoy ejecutando una orden. Puedes escribir «para» para cancelarla.');
    return;
  }
  running = true;
  const prediction = project.brain.active ? predict(model, text) : null;
  const plan = project.brain.active
    ? prediction ? actionFor(prediction.intent, project.scene)
      : { type: 'reply', reply: 'Mi modelo no reconoce esa orden. Prueba otra frase o agrega un ejemplo en IA.' }
    : orderFor(text, project.scene);
  if (plan.type !== 'move') {
    message('Lola', plan.reply);
    activity('action', plan.reply);
    renderRun();
    return;
  }
  if (!world) {
    message('Lola', 'La acción necesita la vista 3D.');
    renderRun();
    return;
  }
  pending = true;
  activity('action', `Inició: ${plan.label}.`);
  renderRun();
  world.play(plan, () => {
    project.scene = plan.result;
    pending = false;
    activity('action', plan.reply);
    message('Lola', plan.reply);
    setSelected(selected);
    renderRun();
  });
}

function renderActivity() {
  const list = $('#activity');
  list.replaceChildren();
  if (!project.activity.length) {
    const empty = document.createElement('li');
    empty.className = 'empty';
    empty.textContent = 'Aquí aparecerá la actividad cuando hagas una prueba.';
    list.append(empty);
  }
  for (const entry of [...project.activity].reverse()) {
    const item = document.createElement('li');
    const heading = document.createElement('div');
    const label = document.createElement('strong');
    label.textContent = { order: 'Orden', action: 'Simulación', note: 'Proyecto' }[entry.kind];
    const time = document.createElement('time');
    time.dateTime = new Date(entry.time).toISOString();
    time.textContent = new Intl.DateTimeFormat('es', { dateStyle: 'short', timeStyle: 'short' }).format(entry.time);
    heading.append(label, time);
    const text = document.createElement('p');
    text.textContent = entry.text;
    item.append(heading, text);
    list.append(item);
  }
}

function renderBrain() {
  const { brain } = project;
  $('#brain-name').value = brain.name;
  $('#example-count').textContent = `${brain.examples.length} ejemplos`;
  const list = $('#examples');
  list.replaceChildren();
  brain.examples.forEach(({ text, intent }, index) => {
    const row = document.createElement('div');
    row.className = 'example';
    const phrase = document.createElement('span');
    phrase.textContent = text;
    const tag = document.createElement('small');
    tag.textContent = INTENTS[intent];
    const remove = document.createElement('button');
    remove.className = 'icon-button';
    remove.innerHTML = icon('close');
    remove.setAttribute('aria-label', `Quitar ejemplo: ${text}`);
    remove.addEventListener('click', () => {
      brain.examples.splice(index, 1);
      edited();
      renderBrain();
    });
    row.append(phrase, tag, remove);
    list.append(row);
  });
  $('#toggle-brain').disabled = !model;
  $('#toggle-brain').textContent = brain.active ? 'Volver al modelo de referencia' : 'Usar con Lola';
  $('#probe-submit').disabled = !model;
  const stale = model && JSON.stringify(brain.examples) !== JSON.stringify(brain.trained);
  $('#training-status').textContent = !model ? 'Aún no entrenado · ejemplos iniciales incluidos.'
    : stale ? 'Cambiaste los ejemplos. Vuelve a entrenar para aplicar los cambios.'
      : brain.active ? 'Modelo entrenado y conectado a Lola.' : 'Modelo entrenado y listo para probar.';
}

async function applyProject(next) {
  validateProject(next);
  if (next.asset) {
    if (!world) throw new Error('Activa la vista 3D para abrir un proyecto con un modelo.');
    await world.importAsset(decodeAsset(next.asset.data));
  } else {
    world?.clearAsset();
  }
  stopRun(false);
  project = next;
  model = project.brain.trained ? train(project.brain.trained) : undefined;
  world?.renderState(project.scene);
  $('#notes').value = project.notes;
  $('#probe-result').textContent = model ? 'Modelo listo. Escribe una orden para probarlo.' : 'Entrena el cerebro para probarlo.';
  renderChatHistory();
  renderNames();
  renderBrain();
  renderProfile();
  renderActivity();
}

async function loadProject() {
  setBusy(true);
  try {
    const response = await fetch('/api/project', { cache: 'no-store' });
    if (!response.ok) throw new Error();
    const data = await response.json();
    if (data) await applyProject(data);
    footer.textContent = data ? 'Proyecto guardado' : 'Proyecto de ejemplo';
  } catch {
    footer.textContent = 'No se pudo abrir el proyecto guardado';
    notify('Puedes abrir un archivo .mosaico desde Inicio.');
  } finally {
    setBusy(false);
  }
}

async function saveProject() {
  if (working) return;
  setBusy(true);
  const currentRevision = revision;
  try {
    const response = await fetch('/api/project', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'X-Mosaico-Client': 'studio' },
      body: JSON.stringify(project),
    });
    if (!response.ok) throw new Error();
    savedRevision = currentRevision;
    footer.textContent = revision === savedRevision ? 'Proyecto guardado' : 'Cambios sin guardar';
    notify('Proyecto guardado.');
  } catch {
    notify('No se pudo guardar. Puedes exportar una copia desde Inicio.');
  } finally {
    setBusy(false);
  }
}

function download(name, content, type) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

async function importAsset(file) {
  if (!file || working) return;
  if (!world) { notify('Activa la vista 3D para importar un modelo.'); return; }
  if (!file.name.toLowerCase().endsWith('.glb') || file.size > MAX_ASSET_BYTES) {
    notify('Selecciona un GLB de hasta 12 MB.');
    return;
  }
  setBusy(true);
  try {
    const asset = await encodeAsset(file);
    await world.importAsset(await file.arrayBuffer());
    project.asset = asset;
    activity('note', `Se importó ${asset.name}.`);
    selected = 'asset';
    renderNames();
    notify('Modelo importado.');
  } catch {
    notify('No se pudo importar. Usa un GLB válido con sus recursos incluidos.');
  } finally {
    setBusy(false);
    setSelected(selected);
  }
}

for (const button of document.querySelectorAll('[data-view]')) {
  button.addEventListener('click', () => changeView(button.dataset.view));
}
for (const button of document.querySelectorAll('[data-object]')) {
  button.addEventListener('click', () => setSelected(button.dataset.object));
}
for (const button of document.querySelectorAll('[data-order]')) {
  button.addEventListener('click', () => sendOrder(button.dataset.order));
}
$('#brand').addEventListener('click', (event) => { event.preventDefault(); changeView('home'); });
$('#open-scene').addEventListener('click', () => changeView('scene'));
$('#save').addEventListener('click', saveProject);
$('#toggle-run').addEventListener('click', () => {
  if (running) stopRun();
  else {
    changeView('scene');
    running = true;
    renderRun();
    $('#chat-input').focus();
  }
});
$('#chat-form').addEventListener('submit', (event) => {
  event.preventDefault();
  sendOrder($('#chat-input').value);
  $('#chat-input').value = '';
});
$('#speak').addEventListener('click', () => {
  const utterance = new SpeechSynthesisUtterance(lastReply);
  utterance.lang = 'es';
  speechSynthesis.cancel();
  speechSynthesis.speak(utterance);
});
$('#center-camera').addEventListener('click', () => world?.homeCamera());
$('#reset-scene').addEventListener('click', () => {
  stopRun(false);
  project.scene = newProject().scene;
  world?.renderState(project.scene);
  activity('action', 'Escena reiniciada.');
  setSelected(selected);
  notify('Escena reiniciada.');
});
$('#notes').addEventListener('input', (event) => { project.notes = event.target.value; edited(); });
$('#project-name').addEventListener('change', (event) => {
  project.name = event.target.value.trim() || project.name;
  renderNames();
  edited();
});
$('#refresh-models').addEventListener('click', refreshModels);
$('#chat-model').addEventListener('change', (event) => {
  project.profile.model = event.target.value;
  if (!project.profile.model && project.profile.mode === 'chat') {
    project.profile.mode = 'scene';
    renderChatHistory();
  }
  edited();
  renderProfile();
  renderNames();
});
$('#chat-mode').addEventListener('click', () => {
  if (!project.profile.model || chatSending) return;
  stopRun();
  project.profile.mode = project.profile.mode === 'chat' ? 'scene' : 'chat';
  edited();
  renderProfile();
  renderNames();
  renderChatHistory();
});
for (const id of ['personality', 'memory']) {
  document.getElementById(id).addEventListener('input', (event) => {
    project.profile[id] = event.target.value;
    edited();
  });
}
$('#brain-name').addEventListener('change', (event) => {
  project.brain.name = event.target.value.trim() || project.brain.name;
  renderBrain();
  renderNames();
  edited();
});
$('#example-form').addEventListener('submit', (event) => {
  event.preventDefault();
  const text = $('#example-input').value.trim();
  const example = { text, intent: $('#intent').value };
  if (!isExample(example)) { notify('Escribe una frase de al menos tres caracteres.'); return; }
  if (project.brain.examples.length >= 60) { notify('El cerebro admite hasta 60 ejemplos.'); return; }
  project.brain.examples.push(example);
  $('#example-input').value = '';
  edited();
  renderBrain();
});
$('#train').addEventListener('click', () => {
  try {
    const samples = project.brain.examples.map((example) => ({ ...example }));
    const trained = train(samples);
    model = trained;
    project.brain.trained = samples;
    activity('note', `Se entrenó ${project.brain.name} con ${samples.length} ejemplos.`);
    $('#probe-result').textContent = 'Entrenamiento terminado. Escribe una orden para probar el modelo.';
    renderBrain();
  } catch (error) {
    $('#training-status').textContent = error.message;
  }
});
$('#toggle-brain').addEventListener('click', () => {
  project.brain.active = !project.brain.active;
  activity('note', project.brain.active ? `Lola usa ${project.brain.name}.` : 'Lola volvió al modelo de referencia.');
  renderNames();
  renderBrain();
});
$('#probe-form').addEventListener('submit', (event) => {
  event.preventDefault();
  if (!model) return;
  const prediction = predict(model, $('#probe-input').value);
  $('#probe-result').textContent = prediction
    ? `Acción detectada: ${INTENTS[prediction.intent]} · puntuación: ${Math.round(prediction.confidence * 100)} %`
    : 'El cerebro no encontró una acción con suficiente puntuación.';
});
$('#pick-asset').addEventListener('click', () => $('#asset-input').click());
$('#asset-input').addEventListener('change', (event) => {
  importAsset(event.target.files[0]);
  event.target.value = '';
});
const dropZone = $('#drop-zone');
dropZone.addEventListener('dragover', (event) => {
  if (!event.dataTransfer.types.includes('Files')) return;
  event.preventDefault();
  $('#drop-overlay').hidden = false;
});
dropZone.addEventListener('dragleave', (event) => {
  if (!dropZone.contains(event.relatedTarget)) $('#drop-overlay').hidden = true;
});
dropZone.addEventListener('drop', (event) => {
  event.preventDefault();
  $('#drop-overlay').hidden = true;
  importAsset(event.dataTransfer.files[0]);
});
function canReplaceProject() {
  return revision === savedRevision || confirm('Cambiar de proyecto reemplazará tus cambios sin guardar. ¿Continuar?');
}
$('#new-project').addEventListener('click', async () => {
  if (working || !canReplaceProject()) return;
  const next = newProject();
  next.name = 'Proyecto nuevo';
  await applyProject(next);
  edited();
  changeView('brain');
});
$('#open-project').addEventListener('click', () => {
  if (!canReplaceProject()) return;
  $('#project-input').click();
});
$('#project-input').addEventListener('change', async (event) => {
  const file = event.target.files[0];
  event.target.value = '';
  if (!file || working) return;
  if (file.size > 17 * 1024 * 1024) { notify('El archivo de proyecto es demasiado grande.'); return; }
  setBusy(true);
  try {
    await applyProject(JSON.parse(await file.text()));
    edited();
    changeView('scene');
    notify('Proyecto abierto. Guarda para conservarlo en este equipo.');
  } catch {
    notify('No se pudo abrir. Usa un archivo .mosaico válido.');
  } finally {
    setBusy(false);
    setSelected(selected);
  }
});
$('#export-project').addEventListener('click', () => download('proyecto.mosaico', JSON.stringify(project), 'application/json'));
$('#export-notes').addEventListener('click', () => download('diario.md', project.notes, 'text/markdown'));
window.addEventListener('keydown', (event) => {
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
    event.preventDefault();
    saveProject();
  }
});

renderNames();
renderRun();
changeView('scene');
message('Lola', 'Hola, soy Lola. Prueba una orden o ve a IA para entrenar mi cerebro.');
loadProject();
