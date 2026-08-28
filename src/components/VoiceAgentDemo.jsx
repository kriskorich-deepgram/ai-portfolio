import { useEffect, useMemo, useRef, useState } from 'react';
import {
  AgentSession,
  AgentMicrophone,
  AgentPlayer,
} from '@deepgram/agents';
import {
  LLM_OPTIONS,
  DEFAULT_LLM_ID,
  llmById,
  buildThinkSettings,
  voicesForDemo,
} from '../data/voiceOptions.js';

const DEEPGRAM_KEY = import.meta.env.VITE_DEEPGRAM_API_KEY;

// Client-side VAD used only for latency measurement — the agent does its own
// endpointing server-side. We watch the mic level so we know roughly when the
// caller stopped talking, which is the clock start for the round-trip metrics.
const SILENCE_THRESHOLD = 0.015;
const SILENCE_HOLD_MS = 280;
const VAD_POLL_MS = 40;
const MAX_PLAUSIBLE_LATENCY_MS = 30000;

const ACTIVE_PHASES = ['connecting', 'listening', 'thinking', 'responding'];

export default function VoiceAgentDemo({ config, onClose }) {
  // setup | connecting | listening | thinking | responding | ended | error
  const [phase, setPhase] = useState('setup');
  const [history, setHistory] = useState([]);
  const [error, setError] = useState(null);
  const [llmId, setLlmId] = useState(DEFAULT_LLM_ID);
  const [voiceId, setVoiceId] = useState(config.voice);
  const [summary, setSummary] = useState(null);
  const [llmHighlighted, setLlmHighlighted] = useState(false);

  const sessionRef = useRef(null);
  const micRef = useRef(null);
  const playerRef = useRef(null);
  const phaseRef = useRef('setup');
  const cancelledRef = useRef(false);
  const transcriptScrollRef = useRef(null);
  const vadTimerRef = useRef(null);
  const metricsRef = useRef(freshMetrics());
  const turnRef = useRef(freshTurn());

  const voiceOptions = useMemo(() => voicesForDemo(config), [config]);
  const activeLlm = llmById(llmId);
  const isActive = ACTIVE_PHASES.includes(phase);
  const controlsLocked = isActive;

  useEffect(() => {
    if (!DEEPGRAM_KEY) {
      setError(
        'Missing VITE_DEEPGRAM_API_KEY. Add it to your .env to run live demos.'
      );
      transitionPhase('error');
    }
    return () => {
      cancelledRef.current = true;
      stopVad();
      teardown();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (transcriptScrollRef.current) {
      transcriptScrollRef.current.scrollTop =
        transcriptScrollRef.current.scrollHeight;
    }
  }, [history, phase, summary]);

  function transitionPhase(next) {
    phaseRef.current = next;
    setPhase(next);
  }

  /* ---------------------------------------------------------------- metrics */

  function freshMetricsState() {
    metricsRef.current = freshMetrics();
    turnRef.current = freshTurn();
  }

  function record(bucket, ms) {
    if (!Number.isFinite(ms) || ms <= 0 || ms > MAX_PLAUSIBLE_LATENCY_MS) return;
    metricsRef.current[bucket].push(ms);
  }

  function settleSpeechEnd() {
    const turn = turnRef.current;
    if (!turn.speechEndTs && turn.lastLoudTs) turn.speechEndTs = turn.lastLoudTs;
  }

  function markSttDone() {
    const turn = turnRef.current;
    if (turn.sttDoneTs) return;
    settleSpeechEnd();
    turn.speaking = false;
    turn.sttDoneTs = performance.now();
    if (turn.speechEndTs) record('stt', turn.sttDoneTs - turn.speechEndTs);
  }

  function markLlmDone() {
    const turn = turnRef.current;
    turn.llmDoneTs = performance.now();
    if (turn.sttDoneTs) record('llm', turn.llmDoneTs - turn.sttDoneTs);
    turn.awaitingAudio = true;
  }

  function markFirstAudio() {
    const turn = turnRef.current;
    if (!turn.awaitingAudio || !turn.llmDoneTs) return;
    const now = performance.now();
    record('tts', now - turn.llmDoneTs);
    if (turn.speechEndTs) record('e2e', now - turn.speechEndTs);
    turn.awaitingAudio = false;
  }

  function startVad() {
    stopVad();
    vadTimerRef.current = window.setInterval(() => {
      const turn = turnRef.current;
      if (!turn.speaking) return;
      const level = micRef.current?.getInputVolume?.() ?? 0;
      const now = performance.now();
      if (level >= SILENCE_THRESHOLD) {
        turn.lastLoudTs = now;
        return;
      }
      if (turn.lastLoudTs && now - turn.lastLoudTs >= SILENCE_HOLD_MS) {
        turn.speaking = false;
        turn.speechEndTs = turn.lastLoudTs;
      }
    }, VAD_POLL_MS);
  }

  function stopVad() {
    if (vadTimerRef.current) {
      window.clearInterval(vadTimerRef.current);
      vadTimerRef.current = null;
    }
  }

  function buildSummary() {
    const m = metricsRef.current;
    const durationMs = m.startTs ? performance.now() - m.startTs : 0;
    return {
      durationMs,
      turns: m.turns,
      stt: average(m.stt),
      llm: average(m.llm),
      tts: average(m.tts),
      e2e: average(m.e2e),
      // The Voice Agent API does not surface per-word confidence scores to the
      // client, so there is nothing honest to average here.
      confidence: null,
      llmName: activeLlm.name,
      voiceName: labelForVoice(voiceOptions, voiceId),
    };
  }

  /* ---------------------------------------------------------------- session */

  async function start() {
    if (!DEEPGRAM_KEY) return;
    cancelledRef.current = false;
    setError(null);
    setSummary(null);
    setHistory([]);
    freshMetricsState();
    metricsRef.current.startTs = performance.now();
    transitionPhase('connecting');

    try {
      const session = new AgentSession({
        auth: { apiKey: DEEPGRAM_KEY },
        audio: {
          input: { encoding: 'linear16', sampleRate: 16000 },
          output: { encoding: 'linear16', sampleRate: 24000 },
        },
        agent: {
          listen: {
            provider: { type: 'deepgram', model: config.listenModel },
          },
          think: buildThinkSettings(activeLlm, config.systemPrompt),
          speak: {
            provider: { type: 'deepgram', model: voiceId },
          },
        },
      });
      sessionRef.current = session;

      const player = new AgentPlayer();
      playerRef.current = player;

      session.on('audio', (chunk) => {
        if (cancelledRef.current) return;
        markFirstAudio();
        player.queue(chunk);
      });

      session.on('conversation-text', (msg) => {
        if (cancelledRef.current) return;
        const role = msg.role === 'user' ? 'user' : 'assistant';
        const raw = msg.content || msg.message || '';
        if (!raw) return;
        if (role === 'user') markSttDone();
        else markLlmDone();
        metricsRef.current.turns += 1;
        const content = role === 'assistant' ? stripMarkdown(raw) : raw;
        setHistory((h) => [...h, { role, content }]);
      });

      session.on('settings-applied', () => {
        if (cancelledRef.current) return;
        try {
          session.injectAgentMessage(config.openingLine);
        } catch {
          /* ignore */
        }
      });

      session.on('user-started-speaking', () => {
        if (cancelledRef.current) return;
        turnRef.current = freshTurn({
          speaking: true,
          lastLoudTs: performance.now(),
        });
        try {
          player.interrupt();
        } catch {
          /* ignore */
        }
        transitionPhase('listening');
      });

      session.on('agent-thinking', () => {
        if (cancelledRef.current) return;
        markSttDone();
        transitionPhase('thinking');
      });

      session.on('agent-started-speaking', () => {
        if (cancelledRef.current) return;
        transitionPhase('responding');
      });

      session.on('agent-audio-done', () => {
        if (cancelledRef.current) return;
        transitionPhase('listening');
      });

      session.on('error', (msg) => {
        if (cancelledRef.current) return;
        const description =
          msg?.description || msg?.message || 'Agent session error.';
        setError(description);
        transitionPhase('error');
      });

      await session.connect();
      if (cancelledRef.current) return;

      const mic = new AgentMicrophone((data) => {
        if (cancelledRef.current) return;
        try {
          session.sendAudio(data);
        } catch {
          /* ignore */
        }
      });
      micRef.current = mic;
      await mic.start();
      if (cancelledRef.current) return;

      startVad();
      transitionPhase('listening');
    } catch (err) {
      if (!cancelledRef.current) {
        setError(err?.message || 'Failed to start demo.');
        transitionPhase('error');
      }
    }
  }

  function teardown() {
    try {
      micRef.current?.stop();
    } catch {
      /* ignore */
    }
    micRef.current = null;
    try {
      sessionRef.current?.disconnect();
    } catch {
      /* ignore */
    }
    sessionRef.current = null;
    try {
      playerRef.current?.dispose();
    } catch {
      /* ignore */
    }
    playerRef.current = null;
  }

  function endSession() {
    if (!isActive) return;
    const next = buildSummary();
    cancelledRef.current = true;
    stopVad();
    teardown();
    setSummary(next);
    transitionPhase('ended');
  }

  function handleOrbClick() {
    if (isActive) endSession();
    else start();
  }

  function handleCloseDemo() {
    cancelledRef.current = true;
    stopVad();
    teardown();
    onClose();
  }

  function handleStartNewSession() {
    start();
  }

  function handleCompareLlms() {
    const index = LLM_OPTIONS.findIndex((l) => l.id === llmId);
    const next = LLM_OPTIONS[(index + 1) % LLM_OPTIONS.length];
    setLlmId(next.id);
    setLlmHighlighted(true);
    window.setTimeout(() => setLlmHighlighted(false), 4000);
  }

  function handleSuggestion(text) {
    if (!text || !sessionRef.current) return;
    try {
      sessionRef.current.injectUserMessage(text);
    } catch {
      /* ignore */
    }
  }

  const STATUS = {
    setup: 'Ready',
    connecting: 'Connecting',
    listening: 'Listening',
    thinking: 'Thinking',
    responding: 'Responding',
    ended: 'Session ended',
    error: 'Error',
  };
  const statusText = STATUS[phase] || '';
  const statusColor = phase === 'error' ? '#f87171' : config.accentHex;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-ink-950">
      <header className="flex items-center justify-between gap-4 border-b border-white/10 bg-ink-900/80 p-4 backdrop-blur-sm sm:p-6">
        <div className="flex items-center gap-3">
          <div
            className="flex h-12 w-12 flex-none items-center justify-center rounded-full text-lg font-bold text-white shadow-lg"
            style={{ backgroundColor: config.accentHex }}
          >
            {config.avatarInitial}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-white sm:text-base">
              {config.agentName}
              <span className="ml-2 text-xs font-normal text-slate-400 sm:text-sm">
                · {config.agentTitle}
              </span>
            </p>
            <p className="truncate text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
              {config.industryEyebrow}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={handleCloseDemo}
          className="inline-flex flex-none items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-slate-200 transition hover:border-white/20 hover:bg-white/10"
        >
          Close Demo
        </button>
      </header>

      <SessionControls
        accentHex={config.accentHex}
        llmId={llmId}
        onSelectLlm={setLlmId}
        highlighted={llmHighlighted}
        voiceId={voiceId}
        voiceOptions={voiceOptions}
        onSelectVoice={setVoiceId}
        locked={controlsLocked}
      />

      <div className="flex flex-1 overflow-hidden">
        <DemoSidebar
          config={config}
          phase={phase}
          onSelectSuggestion={handleSuggestion}
        />

        <div className="flex flex-1 flex-col overflow-hidden">
          <div className="flex flex-none flex-col items-center gap-2 border-b border-white/5 bg-ink-900/30 px-4 py-5">
            <Orb
              phase={phase}
              accentHex={config.accentHex}
              onClick={handleOrbClick}
              disabled={phase === 'connecting' || !DEEPGRAM_KEY}
            />
            <p className="inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.22em]">
              <span className="text-slate-500">Status:</span>
              <span style={{ color: statusColor }}>{statusText}</span>
              {isActive && <AnimatedDots color={statusColor} />}
            </p>
            <p className="text-xs text-slate-500">
              {phase === 'setup' &&
                'Pick your model and voice, then click the mic to start.'}
              {phase === 'connecting' && 'Connecting to Deepgram Voice Agent…'}
              {phase === 'listening' &&
                'Mic is open — speak naturally. Interrupt the agent anytime.'}
              {phase === 'responding' &&
                'Agent is speaking. Start talking to interrupt.'}
              {phase === 'thinking' && 'Generating reply…'}
              {phase === 'ended' && 'Session ended. Your summary is below.'}
              {phase === 'error' &&
                'Something went wrong — see the transcript. Click the mic to retry.'}
            </p>
          </div>

          <div
            ref={transcriptScrollRef}
            className="flex-1 overflow-y-auto px-4 py-6 sm:px-8 sm:py-8"
          >
            <div className="mx-auto flex max-w-3xl flex-col gap-4">
              {history.length === 0 && phase === 'setup' && (
                <p className="self-center text-xs text-slate-500">
                  Your conversation with {config.agentName} will appear here.
                </p>
              )}
              {history.length === 0 && phase === 'connecting' && (
                <p className="self-center text-xs text-slate-500">
                  Setting up your conversation with {config.agentName}…
                </p>
              )}
              {history.map((msg, i) => (
                <ChatBubble
                  key={i}
                  role={msg.role}
                  text={msg.content}
                  accentHex={config.accentHex}
                  avatarInitial={config.avatarInitial}
                />
              ))}
              {phase === 'error' && error && (
                <div className="self-center rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-xs text-red-100">
                  {error}
                </div>
              )}
              {summary && (
                <MetricsPanel
                  summary={summary}
                  accentHex={config.accentHex}
                  onStartNew={handleStartNewSession}
                  onCompare={handleCompareLlms}
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ helpers */

function freshMetrics() {
  return { startTs: null, turns: 0, stt: [], llm: [], tts: [], e2e: [] };
}

function freshTurn(overrides = {}) {
  return {
    speaking: false,
    lastLoudTs: null,
    speechEndTs: null,
    sttDoneTs: null,
    llmDoneTs: null,
    awaitingAudio: false,
    ...overrides,
  };
}

function average(samples) {
  if (!samples.length) return null;
  return samples.reduce((sum, n) => sum + n, 0) / samples.length;
}

function formatDuration(ms) {
  const total = Math.max(0, Math.round(ms / 1000));
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

function labelForVoice(options, voiceId) {
  return options.find((v) => v.id === voiceId)?.name || voiceId;
}

function stripMarkdown(text) {
  return text
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/__(.*?)__/g, '$1')
    .replace(/_(.*?)_/g, '$1')
    .replace(/#{1,6}\s/g, '')
    .replace(/`(.*?)`/g, '$1')
    .replace(/\[(.*?)\]\(.*?\)/g, '$1')
    .replace(/^\s*[-*+]\s/gm, '')
    .replace(/^\s*\d+\.\s/gm, '')
    .trim();
}

/* --------------------------------------------------------------- components */

function SessionControls({
  accentHex,
  llmId,
  onSelectLlm,
  highlighted,
  voiceId,
  voiceOptions,
  onSelectVoice,
  locked,
}) {
  return (
    <div className="flex flex-col gap-3 border-b border-white/10 bg-ink-900/50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6">
      <div
        className={`flex flex-col gap-1.5 rounded-xl px-2 py-1.5 transition ${
          highlighted ? 'animate-pulse' : ''
        }`}
        style={
          highlighted
            ? { boxShadow: `0 0 0 2px ${accentHex}`, backgroundColor: `${accentHex}14` }
            : undefined
        }
      >
        <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
          Model
        </span>
        <div className="flex flex-wrap gap-1.5">
          {LLM_OPTIONS.map((llm) => {
            const active = llm.id === llmId;
            return (
              <button
                key={llm.id}
                type="button"
                disabled={locked}
                onClick={() => onSelectLlm(llm.id)}
                className="rounded-full border px-3 py-1 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-50"
                style={
                  active
                    ? {
                        backgroundColor: llm.accentHex,
                        borderColor: llm.accentHex,
                        color: '#0b0b15',
                      }
                    : {
                        borderColor: 'rgba(255,255,255,0.12)',
                        color: '#cbd5e1',
                      }
                }
              >
                {llm.name}
              </button>
            );
          })}
        </div>
      </div>

      <label className="flex flex-col gap-1.5 sm:min-w-[19rem]">
        <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
          Voice
        </span>
        <select
          value={voiceId}
          disabled={locked}
          onChange={(e) => onSelectVoice(e.target.value)}
          className="w-full rounded-lg border border-white/10 bg-ink-800 px-3 py-1.5 text-xs text-slate-100 outline-none transition focus:border-white/30 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {voiceOptions.map((v) => (
            <option key={v.id} value={v.id}>
              {`${v.name} — ${v.accent}, ${v.character}`}
            </option>
          ))}
        </select>
        <span className="text-[10px] text-slate-500">
          {locked
            ? 'Locked while the session is live — stop the session to change.'
            : 'Applies to the next session.'}
        </span>
      </label>

    </div>
  );
}

function Orb({ phase, accentHex, onClick, disabled }) {
  const live = ACTIVE_PHASES.includes(phase);
  const label = live ? 'Stop session' : 'Start session';
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className="relative disabled:cursor-not-allowed"
    >
      {phase === 'listening' && (
        <>
          <span
            className="absolute inset-0 animate-ping rounded-full opacity-40"
            style={{ backgroundColor: accentHex }}
          />
          <span
            className="absolute -inset-2 rounded-full border opacity-60"
            style={{ borderColor: accentHex }}
          />
        </>
      )}
      <span
        className="relative flex h-16 w-16 items-center justify-center rounded-full border text-white shadow-lg transition"
        style={{
          borderColor: accentHex,
          backgroundColor: phase === 'listening' ? accentHex : '#0b0b15',
        }}
      >
        {phase === 'thinking' || phase === 'connecting' ? (
          <Spinner />
        ) : live ? (
          <StopIcon />
        ) : (
          <MicIcon />
        )}
      </span>
    </button>
  );
}

function MetricsPanel({ summary, accentHex, onStartNew, onCompare }) {
  return (
    <section className="mt-4 animate-fade-in-up rounded-2xl border border-white/10 bg-ink-900/70 p-5 sm:p-6">
      <h3
        className="text-sm font-semibold tracking-tight"
        style={{ color: accentHex }}
      >
        Session Summary
      </h3>

      <div className="mt-4 grid grid-cols-1 gap-6 sm:grid-cols-2">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
            Conversation Stats
          </p>
          <dl className="mt-3 space-y-2 text-xs">
            <StatRow label="Duration" value={formatDuration(summary.durationMs)} />
            <StatRow label="Turns" value={String(summary.turns)} />
            <StatRow label="LLM" value={summary.llmName} />
            <StatRow label="Voice" value={summary.voiceName} />
          </dl>
        </div>

        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
            Performance Metrics
          </p>
          <dl className="mt-3 space-y-2 text-xs">
            <StatRow
              label="STT Latency"
              value={formatMs(summary.stt)}
              color={gradeColor(summary.stt, 300, 500)}
            />
            <StatRow
              label="LLM Latency"
              value={formatMs(summary.llm)}
              color={gradeColor(summary.llm, 1000, 2000)}
            />
            <StatRow
              label="TTS Latency"
              value={formatMs(summary.tts)}
              color={gradeColor(summary.tts, 300, 500)}
            />
            <StatRow
              label="End-to-End"
              value={formatMs(summary.e2e)}
              color={gradeColor(summary.e2e, 1500, 3000)}
            />
            <StatRow
              label="Word Confidence"
              value={
                summary.confidence == null
                  ? 'n/a'
                  : `${Math.round(summary.confidence * 100)}%`
              }
              color={
                summary.confidence == null
                  ? undefined
                  : gradeColorDesc(summary.confidence * 100, 90, 80)
              }
            />
          </dl>
        </div>
      </div>

      <p className="mt-4 text-[10px] leading-relaxed text-slate-500">
        Latencies are measured in the browser: end of speech (client VAD) →
        transcript, transcript → agent reply, reply → first audio chunk. Per-word
        confidence is not emitted by the Voice Agent API, so it reads n/a.
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onStartNew}
          className="rounded-lg px-4 py-2 text-xs font-semibold text-white transition hover:opacity-90"
          style={{ backgroundColor: accentHex }}
        >
          Start New Session
        </button>
        <button
          type="button"
          onClick={onCompare}
          className="rounded-lg border border-white/15 bg-white/5 px-4 py-2 text-xs font-semibold text-slate-200 transition hover:border-white/25 hover:bg-white/10"
        >
          Compare LLMs
        </button>
      </div>
    </section>
  );
}

