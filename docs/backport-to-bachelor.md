# バックポートガイド: onehalf → bachelor-chat-bot

## 概要

onehalf で実施した UI 統一変更（コミット `1c48296`, `9bc9336`）を bachelor-chat-bot にバックポートするためのガイドです。

**対象変更:**
1. SearchBox 共通コンポーネントの導入
2. 検索フィルターレイアウトの統一（interviews/matchings → users/venues パターン）
3. フォーカス色の統一（blue-500 → cloud-light）
4. interviews ページの showBackButton 修正
5. アクションボタン色の統一（blue-600 → primary）

---

## 前提: プロジェクト間の差異

| 項目 | onehalf | bachelor-chat-bot |
|------|---------|-------------------|
| ルーティング | `(admin)/admin/black/*` | `black/*`（フラット） |
| Primary 色 | `#CC785C` | `#DE9C4E` |
| Focus 色（変更後） | `cloud-light (#BFBFBA)` | 未定義（要追加） |
| SearchBox | あり | なし（要作成） |
| cloud カラー定義 | あり | なし（要追加） |

---

## Step 1: tailwind.config.js にカラー追加

**ファイル:** `frontend/tailwind.config.js`

`colors` に `cloud` を追加:

```javascript
colors: {
  primary: {
    DEFAULT: '#DE9C4E',
    light: '#EBB46E',
    dark: '#C88A3D',
  },
  // ↓ 追加
  cloud: {
    DEFAULT: '#91918D',
    dark: '#666663',
    medium: '#91918D',
    light: '#BFBFBA',   // フォーカス色として使用
  },
  secondary: '#9C875B',
  accent: '#000',
  'message-sent': '#F5F5F5',
  'message-received': '#FFFFFF',
},
```

---

## Step 2: SearchBox コンポーネントの作成

**ファイル:** `frontend/components/ui/SearchBox.tsx`（新規作成）

onehalf の `frontend/components/ui/SearchBox.tsx` をそのままコピー。変更不要。

```tsx
'use client';

interface SearchBoxProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onClear?: () => void;
  placeholder?: string;
  isLoading?: boolean;
  submitLabel?: string;
  loadingLabel?: string;
  className?: string;
  showClear?: boolean;
}

export function SearchBox({
  value,
  onChange,
  onSubmit,
  onClear,
  placeholder = '検索...',
  isLoading = false,
  submitLabel = '検索',
  loadingLabel = '検索中...',
  className,
  showClear = false,
}: SearchBoxProps) {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit();
  };

  return (
    <form onSubmit={handleSubmit} className={className}>
      <div className="relative">
        <svg
          className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full pl-10 pr-24 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cloud-light/50 focus:border-cloud-light"
        />
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {showClear && onClear && (
            <button
              type="button"
              onClick={onClear}
              className="px-2 py-1.5 text-gray-400 text-sm hover:text-gray-600 transition-colors"
            >
              クリア
            </button>
          )}
          <button
            type="submit"
            disabled={isLoading}
            className="px-3 py-1.5 bg-gray-100 text-gray-600 text-sm rounded-md hover:bg-gray-200 disabled:opacity-50 transition-colors"
          >
            {isLoading ? loadingLabel : submitLabel}
          </button>
        </div>
      </div>
    </form>
  );
}
```

**注:** フォーカス色は `focus:ring-cloud-light/50 focus:border-cloud-light` を使用。`useState` は不要。

---

## Step 3: フォーカス色の一括置換

### 3a. blue-500 → cloud-light（14ファイル、109箇所）

#### 置換ルール

| 変更前 | 変更後 |
|--------|--------|
| `focus:ring-blue-500` | `focus:ring-cloud-light/50` |
| `focus:border-blue-500` | `focus:border-cloud-light` |

#### 対象ファイル一覧

| # | ファイル | 箇所数（ring） |
|---|---------|--------|
| 1 | `app/black/users/page.tsx` | 20 |
| 2 | `app/black/interviews/page.tsx` | 16 |
| 3 | `app/black/venues/page.tsx` | 15 |
| 4 | `app/black/users/[id]/page.tsx` | 12 |
| 5 | `app/black/interviews/[id]/page.tsx` | 10 |
| 6 | `app/black/matchings/page.tsx` | 10 |
| 7 | `app/black/interview-types/page.tsx` | 6 |
| 8 | `app/settings/page.tsx` | 6 |
| 9 | `components/UserAvailabilityPatternEditor.tsx` | 5 |
| 10 | `app/admin/users/page.tsx` | 4 |
| 11 | `app/black/matchings/[id]/page.tsx` | 2 |
| 12 | `app/cs/improvements/page.tsx` | 1 |
| 13 | `components/FileUpload.tsx` | 1 |
| 14 | `components/FileUploadModal.tsx` | 1 |

