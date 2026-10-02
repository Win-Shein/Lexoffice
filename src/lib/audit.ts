import { createHash } from "node:crypto";

import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";

export type AuditAction =
  | "CREATE"
  | "ISSUE"
  | "STATUS_CHANGE"
  | "DELETE"
  | "CREDIT_NOTE";

export type AuditEntry = {
  userId: string;
  entity: string;
  entityId: string;
  action: AuditAction;
  before?: unknown;
  after?: unknown;
};

function auditPayload(entry: {
  userId: string;
  entity: string;
  entityId: string;
  action: string;
  before: string | null;
  after: string | null;
}) {
  return JSON.stringify({
    userId: entry.userId,
    entity: entry.entity,
    entityId: entry.entityId,
    action: entry.action,
    before: entry.before,
    after: entry.after,
  });
}

function auditHash(prevHash: string | null, payload: string) {
  return createHash("sha256").update(`${prevHash ?? ""}${payload}`).digest("hex");
}

/**
 * Append-only audit entry with a hash chain. Must be called inside the same
 * transaction as the change it records so the record and its log are atomic.
 */
export async function writeAudit(tx: Prisma.TransactionClient, entry: AuditEntry) {
  const previous = await tx.auditLog.findFirst({
    where: { userId: entry.userId },
    orderBy: { seq: "desc" },
    select: { hash: true },
  });

  const prevHash = previous?.hash ?? null;
  const before = entry.before === undefined ? null : JSON.stringify(entry.before);
  const after = entry.after === undefined ? null : JSON.stringify(entry.after);

  const hash = auditHash(prevHash, auditPayload({ ...entry, before, after }));

  return tx.auditLog.create({
    data: {
      userId: entry.userId,
      entity: entry.entity,
      entityId: entry.entityId,
      action: entry.action,
      before,
      after,
      prevHash,
      hash,
    },
  });
}

/**
 * Recomputes the hash chain for a user to detect tampering with the log.
 */
export async function verifyAuditChain(
  userId: string,
): Promise<{ ok: boolean; brokenAtSeq?: number }> {
  const logs = await prisma.auditLog.findMany({
    where: { userId },
    orderBy: { seq: "asc" },
  });

  let prevHash: string | null = null;
  for (const log of logs) {
    const expected = auditHash(
      prevHash,
      auditPayload({
        userId: log.userId,
        entity: log.entity,
        entityId: log.entityId,
        action: log.action,
        before: log.before,
        after: log.after,
      }),
    );
    if (expected !== log.hash || log.prevHash !== prevHash) {
      return { ok: false, brokenAtSeq: log.seq };
    }
    prevHash = log.hash;
  }
  return { ok: true };
}
