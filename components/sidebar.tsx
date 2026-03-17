'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Database, Box, Code, CirclePlay as PlayCircle, LayoutDashboard, BookOpen, ShoppingCart, TrendingUp, TriangleAlert as AlertTriangle, SquareCheck as CheckSquare } from 'lucide-react';
import { cn } from '@/lib/utils';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Promo View', href: '/library-view', icon: BookOpen },
  { name: 'Buy Plan', href: '/buy-plan', icon: ShoppingCart },
  { name: 'Tracked Games', href: '/off-plan', icon: AlertTriangle },
  { name: 'Tasks', href: '/tasks', icon: CheckSquare },
  { name: 'Library', href: '/library', icon: Database },
  { name: 'Buckets', href: '/buckets', icon: Box },
  { name: 'Scripts', href: '/scripts', icon: Code },
  { name: 'Runs', href: '/runs', icon: PlayCircle },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <div className="flex h-screen w-64 flex-col border-r bg-slate-50">
      <div className="flex h-16 items-center border-b px-6">
        <h1 className="text-xl font-bold text-slate-900">PCE Buckets</h1>
      </div>
      <nav className="flex-1 space-y-1 px-3 py-4">
        {navigation.map((item) => {
          const isActive = pathname?.startsWith(item.href);
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-slate-200 text-slate-900'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              )}
            >
              <item.icon className="h-5 w-5" />
              {item.name}
            </Link>
          );
        })}
      </nav>
      <div className="border-t p-4 text-xs text-slate-500">
        Promo Capital Engine
      </div>
    </div>
  );
}
