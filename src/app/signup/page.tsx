import { notFound } from "next/navigation";
import { emailLoginEnabled } from "@/lib/featureFlags";
import { SignupForm } from "./SignupForm";

export default function SignupPage() {
  if (!emailLoginEnabled) notFound();
  return <SignupForm />;
}