#### 実行コマンド

```bash
cd frontend
find . -name "*.tsx" -exec grep -l "focus:ring-blue-500" {} \; | while read f; do
  sed -i '' 's/focus:ring-blue-500/focus:ring-cloud-light\/50/g' "$f"
  sed -i '' 's/focus:border-blue-500/focus:border-cloud-light/g' "$f"
  echo "Updated: $f"
done
```

### 3b. primary → cloud-light（2ファイル、3箇所）

bachelor では一部のファイルが既に `focus:ring-primary` を使用しているため、こちらも変更が必要。

#### 置換ルール

| 変更前 | 変更後 |
|--------|--------|
| `focus:ring-primary` | `focus:ring-cloud-light/50` |
| `focus:border-primary` | `focus:border-cloud-light` |

#### 対象ファイル一覧

| # | ファイル | 箇所数（ring + border） |
|---|---------|--------|
| 1 | `app/login/page.tsx` | 4（ring 2 + border 2） |
| 2 | `components/chat/ChatInput.tsx` | 2（ring 1 + border 1） |

#### 実行コマンド

```bash
cd frontend
sed -i '' 's/focus:ring-primary/focus:ring-cloud-light\/50/g' app/login/page.tsx components/chat/ChatInput.tsx
sed -i '' 's/focus:border-primary/focus:border-cloud-light/g' app/login/page.tsx components/chat/ChatInput.tsx
```

**注意:** `hover:bg-primary-dark` 等のボタン用 primary は変更しないこと。`focus:ring-primary` と `focus:border-primary` のみが対象。

### `focus:outline-none` の補完

onehalf では `focus:outline-none` が全ての input/select に付いているが、bachelor では一部欠けている可能性がある。各ファイルで `focus:ring-2 focus:ring-cloud-light/50` の前に `focus:outline-none` があるか確認し、なければ追加。

---

## Step 4: アクションボタン色の統一

**対象:** 23ファイル、51箇所

### 置換ルール

| 変更前 | 変更後 | 対象 |
|--------|--------|------|
| `bg-blue-600` | `bg-primary` | 検索/保存/作成ボタンのみ |
| `hover:bg-blue-700` | `hover:bg-primary-dark` | 同上 |
| `bg-blue-500` | `bg-primary` | コピーボタン等 |
| `hover:bg-blue-600` | `hover:bg-primary-dark` | 同上 |

### 変更しないもの

以下のセマンティック blue は変更しない:
- ステータスバッジ (`bg-blue-100 text-blue-800`)
- リンク色 (`text-blue-600 hover:text-blue-800`)
- タブインジケータ (`border-blue-500 text-blue-600`)
- 選択状態 (`bg-blue-50`, `bg-blue-100 border-blue-500`)
- ドラッグ状態 (`border-blue-500 bg-blue-50`)
- ステップインジケータ (numbered circle `bg-blue-600`)
- アバター背景 (`bg-blue-100`)

### 対象ファイルと変更すべきボタン

| ファイル | 対象ボタン |
|---------|----------|
| `app/global-error.tsx` | リトライボタン |
| `components/UserPreferencesEditor.tsx` | 保存ボタン |
| `components/UserAttributesEditor.tsx` | 保存ボタン |
| `components/UserAvailabilityPatternEditor.tsx` | 保存ボタン |
| `components/ImageCropUpload.tsx` | アップロードボタン |
| `components/FileUpload.tsx` | アップロードボタン |
| `components/FileUploadModal.tsx` | アップロード/選択ボタン |
| `components/chat/ChatMessage.tsx` | お問い合わせボタン、コピーボタン |
| `app/black/users/page.tsx` | 新規作成ボタン |
| `app/black/users/[id]/page.tsx` | 保存ボタン |
| `app/black/users/[id]/create-matching/page.tsx` | マッチング作成ボタン |
| `app/black/venues/page.tsx` | 新規追加ボタン |
| `app/black/interviews/page.tsx` | 新規作成ボタン |
| `app/black/interviews/[id]/page.tsx` | 保存ボタン |
| `app/black/interview-types/page.tsx` | 新規作成ボタン |
| `app/black/matchings/page.tsx` | 新規作成ボタン |
| `app/black/matchings/[id]/page.tsx` | 保存ボタン |
| `app/admin/users/page.tsx` | 保存ボタン |
| `app/settings/page.tsx` | 保存ボタン |
| `app/cs/improvements/page.tsx` | 適用ボタン |
| `app/browse/articles/page.tsx` | アクションボタン |
| `app/browse/macros/page.tsx` | アクションボタン |
| `app/browse/tickets/page.tsx` | アクションボタン |

