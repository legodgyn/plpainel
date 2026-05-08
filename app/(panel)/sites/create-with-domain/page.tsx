import { redirect } from "next/navigation";

export default function CreateWithDomainRedirectPage() {
  redirect("/sites/custom-domain");
}
