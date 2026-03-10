"""
RAG Chatbot Service - FAQ article search and answer generation
"""

import json
import logging
import re
import numpy as np
from pathlib import Path
from sentence_transformers import SentenceTransformer
from typing import Optional

from ..config import Settings
from ..models.schemas import FAQSource, FAQMacroRef, FAQChatResponse, QualityAssessment, SimilarTicketRef
from .settings_manager import get_settings_manager
from .llm_client import LLMClient
from .rules_manager import get_rules_manager

logger = logging.getLogger(__name__)


# カテゴリと性別のマッピング
CATEGORY_TO_GENDER = {
    "男性会員の方": "male",
    "女性会員の方": "female",
}

# Search / scoring thresholds
MACRO_SCORE_THRESHOLD = 0.4
ARTICLE_BODY_MAX_CHARS = 1500
MACRO_TEMPLATE_MAX_CHARS = 1000
LLM_ANSWER_MAX_TOKENS = 2048


class RAGChatbotService:
    """Singleton service for FAQ RAG chatbot"""

    _instance: Optional["RAGChatbotService"] = None

    def __new__(cls, settings: Settings):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._initialized = False
        return cls._instance

    def __init__(self, settings: Settings):
        if self._initialized:
            return

        self.settings = settings

        print("Loading embedding model...")
        self.embedding_model = SentenceTransformer(settings.embedding_model, device='cpu')

        print("Loading article data...")
        with open(settings.get_articles_path(), "r", encoding="utf-8") as f:
            self.articles = json.load(f)

        embeddings_path = Path(settings.get_article_embeddings_path())
        if embeddings_path.exists():
            print(f"Loading pre-computed embeddings: {embeddings_path}")
            self.article_embeddings = np.load(embeddings_path)
            if len(self.article_embeddings) != len(self.articles):
                print("WARNING: Embedding count mismatch, recomputing...")
                self._compute_embeddings()
        else:
            print("Computing embeddings...")
            self._compute_embeddings()

        # タイトル専用embeddingの読み込み（ハイブリッド検索用）
        title_embeddings_path = embeddings_path.parent / "article_title_embeddings.npy"
        if title_embeddings_path.exists():
            print(f"Loading title embeddings: {title_embeddings_path}")
            self.article_title_embeddings = np.load(title_embeddings_path)
            # サイズ不一致のチェック（記事数とembedding数が一致しない場合は再計算）
            if len(self.article_title_embeddings) != len(self.articles):
                print(f"WARNING: Title embedding count mismatch ({len(self.article_title_embeddings)} vs {len(self.articles)} articles), recomputing...")
                self._compute_title_embeddings()
                np.save(title_embeddings_path, self.article_title_embeddings)
        else:
            print("Computing title embeddings...")
            self._compute_title_embeddings()
            np.save(title_embeddings_path, self.article_title_embeddings)

        # FAQ用マクロデータの読み込み（【チャットボット使用可】タグ付きのみ）
        self.macros = []
        self.macro_embeddings = None
        faq_macros_path = Path(settings.get_faq_macros_path())
        faq_macro_embeddings_path = Path(settings.get_faq_macro_embeddings_path())

        if faq_macros_path.exists() and faq_macro_embeddings_path.exists():
            print("Loading FAQ macro data...")
            with open(faq_macros_path, "r", encoding="utf-8") as f:
                self.macros = json.load(f)
            self.macro_embeddings = np.load(faq_macro_embeddings_path)
            print(f"  -> {len(self.macros)} FAQ macros loaded (【チャットボット使用可】)")
        else:
            print("FAQ macro data not found, skipping macro integration")

        # チケットデータの読み込み（間接検索用）
        self.tickets = []
        self.ticket_embeddings = None
        tickets_path = Path(settings.get_tickets_path())
        ticket_embeddings_path = Path(settings.get_ticket_embeddings_path())

        if tickets_path.exists() and ticket_embeddings_path.exists():
            print("Loading ticket data for indirect search...")
            with open(tickets_path, "r", encoding="utf-8") as f:
                self.tickets = json.load(f)
            self.ticket_embeddings = np.load(ticket_embeddings_path)
            if len(self.ticket_embeddings) != len(self.tickets):
                print("WARNING: Ticket embedding count mismatch, disabling indirect search")
                self.tickets = []
                self.ticket_embeddings = None
            else:
                print(f"  -> {len(self.tickets)} tickets loaded for indirect search")
        else:
            print("Ticket data not found, indirect search disabled")

        self._initialized = True
        print(f"RAG Chatbot ready! ({len(self.articles)} articles, {len(self.macros)} macros, {len(self.tickets)} tickets)")

    def _compute_embeddings(self) -> None:
        texts = [f"{a['title']}\n{a['body_text']}" for a in self.articles]
        self.article_embeddings = self.embedding_model.encode(texts, show_progress_bar=True)

    def _compute_title_embeddings(self) -> None:
        titles = [a['title'] for a in self.articles]
        self.article_title_embeddings = self.embedding_model.encode(titles, show_progress_bar=True)

    def search(self, query: str, top_k: int = 5, category: str | None = None, title_weight: float = 0.5) -> list[dict]:
        """Search for similar articles using hybrid scoring (title + body), optionally filtered by category"""
        query_embedding = self.embedding_model.encode([query])[0]

        # カテゴリでフィルタリング
        if category:
            filtered_indices = [
                i for i, a in enumerate(self.articles)
                if a.get("category") == category
            ]
            if not filtered_indices:
                return []
            filtered_body_embeddings = self.article_embeddings[filtered_indices]
            filtered_title_embeddings = self.article_title_embeddings[filtered_indices]
        else:
            filtered_indices = list(range(len(self.articles)))
            filtered_body_embeddings = self.article_embeddings
            filtered_title_embeddings = self.article_title_embeddings

        # タイトル類似度
        title_similarities = np.dot(filtered_title_embeddings, query_embedding) / (
            np.linalg.norm(filtered_title_embeddings, axis=1) * np.linalg.norm(query_embedding)
        )

        # 本文類似度
        body_similarities = np.dot(filtered_body_embeddings, query_embedding) / (
            np.linalg.norm(filtered_body_embeddings, axis=1) * np.linalg.norm(query_embedding)
        )

        # ハイブリッドスコア（タイトル重視）
        similarities = title_weight * title_similarities + (1 - title_weight) * body_similarities

        top_k_filtered = min(top_k, len(filtered_indices))
        top_relative_indices = np.argsort(similarities)[::-1][:top_k_filtered]

        results = []
        for rel_idx in top_relative_indices:
            original_idx = filtered_indices[rel_idx]
            results.append({
                "article": self.articles[original_idx],
                "score": float(similarities[rel_idx]),
            })

        return results

    def _get_llm_client(self) -> LLMClient:
        """Get the current LLM client from settings manager"""
        return get_settings_manager().create_llm_client()

    def search_tickets(self, query: str, top_k: int = 3) -> list[dict]:
        """Search for similar tickets based on customer query.

        Returns tickets with their staff responses for use in indirect search.
        """
        if not self.tickets or self.ticket_embeddings is None:
            return []

        query_embedding = self.embedding_model.encode([query])[0]

        similarities = np.dot(self.ticket_embeddings, query_embedding) / (
            np.linalg.norm(self.ticket_embeddings, axis=1) * np.linalg.norm(query_embedding)
        )

        top_indices = np.argsort(similarities)[::-1][:top_k]

        results = []
        for idx in top_indices:
            ticket = self.tickets[idx]
            # スタッフの回答を取得（publicなもののみ）
            staff_responses = [
                c["body"] for c in ticket.get("comments", [])
                if c.get("is_staff") and c.get("public")
            ]
            if staff_responses:
                results.append({
                    "ticket_id": ticket.get("ticket_id"),
                    "subject": ticket.get("subject", ""),
                    "score": float(similarities[idx]),
                    "staff_response": staff_responses[0][:1000],  # 最初の回答を使用
                })

        return results

    def search_with_ticket_boost(
        self,
        query: str,
        top_k: int = 5,
        category: str | None = None,
        title_weight: float = 0.5,
        direct_weight: float = 0.6,
        indirect_weight: float = 0.4,
        ticket_top_k: int = 2,
    ) -> list[dict]:
        """Search for articles using both direct and indirect (ticket-based) search.

        Direct search: query → articles
        Indirect search: query → similar tickets → staff response → articles

        The final score combines both approaches with configurable weights.
        """
        # 1. 直接検索
        direct_results = self.search(query, top_k=top_k * 2, category=category, title_weight=title_weight)
        direct_scores = {r["article"]["url"]: r["score"] for r in direct_results}

        # 2. 間接検索（チケット経由）
        indirect_scores: dict[str, float] = {}
        similar_tickets = self.search_tickets(query, top_k=ticket_top_k)

        for ticket in similar_tickets:
            staff_response = ticket["staff_response"]
            # スタッフ回答で記事を検索
            indirect_results = self.search(staff_response, top_k=top_k, category=category, title_weight=title_weight)
            for r in indirect_results:
                url = r["article"]["url"]
                # チケットの類似度とFAQ類似度を掛け合わせてスコア計算
                combined_score = ticket["score"] * r["score"]
                if url in indirect_scores:
                    indirect_scores[url] = max(indirect_scores[url], combined_score)
                else:
                    indirect_scores[url] = combined_score

        # 3. スコア統合
        all_urls = set(direct_scores.keys()) | set(indirect_scores.keys())
        merged_results = []

        for url in all_urls:
            d_score = direct_scores.get(url, 0.0)
            i_score = indirect_scores.get(url, 0.0)
            final_score = direct_weight * d_score + indirect_weight * i_score

            # 記事データを取得
            article = next((r["article"] for r in direct_results if r["article"]["url"] == url), None)
            if article is None:
                # 間接検索のみでヒットした場合
                for ticket in similar_tickets:
                    indirect_results = self.search(ticket["staff_response"], top_k=top_k, category=category)
                    for r in indirect_results:
                        if r["article"]["url"] == url:
                            article = r["article"]
                            break
                    if article:
                        break

            if article:
                merged_results.append({
                    "article": article,
                    "score": final_score,
                    "direct_score": d_score,
                    "indirect_score": i_score,
                })

        # スコアでソートして上位を返す
        merged_results.sort(key=lambda x: x["score"], reverse=True)

        if similar_tickets:
            logger.info(f"[RAG] Ticket-boosted search: {len(similar_tickets)} tickets used, direct={len(direct_scores)}, indirect={len(indirect_scores)}, merged={len(merged_results)}")

        return merged_results[:top_k]

    def search_macros_with_ticket_boost(
        self,
        query: str,
        top_k: int = 2,
        category: str | None = None,
        direct_weight: float = 0.6,
        indirect_weight: float = 0.4,
        ticket_top_k: int = 2,
    ) -> list[dict]:
        """Search for macros using both direct and indirect (ticket-based) search."""
        # 1. 直接検索
        direct_results = self.search_macros(query, top_k=top_k * 2, category=category)
        direct_scores = {r["macro"]["macro_id"]: r["score"] for r in direct_results}

        # 2. 間接検索（チケット経由）
        indirect_scores: dict[int, float] = {}
        similar_tickets = self.search_tickets(query, top_k=ticket_top_k)

        for ticket in similar_tickets:
            staff_response = ticket["staff_response"]
            indirect_results = self.search_macros(staff_response, top_k=top_k, category=category)
            for r in indirect_results:
                macro_id = r["macro"]["macro_id"]
                combined_score = ticket["score"] * r["score"]
                if macro_id in indirect_scores:
                    indirect_scores[macro_id] = max(indirect_scores[macro_id], combined_score)
                else:
                    indirect_scores[macro_id] = combined_score

        # 3. スコア統合
        all_ids = set(direct_scores.keys()) | set(indirect_scores.keys())
        merged_results = []

        for macro_id in all_ids:
            d_score = direct_scores.get(macro_id, 0.0)
            i_score = indirect_scores.get(macro_id, 0.0)
            final_score = direct_weight * d_score + indirect_weight * i_score

            # マクロデータを取得
            macro = next((r["macro"] for r in direct_results if r["macro"]["macro_id"] == macro_id), None)
            if macro is None:
                for ticket in similar_tickets:
                    indirect_results = self.search_macros(ticket["staff_response"], top_k=top_k, category=category)
                    for r in indirect_results:
                        if r["macro"]["macro_id"] == macro_id:
                            macro = r["macro"]
                            break
                    if macro:
                        break

            if macro and final_score >= MACRO_SCORE_THRESHOLD:
                merged_results.append({
                    "macro": macro,
                    "score": final_score,
                })

        merged_results.sort(key=lambda x: x["score"], reverse=True)
        return merged_results[:top_k]

    def _get_violation_report_guidance(self, category: str | None) -> str:
        """Get violation report guidance text based on user's gender category"""
        if category == "男性会員の方":
            return """恐れ入りますが、下記より違反報告をお願いいたします。

[規約違反・不快な行為を受けた場合](https://XXX/hc/ja/articles/4404699982361)"""
        elif category == "女性会員の方":
            return """恐れ入りますが、下記より違反報告をお願いいたします。

[規約違反・不快な行為を受けた場合](https://XXX/hc/ja/articles/4404733309849)"""
        else:
            # カテゴリ不明の場合は両方案内
            return """恐れ入りますが、下記より違反報告をお願いいたします。

▼男性会員の方
[規約違反・不快な行為を受けた場合](https://XXX/hc/ja/articles/4404699982361)

▼女性会員の方
[規約違反・不快な行為を受けた場合](https://XXX/hc/ja/articles/4404733309849)"""

    def extract_search_query(self, user_query: str) -> str:
        """Extract the core search intent from user's query using LLM"""
        prompt = """ユーザーの問い合わせから、FAQ検索に使う簡潔なキーワードを抽出してください。

ルール：
1. ユーザーが「何について」知りたいかだけを抽出
2. 「いつ」「どこで」「どうやって」「誰に」は不要
3. 日時、地名、個人的な事情は全て除外
4. 15文字以内で出力

例：
「デートの時間を変更したいのですが、当日どうすればいいですか？」→ デートの時間変更
「場所と時間を変えてほしいです」→ デートの時間・場所変更
「退会したいです」→ 退会方法
「相手が来ませんでした」→ 相手が来ない

問い合わせ：
""" + user_query

        llm_client = self._get_llm_client()
        extracted = llm_client.generate(prompt, max_tokens=30).strip()
        return extracted

    def search_macros(self, query: str, top_k: int = 2, category: str | None = None) -> list[dict]:
        """Search for relevant macros, filtered by category/gender"""
        if not self.macros or self.macro_embeddings is None:
            return []

        query_embedding = self.embedding_model.encode([query])[0]

        # カテゴリから性別を判定
        gender = CATEGORY_TO_GENDER.get(category) if category else None

        # 性別でフィルタリング
        filtered_indices = []
        for i, m in enumerate(self.macros):
            macro_gender = m.get("chatbot_gender")
            # gender=None（未指定）の場合は全マクロ対象
            # gender指定の場合は、マクロがboth または 一致する性別のみ
            if gender is None:
                filtered_indices.append(i)
            elif macro_gender == "both" or macro_gender == gender:
                filtered_indices.append(i)

        if not filtered_indices:
            return []

        filtered_embeddings = self.macro_embeddings[filtered_indices]

        similarities = np.dot(filtered_embeddings, query_embedding) / (
            np.linalg.norm(filtered_embeddings, axis=1) * np.linalg.norm(query_embedding)
        )

        top_k_filtered = min(top_k, len(filtered_indices))
        top_relative_indices = np.argsort(similarities)[::-1][:top_k_filtered]

        results = []
        for rel_idx in top_relative_indices:
            original_idx = filtered_indices[rel_idx]
            score = float(similarities[rel_idx])
            if score >= MACRO_SCORE_THRESHOLD:
                results.append({
                    "macro": self.macros[original_idx],
                    "score": score,
                })

        return results

    @staticmethod
    def _build_article_context(context_articles: list[dict]) -> str:
        """Build reference article context block for system prompt."""
        parts = []
        for i, item in enumerate(context_articles, 1):
            article = item["article"]
            parts.append(
                f"---\n【参考記事{i}】\nタイトル: {article['title']}\n"
                f"URL: {article['url']}\n内容:\n{article['body_text'][:ARTICLE_BODY_MAX_CHARS]}\n---"
            )
        return "\n".join(parts)

    @staticmethod
    def _build_macro_context(context_macros: list[dict] | None) -> str:
        """Build reference macro context block for system prompt."""
        if not context_macros:
            return ""
        parts = ["\n【参考マクロ（返信テンプレート）】"]
        for i, item in enumerate(context_macros, 1):
            macro = item["macro"]
            parts.append(
                f"---\n【マクロ{i}】\nタイトル: {macro['title']}\n"
                f"返信テンプレート:\n{macro['comment_template'][:MACRO_TEMPLATE_MAX_CHARS]}\n---"
            )
        return "\n".join(parts)

    def _build_system_prompt(
        self,
        article_context: str,
        macro_context: str,
        category: str | None,
    ) -> str:
        """Build the full system prompt for answer generation."""
        rules_manager = get_rules_manager(self.settings)
        gender = CATEGORY_TO_GENDER.get(category) if category else None
        dynamic_rules = rules_manager.get_rules_for_prompt(gender=gender)

        return f"""あなたはXXXのカスタマーサポートアシスタントです。
お客様に寄り添った、温かみのある対応を心がけてください。

【最重要：用語の統一ルール】
1. 回答に使用する用語・表現は、提供された参考記事・参考マクロに実際に記載されているものに限定する
2. ユーザーが使用した用語と、参考記事・マクロの用語が異なる場合は、まず「◯◯についてのお問い合わせでよろしいでしょうか？」と確認した上で、公式の用語で回答する
3. 類似概念でも意味が異なる用語は混同しない（例：「退会」と「アカウント削除」は別概念として扱う）
4. 参考記事・マクロにない概念や手順を独自に創作・補完しない

【回答の基本ルール】
1. 提供された参考記事の情報のみを使って回答する
2. 参考マクロ（返信テンプレート）がある場合は、その文言や表現スタイルをそのまま取り入れる
3. 回答の最後に参考記事のタイトルとURLを記載する
4. 推測や補完は絶対に行わない
5. 操作手順を案内する際は、記事に記載されているナビゲーションパス（例：「マイページ ＞ ⚙️アカウント ＞ 退会・休会」）をそのまま引用する。記事にない画面名やメニュー名を創作しない

【自己解決と運営対応の切り分け】
- ヘルプ記事に手順が記載されている内容 → お客様自身で解決できる方法を案内
- 運営での対応が必要な内容（アカウント削除、個別対応が必要なケースなど） → 「この件につきましては、運営での対応が必要となりますため、お問い合わせフォームよりご連絡ください」と誘導
- 参考記事に該当する内容がない場合 →「ご不便をおかけして申し訳ございません。この件についてはリクエストフォームよりお問い合わせいただけますと幸いです。\n\n[お問い合わせフォームはこちら](https://XXX/hc/ja/requests/new)」と回答する

【違反報告の案内文（性別別）】
{self._get_violation_report_guidance(category)}

【分岐案内のルール】
- お客様の状況（会員種別・ステータス等）が特定できない場合は、該当する可能性のある全てのケースを網羅して案内する
- 分岐は「▼〇〇の場合」形式で整理し、それぞれの手順を明記する
- 情報量が多くなっても構わないので、正確性と網羅性を優先する
- 例：退会方法の問い合わせ → 正会員/休会中/審査不合格 それぞれの手順を案内
{dynamic_rules}
【文章トーンのガイドライン】
- 冒頭でお客様の状況への共感や理解を示す（例：「ご不便をおかけしております」「お問い合わせいただきありがとうございます」）
- クッション言葉を適切に使用する（例：「恐れ入りますが」「お手数ですが」「差し支えなければ」）
- 断定的・命令的な表現を避け、柔らかい依頼形を使う（例：「〜してください」→「〜いただけますと幸いです」「〜をお願いできますでしょうか」）
- 回答の最後に一言添える（例：「ご不明な点がございましたら、お気軽にお問い合わせください」）

【会話の継続性】
- これまでの会話履歴がある場合は、その文脈を踏まえて回答する
- ユーザーからの追加質問や確認には、前の回答との一貫性を保つ

【質問内容が不明確な場合】
- 意味を特定できない入力（例：「ああああ」）や、単語のみで内容が不明確な場合（例：「キャンセル」）は、推測で回答せず、必要な情報を明示して再入力を依頼する
- 以下のフォーマットで聞き返す：

お問い合わせありがとうございます。
内容を確認するため、恐れ入りますが、もう少し詳しく状況を教えていただけますでしょうか。

例：
・どのデートについてのご相談か
・いつのデートか
・ご希望の内容（キャンセル／変更／料金について など）

ご入力いただけましたら、内容を確認のうえご案内いたします。

【参考記事】
{article_context}
{macro_context}"""

    def generate_answer(
        self,
        query: str,
        context_articles: list[dict],
        context_macros: list[dict] | None = None,
        conversation_history: list[dict] | None = None,
        category: str | None = None,
    ) -> str:
        """Generate answer using LLM with conversation history support"""
        article_context = self._build_article_context(context_articles)
        macro_context = self._build_macro_context(context_macros)
        system_prompt = self._build_system_prompt(article_context, macro_context, category)

        llm_client = self._get_llm_client()

        if conversation_history:
            messages = conversation_history + [{"role": "user", "content": query}]
            return llm_client.generate_with_history(system_prompt, messages, max_tokens=LLM_ANSWER_MAX_TOKENS)
        else:
            prompt = system_prompt + f"\n\n【お客様からの質問】\n{query}\n\n【回答】"
            return llm_client.generate(prompt, max_tokens=LLM_ANSWER_MAX_TOKENS)

    def assess_quality(
        self,
        query: str,
        answer: str,
        context_articles: list[dict],
    ) -> QualityAssessment:
        """回答品質をAIで自己評価する"""
        # 参照したFAQタイトルのリスト
        faq_titles = [item["article"]["title"] for item in context_articles[:5]]
        faq_list = "\n".join(f"- {title}" for title in faq_titles) if faq_titles else "(なし)"

        assessment_prompt = f"""以下の回答品質を評価してください。

【お客様の質問】
{query}

【生成された回答】
{answer[:1500]}

【参照したFAQ（{len(context_articles)}件）】
{faq_list}

以下のJSON形式で評価してください。説明は不要です。JSONのみを出力してください。

{{
  "confidence_score": 0.0〜1.0の数値（回答の確信度。1.0=非常に高い、0.5=中程度、0.0=全く自信なし）,
  "information_completeness": "complete" | "partial" | "insufficient"のいずれか,
  "suggested_improvement": "改善提案がある場合のみ文字列、不要な場合はnull",
  "missing_topics": ["不足しているトピック1", "トピック2"] または []
}}

評価基準:
- confidence_score: FAQに該当する情報があり、質問に適切に回答できていれば高い。曖昧な回答や「お問い合わせください」系は低め。
- information_completeness: "complete"=質問に完全に回答、"partial"=一部のみ回答、"insufficient"=ほぼ回答できていない
- suggested_improvement: ヘルプ記事に追加すべき情報があれば具体的に記載
- missing_topics: 回答に含まれるべきだったがFAQに情報がなかったトピック"""

        llm_client = self._get_llm_client()
        try:
            response = llm_client.generate(assessment_prompt, max_tokens=500)
            # JSONをパース
            json_match = re.search(r'\{[\s\S]*\}', response)
            if json_match:
                data = json.loads(json_match.group())
                return QualityAssessment(
                    confidence_score=min(1.0, max(0.0, float(data.get("confidence_score", 0.5)))),
                    information_completeness=data.get("information_completeness", "partial"),
                    suggested_improvement=data.get("suggested_improvement"),
                    missing_topics=data.get("missing_topics", []),
                )
        except Exception as e:
            print(f"[RAG] Quality assessment failed: {e}")

        # デフォルト値を返す
        return QualityAssessment(
            confidence_score=0.5,
            information_completeness="partial",
            suggested_improvement=None,
            missing_topics=[],
        )

    def chat(
        self,
        query: str,
        top_k: int = 7,
        category: str | None = None,
        conversation_history: list[dict] | None = None,
        include_quality_assessment: bool = True,
    ) -> tuple[FAQChatResponse, QualityAssessment | None]:
        """Process a chat query and return response with sources and quality assessment"""
        # クエリから検索用キーワードを抽出
        search_query = self.extract_search_query(query)
        print(f"[RAG] Original query: {query[:50]}...")
        print(f"[RAG] Extracted search query: {search_query}")
        if conversation_history:
            print(f"[RAG] Conversation history: {len(conversation_history)} messages")

        # 記事検索（直接検索のみ - チケット情報は回答生成に使用しない）
        search_top_k = max(top_k * 3, 10)
        search_results = self.search(search_query, top_k=search_top_k, category=category)
        print(f"[RAG] Using direct search only (FAQ articles)")

        # マクロ検索（直接検索のみ）
        macro_results = self.search_macros(search_query, top_k=2, category=category)

        # 類似チケット検索（参考情報として表示用、回答生成には使用しない）
        similar_tickets = self.search_tickets(search_query, top_k=3)
        if similar_tickets:
            print(f"[RAG] Found {len(similar_tickets)} similar tickets for reference")

        # 回答生成（会話履歴とカテゴリを渡す）
        answer = self.generate_answer(query, search_results, macro_results, conversation_history, category)

        # 品質自己評価（オプション）
        quality_assessment = None
        if include_quality_assessment:
            quality_assessment = self.assess_quality(query, answer, search_results)
            print(f"[RAG] Quality: confidence={quality_assessment.confidence_score:.2f}, completeness={quality_assessment.information_completeness}")

        # タイトルで重複を除去し、最大3件に制限
        max_sources = 3
        seen_titles: set[str] = set()
        sources: list[FAQSource] = []
        for r in search_results:
            if len(sources) >= max_sources:
                break
            title = r["article"]["title"]
            if title not in seen_titles:
                seen_titles.add(title)
                sources.append(FAQSource(
                    title=title,
                    url=r["article"]["url"],
                    score=r["score"],
                ))

        referenced_macros = [
            FAQMacroRef(
                macro_id=r["macro"]["macro_id"],
                title=r["macro"]["title"],
                score=r["score"],
            )
            for r in macro_results
        ]

        # 類似チケットをレスポンス用に変換
        similar_ticket_refs = [
            SimilarTicketRef(
                ticket_id=t["ticket_id"],
                subject=t["subject"],
                score=t["score"],
            )
            for t in similar_tickets
        ]

        response = FAQChatResponse(
            answer=answer,
            sources=sources,
            referenced_macros=referenced_macros,
            similar_tickets=similar_ticket_refs,
        )
        return response, quality_assessment

    def get_article_count(self) -> int:
        return len(self.articles)

    def get_macro_count(self) -> int:
        return len(self.macros)
