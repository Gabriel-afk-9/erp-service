import type { ButtonHTMLAttributes } from "react";

type ButtonVariant = "primary" | "secondary" | "danger" | "ghost";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
}

// One filled primary action per context; secondary actions stay neutral.
export function Button({ variant = "secondary", className, ...rest }: ButtonProps) {
  const base =
    "inline-flex h-[40px] items-center justify-center gap-xs rounded-md px-md font-sans text-sm font-semibold leading-[1.35] transition-colors focus:outline-none disabled:opacity-50";
  const styles: Record<ButtonVariant, string> = {
    primary: "bg-primary-action text-white hover:bg-primary-pressed shadow-sm",
    secondary: "border border-border bg-surface text-text-strong hover:bg-background",
    danger: "border border-coral bg-surface text-[#B83222] hover:bg-aptIneligibleBg",
    ghost: "text-primary-action hover:bg-primary-soft",
  };
  return <button className={`${base} ${styles[variant]} ${className ?? ""}`} {...rest} />;
}
