import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

const DATA_DIR = path.join(process.cwd(), 'data');
const FILE_PATH = path.join(DATA_DIR, 'transactions.json');

// Helper to read transactions
function readTransactions() {
    if (!fs.existsSync(FILE_PATH)) {
        return [];
    }
    const data = fs.readFileSync(FILE_PATH, 'utf-8');
    try {
        return JSON.parse(data);
    } catch (error) {
        console.error("Error parsing transactions.json:", error);
        return [];
    }
}

// Helper to write transactions
function writeTransactions(transactions: any[]) {
    // Ensure directory exists
    if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(FILE_PATH, JSON.stringify(transactions, null, 2));
}

export async function GET() {
    const transactions = readTransactions();
    return NextResponse.json(transactions);
}

import { logToServer } from '@/lib/logger';

export async function POST(request: Request) {
    try {
        const newTransaction = await request.json();
        logToServer("POST /api/transactions received", newTransaction);

        // Basic validation
        if (!newTransaction.id || !newTransaction.amount) {
            logToServer("Invalid transaction data", newTransaction);
            return NextResponse.json({ error: 'Invalid transaction data' }, { status: 400 });
        }

        const transactions = readTransactions();
        const updatedTransactions = [newTransaction, ...transactions];

        writeTransactions(updatedTransactions);
        logToServer("Transaction saved successfully", newTransaction.id);

        return NextResponse.json({ success: true, transaction: newTransaction });
    } catch (error) {
        logToServer("Error in POST /api/transactions", error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function DELETE() {
    writeTransactions([]);
    return NextResponse.json({ success: true, message: 'History cleared' });
}
