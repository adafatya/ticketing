import { auth, signOut } from "@/auth";
import Link from "next/link";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function WaitingActivationPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-6 rounded-xl bg-white p-8 text-center shadow-md">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-amber-100 text-amber-600">
          <svg
            className="h-8 w-8"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth="2"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
            />
          </svg>
        </div>

        <h2 className="text-2xl font-bold tracking-tight text-gray-900">
          Menunggu Aktivasi Role
        </h2>

        <div className="rounded-lg bg-gray-50 p-4 text-left text-sm text-gray-700">
          <p className="text-xs font-semibold uppercase text-gray-500">Akun Anda:</p>
          <p className="mt-1 font-medium text-gray-900">
            {session.user.name || "User Discord"}
          </p>
          <p className="text-xs text-gray-500">Discord ID: {session.user.discordId}</p>
          <div className="mt-2 inline-flex items-center rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-800">
            Status: Inactive
          </div>
        </div>

        <p className="text-sm text-gray-600">
          Akun Anda telah berhasil terhubung. Saat ini akun Anda berstatus{" "}
          <span className="font-semibold text-gray-800">Inactive</span> dan sedang menunggu Admin
          untuk menetapkan role (PM, QA, BE, FE, AI, DevOps, atau Admin) sebelum Anda dapat
          mengakses tiket.
        </p>

        <div className="space-y-3 pt-2">
          <Link
            href="/"
            className="inline-flex w-full justify-center rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2"
          >
            Cek Status Akses (Muat Ulang)
          </Link>

          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/login" });
            }}
          >
            <button
              type="submit"
              className="inline-flex w-full justify-center rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
            >
              Keluar (Logout)
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
