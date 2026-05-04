import { MessageCircle, Repeat2, ThumbsUp } from "lucide-react";

export function EngagementBar({
  reactions,
  comments,
  shares,
}: {
  reactions: number;
  comments: number;
  shares: number;
}) {
  return (
    <div className="flex items-center gap-4 border-t border-white/8 pt-4 text-xs font-bold text-muted-foreground">
      <span className="flex items-center gap-1.5">
        <ThumbsUp size={15} /> {reactions}
      </span>
      <span className="flex items-center gap-1.5">
        <MessageCircle size={15} /> {comments}
      </span>
      <span className="flex items-center gap-1.5">
        <Repeat2 size={15} /> {shares}
      </span>
    </div>
  );
}
