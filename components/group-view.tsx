import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Receipt, Trash2, PlusCircle, ArrowUpRight, ArrowDownLeft } from 'lucide-react';
import { AddExpenseDialog } from '@/components/add-expense-dialog';
import { ShareGroupDialog } from '@/components/share-group-dialog';
import { toast } from 'sonner';
import { SettleUpDialog } from '@/components/settle-up-dialog';
import { saveTransaction, getTransactions, Transaction } from '@/lib/history';

export interface Expense {
    id: string;
    title: string;
    amount: number;
    paidBy: string;
    payerAddress?: string;
    createdAt: number;
    splitCount?: number;
}

interface GroupViewProps {
    group: { id: string; name: string; expenses?: Expense[]; archived?: boolean; pendingTx?: string; createdBy?: string; members?: string[] };
    onBack: () => void;
    onUpdateGroup: (updatedGroup: any) => Promise<void> | void;
    onRemoteUpdate?: (updatedGroup: any) => void;
    userEmail?: string;
    userWallet?: string;
    onArchive?: (overrides?: { pendingTx?: string, members?: string[] }) => void;
    onDeleteGroup: (groupId: string) => void;
}

export function GroupView({ group, onBack, onUpdateGroup, onRemoteUpdate, userEmail, userWallet, onArchive, onDeleteGroup }: GroupViewProps) {
    const expenses = group.expenses || [];
    const [transactions, setTransactions] = useState<Transaction[]>([]);

    // Fetch Group Transactions
    useEffect(() => {
        const loadTransactions = async () => {
            const allTx = await getTransactions();
            // Filter by groupId or Description containing group name (fallback)
            const groupTx = allTx.filter(tx =>
                tx.groupId === group.id ||
                (tx.description && tx.description.includes(group.name))
            );
            setTransactions(groupTx);
        };
        loadTransactions();
        // Poll for new transactions
        const interval = setInterval(loadTransactions, 3000);
        return () => clearInterval(interval);
    }, [group.id, group.name]);

    const handleAddExpense = (title: string, amount: number, splitCount: number) => {
        const newExpense: Expense = {
            id: crypto.randomUUID(),
            title,
            amount,
            paidBy: userEmail || 'You',
            payerAddress: userWallet,
            createdAt: Date.now(),
            splitCount: splitCount || 2
        };

        const updatedMembers = group.members || [];
        if (userEmail && !updatedMembers.includes(userEmail)) {
            updatedMembers.push(userEmail);
        }

        const updatedGroup = {
            ...group,
            expenses: [newExpense, ...expenses],
            members: updatedMembers
        };

        onUpdateGroup(updatedGroup);
    };

    const totalSpent = expenses.reduce((acc, curr) => acc + curr.amount, 0);

    const myExpenses = expenses.filter(e => {
        if (e.payerAddress && userWallet && e.payerAddress === userWallet) return true;
        if (e.paidBy === userEmail) return true;
        return false;
    }).reduce((acc, curr) => acc + curr.amount, 0);

    // Calculate Fair Share based on individual expense splits
    // For each expense, my share is expense.amount / expense.splitCount
    // This assumes "I" am always one of the people splitting
    const fairShare = expenses.reduce((acc, curr) => {
        const count = curr.splitCount || 2; // Default to 2 if missing old data
        return acc + (curr.amount / count);
    }, 0);

    const balance = myExpenses - fairShare;

    // If balance is negative, I owe money.
    const iOwe = balance < 0 ? Math.abs(balance) : 0;

    // Find custom creditor logic
    const creditor = expenses.find(e => {
        const isMe = (e.payerAddress && userWallet && e.payerAddress === userWallet) || (e.paidBy === userEmail);
        return !isMe;
    });
    const creditorAddress = creditor?.payerAddress;

    const handleDeleteExpense = (expenseId: string) => {
        const updatedExpenses = expenses.filter(e => e.id !== expenseId);
        const updatedGroup = {
            ...group,
            expenses: updatedExpenses,
        };
        onUpdateGroup(updatedGroup);
        toast.success("Expense deleted.");
    };

    const handleCopyLink = async () => {
        const url = window.location.href;
        try {
            await navigator.clipboard.writeText(url);
            toast.success("Group link copied!");
        } catch (err) {
            console.error('Clipboard API failed:', err);
            // Fallback: This will ALWAYS work because it's a native browser interaction
            window.prompt("Copy this link to share:", url);
        }
    };

    // Track initial state to prevent auto-closing when viewing history
    const [initialArchived] = useState(group.archived);

    // Auto-redirect if group is archived (e.g. by other user paying)
    useEffect(() => {
        // Only redirect if it wasn't archived when we opened it, but IS archived now.
        if (!initialArchived && group.archived) {
            const t = setTimeout(() => {
                // If onArchive is provided (Dashboard handles filter switch), use it.
                // Otherwise fallback to onBack (close view).
                if (onArchive) {
                    onArchive();
                } else {
                    onBack();
                }
            }, 1000);
            return () => clearTimeout(t);
        }
    }, [group.archived, initialArchived, onBack]);

    // Live Polling for Group Status (Vital for Creator waiting for payment)
    useEffect(() => {
        if (group.archived) return; // No need to poll if already settled

        const pollGroup = async () => {
            try {
                // Add timestamp to prevent caching
                const res = await fetch(`/api/groups?t=${Date.now()}`);
                if (res.ok) {
                    const allGroups = await res.json();
                    const updated = allGroups.find((g: any) => g.id === group.id);

                    if (updated) {
                        // Check if status changed to archived or if pendingTx appeared
                        const isNowArchived = updated.archived && !group.archived;
                        const hasNewTx = updated.pendingTx && !group.pendingTx;

                        if (isNowArchived || hasNewTx) {
                            // Force update via parent handler
                            console.log(`[GroupView] Detected remote change! Archived: ${updated.archived}`);
                            // Use onRemoteUpdate if available to avoid echoing back to server
                            if (onRemoteUpdate) {
                                onRemoteUpdate(updated);
                            } else {
                                onUpdateGroup(updated);
                            }
                        }
                    }
                }
            } catch (e) {
                console.error("Polling error", e);
            }
        };

        const interval = setInterval(pollGroup, 2000); // Check every 2s
        return () => clearInterval(interval);
    }, [group.id, group.archived, group.pendingTx, onUpdateGroup, onRemoteUpdate]);

    // Combine Expense and Transaction for timeline
    const timelineItems = [
        ...expenses.map(e => ({ ...e, type: 'expense' as const })),
        ...transactions.map(t => ({ ...t, type: 'transaction' as const, createdAt: t.timestamp }))
    ].sort((a, b) => b.createdAt - a.createdAt);

    return (
        <div className="space-y-6">
            {/* Header Section */}
            <div className="flex items-center justify-between pb-4 border-b">
                <div className="flex items-center gap-4">
                    <Button variant="outline" size="icon" onClick={onBack}>
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <div>
                        <h2 className="text-2xl font-bold tracking-tight">{group.name}</h2>
                        <div className="flex items-center gap-2 text-muted-foreground">
                            <span className="text-sm font-medium">Total Spent</span>
                            <span className="text-sm font-bold text-foreground bg-secondary px-2 py-0.5 rounded-md">${totalSpent.toFixed(2)}</span>
                        </div>
                    </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                    <ShareGroupDialog
                        group={group}
                        trigger={
                            <Button
                                variant="outline"
                                size="sm"
                                type="button"
                                className="gap-2 hidden md:flex"
                            >
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    width="24"
                                    height="24"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    className="h-4 w-4"
                                >
                                    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                                    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                                </svg>
                                Share Link
                            </Button>
                        }
                    />
                    <ShareGroupDialog
                        group={group}
                        trigger={
                            <Button
                                variant="outline"
                                size="icon"
                                type="button"
                                className="md:hidden"
                            >
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    width="24"
                                    height="24"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    className="h-4 w-4"
                                >
                                    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                                    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                                </svg>
                            </Button>
                        }
                    />


                    {(() => {
                        const normalizedUserEmail = userEmail?.toLowerCase();
                        const creatorEmail = group.createdBy?.toLowerCase();
                        const isGroupCreator = creatorEmail && normalizedUserEmail && creatorEmail === normalizedUserEmail;
                        const isDebtFree = (balance >= 0) || group.archived;

                        if (group.archived) return null;

                        if (isGroupCreator || isDebtFree) {
                            return (
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="text-muted-foreground hover:text-destructive"
                                    onClick={() => {
                                        const msg = group.archived
                                            ? "Remove this receipt from your history?"
                                            : "Delete this group for everyone?";
                                        if (confirm(msg)) {
                                            onDeleteGroup(group.id);
                                        }
                                    }}
                                >
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            );
                        }
                        return null;
                    })()}

                    {!group.archived && (
                        <AddExpenseDialog onAddExpense={handleAddExpense} />
                    )}
                </div>
            </div>

            {/* Receipt Banner */}
            {group.archived && (
                <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-4 flex items-center gap-4 text-emerald-600 dark:text-emerald-400">
                    <div className="h-8 w-8 bg-emerald-500/20 rounded-full flex items-center justify-center">
                        <Receipt className="h-4 w-4" />
                    </div>
                    <div>
                        <h3 className="font-bold">Payment Complete</h3>
                        <p className="text-xs opacity-80">This group has been settled.</p>
                    </div>
                </div>
            )}

            {/* Stats Cards */}
            <div className="grid gap-4 md:grid-cols-2">
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Your Balance</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className={`text-3xl font-bold ${group.archived ? 'text-muted-foreground' : (balance >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-destructive')}`}>
                            {group.archived ? '$0.00' : (balance >= 0 ? `+$${balance.toFixed(2)}` : `-$${Math.abs(balance).toFixed(2)}`)}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                            {group.archived ? "Settled" : (balance >= 0 ? "Amount you should receive" : "Amount you need to pay")}
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Settlement</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {(balance < 0 && !group.archived) ? (
                            <SettleUpDialog
                                amount={Math.abs(balance)}
                                recipientAddress={creditorAddress || ''}
                                recipientEmail={creditor?.paidBy}
                                payerEmail={userEmail}
                                disabled={balance >= 0 || !creditorAddress}
                                groupId={group.id}
                                onSuccess={(txHash) => {
                                    // kept for backward compat if needed, but onPaymentSent handles flow
                                }}
                                onPaymentSent={async (txHash) => {
                                    // 1. Mark group as pending AND add user to members
                                    // Do NOT await here so we redirect immediately (Optimistic UI)
                                    const updatedMembers = [...(group.members || [])];
                                    if (userEmail && !updatedMembers.includes(userEmail)) {
                                        updatedMembers.push(userEmail);
                                    }

                                    // Instead of just local update, trigger the Archive flow which redirects
                                    if (onArchive) {
                                        onArchive({ pendingTx: txHash, members: updatedMembers });
                                    } else {
                                        onUpdateGroup({ ...group, pendingTx: txHash, members: updatedMembers });
                                        onBack();
                                    }

                                    toast.info("Payment processing in background...");
                                }}
                            />
                        ) : group.archived ? (
                            <Button variant="secondary" disabled className="w-full">Archived</Button>
                        ) : (
                            <Button
                                className="w-full"
                                variant="outline"
                                onClick={async () => {
                                    if (confirm("Have you received the payment?")) {
                                        try {
                                            await saveTransaction({
                                                id: crypto.randomUUID(),
                                                from: 'Unknown',
                                                to: userWallet || '',
                                                fromEmail: 'Group Member', // generic for now
                                                toEmail: userEmail,
                                                amount: balance.toFixed(2),
                                                currency: 'USD',
                                                timestamp: Date.now(),
                                                description: `Settlement: ${group.name}`,
                                                groupId: group.id
                                            });
                                            toast.success("Transaction recorded");
                                        } catch (e) {
                                            console.error("Failed to save history", e);
                                        }

                                        if (onArchive) onArchive();
                                    }
                                }}
                            >
                                Mark as Received
                            </Button>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Expenses List */}
            <div className="space-y-4">
                <h3 className="text-lg font-semibold tracking-tight">Recent Activity</h3>
                <div className="space-y-2">
                    {timelineItems.length === 0 ? (
                        <div className="border border-dashed rounded-lg p-8 flex flex-col items-center justify-center text-center gap-2 text-muted-foreground">
                            <Receipt className="h-8 w-8 opacity-20" />
                            <p className="text-sm">No expenses added yet.</p>
                        </div>
                    ) : (
                        timelineItems.map((item) => {
                            if (item.type === 'transaction') {
                                const tx = item as Transaction & { type: 'transaction' };
                                return (
                                    <div key={tx.id} className="group relative">
                                        <Card className="hover:bg-muted/50 transition-colors border-emerald-500/20 bg-emerald-500/5">
                                            <CardContent className="flex items-center justify-between p-4">
                                                <div className="flex items-center gap-4">
                                                    <div className="h-10 w-10 rounded-lg bg-emerald-100 dark:bg-emerald-900/20 flex items-center justify-center">
                                                        {userEmail && tx.toEmail === userEmail ? <ArrowDownLeft className="h-5 w-5 text-emerald-600" /> : <ArrowUpRight className="h-5 w-5 text-emerald-600" />}
                                                    </div>
                                                    <div className="space-y-1">
                                                        <p className="text-sm font-medium leading-none">Payment: {tx.description || 'Settlement'}</p>
                                                        <p className="text-xs text-muted-foreground">
                                                            From: <span className="font-medium">
                                                                {tx.from && tx.from !== 'Unknown'
                                                                    ? `${tx.from.slice(0, 6)}...${tx.from.slice(-4)}`
                                                                    : (tx.fromEmail || 'Member')}
                                                            </span>
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <p className={`text-sm font-bold ${userEmail && tx.toEmail === userEmail ? 'text-emerald-600' : 'text-foreground'}`}>
                                                        {userEmail && tx.toEmail === userEmail ? '+' : '-'}${parseFloat(tx.amount).toFixed(2)}
                                                    </p>
                                                    <p className="text-xs text-muted-foreground">
                                                        {new Date(tx.timestamp).toLocaleDateString()} • {new Date(tx.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    </p>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    </div>
                                );
                            } else {
                                const expense = item as Expense & { type: 'expense' };
                                return (
                                    <div key={expense.id} className="group relative">
                                        <Card className="hover:bg-muted/50 transition-colors">
                                            <CardContent className="flex items-center justify-between p-4">
                                                <div className="flex items-center gap-4">
                                                    <div className="h-10 w-10 rounded-lg bg-secondary flex items-center justify-center">
                                                        <Receipt className="h-5 w-5 text-muted-foreground" />
                                                    </div>
                                                    <div className="space-y-1">
                                                        <p className="text-sm font-medium leading-none">{expense.title}</p>
                                                        <p className="text-xs text-muted-foreground">
                                                            Paid by <span className="font-medium text-foreground">
                                                                {expense.payerAddress
                                                                    ? `${expense.payerAddress.slice(0, 6)}...${expense.payerAddress.slice(-4)}`
                                                                    : (expense.paidBy === userEmail ? 'You' : expense.paidBy)}
                                                            </span>
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-sm font-bold">${expense.amount.toFixed(2)}</p>
                                                    <p className="text-xs text-muted-foreground">
                                                        {new Date(expense.createdAt).toLocaleDateString()} • {new Date(expense.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    </p>
                                                </div>
                                            </CardContent>

                                            {/* Delete Button */}
                                            {(() => {
                                                const isMyExpense = expense.paidBy === userEmail || (userWallet && expense.payerAddress === userWallet);
                                                const isGroupCreator = group.createdBy === userEmail;
                                                const isDebtFree = balance >= 0;
                                                const canDelete = !group.archived && (isMyExpense || isGroupCreator || isDebtFree);

                                                if (!canDelete) return null;

                                                return (
                                                    <button
                                                        className="absolute top-2 right-2 p-1 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            if (confirm("Delete this expense?")) {
                                                                handleDeleteExpense(expense.id);
                                                            }
                                                        }}
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </button>
                                                );
                                            })()}
                                        </Card>
                                    </div>
                                );
                            }
                        })
                    )}
                </div>
            </div>
        </div>
    );
}
