import { Suspense } from "react";
import Link from "next/link";

async function UnauthorizedContent({
  searchParams,
}: {
  searchParams: Promise<{ reason?: string }>;
}) {
  const params = await searchParams;
  const isNotInGuild = params?.reason === "not_in_guild";

  return (
    <div className="w-full max-w-md space-y-6 rounded-xl bg-white p-8 text-center shadow-md">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-100 text-red-600">
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
            d="M12 9v3.75m0-10.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.75c0 5.592 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.57-.598-3.75h-.152c-3.196 0-6.1-1.249-8.25-3.286Zm0 13.036h.008v.008H12v-.008Z"
          />
        </svg>
      </div>

      <h2 className="text-2xl font-bold tracking-tight text-gray-900">Akses Ditolak</h2>

      <p className="text-sm text-gray-600">
        {isNotInGuild
          ? "Akun Discord Anda bukan anggota dari server Discord tim IT internal yang dikonfigurasi. Akses ke aplikasi ini dibatasi hanya untuk anggota internal."
          : "Terjadi kesalahan saat memproses otentikasi akun Discord Anda. Silakan coba lagi atau hubungi administrator sistem."}
      </p>

      <div className="pt-4">
        <Link
          href="/login"
          className="inline-flex w-full justify-center rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-2"
        >
          Kembali ke Halaman Login
        </Link>
      </div>
    </div>
  );
}

export default function UnauthorizedPage(props: {
  searchParams: Promise<{ reason?: string }>;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12 sm:px-6 lg:px-8">
      <Suspense
        fallback={
          <div className="w-full max-w-md rounded-xl bg-white p-8 text-center shadow-md">
            Memuat...
          </div>
        }
      >
        <UnauthorizedContent searchParams={props.searchParams} />
      </Suspense>
    </div>
  );
}
