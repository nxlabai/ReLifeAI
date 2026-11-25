"use client";
import Link from "next/link";
import type { ReactNode } from "react";
import { FlaskConical, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";

export function PageHeader({ title, description, icon: Icon, actions }: { title: string; description?: string; icon?: LucideIcon; actions?: ReactNode }) {
  return (
    <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="flex items-center gap-3 text-2xl font-bold sm:text-3xl">
          {Icon && (
            <span className="grid size-11 place-items-center rounded-2xl bg-secondary text-primary" aria-hidden>
              <Icon className="size-6" />
            </span>
          )}
          {title}
        </h1>
        {description && <p className="mt-2 text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function PageContainer({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("mx-auto w-full max-w-6xl px-4 py-8 sm:py-10", className)}>{children}</div>;
}

export function DemoBadge({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full border border-brand-orange-strong/40 bg-accent px-2.5 py-0.5 text-sm font-semibold text-accent-foreground", className)}>
      <FlaskConical className="size-4" aria-hidden /> 데모 데이터
    </span>
  );
}

export function EmptyState({ icon: Icon, title, description, href, cta }: { icon: LucideIcon; title: string; description: string; href?: string; cta?: string }) {
  return (
    <div className="rounded-2xl border border-dashed bg-white p-8 text-center">
      <Icon className="mx-auto size-10 text-primary" aria-hidden />
      <h2 className="mt-3 text-lg font-bold">{title}</h2>
      <p className="mt-1 text-muted-foreground">{description}</p>
      {href && cta && (
        <Link href={href} className={cn(buttonVariants(), "mt-5")}>
          {cta}
        </Link>
      )}
    </div>
  );
}

/** 단일/복수 선택 칩 (role=radio/checkbox 로 스크린리더 지원) */
export function ChoiceGroup({
  label, options, value, onChange, multiple = false, columns = 2, hint,
}: {
  label: string;
  options: { value: string; label: string }[];
  value: string | string[] | undefined;
  onChange: (v: string | string[] | undefined) => void;
  multiple?: boolean;
  columns?: 2 | 3;
  hint?: string;
}) {
  const selected = (v: string) => (multiple ? ((value as string[]) ?? []).includes(v) : value === v);
  const toggle = (v: string) => {
    if (multiple) {
      const arr = (value as string[]) ?? [];
      onChange(arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);
    } else onChange(value === v ? undefined : v);
  };
  return (
    <fieldset className="space-y-3">
      <legend className="text-base font-semibold">
        {label} {multiple && <span className="text-sm font-normal text-muted-foreground">(복수 선택 가능)</span>}
      </legend>
      {hint && <p className="text-sm text-muted-foreground">{hint}</p>}
      <div role={multiple ? "group" : "radiogroup"} aria-label={label} className={cn("grid gap-2", columns === 3 ? "grid-cols-2 sm:grid-cols-3" : "grid-cols-1 sm:grid-cols-2")}>
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            role={multiple ? "checkbox" : "radio"}
            aria-checked={selected(o.value)}
            onClick={() => toggle(o.value)}
            className={cn(
              "min-h-12 rounded-xl border-2 px-4 py-2 text-left font-medium transition-colors",
              selected(o.value) ? "border-primary bg-secondary text-primary" : "border-border bg-white hover:border-primary/50",
            )}
          >
            <span aria-hidden className="mr-2">{selected(o.value) ? "✓" : ""}</span>
            {o.label}
          </button>
        ))}
      </div>
    </fieldset>
  );
}

export function NativeSelect({ id, label, options, value, onChange, placeholder = "선택해 주세요" }: { id: string; label: string; options: { value: string; label: string }[]; value?: string; onChange: (v?: string) => void; placeholder?: string }) {
  return (
    <div className="space-y-2">
      <label htmlFor={id} className="block text-base font-semibold">{label}</label>
      <select
        id={id}
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value || undefined)}
        className="h-12 w-full rounded-xl border border-input bg-white px-4 text-base focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        <option value="">{placeholder}</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </div>
  );
}

export function StatusPill({ status }: { status: string }) {
  const map: Record<string, [string, string]> = {
    open: ["모집 중", "bg-emerald-100 text-emerald-900"],
    upcoming: ["모집 예정", "bg-sky-100 text-sky-900"],
    closed: ["모집 종료", "bg-gray-200 text-gray-800"],
    unknown: ["모집 여부 확인 필요", "bg-amber-100 text-amber-900"],
  };
  const [label, cls] = map[status] ?? map.unknown;
  return <span className={cn("rounded-full px-2.5 py-0.5 text-sm font-semibold", cls)}>{label}</span>;
}
