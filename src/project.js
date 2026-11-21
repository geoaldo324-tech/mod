import { isExampleList, STARTER, train } from './brain.js';

export const MAX_ASSET_BYTES = 12 * 1024 * 1024;
export const HOME = [0.15, 1.55];
export const DESK_APPROACH = [1.9, -0.9];
export const BOX_START = [-1.45, 0.35];
export const BOX_DESK = [2.6, -1.63];

export function newProfile() {
  return {
    personality: 'Eres Lola, una asistente amable y curiosa. Responde en español.',
    memory: '',
    model: '',
    mode: 'scene',
    messages: [],
  };
}

export function newProject() {
  return {
    version: 1,
    name: 'Taller de Lola',
    scene: { lola: [...HOME], box: 'floor' },
    notes: '',
    activity: [],
    asset: null,
    profile: newProfile(),
    brain: { name: 'Cerebro de Lola', examples: STARTER.map((example) => ({ ...example })), trained: null, active: false },
  };
}

const isPoint = (value) => Array.isArray(value)
  && value.length === 2
  && value.every((n) => typeof n === 'number' && Number.isFinite(n) && Math.abs(n) <= 8);

export function validateProject(value) {
  // The original v1 projects predate conversational profiles.
  if (value && typeof value === 'object' && value.profile === undefined) value.profile = newProfile();
  const profile = value?.profile;
  if (!profile || typeof profile.personality !== 'string' || profile.personality.length > 3000
    || typeof profile.memory !== 'string' || profile.memory.length > 4000
    || typeof profile.model !== 'string' || profile.model.length > 120
    || !['scene', 'chat'].includes(profile.mode) || (profile.mode === 'chat' && !profile.model.trim())
    || !Array.isArray(profile.messages) || profile.messages.length > 20
    || !profile.messages.every((message) => message && ['user', 'assistant'].includes(message.role)
      && typeof message.content === 'string' && message.content.length > 0 && message.content.length <= 2000)) {
    throw new Error('El perfil de conversación no tiene un formato válido.');
  }
  if (!value || value.version !== 1 || typeof value.name !== 'string'
    || !value.name.trim() || value.name.length > 80
    || typeof value.notes !== 'string' || value.notes.length > 20000
    || !isPoint(value.scene?.lola) || !['floor', 'desk'].includes(value.scene?.box)
    || !Array.isArray(value.activity) || value.activity.length > 200
    || !value.activity.every((entry) => entry && ['order', 'action', 'note'].includes(entry.kind)
      && typeof entry.text === 'string' && entry.text.length <= 400
      && typeof entry.time === 'number' && Number.isFinite(entry.time)
      && Number.isFinite(new Date(entry.time).getTime()))
    || typeof value.brain?.name !== 'string' || !value.brain.name.trim() || value.brain.name.length > 60
    || !isExampleList(value.brain.examples) || typeof value.brain.active !== 'boolean'
    || (value.brain.trained === null && value.brain.active)
    || (value.asset !== null && (!value.asset || typeof value.asset.name !== 'string'
      || value.asset.name.length > 200 || typeof value.asset.data !== 'string'
      || value.asset.data.length > 4 * Math.ceil(MAX_ASSET_BYTES / 3)
      || !/^[A-Za-z0-9+/]*={0,2}$/.test(value.asset.data)))) {
    throw new Error('El proyecto no tiene un formato válido de Mosaico Studio.');
  }
  if (value.brain.trained !== null) train(value.brain.trained);
  return value;
}

export function appendActivity(project, kind, text, time = Date.now()) {
  project.activity = [...project.activity, { kind, text: text.slice(0, 400), time }].slice(-200);
}

export function actionFor(intent, scene) {
  if (intent === 'carry') {
    if (scene.box === 'desk') return { type: 'reply', reply: 'La caja ya está sobre la mesa.' };
    return {
      type: 'move', label: 'Llevar caja a la mesa', reply: 'La caja azul está sobre la mesa.',
      waypoints: [{ at: BOX_START, pickUp: true }, { at: DESK_APPROACH }],
      result: { lola: [...DESK_APPROACH], box: 'desk' },
    };
  }
  if (intent === 'home') {
    return { type: 'move', label: 'Volver al inicio', reply: 'Volví al punto de inicio.',
      waypoints: [{ at: HOME }], result: { lola: [...HOME], box: scene.box } };
  }
  if (intent === 'desk') {
    return { type: 'move', label: 'Ir a la mesa', reply: 'Ya estoy junto a la mesa.',
      waypoints: [{ at: DESK_APPROACH }], result: { lola: [...DESK_APPROACH], box: scene.box } };
  }
  throw new Error('Acción desconocida.');
}

const normalizeOrder = (input) => input.toLowerCase().normalize('NFD')
  .replace(/\p{Diacritic}/gu, '').replace(/[^a-z0-9 ]/g, ' ');

export const isStopOrder = (input) => /^ *(?:para|parate|detente|alto|pausa|cancelar)(?: +por +favor)? *$/.test(normalizeOrder(input));

export function orderFor(input, scene) {
  const text = normalizeOrder(input);
  if (isStopOrder(input)) return { type: 'stop', reply: 'Me quedo aquí.' };
  if (/\b(caja|cubo)\b/.test(text) && /\b(mesa|banco)\b/.test(text)
    && /\b(lleva|llevar|pon|poner|coloca|colocar|mueve|mover|puedes)\b/.test(text)) {
    return actionFor('carry', scene);
  }
  if (/\b(vuelve|regresa|inicio|posicion inicial)\b/.test(text)) return actionFor('home', scene);
  if (/\b(ve|acercate|camina|muevete|mueve|ir)\b/.test(text) && /\b(mesa|banco)\b/.test(text)) {
    return actionFor('desk', scene);
  }
  return { type: 'reply',
    reply: /\bhola\b/.test(text) ? '¡Hola! ¿Vamos a mover la caja azul?' :
      'Puedo ir a la mesa, llevar la caja azul o volver al inicio. Prueba una de esas órdenes.' };
}

export function checkGlb(buffer) {
  const error = 'Elige un archivo GLB válido con sus recursos incluidos.';
  if (buffer.byteLength < 20 || buffer.byteLength > MAX_ASSET_BYTES) throw new Error(error);
  const view = new DataView(buffer);
  const jsonLength = view.getUint32(12, true);
  if (view.getUint32(0, true) !== 0x46546c67 || view.getUint32(4, true) !== 2
    || view.getUint32(8, true) !== buffer.byteLength || view.getUint32(16, true) !== 0x4e4f534a
    || jsonLength > buffer.byteLength - 20) throw new Error(error);

  let json;
  try {
    json = JSON.parse(new TextDecoder().decode(new Uint8Array(buffer, 20, jsonLength)));
  } catch {
    throw new Error(error);
  }
  if (!json || json.asset?.version !== '2.0') throw new Error(error);
  // The studio imports self-contained files and never fetches resources referenced by a model.
  for (const collection of [json.buffers, json.images]) {
    if (collection == null) continue;
    if (!Array.isArray(collection)) throw new Error(error);
    if (collection.some((resource) => !resource || resource.uri !== undefined)) throw new Error(error);
  }
}

export function encodeAsset(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve({ name: file.name.slice(0, 200), data: reader.result.split(',')[1] });
    reader.onerror = () => reject(new Error('No se pudo leer el archivo.'));
    reader.readAsDataURL(file);
  });
}

export function decodeAsset(data) {
  return Uint8Array.from(atob(data), (character) => character.charCodeAt(0)).buffer;
}
