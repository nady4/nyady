// The full site footer (link columns with the botón de arrepentimiento,
// socials, "Hecho con ❤" bar) renders from the root layout via SiteFooter,
// so per-route-group layouts don't need to add it separately anymore.
export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
