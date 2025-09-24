from typing import List, Union, Generator, Iterator, Optional, Dict, Any
from pprint import pprint
import time
from datetime import datetime
import json
import re

from openai import OpenAI
import requests


class Pipeline:
    """Пайплайн анализа повестки без вспомогательных классов."""

    def __init__(self):
        self.name = "SKAI"
        self.description = (
            "This is a pipeline that demonstrates how to use the status event."
        )
        self.debug = True
        self.version = "0.1.0"
        self.author = "Aubakirov Arman"

        # Конфигурация API (TODO: вынести ключи в переменные окружения)
        self._openai_api_key = "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"
        self._perplexity_api_key = "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"
        self._vnd_vector_store_id = "vs_68ca35e446f88191b4aaf4101e259c37"
        self._legal_vector_store_id = "vs_68ca362ea4208191b5724a0e7bb83b21"
        self._kz_sites = [
            "online.zakon.kz",
            "adilet.zan.kz",
            "stat.gov.kz",
            "kase.kz",
            "nationalbank.kz",
            "afm.gov.kz",
            "afsa.kz",
            "forbes.kz",
            "kursiv.media",
            "inbusiness.kz",
            "tengrinews.kz",
            "informburo.kz",
            "kapital.kz",
        ]

        self._openai_client = OpenAI(api_key=self._openai_api_key)

    async def on_shutdown(self):
        # This function is called when the server is shutdown.
        print(f"on_shutdown: {__name__}")

    async def inlet(self, body: dict, user: Optional[dict] = None) -> dict:
        # This function is called before the OpenAI API request is made.
        print(f"inlet: {__name__}")
        if self.debug:
            print(f"inlet: {__name__} - body:")
            pprint(body)
            print(f"inlet: {__name__} - user:")
            pprint(user)
        return body

    async def outlet(self, body: dict, user: Optional[dict] = None) -> dict:
        # This function is called after the OpenAI API response is completed.
        print(f"outlet: {__name__}")
        if self.debug:
            print(f"outlet: {__name__} - body:")
            pprint(body)
            print(f"outlet: {__name__} - user:")
            pprint(user)
        return body

    def pipe(
        self,
        user_message: str,
        model_id: str,
        messages: List[dict],
        body: dict,
    ) -> Union[str, Generator, Iterator]:
        agenda_text = ""
        for message in body.get("messages", []):
            content = str(message.get("content", ""))
            if "<context>" in content and "</context>" in content:
                agenda_text += content.split("<context>")[1].split("</context>")[0] + "\n"
                yield self._status_event("Context received")
            else:
                agenda_text += content

        # 1. Инициализация
        yield self._status_event("Инициализация аналитического пайплайна...")
        time.sleep(1)

        try:
            # 2. Препроцессинг
            yield self._status_event("Препроцессинг повестки дня...")
            summary_text = self._preprocess_agenda_text(agenda_text)
            time.sleep(1)

            # 3. Глобальный контекст и запросы
            yield self._status_event("Извлекаем глобальный контекст...")
            global_context = self._extract_global_context(summary_text)
            time.sleep(1)

            yield self._status_event("Формируем запросы для агентов...")
            global_queries = self._generate_global_agent_queries(summary_text, global_context)
            time.sleep(1)

            analyses: Dict[str, Any] = {}

            # 4. Анализ внутренних документов
            yield self._status_event("Анализ внутренних документов (ВНД)...")
            vnd_payload = f"{global_queries['vnd_query']}\n\nКонтекст:\n{summary_text}"
            analyses["internal_docs"] = self._analyze_internal_compliance(vnd_payload)
            time.sleep(1)

            # 5. Правовой анализ
            yield self._status_event("Правовой анализ (законодательство РК)...")
            legal_payload = f"{global_queries['legal_query']}\n\nКонтекст:\n{summary_text}"
            analyses["legal"] = self._analyze_legal_compliance(legal_payload)
            time.sleep(1)

            # 6. Веб-поиск и репутационный анализ
            yield self._status_event("Веб-поиск и репутационный анализ...")
            web_payload = f"{global_queries['web_query']} {summary_text[:500]}"
            analyses["web_search"] = self._analyze_public_reaction(web_payload)
            time.sleep(1)

            # 7. Синтез решения
            yield self._status_event("Синтезируем решение виртуального директора...")
            overall_item = {
                "number": "-",
                "title": "Итоговый анализ повестки",
                "full_text": summary_text,
            }
            decision_result = self._synthesize_decision(overall_item, analyses)
            time.sleep(1)

            result_entry = {
                "item": overall_item,
                "analyses": analyses,
                "decision": decision_result["decision"],
                "reasoning": decision_result["reasoning"],
                "risks": decision_result["risks"],
                "recommendations": decision_result["recommendations"],
            }

            analysis_result = {
                "timestamp": datetime.now().isoformat(),
                "agenda_items_count": 1,
                "results": [result_entry],
                "summary": self._generate_summary([result_entry]),
                "global_analyses": analyses,
                "summary_text": summary_text,
                "global_queries": global_queries,
            }

            # 8. Формирование отчета
            yield self._status_event("Анализ завершен. Формируем отчет...")
            time.sleep(1)
            report = self._generate_readable_report(analysis_result)

            yield self._status_event("Отчет сформирован успешно.")
            time.sleep(1)
            yield report
        except Exception as exc:
            error_message = f"Ошибка анализа повестки: {exc}"
            yield self._status_event(error_message)
            time.sleep(1)
            yield error_message
        finally:
            yield self._status_event("")

    def _status_event(self, description: str) -> Dict[str, Any]:
        return {
            "event": {
                "type": "status",
                "data": {
                    "description": description,
                    "done": True,
                },
            }
        }

    def _search_internal_documents(self, query: str, max_results: int = 5) -> Dict[str, Any]:
        try:
            response = self._openai_client.responses.create(
                model="gpt-4o",
                input=query,
                tools=[{
                    "type": "file_search",
                    "vector_store_ids": [self._vnd_vector_store_id],
                    "max_num_results": max_results,
                }],
            )
            return {
                "status": "success",
                "query": query,
                "response": response.output_text,
                "source": "internal_documents",
                "agent": "VND",
            }
        except Exception as exc:
            return {
                "status": "error",
                "query": query,
                "error": str(exc),
                "source": "internal_documents",
                "agent": "VND",
            }

    def _analyze_internal_compliance(self, agenda_item: str) -> Dict[str, Any]:
        query = f"""
        Проанализируйте следующий пункт повестки дня на соответствие внутренним \n        документам компании:\n\n        {agenda_item}\n\n        Необходимо проверить:\n        - Соответствие внутренним политикам и процедурам\n        - Требования к процессу принятия решений\n        - Полномочия органов управления\n        - Возможные ограничения или требования\n        """
        return self._search_internal_documents(query, max_results=8)

    def _search_legal_documents(self, query: str, max_results: int = 5) -> Dict[str, Any]:
        try:
            response = self._openai_client.responses.create(
                model="gpt-4o",
                input=query,
                tools=[{
                    "type": "file_search",
                    "vector_store_ids": [self._legal_vector_store_id],
                    "max_num_results": max_results,
                }],
            )
            return {
                "status": "success",
                "query": query,
                "response": response.output_text,
                "source": "legal_documents",
                "agent": "Legal",
            }
        except Exception as exc:
            return {
                "status": "error",
                "query": query,
                "error": str(exc),
                "source": "legal_documents",
                "agent": "Legal",
            }

    def _analyze_legal_compliance(self, agenda_item: str) -> Dict[str, Any]:
        query = f"""
        Проведите правовой анализ следующего пункта повестки дня:\n\n        {agenda_item}\n\n        Необходимо проверить:\n        - Соответствие действующему законодательству РК\n        - Требования к процедуре принятия решения\n        - Необходимые согласования и разрешения\n        - Правовые риски и ограничения\n        - Ответственность за нарушения\n        """
        return self._search_legal_documents(query, max_results=8)

    def _search_with_perplexity(self, query: str) -> Dict[str, Any]:
        try:
            headers = {
                "Authorization": f"Bearer {self._perplexity_api_key}",
                "Content-Type": "application/json",
            }
            data = {
                "model": "sonar-pro",
                "messages": [
                    {
                        "role": "user",
                        "content": f"""
                        Найдите актуальную информацию по запросу: {query}\n\n                        Сосредоточьтесь на:\n                        - Новостях и событиях в Казахстане\n                        - Официальных заявлениях и документах\n                        - Экономических и финансовых данных\n                        - Репутационных аспектах\n                        - Мнениях экспертов и аналитиков\n\n                        Предоставьте структурированный ответ с указанием источников.
                        """,
                    }
                ],
                "search_domain_filter": self._kz_sites,
            }
            response = requests.post(
                "https://api.perplexity.ai/chat/completions",
                headers=headers,
                json=data,
                timeout=30,
            )
            if response.status_code == 200:
                result = response.json()
                content = result["choices"][0]["message"]["content"]
                return {
                    "status": "success",
                    "query": query,
                    "response": content,
                    "source": "web_search_perplexity",
                    "agent": "WebSearch",
                }
            return self._web_fallback_search(query)
        except Exception:
            return self._web_fallback_search(query)

    def _web_fallback_search(self, query: str) -> Dict[str, Any]:
        try:
            response = self._openai_client.responses.create(
                model="gpt-4o",
                input=f"""
                Найдите актуальную информацию в интернете по запросу: {query}\n\n                Особое внимание уделите:\n                - Казахстанским источникам и контексту\n                - Новостям за последние месяцы\n                - Официальным заявлениям\n                - Репутационным рискам или возможностям\n                - Экспертным оценкам\n\n                Сосредоточьтесь на поиске информации с казахстанских сайтов: {', '.join(self._kz_sites)}
                """,
                tools=[{"type": "web_search_preview"}],
            )
            return {
                "status": "success",
                "query": query,
                "response": response.output_text,
                "source": "web_search_responses_api",
                "agent": "WebSearch",
            }
        except Exception as exc:
            return {
                "status": "error",
                "query": query,
                "error": str(exc),
                "source": "web_search_fallback",
                "agent": "WebSearch",
            }

    def _analyze_public_reaction(self, agenda_item: str) -> Dict[str, Any]:
        query = f"""
        Проанализируйте возможную общественную и медийную реакцию на следующее решение:\n\n        {agenda_item}\n\n        Найдите:\n        - Похожие случаи и реакцию на них\n        - Мнения экспертов по подобным вопросам\n        - Потенциальные репутационные риски\n        - Общественное мнение по теме\n        - Рекомендации по коммуникации\n        """
        return self._search_with_perplexity(query)

    def _parse_agenda(self, agenda_text: str) -> List[Dict[str, str]]:
        agenda_items: List[Dict[str, str]] = []
        pattern = r"(\d+)\.\s*([^\n]+(?:\n(?!\d+\.)[^\n]*)*)"
        matches = re.findall(pattern, agenda_text, re.MULTILINE)
        for number, raw_text in matches:
            item_text = raw_text.strip()
            agenda_items.append(
                {
                    "number": number,
                    "title": item_text.split("\n")[0],
                    "full_text": item_text,
                    "description": item_text,
                }
            )
        if not agenda_items:
            paragraphs = [p.strip() for p in agenda_text.split("\n\n") if p.strip()]
            for idx, paragraph in enumerate(paragraphs, 1):
                agenda_items.append(
                    {
                        "number": str(idx),
                        "title": paragraph[:100] + "..." if len(paragraph) > 100 else paragraph,
                        "full_text": paragraph,
                        "description": paragraph,
                    }
                )
        return agenda_items

    def _preprocess_agenda_text(self, raw_text: str) -> str:
        system_prompt = (
            "Вы — редактор повесток дня. Преобразуйте входной документ в чистый список пунктов. "
            "Верните ТОЛЬКО текст без пояснений и без кодовых блоков. Формат: каждый пункт начинается с 'N. ' (1., 2., 3., ...), "
            "первая строка — краткий заголовок, затем (при наличии) последующие строки с деталями до следующего номера. "
            "Удалите нерелевантные блоки (шапки, подписи, приложения, служебные таблицы). Сохраните существенные формулировки."
        )
        base_text = raw_text.replace("\r\n", "\n").replace("\r", "\n")
        user_prompt = (
            "Исходный текст повестки ниже. Преобразуйте его согласно требованиям.\n\n" + base_text
        )
        last_error: Optional[Exception] = None
        for _ in range(3):
            try:
                resp = self._openai_client.responses.create(
                    model="gpt-4o",
                    input=[
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": user_prompt},
                    ],
                )
                out_text = (resp.output_text or "").strip()
                if out_text.startswith("```") and out_text.endswith("```"):
                    out_text = out_text.strip("`").strip()
                if not re.search(r"^\d+\.\s+", out_text, flags=re.MULTILINE):
                    last_error = ValueError("Результат не содержит нумерованных пунктов 'N.'")
                    continue
                numbers = [
                    int(match.group(1))
                    for match in re.finditer(r"^(\d+)\.\s+", out_text, flags=re.MULTILINE)
                ]
                if numbers and numbers[0] != 1:
                    last_error = ValueError("Нумерация не начинается с 1.")
                    continue
                return out_text
            except Exception as exc:
                last_error = exc
        raise RuntimeError(f"Не удалось препроцессировать повестку через gpt-4o: {last_error}")

    def _generate_global_agent_queries(
        self,
        agenda_text: str,
        global_context: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, str]:
        gc = global_context or {
            "companies": [],
            "amounts": [],
            "topics": [],
            "total_items": 0,
        }
        system_prompt = (
            "Вы — помощник виртуального директора. На основе ПОЛНОГО текста повестки дня сформируйте три "
            "самодостаточных запроса для подагентов: vnd_query, legal_query, web_query. Ответ СТРОГО JSON."
        )
        user_prompt = (
            f"Глобальный контекст — Компании: {', '.join(gc.get('companies', [])[:15]) or '-'}; "
            f"Темы: {', '.join(gc.get('topics', [])[:15]) or '-'}; Всего пунктов: {gc.get('total_items', 0)}.\n\n"
            "Полный текст повестки ниже. Используйте его целиком для формирования ТРЁХ запросов:\n\n"
            + agenda_text
        )
        last_error: Optional[Exception] = None
        for _ in range(3):
            try:
                resp = self._openai_client.responses.create(
                    model="gpt-4o",
                    input=[
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": user_prompt},
                    ],
                )
                raw = (resp.output_text or "").strip()
                parsed: Optional[Dict[str, Any]] = None
                try:
                    parsed = json.loads(raw)
                except Exception:
                    match = re.search(r"\{[\s\S]*\}", raw)
                    if match:
                        try:
                            parsed = json.loads(match.group(0))
                        except Exception:
                            parsed = None
                if not isinstance(parsed, dict):
                    last_error = ValueError("Ответ не JSON")
                    continue
                vnd_query = str(parsed.get("vnd_query") or "").strip()
                legal_query = str(parsed.get("legal_query") or "").strip()
                web_query = str(parsed.get("web_query") or "").strip()
                if not (vnd_query and legal_query and web_query):
                    last_error = ValueError(
                        "Отсутствуют обязательные ключи vnd_query/legal_query/web_query"
                    )
                    continue
                return {
                    "vnd_query": vnd_query,
                    "legal_query": legal_query,
                    "web_query": web_query,
                }
            except Exception as exc:
                last_error = exc
        raise RuntimeError(
            f"Не удалось сгенерировать глобальные запросы gpt-4o: {last_error}"
        )

    def _format_analysis_result(self, result: Dict[str, Any]) -> str:
        if result.get("status") == "error":
            return f"ОШИБКА: {result.get('error', 'Неизвестная ошибка')}"
        if result.get("status") == "success":
            return result.get("response", "Нет данных")
        return "Анализ не выполнен"

    def _extract_global_context(self, agenda_text: str) -> Dict[str, Any]:
        try:
            companies_quoted = re.findall(r'[«"]([^"»]{3,})[»"]', agenda_text)
            amounts = re.findall(
                r"(\d{1,3}(?:[\s,]\d{3})*(?:[.,]\d+)?\s*(?:млрд|млн|тыс)?\s*тенге)",
                agenda_text,
                flags=re.IGNORECASE,
            )
            topics: List[str] = []
            topic_keywords = [
                "бюджет",
                "крупная сделка",
                "приобретение",
                "назначение",
                "дивиденды",
                "займ",
                "кредит",
                "облигации",
                "капзатраты",
                "закуп",
                "реорганизация",
                "аудит",
                "стратегия",
            ]
            lower_text = agenda_text.lower()
            for keyword in topic_keywords:
                if keyword in lower_text:
                    topics.append(keyword)
            return {
                "companies": sorted(
                    {
                        company.strip()
                        for company in companies_quoted
                        if 2 <= len(company.strip().split()) <= 6
                    }
                )[:20],
                "amounts": amounts[:10],
                "topics": topics[:10],
                "total_items": len(self._parse_agenda(agenda_text)),
            }
        except Exception:
            return {"companies": [], "amounts": [], "topics": [], "total_items": 0}

    def _synthesize_decision(
        self,
        item: Dict[str, str],
        analyses: Dict[str, Any],
    ) -> Dict[str, Any]:
        context = f"""
        ПУНКТ ПОВЕСТКИ ДНЯ:
        {item['full_text']}

        АНАЛИЗ ВНУТРЕННИХ ДОКУМЕНТОВ:
        {self._format_analysis_result(analyses.get('internal_docs', {}))}

        ПРАВОВОЙ АНАЛИЗ:
        {self._format_analysis_result(analyses.get('legal', {}))}

        ВЕБ-ПОИСК И РЕПУТАЦИОННЫЙ АНАЛИЗ:
        {self._format_analysis_result(analyses.get('web_search', {}))}
        """
        if analyses.get("global_internal_docs"):
            context += (
                "\nГЛОБАЛЬНЫЙ АНАЛИЗ ВНД (по всей повестке):\n"
                f"{self._format_analysis_result(analyses['global_internal_docs'])}\n"
            )
        if analyses.get("global_legal"):
            context += (
                "\nГЛОБАЛЬНЫЙ ПРАВОВОЙ АНАЛИЗ (по всей повестке):\n"
                f"{self._format_analysis_result(analyses['global_legal'])}\n"
            )
        if analyses.get("global_web_search"):
            context += (
                "\nГЛОБАЛЬНЫЙ ВЕБ-АНАЛИЗ (по всей повестке):\n"
                f"{self._format_analysis_result(analyses['global_web_search'])}\n"
            )
        try:
            response = self._openai_client.responses.create(
                model="gpt-4o",
                instructions="""
                        Вы — виртуальный директор, член Совета директоров АО «Самрук-Казына».
                        Ваша задача — принять взвешенное решение по пункту повестки дня на основе
                        предоставленных анализов.

                        ПРИНЦИПЫ ПРИНЯТИЯ РЕШЕНИЙ:
                        1. Соблюдение законодательства — приоритет №1
                        2. Соответствие внутренним политикам компании
                        3. Минимизация репутационных рисков
                        4. Экономическая целесообразность
                        5. Прозрачность и подотчетность

                        ФОРМАТ ОТВЕТА:
                        Решение: ЗА/ПРОТИВ
                        Обоснование: [детальное обоснование с ссылками на источники]
                        Риски: [выявленные риски]
                        Рекомендации: [рекомендации по реализации или доработке]

                        Будьте объективны, консервативны в оценке рисков, и всегда ссылайтесь
                        на конкретные источники информации.
                        """,
                input=f"""
                        Проанализируйте следующую информацию и примите решение:

                        {context}

                        Примите решение ЗА или ПРОТИВ данного пункта повестки и дайте
                        подробное обоснование.
                        """
            )
            response_text = response.output_text
            decision_match = re.search(r"Решение:\s*(ЗА|ПРОТИВ)", response_text, re.IGNORECASE)
            decision = decision_match.group(1) if decision_match else "ВОЗДЕРЖАЛСЯ"
            reasoning_match = re.search(
                r"Обоснование:\s*(.*?)(?=Риски:|$)", response_text, re.DOTALL | re.IGNORECASE
            )
            reasoning = reasoning_match.group(1).strip() if reasoning_match else response_text
            risks_match = re.search(
                r"Риски:\s*(.*?)(?=Рекомендации:|$)", response_text, re.DOTALL | re.IGNORECASE
            )
            risks = risks_match.group(1).strip() if risks_match else "Не выявлены"
            recommendations_match = re.search(
                r"Рекомендации:\s*(.*?)$",
                response_text,
                re.DOTALL | re.IGNORECASE,
            )
            recommendations = (
                recommendations_match.group(1).strip()
                if recommendations_match
                else "Нет дополнительных рекомендаций"
            )
            return {
                "decision": decision,
                "reasoning": reasoning,
                "risks": risks,
                "recommendations": recommendations,
                "full_response": response_text,
            }
        except Exception as exc:
            return {
                "decision": "ВОЗДЕРЖАЛСЯ",
                "reasoning": f"Не удалось принять решение из-за технической ошибки: {exc}",
                "risks": "Технические риски при анализе",
                "recommendations": "Требуется повторный анализ",
                "full_response": "",
            }

    def _generate_summary(self, results: List[Dict[str, Any]]) -> Dict[str, Any]:
        total_items = len(results)
        decisions = [result["decision"] for result in results]
        za_count = decisions.count("ЗА")
        protiv_count = decisions.count("ПРОТИВ")
        vozderzhalos_count = decisions.count("ВОЗДЕРЖАЛСЯ")
        return {
            "total_items": total_items,
            "decisions_summary": {
                "ЗА": za_count,
                "ПРОТИВ": protiv_count,
                "ВОЗДЕРЖАЛСЯ": vozderzhalos_count,
            },
            "approval_rate": za_count / total_items if total_items > 0 else 0,
            "high_risk_items": [
                result["item"]["number"]
                for result in results
                if "высокий риск" in result.get("risks", "").lower()
                or "критический" in result.get("risks", "").lower()
            ],
        }

    def _generate_readable_report(self, analysis_result: Dict[str, Any]) -> str:
        report_lines = [
            "=" * 80,
            "SKAI — независимый (цифровой) член СД",
            "Анализ повестки дня Совета директоров АО «Самрук-Казына»",
            "=" * 80,
            f"Дата анализа: {analysis_result['timestamp']}",
            f"Количество пунктов: {analysis_result['agenda_items_count']}",
            "",
            "СВОДКА РЕШЕНИЙ:",
            f"• ЗА: {analysis_result['summary']['decisions_summary']['ЗА']}",
            f"• ПРОТИВ: {analysis_result['summary']['decisions_summary']['ПРОТИВ']}",
            f"• ВОЗДЕРЖАЛСЯ: {analysis_result['summary']['decisions_summary']['ВОЗДЕРЖАЛСЯ']}",
            f"• Процент одобрения: {analysis_result['summary']['approval_rate']:.1%}",
            "",
            "=" * 80,
            "ДЕТАЛЬНЫЙ АНАЛИЗ ПО ПУНКТАМ",
            "=" * 80,
            "",
        ]
        for result in analysis_result["results"]:
            item = result["item"]
            report_lines.extend(
                [
                    f"ПУНКТ {item['number']}: {item['title']}",
                    "-" * 60,
                    f"РЕШЕНИЕ: {result['decision']}",
                    "",
                    f"ОБОСНОВАНИЕ (по вопросу №{item['number']} повестки — {item['title']}):",
                    result["reasoning"],
                    "",
                    "ВЫЯВЛЕННЫЕ РИСКИ:",
                    result["risks"],
                    "",
                    "РЕКОМЕНДАЦИИ:",
                    result["recommendations"],
                    "",
                    "=" * 80,
                    "",
                ]
            )
        return "\n".join(report_lines)
