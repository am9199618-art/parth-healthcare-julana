import { useEffect, useRef, useState } from "react";
import { Button, Modal } from "./ui.jsx";

/**
 * Reusable create/edit modal form.
 *
 * `fields` describes the inputs:
 *   { name, label, type, required, options, placeholder, span, hint, rows, ...attrs }
 *
 * `initial` seeds the values. `onSubmit` receives the values object and may
 * throw an ApiError whose `fields` map is rendered inline per input.
 */
export default function FormModal({
  open,
  onClose,
  onSubmit,
  onValuesChange,
  title,
  subtitle,
  fields,
  initial = {},
  submitLabel = "Save",
  size = "lg",
  children,
}) {
  const [values, setValues] = useState(initial);
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState("");

  // Keep a ref to the newest initial so opening always seeds fresh values,
  // without re-seeding on every render. Parents often pass a freshly built
  // object literal, so depending on `initial` directly would wipe user input
  // on every unrelated state change.
  const initialRef = useRef(initial);
  initialRef.current = initial;
  const wasOpen = useRef(false);

  useEffect(() => {
    if (open && !wasOpen.current) {
      setValues(initialRef.current);
      setErrors({});
      setFormError("");
    }
    wasOpen.current = open;
  }, [open]);

  const setValue = (name, value) => {
    const nextValues = { ...values, [name]: value };
    setValues(nextValues);
    // Let a parent react to field changes for interactive children such as
    // slot pickers or dependent dropdowns.
    onValuesChange?.(nextValues);
    setErrors((current) => {
      if (!current[name]) return current;
      const next = { ...current };
      delete next[name];
      return next;
    });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setBusy(true);
    setFormError("");
    try {
      await onSubmit(values);
      onClose();
    } catch (err) {
      if (err?.fields) setErrors(err.fields);
      setFormError(err?.message || "Could not save the record.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      subtitle={subtitle}
      size={size}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button type="submit" form="record-form" disabled={busy}>
            {busy ? "Saving..." : submitLabel}
          </Button>
        </>
      }
    >
      <form id="record-form" onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {fields.map((field) => {
          if (field.type === "section") {
            return (
              <h4
                key={field.name}
                className={`text-xs font-semibold tracking-wide text-slate-500 uppercase ${
                  field.span === "full" ? "sm:col-span-2" : ""
                }`}
              >
                {field.label}
              </h4>
            );
          }

          const value = values[field.name] ?? "";
          const invalid = Boolean(errors[field.name]);
          const span =
            field.span === "full" || field.type === "textarea" ? "sm:col-span-2" : "";

          return (
            <label key={field.name} className={`block ${span}`}>
              <span className="mb-1.5 flex items-center gap-1 text-sm font-medium text-slate-700">
                {field.label}
                {field.required ? <span className="text-rose-500">*</span> : null}
              </span>

              {field.type === "select" ? (
                <select
                  name={field.name}
                  value={value}
                  required={field.required}
                  disabled={field.disabled || busy}
                  onChange={(e) => setValue(field.name, e.target.value)}
                  className={`w-full rounded-lg border bg-white px-3 py-2 text-sm text-slate-800 shadow-sm transition focus:ring-2 focus:ring-brand-500/20 focus:outline-none ${
                    invalid ? "border-rose-400" : "border-slate-300 focus:border-brand-500"
                  } ${field.disabled ? "bg-slate-50 text-slate-500" : ""}`}
                >
                  <option value="">{field.placeholder || "Select..."}</option>
                  {(field.options || []).map((opt) => {
                    const val = typeof opt === "string" ? opt : opt.value;
                    const label = typeof opt === "string" ? opt : opt.label;
                    return (
                      <option key={val} value={val}>
                        {label}
                      </option>
                    );
                  })}
                </select>
              ) : field.type === "textarea" ? (
                <textarea
                  name={field.name}
                  rows={field.rows || 3}
                  placeholder={field.placeholder}
                  value={value}
                  required={field.required}
                  disabled={busy}
                  onChange={(e) => setValue(field.name, e.target.value)}
                  className={`w-full rounded-lg border bg-white px-3 py-2 text-sm text-slate-800 shadow-sm transition focus:ring-2 focus:ring-brand-500/20 focus:outline-none ${
                    invalid ? "border-rose-400" : "border-slate-300 focus:border-brand-500"
                  }`}
                />
              ) : (
                <input
                  type={field.type || "text"}
                  name={field.name}
                  placeholder={field.placeholder}
                  value={value}
                  required={field.required}
                  min={field.min}
                  max={field.max}
                  step={field.step}
                  disabled={field.disabled || busy}
                  onChange={(e) => setValue(field.name, e.target.value)}
                  className={`w-full rounded-lg border bg-white px-3 py-2 text-sm text-slate-800 shadow-sm transition focus:ring-2 focus:ring-brand-500/20 focus:outline-none ${
                    invalid ? "border-rose-400" : "border-slate-300 focus:border-brand-500"
                  } ${field.disabled ? "bg-slate-50 text-slate-500" : ""}`}
                />
              )}

              {invalid ? (
                <span className="mt-1 block text-xs font-medium text-rose-600">
                  {errors[field.name]}
                </span>
              ) : field.hint ? (
                <span className="mt-1 block text-xs text-slate-500">{field.hint}</span>
              ) : null}
            </label>
          );
        })}

        {children}

        {formError ? (
          <div className="sm:col-span-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
            {formError}
          </div>
        ) : null}
      </form>
    </Modal>
  );
}
