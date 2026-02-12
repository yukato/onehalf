import type { RowDataPacket, ResultSetHeader } from 'mysql2';
import { getCompanyPool, ensureCompanyDatabase } from '@/lib/company-db';

// ---------- Row types ----------

interface DocumentRow extends RowDataPacket {
  id: bigint;
  title: string;
  original_name: string;
  mime_type: string;
  size: bigint;
  s3_path: string;
  s3_url: string;
  uploaded_by: bigint;
  uploaded_by_name: string;
  status: 'processing' | 'ready' | 'error';
  error_message: string | null;
  page_count: number | null;
  created_at: Date;
  updated_at: Date;
}

interface TagRow extends RowDataPacket {
  id: bigint;
  name: string;
  slug: string;
  color: string;
  sort_order: number;
  created_at: Date;
}

interface TagAssignmentRow extends RowDataPacket {
  tag_id: bigint;
  name: string;
  slug: string;
  color: string;
}

interface ChunkRow extends RowDataPacket {
  id: bigint;
  document_id: bigint;
  content: string;
  chunk_index: number;
  token_count: number | null;
  embedding: number[] | null;
  created_at: Date;
}

interface CountRow extends RowDataPacket {
  total: number;
}

// ---------- Helper ----------

async function pool(companySlug: string) {
  await ensureCompanyDatabase(companySlug);
  return getCompanyPool(companySlug);
}

// ---------- Documents ----------

export interface ListDocumentsOptions {
  tagId?: string;
  status?: string;
  limit?: number;
  offset?: number;
}

export async function listDocuments(companySlug: string, opts: ListDocumentsOptions = {}) {
  const p = await pool(companySlug);
  const { tagId, status, limit = 50, offset = 0 } = opts;

  let where = '1=1';
  const params: (string | number)[] = [];

  if (tagId) {
    where += ' AND d.id IN (SELECT document_id FROM document_tag_assignments WHERE tag_id = ?)';
    params.push(tagId);
  }
  if (status) {
    where += ' AND d.status = ?';
    params.push(status);
  }

  // Run count and data queries in parallel
  const [countResult, dataResult] = await Promise.all([
    p.execute<CountRow[]>(
      `SELECT COUNT(DISTINCT d.id) AS total FROM documents d WHERE ${where}`,
      params
    ),
    p.execute<DocumentRow[]>(
      `SELECT d.* FROM documents d WHERE ${where} ORDER BY d.created_at DESC LIMIT ? OFFSET ?`,
      [...params, String(limit), String(offset)]
    ),
  ]);

  const total = countResult[0][0]?.total ?? 0;
  const rows = dataResult[0];

  const docIds = rows.map((r) => r.id);
  let tagsByDocId: Map<string, TagAssignmentRow[]> = new Map();

  if (docIds.length > 0) {
    const placeholders = docIds.map(() => '?').join(',');
    const [tagRows] = await p.execute<TagAssignmentRow[]>(
      `SELECT dta.document_id AS tag_doc_id, t.id AS tag_id, t.name, t.slug, t.color
       FROM document_tag_assignments dta
       JOIN document_tags t ON t.id = dta.tag_id
       WHERE dta.document_id IN (${placeholders})`,
      docIds.map((id) => id.toString())
    );
    for (const tr of tagRows) {
      const key = ((tr as unknown) as RowDataPacket & { tag_doc_id: bigint }).tag_doc_id.toString();
      if (!tagsByDocId.has(key)) tagsByDocId.set(key, []);
      tagsByDocId.get(key)!.push(tr);
    }
  }

  return {
    documents: rows.map((r) => ({
      id: r.id.toString(),
      title: r.title,
      originalName: r.original_name,
      mimeType: r.mime_type,
      size: Number(r.size),
      s3Path: r.s3_path,
      s3Url: r.s3_url,
      uploadedBy: r.uploaded_by.toString(),
      uploadedByName: r.uploaded_by_name,
      status: r.status,
      errorMessage: r.error_message,
      pageCount: r.page_count,
      tags: (tagsByDocId.get(r.id.toString()) || []).map((t) => ({
        id: t.tag_id.toString(),
        name: t.name,
        slug: t.slug,
        color: t.color,
      })),
      createdAt: r.created_at.toISOString(),
      updatedAt: r.updated_at.toISOString(),
    })),
    total,
  };
}

