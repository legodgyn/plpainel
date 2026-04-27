import PublicSitePage from "@/app/s/[slug]/page";

export default async function PublicGeneratedSite({ slug }: { slug: string }) {
  return <PublicSitePage params={{ slug }} />;
}
