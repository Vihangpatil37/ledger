"use client";

import { useEffect, useState, type ChangeEvent } from "react";
import { formatIndianPhone } from "@/lib/phone";

export { formatIndianPhone };

export function PhoneInput({
  id = "phone",
  name = "phone",
  defaultValue = "",
  placeholder = "+91 98765 43210",
  className = "",
  disabled = false,
}: {
  id?: string;
  name?: string;
  defaultValue?: string;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}) {
  const [value, setValue] = useState(() => formatIndianPhone(defaultValue));

  useEffect(() => {
    setValue(formatIndianPhone(defaultValue));
  }, [defaultValue]);

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const formatted = formatIndianPhone(e.target.value);
    setValue(formatted);
  };

  return (
    <input
      id={id}
      name={name}
      type="tel"
      autoComplete="tel"
      inputMode="tel"
      maxLength={15}
      value={value}
      onChange={handleChange}
      placeholder={placeholder}
      disabled={disabled}
      className={className}
    />
  );
}
