import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Copy, Check, Share2 } from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";

interface ShareGroupDialogProps {
    group: any;
    trigger?: React.ReactNode;
}

export function ShareGroupDialog({ group, trigger }: ShareGroupDialogProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [link, setLink] = useState("");
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        if (isOpen && group) {
            try {
                // Safe base64 encode for utf-8
                const jsonString = JSON.stringify(group);
                const encoded = window.btoa(unescape(encodeURIComponent(jsonString)));
                const shareUrl = `${window.location.origin}/?import=${encoded}`;
                setLink(shareUrl);
            } catch (err) {
                console.error("Failed to generate share link", err);
                setLink("Error generating link");
            }
        }
    }, [isOpen, group]);

    const handleCopy = async () => {
        if (!link) return;
        try {
            await navigator.clipboard.writeText(link);
            setCopied(true);
            toast.success("Link copied to clipboard!");
            setTimeout(() => {
                setCopied(false);
                setIsOpen(false);
            }, 1000);
        } catch (err) {
            // Fallback for failed clipboard
            const input = document.getElementById("share-link-input") as HTMLInputElement;
            if (input) {
                input.select();
                document.execCommand("copy");
                setCopied(true);
                toast.success("Link copied!");
                setTimeout(() => {
                    setCopied(false);
                    setIsOpen(false);
                }, 1000);
            }
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                {trigger || (
                    <Button variant="outline" className="gap-2">
                        <Share2 className="h-4 w-4" />
                        Share Link
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Share Group</DialogTitle>
                    <DialogDescription>
                        Anyone with this link can join <strong>{group.name}</strong> and see existing expenses.
                    </DialogDescription>
                </DialogHeader>
                <div className="flex items-center space-x-2">
                    <div className="grid flex-1 gap-2">
                        <Label htmlFor="link" className="sr-only">
                            Link
                        </Label>
                        <Input
                            id="share-link-input"
                            value={link}
                            readOnly
                            className="h-9"
                            onFocus={(e) => e.target.select()}
                        />
                    </div>
                    <Button type="button" size="sm" className="px-3" onClick={handleCopy}>
                        {copied ? (
                            <Check className="h-4 w-4" />
                        ) : (
                            <Copy className="h-4 w-4" />
                        )}
                        <span className="sr-only">Copy</span>
                    </Button>
                </div>
                <DialogFooter className="sm:justify-start">
                    <div className="text-[10px] text-muted-foreground text-center w-full">
                        This link contains a snapshot of the current group data.
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
