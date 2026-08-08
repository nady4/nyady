import prisma from "@/lib/prisma";
import { fraunces } from "@/app/fonts";

export const metadata = {
  title: "Usuarios",
};

export default async function AdminUsersPage() {
  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      address: true,
      _count: { select: { orders: true } },
    },
  });

  return (
    <main className="admin-page admin-page-wide">
      <h1 className="admin-title">Usuarios</h1>

      {users.length === 0 ? (
        <p className="admin-empty">No hay usuarios registrados</p>
      ) : (
        <div className="admin-users-grid">
          {users.map((user) => (
            <div key={user.id} className="admin-user-card">
              <div className="admin-user-header">
                <div className="admin-user-avatar">
                  {user.username.slice(0, 1).toUpperCase()}
                </div>
                <div>
                  <h3 className={`admin-user-name ${fraunces.className}`}>
                    {user.username}
                  </h3>
                  <span className="admin-user-email">{user.email}</span>
                </div>
              </div>

              <div className="admin-user-meta">
                <span>
                  Miembro desde:{" "}
                  {user.createdAt.toLocaleDateString("es-AR", {
                    day: "2-digit",
                    month: "2-digit",
                    year: "numeric",
                  })}
                </span>
                <span>Pedidos: {user._count.orders}</span>
                <span>
                  Dirección:{" "}
                  {user.address
                    ? `${user.address.street}, ${user.address.city}, ${user.address.state}`
                    : "Sin dirección"}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
