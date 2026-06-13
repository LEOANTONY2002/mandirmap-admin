import { ChangeEventHandler, FocusEventHandler } from 'react';

type FormFieldProps = {
  label: string;
  value: string | number;
  onChange: ChangeEventHandler<
    HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
  >;
  onBlur?: FocusEventHandler<
    HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
  >;
  textarea?: boolean;
  type?: string;
  options?: string[];
  placeholder?: string;
  datalist?: boolean;
  error?: string | null;
};

export function FormField({
  label,
  value,
  onChange,
  onBlur,
  textarea,
  type = 'text',
  options,
  placeholder,
  datalist,
  error,
}: FormFieldProps) {
  const datalistId = `${label.toLowerCase().replace(/[^a-z0-9]/g, '-')}-list`;
  const errorInputStyle = error ? { borderColor: '#ef4444', outlineColor: '#ef4444', boxShadow: '0 0 0 1px #ef4444' } : undefined;

  return (
    <label className="field">
      <span>{label}</span>
      {options && !datalist ? (
        <select value={value} onChange={onChange} onBlur={onBlur} style={errorInputStyle}>
          {options.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      ) : options && datalist ? (
        <>
          <input
            type="text"
            list={datalistId}
            value={value}
            onChange={onChange}
            onBlur={onBlur}
            placeholder={placeholder}
            style={errorInputStyle}
          />
          <datalist id={datalistId}>
            {options.map((option) => (
              <option key={option} value={option} />
            ))}
          </datalist>
        </>
      ) : textarea ? (
        <textarea value={value} onChange={onChange} onBlur={onBlur} placeholder={placeholder} style={errorInputStyle} />
      ) : (
        <input
          type={type}
          value={value}
          onChange={onChange}
          onBlur={onBlur}
          placeholder={placeholder}
          style={errorInputStyle}
        />
      )}
      {error && (
        <span className="field-error-message" style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: '0.25rem', display: 'block' }}>
          {error}
        </span>
      )}
    </label>
  );
}
