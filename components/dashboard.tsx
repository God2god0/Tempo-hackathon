'use client';

import { useState, useEffect } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import { CreateGroupDialog } from '@/components/create-group-dialog';
import { GroupCard } from '@/components/group-card';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LoginButton } from '@/components/login-button';
import { toast } from 'sonner';

import { MainLayout } from '@/components/layout/main-layout';
import { GroupView, Expense } from '@/components/group-view';
import { FastPayView } from '@/components/fast-pay-view';
import { ProfileView } from '@/components/profile-view';
import { ArrowUpRight, PlusCircle } from 'lucide-react';

interface Group {
    id: string;
    name: string;
    createdAt: number;
    createdBy?: string;
    expenses?: Expense[];
    members?: string[];
    archived?: boolean;
    pendingTx?: string; // Hash of a pending settlement transaction
}

export default function Dashboard() {
    const { user, ready, authenticated } = usePrivy();
    const [groups, setGroups] = useState<Group[]>([]);
    const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
    const [activeTab, setActiveTab] = useState<'groups' | 'fast-pay' | 'profile'>('groups');
    const [filter, setFilter] = useState<'active' | 'history'>('active');

    const filteredGroups = groups.filter(g => {
        if (filter === 'active') return !g.archived;
        return g.archived;
    });

    // Load groups from API on mount and poll
    useEffect(() => {
        // Initialize local 'my-groups' list if not exists
        let myGroupIds: string[] = [];
        if (user?.id) {
            const storageKey = `my-group-ids-${user.id}`;
            const storedIds = localStorage.getItem(storageKey);
            myGroupIds = storedIds ? JSON.parse(storedIds) : [];
        }

        const fetchGroups = async () => {
            try {
                const query = user?.email?.address ? `?user=${encodeURIComponent(user.email.address)}&t=${Date.now()}` : `?t=${Date.now()}`;
                const res = await fetch(`/api/groups${query}`);
                if (res.ok) {
                    const allGroups: Group[] = await res.json();

                    // console.log(`[Dashboard] Polled ${allGroups.length} groups`); // verbose

                    // Filter: Only show groups I know about (in local IDs) OR that I created
                    // refreshing from LS inside the interval to catch new imports
                    let currentMyIds: string[] = [];
                    if (user?.id) {
                        const storageKey = `my-group-ids-${user.id}`;
                        const currentStoredIds = localStorage.getItem(storageKey);
                        currentMyIds = currentStoredIds ? JSON.parse(currentStoredIds) : [];
                    }

                    const myGroups = allGroups.filter(g => {
                        // 1. Created by me
                        const isMine = g.createdBy && user?.email?.address && g.createdBy === user.email.address;
                        // 2. I was explicitly added as a member (in db.json)
                        const isMember = g.members?.includes(user?.email?.address || '');
                        // 3. I joined via link (stored in local storage)
                        const isJoined = currentMyIds.includes(g.id);

                        return isMine || isMember || isJoined;
                    });

                    // Log finding specific group for debug
                    if (selectedGroup) {
                        const current = myGroups.find(g => g.id === selectedGroup.id);
                        if (current) {
                            console.log(`[Dashboard] Polled selected group state: archived=${current.archived}, pendingTx=${current.pendingTx}`);
                        }
                    }

                    // Sort by newest
                    myGroups.sort((a, b) => b.createdAt - a.createdAt);

                    setGroups(myGroups);
                }
            } catch (error) {
                console.error("Failed to fetch groups", error);
            }
        };

        fetchGroups();
        const interval = setInterval(fetchGroups, 2000); // Poll every 2 seconds

        // Check for import param in URL
        const params = new URLSearchParams(window.location.search);
        const importData = params.get('import');
        if (importData) {
            const handleImport = async () => {
                try {
                    // Robust base64 decode for utf-8
                    const jsonString = decodeURIComponent(escape(window.atob(importData)));
                    const decoded = JSON.parse(jsonString);
                    const groupId = decoded.id;

                    // Add to local list if not present
                    const currentIds = JSON.parse(localStorage.getItem('my-group-ids') || '[]');
                    if (!currentIds.includes(groupId)) {
                        currentIds.push(groupId);
                        localStorage.setItem('my-group-ids', JSON.stringify(currentIds));
                        toast.success(`Joined group: ${decoded.name}`);
                    }

                    const query = user?.email?.address ? `?user=${encodeURIComponent(user.email.address)}&t=${Date.now()}` : `?t=${Date.now()}`;
                    const dbRes = await fetch(`/api/groups${query}`);
                    if (dbRes.ok) {
                        const dbGroups: Group[] = await dbRes.json();
                        if (!dbGroups.find(g => g.id === groupId)) {
                            // It's missing from DB (maybe new p2p share), add it
                            await fetch('/api/groups', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ action: 'create', group: decoded }),
                            });
                        }
                    }

                    setSelectedGroup(decoded);
                    window.history.replaceState({}, '', window.location.pathname);
                    fetchGroups(); // Refresh view
                } catch (e) {
                    console.error("Import failed", e);
                    toast.error("Invalid share link.");
                }
            };
            handleImport();
        }

        return () => clearInterval(interval);
    }, [user?.email?.address]); // Re-run if user changes

    // Sync selectedGroup with polled data to ensure "live" view
    useEffect(() => {
        if (selectedGroup) {
            const updated = groups.find(g => g.id === selectedGroup.id);
            // Only update if data actually changed significantly (to avoid cursor jumps or loose interaction, though mostly read-only)
            // Using JSON stringify for deep comparison is okay for small objects
            if (updated && JSON.stringify(updated) !== JSON.stringify(selectedGroup)) {
                setSelectedGroup(updated);

                // If the group was remotely archived while we are viewing it
                if (updated.archived && !selectedGroup.archived) {
                    toast.info("This group has been settled and archived.");
                    // Optional: Auto-redirect? 
                    // onArchive logic in GroupView usually handles redirect.
                    // But here we are just updating state. GroupView will re-render and show "Archived" state.
                }
            }
        }
    }, [groups, selectedGroup]);
    const syncGroup = async (action: 'create' | 'update' | 'delete', group: Group) => {
        // Optimistic update
        let newGroups = [...groups];
        if (action === 'delete') {
            newGroups = newGroups.filter(g => g.id !== group.id);
            // Also remove from local IDs
            const currentIds = JSON.parse(localStorage.getItem('my-group-ids') || '[]');
            const newIds = currentIds.filter((id: string) => id !== group.id);
            localStorage.setItem('my-group-ids', JSON.stringify(newIds));

            if (selectedGroup && selectedGroup.id === group.id) {
                setSelectedGroup(null);
            }

        } else if (action === 'update') {
            const exists = newGroups.find(g => g.id === group.id);
            if (exists) {
                newGroups = newGroups.map(g => g.id === group.id ? group : g);
            } else {
                // If we are updating a group we weren't tracking (e.g. just paid to join), add it!
                newGroups = [group, ...newGroups];
                // And ensure it's saved to local IDs so it persists
                const currentIds = JSON.parse(localStorage.getItem('my-group-ids') || '[]');
                if (!currentIds.includes(group.id)) {
                    currentIds.push(group.id);
                    localStorage.setItem('my-group-ids', JSON.stringify(currentIds));
                }
            }

            // Sync selected group if it's the one being updated
            if (selectedGroup && selectedGroup.id === group.id) {
                setSelectedGroup(group);
            }
        } else if (action === 'create') {
            newGroups = [group, ...newGroups];
            // Add to local IDs
            const currentIds = JSON.parse(localStorage.getItem('my-group-ids') || '[]');
            if (!currentIds.includes(group.id)) {
                currentIds.push(group.id);
                localStorage.setItem('my-group-ids', JSON.stringify(currentIds));
            }
        }
        setGroups(newGroups); // Immediate UI update

        try {
            await fetch('/api/groups', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action, group }),
            });
        } catch (error) {
            console.error("Failed to sync group", error);
            toast.error("Sync failed. Check console.");
        }
    };

    const handleCreateGroup = (name: string) => {
        const newGroup: Group = {
            id: crypto.randomUUID(),
            name,
            createdBy: user?.email?.address, // Store creator
            createdAt: Date.now(),
            expenses: [],
            members: [user?.email?.address || 'You'],
            archived: false,
            pendingTx: undefined
        };
        syncGroup('create', newGroup);
    };

    // Update local state ONLY (for when we fetch updates from server)
    const handleRemoteUpdateGroup = (updatedGroup: Group) => {
        setGroups(prevGroups => prevGroups.map(g => g.id === updatedGroup.id ? updatedGroup : g));
        if (selectedGroup && selectedGroup.id === updatedGroup.id) {
            setSelectedGroup(updatedGroup);
        }
    };

    const handleUpdateGroup = async (updatedGroup: Group) => {
        await syncGroup('update', updatedGroup);
        // Keep selection if it's the same group
        if (selectedGroup && selectedGroup.id === updatedGroup.id) {
            setSelectedGroup(updatedGroup);
        }
    };

    const handleArchiveGroup = (groupId: string, overrides?: { pendingTx?: string, members?: string[] }) => {
        // Fallback to selectedGroup if not found in list (e.g. we just joined via link but aren't in 'my-groups' yet)
        const groupToArchive = groups.find(g => g.id === groupId) || (selectedGroup && selectedGroup.id === groupId ? selectedGroup : undefined);

        if (groupToArchive) {
            const updatedGroup = {
                ...groupToArchive,
                archived: true,
                pendingTx: overrides?.pendingTx,
                members: overrides?.members || groupToArchive.members
            };
            syncGroup('update', updatedGroup);
            setSelectedGroup(null); // Go back to dashboard
            setFilter('history'); // Switch to history view to show the archived group
            toast.success("Group settled and moved to history.");
        }
    };

    const handleLoadDemoData = () => {
        const demoGroup: Group = {
            id: 'demo-1',
            name: 'Ski Trip 🎿',
            createdAt: Date.now(),
            expenses: [
                {
                    id: 'exp-1',
                    title: 'Airbnb Booking',
                    amount: 450.00,
                    paidBy: 'alice@example.com',
                    payerAddress: '0x123...fake',
                    createdAt: Date.now() - 10000000,
                },
                {
                    id: 'exp-2',
                    title: 'Grocery Run',
                    amount: 85.50,
                    paidBy: user?.email?.address || 'You',
                    payerAddress: user?.wallet?.address,
                    createdAt: Date.now() - 5000000,
                },
                {
                    id: 'exp-3',
                    title: 'Dinner at Mario\'s',
                    amount: 120.00,
                    paidBy: 'bob@example.com',
                    payerAddress: '0xabc...fake',
                    createdAt: Date.now() - 100000,
                }
            ]
        };
        syncGroup('create', demoGroup);
        toast.success("Demo data loaded!");
    };

    const handleResetApp = async () => {
        if (confirm("Delete all groups? This cannot be undone.")) {
            await fetch('/api/groups', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'overwrite', groups: [] }),
            });
            setGroups([]);
            toast.success("All groups cleared.");
        }
    };

    // 1. Loading State
    if (!ready) {
        return (
            <div className="flex h-screen flex-col items-center justify-center bg-background gap-4">
                <div className="h-8 w-8 bg-primary rounded animate-spin"></div>
            </div>
        );
    }

    const isAuthenticated = ready && authenticated;

    // 2. Not Authenticated State (Premium Minimalist)
    if (!isAuthenticated) {
        return (
            <div className="relative flex min-h-screen flex-col items-center justify-center p-4 bg-zinc-950 overflow-hidden selection:bg-amber-500/30 antialiased">
                {/* Noise Texture for "HD" feel / preventing banding */}
                <div className="absolute inset-0 z-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noiseFilter%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.65%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noiseFilter)%22/%3E%3C/svg%3E")' }}></div>

                {/* Subtle Ambient Background - "VIP" Aura */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-indigo-500/10 rounded-full blur-[140px] pointer-events-none" />
                <div className="absolute top-0 w-full h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

                <div className="relative z-10 w-full max-w-sm space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700">
                    <div className="text-center space-y-4">
                        <h1 className="text-5xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-b from-white to-white/60 drop-shadow-sm">
                            Qwick.
                        </h1>
                    </div>

                    {/* Glassmorphism Card */}
                    <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl shadow-2xl p-8 ring-1 ring-white/5">
                        <div className="space-y-6 text-center">
                            <div className="space-y-2">
                                <h2 className="text-lg font-medium text-zinc-200">Welcome</h2>
                                <p className="text-xs text-zinc-400">Secure entry to your settlement dashboard.</p>
                            </div>

                            <div className="pt-2 flex justify-center">
                                <LoginButton />
                            </div>
                        </div>
                    </div>

                    <div className="text-center">
                        <p className="text-[10px] text-zinc-600">Encrypted & Decentralized Settlement Layer</p>
                    </div>
                </div>
            </div>
        );
    }

    // 3. Authenticated Dashboard State
    // Wrap with MainLayout for structure
    return (
        <MainLayout
            activeTab={activeTab}
            onTabChange={(tab) => {
                setActiveTab(tab);
                setSelectedGroup(null); // Reset selection when changing tabs
            }}
            onCreateGroup={handleCreateGroup}
        >
            {activeTab === 'groups' && (
                <>
                    {selectedGroup ? (
                        <GroupView
                            group={selectedGroup}
                            onBack={() => setSelectedGroup(null)}
                            onUpdateGroup={handleUpdateGroup}
                            onRemoteUpdate={handleRemoteUpdateGroup}
                            userEmail={user?.email?.address}
                            userWallet={user?.wallet?.address}
                            onArchive={(overrides) => handleArchiveGroup(selectedGroup.id, overrides)}
                            onDeleteGroup={(groupId) => {
                                const groupToDelete = groups.find(g => g.id === groupId);
                                if (groupToDelete) {
                                    syncGroup('delete', groupToDelete);
                                    setSelectedGroup(null);
                                    toast.success("Group deleted.");
                                }
                            }}
                        />
                    ) : (
                        <div className="space-y-6">
                            {/* Dashboard Header */}
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                <div className="space-y-1">
                                    <h2 className="text-2xl font-bold tracking-tight">Groups</h2>
                                    <p className="text-muted-foreground">Create a group to split expenses and share payments with friends.</p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="bg-muted p-1 rounded-lg flex">
                                        <button
                                            onClick={() => setFilter('active')}
                                            className={`px-3 py-1 text-sm font-medium rounded-md transition-all ${filter === 'active' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                                        >
                                            Active
                                        </button>
                                        <button
                                            onClick={() => setFilter('history')}
                                            className={`px-3 py-1 text-sm font-medium rounded-md transition-all ${filter === 'history' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                                        >
                                            History
                                        </button>
                                    </div>
                                    <CreateGroupDialog onCreate={handleCreateGroup} trigger={
                                        <Button size="sm" className="gap-2 px-4">
                                            <PlusCircle className="h-4 w-4" />
                                            <span>Create Group</span>
                                        </Button>
                                    } />
                                </div>
                            </div>

                            {/* Responsive Grid for Groups */}
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {filteredGroups.length === 0 ? (
                                    <div className="col-span-full">
                                        <Card className="border-dashed shadow-none">
                                            <CardContent className="flex flex-col items-center justify-center h-48 text-muted-foreground text-center">
                                                <p className="font-medium">No {filter} groups found.</p>

                                            </CardContent>
                                        </Card>
                                    </div>
                                ) : (
                                    filteredGroups.map((group) => (
                                        <GroupCard
                                            key={group.id}
                                            group={group}
                                            onClick={() => setSelectedGroup(group)}
                                            onArchive={() => handleArchiveGroup(group.id)}
                                        />
                                    ))
                                )}
                            </div>
                        </div>
                    )}
                </>
            )}

            {/* Fast Pay View */}
            {activeTab === 'fast-pay' && (
                <div className="max-w-md mx-auto">
                    <FastPayView userAddress={user?.wallet?.address} />
                </div>
            )}

            {/* Profile View */}
            {activeTab === 'profile' && (
                <div className="max-w-md mx-auto">
                    <ProfileView user={user} />
                </div>
            )}
        </MainLayout>
    );
}
