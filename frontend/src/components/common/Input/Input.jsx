import React from 'react';
import './Input.css';

const Input = ({
  label,
  type = 'text', // 'text', 'password', 'email', 'textarea', 'select', 'number'
  name,
  value,
  onChange,
  placeholder,
  error,
  options = [], // Used when type is 'select': [{ value, label }]
  required = false,
  disabled = false,
  rows = 4, // Used when type is 'textarea'
  className = '',
  ...props
}) => {
  const isTextarea = type === 'textarea';
  const isSelect = type === 'select';

  return (
    <div className={`input-group ${error ? 'input-has-error' : ''} ${className}`}>
      {label && (
        <label className="input-label" htmlFor={name}>
          {label} {required && <span className="input-required-star">*</span>}
        </label>
      )}

      {isTextarea ? (
        <textarea
          id={name}
          name={name}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          required={required}
          disabled={disabled}
          rows={rows}
          className="input-field input-textarea"
          {...props}
        />
      ) : isSelect ? (
        <select
          id={name}
          name={name}
          value={value}
          onChange={onChange}
          required={required}
          disabled={disabled}
          className="input-field input-select"
          {...props}
        >
          {placeholder && <option value="" disabled>{placeholder}</option>}
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      ) : (
        <input
          type={type}
          id={name}
          name={name}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          required={required}
          disabled={disabled}
          className="input-field"
          {...props}
        />
      )}

      {error && <span className="input-error-msg">{error}</span>}
    </div>
  );
};

export default Input;
