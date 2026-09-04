export const metadata = {
  title: "Community — Cyber Club Portal",
};

export default function CommunityLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="flex-1 flex flex-col">{children}</div>;
}
