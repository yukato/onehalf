AWS × Zendesk FAQ チャットボット 技術検討メモ

1. 背景・目的

Zendesk に蓄積されている FAQ / Help Center 記事をナレッジベースとして活用し、
AWS 上で以下を満たすチャットボットを構築したい。
	•	正確な情報提供（FAQ に基づいた回答、ハルシネーション抑制）
	•	自然な対話（会話文脈を考慮した応答）
	•	情報の鮮度（Zendesk の最新情報を即座に反映）

本ドキュメントは、別エンジニアによる技術検討・設計レビュー用の整理メモとする。

⸻

2. 全体アーキテクチャ概要

基本方針：RAG（Retrieval Augmented Generation）構成

[ Zendesk FAQ / Help Center ]
            │
            │  (API / Webhook)
            ▼
[ 取込Lambda + EventBridge ]
            │
            ▼
[ S3 (原文・整形データ) ]
            │
            ▼
[ Bedrock Knowledge Bases ] ── (Vector DB)
            │
            ▼
[ Chat API (API Gateway + Lambda / ECS) ]
            │
            ▼
[ UI (Web / Slack / Zendesk Widget) ]


⸻

3. 推奨技術スタック（AWS ネイティブ）

3.1 LLM / RAG 基盤
	•	Amazon Bedrock
	•	LLM 呼び出し（自然言語応答）
	•	Converse API / Tool Use 対応
	•	Amazon Bedrock Knowledge Bases
	•	FAQ 文書のベクトル化・検索
	•	RAG をマネージドで実装可能
	•	（代替案）OpenSearch Serverless Vector Engine
	•	より細かい検索制御やスコアリングが必要な場合

⸻

4. Zendesk 連携・情報鮮度の担保

4.1 データソース
	•	Zendesk Help Center 記事
	•	必要に応じて：
	•	マクロ
	•	定型返信
	•	解決済みチケット（要検討）

4.2 更新検知・取り込み
	•	Zendesk API の updated_at を利用した増分取得
	•	構成例：
	•	EventBridge（5分 / 1時間 / 1日など）
	•	Lambda で差分取得
	•	S3 に保存 → Bedrock KB へ同期

4.3 メタデータ設計（重要）

各ドキュメントに以下を付与：
	•	article_id
	•	category / section
	•	updated_at
	•	公開ステータス

→ 検索時の優先度制御・根拠提示に利用

⸻

5. 正確性を担保する設計ポイント
	•	RAG 前提：
	•	検索結果に含まれる情報のみで回答
	•	情報が不足する場合は「不明」「確認が必要」と返す
	•	出典付き回答：
	•	記事タイトル
	•	URL
	•	最終更新日
	•	禁止事項：
	•	FAQ に存在しない断定回答
	•	推測・補完による回答

⸻

6. 自然な対話のための工夫
	•	会話履歴はフルで渡さず、要約したコンテキストを利用
	•	検索クエリは以下から生成：
	•	最新ユーザー発話
	•	会話要約
	•	回答トーン：
	•	カスタマーサポート向け（丁寧・簡潔）
	•	運用側で System Prompt を管理

⸻

7. Agent / Tool 利用（将来拡張）

FAQ だけで完結しないケース向け：
	•	Bedrock Agent / Tool Use
	•	注文ステータス確認
	•	アカウント状態確認
	•	問い合わせの人手エスカレーション

→ 「事実は API」「説明は LLM」 の分離

⸻

8. 構成パターン比較

パターンA：最短・マネージド重視（推奨）
	•	Bedrock Knowledge Bases
	•	Lambda 中心
	•	運用コスト・実装工数が小さい

向いている：
	•	初期導入
	•	CS 向け PoC / 本番

パターンB：検索精度重視
	•	OpenSearch Serverless Vector
	•	独自リランキング・フィルタ

向いている：
	•	FAQ が巨大
	•	専門ドメイン
	•	精度要件が非常に高い場合

⸻

9. 非機能要件・運用観点
	•	ログ：CloudWatch Logs
	•	モニタリング：
	•	検索ヒット率
	•	回答失敗率（“分かりません”）
	•	セキュリティ：
	•	FAQ 非公開情報の混入防止
	•	IAM 最小権限

⸻

10. 次の検討事項（ToDo）
	•	FAQ ソースの範囲確定（Help Center のみ？）
	•	更新頻度とコストのバランス
	•	Zendesk UI への埋め込み方式
	•	人手エスカレーション導線

⸻