export async function getDocument(companySlug: string, id: string) {
  const p = await pool(companySlug);

  const [rows] = await p.execute<DocumentRow[]>(
    'SELECT * FROM documents WHERE id = ?',
    [id]
  );
  if (rows.length === 0) return null;

  const r = rows[0];

  const [tagRows] = await p.execute<TagAssignmentRow[]>(
    `SELECT t.id AS tag_id, t.name, t.slug, t.color
     FROM document_tag_assignments dta
     JOIN document_tags t ON t.id = dta.tag_id
     WHERE dta.document_id = ?`,
    [id]
  );

  return {
    id: r.id.toString(),
    title: r.title,
    originalName: r.original_name,
    mimeType: r.mime_type,
    size: Number(r.size),
    s3Path: r.s3_path,
    s3Url: r.s3_url,
    uploadedBy: r.uploaded_by.toString(),
    uploadedByName: r.uploaded_by_name,
    status: r.status,
    errorMessage: r.error_message,
    pageCount: r.page_count,
    tags: tagRows.map((t) => ({
      id: t.tag_id.toString(),
      name: t.name,
      slug: t.slug,
      color: t.color,
    })),
    createdAt: r.created_at.toISOString(),
    updatedAt: r.updated_at.toISOString(),
  };
}

export async function insertDocument(
  companySlug: string,
  data: {
    title: string;
    originalName: string;
    mimeType: string;
    size: number;
    s3Path: string;
    s3Url: string;
    uploadedBy: string;
    uploadedByName: string;
  }
) {
  const p = await pool(companySlug);
  const [result] = await p.execute<ResultSetHeader>(
    `INSERT INTO documents (title, original_name, mime_type, size, s3_path, s3_url, uploaded_by, uploaded_by_name)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [data.title, data.originalName, data.mimeType, data.size, data.s3Path, data.s3Url, data.uploadedBy, data.uploadedByName]
  );
  return result.insertId.toString();
}

export async function updateDocument(
  companySlug: string,
  id: string,
  data: { title?: string; tagIds?: string[] }
) {
  const p = await pool(companySlug);

  if (data.title !== undefined) {
    await p.execute('UPDATE documents SET title = ? WHERE id = ?', [data.title, id]);
  }

  if (data.tagIds !== undefined) {
    await p.execute('DELETE FROM document_tag_assignments WHERE document_id = ?', [id]);
    if (data.tagIds.length > 0) {
      const placeholders = data.tagIds.map(() => '(?, ?)').join(', ');
      const params: string[] = [];
      for (const tagId of data.tagIds) {
        params.push(id, tagId);
      }
      await p.execute(
        `INSERT INTO document_tag_assignments (document_id, tag_id) VALUES ${placeholders}`,
        params
      );
    }
  }
}

export async function updateDocumentStatus(
  companySlug: string,
  id: string,
  status: 'processing' | 'ready' | 'error',
  extra?: { errorMessage?: string; pageCount?: number }
) {
  const p = await pool(companySlug);
  if (status === 'error' && extra?.errorMessage) {
    await p.execute(
      'UPDATE documents SET status = ?, error_message = ? WHERE id = ?',
      [status, extra.errorMessage, id]
    );
  } else if (status === 'ready' && extra?.pageCount !== undefined) {
    await p.execute(
      'UPDATE documents SET status = ?, page_count = ? WHERE id = ?',
      [status, extra.pageCount, id]
    );
  } else {
    await p.execute('UPDATE documents SET status = ? WHERE id = ?', [status, id]);
  }
}

export async function deleteDocument(companySlug: string, id: string) {
  const p = await pool(companySlug);
  const [doc] = await p.execute<DocumentRow[]>('SELECT s3_path FROM documents WHERE id = ?', [id]);
  await p.execute('DELETE FROM documents WHERE id = ?', [id]);
  return doc[0]?.s3_path || null;
}

// ---------- Tags ----------

export async function listTags(companySlug: string) {
  const p = await pool(companySlug);
  const [rows] = await p.execute<TagRow[]>(
    'SELECT * FROM document_tags ORDER BY sort_order ASC, created_at ASC'
  );
  return rows.map((r) => ({
    id: r.id.toString(),
    name: r.name,
    slug: r.slug,
    color: r.color,
    sortOrder: r.sort_order,
  }));
}

export async function createTag(
  companySlug: string,
  data: { name: string; slug: string; color?: string }
) {
  const p = await pool(companySlug);
  const [result] = await p.execute<ResultSetHeader>(
    'INSERT INTO document_tags (name, slug, color) VALUES (?, ?, ?)',
    [data.name, data.slug, data.color || '#6B7280']
  );
  return result.insertId.toString();
}

export async function updateTag(
  companySlug: string,
  id: string,
  data: { name?: string; slug?: string; color?: string }
) {
  const p = await pool(companySlug);
  const sets: string[] = [];
  const params: string[] = [];
  if (data.name !== undefined) { sets.push('name = ?'); params.push(data.name); }
  if (data.slug !== undefined) { sets.push('slug = ?'); params.push(data.slug); }
  if (data.color !== undefined) { sets.push('color = ?'); params.push(data.color); }
  if (sets.length === 0) return;
  params.push(id);
  await p.execute(`UPDATE document_tags SET ${sets.join(', ')} WHERE id = ?`, params);
}

export async function deleteTag(companySlug: string, id: string) {
  const p = await pool(companySlug);
  await p.execute('DELETE FROM document_tags WHERE id = ?', [id]);
}

// ---------- Chunks ----------

export async function insertChunks(
  companySlug: string,
  documentId: string,
  chunks: { content: string; chunkIndex: number; tokenCount: number; embedding: number[] }[]
) {
  if (chunks.length === 0) return;
  const p = await pool(companySlug);
  const conn = await p.getConnection();

  try {
    await conn.beginTransaction();

    // Batch INSERT: build multi-row VALUES clause (batches of 50 to avoid packet size limits)
    const BATCH_SIZE = 50;
    for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
      const batch = chunks.slice(i, i + BATCH_SIZE);
      const placeholders = batch.map(() => '(?, ?, ?, ?, ?)').join(', ');
      const params: (string | number)[] = [];
      for (const chunk of batch) {
        params.push(documentId, chunk.content, chunk.chunkIndex, chunk.tokenCount, JSON.stringify(chunk.embedding));
      }
      await conn.execute(
        `INSERT INTO document_chunks (document_id, content, chunk_index, token_count, embedding)
         VALUES ${placeholders}`,
        params
      );
    }

    await conn.commit();
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

export async function getDocumentChunks(companySlug: string, documentId: string) {
  const p = await pool(companySlug);
  const [rows] = await p.execute<ChunkRow[]>(
    'SELECT * FROM document_chunks WHERE document_id = ? ORDER BY chunk_index ASC',
    [documentId]
  );
  return rows.map((r) => ({
    id: r.id.toString(),
    documentId: r.document_id.toString(),
    content: r.content,
    chunkIndex: r.chunk_index,
    tokenCount: r.token_count,
    embedding: r.embedding,
  }));
}

export async function getAllChunksWithEmbeddings(companySlug: string) {
  const p = await pool(companySlug);
  const [rows] = await p.execute<ChunkRow[]>(
    `SELECT dc.*, d.title AS doc_title, d.id AS doc_id
     FROM document_chunks dc
     JOIN documents d ON d.id = dc.document_id
     WHERE d.status = 'ready' AND dc.embedding IS NOT NULL`
  );
  return rows.map((r) => ({
    id: r.id.toString(),
    documentId: r.document_id.toString(),
    documentTitle: ((r as unknown) as RowDataPacket & { doc_title: string }).doc_title,
    content: r.content,
    chunkIndex: r.chunk_index,
    tokenCount: r.token_count,
    embedding: r.embedding as number[],
  }));
}

// ---------- Reprocess ----------

export async function reprocessAllDocuments(companySlug: string) {
  const p = await pool(companySlug);

  // 1. Delete all chunks
  await p.execute('DELETE FROM document_chunks');

  // 2. Get all ready documents
  const [rows] = await p.execute<DocumentRow[]>(
    "SELECT id, s3_path, mime_type FROM documents WHERE status = 'ready'"
  );

  // 3. Set all documents to processing
  if (rows.length > 0) {
    await p.execute("UPDATE documents SET status = 'processing' WHERE status = 'ready'");
  }

  return rows.map((r) => ({
    id: r.id.toString(),
    s3Path: r.s3_path,
    mimeType: r.mime_type,
  }));
}
