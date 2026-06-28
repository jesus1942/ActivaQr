// v1.1.0
// Input y Select del Design System. Label opcional, icono opcional,
// estado de error, foco con anillo de marca.
import React from 'react';

interface FieldShellProps {
  label?: string;
  error?: string;
  hint?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}

const FieldShell: React.FC<FieldShellProps> = ({ label, error, hint, children }) => (
  <div className="space-y-1.5">
    {label && (
      <label className="block text-xs font-semibold text-muted tracking-wide">
        {label}
      </label>
    )}
    {children}
    {error ? (
      <p className="text-xs font-medium text-danger">{error}</p>
    ) : hint ? (
      <p className="text-xs text-faint">{hint}</p>
    ) : null}
  </div>
);

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  icon?: React.ReactNode;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  hint,
  icon,
  className = '',
  ...rest
}) => (
  <FieldShell label={label} error={error} hint={hint} icon={icon}>
    <div
      className={[
        'flex items-center gap-2.5 h-11 px-3.5 rounded-md bg-surface',
        'border transition-all duration-200',
        error ? 'border-danger' : 'border-line focus-within:border-brand-600 focus-within:shadow-ring',
      ].join(' ')}
    >
      {icon && <span className="text-faint shrink-0">{icon}</span>}
      <input
        className={`flex-1 bg-transparent outline-none text-content placeholder:text-faint text-sm ${className}`}
        {...rest}
      />
    </div>
  </FieldShell>
);

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const Select: React.FC<SelectProps> = ({
  label,
  error,
  hint,
  className = '',
  children,
  ...rest
}) => (
  <FieldShell label={label} error={error} hint={hint}>
    <div
      className={[
        'flex items-center h-11 px-3 rounded-md bg-surface border transition-all duration-200',
        error ? 'border-danger' : 'border-line focus-within:border-brand-600 focus-within:shadow-ring',
      ].join(' ')}
    >
      <select
        className={`flex-1 bg-transparent outline-none text-content text-sm cursor-pointer ${className}`}
        {...rest}
      >
        {children}
      </select>
    </div>
  </FieldShell>
);

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const Textarea: React.FC<TextareaProps> = ({
  label,
  error,
  hint,
  className = '',
  ...rest
}) => (
  <FieldShell label={label} error={error} hint={hint}>
    <textarea
      className={[
        'w-full px-3.5 py-2.5 rounded-md bg-surface border text-content placeholder:text-faint text-sm outline-none transition-all duration-200 resize-y min-h-[88px]',
        error ? 'border-danger' : 'border-line focus:border-brand-600 focus:shadow-ring',
        className,
      ].join(' ')}
      {...rest}
    />
  </FieldShell>
);
