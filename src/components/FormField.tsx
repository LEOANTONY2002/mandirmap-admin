import { ChangeEventHandler } from 'react';

type FormFieldProps = {
  label: string;
  value: string | number;
  onChange: ChangeEventHandler<
    HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
  >;
  textarea?: boolean;
  type?: string;
  options?: string[];
  placeholder?: string;
};

export function FormField({
  label,
  value,
  onChange,
  textarea,
  type = 'text',
  options,
  placeholder,
}: FormFieldProps) {
  return (
    <label className="field">
      <span>{label}</span>
      {options ? (
        <select value={value} onChange={onChange}>
          {options.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      ) : textarea ? (
        <textarea value={value} onChange={onChange} placeholder={placeholder} />
      ) : (
        <input
          type={type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
        />
      )}
    </label>
  );
}
