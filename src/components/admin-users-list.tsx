"use client";

import { useState } from "react";
import { changeUserTeam, resetUserPassword } from "@/app/actions/admin";
import { DeleteUserButton } from "@/components/delete-user-button";
import { Button, Input, Select } from "@/components/ui";

type TeamOption = { value: string; label: string };

type AdminUser = {
  id: string;
  name: string | null;
  email: string;
  teamId: string | null;
  teamName: string | null;
  role: "MANAGER" | "MEMBER" | null;
};

function Modal({
  title,
  open,
  onClose,
  children,
}: {
  title: string;
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
}) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-6 shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
        <div className="mt-4">{children}</div>
      </div>
    </div>
  );
}

function AdminUserRow({
  user,
  teamOptions,
  canDelete,
}: {
  user: AdminUser;
  teamOptions: TeamOption[];
  canDelete: boolean;
}) {
  const [resetOpen, setResetOpen] = useState(false);
  const [teamOpen, setTeamOpen] = useState(false);
  const displayName = user.name ?? user.email;
  const teamLabel = user.teamName
    ? `${user.teamName} · ${user.role === "MANAGER" ? "Manager" : "Member"}`
    : "No team assigned";

  return (
    <>
      <li className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="truncate font-medium text-slate-900">{displayName}</p>
          {user.name && <p className="truncate text-sm text-slate-500">{user.email}</p>}
          <p className="mt-1 text-sm text-slate-500">{teamLabel}</p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <Button type="button" variant="secondary" onClick={() => setTeamOpen(true)}>
            Change team
          </Button>
          <Button type="button" variant="secondary" onClick={() => setResetOpen(true)}>
            Reset password
          </Button>
          {canDelete && (
            <DeleteUserButton
              userId={user.id}
              userLabel={user.name ? `${user.name} (${user.email})` : user.email}
            />
          )}
        </div>
      </li>

      <Modal title={`Change team — ${displayName}`} open={teamOpen} onClose={() => setTeamOpen(false)}>
        <form
          action={changeUserTeam}
          className="space-y-4"
          onSubmit={() => setTeamOpen(false)}
        >
          <input type="hidden" name="userId" value={user.id} />
          <Select
            label="Team"
            name="teamId"
            required
            defaultValue={user.teamId ?? teamOptions[0]?.value}
            options={teamOptions}
          />
          <Select
            label="Role"
            name="role"
            defaultValue={user.role ?? "MEMBER"}
            options={[
              { value: "MEMBER", label: "Member" },
              { value: "MANAGER", label: "Manager" },
            ]}
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => setTeamOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">Save</Button>
          </div>
        </form>
      </Modal>

      <Modal
        title={`Reset password — ${displayName}`}
        open={resetOpen}
        onClose={() => setResetOpen(false)}
      >
        <form
          action={resetUserPassword}
          className="space-y-4"
          onSubmit={() => setResetOpen(false)}
        >
          <input type="hidden" name="userId" value={user.id} />
          <Input
            label="New password"
            name="password"
            type="password"
            required
            autoComplete="new-password"
            placeholder="At least 8 characters"
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => setResetOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">Reset password</Button>
          </div>
        </form>
      </Modal>
    </>
  );
}

export function AdminUsersList({
  users,
  teamOptions,
  currentUserId,
}: {
  users: AdminUser[];
  teamOptions: TeamOption[];
  currentUserId: string;
}) {
  if (users.length === 0) {
    return <p className="mt-4 text-sm text-slate-500">No users yet.</p>;
  }

  return (
    <div className="mt-4 overflow-hidden rounded-lg border border-slate-200">
      <div className="hidden border-b border-slate-200 bg-slate-50 px-4 py-2.5 text-xs font-medium uppercase tracking-wide text-slate-500 sm:grid sm:grid-cols-[1fr_auto] sm:gap-4">
        <span>User</span>
        <span>Actions</span>
      </div>
      <ul className="divide-y divide-slate-100 bg-white">
        {users.map((user) => (
          <AdminUserRow
            key={user.id}
            user={user}
            teamOptions={teamOptions}
            canDelete={user.id !== currentUserId}
          />
        ))}
      </ul>
    </div>
  );
}
