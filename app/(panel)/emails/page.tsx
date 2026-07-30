import { redirect } from "next/navigation";

export default function EmailsDisabledPage() {
  redirect("/dashboard");
}
