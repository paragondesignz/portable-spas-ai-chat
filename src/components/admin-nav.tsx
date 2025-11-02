'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { DarkModeToggle } from '@/components/dark-mode-toggle';
import { FileText, Upload, Type, Package, MessageSquare } from 'lucide-react';

interface AdminNavProps {
  onLogout: () => void;
}

export function AdminNav({ onLogout }: AdminNavProps) {
  const pathname = usePathname();

  const navItems = [
    { href: '/admin/files', label: 'Files', icon: FileText },
    { href: '/admin/upload', label: 'Upload', icon: Upload },
    { href: '/admin/quick-text', label: 'Quick Text', icon: Type },
    { href: '/admin/content-import', label: 'Content Import', icon: Package },
    { href: '/admin/chats', label: 'Chats', icon: MessageSquare },
  ];

  return (
    <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-8">
            <Link href="/admin/dashboard" className="flex items-center gap-3">
              <Image
                src="/contenscience.svg"
                alt="ContenScience"
                width={250}
                height={75}
                className="h-16 w-auto"
              />
              <span className="font-bold text-gray-900 dark:text-gray-100 border-l border-gray-300 dark:border-gray-700 pl-3">
                AI Assistant: Portable Spas NZ
              </span>
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
                        : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>

          <div className="flex items-center gap-2">
            <DarkModeToggle />
            <Button onClick={onLogout} variant="outline" size="sm">
              Logout
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
