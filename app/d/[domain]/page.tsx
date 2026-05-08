import PublicSitePage from "@/app/s/[slug]/page";

type Props = {
  params: { domain: string } | Promise<{ domain: string }>;
};

export const dynamic = "force-dynamic";

export default async function DomainPage(props: Props) {
  const { domain } = await Promise.resolve(props.params);
  return <PublicSitePage params={{ slug: domain }} />;
}
