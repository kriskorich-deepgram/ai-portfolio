import { useState } from 'react';
import PageHeader from '../components/PageHeader.jsx';
import VoiceAgentDemo from '../components/VoiceAgentDemo.jsx';
import { VOICE_DEMOS } from '../data/voiceDemos.js';

export default function VoiceDemos() {
  const [activeDemo, setActiveDemo] = useState(null);

  return (
    <section className="container-page py-16 sm:py-20">
      <PageHeader
        eyebrow="Live demos"
        title="Voice AI Demos"
        description="Experience Deepgram-powered voice agents across six industries. Each demo runs a full conversation in your browser — Deepgram streaming STT, your choice of frontier LLM, Deepgram Flux TTS playback, and a latency scorecard when you hang up."
      />

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
        {VOICE_DEMOS.map((demo) => (
          <DemoCard
            key={demo.id}
            demo={demo}
            onStart={() => setActiveDemo(demo)}
          />
        ))}
      </div>

      <p className="mt-10 text-xs text-slate-500">
        Demos use your microphone and play synthesized audio. Allow mic access
        when prompted.
      </p>

      {activeDemo && (
        <VoiceAgentDemo
          key={activeDemo.id}
          config={activeDemo}
          onClose={() => setActiveDemo(null)}
        />
      )}
    </section>
  );
}

function DemoCard({ demo, onStart }) {
  return (
    <article className="card-surface flex h-full flex-col">
      <div className="relative flex h-full flex-col gap-5 p-6">
        <div className="flex items-start gap-4">
          <div
            className="flex h-14 w-14 flex-none items-center justify-center rounded-full text-xl font-bold text-white shadow-lg"
            style={{ backgroundColor: demo.accentHex }}
            aria-hidden="true"
          >
            {demo.avatarInitial}
          </div>
          <div className="min-w-0">
            <p
              className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.18em]"
              style={{ color: demo.accentHex }}
            >
              <IndustryIcon name={demo.icon} />
              {demo.industryEyebrow}
            </p>
            <h3 className="mt-1 text-lg font-semibold tracking-tight text-white">
              {demo.agentName}
            </h3>
            <p className="text-xs text-slate-400">{demo.agentTitle}</p>
          </div>
        </div>

        <p className="text-sm leading-relaxed text-slate-300">
          {demo.description}
        </p>

        <div className="flex flex-wrap gap-1.5">
          <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5 text-[11px] font-medium text-slate-300">
            {demo.useCase}
          </span>
          <span
            className="rounded-full border px-2.5 py-0.5 text-[11px] font-mono"
            style={{
              borderColor: demo.accentHex + '55',
              color: demo.accentHex,
              backgroundColor: demo.accentHex + '14',
            }}
          >
            {demo.voice}
          </span>
        </div>

        <button
          type="button"
          onClick={onStart}
          className="mt-auto inline-flex items-center justify-between gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-90"
          style={{ backgroundColor: demo.accentHex }}
        >
          Start Demo
          <ArrowRight />
        </button>
      </div>
    </article>
  );
}

const ICON_PATHS = {
  healthcare: <path d="M3 12h4l2-5 3 10 2.5-5H21" />,
  airlines: <path d="M17.8 19.2 16 11l3.5-3.5a2.1 2.1 0 0 0-3-3L13 8 4.8 6.2a.6.6 0 0 0-.6.9l3 5-2.4 2.4H3a.5.5 0 0 0-.3.9l3 2 2 3a.5.5 0 0 0 .9-.3v-1.8L11 16l5 3a.6.6 0 0 0 .9-.6z" />,
  banking: (
    <>
      <path d="M3 10h18L12 4 3 10z" />
      <path d="M5 10v8M10 10v8M14 10v8M19 10v8M3 20h18" />
    </>
  ),
  retail: (
    <>
      <path d="M6 2 3 7v13a1 1 0 0 0 1 1h16a1 1 0 0 0 1-1V7l-3-5z" />
      <path d="M3 7h18M16 11a4 4 0 0 1-8 0" />
    </>
  ),
  government: (
    <>
      <path d="M2 20h20M4 20V10M8 20V10M12 20V10M16 20V10M20 20V10M12 3 2 9h20z" />
    </>
  ),
  hospitality: (
    <>
      <path d="M4 21V9a8 8 0 0 1 16 0v12" />
      <path d="M2 21h20M12 5V3" />
    </>
  ),
};

function IndustryIcon({ name }) {
  const paths = ICON_PATHS[name];
  if (!paths) return null;
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-3.5 w-3.5 flex-none"
      aria-hidden="true"
    >
      {paths}
    </svg>
  );
}

function ArrowRight() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4"
      aria-hidden="true"
    >
      <line x1="5" y1="12" x2="19" y2="12" />
      <polyline points="12 5 19 12 12 19" />
    </svg>
  );
}
