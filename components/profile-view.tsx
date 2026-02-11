import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { LogOut, Trash2, ExternalLink, Copy, History, ArrowUpRight, ArrowDownLeft, Shield } from "lucide-react";
import { toast } from 'sonner';
import { getTransactions, Transaction } from '@/lib/history';
import { useEffect, useState } from 'react';
import { ScrollArea } from "@/components/ui/scroll-area";
import { ModeToggle } from "@/components/mode-toggle";

interface ProfileViewProps {
    user: any;
}

import { useWallets } from '@privy-io/react-auth';
// ... existing imports

export function ProfileView({ user }: ProfileViewProps) {
    const { wallets } = useWallets(); // Get all connected wallets
    const email = user?.email?.address?.toLowerCase() || '';
    const primaryWallet = user?.wallet?.address?.toLowerCase() || '';

    // Create a set of all my known addresses (primary + all connected)
    const myAddresses = new Set([primaryWallet]);
    if (wallets) {
        wallets.forEach(w => myAddresses.add(w.address.toLowerCase()));
    }
    if (user?.wallet?.address) {
        myAddresses.add(user.wallet.address.toLowerCase());
    }
    // Remove empty string if present
    myAddresses.delete('');

    const shortWallet = primaryWallet ? `${primaryWallet.slice(0, 6)}...${primaryWallet.slice(-4)}` : 'No Wallet';

    const [history, setHistory] = useState<Transaction[]>([]);

    useEffect(() => {
        const loadHistory = async () => {
            const allTx = await getTransactions();


            // Filter: Is this transaction related to me?
            const myTx = allTx.filter((tx: any) => {
                const txFrom = tx.from?.toLowerCase();
                const txTo = tx.to?.toLowerCase();
                const txFromEmail = tx.fromEmail?.toLowerCase();
                const txToEmail = tx.toEmail?.toLowerCase();

                const isMyWallet = (txFrom && myAddresses.has(txFrom)) || (txTo && myAddresses.has(txTo));
                const isMyEmail = email && ((txFromEmail === email) || (txToEmail === email));

                return isMyWallet || isMyEmail;
            });


            // Sort by new
            myTx.sort((a: any, b: any) => b.timestamp - a.timestamp);
            setHistory(myTx);
        };

        loadHistory();
        const interval = setInterval(loadHistory, 3000); // Poll every 3 seconds
        return () => clearInterval(interval);
    }, [user, wallets]);

    const handleCopyWallet = () => {
        if (primaryWallet) {
            navigator.clipboard.writeText(primaryWallet);
            toast.success("Wallet address copied!");
        }
    };



    return (
        <div className="space-y-6">

            {/* Identity Card */}
            <Card>
                <CardContent className="pt-6">
                    <div className="flex flex-col items-center text-center gap-4">
                        <Avatar className="h-24 w-24 border-4 border-background shadow-xl">
                            <AvatarImage src={`https://api.dicebear.com/7.x/notionists/svg?seed=${email}`} />
                            <AvatarFallback>U</AvatarFallback>
                        </Avatar>

                        <div className="space-y-1">
                            <h2 className="text-2xl font-bold">{email}</h2>
                            <div
                                className="flex items-center gap-2 text-sm text-muted-foreground bg-secondary px-3 py-1 rounded-full cursor-pointer hover:bg-secondary/80 transition-colors mx-auto w-fit"
                                onClick={handleCopyWallet}
                            >
                                <span className="font-mono">{shortWallet}</span>
                                <Copy className="h-3 w-3" />
                            </div>
                        </div>

                        <div className="flex gap-2 items-center">
                            <ModeToggle />
                            <Badge variant="outline" className="gap-1">
                                <Shield className="h-3 w-3" /> Verified
                            </Badge>
                            <Badge variant="secondary">Tempo User</Badge>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Actions Grid */}
            <div className="grid grid-cols-1 gap-4">
                <Button variant="outline" className="h-auto py-4 flex flex-col gap-1 items-center justify-center hover:bg-muted/50 w-full" onClick={() => window.open(`https://explore.tempo.xyz/address/${primaryWallet}`, '_blank')}>
                    <div className="flex items-center gap-2">
                        <ExternalLink className="h-5 w-5" />
                        <span className="font-semibold text-lg">View on Explorer</span>
                    </div>
                    <span className="text-xs text-muted-foreground">Check transactions on Tempo Scan</span>
                </Button>
            </div>


            {/* Transaction History */}
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold">Activity</h3>
                </div>

                <Card>
                    <CardContent className="p-0">
                        <ScrollArea className="h-[300px]">
                            {history.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground gap-2">
                                    <History className="h-8 w-8 opacity-20" />
                                    <p className="text-sm">No recent transactions.</p>
                                </div>
                            ) : (
                                <div className="divide-y">
                                    {history.map((tx: any) => {
                                        const txFrom = tx.from?.toLowerCase();
                                        const txFromEmail = tx.fromEmail?.toLowerCase();

                                        // Re-calculate isSent using the same set logic
                                        const isSent = (txFrom && myAddresses.has(txFrom)) ||
                                            (email && txFromEmail === email) ||
                                            tx.type === 'sent';

                                        const counterparty = isSent
                                            ? (tx.toEmail || tx.to || tx.counterparty || 'Unknown')
                                            : (tx.fromEmail || tx.from || tx.counterparty || 'Unknown');

                                        const description = tx.description || (isSent ? 'Sent' : 'Received');

                                        return (
                                            <div key={tx.id} className="flex items-center justify-between p-4 hover:bg-muted/50 transition-colors">
                                                <div className="flex items-center gap-4">
                                                    <div className={`h-8 w-8 rounded-full flex items-center justify-center ${isSent ? 'bg-red-100 text-red-600 dark:bg-red-900/20 dark:text-red-400' : 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400'}`}>
                                                        {isSent ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownLeft className="h-4 w-4" />}
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-medium">{description}</p>
                                                        <p className="text-xs text-muted-foreground font-mono">
                                                            {counterparty.slice(0, 10)}...
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <p className={`text-sm font-bold ${isSent ? 'text-foreground' : 'text-emerald-600 dark:text-emerald-400'}`}>
                                                        {isSent ? '-' : '+'}${tx.amount}
                                                    </p>
                                                    <p className="text-xs text-muted-foreground">
                                                        {new Date(tx.timestamp).toLocaleDateString()} • {new Date(tx.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    </p>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </ScrollArea>
                    </CardContent>
                </Card>
            </div>


        </div>
    );
}