function StatRow({ label, value, color }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-white/5 pb-1.5">
      <dt className="text-slate-400">{label}</dt>
      <dd
        className="font-mono font-semibold"
        style={{ color: color || '#e2e8f0' }}
      >
        {value}
      </dd>
    </div>
  );
}

function formatMs(value) {
  if (value == null) return 'n/a';
  return `${Math.round(value)}ms`;
}

// Lower is better.
function gradeColor(value, goodBelow, okBelow) {
  if (value == null) return undefined;
  if (value < goodBelow) return '#34d399';
  if (value < okBelow) return '#fbbf24';
  return '#f87171';
}

// Higher is better.
function gradeColorDesc(value, goodAbove, okAbove) {
  if (value == null) return undefined;
  if (value > goodAbove) return '#34d399';
  if (value > okAbove) return '#fbbf24';
  return '#f87171';
}

function DemoSidebar({ config, phase, onSelectSuggestion }) {
  const sidebar = config.sidebar;
  if (!sidebar) return null;
  const disabled = !ACTIVE_PHASES.includes(phase) || phase === 'connecting';
  return (
    <aside className="hidden w-2/5 flex-col overflow-y-auto border-r border-white/10 bg-ink-900/60 px-6 py-7 lg:flex">
      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
        Demo guide
      </p>
      <h2
        className="mt-1 text-lg font-semibold tracking-tight"
        style={{ color: config.accentHex }}
      >
        {sidebar.title}
      </h2>

      <p className="mt-4 text-sm leading-relaxed text-slate-300">
        {sidebar.scenario}
      </p>

      {sidebar.fakeData && (
        <div className="mt-5 rounded-lg border border-white/10 bg-ink-950/70 px-3 py-2.5 font-mono text-[11px] leading-relaxed text-slate-300">
          {sidebar.fakeData}
        </div>
      )}

      <div className="mt-6">
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
          {sidebar.suggestionsLabel || 'Try saying…'}
        </p>
        <ul className="mt-3 space-y-2">
          {sidebar.suggestions.map((suggestion, i) => (
            <li key={i}>
              <button
                type="button"
                onClick={() => onSelectSuggestion(suggestion)}
                disabled={disabled}
                className="group w-full rounded-lg border border-white/10 bg-ink-900/40 px-3 py-2 text-left text-xs leading-relaxed text-slate-200 transition hover:bg-ink-800/70 disabled:cursor-not-allowed disabled:opacity-50"
                style={{ borderColor: disabled ? undefined : `${config.accentHex}33` }}
              >
                <span
                  className="mr-1.5 font-semibold"
                  style={{ color: config.accentHex }}
                  aria-hidden="true"
                >
                  &ldquo;
                </span>
                {suggestion}
                <span
                  className="ml-1 font-semibold"
                  style={{ color: config.accentHex }}
                  aria-hidden="true"
                >
                  &rdquo;
                </span>
              </button>
            </li>
          ))}
        </ul>
        <p className="mt-2 text-[10px] italic text-slate-500">
          Click a suggestion to inject it as the user.
        </p>
      </div>

      <div
        className="mt-auto rounded-lg border-l-2 bg-white/5 px-3.5 py-3"
        style={{ borderColor: config.accentHex }}
      >
        <p className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-white">
          <LightbulbIcon /> Pro tip
        </p>
        <p className="mt-1.5 text-xs leading-relaxed text-slate-300">
          {sidebar.proTip}
        </p>
      </div>
    </aside>
  );
}

function LightbulbIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-3.5 w-3.5"
      aria-hidden="true"
    >
      <path d="M9 18h6" />
      <path d="M10 22h4" />
      <path d="M12 2a7 7 0 0 0-4 12.74V17a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1v-2.26A7 7 0 0 0 12 2z" />
    </svg>
  );
}

function ChatBubble({ role, text, accentHex, avatarInitial }) {
  const isAgent = role === 'assistant';
  if (isAgent) {
    return (
      <div className="flex items-start gap-3">
        <div
          className="flex h-8 w-8 flex-none items-center justify-center rounded-full text-xs font-bold text-white"
          style={{ backgroundColor: accentHex }}
          aria-hidden="true"
        >
          {avatarInitial}
        </div>
        <div className="max-w-[80%] rounded-2xl rounded-bl-sm border border-white/10 bg-ink-800/80 px-4 py-2.5 text-sm leading-relaxed text-slate-100">
          {text}
        </div>
      </div>
    );
  }
  return (
    <div className="flex items-start justify-end gap-3">
      <div
        className="max-w-[80%] rounded-2xl rounded-br-sm border px-4 py-2.5 text-sm leading-relaxed text-white"
        style={{ backgroundColor: accentHex, borderColor: accentHex }}
      >
        {text}
      </div>
      <div className="flex h-8 w-8 flex-none items-center justify-center rounded-full border border-white/15 bg-white/5 text-xs font-bold text-slate-200">
        You
      </div>
    </div>
  );
}

function AnimatedDots({ color = 'currentColor' }) {
  return (
    <span
      className="ml-1.5 inline-flex items-center gap-0.5"
      aria-hidden="true"
    >
      {[0, 200, 400].map((delay) => (
        <span
          key={delay}
          className="inline-block h-1 w-1 animate-pulse rounded-full"
          style={{
            backgroundColor: color,
            animationDelay: `${delay}ms`,
          }}
        />
      ))}
    </span>
  );
}

function MicIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-7 w-7"
      aria-hidden="true"
    >
      <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
      <line x1="12" y1="19" x2="12" y2="23" />
      <line x1="8" y1="23" x2="16" y2="23" />
    </svg>
  );
}

function StopIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      className="h-6 w-6"
      aria-hidden="true"
    >
      <rect x="6" y="6" width="12" height="12" rx="2" />
    </svg>
  );
}

function Spinner() {
  return (
    <span
      className="inline-block h-7 w-7 animate-spin rounded-full border-2 border-white/20 border-t-white"
      aria-hidden="true"
    />
  );
}
