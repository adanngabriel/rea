"use client";

import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { createContext, startTransition, useActionState, useContext, useEffect, useId, useRef, useTransition } from "react";
import type { ActionResult } from "@/actions/_lib";
import { afterSave } from "./after-save";
import { toast } from "./toast";

type ServerAction = (form: FormData) => Promise<ActionResult>;

const ErrorsContext = createContext<Record<string, string>>({});
const PendingContext = createContext(false);

/**
 * Formulário ligado a uma Server Action: mostra carregamento, mensagens de
 * sucesso/erro e destaca os campos inválidos.
 */
export function ActionForm({
  action,
  children,
  className = "space-y-5",
  success = "Salvo com sucesso.",
  resetOnSuccess = false,
  onSuccess,
}: {
  action: ServerAction;
  children: React.ReactNode;
  className?: string;
  success?: string;
  resetOnSuccess?: boolean;
  onSuccess?: () => void;
}) {
  const router = useRouter();
  const ref = useRef<HTMLFormElement>(null);
  const [state, formAction, pending] = useActionState<ActionResult | null, FormData>(async (_prev, form) => action(form), null);
  useEffect(() => {
    if (!state) return;
    if (state.ok) {
      toast("success", state.message ?? success);
      if (resetOnSuccess) ref.current?.reset();
      onSuccess?.();
      afterSave(router, state.redirectTo);
    } else {
      toast("error", state.error);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);
  return (
    <ErrorsContext.Provider value={state && !state.ok ? (state.fieldErrors ?? {}) : {}}>
      <PendingContext.Provider value={pending}>
        {/* onSubmit em vez de action={...}: o React limparia os campos após
            cada envio, apagando o que foi digitado quando há erro. */}
        <form
          ref={ref}
          className={className}
          noValidate
          aria-busy={pending}
          onSubmit={(e) => {
            e.preventDefault();
            if (pending) return;
            const data = new FormData(e.currentTarget);
            startTransition(() => formAction(data));
          }}
        >
          {state && !state.ok ? (
            <p role="alert" className="rounded-xl border border-danger/40 bg-danger/10 px-4 py-3 text-sm text-danger">
              {state.error}
            </p>
          ) : null}
          {children}
        </form>
      </PendingContext.Provider>
    </ErrorsContext.Provider>
  );
}

export function SubmitButton({ children = "Salvar", className = "btn-primary" }: { children?: React.ReactNode; className?: string }) {
  const pending = useContext(PendingContext);
  return (
    <button type="submit" className={className} disabled={pending}>
      {pending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
      {children}
    </button>
  );
}

function useFieldError(name: string) {
  return useContext(ErrorsContext)[name];
}

export function Field({
  label,
  name,
  hint,
  children,
}: {
  label: string;
  name: string;
  hint?: string;
  children: (props: { id: string; "aria-invalid"?: boolean; "aria-describedby"?: string }) => React.ReactNode;
}) {
  const id = useId();
  const error = useFieldError(name);
  const describedBy = [hint ? `${id}-hint` : null, error ? `${id}-err` : null].filter(Boolean).join(" ") || undefined;
  return (
    <div>
      <label htmlFor={id} className="field-label">
        {label}
      </label>
      {children({ id, "aria-invalid": error ? true : undefined, "aria-describedby": describedBy })}
      {hint ? (
        <p id={`${id}-hint`} className="field-hint">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={`${id}-err`} className="mt-1 text-xs font-medium text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}

type InputProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, "name" | "id"> & { label: string; name: string; hint?: string };

export function TextField({ label, name, hint, className = "", ...rest }: InputProps) {
  return (
    <Field label={label} name={name} hint={hint}>
      {(a) => <input name={name} className={`input ${className}`} {...a} {...rest} />}
    </Field>
  );
}

export function TextArea({
  label,
  name,
  hint,
  rows = 4,
  ...rest
}: Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, "name" | "id"> & { label: string; name: string; hint?: string }) {
  return (
    <Field label={label} name={name} hint={hint}>
      {(a) => <textarea name={name} rows={rows} className="input" {...a} {...rest} />}
    </Field>
  );
}

export function SelectField({
  label,
  name,
  hint,
  options,
  placeholder,
  ...rest
}: Omit<React.SelectHTMLAttributes<HTMLSelectElement>, "name" | "id"> & {
  label: string;
  name: string;
  hint?: string;
  placeholder?: string;
  options: { value: string; label: string }[];
}) {
  return (
    <Field label={label} name={name} hint={hint}>
      {(a) => (
        <select name={name} className="input" {...a} {...rest}>
          {placeholder !== undefined ? <option value="">{placeholder}</option> : null}
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      )}
    </Field>
  );
}

export function CheckboxField({ label, name, hint, defaultChecked }: { label: string; name: string; hint?: string; defaultChecked?: boolean }) {
  const id = useId();
  return (
    <div className="flex items-start gap-3">
      <input id={id} type="checkbox" name={name} defaultChecked={defaultChecked} className="mt-1 size-5 shrink-0 accent-[var(--color-accent)]" />
      <label htmlFor={id} className="text-sm">
        <span className="font-medium">{label}</span>
        {hint ? <span className="block text-xs text-muted">{hint}</span> : null}
      </label>
    </div>
  );
}

export function ColorField({ label, name, defaultValue }: { label: string; name: string; defaultValue: string }) {
  return (
    <Field label={label} name={name}>
      {(a) => (
        <div className="flex items-center gap-2">
          <input type="color" name={name} defaultValue={defaultValue} className="h-11 w-16 cursor-pointer rounded-xl border border-line-strong bg-bg p-1" {...a} />
        </div>
      )}
    </Field>
  );
}

/** Botão que executa uma ação após confirmação (ex.: excluir). */
export function ConfirmAction({
  action,
  confirm,
  children,
  className = "btn-danger btn-sm",
  success = "Feito.",
}: {
  action: () => Promise<ActionResult>;
  confirm?: string;
  children: React.ReactNode;
  className?: string;
  success?: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      className={className}
      disabled={pending}
      onClick={() => {
        if (confirm && !window.confirm(confirm)) return;
        start(async () => {
          const result = await action();
          if (result.ok) {
            toast("success", result.message ?? success);
            afterSave(router, result.redirectTo);
          } else toast("error", result.error);
        });
      }}
    >
      {pending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
      {children}
    </button>
  );
}

export function FormSection({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <fieldset className="card space-y-5 p-5 sm:p-6">
      <legend className="sr-only">{title}</legend>
      <div>
        <h2 className="font-display text-xl font-extrabold uppercase">{title}</h2>
        {description ? <p className="mt-1 text-sm text-muted">{description}</p> : null}
      </div>
      {children}
    </fieldset>
  );
}
