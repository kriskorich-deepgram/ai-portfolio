import { Link } from 'react-router-dom';

export default function ToolCard({ tool }) {
  const isDisabled = tool.href === '#';
  const isInternal = !tool.external && tool.href.startsWith('/');
  const isFeatured = tool.badge === 'FEATURED';

  const inner = (
    <>
      <div
        className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${tool.accent} opacity-60`}
      />
      <div className="pointer-events-none absolute inset-px rounded-[15px] bg-ink-800/85" />

      <div className="relative flex h-full flex-col gap-4 p-6">
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-lg font-semibold tracking-tight text-white">
            {tool.name}
          </h3>
          <div className="flex shrink-0 items-center gap-2">
            {isFeatured && <FeaturedBadge />}
            <StatusPill status={tool.status} />
          </div>
        </div>

        <p className="text-sm leading-relaxed text-slate-300">{tool.tagline}</p>

        <div className="mt-auto flex flex-wrap items-center gap-2 pt-2">
          {tool.tags.map((tag) => (
            <span
              key={tag}
              className="rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5 text-[11px] font-medium tracking-wide text-slate-300"
            >
              {tag}
            </span>
          ))}
        </div>

        <div className="flex items-center gap-1 pt-1 text-sm font-medium text-accent-blue">
          {isDisabled ? 'In development' : 'Open tool'}
          {!isDisabled && <Arrow />}
        </div>
      </div>
    </>
  );

  const cardClasses =
    'card-surface block h-full' +
    (isDisabled ? ' cursor-not-allowed opacity-80' : '');

  if (isDisabled) {
    return <div className={cardClasses}>{inner}</div>;
  }

  if (isInternal) {
    return (
      <Link to={tool.href} className={cardClasses}>
        {inner}
      </Link>
    );
  }

  return (
    <a
      href={tool.href}
      target="_blank"
      rel="noopener noreferrer"
      className={cardClasses}
    >
      {inner}
    </a>
  );
}

function FeaturedBadge() {
  return (
    <span className="rounded-full border border-accent-green/30 bg-accent-green/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-accent-green">
      Featured
    </span>
  );
}

function StatusPill({ status }) {
  const isLive = status === 'Live';
  return (
    <span
      className={
        'rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ' +
        (isLive
          ? 'bg-emerald-400/15 text-emerald-300'
          : 'bg-white/5 text-slate-400')
      }
    >
      {status}
    </span>
  );
}

function Arrow() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 20"
      fill="currentColor"
      className="h-4 w-4"
      aria-hidden="true"
    >
      <path
        fillRule="evenodd"
        d="M5.22 14.78a.75.75 0 0 1 0-1.06L12.94 6H7.5a.75.75 0 0 1 0-1.5h7.25c.41 0 .75.34.75.75V12.5a.75.75 0 0 1-1.5 0V7.06l-7.72 7.72a.75.75 0 0 1-1.06 0Z"
        clipRule="evenodd"
      />
    </svg>
  );
}
