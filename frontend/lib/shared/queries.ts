import type { RowDataPacket, ResultSetHeader } from 'mysql2';
import { getCompanyPool, ensureCompanyDatabase } from '@/lib/company-db';
import crypto from 'crypto';

// ---------- Row types ----------

interface SharedLinkRow extends RowDataPacket {
  id: bigint;
  token: string;
  link_type: string;
  target_id: bigint;
  expires_at: Date;
  is_active: number;
  can_approve: number;
  approved_at: Date | null;
  approved_by_name: string | null;
  approval_comment: string | null;
  rejected_at: Date | null;
  rejected_by_name: string | null;
  rejection_comment: string | null;
  created_by: bigint;
  created_by_name: string;
  created_at: Date;
  updated_at: Date;
}

interface ApprovalLogRow extends RowDataPacket {
  id: bigint;
  link_type: string;
  target_id: bigint;
  action: 'approved' | 'rejected';
  actor_name: string;
  comment: string | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: Date;
}

// ---------- Helper ----------

async function pool(companySlug: string) {
  await ensureCompanyDatabase(companySlug);
  return getCompanyPool(companySlug);
}

function generateToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

// ---------- Shared Links ----------

export async function createSharedLink(
  companySlug: string,
  data: {
    linkType: string;
    targetId: string;
    canApprove: boolean;
    expiresInDays?: number;
    createdBy: string;
    createdByName: string;
  }
) {
  const p = await pool(companySlug);
  const token = generateToken();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + (data.expiresInDays ?? 30));

  const [result] = await p.execute<ResultSetHeader>(
    `INSERT INTO shared_links (token, link_type, target_id, expires_at, can_approve, created_by, created_by_name)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [token, data.linkType, data.targetId, expiresAt, data.canApprove ? 1 : 0, data.createdBy, data.createdByName]
  );

  return {
    id: result.insertId.toString(),
    token,
    expiresAt: expiresAt.toISOString(),
  };
}

export async function getSharedLinkByToken(companySlug: string, token: string) {
  const p = await pool(companySlug);
  const [rows] = await p.execute<SharedLinkRow[]>(
    'SELECT * FROM shared_links WHERE token = ? AND is_active = 1',
    [token]
  );
  if (rows.length === 0) return null;
  const r = rows[0];

  // Check expiration
  if (new Date(r.expires_at) < new Date()) {
    return null;
  }

  return formatSharedLink(r);
}

export async function listSharedLinks(companySlug: string, linkType: string, targetId: string) {
  const p = await pool(companySlug);
  const [rows] = await p.execute<SharedLinkRow[]>(
    'SELECT * FROM shared_links WHERE link_type = ? AND target_id = ? ORDER BY created_at DESC',
    [linkType, targetId]
  );
  return rows.map(formatSharedLink);
}

export async function deactivateSharedLink(companySlug: string, id: string) {
  const p = await pool(companySlug);
  await p.execute('UPDATE shared_links SET is_active = 0 WHERE id = ?', [id]);
}

export async function approveSharedLink(
  companySlug: string,
  token: string,
  data: { actorName: string; comment?: string; ipAddress?: string; userAgent?: string }
) {
  const p = await pool(companySlug);
  const conn = await p.getConnection();

  try {
    await conn.beginTransaction();

    // Update shared link
    const [result] = await conn.execute<ResultSetHeader>(
      `UPDATE shared_links SET approved_at = NOW(), approved_by_name = ?, approval_comment = ?
       WHERE token = ? AND is_active = 1 AND approved_at IS NULL AND rejected_at IS NULL`,
      [data.actorName, data.comment || null, token]
    );

    if (result.affectedRows === 0) {
      await conn.rollback();
      return null;
    }

    // Get link info for approval log
    const [links] = await conn.execute<SharedLinkRow[]>(
      'SELECT * FROM shared_links WHERE token = ?',
      [token]
    );
    const link = links[0];

    // Insert approval log
    await conn.execute(
      `INSERT INTO approval_logs (link_type, target_id, action, actor_name, comment, ip_address, user_agent)
       VALUES (?, ?, 'approved', ?, ?, ?, ?)`,
      [link.link_type, link.target_id, data.actorName, data.comment || null, data.ipAddress || null, data.userAgent || null]
    );

    await conn.commit();
    return formatSharedLink(link);
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

export async function rejectSharedLink(
  companySlug: string,
  token: string,
  data: { actorName: string; comment?: string; ipAddress?: string; userAgent?: string }
) {
  const p = await pool(companySlug);
  const conn = await p.getConnection();

  try {
    await conn.beginTransaction();

    const [result] = await conn.execute<ResultSetHeader>(
      `UPDATE shared_links SET rejected_at = NOW(), rejected_by_name = ?, rejection_comment = ?
       WHERE token = ? AND is_active = 1 AND approved_at IS NULL AND rejected_at IS NULL`,
      [data.actorName, data.comment || null, token]
    );

    if (result.affectedRows === 0) {
      await conn.rollback();
      return null;
    }

    const [links] = await conn.execute<SharedLinkRow[]>(
      'SELECT * FROM shared_links WHERE token = ?',
      [token]
    );
    const link = links[0];

    await conn.execute(
      `INSERT INTO approval_logs (link_type, target_id, action, actor_name, comment, ip_address, user_agent)
       VALUES (?, ?, 'rejected', ?, ?, ?, ?)`,
      [link.link_type, link.target_id, data.actorName, data.comment || null, data.ipAddress || null, data.userAgent || null]
    );

    await conn.commit();
    return formatSharedLink(link);
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

// ---------- Approval Logs ----------

export async function getApprovalLogs(companySlug: string, linkType: string, targetId: string) {
  const p = await pool(companySlug);
  const [rows] = await p.execute<ApprovalLogRow[]>(
    'SELECT * FROM approval_logs WHERE link_type = ? AND target_id = ? ORDER BY created_at DESC',
    [linkType, targetId]
  );
  return rows.map((r) => ({
    id: r.id.toString(),
    linkType: r.link_type,
    targetId: r.target_id.toString(),
    action: r.action,
    actorName: r.actor_name,
    comment: r.comment,
    createdAt: r.created_at.toISOString(),
  }));
}

// ---------- Format ----------

function formatSharedLink(r: SharedLinkRow) {
  return {
    id: r.id.toString(),
    token: r.token,
    linkType: r.link_type,
    targetId: r.target_id.toString(),
    expiresAt: r.expires_at.toISOString(),
    isActive: !!r.is_active,
    canApprove: !!r.can_approve,
    approvedAt: r.approved_at?.toISOString() || null,
    approvedByName: r.approved_by_name,
    approvalComment: r.approval_comment,
    rejectedAt: r.rejected_at?.toISOString() || null,
    rejectedByName: r.rejected_by_name,
    rejectionComment: r.rejection_comment,
    createdByName: r.created_by_name,
    createdAt: r.created_at.toISOString(),
  };
}
