"""
Ticket RAG Service - Internal support tool for finding similar resolved tickets
"""

import json
import numpy as np
from pathlib import Path
from sentence_transformers import SentenceTransformer
from typing import Optional

from ..config import Settings
from ..models.schemas import TicketSource, MacroSuggestion, InternalChatResponse
from .settings_manager import get_settings_manager
from .llm_client import LLMClient


class TicketRAGService:
    """Singleton service for ticket RAG"""

    _instance: Optional["TicketRAGService"] = None

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

        print("Loading ticket data...")
        with open(settings.get_tickets_path(), "r", encoding="utf-8") as f:
            self.tickets = json.load(f)

        embeddings_path = Path(settings.get_ticket_embeddings_path())
        if embeddings_path.exists():
            print(f"Loading pre-computed embeddings: {embeddings_path}")
            self.ticket_embeddings = np.load(embeddings_path)
            if len(self.ticket_embeddings) != len(self.tickets):
                print("WARNING: Embedding count mismatch, recomputing...")
                self._compute_embeddings()
        else:
            print("Computing embeddings...")
            self._compute_embeddings()

        # 内部サポート用マクロの読み込み（全マクロ対象）
        self.macros = []
        self.macro_embeddings = None
        internal_macros_path = Path(settings.get_internal_macros_path())
        internal_macro_embeddings_path = Path(settings.get_internal_macro_embeddings_path())

        if internal_macros_path.exists() and internal_macro_embeddings_path.exists():
            print("Loading internal macro data...")
            with open(internal_macros_path, "r", encoding="utf-8") as f:
                self.macros = json.load(f)
            self.macro_embeddings = np.load(internal_macro_embeddings_path)
            print(f"  -> {len(self.macros)} internal macros loaded")
        else:
            print("Internal macro data not found, skipping macro suggestions")

        self._initialized = True
        print(f"Ticket RAG ready! ({len(self.tickets)} tickets)")

    def _prepare_texts(self) -> list[str]:
        """Prepare search texts from tickets"""
        texts = []
        for ticket in self.tickets:
            customer_messages = [
                c["body"] for c in ticket["comments"]
                if not c["is_staff"] and c["public"]
            ]
            question = ticket.get("subject", "")
            if customer_messages:
                question += "\n" + "\n".join(customer_messages[:2])
            tags = " ".join(ticket.get("tags", []))
            texts.append(f"{question}\n{tags}")
        return texts

    def _compute_embeddings(self) -> None:
        texts = self._prepare_texts()
        self.ticket_embeddings = self.embedding_model.encode(texts, show_progress_bar=True)

    def search(self, query: str, top_k: int = 5, include_internal: bool = True) -> list[dict]:
        """Search for similar tickets"""
        query_embedding = self.embedding_model.encode([query])[0]

        similarities = np.dot(self.ticket_embeddings, query_embedding) / (
            np.linalg.norm(self.ticket_embeddings, axis=1) * np.linalg.norm(query_embedding)
        )

        top_indices = np.argsort(similarities)[::-1][:top_k]

        results = []
        for idx in top_indices:
            ticket = self.tickets[idx]

            if include_internal:
                comments = ticket["comments"]
            else:
                comments = [c for c in ticket["comments"] if c["public"]]

            customer_comments = [c for c in comments if not c["is_staff"]]
            staff_comments = [c for c in comments if c["is_staff"]]

            results.append({
                "ticket_id": ticket["ticket_id"],
                "subject": ticket["subject"],
                "url": ticket["url"],
                "tags": ticket["tags"],
                "score": float(similarities[idx]),
                "customer_query": customer_comments[0]["body"] if customer_comments else "",
                "staff_responses": [
                    {
                        "body": c["body"],
                        "public": c["public"],
                    }
                    for c in staff_comments
                ],
            })

        return results

    def search_macros(self, query: str, top_k: int = 3, min_score: float = 0.5) -> list[dict]:
        """Search for similar macros"""
        if not self.macros or self.macro_embeddings is None:
            return []

        query_embedding = self.embedding_model.encode([query])[0]

        similarities = np.dot(self.macro_embeddings, query_embedding) / (
            np.linalg.norm(self.macro_embeddings, axis=1) * np.linalg.norm(query_embedding)
        )

        # Filter by minimum score and get top_k
        top_indices = np.argsort(similarities)[::-1]
        results = []

        for idx in top_indices:
            score = float(similarities[idx])
            if score < min_score:
                break
            if len(results) >= top_k:
                break

            macro = self.macros[idx]
            results.append({
                "macro_id": macro["macro_id"],
                "title": macro["title"],
                "score": score,
                "comment_template": macro["comment_template"],
            })

        return results

    def _get_llm_client(self) -> LLMClient:
        """Get the current LLM client from settings manager"""
        return get_settings_manager().create_llm_client()

    def generate_answer(self, query: str, search_results: list[dict]) -> str:
        """Generate response suggestion using LLM"""
        context = ""
        for i, result in enumerate(search_results, 1):
            context += f"""
---
【参考チケット{i}】
件名: {result['subject']}
URL: {result['url']}
類似度: {result['score']:.1%}

顧客からの問い合わせ:
{result['customer_query'][:800]}

スタッフの対応:
"""
            for resp in result["staff_responses"][:2]:
                visibility = "【公開返信】" if resp["public"] else "【内部メモ】"
                context += f"\n{visibility}\n{resp['body'][:800]}\n"
            context += "---\n"

        prompt = f"""あなたはXXXのカスタマーサポート担当者向けのアシスタントです。
お客様からの問い合わせに対する「対応案」を提示してください。

以下のルールに従ってください：
1. 過去の類似チケットの対応を参考に、適切な対応案を提示する
2. 対応案はそのまま顧客に送れる形式で記載する
3. 過去の対応で使われた定型文やテンプレートがあれば活用する
4. 必要に応じて確認事項や注意点も記載する
5. 推測や不確かな情報は含めない
6. 対応文の冒頭の宛名は「[NAME] 様」とし、本文中では「[NAME] 様」ではなく「お客様」を使用する
7. リンクはMarkdown形式で埋め込む（例：「[こちら](https://example.com)」）。「こちら」等の文言には必ず該当URLを埋め込むこと
8. 顧客への返信文は必ずコードブロック（```）で囲む。注意点や確認事項はコードブロックの外に記載する

【過去の類似チケット】
{context}

【今回のお客様からの問い合わせ】
{query}

【対応案】"""

        llm_client = self._get_llm_client()
        return llm_client.generate(prompt, max_tokens=1500)

    def chat(self, query: str, top_k: int = 3) -> InternalChatResponse:
        """Process a query and return response suggestion with sources"""
        search_results = self.search(query, top_k=top_k, include_internal=True)
        answer = self.generate_answer(query, search_results)

        sources = [
            TicketSource(
                ticket_id=r["ticket_id"],
                subject=r["subject"],
                url=r["url"],
                score=r["score"],
            )
            for r in search_results
        ]

        # Search for similar macros
        macro_results = self.search_macros(query, top_k=3, min_score=0.5)
        suggested_macros = [
            MacroSuggestion(
                macro_id=r["macro_id"],
                title=r["title"],
                score=r["score"],
                comment_template=r["comment_template"],
            )
            for r in macro_results
        ]

        return InternalChatResponse(
            answer=answer,
            sources=sources,
            suggested_macros=suggested_macros,
        )

    def get_ticket_count(self) -> int:
        return len(self.tickets)
