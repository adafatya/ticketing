"use client";

import { useState } from "react";
import Image from "next/image";
import { type UserRole } from "@/lib/auth-helpers";

interface UserItem {
  id: string;
  discordId: string;
  username: string | null;
  avatar: string | null;
  email: string | null;
  role: UserRole;
  lastLoginAt: string | null;
  createdAt: string;
}

interface UserTableProps {
  initialUsers: UserItem[];
}

const ROLES: { value: UserRole; label: string }[] = [
  { value: "admin", label: "Admin" },
  { value: "pm", label: "PM" },
  { value: "qa", label: "QA" },
  { value: "be", label: "BE" },
  { value: "fe", label: "FE" },
  { value: "ai", label: "AI" },
  { value: "devops", label: "DevOps" },
  { value: "inactive", label: "Inactive (Menunggu Role)" },
];

export function UserTable({ initialUsers }: UserTableProps) {
  const [userList, setUserList] = useState<UserItem[]>(initialUsers);
  const [search, setSearch] = useState("");
  const [filterRole, setFilterRole] = useState<string>("all");
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Pre-register modal state
  const [showPreReg, setShowPreReg] = useState(false);
  const [preDiscordId, setPreDiscordId] = useState("");
  const [preRole, setPreRole] = useState<UserRole>("be");
  const [preUsername, setPreUsername] = useState("");
  const [isSubmittingPre, setIsSubmittingPre] = useState(false);

  // Filtered users
  const filteredUsers = userList.filter((u) => {
    const matchesSearch =
      !search ||
      (u.username && u.username.toLowerCase().includes(search.toLowerCase())) ||
      u.discordId.includes(search);
    const matchesRole = filterRole === "all" || u.role === filterRole;
    return matchesSearch && matchesRole;
  });

  const handleRoleChange = async (userId: string, newRole: UserRole) => {
    setErrorMsg(null);
    setSuccessMsg(null);
    setLoadingId(userId);

    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: newRole }),
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || "Gagal mengubah role");
      } else {
        setUserList((prev) =>
          prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u)),
        );
        setSuccessMsg("Role pengguna berhasil diperbarui.");
      }
    } catch {
      setErrorMsg("Terjadi kesalahan jaringan saat memperbarui role.");
    } finally {
      setLoadingId(null);
    }
  };

  const handlePreRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setIsSubmittingPre(true);

    try {
      const res = await fetch("/api/admin/users/preregister", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          discordId: preDiscordId,
          role: preRole,
          username: preUsername || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || "Gagal mendaftarkan user");
      } else {
        setUserList((prev) => [
          {
            id: data.user.id,
            discordId: data.user.discordId,
            username: data.user.username,
            avatar: null,
            email: null,
            role: data.user.role,
            lastLoginAt: null,
            createdAt: new Date().toISOString(),
          },
          ...prev,
        ]);
        setSuccessMsg(`User Discord ${preDiscordId} berhasil didaftarkan dengan role ${preRole.toUpperCase()}.`);
        setShowPreReg(false);
        setPreDiscordId("");
        setPreUsername("");
      }
    } catch {
      setErrorMsg("Terjadi kesalahan jaringan.");
    } finally {
      setIsSubmittingPre(false);
    }
  };

  const getRoleBadgeClass = (role: UserRole) => {
    switch (role) {
      case "admin":
        return "bg-purple-100 text-purple-800 border-purple-200";
      case "pm":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "qa":
        return "bg-green-100 text-green-800 border-green-200";
      case "be":
        return "bg-emerald-100 text-emerald-800 border-emerald-200";
      case "fe":
        return "bg-teal-100 text-teal-800 border-teal-200";
      case "ai":
        return "bg-indigo-100 text-indigo-800 border-indigo-200";
      case "devops":
        return "bg-orange-100 text-orange-800 border-orange-200";
      case "inactive":
      default:
        return "bg-gray-100 text-gray-700 border-gray-200";
    }
  };

  return (
    <div className="space-y-6">
      {/* Alert notifications */}
      {errorMsg && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <div className="flex items-center gap-2">
            <span className="font-semibold">Perhatian:</span> {errorMsg}
          </div>
        </div>
      )}

      {successMsg && (
        <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-700">
          {successMsg}
        </div>
      )}

      {/* Action and Filter Controls */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 flex-col gap-3 sm:flex-row">
          <input
            type="text"
            placeholder="Cari nama atau Discord ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 sm:max-w-xs"
          />

          <select
            value={filterRole}
            onChange={(e) => setFilterRole(e.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="all">Semua Role</option>
            {ROLES.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
        </div>

        <button
          onClick={() => setShowPreReg(true)}
          className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500"
        >
          + Pra-Registrasi Pengguna
        </button>
      </div>

      {/* Users Table */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-gray-200 text-left text-sm">
          <thead className="bg-gray-50 text-xs font-semibold uppercase text-gray-500">
            <tr>
              <th className="px-6 py-3">Pengguna</th>
              <th className="px-6 py-3">Discord ID</th>
              <th className="px-6 py-3">Role Saat Ini</th>
              <th className="px-6 py-3">Ubah Role</th>
              <th className="px-6 py-3">Login Terakhir</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {filteredUsers.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                  Tidak ada pengguna yang cocok dengan kriteria pencarian.
                </td>
              </tr>
            ) : (
              filteredUsers.map((u) => (
                <tr key={u.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      {u.avatar ? (
                        <Image
                          src={u.avatar}
                          alt=""
                          width={32}
                          height={32}
                          unoptimized
                          className="h-8 w-8 rounded-full border border-gray-200"
                        />
                      ) : (
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-200 text-xs font-bold text-gray-600">
                          {u.username ? u.username[0].toUpperCase() : "U"}
                        </div>
                      )}
                      <div>
                        <div className="font-medium text-gray-900">
                          {u.username || "Belum Login"}
                        </div>
                        {u.email && <div className="text-xs text-gray-500">{u.email}</div>}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 font-mono text-xs text-gray-600">{u.discordId}</td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium uppercase tracking-wide ${getRoleBadgeClass(
                        u.role,
                      )}`}
                    >
                      {u.role}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <select
                      value={u.role}
                      disabled={loadingId === u.id}
                      onChange={(e) => handleRoleChange(u.id, e.target.value as UserRole)}
                      className="rounded-lg border border-gray-300 px-2.5 py-1 text-xs shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
                    >
                      {ROLES.map((r) => (
                        <option key={r.value} value={r.value}>
                          {r.label}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-6 py-4 text-xs text-gray-500">
                    {u.lastLoginAt
                      ? new Date(u.lastLoginAt).toLocaleString("id-ID")
                      : "Belum pernah"}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pre-register Modal */}
      {showPreReg && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-bold text-gray-900">Pra-Registrasi Pengguna</h3>
            <p className="mt-1 text-xs text-gray-600">
              Daftarkan Discord ID dan tetapkan role lebih dulu agar pengguna langsung aktif saat
              pertama kali login ke sistem.
            </p>

            <form onSubmit={handlePreRegister} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700">
                  Discord User ID <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: 123456789012345678"
                  value={preDiscordId}
                  onChange={(e) => setPreDiscordId(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700">
                  Nama Tampilan (Opsional)
                </label>
                <input
                  type="text"
                  placeholder="Contoh: Budi (Backend)"
                  value={preUsername}
                  onChange={(e) => setPreUsername(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700">
                  Role yang Diberikan <span className="text-red-500">*</span>
                </label>
                <select
                  value={preRole}
                  onChange={(e) => setPreRole(e.target.value as UserRole)}
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  {ROLES.filter((r) => r.value !== "inactive").map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowPreReg(false)}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingPre}
                  className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-50"
                >
                  {isSubmittingPre ? "Menyimpan..." : "Daftarkan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
