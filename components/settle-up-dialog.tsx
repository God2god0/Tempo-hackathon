'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Wallet } from 'lucide-react';
import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseUnits } from 'viem';
import { toast } from 'sonner';
import { saveTransaction } from '@/lib/history';
import { useWallets, usePrivy } from '@privy-io/react-auth';

interface SettleUpDialogProps {
    amount: number;
    recipientAddress: string;
    recipientEmail?: string;
    payerEmail?: string;
    onSuccess?: (hash: string) => void;
    onPaymentSent?: (hash: string) => void;
    disabled?: boolean;
    groupId?: string;
}

export function SettleUpDialog({ amount, recipientAddress, recipientEmail, payerEmail, disabled, groupId, onSuccess, onPaymentSent }: SettleUpDialogProps) {
    const [memo, setMemo] = useState('');
    const [open, setOpen] = useState(false);

    const { writeContract, isPending, data: hash } = useWriteContract();
    const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
        hash,
    });

    // Move hook here so it's available in handleSettleUp
    const { wallets } = useWallets();
    const { user } = usePrivy();

    const USDC_ADDRESS = '0x20c0000000000000000000000000000000000000'; // pathUSD

    const handleSettleUp = () => {
        if (!recipientAddress) {
            toast.error("Invalid recipient address.");
            return;
        }

        toast.loading("Initiating payment...");

        writeContract({
            address: USDC_ADDRESS,
            abi: [{
                name: 'transfer',
                type: 'function',
                stateMutability: 'nonpayable',
                inputs: [
                    { name: 'recipient', type: 'address' },
                    { name: 'amount', type: 'uint256' }
                ],
                outputs: [{ name: '', type: 'bool' }]
            }],
            functionName: 'transfer',
            args: [recipientAddress as `0x${string}`, parseUnits(amount.toString(), 6)],
            // Hardcode gas fees to satisfy Tempo Moderato minimums (min base fee is ~20 Gwei)
            maxFeePerGas: BigInt(25000000000), // 25 Gwei
            maxPriorityFeePerGas: BigInt(25000000000), // 25 Gwei (Tempo often requires priority == max for instant inclusion)
        }, {
            onSuccess: (txHash) => {
                toast.success("Transaction sent! Waiting for confirmation...");

                // Optimistic Save
                // ROBUST ADDRESS CAPTURE: Priority: 1. Connected Wallet (from list), 2. User Object
                const activeWallet = wallets.find(w => w.address) || wallets[0];
                const rawPayerAddress = activeWallet?.address || user?.wallet?.address;

                if (rawPayerAddress) {
                    const payerAddress = rawPayerAddress.toLowerCase();
                    saveTransaction({
                        id: crypto.randomUUID(),
                        from: payerAddress,
                        to: recipientAddress.toLowerCase(), // Ensure recipient is also lowercase
                        amount: amount.toString(),
                        currency: 'USDC',
                        timestamp: Date.now(),
                        hash: txHash,
                        description: "Group Settlement",
                        fromEmail: payerEmail,
                        toEmail: recipientEmail,
                        groupId: groupId
                    });
                } else {
                    console.error("No payer address found for transaction history");
                    toast.error("Could not save to history: No wallet address found.");
                }

                if (onPaymentSent) {
                    onPaymentSent(txHash);
                    setOpen(false); // Close dialog immediately on send
                }
            },
            onError: (error) => {
                toast.dismiss();
                toast.error(`Payment failed: ${error.message.split('\n')[0]}`);
            },
        });
    };

    // We no longer wait for confirmation to close/save.
    // Saving is done on broadcast (optimistically) in handleSettleUp or parent.
    // Actually, let's keep a listener for toast only if it stays open?
    // But we close it immediately.

    // So we can remove the entire useEffect block for isConfirmed.

    // And manual confirmation button? Kept for safety if we re-open?
    // If we close on send, we don't need manual confirm.

    // Let's just remove the hook usage that blocks? 
    // "useWaitForTransactionReceipt" is fine for background, but we don't block UI.

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button
                    className={`w-full h-12 text-base font-semibold shadow-md transition-all ${!disabled ? 'bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white' : ''}`}
                    variant={disabled ? "secondary" : "default"}
                    disabled={disabled || isPending || isConfirming}
                >
                    {isPending || isConfirming ? (
                        <div className="flex items-center gap-2">
                            <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                            <span>Processing...</span>
                        </div>
                    ) : (
                        <div className="flex items-center gap-2">
                            <Wallet className="h-5 w-5" />
                            <span>Pay ${amount.toFixed(2)}</span>
                        </div>
                    )}
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Settle Up</DialogTitle>
                    <DialogDescription>
                        Send <b>${amount.toFixed(2)}</b> to settle your debt.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                        <Label htmlFor="memo">Memo (Optional)</Label>
                        <Input
                            id="memo"
                            placeholder="e.g., Dinner last night 🍕"
                            value={memo}
                            onChange={(e) => setMemo(e.target.value)}
                        />
                        <p className="text-[10px] text-muted-foreground">
                            This note will be saved on-chain forever.
                        </p>
                    </div>
                    <div className="rounded-md bg-muted p-3 text-xs text-muted-foreground">
                        <p><strong>Recipient:</strong> {recipientAddress.slice(0, 6)}...{recipientAddress.slice(-4)}</p>
                        <p><strong>Network:</strong> Tempo Testnet</p>
                    </div>
                </div>
                <DialogFooter>
                    <Button
                        onClick={handleSettleUp}
                        disabled={isPending || isConfirming}
                        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white"
                    >
                        {isConfirming && (
                            <div className="mt-2 text-center">
                                <p className="text-xs text-muted-foreground mb-2">Taking too long?</p>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                        // Force success manually
                                        toast.dismiss();
                                        toast.success("Payment marked as sent!");

                                        // Save manually
                                        if (wallets[0]) {
                                            saveTransaction({
                                                id: crypto.randomUUID(),
                                                from: wallets[0].address,
                                                to: recipientAddress,
                                                amount: amount.toString(),
                                                currency: 'USDC',
                                                timestamp: Date.now(),
                                                hash: hash || 'manual-confirm',
                                                description: memo || 'Group Settlement',
                                                fromEmail: payerEmail?.toLowerCase(),
                                                toEmail: recipientEmail?.toLowerCase()
                                            });
                                        }

                                        setOpen(false);
                                        if (onSuccess) onSuccess(hash || 'manual-confirm');
                                    }}
                                >
                                    I sent the payment, continue
                                </Button>
                            </div>
                        )}
                        {isPending ? 'Confirming in Wallet...' : isConfirming ? 'Processing Transaction...' : 'Pay Now'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
