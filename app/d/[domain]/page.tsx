import PublicSitePage from "@/app/s/[slug]/page";

type Props = {
  params: {
    domain: string;
  };
};

export default async function DomainPage(props: Props) {
  return PublicSitePage({
    params: {
      slug: props.params.domain,
    },
  });
}
