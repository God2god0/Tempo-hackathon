'use client';

import { usePrivy } from '@privy-io/react-auth';
import { useReadContract } from 'wagmi';
import { formatUnits } from 'viem';
import { Button } from '@/components/ui/button';

const USDC_ADDRESS = '0x20c0000000000000000000000000000000000000'; // pathUSD

function WalletBalance({ address }: { address: string }) {
    const { data: balance } = useReadContract({
        address: USDC_ADDRESS,
        abi: [{
            name: 'balanceOf',
            type: 'function',
            stateMutability: 'view',
            inputs: [{ name: 'account', type: 'address' }],
            outputs: [{ name: '', type: 'uint256' }]
        }],
        functionName: 'balanceOf',
        args: [address as `0x${string}`],
        query: {
            refetchInterval: 5000, // Refresh every 5s
        }
    });

    if (!balance) return null;

    return (
        <span className="text-xs font-mono text-emerald-600 bg-emerald-50 px-2 py-1 rounded border border-emerald-100">
            ${Number(formatUnits(balance as bigint, 6)).toFixed(2)}
        </span>
    );
}

export function LoginButton() {
    const { login, ready, authenticated, user, logout } = usePrivy();

    const disableLogin = !ready || (authenticated && !user);

    if (!ready) {
        return <Button disabled>Loading...</Button>;
    }

    if (authenticated && user) {
        return (
            <div className="flex flex-col items-end gap-1">
                <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 px-2 py-1 rounded-md">
                    {user.wallet?.address && <WalletBalance address={user.wallet.address} />}
                    <span className="font-mono">{user.wallet?.address ? `${user.wallet.address.slice(0, 6)}...${user.wallet.address.slice(-4)}` : 'No Wallet'}</span>
                    {user.wallet?.address && (
                        <button
                            onClick={() => {
                                navigator.clipboard.writeText(user.wallet!.address!);
                                alert("Address copied!");
                            }}
                            className="hover:text-foreground transition-colors"
                            title="Copy Address"
                        >
                            📋
                        </button>
                    )}
                </div>
                <span className="text-xs text-muted-foreground">auth: {user.email?.address || user.phone?.number}</span>
                <Button variant="outline" size="sm" onClick={logout} className="h-7 text-xs">
                    Logout
                </Button>
            </div>
        );
    }

    return (
        <Button onClick={login}>
            Log in
        </Button>
    );
}
