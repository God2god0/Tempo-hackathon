'use client';

import { Home, Users, PieChart, LogOut, PlusCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePrivy } from '@privy-io/react-auth';
import { ModeToggle } from '@/components/mode-toggle';

interface AppSidebarProps {
    activeTab: string;
    onTabChange: (tab: any) => void;
    onCreateGroup: (name: string) => void;
}

export function AppSidebar({ activeTab, onTabChange, onCreateGroup }: AppSidebarProps) {
    const { logout, user } = usePrivy();

    return (
        <div className="hidden md:flex flex-col w-64 border-r bg-card h-full">
            <div className="p-6 border-b">
                <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                    <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-primary-foreground">
                        Q
                    </div>
                    Qwick.
                </h1>
            </div>

            <div className="flex-1 py-6 px-4 space-y-2">
                <Button
                    variant={activeTab === 'groups' ? 'secondary' : 'ghost'}
                    className="w-full justify-start gap-2"
                    onClick={() => onTabChange('groups')}
                >
                    <Home className="w-4 h-4" />
                    Dashboard
                </Button>
                <Button
                    variant={activeTab === 'fast-pay' ? 'secondary' : 'ghost'}
                    className="w-full justify-start gap-2"
                    onClick={() => onTabChange('fast-pay')}
                >
                    <Users className="w-4 h-4" />
                    Fast Pay
                </Button>
                <Button
                    variant={activeTab === 'profile' ? 'secondary' : 'ghost'}
                    className="w-full justify-start gap-2"
                    onClick={() => onTabChange('profile')}
                >
                    <PieChart className="w-4 h-4" />
                    Profile
                </Button>


            </div>

            <div className="p-4 border-t bg-muted/30">
                <div className="flex items-center gap-3 mb-4">
                    <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-xs font-mono">
                        {user?.email?.address?.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="flex-1 overflow-hidden">
                        <p className="text-sm font-medium truncate">{user?.email?.address}</p>
                        <p className="text-xs text-muted-foreground truncate">Free Plan</p>
                    </div>
                </div>
                <div className="flex gap-2 items-center w-full">
                    <ModeToggle />
                    <Button variant="ghost" size="sm" className="flex-1 justify-start gap-2 text-muted-foreground hover:text-destructive" onClick={logout}>
                        <LogOut className="w-4 h-4" />
                        Sign Out
                    </Button>
                </div>
            </div>
        </div>
    );
}
