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
    <div className="fixed inset-0 flex items-center justify-center bg-black/40">
      <div className="w-96 rounded bg-white p-4 shadow">
        <h3 className="mb-2 font-semibold">{title}</h3>
        {description ? <p className="mb-2 text-sm text-gray-600">{description}</p> : null}
        {(fields ?? []).map((field) => (
          <label key={field.name} className="mb-2 block text-sm">
            {field.label}
            {field.type === "textarea" ? (
              <textarea
                className="mt-1 w-full rounded border px-2 py-1"
                value={values[field.name] ?? field.defaultValue ?? ""}
                onChange={(e) => setValues({ ...values, [field.name]: e.target.value })}
              />
            ) : field.type === "select" ? (
              <select
                className="mt-1 w-full rounded border px-2 py-1"
                value={values[field.name] ?? field.defaultValue ?? field.options?.[0] ?? ""}
                onChange={(e) => setValues({ ...values, [field.name]: e.target.value })}
              >
                {(field.options ?? []).map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            ) : (
              <input
                className="mt-1 w-full rounded border px-2 py-1"
                value={values[field.name] ?? field.defaultValue ?? ""}
                onChange={(e) => setValues({ ...values, [field.name]: e.target.value })}
              />
            )}
          </label>
        ))}
        <div className="mt-3 flex gap-2">
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
            className={`rounded px-4 py-2 text-white ${danger ? "bg-red-700" : "bg-gray-800"}`}
          >
            {confirmLabel ?? "Confirmar"}
          </button>
          <button
            type="button"
            onClick={() => {
              setValues({});
              onCancel();
            }}
            className="rounded bg-gray-200 px-4 py-2"
          >
            Voltar
          </button>
        </div>
      </div>
    </div>
  );
}
