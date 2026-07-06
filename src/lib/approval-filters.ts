import type { Prisma, RequestStatus } from "@prisma/client";

export function parseApprovalSearch(
  params: { q?: string | string[] } | undefined
): string | null {
  const raw = params?.q;
  const value = (Array.isArray(raw) ? raw[0] : raw)?.trim();
  return value || null;
}

export function buildRequesterNameWhere(q: string): Prisma.UserWhereInput {
  return {
    OR: [
      { name: { contains: q, mode: "insensitive" } },
      { email: { contains: q, mode: "insensitive" } },
    ],
  };
}

export function buildApprovalRequestWhere(
  scope: Prisma.VacationRequestWhereInput,
  status: RequestStatus | { in: RequestStatus[] },
  q: string | null
): Prisma.VacationRequestWhereInput {
  if (!q) {
    return { status, ...scope };
  }

  const nameWhere = buildRequesterNameWhere(q);
  if (scope.user) {
    return {
      status,
      user: {
        AND: [scope.user, nameWhere],
      },
    };
  }

  return {
    status,
    ...scope,
    user: nameWhere,
  };
}
