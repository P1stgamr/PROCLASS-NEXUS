import { forwardRef } from "react";
import { Button, ButtonProps } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface GlowButtonProps extends ButtonProps {
  glowColor?: "purple" | "blue" | "none";
}

export const GlowButton = forwardRef<HTMLButtonElement, GlowButtonProps>(
  ({ className, glowColor = "purple", ...props }, ref) => {
    return (
      <Button
        ref={ref}
        className={cn(
          "relative transition-all duration-300",
          glowColor === "purple" && "glow-purple hover:shadow-[0_0_25px_rgba(124,58,237,0.6)]",
          glowColor === "blue" && "glow-blue bg-secondary hover:bg-secondary/90 hover:shadow-[0_0_25px_rgba(59,130,246,0.6)]",
          className
        )}
        {...props}
      />
    );
  }
);
GlowButton.displayName = "GlowButton";
