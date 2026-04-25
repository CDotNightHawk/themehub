import { cn } from "@/lib/utils";
import * as React from "react";

export function Card({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-xl border border-[color:var(--card-border)] bg-[color:var(--card)]",
        className,
      )}
      {...props}
    />
  );
}

export function Button({
  className,
  variant = "primary",
  size = "md",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
}) {
  const sizes = {
    sm: "h-8 px-3 text-sm",
    md: "h-10 px-4 text-sm",
    lg: "h-12 px-6 text-base",
  } as const;
  const variants = {
    primary:
      "bg-[color:var(--accent)] text-[color:var(--accent-foreground)] hover:opacity-90",
    secondary:
      "border border-[color:var(--card-border)] bg-[color:var(--card)] hover:bg-black/5 dark:hover:bg-white/5",
    ghost: "hover:bg-black/5 dark:hover:bg-white/5",
    danger:
      "bg-red-600 text-white hover:bg-red-700 disabled:opacity-50",
  } as const;
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-lg font-medium transition disabled:cursor-not-allowed disabled:opacity-60",
        sizes[size],
        variants[variant],
        className,
      )}
      {...props}
    />
  );
}

export function Input({
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "h-10 w-full rounded-lg border border-[color:var(--card-border)] bg-[color:var(--card)] px-3 text-sm outline-none focus:border-[color:var(--accent)] focus:ring-2 focus:ring-[color:var(--accent)]/30",
        className,
      )}
      {...props}
    />
  );
}

export function Textarea({
  className,
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        "min-h-24 w-full rounded-lg border border-[color:var(--card-border)] bg-[color:var(--card)] p-3 text-sm outline-none focus:border-[color:var(--accent)] focus:ring-2 focus:ring-[color:var(--accent)]/30",
        className,
      )}
      {...props}
    />
  );
}

export function Badge({
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border border-[color:var(--card-border)] bg-[color:var(--card)] px-2.5 py-0.5 text-xs font-medium text-[color:var(--muted)]",
        className,
      )}
      {...props}
    />
  );
}

export function Stars({ value, count }: { value: number | null; count: number }) {
  const stars = value ?? 0;
  return (
    <span className="inline-flex items-center gap-1 text-xs text-[color:var(--muted)]">
      <span aria-hidden className="text-amber-500">
        {"★".repeat(Math.round(stars))}
        <span className="opacity-30">{"★".repeat(5 - Math.round(stars))}</span>
      </span>
      <span>
        {value !== null ? value.toFixed(1) : "—"}
        {count > 0 ? ` (${count})` : ""}
      </span>
    </span>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-[color:var(--card-border)] p-10 text-center">
      <h3 className="text-base font-semibold">{title}</h3>
      {description && (
        <p className="max-w-md text-sm text-[color:var(--muted)]">{description}</p>
      )}
      {action}
    </div>
  );
}
