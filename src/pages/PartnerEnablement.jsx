import { useState } from 'react';
import PageHeader from '../components/PageHeader.jsx';
import { generatePartnerKitPdf } from '../lib/partnerKitPdf.js';

const CLAUDE_MODEL = 'claude-sonnet-4-6';

const PARTNER_TYPES = [
  'GSI (Global Systems Integrator)',
  'Reseller',
  'Referral Partner',
  'Tech/ISV',
  'Consultant',
];

const INDUSTRIES = [
  'Financial Services',
  'Healthcare',
  'Retail',
  'Telecom',
  'Government',
  'Multi-industry',
];

const TECH_STACK = [
  'Salesforce',
  'AWS',
  'Azure',
  'Google Cloud',
  'Microsoft',
  'SAP',
  'ServiceNow',
  'Other',
];

const REGIONS = [
  'North America',
  'EMEA',
  'APAC',
  'Latin America',
  'Global',
];

const SYSTEM_PROMPT = `You are a senior partnerships enablement manager at Deepgram, a voice AI company. Generate a comprehensive partner enablement kit for a new partner. Return ONLY valid JSON, no markdown.

Deepgram's products:
- STT: Nova-3 (mono/multi/batch) and Flux (English/Multi) — industry leading accuracy
- TTS: Aura-2, Flux TTS — natural, low latency voices
- Voice Agent API — end-to-end conversational AI
- Audio Intelligence: Summarization, Sentiment Analysis, Topic Detection, Speaker Diarization, Redaction, Keyterm Prompting

Return this JSON structure:
{
  "partnerName": "string",
  "partnerType": "string",
  "industry": "string",
  "region": "string",
  "welcomeMessage": "string (2-3 warm, professional paragraphs welcoming this partner type to Deepgram)",
  "partnershipOverview": "string (what success looks like for this partner type specifically)",
  "productOverview": {
    "stt": "string (2-3 sentences on STT tailored to this partner type and industry)",
    "tts": "string (2-3 sentences on TTS)",
    "voiceAgent": "string (2-3 sentences on Voice Agent API)",
    "audioIntelligence": "string (2-3 sentences on Audio Intelligence features)"
  },
  "whenToUseWhat": {
    "novaVsFlux": "string (clear guidance: use Nova-3 for batch/post-call/cost-sensitive; use Flux for real-time/streaming/voice agents/lowest latency)",
    "saasVsSelfHosted": "string (SaaS is fastest to deploy and recommended for most; self-hosted for regulated industries, data residency requirements, or high volume with specific compliance needs)",
    "streamingVsBatch": "string (streaming for real-time agent assist, voice agents, live transcription; batch for post-call analytics, compliance recording, large file processing)"
  },
  "useCases": [
    {
      "title": "string",
      "description": "string (2-3 sentences)",
      "recommendedProducts": ["array of Deepgram products"],
      "customerPainPoint": "string"
    }
  ],
  "coSellMotion": {
    "howToIdentifyOpportunities": "string (3-4 sentences specific to this partner type)",
    "engagingDeeepgram": "string (how and when to bring Deepgram into a deal)",
    "dealRegistration": "string (explain deal registration importance and process)"
  },
  "discoveryQuestions": ["array of 8-10 questions the partner should ask their customers to surface Deepgram opportunities — specific to their industry and partner type"],
  "objectionHandling": [
    {
      "objection": "string",
      "response": "string (2-3 sentences)"
    }
  ],
  "competitivePositioning": {
    "vsGoogle": "string (2-3 sentences on how to win vs Google STT)",
    "vsAWS": "string (2-3 sentences on how to win vs AWS Transcribe)",
    "vsAzure": "string (2-3 sentences on how to win vs Azure Speech)",
    "vsAssemblyAI": "string (2-3 sentences on how to win vs AssemblyAI)",
    "keyDifferentiators": ["array of 5 Deepgram differentiators"]
  },
  "gtmMotion": "string (3-4 sentences on recommended GTM approach specific to this partner type — GSIs should focus on SI practice building, resellers on margin and deal reg, ISVs on native integration, etc.)",
  "technicalBestPractices": {
    "gettingStarted": "string (how to get an API key and run first test at developers.deepgram.com)",
    "keyParameters": "string (important API parameters to know: model, language, smart_format, diarize, redact, keyterms)",
    "saasSetup": "string (SaaS setup best practices)",
    "selfHostedConsiderations": "string (when and how to consider self-hosted)"
  },
  "onboardingChecklist": [
    "string (actionable checklist items in order)"
  ],
  "nextSteps": "string (2-3 sentences on immediate next steps for this partner)"
}

Generate 5 use cases relevant to the partner industry. Generate 5 objection handling pairs covering the most common objections for this partner type. The onboarding checklist should have 8-10 items. Make everything specific to the partner type, industry, tech stack, and region provided.`;

