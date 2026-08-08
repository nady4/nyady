import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/admin";
import AdminLoginForm from "@/components/admin/AdminLoginForm";

export const metadata = {
  title: "Acceso administrador - NYADY",
};

export default async function AdminLoginPage() {
  if (await isAdmin()) redirect("/admin");

  return <AdminLoginForm />;
}
