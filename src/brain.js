export const INTENTS = Object.freeze({
  desk: 'Ir a la mesa',
  carry: 'Llevar caja a la mesa',
  home: 'Volver al inicio',
});

export const STARTER = Object.freeze([
  { text: 've a la mesa', intent: 'desk' },
  { text: 'acércate al banco de trabajo', intent: 'desk' },
  { text: 'lleva la caja azul a la mesa', intent: 'carry' },
  { text: 'coloca el cubo encima del banco', intent: 'carry' },
  { text: 'regresa al inicio', intent: 'home' },
  { text: 'vuelve al punto de partida', intent: 'home' },
]);

export const isIntent = (value) => Object.hasOwn(INTENTS, value);
export const isExample = (value) => value && typeof value.text === 'string'
  && value.text.trim().length >= 3 && value.text.length <= 140 && isIntent(value.intent);
export const isExampleList = (value) => Array.isArray(value) && value.length <= 60 && value.every(isExample);

const stopWords = new Set(['a', 'al', 'de', 'del', 'el', 'en', 'la', 'los', 'las', 'por', 'favor', 'un', 'una']);
export const tokens = (text) => text.toLowerCase().normalize('NFD')
  .replace(/\p{Diacritic}/gu, '').match(/[a-z0-9]+/g)?.filter((word) => !stopWords.has(word)) ?? [];

export function train(examples) {
  if (!isExampleList(examples)) throw new Error('Revisa las frases de ejemplo.');
  const labels = new Map();
  const vocabulary = new Set();
  for (const example of examples) {
    const words = tokens(example.text);
    if (!words.length) throw new Error('Usa frases con palabras que describan la orden.');
    if (!labels.has(example.intent)) labels.set(example.intent, { examples: 0, count: 0, words: new Map() });
    const label = labels.get(example.intent);
    label.examples++;
    for (const word of words) {
      vocabulary.add(word);
      label.count++;
      label.words.set(word, (label.words.get(word) ?? 0) + 1);
    }
  }
  if (labels.size < 2 || [...labels.values()].some((label) => label.examples < 2)) {
    throw new Error('Agrega dos ejemplos por acción y usa al menos dos acciones distintas.');
  }
  return { labels, vocabulary };
}

export function predict(model, text) {
  const words = [...new Set(tokens(text))].filter((word) => model.vocabulary.has(word));
  if (!words.length) return null;
  const scores = [];
  for (const [intent, label] of model.labels) {
    // Equal priors keep an action with more examples from winning on count alone.
    const denominator = label.count + model.vocabulary.size;
    const score = words.reduce((total, word) => total
      + Math.log(((label.words.get(word) ?? 0) + 1) / denominator), 0);
    scores.push({ intent, score });
  }
  scores.sort((a, b) => b.score - a.score);
  const best = scores[0];
  const confidence = 1 / scores.reduce((sum, candidate) => sum + Math.exp(candidate.score - best.score), 0);
  return confidence >= 0.6 ? { intent: best.intent, confidence } : null;
}
