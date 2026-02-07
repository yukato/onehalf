# LLMモデル切り替え機能 設計書

## 概要

Claude APIに加えてOpenAI APIに対応し、設定ページからモデルを切り替えられるようにする。

## アーキテクチャ

```
【環境変数】                     【設定ファイル】              【API呼び出し】
ANTHROPIC_API_KEY ─┐             settings.json               ┌─ rag_chatbot.py
OPENAI_API_KEY ────┼──→ 利用可能 ──→ { provider: "openai",    ├─ ticket_rag.py
                   │     モデル判定    model: "gpt-4o" }      │
                   │                       │                 │
                   └───────────────────────┴─────────────────┘
                                           ▼
                              LLMClient（共通インターフェース）
                              ├─ AnthropicClient
                              └─ OpenAIClient
```

## バックエンド実装

### 1. LLMクライアント抽象化

**ファイル**: `backend/app/services/llm_client.py`

```python
class LLMClient(ABC):
    @abstractmethod
    def generate(self, prompt: str, max_tokens: int) -> str:
        pass

class AnthropicClient(LLMClient):
    # Claude API呼び出し

class OpenAIClient(LLMClient):
    # OpenAI API呼び出し
```

### 2. 設定管理

**ファイル**: `backend/app/services/settings_manager.py`

**設定ファイル**: `data/settings.json`

```json
{
  "llm_provider": "anthropic",
  "llm_model": "claude-sonnet-4-5-20250929"
}
```

### 3. 利用可能モデル

| 環境変数                   | 利用可能モデル                                        |
| -------------------------- | ----------------------------------------------------- |
| `ANTHROPIC_API_KEY` 設定済 | claude-sonnet-4-5-20250929, claude-3-5-haiku-20241022 |
| `OPENAI_API_KEY` 設定済    | gpt-4o, gpt-4o-mini                                   |

### 4. APIエンドポイント

**ファイル**: `backend/app/routers/settings.py`

- `GET /api/settings` - 現在の設定と利用可能モデル一覧を取得
- `PUT /api/settings` - モデル設定を更新

**レスポンス例**:

```json
{
  "current": {
    "provider": "anthropic",
    "model": "claude-sonnet-4-5-20250929"
  },
  "available_models": [
    {
      "provider": "anthropic",
      "model": "claude-sonnet-4-5-20250929",
      "name": "Claude Sonnet 4.5",
      "enabled": true
    },
    { "provider": "openai", "model": "gpt-4o", "name": "GPT-4o", "enabled": false }
  ]
}
```

## フロントエンド実装

### 1. 設定ページ

**ファイル**: `frontend/app/settings/page.tsx`

- ログイン認証必須
- ラジオボタンでモデル選択
- 環境変数未設定のモデルはグレーアウト
- 保存ボタンで `PUT /api/settings` を呼び出し

### 2. ヘッダー更新

- ログイン後のヘッダーに「設定」リンクを追加

## 環境変数

**追加する環境変数**:

- `OPENAI_API_KEY` - OpenAI APIキー（オプション）

## ファイル変更一覧

### 新規作成

- `backend/app/services/llm_client.py`
- `backend/app/services/settings_manager.py`
- `backend/app/routers/settings.py`
- `frontend/app/settings/page.tsx`
- `data/settings.json`

### 修正

- `backend/app/config.py` - OpenAI APIキー追加
- `backend/app/main.py` - settingsルーター追加
- `backend/app/services/rag_chatbot.py` - LLMClient使用に変更
- `backend/app/services/ticket_rag.py` - LLMClient使用に変更
- `backend/requirements.txt` - openai追加
- `frontend/components/layout/Header.tsx` - 設定リンク追加
- `frontend/lib/api.ts` - settings API追加
