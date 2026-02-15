'use client';

import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import QRCode from 'react-qr-code';
import { Scanner } from '@yudiel/react-qr-scanner';
import { toast } from 'sonner';
import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseUnits } from 'viem';
import { saveTransaction } from '@/lib/history';
import { useWallets } from '@privy-io/react-auth';
import { ArrowDown, ArrowUp, Zap, ShieldCheck } from 'lucide-react';

interface FastPayViewProps {
    userAddress?: string;
}

export function FastPayView({ userAddress }: FastPayViewProps) {
    const [mode, setMode] = useState<'receive' | 'pay'>('receive');
    const [amount, setAmount] = useState('');
    const [qrValue, setQrValue] = useState<string | null>(null);
    const [scannedData, setScannedData] = useState<any | null>(null);
    const { wallets } = useWallets();

    // Wagmi Hooks for Contract Interaction
    const { writeContract, isPending, data: hash } = useWriteContract();
    const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
        hash,
    });

    // Reset when confirmed
    useEffect(() => {
        const saveAndReset = async () => {
            if (isConfirmed && scannedData) {
                toast.success("Payment Successful! 🎉");
                if (wallets[0]) {
                    await saveTransaction({
                        id: crypto.randomUUID(),
                        from: wallets[0].address,
                        to: scannedData.recipient,
                        amount: scannedData.amount,
                        currency: 'USDC',
                        timestamp: Date.now(),
                        hash: hash,
                        description: 'Fast Pay'
                    });
                }
                setScannedData(null);
                setMode('receive');
            }
        };
        saveAndReset();
    }, [isConfirmed, hash, scannedData]);

    const USDC_ADDRESS = '0x20c0000000000000000000000000000000000000'; // pathUSD on Tempo Moderato

    const handleGenerateQR = () => {
        if (!amount || parseFloat(amount) <= 0) {
            toast.error("Please enter a valid amount");
            return;
        }
        if (!userAddress) {
            toast.error("Wallet not connected");
            return;
        }

        const data = JSON.stringify({
            type: 'fast-pay',
            recipient: userAddress,
            amount: amount,
            currency: 'USDC'
        });

        setQrValue(data);
        toast.success("QR Code Generated!");
    };

    const handleScan = (text: string) => {
        if (text) {
            try {
                const data = JSON.parse(text);
                if (data.type === 'fast-pay' && data.recipient && data.amount) {
                    setScannedData(data);
                    toast.success("QR Code Scanned!");
                }
            } catch (e) {
                // ignore
            }
        }
    };

    const handleConfirmPayment = () => {
        if (!scannedData) return;

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
            args: [scannedData.recipient as `0x${string}`, parseUnits(scannedData.amount.toString(), 6)],

        }, {
            onError: (error: any) => {
                console.error("Payment failed", error);
                toast.error(`Payment failed: ${error.message.split('\n')[0]}`);
            }
        });
    };

    return (
        <div className="flex flex-col items-center justify-center p-4 space-y-8 animate-in fade-in duration-500">

            {/* Main Card - Uses standard semantic colors */}
            <div className="w-full max-w-sm relative">
                {/* Decorative Elements */}
                <div className="absolute top-10 left-0 w-full h-full bg-gradient-to-b from-primary/5 to-transparent blur-3xl rounded-full -z-10 dark:opacity-20"></div>

                <div className="bg-card rounded-[2rem] shadow-2xl overflow-hidden border border-border relative z-10 text-card-foreground">
                    {/* Card Header / Toggle */}
                    <div className="bg-muted p-2 m-2 rounded-2xl flex border border-border">
                        <button
                            onClick={() => setMode('receive')}
                            className={`flex-1 py-3 text-sm font-semibold rounded-xl transition-all duration-300 flex items-center justify-center gap-2 ${mode === 'receive' ? 'bg-background shadow-sm text-foreground ring-1 ring-black/5 dark:ring-white/10' : 'text-muted-foreground hover:text-foreground'}`}
                        >
                            <ArrowDown className="h-4 w-4" /> Receive
                        </button>
                        <button
                            onClick={() => setMode('pay')}
                            className={`flex-1 py-3 text-sm font-semibold rounded-xl transition-all duration-300 flex items-center justify-center gap-2 ${mode === 'pay' ? 'bg-background shadow-sm text-foreground ring-1 ring-black/5 dark:ring-white/10' : 'text-muted-foreground hover:text-foreground'}`}
                        >
                            <ArrowUp className="h-4 w-4" /> Pay
                        </button>
                    </div>

                    <div className="p-8 pb-10 space-y-8">
                        {/* RECEIVE MODE */}
                        {mode === 'receive' && (
                            !qrValue ? (
                                <div className="space-y-8 text-center animate-in slide-in-from-bottom-2 fade-in duration-300">
                                    <div className="space-y-1">
                                        <div className="relative flex flex-col justify-center items-center py-10">
                                            <div className="relative flex items-center justify-center gap-1 group">
                                                <span className="text-2xl md:text-4xl font-light text-muted-foreground/40 transition-colors group-focus-within:text-foreground pb-1 md:pb-2">$</span>
                                                <Input
                                                    type="number"
                                                    value={amount}
                                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAmount(e.target.value)}
                                                    className="w-full max-w-[200px] md:max-w-[300px] text-center text-5xl md:text-7xl font-light border-none shadow-none focus-visible:ring-0 p-0 text-foreground placeholder:text-muted-foreground/20 bg-transparent tracking-tight h-auto caret-primary selection:bg-primary/20"
                                                    placeholder="0"
                                                />
                                            </div>
                                            {/* Subtitle/Helper */}
                                            <p className="text-xs text-muted-foreground mt-4 font-medium tracking-[0.2em] opacity-0 transition-opacity group-focus-within:opacity-100">
                                                ENTER AMOUNT
                                            </p>
                                        </div>
                                    </div>

                                    <Button
                                        size="lg"
                                        className="w-full h-14 rounded-xl shadow-lg text-lg font-semibold transition-all hover:scale-[1.02] active:scale-[0.98]"
                                        onClick={handleGenerateQR}
                                    >
                                        Create Request
                                    </Button>

                                    <p className="text-xs text-center text-muted-foreground px-4">
                                        Enter the amount you want to receive to generate a payment request.
                                    </p>

                                    <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground font-medium pt-2">
                                        <ShieldCheck className="h-3 w-3" />
                                        Secured by Tempo
                                    </div>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center space-y-6 animate-in zoom-in duration-300">
                                    <div className="bg-white p-4 rounded-3xl shadow-[0_0_40px_-10px_rgba(0,0,0,0.1)] ring-1 ring-border">
                                        <QRCode value={qrValue} size={200} />
                                    </div>
                                    <div className="text-center space-y-1">
                                        <h3 className="text-4xl font-bold text-foreground">${amount}</h3>
                                        <p className="text-muted-foreground text-sm font-medium">Scan with Qwick to pay</p>
                                    </div>
                                    <Button variant="ghost" className="w-full text-muted-foreground hover:bg-muted" onClick={() => { setAmount(''); setQrValue(null); }}>
                                        Cancel
                                    </Button>
                                </div>
                            )
                        )}

                        {/* PAY MODE */}
                        {mode === 'pay' && (
                            !scannedData ? (
                                <div className="space-y-6 animate-in slide-in-from-bottom-2 fade-in duration-300">
                                    <div className="aspect-square rounded-3xl overflow-hidden border-4 border-muted shadow-inner bg-muted relative group">
                                        <Scanner
                                            onScan={(detectedCodes: any[]) => {
                                                if (detectedCodes && detectedCodes.length > 0) {
                                                    handleScan(detectedCodes[0].rawValue);
                                                }
                                            }}
                                            allowMultiple={true}
                                            scanDelay={2000}
                                            styles={{ container: { width: '100%', height: '100%' } }}
                                        />
                                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                            <div className="w-48 h-48 border-2 border-white/50 rounded-2xl relative">
                                                <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-white"></div>
                                                <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-white"></div>
                                                <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-white"></div>
                                                <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-white"></div>
                                            </div>
                                        </div>
                                    </div>
                                    <p className="text-center text-sm font-medium text-muted-foreground">
                                        Scan a code to send money instantly.
                                    </p>
                                </div>
                            ) : (
                                <div className="space-y-8 text-center animate-in zoom-in duration-300">
                                    <div className="h-16 w-16 bg-primary/10 text-primary rounded-full flex items-center justify-center mx-auto ring-8 ring-primary/5">
                                        <Zap className="h-8 w-8 fill-current" />
                                    </div>
                                    <div className="space-y-2">
                                        <p className="text-muted-foreground font-medium uppercase tracking-wider text-xs">Confirm Payment</p>
                                        <h3 className="text-5xl font-bold text-foreground tracking-tight">${scannedData.amount}</h3>
                                        <div className="inline-flex items-center gap-2 bg-muted px-3 py-1.5 rounded-full border border-border">
                                            <span className="text-xs text-muted-foreground">To</span>
                                            <span className="text-xs text-foreground font-mono font-bold">{scannedData.recipient.slice(0, 6)}...{scannedData.recipient.slice(-4)}</span>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-3">
                                        <Button variant="outline" className="h-12 border-border" onClick={() => setScannedData(null)}>
                                            Cancel
                                        </Button>
                                        <Button
                                            className="h-12 shadow-lg"
                                            onClick={handleConfirmPayment}
                                            disabled={isPending || isConfirming}
                                        >
                                            {isPending ? 'Confirming...' : isConfirming ? 'Processing...' : 'Pay Now'}
                                        </Button>
                                    </div>
                                </div>
                            )
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
