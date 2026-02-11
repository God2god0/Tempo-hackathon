'use client';

import { AppSidebar } from '@/components/ui/app-sidebar';
import { BottomNav } from '@/components/bottom-nav';

interface MainLayoutProps {
    children: React.ReactNode;
    activeTab: 'groups' | 'fast-pay' | 'profile';
    onTabChange: (tab: 'groups' | 'fast-pay' | 'profile') => void;
    onCreateGroup: (name: string) => void;
}

export function MainLayout({ children, activeTab, onTabChange, onCreateGroup }: MainLayoutProps) {
    return (
        <div className="h-screen bg-background flex flex-col md:flex-row overflow-hidden">
            {/* Desktop Sidebar */}
            <AppSidebar
                activeTab={activeTab}
                onTabChange={onTabChange}
                onCreateGroup={onCreateGroup}
            />

            {/* Main Content Area */}
            <main className="flex-1 w-full max-w-5xl mx-auto p-4 md:p-8 pb-24 md:pb-8 overflow-y-auto h-full">
                {children}
            </main>

            {/* Mobile Bottom Nav */}
            <div className="md:hidden">
                <BottomNav activeTab={activeTab} onTabChange={onTabChange} />
            </div>
        </div>
    );
}
