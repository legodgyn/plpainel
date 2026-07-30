import { redirect } from "next/navigation";

export default function DomainEmailsDisabledPage() {
  redirect("/dashboard");
}
