import { notFound } from "next/navigation";
import { emailLoginEnabled } from "@/lib/featureFlags";
import { ForgotPasswordForm } from "./ForgotPasswordForm";

export default function ForgotPasswordPage() {
  if (!emailLoginEnabled) notFound();
  return <ForgotPasswordForm />;
}
