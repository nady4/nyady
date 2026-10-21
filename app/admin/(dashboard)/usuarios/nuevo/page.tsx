import UserFormAdmin from "@/components/admin/users/UserFormAdmin";

export const metadata = {
  title: "Nuevo usuario",
};

export default async function NewUserPage() {
  return (
    <main className="admin-page admin-page-wide">
      <h1 className="admin-title">Nuevo usuario</h1>
      <UserFormAdmin />
    </main>
  );
}
