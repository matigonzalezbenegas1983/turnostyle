import { Link, useLocation } from 'react-router-dom';
import LightEffect from './LightEffect';

export default function Layout({ children }: { children: React.ReactNode }) {
  const { pathname } = useLocation();
  const isAdmin = pathname.startsWith('/admin');

  return (
    <div className="relative min-h-screen">

      {/* ── Background layers (bottom → top) ────────── */}
      {/* 1. Barbershop photo  (z-0, opacity 0.30) */}
      <div className="barber-bg-photo" />
      {/* 2. Dark warm overlay */}
      <div className="barber-bg-overlay" />
      {/* 3. Dot mesh "trama"  */}
      <div className="barber-bg-mesh" />
      {/* 4. Ambient dunes     */}
      <div className="ambient-dune ambient-dune-1" />
      <div className="ambient-dune ambient-dune-2" />
      <div className="ambient-dune ambient-dune-3" />
      {/* 5. Mouse-tracking light */}
      <LightEffect />

      {/* ── Page content (z-10) ─────────────────────── */}
      <div className="page-content">

        {/* Nav */}
        <nav
          className="fixed top-0 left-0 right-0 z-50"
          style={{
            background: 'rgba(7, 4, 2, 0.72)',
            backdropFilter: 'blur(18px)',
            WebkitBackdropFilter: 'blur(18px)',
            borderBottom: '1px solid rgba(44, 30, 15, 0.80)',
          }}
        >
          <div className="max-w-6xl mx-auto px-5 h-16 flex items-center justify-between">

            {/* Logo */}
            <Link to="/" className="flex items-center gap-2 group">
              <span
                className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black"
                style={{ background: 'linear-gradient(135deg, #C2580E, #F97316, #FB923C)' }}
              >
                ✦
              </span>
              <span className="text-base font-extrabold text-white tracking-tight">
                Turno<span style={{ color: '#F97316' }}>Style</span>
              </span>
            </Link>

            {/* Nav links */}
            <div className="flex items-center gap-1 text-sm">
              {!isAdmin && (
                <>
                  <NavLink to="/">Reservar</NavLink>
                  <NavLink to="/mis-turnos">Mis Turnos</NavLink>
                </>
              )}
              {isAdmin && (
                <NavLink to="/admin/dashboard">Dashboard</NavLink>
              )}
              <Link
                to={isAdmin ? '/' : '/admin/login'}
                className="ml-2 btn-ghost text-xs py-2 px-4"
              >
                {isAdmin ? 'Inicio' : 'Admin'}
              </Link>
            </div>

          </div>
        </nav>

        <main className="pt-16">{children}</main>

      </div>
    </div>
  );
}

function NavLink({ to, children }: { to: string; children: React.ReactNode }) {
  return (
    <Link
      to={to}
      className="px-3 py-2 rounded-lg text-muted hover:text-white transition-colors duration-150 font-semibold hover:bg-white/5"
    >
      {children}
    </Link>
  );
}
