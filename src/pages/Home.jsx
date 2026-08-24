import { Link } from 'react-router-dom';
import ToolCard from '../components/ToolCard.jsx';
import { tools } from '../data/tools.js';

export default function Home() {
  const featuredTools = [...tools].sort(
    (a, b) =>
      Number(b.badge === 'FEATURED') - Number(a.badge === 'FEATURED'),
  );

  return (
    <div>
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 bg-hero-radial" />
        <div className="container-page relative py-24 sm:py-32">
          <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-slate-300">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            Available for new projects
          </p>
          <h1 className="text-4xl font-semibold leading-[1.05] tracking-tight text-white sm:text-6xl">
            Kris Korich
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-relaxed text-slate-300 sm:text-xl">
            <span className="gradient-text font-medium">
              AI-Powered Tools for Sales, Partnerships &amp; Voice AI
            </span>
          </p>
          <p className="mt-6 max-w-2xl text-base leading-relaxed text-slate-400">
            I design and ship practical AI tools that move pipeline, unlock
            partnerships, and bring conversations to life with voice. This is a
            living portfolio of the things I&apos;ve built and the experiments
            I&apos;m running next.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              to="/tools"
              className="inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2.5 text-sm font-semibold text-ink-950 transition hover:bg-slate-200"
            >
              Explore the tools
            </Link>
            <a
              href="https://www.linkedin.com/in/kris-korich/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-semibold text-slate-200 transition hover:border-white/20 hover:bg-white/10"
            >
              Connect on LinkedIn
            </a>
          </div>
        </div>
      </section>

      <section className="container-page py-16 sm:py-20">
        <div className="mb-10 flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent-blue/80">
              Featured work
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-white sm:text-3xl">
              Tools I&apos;ve built
            </h2>
          </div>
          <Link
            to="/tools"
            className="hidden text-sm font-medium text-slate-400 transition hover:text-white sm:inline"
          >
            View all →
          </Link>
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-2">
          {featuredTools.map((tool) => (
            <ToolCard key={tool.slug} tool={tool} />
          ))}
        </div>
      </section>
    </div>
  );
}
