"use client";

import { useState } from "react";
import { type UserRole } from "@/lib/auth-helpers";

interface ProjectItem {
  id: string;
  code: string;
  name: string;
  description: string | null;
  ownerId: string | null;
  ownerName: string | null;
  discordChannelId: string | null;
  isActive: boolean;
  createdAt: string;
  ticketCount?: number;
}

interface OwnerOption {
  id: string;
  username: string | null;
}

interface ProjectListProps {
  initialProjects: ProjectItem[];
  currentRole: UserRole;
  usersList: OwnerOption[];
}

export function ProjectList({
  initialProjects,
  currentRole,
  usersList,
}: ProjectListProps) {
  const [projects, setProjects] = useState<ProjectItem[]>(initialProjects);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("active");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const canManage = currentRole === "admin" || currentRole === "pm";

  // Create Project Modal State
  const [showCreate, setShowCreate] = useState(false);
  const [newCode, setNewCode] = useState("");
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newOwnerId, setNewOwnerId] = useState("");
  const [newDiscordChannelId, setNewDiscordChannelId] = useState("");
  const [isSubmittingCreate, setIsSubmittingCreate] = useState(false);

  // Edit Project Modal State
  const [editingProject, setEditingProject] = useState<ProjectItem | null>(null);
  const [editCode, setEditCode] = useState("");
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editOwnerId, setEditOwnerId] = useState("");
  const [editDiscordChannelId, setEditDiscordChannelId] = useState("");
  const [editIsActive, setEditIsActive] = useState(true);
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);

  // Filtered projects
  const filtered = projects.filter((p) => {
    const matchesSearch =
      !search ||
      p.code.toLowerCase().includes(search.toLowerCase()) ||
      p.name.toLowerCase().includes(search.toLowerCase());

    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "active" && p.isActive) ||
      (statusFilter === "inactive" && !p.isActive);

    return matchesSearch && matchesStatus;
  });

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setIsSubmittingCreate(true);

    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: newCode,
          name: newName,
          description: newDesc || undefined,
          ownerId: newOwnerId || undefined,
          discordChannelId: newDiscordChannelId || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || "Gagal membuat project");
      } else {
        const created: ProjectItem = {
          ...data.project,
          ownerName: usersList.find((u) => u.id === newOwnerId)?.username || null,
          createdAt: data.project.createdAt,
          ticketCount: 0,
        };
        setProjects((prev) => [created, ...prev]);
        setSuccessMsg(`Project '${created.code} - ${created.name}' berhasil dibuat.`);
        setShowCreate(false);
        setNewCode("");
        setNewName("");
        setNewDesc("");
        setNewOwnerId("");
        setNewDiscordChannelId("");
      }
    } catch {
      setErrorMsg("Terjadi kesalahan jaringan saat membuat project.");
    } finally {
      setIsSubmittingCreate(false);
    }
  };

  const openEditModal = (p: ProjectItem) => {
    setEditingProject(p);
    setEditCode(p.code);
    setEditName(p.name);
    setEditDesc(p.description || "");
    setEditOwnerId(p.ownerId || "");
    setEditDiscordChannelId(p.discordChannelId || "");
    setEditIsActive(p.isActive);
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProject) return;

    setErrorMsg(null);
    setSuccessMsg(null);
    setIsSubmittingEdit(true);

    try {
      const res = await fetch(`/api/projects/${editingProject.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: editCode,
          name: editName,
          description: editDesc,
          ownerId: editOwnerId || null,
          discordChannelId: editDiscordChannelId || null,
          isActive: editIsActive,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || "Gagal memperbarui project");
      } else {
        setProjects((prev) =>
          prev.map((item) =>
            item.id === editingProject.id
              ? {
                  ...item,
                  ...data.project,
                  ownerName: usersList.find((u) => u.id === editOwnerId)?.username || null,
                }
              : item,
          ),
        );
        setSuccessMsg(`Project '${editCode}' berhasil diperbarui.`);
        setEditingProject(null);
      }
    } catch {
      setErrorMsg("Terjadi kesalahan jaringan saat memperbarui project.");
    } finally {
      setIsSubmittingEdit(false);
    }
  };

  const handleToggleStatus = async (p: ProjectItem) => {
    setErrorMsg(null);
    setSuccessMsg(null);

    const nextStatus = !p.isActive;
    try {
      const res = await fetch(`/api/projects/${p.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: nextStatus }),
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || "Gagal mengubah status project");
      } else {
        setProjects((prev) =>
          prev.map((item) =>
            item.id === p.id ? { ...item, isActive: nextStatus } : item,
          ),
        );
        setSuccessMsg(
          `Status project '${p.code}' diubah menjadi ${nextStatus ? "Aktif" : "Nonaktif"}.`,
        );
      }
    } catch {
      setErrorMsg("Terjadi kesalahan jaringan.");
    }
  };

  return (
    <div className="space-y-6">
      {errorMsg && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <span className="font-semibold">Perhatian:</span> {errorMsg}
        </div>
      )}

      {successMsg && (
        <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-700">
          {successMsg}
        </div>
      )}

      {/* Control Bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 flex-col gap-3 sm:flex-row">
          <input
            type="text"
            placeholder="Cari kode atau nama project..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 sm:max-w-xs"
          />

          <select
            value={statusFilter}
            onChange={(e) =>
              setStatusFilter(e.target.value as "all" | "active" | "inactive")
            }
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="active">Project Aktif</option>
            <option value="all">Semua Status</option>
            <option value="inactive">Project Nonaktif</option>
          </select>
        </div>

        {canManage && (
          <button
            onClick={() => setShowCreate(true)}
            className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500"
          >
            + Buat Project Baru
          </button>
        )}
      </div>

      {/* Projects Table */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-gray-200 text-left text-sm">
          <thead className="bg-gray-50 text-xs font-semibold uppercase text-gray-500">
            <tr>
              <th className="px-6 py-3">Kode</th>
              <th className="px-6 py-3">Nama Project</th>
              <th className="px-6 py-3">PIC / Owner</th>
              <th className="px-6 py-3">Channel Discord</th>
              <th className="px-6 py-3">Tiket Terkait</th>
              <th className="px-6 py-3">Status</th>
              {canManage && <th className="px-6 py-3 text-right">Aksi</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {filtered.length === 0 ? (
              <tr>
                <td
                  colSpan={canManage ? 7 : 6}
                  className="px-6 py-8 text-center text-gray-500"
                >
                  Tidak ada project yang ditemukan.
                </td>
              </tr>
            ) : (
              filtered.map((p) => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 font-mono font-bold text-gray-900">
                    <span className="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-800">
                      {p.code}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-semibold text-gray-900">{p.name}</div>
                    {p.description && (
                      <div className="mt-0.5 line-clamp-1 text-xs text-gray-500">
                        {p.description}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 text-xs text-gray-700">
                    {p.ownerName || "-"}
                  </td>
                  <td className="px-6 py-4 font-mono text-xs text-gray-600">
                    {p.discordChannelId ? `#${p.discordChannelId}` : "(Global fallback)"}
                  </td>
                  <td className="px-6 py-4 text-xs font-semibold text-gray-700">
                    {p.ticketCount ?? 0}
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${
                        p.isActive
                          ? "border-green-200 bg-green-50 text-green-700"
                          : "border-gray-200 bg-gray-100 text-gray-600"
                      }`}
                    >
                      {p.isActive ? "Aktif" : "Nonaktif"}
                    </span>
                  </td>
                  {canManage && (
                    <td className="px-6 py-4 text-right text-xs">
                      <div className="inline-flex items-center gap-2">
                        <button
                          onClick={() => openEditModal(p)}
                          className="font-medium text-blue-600 hover:text-blue-800"
                        >
                          Ubah
                        </button>
                        <span className="text-gray-300">|</span>
                        <button
                          onClick={() => handleToggleStatus(p)}
                          className={`font-medium ${
                            p.isActive
                              ? "text-red-600 hover:text-red-800"
                              : "text-green-600 hover:text-green-800"
                          }`}
                        >
                          {p.isActive ? "Nonaktifkan" : "Aktifkan"}
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-bold text-gray-900">Buat Project Baru</h3>
            <p className="mt-1 text-xs text-gray-600">
              Kode project akan dijadikan prefix nomor tiket otomatis (contoh:{" "}
              <span className="font-mono font-bold">WMS-0001</span>). Kode tidak bisa diubah
              setelah tiket pertama dibuat.
            </p>

            <form onSubmit={handleCreate} className="mt-4 space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-semibold text-gray-700">
                    Kode Project <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: WMS"
                    value={newCode}
                    onChange={(e) => setNewCode(e.target.value.toUpperCase())}
                    className="mt-1 w-full font-mono uppercase rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                  <p className="mt-0.5 text-[10px] text-gray-500">2–10 karakter huruf/angka</p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700">
                    Nama Project <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Warehouse App"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700">
                  Deskripsi (Opsional)
                </label>
                <textarea
                  rows={2}
                  placeholder="Keterangan singkat cakupan project..."
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-semibold text-gray-700">
                    PIC / Owner (Opsional)
                  </label>
                  <select
                    value={newOwnerId}
                    onChange={(e) => setNewOwnerId(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="">Pilih PIC (Opsional)</option>
                    {usersList.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.username || u.id}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700">
                    Channel Discord ID (Opsional)
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: 1122334455"
                    value={newDiscordChannelId}
                    onChange={(e) => setNewDiscordChannelId(e.target.value)}
                    className="mt-1 w-full font-mono rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                  <p className="mt-0.5 text-[10px] text-gray-500">
                    Kosongkan untuk pakai channel global
                  </p>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowCreate(false)}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingCreate}
                  className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-50"
                >
                  {isSubmittingCreate ? "Menyimpan..." : "Buat Project"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editingProject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-bold text-gray-900">Ubah Data Project</h3>

            <form onSubmit={handleEdit} className="mt-4 space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-semibold text-gray-700">
                    Kode Project
                  </label>
                  <input
                    type="text"
                    required
                    disabled={(editingProject.ticketCount ?? 0) > 0}
                    value={editCode}
                    onChange={(e) => setEditCode(e.target.value.toUpperCase())}
                    className="mt-1 w-full font-mono uppercase rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-gray-100 disabled:text-gray-500"
                  />
                  {(editingProject.ticketCount ?? 0) > 0 ? (
                    <p className="mt-0.5 text-[10px] text-amber-600">
                      Terkunci: sudah ada {editingProject.ticketCount} tiket
                    </p>
                  ) : (
                    <p className="mt-0.5 text-[10px] text-gray-500">Belum ada tiket, kode dapat diubah</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700">
                    Nama Project <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700">
                  Deskripsi
                </label>
                <textarea
                  rows={2}
                  value={editDesc}
                  onChange={(e) => setEditDesc(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-semibold text-gray-700">
                    PIC / Owner
                  </label>
                  <select
                    value={editOwnerId}
                    onChange={(e) => setEditOwnerId(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="">Tidak ada PIC</option>
                    {usersList.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.username || u.id}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700">
                    Channel Discord ID
                  </label>
                  <input
                    type="text"
                    value={editDiscordChannelId}
                    onChange={(e) => setEditDiscordChannelId(e.target.value)}
                    className="mt-1 w-full font-mono rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="editIsActive"
                  checked={editIsActive}
                  onChange={(e) => setEditIsActive(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="editIsActive" className="text-xs font-medium text-gray-700">
                  Project Aktif (dapat menerima tiket baru)
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setEditingProject(null)}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingEdit}
                  className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-50"
                >
                  {isSubmittingEdit ? "Menyimpan..." : "Simpan Perubahan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
