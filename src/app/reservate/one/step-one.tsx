"use client";
import Input from "@/components/input";
import { stepOneFormAction } from "./actions";
import SubmitButton from "@/components/submit-btn";
import { useActionState } from "react";

const initialState: { [key: string]: string | undefined } = {};

export default function StepOneForm() {
  const [state, formAction, pending] = useActionState(
    stepOneFormAction,
    initialState,
  );

  return (
    <form action={formAction} className="flex flex-1 flex-col items-center">
      <div className="flex w-full flex-col gap-8 lg:max-w-[700px]">
        <Input label="Name" id="name" type="text" required />
        <Input
          label="Link"
          id="link"
          required
          type="text"
          description='Must start with "http://" or "https://"'
          errorMsg={state?.link}
          pattern="[Hh][Tt][Tt][Pp][Ss]?:\/\/(?:(?:[a-zA-Z\u00a1-\uffff0-9]+-?)*[a-zA-Z\u00a1-\uffff0-9]+)(?:\.(?:[a-zA-Z\u00a1-\uffff0-9]+-?)*[a-zA-Z\u00a1-\uffff0-9]+)*(?:\.(?:[a-zA-Z\u00a1-\uffff]{2,}))(?::\d{2,5})?(?:\/[^\s]*)?"
        />
        <SubmitButton text="Continue" />
        {pending && <p>Loading...</p>}
      </div>
    </form>
  );
}
