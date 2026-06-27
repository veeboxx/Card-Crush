import { useState, type ReactNode } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { Menu, X, Shuffle } from 'lucide-react';
import { NAV_ITEMS, SECONDARY_NAV } from './nav';
import { useCollection } from '../store/CollectionContext';

export default function Layout({ children }: { children: ReactNode }) {
  const [drawer, setDrawer] = useState(false);
  const navigate = useNavigate();
  const { cards } = useCollection();

  const surprise = () => {
    if (!cards.length) return;
    const c = cards[Math.floor(Math.random() * cards.length)];
    navigate(`/card/${c.id}`);
    setDrawer(false);
  };

  const navLink = (active: boolean) =>
    `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${
      active ? 'bg-crush/15 text-white' : 'text-white/55 hover:bg-white/5 hover:text-white/80'
    }`;

  return (
    <div className="min-h-screen md:flex">
      {/* Mobile top bar */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-hairline bg-ink/80 px-3 py-2.5 backdrop-blur-xl md:hidden">
        <button onClick={() => setDrawer(true)} className="rounded-xl p-1.5 text-white/70 active:scale-90">
          <Menu size={22} />
        </button>
        <Link to="/" className="font-display text-lg font-extrabold tracking-tight">
          <span className="text-gradient">Card Crush</span>
        </Link>
        <button onClick={surprise} aria-label="Surprise me" className="rounded-xl p-1.5 text-white/70 active:scale-90 active:rotate-12">
          <Shuffle size={20} />
        </button>
      </header>

      {/* Mobile drawer */}
      {drawer && (
        <div className="fixed inset-0 z-50 md:hidden" onClick={() => setDrawer(false)}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div className="absolute inset-y-0 left-0 w-72 animate-fade-up border-r border-hairline bg-ink p-3" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-2 py-2">
              <span className="flex items-center gap-2">
                <img src="/logo.png" alt="" className="h-7 w-7 object-contain" />
                <span className="font-display text-xl font-extrabold text-gradient">Card Crush</span>
              </span>
              <button onClick={() => setDrawer(false)} className="text-white/60"><X size={20} /></button>
            </div>
            <nav className="mt-2 space-y-1">
              {[...NAV_ITEMS, ...SECONDARY_NAV].map((item) => (
                <NavLink key={item.to} to={item.to} end={item.to === '/'} onClick={() => setDrawer(false)} className={({ isActive }) => navLink(isActive)}>
                  <item.icon size={18} /> {item.label}
                </NavLink>
              ))}
            </nav>
          </div>
        </div>
      )}

      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-white/[0.06] bg-white/[0.03] backdrop-blur-2xl md:flex" style={{ boxShadow: 'inset -1px 0 0 rgba(255,255,255,0.04)' }}>
        <Link to="/" className="flex items-center gap-2.5 px-5 py-5">
          <img src="/logo.png" alt="Card Crush" className="h-9 w-9 object-contain drop-shadow-[0_2px_8px_rgba(157,123,255,0.45)]" />
          <div>
            <p className="font-display text-lg font-extrabold leading-none tracking-tight text-white">Card Crush</p>
            <p className="text-[10px] uppercase tracking-[0.2em] text-white/40">Collector Vault</p>
          </div>
        </Link>
        <nav className="flex-1 space-y-1 px-3">
          {NAV_ITEMS.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.to === '/'} className={({ isActive }) => navLink(isActive)}>
              <item.icon size={18} /> {item.label}
            </NavLink>
          ))}
          <div className="my-2 h-px bg-white/5" />
          {SECONDARY_NAV.map((item) => (
            <NavLink key={item.to} to={item.to} className={({ isActive }) => navLink(isActive)}>
              <item.icon size={18} /> {item.label}
            </NavLink>
          ))}
        </nav>
        <button onClick={surprise} className="m-3 flex items-center justify-center gap-2 rounded-xl bg-white/5 py-2.5 text-sm font-semibold text-white/70 transition hover:bg-white/10">
          <Shuffle size={16} /> Surprise me
        </button>
      </aside>

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-5 md:px-8 md:py-8">{children}</main>
    </div>
  );
}
