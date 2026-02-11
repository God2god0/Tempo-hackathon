import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

const dataFilePath = path.join(process.cwd(), 'data', 'db.json');

// Helper to read data
function readData() {
    try {
        if (!fs.existsSync(dataFilePath)) {
            // Create data dir if not exists
            const dataDir = path.join(process.cwd(), 'data');
            if (!fs.existsSync(dataDir)) {
                fs.mkdirSync(dataDir);
            }
            fs.writeFileSync(dataFilePath, '[]', 'utf8');
            return [];
        }
        const fileData = fs.readFileSync(dataFilePath, 'utf8');
        return JSON.parse(fileData);
    } catch (error) {
        console.error("Error reading db.json:", error);
        throw error; // Throw so we don't accidentally overwrite DB with []
    }
}

// Helper to write data
function writeData(data: any) {
    try {
        fs.writeFileSync(dataFilePath, JSON.stringify(data, null, 2), 'utf8');
        return true;
    } catch (error) {
        console.error("Error writing db.json:", error);
        return false;
    }
}

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const userEmail = searchParams.get('user');

        const data = readData();

        if (userEmail) {
            // Filter groups for this user
            const filteredData = data.filter((g: any) => {
                const isCreator = g.createdBy === userEmail;
                const isMember = g.members && g.members.includes(userEmail);
                return isCreator || isMember;
            });
            return NextResponse.json(filteredData);
        }

        return NextResponse.json(data);
    } catch (error) {
        // If file doesn't exist (new install), readData might throw if we aren't careful?
        // But readData handles existsSync. It throws on Parse/Read error.
        console.error("GET /groups error:", error);
        // Return empty if really broken, or error?
        // For GET, returning empty is safer than crashing, but we should distinguish.
        return NextResponse.json([], { status: 200 });
    }
}

import { logToServer } from '@/lib/logger';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { action, group, groups } = body;
        logToServer(`POST /api/groups action=${action}`, group?.id || 'bulk');

        let currentData = readData();

        if (action === 'overwrite') {
            // Replace all data (e.g. for reset)
            if (groups) {
                currentData = groups;
            }
        } else if (action === 'update' || action === 'create') {
            // Update or Add a single group
            if (group) {
                const index = currentData.findIndex((g: any) => g.id === group.id);
                if (index !== -1) {
                    currentData[index] = group;
                } else {
                    currentData.unshift(group);
                }
            }
        } else if (action === 'delete') {
            if (group && group.id) {
                currentData = currentData.filter((g: any) => g.id !== group.id);
            }
        }

        writeData(currentData);
        logToServer("Groups updated successfully");
        return NextResponse.json(currentData);
    } catch (error) {
        logToServer("Error in POST /api/groups", error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
