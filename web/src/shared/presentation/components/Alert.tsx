interface AlertProps {
  tone: "error" | "warning" | "info";
  message: string;
}

// At most one prominent alert per screen; common messages use inline text.
export function Alert({ tone, message }: AlertProps) {
  const styles: Record<AlertProps["tone"], string> = {
    error: "border-coral bg-aptIneligibleBg text-aptIneligibleText",
    warning: "border-accentOrange bg-aptPendingBg text-aptPendingText",
    info: "border-infoBlue bg-surface text-infoBlue",
  };
  return (
    <p role="alert" className={`mt-md rounded-md border px-md py-sm font-sans text-sm ${styles[tone]}`}>
      {message}
    </p>
  );
}