---

## Step 5: interviews ページの showBackButton 修正

**ファイル:** `frontend/app/black/interviews/page.tsx`

Line 354 の `showBackButton={false}` を削除:

```diff
  <PageLayout
    currentPage="black-interviews"
    title="面談管理"
-   showBackButton={false}
    currentUser={currentUser}
    onLogout={handleLogout}
```

---

## Step 6: 検索フィルターレイアウトの統一

### 6a. interviews/page.tsx

**変更前（現在の bachelor）:**
```tsx
<div className="bg-white rounded-lg border border-gray-200 p-4">
  <div className="flex flex-wrap gap-3 items-end">
    <div>
      <label className="block text-xs text-gray-500 mb-1">検索</label>
      <input type="text" ... className="... w-40" />
    </div>
    <div>
      <label className="block text-xs text-gray-500 mb-1">ステータス</label>
      <select ...><option value="">すべて</option>...</select>
    </div>
    <!-- 他のフィルターも同じパターン -->
  </div>
</div>
```

**変更後:**
```tsx
<div className="bg-white rounded-lg border border-gray-200 p-4 space-y-3">
  <SearchBox
    value={searchQuery}
    onChange={setSearchQuery}
    onSubmit={handleSearch}
    placeholder="ゲスト名・メールで検索..."
  />
  <div className="flex flex-wrap gap-3">
    <select className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cloud-light/50 focus:border-cloud-light">
      <option value="">ステータス: すべて</option>
      {/* 既存のoption */}
    </select>
    <select className="...同上...">
      <option value="">面談種類: すべて</option>
      {/* 既存のoption */}
    </select>
    <div className="flex items-center gap-1.5">
      <span className="text-xs text-gray-500">開始日</span>
      <input type="date" className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cloud-light/50 focus:border-cloud-light" />
      <span className="text-xs text-gray-400">〜</span>
      <input type="date" className="...同上..." />
    </div>
    {hasFilters && (
      <button className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800">クリア</button>
    )}
  </div>
</div>
```

**変更ポイント:**
1. `import { SearchBox } from '@/components/ui/SearchBox'` を追加
2. `handleSearch` 関数を作成（引数なし、既存のロード関数を呼ぶ）
3. `<div><label>` ラッパーを全て削除
4. `items-end` を削除
5. `space-y-3` を外側 div に追加
6. select の最初の option にカテゴリ名を含める（`ステータス: すべて`）
7. 日付フィルターを `開始日 [from] 〜 [to]` パターンに変更

### 6b. matchings/page.tsx

interviews と同じパターンで統一。追加考慮:
- 現在の `onKeyDown` Enter 検知を削除（SearchBox が内部でフォーム送信）
- select/date の `onChange` で `loadMatchings` を直接呼ぶ既存動作は維持

---

## Step 7: 検証

```bash
# TypeScript コンパイルチェック
cd frontend && npx tsc --noEmit

# focus:ring-blue 残存チェック（0件であること）
grep -r "focus:ring-blue-500" --include="*.tsx" | wc -l
grep -r "focus:border-blue-500" --include="*.tsx" | wc -l

# focus:ring-primary 残存チェック（0件であること）
grep -r "focus:ring-primary" --include="*.tsx" | wc -l
grep -r "focus:border-primary" --include="*.tsx" | wc -l

# bg-blue-600 残存チェック（セマンティック blue のみ残るはず）
# ステップインジケータの bg-blue-600 は変更しないため、残存があっても OK
grep -rn "bg-blue-600" --include="*.tsx" | grep -v "ステップ\|step\|number"

# showBackButton={false} 残存チェック（0件であること）
grep -r "showBackButton={false}" --include="*.tsx" | wc -l

# items-end 残存チェック（interviews/matchings フィルター部分のみ）
grep -n "items-end" app/black/interviews/page.tsx app/black/matchings/page.tsx

# 画面確認
# - /login — フォーカス色が cloud-light
# - /black/interviews — 戻るボタンあり + SearchBox + フィルター統一
# - /black/matchings — SearchBox + 日付ラベル付き
# - /black/users — SearchBox（既に統一済みの場合）
# - /browse/articles — ボタン色が primary
```

