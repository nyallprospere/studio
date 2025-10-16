'use client';

import {
  Sidebar,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarSeparator,
  SidebarMenuSub,
  SidebarMenuSubButton,
} from '@/components/ui/sidebar';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Vote, Home, Users, BarChart3, TrendingUp, Landmark, Map, Settings, Shield, LogIn, LogOut, UserPlus, FilePlus } from 'lucide-react';
import { Button } from '../ui/button';
import { useUser, useAuth } from '@/firebase';
import { signOut } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronRight } from 'lucide-react';
import { useState, useEffect } from 'react';

const mainNavItems = [
  { href: '/', icon: Home, label: 'Dashboard' },
  { href: '/parties', icon: Shield, label: 'Parties' },
  { href: '/candidates', icon: Users, label: 'Candidates' },
  { href: '/polls', icon: BarChart3, label: 'Polls' },
  { href: '/predictions', icon: TrendingUp, label: 'Predictions' },
  // { href: '/results', icon: Landmark, label: 'Past Results' },
  { href: '/constituencies', icon: Map, label: 'Constituencies' },
];

const adminNavItems = [
    { href: '/admin/elections', icon: Vote, label: 'Manage Elections' },
    { href: '/admin/parties', icon: Shield, label: 'Manage Parties' },
    { href: '/admin/candidates', icon: Users, label: 'Manage Candidates' },
    { href: '/admin/results', icon: Landmark, label: 'Manage Election Results' },
    { href: '/admin/constituencies', icon: FilePlus, label: 'Manage Constituencies' },
    { href: '/admin/map', icon: Map, label: 'Manage Map' },
    { href: '/admin/settings', icon: Settings, label: 'Manage Settings' },
];

const electionYears: { label: string; value: string }[] = [
  { label: '2021', value: '2021' },
  { label: '2016', value: '2016' },
  { label: '2011', value: '2011' },
  { label: '2006', value: '2006' },
  { label: '2001', value: '2001' },
  { label: '1997', value: '1997' },
  { label: '1992', value: '1992' },
  { label: '1987 (Apr 30)', value: '1987-04-30' },
  { label: '1987 (Apr 6)', value: '1987-04-06' },
  { label: '1982', value: '1982' },
  { label: '1979', value: '1979' },
  { label: '1974', value: '1974' },
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
  const [isResultsOpen, setIsResultsOpen] = useState(pathname.startsWith('/results'));

  useEffect(() => {
    setIsResultsOpen(pathname.startsWith('/results'));
  }, [pathname]);
  
  const itemsToDisplay = mainNavItems;

  return (
    <Sidebar>
      <SidebarHeader>
        <Link href="/" className="flex items-center gap-2 p-2">
            <Vote className="w-8 h-8 text-primary" />
            <div className="flex flex-col">
                <h2 className="text-lg font-headline font-semibold">
                    LucianVotes
                </h2>
                <p className="text-xs text-muted-foreground">2026 Hub</p>
            </div>
        </Link>
      </SidebarHeader>
      <SidebarMenu>
        {itemsToDisplay.map((item) => (
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

        <SidebarMenuItem>
            <Collapsible open={isResultsOpen} onOpenChange={setIsResultsOpen}>
                <CollapsibleTrigger asChild>
                    <Button variant={pathname.startsWith('/results') ? 'secondary' : 'ghost'} className="w-full justify-between">
                         <div className="flex items-center gap-2">
                            <Landmark className="mr-2 h-4 w-4" />
                            Past Results
                        </div>
                        <ChevronRight className={`h-4 w-4 transition-transform ${isResultsOpen ? 'rotate-90' : ''}`} />
                    </Button>
                </CollapsibleTrigger>
                <CollapsibleContent>
                    <SidebarMenuSub>
                        {electionYears.map(year => (
                            <SidebarMenuItem key={year.value}>
                                <SidebarMenuSubButton asChild isActive={pathname === `/results?year=${year.value}`}>
                                    <Link href={`/results?year=${year.value}`}>
                                        {year.label}
                                    </Link>
                                </SidebarMenuSubButton>
                            </SidebarMenuItem>
                        ))}
                    </SidebarMenuSub>
                </CollapsibleContent>
            </Collapsible>
        </SidebarMenuItem>


        {user && (
            <>
                <SidebarSeparator className="my-2" />
                <SidebarGroup>
                    <SidebarGroupLabel>Admin</SidebarGroupLabel>
                    <SidebarMenu>
                        {adminNavItems.map((item) => (
                            <SidebarMenuItem key={item.href}>
                                <Button
                                asChild
                                variant={pathname.startsWith(item.href) ? 'secondary' : 'ghost'}
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
                </SidebarGroup>
            </>
        )}

      </SidebarMenu>
      <div className="mt-auto p-2 space-y-2">
         <SidebarMenu>
            <AuthSection />
         </SidebarMenu>
      </div>
    </Sidebar>
  );
}
