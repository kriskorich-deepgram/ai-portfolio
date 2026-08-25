import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ConversationProvider, useConversation } from '@elevenlabs/react';

const AGENT_ID = 'agent_1701m0x3paswe2987whjvryjg6x5';
const LINKEDIN_URL = 'https://www.linkedin.com/in/kris-korich/';

const SUGGESTED_QUESTIONS = [
  "What's your NRR?",
  'Tell me about your largest deal',
  'How big is your book of business?',
  'What did you accomplish at Talkdesk?',
  'Tell me about your enterprise AI experience',
  'Walk me through your career',
];

const STATUS_LABEL = {
  idle: 'Click to speak with Kris',
  connecting: 'Connecting...',
  listening: 'Listening...',
  speaking: 'Kris is speaking...',
  error: 'Something went wrong. Try again.',
};

const ORB_STYLES = `
@keyframes orb-idle-pulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.045); }
}
@keyframes orb-listen-pulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.08); }
}
@keyframes orb-spin {
  to { transform: rotate(360deg); }
}
@keyframes orb-ripple {
  0% { transform: scale(0.95); opacity: 0.55; }
  100% { transform: scale(1.65); opacity: 0; }
}
@keyframes orb-drift {
  0%, 100% { transform: translate3d(0, 0, 0) rotate(0deg); }
  50% { transform: translate3d(4%, -4%, 0) rotate(180deg); }
}
@media (prefers-reduced-motion: reduce) {
  .orb-animated { animation: none !important; }
}
`;

export default function AskKris() {
  return (
    <ConversationProvider>
      <AskKrisExperience />
    </ConversationProvider>
  );
}

