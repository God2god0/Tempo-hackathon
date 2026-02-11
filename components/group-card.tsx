'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowUpRight, Loader2 } from 'lucide-react';
import { useWaitForTransactionReceipt } from 'wagmi';
import { useEffect } from 'react';
import { toast } from 'sonner';

interface GroupCardProps {
    group: any;
    onClick: () => void;
    onArchive: (groupId: string) => void;
}

export function GroupCard({ group, onClick, onArchive }: GroupCardProps) {
    // Watch for pending transaction if exists
    const { isSuccess: isConfirmed, isLoading: isConfirming } = useWaitForTransactionReceipt({
        hash: group.pendingTx as `0x${string}` | undefined,
        query: {
            enabled: !!group.pendingTx,
        }
    });

    useEffect(() => {
        if (isConfirmed && group.pendingTx) {
            // Transaction confirmed! Now we update the group to remove the 'pendingTx' field
            // passing no overrides will clear pendingTx in handleArchiveGroup
            onArchive(group.id);
            toast.success(`Payment confirmed for ${group.name}!`);
        }
    }, [isConfirmed, group.pendingTx, group.id, onArchive, group.name]);

    return (
        <Card
            className={`cursor-pointer group hover:bg-muted/50 transition-colors ${group.archived ? 'opacity-60' : ''} ${group.pendingTx ? 'border-indigo-500/50 bg-indigo-50/10' : ''}`}
            onClick={onClick}
        >
            <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                    <CardTitle className="text-lg leading-tight flex items-center gap-2">
                        {group.name}
                        {group.pendingTx && (
                            <div className="flex items-center gap-1 text-xs font-normal text-indigo-500 bg-indigo-100 dark:bg-indigo-900/30 px-2 py-0.5 rounded-full animate-pulse">
                                <Loader2 className="h-3 w-3 animate-spin" />
                                Processing
                            </div>
                        )}
                    </CardTitle>
                    <ArrowUpRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                <CardDescription>
                    {group.pendingTx
                        ? 'Waiting for blockchain confirmation...'
                        : group.archived
                            ? 'Settled on ' + new Date(group.createdAt).toLocaleDateString() + ' at ' + new Date(group.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                            : 'Created ' + new Date(group.createdAt).toLocaleDateString() + ' at ' + new Date(group.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                    }
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="flex gap-[-8px]">
                    <div className="h-6 w-6 rounded-full bg-primary/20 flex items-center justify-center text-[10px] font-bold ring-2 ring-background">
                        {group.createdBy?.slice(0, 2).toUpperCase() || '??'}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
