import { NavLink, Link } from 'react-router-dom';

const LINKEDIN_URL = 'https://www.linkedin.com/in/kris-korich/';

function navLinkClass({ isActive }) {
  return [
    'text-sm transition-colors',
    isActive ? 'text-white' : 'text-slate-400 hover:text-white',
  ].join(' ');
}

function askKrisLinkClass({ isActive }) {
  return [
    'group flex items-center gap-2 text-sm transition-all',
    'hover:text-emerald-300 hover:drop-shadow-[0_0_10px_rgba(52,211,153,0.55)]',
    isActive ? 'text-emerald-400' : 'text-slate-400',
  ].join(' ');
}

export default function Navbar() {
  return (
    <header className="sticky top-0 z-40 border-b border-white/5 bg-ink-950/70 backdrop-blur-md">
      <div className="container-page flex h-16 items-center justify-between">
        <Link to="/" className="group flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-md bg-gradient-to-br from-accent-blue to-accent-violet text-xs font-bold text-white shadow-glow">
            KK
          </span>
          <span className="text-sm font-semibold tracking-tight text-slate-100 group-hover:text-white">
            Kris Korich
          </span>
        </Link>

        <nav className="flex items-center gap-7">
          <NavLink to="/" end className={navLinkClass}>
            Home
          </NavLink>
          <NavLink to="/tools" className={navLinkClass}>
            Tools
          </NavLink>
          <NavLink to="/insights" className={navLinkClass}>
            Insights
          </NavLink>
          <NavLink to="/deal-stories" className={navLinkClass}>
            Deal Stories
          </NavLink>
          <NavLink to="/about" className={navLinkClass}>
            About
          </NavLink>
          <NavLink to="/ask-kris" className={askKrisLinkClass}>
            <LiveDot />
            Ask Kris
          </NavLink>
          <a
            href={LINKEDIN_URL}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="LinkedIn"
            className="flex h-8 w-8 items-center justify-center rounded-md border border-white/10 bg-white/5 text-slate-300 transition hover:border-white/20 hover:bg-white/10 hover:text-white"
          >
            <LinkedInIcon />
          </a>
        </nav>
      </div>
    </header>
  );
}

function LiveDot() {
  return (
    <span aria-hidden="true" className="relative flex h-1.5 w-1.5">
      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
      <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.9)]" />
    </span>
  );
}

function LinkedInIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      className="h-4 w-4"
      aria-hidden="true"
    >
      <path d="M20.45 20.45h-3.55v-5.57c0-1.33-.02-3.04-1.85-3.04-1.86 0-2.14 1.45-2.14 2.94v5.67H9.36V9h3.41v1.56h.05c.47-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.45v6.29zM5.34 7.43a2.06 2.06 0 1 1 0-4.12 2.06 2.06 0 0 1 0 4.12zM7.12 20.45H3.56V9h3.56v11.45zM22.22 0H1.77C.79 0 0 .77 0 1.72v20.56C0 23.23.79 24 1.77 24h20.45C23.2 24 24 23.23 24 22.28V1.72C24 .77 23.2 0 22.22 0z" />
    </svg>
  );
}