---

## パス対応表

onehalf のコミットで変更されたファイルと bachelor の対応:

| onehalf パス | bachelor パス |
|---|---|
| `app/(admin)/admin/black/interviews/page.tsx` | `app/black/interviews/page.tsx` |
| `app/(admin)/admin/black/matchings/page.tsx` | `app/black/matchings/page.tsx` |
| `app/(admin)/admin/black/users/page.tsx` | `app/black/users/page.tsx` |
| `app/(admin)/admin/black/venues/page.tsx` | `app/black/venues/page.tsx` |
| `app/(admin)/admin/black/interview-types/page.tsx` | `app/black/interview-types/page.tsx` |
| `app/(admin)/admin/black/interviews/[id]/page.tsx` | `app/black/interviews/[id]/page.tsx` |
| `app/(admin)/admin/black/matchings/[id]/page.tsx` | `app/black/matchings/[id]/page.tsx` |
| `app/(admin)/admin/black/users/[id]/page.tsx` | `app/black/users/[id]/page.tsx` |
| `app/(admin)/admin/black/users/[id]/create-matching/page.tsx` | `app/black/users/[id]/create-matching/page.tsx` |
| `app/(admin)/admin/login/page.tsx` | `app/login/page.tsx` |
| `app/(admin)/admin/settings/page.tsx` | `app/settings/page.tsx` |
| `app/(admin)/admin/users/page.tsx` | `app/admin/users/page.tsx` |
| `app/(admin)/admin/companies/page.tsx` | **存在しない** |
| `app/(admin)/admin/companies/[id]/page.tsx` | **存在しない** |
| `app/(admin)/admin/modules/page.tsx` | **存在しない** |
| `app/(admin)/admin/cs/improvements/page.tsx` | `app/cs/improvements/page.tsx` |
| `app/(admin)/admin/browse/articles/page.tsx` | `app/browse/articles/page.tsx` |
| `app/(admin)/admin/browse/macros/page.tsx` | `app/browse/macros/page.tsx` |
| `app/(admin)/admin/browse/tickets/page.tsx` | `app/browse/tickets/page.tsx` |
| `app/(company)/company/login/page.tsx` | **存在しない** |
| `app/(company)/company/[companySlug]/m/documents/page.tsx` | **存在しない** |
| `app/(admin)/admin/c/[companySlug]/documents/page.tsx` | **存在しない** |
| `app/global-error.tsx` | `app/global-error.tsx` |
| `components/ui/SearchBox.tsx` | `components/ui/SearchBox.tsx`（新規作成） |
| `components/FileUpload.tsx` | `components/FileUpload.tsx` |
| `components/FileUploadModal.tsx` | `components/FileUploadModal.tsx` |
| `components/ImageCropUpload.tsx` | `components/ImageCropUpload.tsx` |
| `components/UserAttributesEditor.tsx` | `components/UserAttributesEditor.tsx` |
| `components/UserAvailabilityPatternEditor.tsx` | `components/UserAvailabilityPatternEditor.tsx` |
| `components/UserPreferencesEditor.tsx` | `components/UserPreferencesEditor.tsx` |
| `components/chat/ChatInput.tsx` | `components/chat/ChatInput.tsx` |
| `components/chat/ChatMessage.tsx` | `components/chat/ChatMessage.tsx` |
| `components/documents/DocumentTagManager.tsx` | **存在しない** |
| `components/documents/DocumentUploadModal.tsx` | **存在しない** |

**bachelor に存在しないファイル（スキップ）:** companies, modules, company login, documents 関連（6ファイル）

---

## 作業見積り

| Step | 内容 | 難易度 |
|------|------|--------|
| 1 | tailwind.config.js カラー追加 | 簡単 |
| 2 | SearchBox コンポーネント作成 | コピー |
| 3 | フォーカス色 一括置換 | sed コマンド |
| 4 | ボタン色統一 | 手動（セマンティック判別必要） |
| 5 | showBackButton 修正 | 1行削除 |
| 6 | フィルターレイアウト統一 | 中程度（2ファイル） |
| 7 | 検証 | コンパイル + 画面確認 |
