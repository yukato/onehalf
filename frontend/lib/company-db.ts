import mysql from 'mysql2/promise';

const DB_HOST = process.env.DB_HOST || '127.0.0.1';
const DB_PORT = parseInt(process.env.DB_PORT || '3307');
const DB_USER = process.env.DB_USER || 'onehalf';
const DB_PASSWORD = process.env.DB_PASSWORD || '';

const pools: Map<string, mysql.Pool> = new Map();

export function getCompanyDbName(companySlug: string): string {
  if (!/^[a-z0-9][a-z0-9-]*$/.test(companySlug)) {
    throw new Error(`Invalid company slug: ${companySlug}`);
  }
  return `onehalf_${companySlug}`;
}

/** LIKE句のワイルドカード文字をエスケープ */
export function escapeLike(value: string): string {
  return value.replace(/%/g, '\\%').replace(/_/g, '\\_');
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
    connectionLimit: 10,
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
      try {
        await conn.execute(ddl);
      } catch (err: unknown) {
        // Ignore "Duplicate column name" (1060) and "Duplicate key name" (1061) for ALTER TABLE idempotency
        const mysqlErr = err as { errno?: number };
        if (mysqlErr.errno === 1060 || mysqlErr.errno === 1061) continue;
        throw err;
      }
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

  `CREATE TABLE IF NOT EXISTS llm_settings (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    provider VARCHAR(50) NOT NULL DEFAULT 'anthropic',
    model VARCHAR(100) NOT NULL DEFAULT 'claude-sonnet-4-5-20250929',
    api_key_anthropic VARCHAR(500) DEFAULT NULL,
    api_key_openai VARCHAR(500) DEFAULT NULL,
    embedding_model VARCHAR(100) NOT NULL DEFAULT 'intfloat/multilingual-e5-small',
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  // ========== 業務システム テーブル ==========

  // 取引先マスタ（顧客・仕入先）
  `CREATE TABLE IF NOT EXISTS customers (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    code VARCHAR(50) NOT NULL,
    name VARCHAR(255) NOT NULL,
    name_kana VARCHAR(255),
    customer_type ENUM('customer','supplier','both') NOT NULL DEFAULT 'customer',
    postal_code VARCHAR(10),
    address TEXT,
    phone VARCHAR(50),
    fax VARCHAR(50),
    email VARCHAR(255),
    contact_person VARCHAR(255),
    payment_terms VARCHAR(255),
    notes TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uk_code (code),
    INDEX idx_customer_type (customer_type),
    INDEX idx_is_active (is_active),
    INDEX idx_name (name)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  // 商品カテゴリ
  `CREATE TABLE IF NOT EXISTS product_categories (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL,
    sort_order INT DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uk_slug (slug),
    INDEX idx_sort_order (sort_order)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  // 商品マスタ
  `CREATE TABLE IF NOT EXISTS products (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    code VARCHAR(100) NOT NULL,
    name VARCHAR(500) NOT NULL,
    name_kana VARCHAR(500),
    category_id BIGINT,
    unit VARCHAR(50) DEFAULT '個',
    unit_price DECIMAL(12,2) DEFAULT 0,
    cost_price DECIMAL(12,2) DEFAULT 0,
    tax_rate DECIMAL(5,2) DEFAULT 10.00,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uk_code (code),
    FOREIGN KEY (category_id) REFERENCES product_categories(id) ON DELETE SET NULL,
    INDEX idx_category_id (category_id),
    INDEX idx_is_active (is_active),
    INDEX idx_name (name(191))
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  // 採番テーブル
  `CREATE TABLE IF NOT EXISTS number_sequences (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    sequence_type VARCHAR(50) NOT NULL,
    prefix VARCHAR(20) NOT NULL DEFAULT '',
    current_number BIGINT NOT NULL DEFAULT 0,
    fiscal_year INT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uk_type_year (sequence_type, fiscal_year)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  // 外部共有リンク
  `CREATE TABLE IF NOT EXISTS shared_links (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    token VARCHAR(64) NOT NULL,
    link_type ENUM('quotation','order','delivery_note','invoice','report') NOT NULL,
    target_id BIGINT NOT NULL,
    expires_at DATETIME NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    can_approve BOOLEAN DEFAULT FALSE,
    approved_at DATETIME,
    approved_by_name VARCHAR(255),
    approval_comment TEXT,
    rejected_at DATETIME,
    rejected_by_name VARCHAR(255),
    rejection_comment TEXT,
    created_by BIGINT NOT NULL,
    created_by_name VARCHAR(255) NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uk_token (token),
    INDEX idx_link_type_target (link_type, target_id),
    INDEX idx_expires_at (expires_at),
    INDEX idx_is_active (is_active)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  // 承認ログ
  `CREATE TABLE IF NOT EXISTS approval_logs (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    link_type ENUM('quotation','order','delivery_note','invoice','report') NOT NULL,
    target_id BIGINT NOT NULL,
    action ENUM('approved','rejected') NOT NULL,
    actor_name VARCHAR(255) NOT NULL,
    comment TEXT,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_link_type_target (link_type, target_id),
    INDEX idx_created_at (created_at)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  // 見積書
  `CREATE TABLE IF NOT EXISTS quotations (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    quotation_number VARCHAR(50) NOT NULL,
    customer_id BIGINT NOT NULL,
    subject VARCHAR(500),
    quotation_date DATE NOT NULL,
    valid_until DATE,
    subtotal DECIMAL(12,2) DEFAULT 0,
    tax_amount DECIMAL(12,2) DEFAULT 0,
    total_amount DECIMAL(12,2) DEFAULT 0,
    notes TEXT,
    internal_memo TEXT,
    status ENUM('draft','sent','approved','rejected','expired') DEFAULT 'draft',
    created_by BIGINT NOT NULL,
    created_by_name VARCHAR(255) NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uk_quotation_number (quotation_number),
    FOREIGN KEY (customer_id) REFERENCES customers(id),
    INDEX idx_customer_id (customer_id),
    INDEX idx_status (status),
    INDEX idx_quotation_date (quotation_date)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  // 見積明細
  `CREATE TABLE IF NOT EXISTS quotation_items (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    quotation_id BIGINT NOT NULL,
    sort_order INT DEFAULT 0,
    product_id BIGINT,
    product_code VARCHAR(100),
    product_name VARCHAR(500) NOT NULL,
    quantity DECIMAL(10,2) NOT NULL DEFAULT 1,
    unit VARCHAR(50) DEFAULT '個',
    unit_price DECIMAL(12,2) NOT NULL DEFAULT 0,
    tax_rate DECIMAL(5,2) DEFAULT 10.00,
    amount DECIMAL(12,2) NOT NULL DEFAULT 0,
    notes VARCHAR(500),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (quotation_id) REFERENCES quotations(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL,
    INDEX idx_quotation_id (quotation_id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  // 受注
  `CREATE TABLE IF NOT EXISTS orders (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    order_number VARCHAR(50) NOT NULL,
    sales_number VARCHAR(50),
    customer_id BIGINT NOT NULL,
    quotation_id BIGINT,
    order_date DATE NOT NULL,
    delivery_date DATE,
    subtotal DECIMAL(12,2) DEFAULT 0,
    tax_amount DECIMAL(12,2) DEFAULT 0,
    total_amount DECIMAL(12,2) DEFAULT 0,
    notes TEXT,
    internal_memo TEXT,
    status ENUM('pending','confirmed','in_production','ready','partially_delivered','delivered','completed','cancelled') DEFAULT 'pending',
    created_by BIGINT NOT NULL,
    created_by_name VARCHAR(255) NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uk_order_number (order_number),
    FOREIGN KEY (customer_id) REFERENCES customers(id),
    FOREIGN KEY (quotation_id) REFERENCES quotations(id) ON DELETE SET NULL,
    INDEX idx_customer_id (customer_id),
    INDEX idx_status (status),
    INDEX idx_order_date (order_date),
    INDEX idx_delivery_date (delivery_date)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  // 受注: order_type / custom_fields カラム追加（既存テーブル対応）
  // MySQL does not support ADD COLUMN IF NOT EXISTS; duplicate column errors (1060) are caught in ensureCompanyDatabase
  `ALTER TABLE orders ADD COLUMN order_type ENUM('general','repair','machine','small_item') DEFAULT 'general'`,
  `ALTER TABLE orders ADD COLUMN custom_fields JSON`,
  `ALTER TABLE orders ADD INDEX idx_order_type (order_type)`,

  // 受注明細
  `CREATE TABLE IF NOT EXISTS order_items (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    order_id BIGINT NOT NULL,
    sort_order INT DEFAULT 0,
    product_id BIGINT,
    product_code VARCHAR(100),
    product_name VARCHAR(500) NOT NULL,
    quantity DECIMAL(10,2) NOT NULL DEFAULT 1,
    delivered_quantity DECIMAL(10,2) DEFAULT 0,
    unit VARCHAR(50) DEFAULT '個',
    unit_price DECIMAL(12,2) NOT NULL DEFAULT 0,
    tax_rate DECIMAL(5,2) DEFAULT 10.00,
    amount DECIMAL(12,2) NOT NULL DEFAULT 0,
    notes VARCHAR(500),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL,
    INDEX idx_order_id (order_id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  // 納品書
  `CREATE TABLE IF NOT EXISTS delivery_notes (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    delivery_number VARCHAR(50) NOT NULL,
    order_id BIGINT NOT NULL,
    customer_id BIGINT NOT NULL,
    delivery_date DATE NOT NULL,
    subtotal DECIMAL(12,2) DEFAULT 0,
    tax_amount DECIMAL(12,2) DEFAULT 0,
    total_amount DECIMAL(12,2) DEFAULT 0,
    notes TEXT,
    status ENUM('draft','issued','delivered','confirmed') DEFAULT 'draft',
    created_by BIGINT NOT NULL,
    created_by_name VARCHAR(255) NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uk_delivery_number (delivery_number),
    FOREIGN KEY (order_id) REFERENCES orders(id),
    FOREIGN KEY (customer_id) REFERENCES customers(id),
    INDEX idx_order_id (order_id),
    INDEX idx_customer_id (customer_id),
    INDEX idx_status (status),
    INDEX idx_delivery_date (delivery_date)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  // 納品書明細
  `CREATE TABLE IF NOT EXISTS delivery_note_items (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    delivery_note_id BIGINT NOT NULL,
    order_item_id BIGINT,
    sort_order INT DEFAULT 0,
    product_id BIGINT,
    product_code VARCHAR(100),
    product_name VARCHAR(500) NOT NULL,
    quantity DECIMAL(10,2) NOT NULL DEFAULT 1,
    unit VARCHAR(50) DEFAULT '個',
    unit_price DECIMAL(12,2) NOT NULL DEFAULT 0,
    tax_rate DECIMAL(5,2) DEFAULT 10.00,
    amount DECIMAL(12,2) NOT NULL DEFAULT 0,
    notes VARCHAR(500),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (delivery_note_id) REFERENCES delivery_notes(id) ON DELETE CASCADE,
    FOREIGN KEY (order_item_id) REFERENCES order_items(id) ON DELETE SET NULL,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL,
    INDEX idx_delivery_note_id (delivery_note_id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  // 請求書
  `CREATE TABLE IF NOT EXISTS invoices (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    invoice_number VARCHAR(50) NOT NULL,
    customer_id BIGINT NOT NULL,
    billing_period_start DATE,
    billing_period_end DATE,
    invoice_date DATE NOT NULL,
    due_date DATE,
    subtotal DECIMAL(12,2) DEFAULT 0,
    tax_amount DECIMAL(12,2) DEFAULT 0,
    total_amount DECIMAL(12,2) DEFAULT 0,
    notes TEXT,
    status ENUM('draft','issued','sent','partially_paid','paid','overdue','cancelled') DEFAULT 'draft',
    created_by BIGINT NOT NULL,
    created_by_name VARCHAR(255) NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uk_invoice_number (invoice_number),
    FOREIGN KEY (customer_id) REFERENCES customers(id),
    INDEX idx_customer_id (customer_id),
    INDEX idx_status (status),
    INDEX idx_invoice_date (invoice_date),
    INDEX idx_due_date (due_date)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  // 請求明細
  `CREATE TABLE IF NOT EXISTS invoice_items (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    invoice_id BIGINT NOT NULL,
    delivery_note_id BIGINT,
    order_id BIGINT,
    sort_order INT DEFAULT 0,
    description VARCHAR(500) NOT NULL,
    quantity DECIMAL(10,2) NOT NULL DEFAULT 1,
    unit VARCHAR(50) DEFAULT '式',
    unit_price DECIMAL(12,2) NOT NULL DEFAULT 0,
    tax_rate DECIMAL(5,2) DEFAULT 10.00,
    amount DECIMAL(12,2) NOT NULL DEFAULT 0,
    notes VARCHAR(500),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE,
    FOREIGN KEY (delivery_note_id) REFERENCES delivery_notes(id) ON DELETE SET NULL,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE SET NULL,
    INDEX idx_invoice_id (invoice_id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  // OCR注文書抽出
  `CREATE TABLE IF NOT EXISTS ocr_extractions (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    source_image_path VARCHAR(1000) NOT NULL,
    source_image_url VARCHAR(1000) NOT NULL,
    source_type ENUM('fax','email','upload') NOT NULL DEFAULT 'upload',
    extracted_data JSON,
    matched_customer_id BIGINT,
    matched_customer_name VARCHAR(255),
    match_confidence DECIMAL(5,2),
    status ENUM('pending','extracting','extracted','reviewed','converted','error') DEFAULT 'pending',
    error_message TEXT,
    converted_order_id BIGINT,
    created_by BIGINT NOT NULL,
    created_by_name VARCHAR(255) NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_status (status),
    INDEX idx_created_at (created_at)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  // 入金記録
  `CREATE TABLE IF NOT EXISTS payments (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    invoice_id BIGINT NOT NULL,
    payment_date DATE NOT NULL,
    amount DECIMAL(12,2) NOT NULL,
    payment_method VARCHAR(100),
    reference VARCHAR(255),
    notes TEXT,
    created_by BIGINT NOT NULL,
    created_by_name VARCHAR(255) NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE,
    INDEX idx_invoice_id (invoice_id),
    INDEX idx_payment_date (payment_date)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  // AI分析キャッシュ
  `CREATE TABLE IF NOT EXISTS ai_analysis_cache (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    analysis_type VARCHAR(50) NOT NULL,
    result_markdown TEXT NOT NULL,
    data_hash VARCHAR(64) NOT NULL,
    generated_at DATETIME NOT NULL,
    expires_at DATETIME NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_analysis_type (analysis_type),
    INDEX idx_expires_at (expires_at)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  // ========== パフォーマンス改善: 一覧のフィルタ+ソート用 複合インデックス追加 ==========
  `ALTER TABLE quotations ADD INDEX idx_status_created (status, created_at)`,
  `ALTER TABLE orders ADD INDEX idx_status_created (status, created_at)`,
  `ALTER TABLE delivery_notes ADD INDEX idx_status_created (status, created_at)`,
  `ALTER TABLE invoices ADD INDEX idx_status_created (status, created_at)`,
];

