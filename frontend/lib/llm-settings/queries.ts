import type { RowDataPacket, ResultSetHeader } from 'mysql2';
import { getCompanyPool, ensureCompanyDatabase } from '@/lib/company-db';
import { AVAILABLE_LLM_MODELS } from '@/types';
import type { LlmSettingsResponse } from '@/types';

// ---------- Row types ----------

interface LlmSettingsRow extends RowDataPacket {
  id: bigint;
  provider: string;
  model: string;
  api_key_anthropic: string | null;
  api_key_openai: string | null;
  embedding_model: string;
  updated_at: Date;
}

// ---------- Helper ----------

async function pool(companySlug: string) {
  await ensureCompanyDatabase(companySlug);
  return getCompanyPool(companySlug);
}

// ---------- Defaults ----------

const DEFAULTS = {
  provider: 'anthropic',
  model: 'claude-sonnet-4-5-20250929',
  embeddingModel: 'intfloat/multilingual-e5-small',
} as const;

// ---------- Queries ----------

export async function getLlmSettings(companySlug: string): Promise<LlmSettingsResponse> {
  const p = await pool(companySlug);

  const [rows] = await p.execute<LlmSettingsRow[]>(
    'SELECT * FROM llm_settings LIMIT 1'
  );

  if (rows.length === 0) {
    return {
      provider: DEFAULTS.provider,
      model: DEFAULTS.model,
      hasAnthropicKey: false,
      hasOpenaiKey: false,
      embeddingModel: DEFAULTS.embeddingModel,
      availableModels: AVAILABLE_LLM_MODELS,
    };
  }

  const r = rows[0];
  return {
    provider: r.provider,
    model: r.model,
    hasAnthropicKey: !!r.api_key_anthropic,
    hasOpenaiKey: !!r.api_key_openai,
    embeddingModel: r.embedding_model,
    availableModels: AVAILABLE_LLM_MODELS,
  };
}

export async function upsertLlmSettings(
  companySlug: string,
  data: {
    provider?: string;
    model?: string;
    apiKeyAnthropic?: string | null;
    apiKeyOpenai?: string | null;
    embeddingModel?: string;
  }
): Promise<LlmSettingsResponse & { embeddingModelChanged: boolean }> {
  const p = await pool(companySlug);
  let embeddingModelChanged = false;

  // Check if a row exists
  const [existing] = await p.execute<LlmSettingsRow[]>(
    'SELECT * FROM llm_settings LIMIT 1'
  );

  if (existing.length === 0) {
    // INSERT new row
    const provider = data.provider ?? DEFAULTS.provider;
    const model = data.model ?? DEFAULTS.model;
    const embeddingModel = data.embeddingModel ?? DEFAULTS.embeddingModel;
    // For initial insert: undefined means no key, null means no key, string means set key
    const apiKeyAnthropic = (data.apiKeyAnthropic === undefined || data.apiKeyAnthropic === null)
      ? null : data.apiKeyAnthropic;
    const apiKeyOpenai = (data.apiKeyOpenai === undefined || data.apiKeyOpenai === null)
      ? null : data.apiKeyOpenai;

    await p.execute<ResultSetHeader>(
      `INSERT INTO llm_settings (provider, model, api_key_anthropic, api_key_openai, embedding_model)
       VALUES (?, ?, ?, ?, ?)`,
      [provider, model, apiKeyAnthropic, apiKeyOpenai, embeddingModel]
    );
  } else {
    // Detect embedding model change
    if (data.embeddingModel !== undefined && data.embeddingModel !== existing[0].embedding_model) {
      embeddingModelChanged = true;
    }

    // UPDATE existing row
    const sets: string[] = [];
    const params: (string | null)[] = [];

    if (data.provider !== undefined) {
      sets.push('provider = ?');
      params.push(data.provider);
    }
    if (data.model !== undefined) {
      sets.push('model = ?');
      params.push(data.model);
    }
    if (data.embeddingModel !== undefined) {
      sets.push('embedding_model = ?');
      params.push(data.embeddingModel);
    }
    // API keys: undefined = no change, null = clear, string = set new value
    if (data.apiKeyAnthropic !== undefined) {
      sets.push('api_key_anthropic = ?');
      params.push(data.apiKeyAnthropic === null ? null : (data.apiKeyAnthropic || null));
    }
    if (data.apiKeyOpenai !== undefined) {
      sets.push('api_key_openai = ?');
      params.push(data.apiKeyOpenai === null ? null : (data.apiKeyOpenai || null));
    }

    if (sets.length > 0) {
      params.push(existing[0].id.toString());
      await p.execute(
        `UPDATE llm_settings SET ${sets.join(', ')} WHERE id = ?`,
        params
      );
    }
  }

  const settings = await getLlmSettings(companySlug);
  return { ...settings, embeddingModelChanged };
}

// Get raw API keys (for backend use only - never expose to frontend)
export async function getLlmSettingsRaw(companySlug: string) {
  const p = await pool(companySlug);

  const [rows] = await p.execute<LlmSettingsRow[]>(
    'SELECT * FROM llm_settings LIMIT 1'
  );

  if (rows.length === 0) {
    return {
      provider: DEFAULTS.provider,
      model: DEFAULTS.model,
      apiKeyAnthropic: null as string | null,
      apiKeyOpenai: null as string | null,
      embeddingModel: DEFAULTS.embeddingModel,
    };
  }

  const r = rows[0];
  return {
    provider: r.provider,
    model: r.model,
    apiKeyAnthropic: r.api_key_anthropic,
    apiKeyOpenai: r.api_key_openai,
    embeddingModel: r.embedding_model,
  };
}
