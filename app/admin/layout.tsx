import "@/styles/Admin.scss";

export const dynamic = "force-dynamic";

export const metadata = {
  title: {
    default: "Administración - NYADY",
    template: "%s - NYADY",
  },
  robots: { index: false, follow: false },
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
