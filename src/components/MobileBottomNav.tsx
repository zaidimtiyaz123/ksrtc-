import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import {
  Radio,
  Bus,
  MapPin,
  Ticket,
  Smartphone,
  ShieldCheck,
  UserCheck,
  LayoutDashboard,
  Navigation2
} from 'lucide-react';

export const MobileBottomNav: React.FC = () => {
  const location = useLocation();
  const { user, role } = useAuth();
  const { t } = useLanguage();

  const isActive = (path: string) => {
    if (path === '/' && location.pathname === '/') return true;
    if (path !== '/' && location.pathname.startsWith(path)) return true;
    return false;
  };

  // Generate navigation items based on active role
  const getNavItems = () => {
    if (user && role === 'driver') {
      return [
        {
          to: '/driver',
          label: 'Cockpit',
          icon: Smartphone,
          active: isActive('/driver')
        },
        {
          to: '/track',
          label: 'Live GPS',
          icon: Radio,
          active: isActive('/track')
        },
        {
          to: '/routes',
          label: 'Routes',
          icon: Bus,
          active: isActive('/routes')
        },
        {
          to: '/stops',
          label: 'Stops',
          icon: MapPin,
          active: isActive('/stops')
        }
      ];
    }

    if (user && role === 'admin') {
      return [
        {
          to: '/admin',
          label: 'Control Room',
          icon: ShieldCheck,
          active: isActive('/admin')
        },
        {
          to: '/track',
          label: 'Fleet Radar',
          icon: Radio,
          active: isActive('/track')
        },
        {
          to: '/routes',
          label: 'Routes',
          icon: Bus,
          active: isActive('/routes')
        },
        {
          to: '/stops',
          label: 'Stops',
          icon: MapPin,
          active: isActive('/stops')
        }
      ];
    }

    if (user && role === 'passenger') {
      return [
        {
          to: '/planner',
          label: 'Planner',
          icon: Navigation2,
          active: isActive('/planner') || isActive('/trip-planner')
        },
        {
          to: '/track',
          label: 'Live Track',
          icon: Radio,
          active: isActive('/track')
        },
        {
          to: '/passenger',
          label: 'Dashboard',
          icon: LayoutDashboard,
          active: isActive('/passenger')
        },
        {
          to: '/routes',
          label: 'Routes',
          icon: Bus,
          active: isActive('/routes')
        },
        {
          to: '/stops',
          label: 'Stops',
          icon: MapPin,
          active: isActive('/stops')
        }
      ];
    }

    // Guest / Unauthenticated
    return [
      {
        to: '/',
        label: 'Home',
        icon: Bus,
        active: location.pathname === '/' || location.pathname === '/home'
      },
      {
        to: '/planner',
        label: 'Planner',
        icon: Navigation2,
        active: isActive('/planner') || isActive('/trip-planner')
      },
      {
        to: '/track',
        label: 'Live Track',
        icon: Radio,
        active: isActive('/track')
      },
      {
        to: '/routes',
        label: 'Routes',
        icon: MapPin,
        active: isActive('/routes')
      },
      {
        to: '/login',
        label: 'Sign In',
        icon: UserCheck,
        active: isActive('/login')
      }
    ];
  };

  const navItems = getNavItems();

  return (
    <nav
      id="ksrtc-mobile-bottom-navigation"
      aria-label="Mobile Navigation Bar"
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#0F1115]/95 backdrop-blur-md border-t border-[#1E222B] px-2 py-1.5 safe-area-pb"
    >
      <div className="grid grid-cols-4 gap-1 items-center max-w-md mx-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.label}
              to={item.to}
              className={`flex flex-col items-center justify-center py-1.5 px-1 rounded-xl transition-all duration-150 min-h-[48px] ${
                item.active
                  ? 'text-blue-400 font-bold bg-blue-600/15'
                  : 'text-slate-400 hover:text-slate-200 active:scale-95'
              }`}
            >
              <div className="relative">
                <Icon className={`w-5 h-5 mb-0.5 ${item.active ? 'text-blue-400' : 'text-slate-400'}`} />
                {item.active && (
                  <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                )}
              </div>
              <span className="text-[10px] tracking-tight leading-tight mt-0.5 truncate max-w-full">
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
};
