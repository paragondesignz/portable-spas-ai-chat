'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { FileText, Upload, Type, ShoppingCart, Globe, MessageSquare } from 'lucide-react';

interface AdminNavProps {
  onLogout: () => void;
}

export function AdminNav({ onLogout }: AdminNavProps) {
  const pathname = usePathname();

  const navItems = [
    { href: '/admin', label: 'Files', icon: FileText },
    { href: '/admin/upload', label: 'Upload', icon: Upload },
    { href: '/admin/quick-text', label: 'Quick Text', icon: Type },
    { href: '/admin/products', label: 'Products', icon: ShoppingCart },
    { href: '/admin/scraper', label: 'Scraper', icon: Globe },
    { href: '/admin/chats', label: 'Chats', icon: MessageSquare },
  ];

  return (
    <div className="bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-8">
            <Link href="/admin" className="flex items-center gap-2">
              <div className="bg-primary text-white w-8 h-8 rounded flex items-center justify-center font-bold">
                PS
              </div>
              <span className="font-bold text-gray-900">Admin</span>
            </Link>

            <nav className="flex gap-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-primary text-white'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>

          <Button onClick={onLogout} variant="outline" size="sm">
            Logout
          </Button>
        </div>
      </div>
    </div>
  );
}