const INITIAL_FORM = {
  partnerName: '',
  partnerType: PARTNER_TYPES[0],
  industry: INDUSTRIES[0],
  techStack: [],
  region: REGIONS[0],
};

export default function PartnerEnablement() {
  const [form, setForm] = useState(INITIAL_FORM);
  const [phase, setPhase] = useState('idle'); // idle | generating | done | error
  const [kit, setKit] = useState(null);
  const [error, setError] = useState(null);

  const canGenerate = form.partnerName.trim().length > 0 && phase !== 'generating';

  const update = (field, value) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const toggleStack = (item) =>
    setForm((prev) => ({
      ...prev,
      techStack: prev.techStack.includes(item)
        ? prev.techStack.filter((x) => x !== item)
        : [...prev.techStack, item],
    }));

  async function handleGenerate(e) {
    e?.preventDefault();
    if (!canGenerate) return;
    setError(null);
    setPhase('generating');

    const userMessage = `Generate a partner enablement kit with the following details:
- Partner Company Name: ${form.partnerName.trim()}
- Partner Type: ${form.partnerType}
- Primary Industry Focus: ${form.industry}
- Existing Tech Stack: ${form.techStack.length ? form.techStack.join(', ') : 'Not specified'}
- Primary Region: ${form.region}`;

    try {
      const res = await fetch('/api/anthropic', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          model: CLAUDE_MODEL,
          max_tokens: 6000,
          system: SYSTEM_PROMPT,
          messages: [{ role: 'user', content: userMessage }],
        }),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(
          `Claude API error (${res.status}): ${text.slice(0, 200)}`
        );
      }
      const data = await res.json();
      const text = data?.content?.[0]?.text || '';
      const parsed = extractJson(text);
      if (!parsed || !parsed.welcomeMessage) {
        throw new Error(
          `Could not parse the enablement kit from the response. Raw response (first 200 chars): ${text.substring(0, 200)}`
        );
      }
      // Ensure header fields reflect the form input.
      parsed.partnerName = parsed.partnerName || form.partnerName.trim();
      parsed.partnerType = form.partnerType;
      parsed.industry = form.industry;
      parsed.region = form.region;
      setKit(parsed);
      setPhase('done');
    } catch (err) {
      setError(err?.message || 'Unknown error generating the kit.');
      setPhase('error');
    }
  }

  function handleReset() {
    setKit(null);
    setError(null);
    setPhase('idle');
  }

  return (
    <section className="container-page py-16 sm:py-20">
      <PageHeader
        eyebrow="Tool"
        title="Partner Enablement Kit Generator"
        description="Generate a custom onboarding kit for any new Deepgram partner"
      />

      {phase !== 'generating' && phase !== 'done' && (
        <form onSubmit={handleGenerate} className="space-y-5">
          <div className="card-surface">
            <div className="relative space-y-5 p-6 sm:p-8">
              <Field label="Partner Company Name" required>
                <input
                  type="text"
                  value={form.partnerName}
                  onChange={(e) => update('partnerName', e.target.value)}
                  placeholder="Accenture, IBM, Five9..."
                  className={inputClass}
                />
              </Field>

              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <Field label="Partner Type">
                  <select
                    value={form.partnerType}
                    onChange={(e) => update('partnerType', e.target.value)}
                    className={inputClass}
                  >
                    {PARTNER_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </Field>

                <Field label="Primary Industry Focus">
                  <select
                    value={form.industry}
                    onChange={(e) => update('industry', e.target.value)}
                    className={inputClass}
                  >
                    {INDUSTRIES.map((i) => (
                      <option key={i} value={i}>
                        {i}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>

              <Field label="Existing Tech Stack">
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {TECH_STACK.map((item) => (
                    <CheckboxRow
                      key={item}
                      checked={form.techStack.includes(item)}
                      onChange={() => toggleStack(item)}
                      label={item}
                    />
                  ))}
                </div>
              </Field>

              <div className="sm:max-w-xs">
                <Field label="Primary Region">
                  <select
                    value={form.region}
                    onChange={(e) => update('region', e.target.value)}
                    className={inputClass}
                  >
                    {REGIONS.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={!canGenerate}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#00e5a0] px-6 py-3.5 text-base font-semibold text-ink-950 transition hover:bg-[#00cf90] disabled:cursor-not-allowed disabled:bg-[#00e5a0]/40 disabled:text-ink-950/60 sm:w-auto"
                >
                  Generate Enablement Kit
                </button>
                {!form.partnerName.trim() && (
                  <p className="mt-3 text-xs text-slate-500">
                    Enter a partner company name to generate a kit.
                  </p>
                )}
              </div>
            </div>
          </div>
        </form>
      )}

      {phase === 'generating' && <GeneratingState partnerName={form.partnerName} />}

      {phase === 'done' && kit && (
        <KitResult kit={kit} onReset={handleReset} />
      )}

      {phase === 'error' && (
        <div className="mt-6 rounded-2xl border border-red-500/30 bg-red-500/10 p-6">
          <p className="text-sm font-semibold text-red-200">
            Something went wrong
          </p>
          <p className="mt-2 text-sm text-red-100/80">{error}</p>
          <button
            type="button"
            onClick={() => setPhase('idle')}
            className="mt-4 inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:border-white/20 hover:bg-white/10"
          >
            Try again
          </button>
        </div>
      )}

      <p className="mt-12 text-center text-xs text-slate-500">
        Powered by Claude + Deepgram · PDF generated client-side
      </p>
    </section>
  );
}

const inputClass =
  'w-full rounded-lg border border-white/10 bg-ink-900/60 px-3 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 transition focus:border-[#00e5a0]/60 focus:outline-none focus:ring-2 focus:ring-[#00e5a0]/30';

function Field({ label, required, children }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-400">
        {label}
        {required && <span className="ml-1 text-[#00e5a0]">*</span>}
      </span>
      {children}
    </label>
  );
}

function CheckboxRow({ checked, onChange, label }) {
  return (
    <label
      className={
        'flex cursor-pointer items-center gap-2.5 rounded-lg border px-3 py-2 text-sm transition ' +
        (checked
          ? 'border-[#00e5a0]/50 bg-[#00e5a0]/10 text-white'
          : 'border-white/10 bg-ink-900/40 text-slate-300 hover:border-white/20 hover:bg-ink-900/70')
      }
    >
      <span
        className={
          'flex h-4 w-4 flex-none items-center justify-center rounded border transition ' +
          (checked
            ? 'border-[#00e5a0] bg-[#00e5a0] text-ink-950'
            : 'border-white/20 bg-transparent')
        }
      >
        {checked && (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            className="h-3 w-3"
            aria-hidden="true"
          >
            <path
              fillRule="evenodd"
              d="M16.7 5.3a1 1 0 0 1 0 1.4l-7.5 7.5a1 1 0 0 1-1.4 0L3.3 9.7a1 1 0 1 1 1.4-1.4l3.8 3.8 6.8-6.8a1 1 0 0 1 1.4 0Z"
              clipRule="evenodd"
            />
          </svg>
        )}
      </span>
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className="sr-only"
      />
      <span>{label}</span>
    </label>
  );
}

function GeneratingState({ partnerName }) {
  return (
    <div className="card-surface">
      <div className="relative flex flex-col items-center justify-center gap-5 p-12 text-center">
        <div className="relative">
          <span className="absolute -inset-1 rounded-full bg-[#00e5a0] opacity-50 blur-md" />
          <div className="relative h-14 w-14 animate-spin rounded-full border-2 border-white/20 border-t-[#00e5a0]" />
        </div>
        <div>
          <p className="text-base font-semibold text-white">
            Generating your partner enablement kit...
          </p>
          <p className="mt-1 text-sm text-slate-400">
            Tailoring content for {partnerName.trim() || 'your partner'} — this
            takes 15–30 seconds.
          </p>
        </div>
      </div>
    </div>
  );
}

function KitResult({ kit, onReset }) {
  const meta = [kit.partnerType, kit.industry, kit.region]
    .filter(Boolean)
    .join('  ·  ');

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-[#00e5a0]/25 bg-gradient-to-br from-[#00e5a0]/10 via-[#00e5a0]/5 to-transparent p-6 sm:p-8">
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#00e5a0]">
          Enablement kit ready
        </p>
        <h2 className="mt-2 text-2xl font-semibold tracking-tight text-white">
          {kit.partnerName}
        </h2>
        <p className="mt-1 text-sm text-slate-400">{meta}</p>

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => generatePartnerKitPdf(kit)}
            className="inline-flex items-center gap-2 rounded-xl bg-[#00e5a0] px-5 py-2.5 text-sm font-semibold text-ink-950 transition hover:bg-[#00cf90]"
          >
            <DownloadIcon /> Download PDF Kit
          </button>
          <button
            type="button"
            onClick={onReset}
            className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-5 py-2.5 text-sm font-semibold text-slate-200 transition hover:border-white/20 hover:bg-white/10"
          >
            Generate another
          </button>
        </div>
      </div>

      <div className="card-surface">
        <div className="relative space-y-6 p-6 sm:p-8">
          <Preview label="Welcome" text={kit.welcomeMessage} />
          <Preview label="Partnership Overview" text={kit.partnershipOverview} />

          {kit.useCases?.length > 0 && (
            <div>
              <PreviewLabel>Key Use Cases</PreviewLabel>
              <ul className="mt-3 space-y-3">
                {kit.useCases.map((uc, i) => (
                  <li
                    key={i}
                    className="rounded-xl border border-white/10 bg-ink-900/40 p-4"
                  >
                    <p className="text-sm font-semibold text-white">
                      {uc.title}
                    </p>
                    {uc.description && (
                      <p className="mt-1 text-sm leading-relaxed text-slate-300">
                        {uc.description}
                      </p>
                    )}
                    {uc.recommendedProducts?.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {uc.recommendedProducts.map((p) => (
                          <span
                            key={p}
                            className="rounded-full border border-[#00e5a0]/30 bg-[#00e5a0]/10 px-2.5 py-0.5 text-[11px] font-medium text-[#00e5a0]"
                          >
                            {p}
                          </span>
                        ))}
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {kit.discoveryQuestions?.length > 0 && (
            <div>
              <PreviewLabel>Discovery Questions</PreviewLabel>
              <ol className="mt-3 space-y-1.5">
                {kit.discoveryQuestions.map((q, i) => (
                  <li key={i} className="flex gap-2 text-sm text-slate-300">
                    <span className="font-semibold text-[#00e5a0]">
                      {i + 1}.
                    </span>
                    <span>{q}</span>
                  </li>
                ))}
              </ol>
            </div>
          )}

          {kit.competitivePositioning?.keyDifferentiators?.length > 0 && (
            <div>
              <PreviewLabel>Key Differentiators</PreviewLabel>
              <ul className="mt-3 space-y-1.5">
                {kit.competitivePositioning.keyDifferentiators.map((d, i) => (
                  <li key={i} className="flex gap-2 text-sm text-slate-300">
                    <span className="text-[#00e5a0]">•</span>
                    <span>{d}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <p className="border-t border-white/5 pt-5 text-xs text-slate-500">
            This is a preview. Download the PDF for the complete 12-page kit,
            including product overviews, decision guides, co-sell motion,
            objection handling, GTM strategy, technical best practices, and an
            onboarding checklist.
          </p>
        </div>
      </div>
    </div>
  );
}

function Preview({ label, text }) {
  if (!text) return null;
  return (
    <div>
      <PreviewLabel>{label}</PreviewLabel>
      <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-slate-300">
        {text}
      </p>
    </div>
  );
}

function PreviewLabel({ children }) {
  return (
    <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#00e5a0]">
      {children}
    </p>
  );
}

function DownloadIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4"
      aria-hidden="true"
    >
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  );
}

function extractJson(text) {
  if (!text) return null;
  try {
    // Remove markdown code blocks if present
    const cleaned = text
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .trim();

    // Try to find the JSON object in the response
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    throw new Error('No valid JSON found in response');
  } catch {
    return null;
  }
}
