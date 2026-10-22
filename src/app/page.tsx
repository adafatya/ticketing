import { auth } from "@/auth";
import { getFreshUserRole } from "@/lib/auth-helpers";
import { redirect } from "next/navigation";
import { Navbar } from "@/components/navbar";
import Link from "next/link";
import { db } from "@/db";
import { projects, tickets, users } from "@/db/schema";
import { sql } from "drizzle-orm";

export default async function HomePage() {
  const session = await auth();

  if (!session?.user?.discordId) {
    redirect("/login");
  }

  const role = await getFreshUserRole(session.user.discordId);
  if (!role || role === "inactive") {
    redirect("/waiting-activation");
  }

  // Fetch quick metrics
  const [[projectCount], [ticketCount], [userCount]] = await Promise.all([
    db.select({ count: sql<number>`count(*)::int` }).from(projects),
    db.select({ count: sql<number>`count(*)::int` }).from(tickets),
    db.select({ count: sql<number>`count(*)::int` }).from(users),
  ]);

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar
        user={{
          id: session.user.id || "",
          name: session.user.name,
          avatar: session.user.image,
          discordId: session.user.discordId,
          role,
        }}
      />

      <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="rounded-2xl bg-white p-8 shadow-sm border border-gray-200">
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">
            Selamat Datang di Ticketing App
          </h1>
          <p className="mt-2 text-gray-600">
            Sistem ticketing permintaan kerja terpadu untuk tim IT internal. Terhubung langsung
            dengan Discord untuk notifikasi dan update instan.
          </p>

          <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-3">
            <div className="rounded-xl border border-gray-100 bg-blue-50/50 p-6">
              <div className="text-xs font-semibold uppercase tracking-wider text-blue-600">
                Total Project
              </div>
              <div className="mt-2 text-3xl font-bold text-gray-900">
                {projectCount?.count ?? 0}
              </div>
              <p className="mt-1 text-xs text-gray-500">Project aktif & terdaftar</p>
            </div>

            <div className="rounded-xl border border-gray-100 bg-emerald-50/50 p-6">
              <div className="text-xs font-semibold uppercase tracking-wider text-emerald-600">
                Total Tiket
              </div>
              <div className="mt-2 text-3xl font-bold text-gray-900">
                {ticketCount?.count ?? 0}
              </div>
              <p className="mt-1 text-xs text-gray-500">Tiket dalam sistem</p>
            </div>

            <div className="rounded-xl border border-gray-100 bg-purple-50/50 p-6">
              <div className="text-xs font-semibold uppercase tracking-wider text-purple-600">
                Total Pengguna
              </div>
              <div className="mt-2 text-3xl font-bold text-gray-900">
                {userCount?.count ?? 0}
              </div>
              <p className="mt-1 text-xs text-gray-500">Anggota tim IT terhubung</p>
            </div>
          </div>

          <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <Link
              href="/projects"
              className="group block rounded-xl border border-gray-200 p-6 transition hover:border-blue-500 hover:shadow-md"
            >
              <div className="text-lg font-bold text-gray-900 group-hover:text-blue-600">
                Master Data Project →
              </div>
              <p className="mt-2 text-sm text-gray-500">
                Lihat daftar project, buat project baru, tentukan kode prefix tiket, dan atur
                channel notifikasi Discord.
              </p>
            </Link>

            <Link
              href="/tickets"
              className="group block rounded-xl border border-gray-200 p-6 transition hover:border-blue-500 hover:shadow-md"
            >
              <div className="text-lg font-bold text-gray-900 group-hover:text-blue-600">
                Daftar Tiket (Fase 2) →
              </div>
              <p className="mt-2 text-sm text-gray-500">
                Buat tiket baru, ambil tiket sesuai role, selesaikan tugas, dan validasi QA.
              </p>
            </Link>

            {role === "admin" && (
              <Link
                href="/admin/users"
                className="group block rounded-xl border border-gray-200 p-6 transition hover:border-blue-500 hover:shadow-md"
              >
                <div className="text-lg font-bold text-gray-900 group-hover:text-blue-600">
                  Manajemen Pengguna & Role →
                </div>
                <p className="mt-2 text-sm text-gray-500">
                  Atur role tim IT (Admin, PM, QA, BE, FE, AI, DevOps) dan lakukan pra-registrasi ID Discord.
                </p>
              </Link>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
