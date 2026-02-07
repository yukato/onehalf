import mysql from 'mysql2/promise';

const DB_HOST = process.env.DB_HOST || '127.0.0.1';
const DB_PORT = parseInt(process.env.DB_PORT || '3307');
const DB_USER = process.env.DB_USER || 'onehalf';
const DB_PASSWORD = process.env.DB_PASSWORD || '';

const pools: Map<string, mysql.Pool> = new Map();

export function getCompanyDbName(companySlug: string): string {
  return `onehalf_${companySlug}`;
}

export function getCompanyPool(companySlug: string): mysql.Pool {
  const existing = pools.get(companySlug);
  if (existing) return existing;

  const pool = mysql.createPool({
    host: DB_HOST,
    port: DB_PORT,
    user: DB_USER,
    password: DB_PASSWORD || undefined,
    database: getCompanyDbName(companySlug),
    waitForConnections: true,
    connectionLimit: 5,
    queueLimit: 0,
  });

  pools.set(companySlug, pool);
  return pool;
}

const initialized = new Set<string>();

export async function ensureCompanyDatabase(companySlug: string): Promise<void> {
  if (initialized.has(companySlug)) return;

  const conn = await mysql.createConnection({
    host: DB_HOST,
    port: DB_PORT,
    user: DB_USER,
    password: DB_PASSWORD || undefined,
  });

  const dbName = getCompanyDbName(companySlug);

  try {
    await conn.execute(`CREATE DATABASE IF NOT EXISTS \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
    await conn.changeUser({ database: dbName });
    for (const ddl of TABLE_DEFINITIONS) {
      await conn.execute(ddl);
    }
    initialized.add(companySlug);
  } finally {
    await conn.end();
  }
}

// 全テーブルを1つのクエリでは実行できないため、個別に実行
const TABLE_DEFINITIONS = [
  `CREATE TABLE IF NOT EXISTS documents (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(500) NOT NULL,
    original_name VARCHAR(500) NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    size BIGINT NOT NULL,
    s3_path VARCHAR(1000) NOT NULL,
    s3_url VARCHAR(1000) NOT NULL,
    uploaded_by BIGINT NOT NULL,
    uploaded_by_name VARCHAR(255) NOT NULL,
    status ENUM('processing','ready','error') DEFAULT 'processing',
    error_message TEXT,
    page_count INT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_status (status),
    INDEX idx_created_at (created_at)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  `CREATE TABLE IF NOT EXISTS document_tags (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(100) NOT NULL,
    color VARCHAR(7) DEFAULT '#6B7280',
    sort_order INT DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uk_slug (slug),
    INDEX idx_sort_order (sort_order)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  `CREATE TABLE IF NOT EXISTS document_tag_assignments (
    document_id BIGINT NOT NULL,
    tag_id BIGINT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (document_id, tag_id),
    FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE,
    FOREIGN KEY (tag_id) REFERENCES document_tags(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  `CREATE TABLE IF NOT EXISTS document_chunks (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    document_id BIGINT NOT NULL,
    content TEXT NOT NULL,
    chunk_index INT NOT NULL,
    token_count INT,
    embedding JSON,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE,
    INDEX idx_document_id (document_id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
];

