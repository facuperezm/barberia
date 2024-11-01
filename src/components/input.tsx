"use client";

import { useAddReservationContext } from "@/context/add-reservation";

interface InputProps {
  label: string;
  id: string;
  description?: string;
  required?: boolean;
  pattern?: string;
  type: string;
  minLength?: number;
  min?: number;
  max?: number;
  errorMsg?: string;
}
export default function Input({
  label,
  id,
  required,
  pattern,
  type,
  minLength,
  min,
  max,
  description,
  errorMsg,
}: InputProps) {
  const { updateNewReservationDetails, newReservationData } =
    useAddReservationContext();
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    updateNewReservationDetails({ [e.target.name]: e.target.value });
  };

  return (
    <div>
      <label className="block text-lg" htmlFor={id}>
        {label}
        {description && (
          <span className="mb-1 block text-sm text-slate-200">
            {description}
          </span>
        )}
      </label>
      <input
        className={`w-full rounded-md px-2 py-4 text-slate-900 ${
          errorMsg ? "border-red-500" : "border-slate-300"
        } border-2`}
        type={type}
        name={id}
        id={id}
        required={required}
        pattern={pattern}
        minLength={minLength}
        min={min}
        max={max}
        onChange={handleInputChange}
        defaultValue={newReservationData[id as keyof typeof newReservationData]}
      />
      <div className="mt-1 min-h-8">
        {errorMsg && (
          <span className="block text-sm text-red-500">{errorMsg}</span>
        )}
      </div>
    </div>
  );
}
