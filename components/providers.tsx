'use client';

import { PrivyProvider } from '@privy-io/react-auth';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WagmiProvider, createConfig } from '@privy-io/wagmi';
import { http } from 'wagmi';
import { defineChain } from 'viem';

export const tempoTestnet = defineChain({
    id: 42431,
    name: 'Tempo Testnet (Moderato)',
    nativeCurrency: { name: 'USD', symbol: 'USD', decimals: 18 },
    rpcUrls: {
        default: { http: ['https://rpc.moderato.tempo.xyz'] },
    },
    blockExplorers: {
        default: { name: 'Tempo Explorer', url: 'https://explore.tempo.xyz' },
    },
    testnet: true,
});

const queryClient = new QueryClient();

export const config = createConfig({
    chains: [tempoTestnet],
    transports: {
        [tempoTestnet.id]: http(),
    },
});

export default function Providers({ children }: { children: React.ReactNode }) {
    // Suppress specific library warnings
    if (typeof window !== 'undefined') {
        const originalError = console.error;
        console.error = (...args) => {
            if (typeof args[0] === 'string' && args[0].includes('isActive')) return;
            originalError(...args);
        };
    }

    return (
        <PrivyProvider
            appId={process.env.NEXT_PUBLIC_PRIVY_APP_ID || 'INSERT_APP_ID'}
            config={{
                appearance: {
                    theme: 'light',
                    accentColor: '#6366f1',
                    showWalletLoginFirst: false,
                    logo: '', // Remove default Privy logo
                    landingHeader: 'Sign in to Qwick',
                    loginMessage: 'Secure, instant group settlements.',
                },
                embeddedWallets: {
                    ethereum: {
                        createOnLogin: 'users-without-wallets',
                    },
                },
                loginMethods: ['email'],
                defaultChain: tempoTestnet,
                supportedChains: [tempoTestnet],
            }}
        >
            <QueryClientProvider client={queryClient}>
                <WagmiProvider config={config}>
                    {children}
                </WagmiProvider>
            </QueryClientProvider>
        </PrivyProvider>
    );
}
