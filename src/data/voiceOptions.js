// The 13 featured Deepgram Flux TTS voices. Served over POST /v2/speak.
export const FLUX_VOICES = [
  { id: 'flux-hannah-en', name: 'Hannah', accent: 'American', gender: 'Female', character: 'Clear, confident, thoughtful' },
  { id: 'flux-kit-en', name: 'Kit', accent: 'British', gender: 'Male', character: 'Friendly, energetic, helpful' },
  { id: 'flux-alexis-en', name: 'Alexis', accent: 'American', gender: 'Female', character: 'Clear, professional, calm' },
  { id: 'flux-cliff-en', name: 'Cliff', accent: 'American', gender: 'Male', character: 'Deep, confident, calm' },
  { id: 'flux-sienna-en', name: 'Sienna', accent: 'American', gender: 'Female', character: 'Clear, professional, warm' },
  { id: 'flux-cole-en', name: 'Cole', accent: 'American', gender: 'Male', character: 'Friendly, clear, energetic' },
  { id: 'flux-brooke-en', name: 'Brooke', accent: 'American', gender: 'Female', character: 'Friendly, intelligent, confident' },
  { id: 'flux-colin-en', name: 'Colin', accent: 'British', gender: 'Male', character: 'Warm, trustworthy, authoritative' },
  { id: 'flux-gemma-en', name: 'Gemma', accent: 'British', gender: 'Female', character: 'Friendly, kind, approachable' },
  { id: 'flux-haley-en', name: 'Haley', accent: 'American', gender: 'Female', character: 'Clear, professional, empathetic' },
  { id: 'flux-heather-en', name: 'Heather', accent: 'American', gender: 'Female', character: 'Clear, engaging, friendly' },
  { id: 'flux-miles-en', name: 'Miles', accent: 'American', gender: 'Male', character: 'Clear, calm, professional' },
  { id: 'flux-sean-en', name: 'Sean', accent: 'British', gender: 'Male', character: 'Friendly, kind, calming' },
];

export function voiceLabel(voiceId) {
  const v = FLUX_VOICES.find((x) => x.id === voiceId);
  if (v) return `${v.name} — ${v.accent}, ${v.character}`;
  return voiceId;
}

export function voiceName(voiceId) {
  return FLUX_VOICES.find((x) => x.id === voiceId)?.name || voiceId;
}

/**
 * Voice options offered for a demo: the 13 featured Flux voices, plus the
 * demo's own default first when it lives outside that set (Sofia's Spanish
 * voice — the Flux set is English-only and would break her bilingual open).
 */
export function voicesForDemo(demo) {
  const extra = demo.voiceOptionsExtra || [];
  return [...extra, ...FLUX_VOICES];
}

/**
 * LLM choices. `provider` is what Deepgram's Voice Agent `think` block needs;
 * `proxy` is the matching serverless route for non-voice calls from the browser.
 * Grok is not a native Deepgram think provider, so it routes through our own
 * OpenAI-compatible proxy via `customEndpoint`.
 */
export const LLM_OPTIONS = [
  {
    id: 'claude',
    name: 'Claude',
    model: 'claude-sonnet-4-6',
    proxy: '/api/anthropic',
    provider: 'anthropic',
    accentHex: '#f59e0b',
  },
  {
    id: 'gpt4o',
    name: 'GPT-4o',
    model: 'gpt-4o',
    proxy: '/api/openai',
    provider: 'open_ai',
    accentHex: '#10b981',
  },
  {
    id: 'gemini',
    name: 'Gemini',
    model: 'gemini-2.0-flash',
    proxy: '/api/gemini',
    provider: 'google',
    accentHex: '#3b82f6',
  },
  {
    id: 'grok',
    name: 'Grok',
    model: 'grok-3-mini',
    proxy: '/api/grok',
    provider: 'open_ai',
    customEndpoint: '/api/grok',
    accentHex: '#a855f7',
  },
];

export const DEFAULT_LLM_ID = 'claude';

export function llmById(id) {
  return LLM_OPTIONS.find((l) => l.id === id) || LLM_OPTIONS[0];
}

/** Build the Deepgram Voice Agent `think` settings for a given LLM choice. */
export function buildThinkSettings(llm, prompt) {
  const think = {
    provider: { type: llm.provider, model: llm.model },
    prompt,
  };
  if (llm.customEndpoint && typeof window !== 'undefined') {
    think.endpoint = {
      url: new URL(llm.customEndpoint, window.location.origin).href,
      headers: { 'content-type': 'application/json' },
    };
  }
  return think;
}
