'use client';

import React from 'react';
import { useSession, signOut } from 'next-auth/react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { 
  LayoutDashboard,
  FileText,
  Users,
  Calendar,
  Settings,
  LogOut,
  User,
  Bell,
  ChevronDown,
  Activity
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export function MainNavigation() {
  const { data: session } = useSession();
  const pathname = usePathname();

  if (!session) return null;

  const navigationItems = [
    {
      name: 'Tableau de bord',
      href: '/dashboard',
      icon: LayoutDashboard,
      roles: ['ADMIN', 'RADIOLOGIST_SENIOR', 'RADIOLOGIST_JUNIOR', 'TECHNICIAN', 'SECRETARY']
    },
    {
      name: 'Liste de travail',
      href: '/worklist',
      icon: Activity,
      roles: ['ADMIN', 'RADIOLOGIST_SENIOR', 'RADIOLOGIST_JUNIOR', 'TECHNICIAN', 'SECRETARY']
    },
    {
      name: 'Patients',
      href: '/patients',
      icon: Users,
      roles: ['ADMIN', 'RADIOLOGIST_SENIOR', 'RADIOLOGIST_JUNIOR', 'TECHNICIAN', 'SECRETARY']
    },
    {
      name: 'Examens',
      href: '/examinations',
      icon: Calendar,
      roles: ['ADMIN', 'RADIOLOGIST_SENIOR', 'RADIOLOGIST_JUNIOR', 'TECHNICIAN', 'SECRETARY']
    },
    {
      name: 'Rapports',
      href: '/reports',
      icon: FileText,
      roles: ['ADMIN', 'RADIOLOGIST_SENIOR', 'RADIOLOGIST_JUNIOR']
    },
    {
      name: 'Administration',
      href: '/admin',
      icon: Settings,
      roles: ['ADMIN']
    }
  ];

  const filteredNavItems = navigationItems.filter(item =>
    item.roles.includes(session.user?.role || 'SECRETARY')
  );

  const isActive = (href: string) => {
    if (href === '/dashboard') {
      return pathname === '/dashboard';
    }
    return pathname?.startsWith(href) || false;
  };

  const handleSignOut = () => {
    signOut({ callbackUrl: '/auth/login' });
  };

  return (
    <nav className="bg-white border-b border-gray-200 shadow-sm">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center px-6 py-3">
          {/* Logo and Brand */}
          <div className="flex items-center space-x-8">
            <Link href="/dashboard" className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">R</span>
              </div>
              <div>
                <span className="text-xl font-bold text-gray-900">RADRIS</span>
                <div className="text-xs text-gray-500">Système RIS v1.0</div>
              </div>
            </Link>

            {/* Navigation Links */}
            <div className="hidden md:flex items-center space-x-1">
              {filteredNavItems.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.href);
                
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      active
                        ? 'bg-blue-100 text-blue-700 border border-blue-200'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{item.name}</span>
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Right Side - User Menu */}
          <div className="flex items-center space-x-4">
            {/* Notifications */}
            <Button variant="ghost" size="sm" className="relative">
              <Bell className="w-5 h-5" />
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                3
              </span>
            </Button>

            {/* User Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center space-x-2">
                  <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
                    <User className="w-4 h-4" />
                  </div>
                  <div className="hidden md:block text-left">
                    <div className="text-sm font-medium text-gray-900">
                      {session.user?.name || session.user?.email}
                    </div>
                    <div className="text-xs text-gray-500">
                      {session.user?.role?.replace('_', ' ').toLowerCase()}
                    </div>
                  </div>
                  <ChevronDown className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>Mon Compte</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/profile" className="flex items-center space-x-2">
                    <User className="w-4 h-4" />
                    <span>Profil</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/settings" className="flex items-center space-x-2">
                    <Settings className="w-4 h-4" />
                    <span>Paramètres</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={handleSignOut}
                  className="flex items-center space-x-2 text-red-600 focus:text-red-600"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Se déconnecter</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      {/* Mobile Navigation - TODO: Implement responsive menu */}
      <div className="md:hidden border-t border-gray-200 bg-gray-50">
        <div className="px-4 py-2">
          <p className="text-xs text-gray-500 text-center">
            Navigation mobile à implémenter
          </p>
        </div>
      </div>
    </nav>
  );
}