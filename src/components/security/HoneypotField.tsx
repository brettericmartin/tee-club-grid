/**
 * Honeypot Field Component
 * Hidden field to catch bots - if filled, submission is flagged as spam
 */

import React from 'react';

interface HoneypotFieldProps {
  name?: string;
  value: string;
  onChange: (value: string) => void;
}

export const HoneypotField: React.FC<HoneypotFieldProps> = ({ 
  name = 'contact_phone',
  value,
  onChange 
}) => {
  return (
    <div 
      style={{
        position: 'absolute',
        left: '-9999px',
        width: '1px',
        height: '1px',
        overflow: 'hidden'
      }}
      aria-hidden="true"
    >
      <label htmlFor={name}>
        Phone (Leave this field empty)
      </label>
      <input
        type="text"
        id={name}
        name={name}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        tabIndex={-1}
        autoComplete="off"
        // Additional attributes to prevent autofill
        data-form-type="other"
        data-lpignore="true"
        data-1p-ignore="true"
      />
    </div>
  );
};

/**
 * React Hook Form compatible version
 */
export const HoneypotFieldRHF: React.FC<{
  register: any;
  name?: string;
}> = ({ register, name = 'contact_phone' }) => {
  return (
    <div 
      style={{
        position: 'absolute',
        left: '-9999px',
        width: '1px',
        height: '1px',
        overflow: 'hidden'
      }}
      aria-hidden="true"
    >
      <label htmlFor={name}>
        Phone (Leave this field empty)
      </label>
      <input
        {...register(name)}
        type="text"
        id={name}
        tabIndex={-1}
        autoComplete="off"
        // Additional attributes to prevent autofill
        data-form-type="other"
        data-lpignore="true"
        data-1p-ignore="true"
      />
    </div>
  );
};