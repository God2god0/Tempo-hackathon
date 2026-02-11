export interface Transaction {
    id: string;
    from: string;
    to: string;
    amount: string;
    currency: string;
    timestamp: number;
    hash?: string;
    description?: string; // e.g., "Fast Pay", "Group Settlement"
    fromEmail?: string;
    toEmail?: string;
    groupId?: string;
}

export async function saveTransaction(tx: Transaction) {
    try {
        const res = await fetch('/api/transactions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(tx),
        });
        if (!res.ok) throw new Error('Failed to save');
    } catch (error) {
        console.error("Failed to save transaction", error);
    }
}

export async function getTransactions(): Promise<Transaction[]> {
    if (typeof window === 'undefined') return []; // Server-side check
    try {
        // Add timestamp to prevent caching
        const res = await fetch(`/api/transactions?t=${Date.now()}`, {
            cache: 'no-store'
        });
        if (!res.ok) return [];
        const data = await res.json();
        // Sort by timestamp desc (newest first)
        return Array.isArray(data) ? data.sort((a: any, b: any) => b.timestamp - a.timestamp) : [];
    } catch (error) {
        console.error("Failed to load transactions", error);
        return [];
    }
}

export async function clearTransactions() {
    try {
        await fetch('/api/transactions', { method: 'DELETE' });
    } catch (error) {
        console.error("Failed to clear history", error);
    }
}
