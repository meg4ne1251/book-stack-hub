import * as React from "react";
import { cn } from "@/lib/utils";

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "default" | "secondary" | "destructive" | "outline";
}

function Badge({ className, variant = "default", ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded px-2 py-0.5 text-xs font-medium transition-colors",
        {
          "bg-amber-100 text-amber-800": variant === "default",
          "bg-stone-100 text-stone-600": variant === "secondary",
          "bg-red-50 text-red-700":
            variant === "destructive",
          "border border-stone-300 text-stone-600": variant === "outline",
        },
        className
      )}
      {...props}
    />
  );
}

export { Badge };
