'use client';
import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { isAuthenticated, getUser, clearAuth } from '@/lib/auth';
import { BarChart2, MapPin, LogOut, Menu, X, Search, Map } from 'lucide-react';

const navItems = [
  { href: '/', label: 'Dashboard', icon: BarChart2 },
  { href: '/municipios', label: 'Municípios', icon: MapPin },
  { href: '/territorios', label: 'Territórios', icon: Map },
  { href: '/consultas', label: 'Consultas', icon: Search },
];

export default function Layout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<any>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (!isAuthenticated()) { router.push('/login'); return; }
    setUser(getUser());
  }, [router]);

  const handleLogout = () => {
    clearAuth();
    router.push('/login');
  };

  return (
    <div className="min-h-screen flex bg-parchment">
      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-64 flex flex-col
        bg-tile text-white transition-transform duration-200
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:translate-x-0 lg:static lg:flex
      `}>
        {/* Logo */}
        <div className="px-6 py-6 border-b border-white/10">
          <p className="text-[12px] text-white/50 uppercase tracking-widest mb-1">Sistema</p>
          <h1 className="text-[21px] font-semibold tracking-tight leading-tight">Legis BOT</h1>
          <p className="text-[12px] text-white/50 mt-0.5">Módulo Robô</p>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map(({ href, label, icon: Icon }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                onClick={() => setSidebarOpen(false)}
                className={`
                  flex items-center gap-3 px-3 py-2.5 rounded-[11px] text-[14px] transition-colors
                  ${active ? 'bg-primary text-white' : 'text-white/70 hover:bg-white/10 hover:text-white'}
                `}
              >
                <Icon size={18} />
                {label}
              </Link>
            );
          })}
        </nav>

        {/* User */}
        <div className="px-4 py-4 border-t border-white/10">
          {user && (
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white text-[12px] font-semibold">
                {user.nome?.[0] || 'A'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-semibold text-white truncate">{user.nome}</p>
                <p className="text-[11px] text-white/50 truncate">{user.email}</p>
              </div>
            </div>
          )}
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 w-full px-3 py-2 text-[13px] text-white/60 hover:text-white hover:bg-white/10 rounded-[8px] transition-colors"
          >
            <LogOut size={15} />
            Sair
          </button>
        </div>
      </aside>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar (mobile) */}
        <header className="lg:hidden flex items-center gap-3 px-4 py-3 bg-tile text-white">
          <button onClick={() => setSidebarOpen(!sidebarOpen)}>
            {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
          <span className="text-[17px] font-semibold">Legis BOT</span>
        </header>

        {/* Page content */}
        <main className="flex-1 p-6 lg:p-8 max-w-[1440px] w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
