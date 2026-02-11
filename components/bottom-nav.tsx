import { Button } from "@/components/ui/button";
import { Home, ScanLine, User } from "lucide-react";
import { cn } from "@/lib/utils";

interface BottomNavProps {
    activeTab: 'groups' | 'fast-pay' | 'profile';
    onTabChange: (tab: 'groups' | 'fast-pay' | 'profile') => void;
}

export function BottomNav({ activeTab, onTabChange }: BottomNavProps) {
    return (
        <div className="fixed bottom-0 left-0 right-0 border-t bg-background/80 backdrop-blur-lg z-50 pb-safe">
            <div className="flex items-center justify-around p-2">
                <Button
                    variant="ghost"
                    className={cn(
                        "flex flex-col items-center gap-1 h-14 w-full rounded-lg transition-colors",
                        activeTab === 'groups' ? "text-primary bg-primary/10" : "text-muted-foreground hover:text-primary"
                    )}
                    onClick={() => onTabChange('groups')}
                >
                    <Home className="h-5 w-5" />
                    <span className="text-[10px] font-medium">Split</span>
                </Button>

                <Button
                    variant="ghost"
                    className={cn(
                        "flex flex-col items-center gap-1 h-14 w-full rounded-lg transition-colors",
                        activeTab === 'fast-pay' ? "text-primary bg-primary/10" : "text-muted-foreground hover:text-primary"
                    )}
                    onClick={() => onTabChange('fast-pay')}
                >
                    <ScanLine className="h-5 w-5" />
                    <span className="text-[10px] font-medium">Pay</span>
                </Button>

                <Button
                    variant="ghost"
                    className={cn(
                        "flex flex-col items-center gap-1 h-14 w-full rounded-lg transition-colors",
                        activeTab === 'profile' ? "text-primary bg-primary/10" : "text-muted-foreground hover:text-primary"
                    )}
                    onClick={() => onTabChange('profile')}
                >
                    <User className="h-5 w-5" />
                    <span className="text-[10px] font-medium">Me</span>
                </Button>
            </div>
        </div>
    );
}
