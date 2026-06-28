import React from 'react';

export const FormField = ({
  label,
  name,
  type = 'text',
  value,
  onChange,
  error,
  placeholder = '',
  required = false,
  className = '',
  ...props
}) => (
  <div className={className}>
    {label && (
      <label htmlFor={name} className="block text-sm font-medium text-gray-700 mb-1">
        {label}
        {required && <span className="text-red-500">*</span>}
      </label>
    )}
    <input
      type={type}
      name={name}
      id={name}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      className={`block w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500 sm:text-sm ${
        error ? 'border-red-300 text-red-900 placeholder-red-300' : ''
      }`}
      {...props}
    />
    {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
  </div>
);

export const FormSelect = ({
  label,
  name,
  value,
  onChange,
  options = [],
  error,
  required = false,
  className = '',
  ...props
}) => (
  <div className={className}>
    {label && (
      <label htmlFor={name} className="block text-sm font-medium text-gray-700 mb-1">
        {label}
        {required && <span className="text-red-500">*</span>}
      </label>
    )}
    <select
      name={name}
      id={name}
      value={value}
      onChange={onChange}
      className={`block w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500 sm:text-sm ${
        error ? 'border-red-300' : ''
      }`}
      {...props}
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
    {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
  </div>
);

export const FormTextarea = ({
  label,
  name,
  value,
  onChange,
  error,
  placeholder = '',
  required = false,
  rows = 3,
  className = '',
  ...props
}) => (
  <div className={className}>
    {label && (
      <label htmlFor={name} className="block text-sm font-medium text-gray-700 mb-1">
        {label}
        {required && <span className="text-red-500">*</span>}
      </label>
    )}
    <textarea
      name={name}
      id={name}
      rows={rows}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      className={`block w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500 sm:text-sm ${
        error ? 'border-red-300' : ''
      }`}
      {...props}
    />
    {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
  </div>
);
