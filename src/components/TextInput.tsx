import React, { InputHTMLAttributes } from "react";

interface Props {
  className: string;
  type: string;
  placeholder: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
}

const TextInput = React.forwardRef<HTMLInputElement, Props>(
  ({ className, placeholder, value, onChange, type, onKeyDown }, ref) => {
    return (
      <div className="flex items-center justify-center">
        <input
          className={`text-input${className ? ` ${className}` : ""}`}
          type={type}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          onKeyDown={onKeyDown}
          ref={ref}
        />
      </div>
    );
  }
);

export default TextInput;
