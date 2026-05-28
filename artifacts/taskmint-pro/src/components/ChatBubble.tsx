import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface ChatBubbleProps {
  text: string;
  timestamp: number;
  isOwn: boolean;
  userName?: string;
  photoURL?: string;
  showAvatar?: boolean;
}

export function ChatBubble({ text, timestamp, isOwn, userName, photoURL, showAvatar = true }: ChatBubbleProps) {
  return (
    <div className={cn("flex gap-2 w-full", isOwn ? "justify-end" : "justify-start")}>
      {!isOwn && showAvatar && (
        <Avatar className="w-8 h-8 mt-auto shrink-0">
          <AvatarImage src={photoURL} />
          <AvatarFallback>{userName?.charAt(0) || "U"}</AvatarFallback>
        </Avatar>
      )}
      {!isOwn && !showAvatar && <div className="w-8 shrink-0" />}
      
      <div className={cn("flex flex-col max-w-[75%]", isOwn ? "items-end" : "items-start")}>
        {!isOwn && showAvatar && userName && (
          <span className="text-[10px] text-muted-foreground ml-1 mb-1">{userName}</span>
        )}
        <div 
          className={cn(
            "px-4 py-2 rounded-2xl text-sm",
            isOwn 
              ? "bg-primary text-primary-foreground rounded-br-sm" 
              : "glass-card text-foreground rounded-bl-sm"
          )}
        >
          {text}
        </div>
        <span className="text-[10px] text-muted-foreground mt-1 mx-1">
          {format(timestamp, 'HH:mm')}
        </span>
      </div>
    </div>
  );
}
