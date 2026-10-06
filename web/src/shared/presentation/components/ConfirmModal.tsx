import { useState } from "react";

export interface ModalField {
  name: string;
  label: string;
  type: "text" | "textarea" | "select";
  options?: string[];
  minLength?: number;
  required?: boolean;
  defaultValue?: string;
}

interface ConfirmModalProps {
  open: boolean;
  title: string;
  description?: string;
  fields?: ModalField[];
  onConfirm: (values: Record<string, string>) => void;
  onCancel: () => void;
  confirmLabel?: string;
  danger?: boolean;
}

export function ConfirmModal({ open, title, description, fields, onConfirm, onCancel, confirmLabel, danger }: ConfirmModalProps) {
  const [values, setValues] = useState<Record<string, string>>({});

  if (!open) return null;

  const invalid = (fields ?? []).some((field) => {
    const value = (values[field.name] ?? field.defaultValue ?? "").trim();
    if (field.required && value === "") return true;
    if (field.minLength && value.length < field.minLength) return true;
    return false;
  });

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-text-strong/40 backdrop-blur-[4px]">
      <div className="w-full max-w-[480px] rounded-lg border border-secondary-border bg-surface p-lg shadow-[0_12px_32px_-4px_rgba(60,48,30,0.12)]">
        <h3 className="mb-sm font-display text-lg font-semibold text-text-strong">{title}</h3>
        {description ? <p className="mb-sm font-sans text-sm text-text-muted">{description}</p> : null}
        {(fields ?? []).map((field) => (
          <label key={field.name} className="mb-sm block font-sans text-sm font-semibold text-text">
            {field.label}
            {field.type === "textarea" ? (
              <textarea
                className="field-input mt-xs h-auto min-h-[88px] py-sm font-normal"
                value={values[field.name] ?? field.defaultValue ?? ""}
                onChange={(e) => setValues({ ...values, [field.name]: e.target.value })}
              />
            ) : field.type === "select" ? (
              <select
                className="field-input mt-xs font-normal"
                value={values[field.name] ?? field.defaultValue ?? field.options?.[0] ?? ""}
                onChange={(e) => setValues({ ...values, [field.name]: e.target.value })}
              >
                {(field.options ?? []).map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            ) : (
              <input
                className="field-input mt-xs font-normal"
                value={values[field.name] ?? field.defaultValue ?? ""}
                onChange={(e) => setValues({ ...values, [field.name]: e.target.value })}
              />
            )}
          </label>
        ))}
        <div className="mt-md flex gap-sm">
          <button
            type="button"
            disabled={invalid}
            onClick={() => {
              const merged: Record<string, string> = {};
              for (const field of fields ?? []) {
                merged[field.name] = (values[field.name] ?? field.defaultValue ?? "").trim();
              }
              setValues({});
              onConfirm(merged);
            }}
            className={`inline-flex h-[40px] items-center rounded-md px-md font-sans text-sm font-semibold text-white ${danger ? "bg-coral hover:opacity-90" : "bg-primary-action hover:bg-primary-pressed"}`}
          >
            {confirmLabel ?? "Confirmar"}
          </button>
          <button
            type="button"
            onClick={() => {
              setValues({});
              onCancel();
            }}
            className="inline-flex h-[40px] items-center rounded-md border border-border bg-surface px-md font-sans text-sm font-semibold text-text-strong hover:bg-background"
          >
            Voltar
          </button>
        </div>
      </div>
    </div>
  );
}
