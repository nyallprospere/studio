'use client';

import {
  Sidebar,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
} from '@/components/ui/sidebar';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Vote, Home, Users, BarChart3, TrendingUp, Landmark, Map, Settings, Shield, LogIn, LogOut, UserPlus, FilePlus } from 'lucide-react';
import { Button } from '../ui/button';
import { useUser, useAuth } from '@/firebase';
import { signOut } from 'firebase/auth';
import { useRouter } from 'next/navigation';

const mainNavItems = [
  { href: '/', icon: Home, label: 'Dashboard' },
  { href: '/parties', icon: Shield, label: 'Parties' },
  { href: '/candidates', icon: Users, label: 'Candidates' },
  { href: '/polls', icon: BarChart3, label: 'Polls' },
  { href: '/predictions', icon: TrendingUp, label: 'Predictions' },
  { href: '/results', icon: Landmark, label: 'Past Results' },
  { href: '/constituencies', icon: Map, label: 'Constituencies' },
];

const adminNavItems = [
    { href: '/admin', icon: Settings, label: 'Admin Dashboard' },
    { href: '/admin/parties', icon: Shield, label: 'Parties' },
    { href: '/admin/candidates', icon: Users, label: 'Candidates' },
    { href: '/admin/polls', icon: BarChart3, label: 'Polling Data' },
    { href: '/admin/results', icon: Landmark, label: 'Election Results' },
    { href: '/admin/constituencies', icon: FilePlus, label: 'Constituencies' },
    { href: '/admin/map', icon: Map, label: 'Map' },
];

function AuthSection() {
    const { user, isUserLoading } = useUser();
    const auth = useAuth();
    const router = useRouter();

    const handleLogout = async () => {
        await signOut(auth);
        router.push('/');
    };

    if (isUserLoading) {
        return null; // Don't show anything while loading
    }
    
    if (user) {
         return (
             <SidebarMenuItem>
                <Button
                    onClick={handleLogout}
                    variant='ghost'
                    className="w-full justify-start"
                >
                    <LogOut className="mr-2 h-4 w-4" />
                    Logout
                </Button>
            </SidebarMenuItem>
         );
    }

    return (
        <>
            <SidebarMenuItem>
                <Button
                asChild
                variant='ghost'
                className="w-full justify-start"
                >
                <Link href="/login">
                    <LogIn className="mr-2 h-4 w-4" />
                    Login
                </Link>
                </Button>
            </SidebarMenuItem>
            <SidebarMenuItem>
                <Button
                    asChild
                    variant='ghost'
                    className="w-full justify-start"
                >
                    <Link href="/signup">
                        <UserPlus className="mr-2 h-4 w-4" />
                        Sign Up
                    </Link>
                </Button>
            </SidebarMenuItem>
        </>
    );
}


export function SidebarNav() {
  const pathname = usePathname();
  const { user } = useUser();
  const isAdminPath = pathname.startsWith('/admin');
  const navItems = isAdminPath ? adminNavItems : mainNavItems;

  return (
    <Sidebar>
      <SidebarHeader>
        <div className="flex items-center gap-2 p-2">
            <Vote className="w-8 h-8 text-primary" />
            <div className="flex flex-col">
                <h2 className="text-lg font-headline font-semibold">
                    LucianVotes
                </h2>
                <p className="text-xs text-muted-foreground">2026 Hub</p>
            </div>
        </div>
      </SidebarHeader>
      <SidebarMenu>
        {navItems.map((item) => (
          <SidebarMenuItem key={item.href}>
            <Button
              asChild
              variant={pathname === item.href ? 'secondary' : 'ghost'}
              className="w-full justify-start"
            >
              <Link href={item.href}>
                <item.icon className="mr-2 h-4 w-4" />
                {item.label}
              </Link>
            </Button>
          </SidebarMenuItem>
        ))}
      </SidebarMenu>
      <div className="mt-auto p-2 space-y-2">
         <SidebarMenu>
            <AuthSection />
         </SidebarMenu>
        {user && (
            <Button
                asChild
                variant={isAdminPath ? 'default' : 'outline'}
                className="w-full justify-start bg-accent text-accent-foreground hover:bg-accent/90"
            >
                <Link href={isAdminPath ? "/" : "/admin"}>
                    <Settings className="mr-2 h-4 w-4" />
                    {isAdminPath ? 'Exit Admin' : 'Admin Panel'}
                </Link>
            </Button>
        )}
      </div>
    </Sidebar>
  );
}
