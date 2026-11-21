import assert from 'node:assert/strict';
import test from 'node:test';
import { predict, STARTER, train } from '../src/brain.js';
import { actionFor, checkGlb, newProject, orderFor, validateProject } from '../src/project.js';

test('training enables a user phrase the reference model cannot act on', () => {
  const scene = newProject().scene;
  const phrase = 'traslada el contenedor celeste';
  assert.equal(orderFor(phrase, scene).type, 'reply');
  assert.equal(predict(train(STARTER), phrase), null);
  const learned = train([...STARTER, { text: phrase, intent: 'carry' }]);
  const prediction = predict(learned, 'por favor, traslada el contenedor celeste');
  assert.equal(prediction.intent, 'carry');
  assert.equal(actionFor(prediction.intent, scene).result.box, 'desk');
});

test('few examples and unknown vocabulary cannot produce an active command', () => {
  assert.throws(() => train(STARTER.slice(0, 3)), /dos ejemplos/);
  const model = train(STARTER);
  assert.equal(predict(model, 'cuéntame la historia de Roma'), null);
  assert.throws(() => actionFor('unknown', newProject().scene));
});

test('polite commands are not confused with pausing the simulation', () => {
  const scene = newProject().scene;
  assert.equal(orderFor('Detente, por favor', scene).type, 'stop');
  assert.equal(orderFor('Ve a la mesa para revisarla', scene).type, 'move');
  assert.equal(orderFor('Pon la caja sobre la mesa', { ...scene, box: 'desk' }).type, 'reply');
});

test('saved project round trips the active trained brain, notes, and scene', () => {
  const project = newProject();
  project.brain.active = true;
  assert.throws(() => validateProject(project));
  project.brain.trained = STARTER;
  project.notes = 'Orden nueva ✓';
  project.scene = actionFor('carry', project.scene).result;
  const restored = validateProject(JSON.parse(JSON.stringify(project)));
  assert.equal(restored.scene.box, 'desk');
  assert.equal(restored.notes, project.notes);
  assert.equal(predict(train(restored.brain.trained), 'regresa al inicio').intent, 'home');
});

function glb(doc) {
  const json = Buffer.from(JSON.stringify(doc));
  const padding = (4 - json.length % 4) % 4;
  const buffer = Buffer.alloc(20 + json.length + padding, 0x20);
  buffer.writeUInt32LE(0x46546c67, 0);
  buffer.writeUInt32LE(2, 4);
  buffer.writeUInt32LE(buffer.length, 8);
  buffer.writeUInt32LE(json.length + padding, 12);
  buffer.writeUInt32LE(0x4e4f534a, 16);
  json.copy(buffer, 20);
  return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
}

test('only self-contained GLB v2 buffers are accepted', () => {
  assert.doesNotThrow(() => checkGlb(glb({ asset: { version: '2.0' }, images: [{ bufferView: 0 }] })));
  assert.throws(() => checkGlb(glb({ asset: { version: '2.0' }, images: [{ uri: 'separate.png' }] })), /GLB/);
  assert.throws(() => checkGlb(new ArrayBuffer(20)), /GLB/);
});

test('older projects receive an independent profile without losing scene or brain', () => {
  const old = newProject();
  delete old.profile;
  old.scene.box = 'desk';
  old.notes = 'mis notas';
  const restored = validateProject(JSON.parse(JSON.stringify(old)));
  assert.equal(restored.scene.box, 'desk');
  assert.equal(restored.notes, 'mis notas');
  assert.equal(restored.profile.mode, 'scene');
  restored.profile.personality = 'Responde con calma.';
  restored.profile.memory = 'El usuario vive en Lima.';
  restored.profile.model = 'primer-modelo';
  restored.profile.mode = 'chat';
  restored.profile.messages = [{ role: 'user', content: '¿Dónde vivo?' }];
  const saved = validateProject(JSON.parse(JSON.stringify(restored)));
  saved.profile.model = 'segundo-modelo';
  assert.equal(saved.profile.memory, 'El usuario vive en Lima.');
  assert.equal(saved.profile.personality, 'Responde con calma.');
  assert.equal(saved.profile.messages[0].content, '¿Dónde vivo?');
  assert.equal(saved.scene.box, 'desk');
  assert.throws(() => validateProject({ ...saved, profile: { ...saved.profile, messages: [{ role: 'system', content: 'x' }] } }));
});
