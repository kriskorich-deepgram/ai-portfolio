import { useEffect, useRef, useState } from 'react';
import { NavLink, Link } from 'react-router-dom';

const LINKEDIN_URL = 'https://www.linkedin.com/in/kris-korich/';

const NAV_LINKS = [
  { to: '/', label: 'Home', end: true },
  { to: '/tools', label: 'Tools' },
  { to: '/insights', label: 'Insights' },
  { to: '/deal-stories', label: 'Deal Stories' },
  { to: '/about', label: 'About' },
];

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

function mobileNavLinkClass({ isActive }) {
  return [
    'block py-3 text-base transition-colors',
    isActive ? 'text-white' : 'text-slate-400 hover:text-white',
  ].join(' ');
}

function mobileAskKrisLinkClass({ isActive }) {
  return [
    'flex items-center gap-2 py-3 text-base transition-colors',
    isActive ? 'text-emerald-400' : 'text-slate-400 hover:text-emerald-300',
  ].join(' ');
}

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const headerRef = useRef(null);

  useEffect(() => {
    if (!menuOpen) return undefined;

    function handlePointerDown(event) {
      if (headerRef.current && !headerRef.current.contains(event.target)) {
        setMenuOpen(false);
      }
    }

    function handleKeyDown(event) {
      if (event.key === 'Escape') setMenuOpen(false);
    }

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('touchstart', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('touchstart', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [menuOpen]);

  const closeMenu = () => setMenuOpen(false);

  return (
    <header
      ref={headerRef}
      className="sticky top-0 z-40 border-b border-white/5 bg-ink-950/70 backdrop-blur-md"
    >
      <div className="container-page flex h-16 items-center justify-between">
        <Link to="/" className="group flex items-center gap-2" onClick={closeMenu}>
          <span className="flex h-7 w-7 items-center justify-center rounded-md bg-gradient-to-br from-accent-blue to-accent-violet text-xs font-bold text-white shadow-glow">
            KK
          </span>
          <span className="text-sm font-semibold tracking-tight text-slate-100 group-hover:text-white">
            Kris Korich
          </span>
        </Link>

        <nav className="hidden items-center gap-7 md:flex">
          {NAV_LINKS.map((link) => (
            <NavLink key={link.to} to={link.to} end={link.end} className={navLinkClass}>
              {link.label}
            </NavLink>
          ))}
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

        <button
          type="button"
          onClick={() => setMenuOpen((open) => !open)}
          aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={menuOpen}
          aria-controls="mobile-nav"
          className="flex h-9 w-9 items-center justify-center rounded-md border border-white/10 bg-white/5 text-slate-300 transition hover:border-white/20 hover:bg-white/10 hover:text-white md:hidden"
        >
          {menuOpen ? <CloseIcon /> : <MenuIcon />}
        </button>
      </div>

      {menuOpen && (
        <nav
          id="mobile-nav"
          className="w-full border-t border-white/5 bg-ink-950/95 backdrop-blur-md md:hidden"
        >
          <div className="container-page flex flex-col py-2">
            {NAV_LINKS.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.end}
                className={mobileNavLinkClass}
                onClick={closeMenu}
              >
                {link.label}
              </NavLink>
            ))}
            <NavLink to="/ask-kris" className={mobileAskKrisLinkClass} onClick={closeMenu}>
              <LiveDot />
              Ask Kris
            </NavLink>
            <a
              href={LINKEDIN_URL}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="LinkedIn"
              onClick={closeMenu}
              className="flex items-center gap-2 py-3 text-base text-slate-400 transition-colors hover:text-white"
            >
              <LinkedInIcon />
              LinkedIn
            </a>
          </div>
        </nav>
      )}
    </header>
  );
}

function MenuIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      className="h-5 w-5"
      aria-hidden="true"
    >
      <path d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      className="h-5 w-5"
      aria-hidden="true"
    >
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
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
