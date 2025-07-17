import React from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.tsx';
import { 
  Home, 
  Target, 
  Trophy, 
  Calendar, 
  Users, 
  LogOut,
  User,
  Settings,
  CreditCard
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Separator
} from "@/components/ui/separator"

export function Layout() {
  const { user, signOut } = useAuth();
  const location = useLocation();

  const navigation = [
    { name: 'Dashboard', href: '/', icon: Home },
    { name: 'Tasks', href: '/tasks', icon: Target },
    { name: 'Challenges', href: '/challenges', icon: Trophy },
    { name: 'Calendar', href: '/calendar', icon: Calendar },
    { name: 'Find Users', href: '/users', icon: Users },
  ];

  const isActive = (href: string) => {
    return location.pathname === href;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      {/* Top Navigation Bar */}
      <nav className="bg-white/80 backdrop-blur-md border-b border-gray-200/50 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl flex items-center justify-center">
                <Target className="h-6 w-6 text-white" />
              </div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                TaskChallenge
              </h1>
            </div>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center space-x-1">
              {navigation.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.href);
                
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={cn(
                      "flex items-center px-4 py-2 text-sm font-medium rounded-xl transition-all duration-200",
                      active
                        ? "bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-lg"
                        : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                    )}
                  >
                    <Icon className="h-4 w-4 mr-2" />
                    {item.name}
                  </Link>
                );
              })}
            </div>

            {/* User Menu */}
            <div className="flex items-center">
              <Popover>
                <PopoverTrigger asChild>
                  <button className="flex items-center space-x-2 p-2 hover:bg-gray-100 rounded-xl transition-colors">
                    <div className="h-8 w-8 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center">
                      <User className="h-4 w-4 text-white" />
                    </div>
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-80" align="end">
                  <div className="flex items-center gap-4 p-2">
                    <div className="h-12 w-12 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center">
                      <User className="h-6 w-6 text-white" />
                    </div>
                    <div className="space-y-1">
                      <h4 className="text-sm font-semibold">{user?.email}</h4>
                      <p className="text-xs text-muted-foreground">
                        Free Plan
                      </p>
                    </div>
                  </div>
                  <Separator className="my-2" />
                  <div className="space-y-1 p-2">
                    <button
                      className="w-full flex items-center space-x-2 text-sm px-2 py-1.5 hover:bg-gray-100 rounded-lg text-gray-700 transition-colors"
                    >
                      <Settings className="h-4 w-4" />
                      <span>Settings</span>
                    </button>
                    <button
                      className="w-full flex items-center space-x-2 text-sm px-2 py-1.5 hover:bg-gray-100 rounded-lg text-gray-700 transition-colors"
                    >
                      <CreditCard className="h-4 w-4" />
                      <span>Billing</span>
                    </button>
                    <Separator className="my-2" />
                    <button
                      onClick={signOut}
                      className="w-full flex items-center space-x-2 text-sm px-2 py-1.5 hover:bg-red-50 rounded-lg text-red-600 transition-colors"
                    >
                      <LogOut className="h-4 w-4" />
                      <span>Log out</span>
                    </button>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile Navigation */}
      <div className="md:hidden bg-white border-b border-gray-200">
        <div className="px-4 py-2">
          <div className="flex space-x-1 overflow-x-auto">
            {navigation.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);
              
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={cn(
                    "flex flex-col items-center px-3 py-2 text-xs font-medium rounded-lg transition-all duration-200 min-w-0 flex-shrink-0",
                    active
                      ? "bg-gradient-to-r from-blue-500 to-purple-500 text-white"
                      : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                  )}
                >
                  <Icon className="h-5 w-5 mb-1" />
                  <span className="truncate">{item.name}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Outlet />
      </main>
    </div>
  );
}