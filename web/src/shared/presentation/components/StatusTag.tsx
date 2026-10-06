interface StatusTagProps {
  tone: "eligible" | "ineligible" | "pending" | "neutral" | "info";
  icon: string;
  label: string;
}

const tones: Record<StatusTagProps["tone"], string> = {
  eligible: "border-aptEligibleBorder bg-aptEligibleBg text-aptEligibleText",
  ineligible: "border-aptIneligibleBorder bg-aptIneligibleBg text-aptIneligibleText",
  pending: "border-aptPendingBorder bg-aptPendingBg text-aptPendingText",
  neutral: "border-border bg-background text-text-strong",
  info: "border-infoBlue bg-surface text-infoBlue",
};

// Status always pairs icon and text; color alone never carries meaning.
export function StatusTag({ tone, icon, label }: StatusTagProps) {
  return (
    <span
      className={`inline-flex items-center gap-xs rounded-sm border px-sm py-xs font-sans text-xs font-normal leading-[1.35] ${tones[tone]}`}
    >
      <span className="material-symbols-outlined text-[16px]" aria-hidden="true">
        {icon}
      </span>
      {label}
    </span>
  );
}