function AskKrisExperience() {
  const [status, setStatus] = useState('idle');
  const orbRef = useRef(null);
  const glowRef = useRef(null);
  const frameRef = useRef(null);
  const levelRef = useRef(0);

  const conversation = useConversation({
    onConnect: () => setStatus('listening'),
    onDisconnect: () => setStatus('idle'),
    onError: (error) => {
      console.error(error);
      setStatus('error');
    },
    onModeChange: (mode) => {
      if (mode.mode === 'speaking') setStatus('speaking');
      if (mode.mode === 'listening') setStatus('listening');
    },
  });

  // Keep a stable handle on the conversation for the rAF loop and unmount cleanup.
  const conversationRef = useRef(conversation);
  conversationRef.current = conversation;

  // Drive the breathing animation from live output volume while Kris speaks.
  useEffect(() => {
    if (status !== 'speaking') {
      levelRef.current = 0;
      if (orbRef.current) orbRef.current.style.transform = '';
      if (glowRef.current) glowRef.current.style.opacity = '';
      return undefined;
    }

    const tick = () => {
      let volume = 0;
      try {
        volume = conversationRef.current?.getOutputVolume?.() ?? 0;
      } catch {
        volume = 0;
      }
      // Smooth the signal so the orb breathes instead of jittering.
      levelRef.current += (volume - levelRef.current) * 0.2;
      const level = Math.min(1, Math.max(0, levelRef.current));

      if (orbRef.current) {
        orbRef.current.style.transform = `scale(${1 + level * 0.28})`;
      }
      if (glowRef.current) {
        glowRef.current.style.opacity = String(0.5 + level * 0.5);
      }
      frameRef.current = requestAnimationFrame(tick);
    };

    frameRef.current = requestAnimationFrame(tick);
    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    };
  }, [status]);

  // Hang up if the visitor navigates away mid-conversation.
  useEffect(
    () => () => {
      try {
        conversationRef.current?.endSession?.();
      } catch {
        /* nothing to tear down */
      }
    },
    [],
  );

  const handleOrbClick = useCallback(async () => {
    if (status === 'connecting') return;

    if (status === 'idle' || status === 'error') {
      setStatus('connecting');
      try {
        await navigator.mediaDevices.getUserMedia({ audio: true });
        await conversation.startSession({
          agentId: AGENT_ID,
          connectionType: 'webrtc',
        });
      } catch (error) {
        console.error(error);
        setStatus('error');
      }
      return;
    }

    try {
      await conversation.endSession();
    } catch (error) {
      console.error(error);
    }
    setStatus('idle');
  }, [conversation, status]);

  const isLive = status === 'listening' || status === 'speaking';

  return (
    <div className="relative flex min-h-[calc(100vh-4rem)] flex-col items-center justify-between overflow-hidden px-6 py-12">
      <style>{ORB_STYLES}</style>

      {/* ambient backdrop */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-1/2 h-[720px] w-[720px] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-[0.18] blur-[120px]"
        style={{
          background:
            'radial-gradient(circle at 35% 35%, #149AFB, transparent 60%), radial-gradient(circle at 70% 70%, #13EF93, transparent 60%)',
        }}
      />

      <header className="relative z-10 text-center">
        <p className="text-xs font-medium uppercase tracking-[0.35em] text-slate-500">
          Ask Kris
        </p>
        <p className="mt-4 max-w-md text-balance text-lg text-slate-300 sm:text-xl">
          Talk to me to learn more about my background.
        </p>
      </header>

      <main className="relative z-10 flex flex-1 flex-col items-center justify-center gap-10 py-14">
        <Orb
          status={status}
          onClick={handleOrbClick}
          orbRef={orbRef}
          glowRef={glowRef}
        />

        <div className="flex flex-col items-center gap-2">
          <p
            aria-live="polite"
            className={[
              'text-sm transition-colors duration-300',
              status === 'error' ? 'text-red-300' : 'text-slate-300',
            ].join(' ')}
          >
            {STATUS_LABEL[status]}
          </p>
          <p className="h-4 text-xs text-slate-500">
            {isLive ? 'Click the orb to end the call' : 'Microphone required'}
          </p>
        </div>

        <div className="flex max-w-2xl flex-wrap justify-center gap-2">
          {SUGGESTED_QUESTIONS.map((question) => (
            <span
              key={question}
              className="cursor-default select-none rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-slate-400 transition-colors hover:text-white"
            >
              {question}
            </span>
          ))}
        </div>
      </main>

      <footer className="relative z-10 flex flex-col items-center gap-3 text-xs text-slate-500">
        <span>Kris Korich · Partnerships &amp; BD · Voice AI</span>
        <div className="flex items-center gap-5">
          <Link to="/deal-stories" className="transition-colors hover:text-white">
            View Deal Stories →
          </Link>
          <a
            href={LINKEDIN_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="transition-colors hover:text-white"
          >
            LinkedIn →
          </a>
        </div>
      </footer>
    </div>
  );
}

function Orb({ status, onClick, orbRef, glowRef }) {
  const isConnecting = status === 'connecting';
  const isListening = status === 'listening';
  const isSpeaking = status === 'speaking';
  const isError = status === 'error';

  const surface = isError
    ? 'radial-gradient(circle at 32% 28%, rgba(255,255,255,0.35), transparent 45%), linear-gradient(140deg, #f87171, #7f1d1d)'
    : isConnecting
      ? 'radial-gradient(circle at 32% 28%, rgba(255,255,255,0.4), transparent 45%), linear-gradient(140deg, #fbbf24, #b45309)'
      : 'radial-gradient(circle at 32% 28%, rgba(255,255,255,0.45), transparent 45%), linear-gradient(140deg, #149AFB 5%, #13EF93 95%)';

  const glow = isError
    ? 'radial-gradient(circle, rgba(248,113,113,0.55), transparent 65%)'
    : isConnecting
      ? 'radial-gradient(circle, rgba(251,191,36,0.5), transparent 65%)'
      : isSpeaking
        ? 'radial-gradient(circle, rgba(19,239,147,0.8), transparent 65%)'
        : isListening
          ? 'radial-gradient(circle, rgba(20,154,251,0.75), transparent 65%)'
          : 'radial-gradient(circle, rgba(20,154,251,0.45), rgba(19,239,147,0.25) 45%, transparent 68%)';

  const pulse = isListening
    ? 'orb-listen-pulse 1.6s ease-in-out infinite'
    : status === 'idle'
      ? 'orb-idle-pulse 4.5s ease-in-out infinite'
      : 'none';

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={
        isListening || isSpeaking
          ? 'End the conversation with Kris'
          : 'Start a conversation with Kris'
      }
      className="group relative flex h-[160px] w-[160px] items-center justify-center rounded-full outline-none transition-transform duration-300 hover:scale-[1.03] focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:ring-offset-4 focus-visible:ring-offset-ink-950 active:scale-[0.98] sm:h-[200px] sm:w-[200px]"
    >
      {/* outer glow */}
      <div
        ref={glowRef}
        aria-hidden="true"
        className="pointer-events-none absolute -inset-16 rounded-full blur-3xl transition-opacity duration-500"
        style={{ background: glow, opacity: isSpeaking ? 0.7 : 1 }}
      />

      {/* ripple rings while listening */}
      {isListening && (
        <>
          {[0, 0.7, 1.4].map((delay) => (
            <span
              key={delay}
              aria-hidden="true"
              className="orb-animated pointer-events-none absolute inset-0 rounded-full border border-[#149AFB]/50"
              style={{
                animation: `orb-ripple 2.1s ease-out ${delay}s infinite`,
              }}
            />
          ))}
        </>
      )}

      {/* connecting sweep */}
      {isConnecting && (
        <span
          aria-hidden="true"
          className="orb-animated pointer-events-none absolute -inset-3 rounded-full"
          style={{
            animation: 'orb-spin 1.1s linear infinite',
            background:
              'conic-gradient(from 0deg, transparent 0deg, rgba(251,191,36,0.85) 70deg, transparent 140deg)',
            mask: 'radial-gradient(farthest-side, transparent calc(100% - 3px), #000 calc(100% - 3px))',
            WebkitMask:
              'radial-gradient(farthest-side, transparent calc(100% - 3px), #000 calc(100% - 3px))',
          }}
        />
      )}

      {/* volume-driven wrapper */}
      <div
        ref={orbRef}
        className="absolute inset-0 rounded-full transition-transform duration-100 ease-out"
      >
        {/* core */}
        <div
          className="orb-animated absolute inset-0 rounded-full shadow-[inset_0_-12px_36px_rgba(7,7,16,0.6)]"
          style={{ background: surface, animation: pulse }}
        >
          {/* slow internal drift for depth */}
          <div
            aria-hidden="true"
            className="orb-animated absolute inset-0 overflow-hidden rounded-full opacity-60 mix-blend-screen"
            style={{
              animation: 'orb-drift 14s ease-in-out infinite',
              background:
                'radial-gradient(circle at 70% 65%, rgba(19,239,147,0.65), transparent 55%)',
            }}
          />
          {/* specular highlight */}
          <div
            aria-hidden="true"
            className="absolute inset-0 rounded-full"
            style={{
              background:
                'radial-gradient(circle at 30% 22%, rgba(255,255,255,0.55), transparent 38%)',
            }}
          />
          {/* rim light */}
          <div
            aria-hidden="true"
            className="absolute inset-0 rounded-full ring-1 ring-inset ring-white/20"
          />
        </div>
      </div>
    </button>
  );
}
