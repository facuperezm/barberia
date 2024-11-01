"use client";
import Input from "@/components/input";
import SubmitButton from "@/components/submit-btn";
import { stepTwoFormAction } from "./actions";
import { useActionState } from "react";
import { type FormErrors } from "@/context/types";

const initialState: FormErrors = {};

export default function StepTwoForm() {
  const [state, formAction, pending] = useActionState(
    stepTwoFormAction,
    initialState,
  );
  return (
    <form action={formAction} className="flex flex-1 flex-col items-center">
      <div className="flex w-full flex-col gap-8 lg:max-w-[700px]">
        <Input
          label="Coupon Code"
          id="coupon"
          required
          type="text"
          description="Must be at least 5 characters long"
          minLength={5}
          errorMsg={state?.coupon}
        />
        <Input
          label="Discount (%)"
          id="discount"
          min={1}
          max={100}
          required
          description="Must be between 1 and 100"
          type="number"
          errorMsg={state?.discount}
        />
        {pending && <p>Loading...</p>}
        <SubmitButton text="Continue" />
      </div>
    </form>
  );
}
