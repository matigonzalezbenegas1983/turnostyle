import { Link, useLocation } from 'react-router-dom';

export default function Layout({ children }: { children: React.ReactNode }) {
  const { pathname } = useLocation();
  const isAdmin = pathname.startsWith('/admin');

  return (
    <div className="min-h-screen bg-bg bg-grid-pattern bg-grid-pattern text-white font-sans">
      <nav className="fixed top-0 left-0 right-0 z-50 bg-bg/80 backdrop-blur border-b border-border">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link to="/" className="text-lg font-bold text-white flex items-center gap-2">
            <span className="text-primary">✦</span> TurnoStyle
          </Link>
          <div className="flex items-center gap-6 text-sm">
            {!isAdmin && (
              <>
                <Link to="/" className="text-muted hover:text-white transition-colors">Reservar</Link>
                <Link to="/mis-turnos" className="text-muted hover:text-white transition-colors">Mis Turnos</Link>
              </>
            )}
            {isAdmin && (
              <Link to="/admin/dashboard" className="text-muted hover:text-white transition-colors">Dashboard</Link>
            )}
            <Link
              to={isAdmin ? '/' : '/admin/login'}
              className="text-muted hover:text-white transition-colors"
            >
              {isAdmin ? 'Volver al inicio' : 'Admin'}
            </Link>
          </div>
        </div>
      </nav>
      <main className="pt-14">{children}</main>
    </div>
  );
}
