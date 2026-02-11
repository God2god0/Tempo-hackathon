'use client';

import { useState } from 'react';
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
import { Plus, Receipt } from 'lucide-react';
import { toast } from 'sonner';

interface AddExpenseDialogProps {
    onAddExpense: (title: string, amount: number, splitCount: number) => void;
}

export function AddExpenseDialog({ onAddExpense }: AddExpenseDialogProps) {
    const [open, setOpen] = useState(false);
    const [title, setTitle] = useState('');
    const [amount, setAmount] = useState('');
    const [splitCount, setSplitCount] = useState('2');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim() || !amount || !splitCount) return;

        const numAmount = parseFloat(amount);
        const numSplit = parseInt(splitCount);

        if (isNaN(numAmount) || numAmount <= 0) {
            toast.error('Please enter a valid amount');
            return;
        }
        if (isNaN(numSplit) || numSplit <= 0) {
            toast.error('Please enter a valid number of people');
            return;
        }

        onAddExpense(title, numAmount, numSplit);
        setOpen(false);
        setTitle('');
        setAmount('');
        setSplitCount('2');
        toast.success('Expense added!');
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button className="gap-2">
                    <Plus className="h-4 w-4" />
                    Add Expense
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Add an expense</DialogTitle>
                    <DialogDescription>
                        Who paid for what? Split it equally.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="title" className="text-right">
                            Title
                        </Label>
                        <Input
                            id="title"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="e.g. Dinner at Joe's"
                            className="col-span-3"
                        />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="splitCount" className="text-right">
                            Split (People)
                        </Label>
                        <div className="col-span-3 relative">
                            <Input
                                id="splitCount"
                                type="number"
                                min="1"
                                value={splitCount}
                                onChange={(e) => setSplitCount(e.target.value)}
                                placeholder="2"
                            />
                            <p className="text-[10px] text-muted-foreground mt-1 absolute -bottom-5 left-0">
                                (Enter number of people to split with)
                            </p>
                        </div>
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4 mt-2">
                        <Label htmlFor="amount" className="text-right">
                            Amount ($)
                        </Label>
                        <Input
                            id="amount"
                            type="number"
                            step="0.01"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            placeholder="0.00"
                            className="col-span-3"
                        />
                    </div>
                    <DialogFooter className="mt-4">
                        <Button type="submit">Add Expense</Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
