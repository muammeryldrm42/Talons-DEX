import { cn } from "@/lib/utils";
import { type HTMLAttributes } from "react";

export function Badge({ className, ...props }: HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn("inline-flex items-center rounded-md border border-cyan-400/60 bg-cyan-500/10 px-2 py-1 text-xs font-semibold text-cyan-300", className)}
      {...props}
    />
  );
}
