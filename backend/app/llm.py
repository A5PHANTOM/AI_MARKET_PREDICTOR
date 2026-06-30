import json
import os

from litellm import completion

MODEL = "openrouter/openai/gpt-oss-120b"
EXTRA_BODY = {"provider": {"order": ["cerebras"]}}

SYSTEM_PROMPT = """You are FinAlly, an AI trading assistant. You help users manage their simulated portfolio.

You can:
- Analyze portfolio composition, risk concentration, and P&L
- Suggest trades with reasoning
- Execute trades when the user asks or agrees
- Manage the watchlist proactively

Always respond with valid JSON in this exact schema:
{
  "message": "Your conversational response to the user",
  "trades": [
    {"ticker": "AAPL", "side": "buy", "quantity": 10}
  ],
  "watchlist_changes": [
    {"ticker": "PYPL", "action": "add"}
  ]
}

Be concise and data-driven. The "message" field is the conversational text shown to the user.
"trades" is an optional array of trades to auto-execute.
"watchlist_changes" is an optional array of watchlist modifications (action: "add" or "remove").
"""

MOCK_RESPONSE = {
    "message": "I've reviewed your portfolio. You have $10,000.00 in cash with no open positions. I suggest starting with a diversified approach. Consider buying AAPL and MSFT as core holdings. Let me know if you'd like me to execute any trades!",
    "trades": [],
    "watchlist_changes": [],
}


def _build_portfolio_context(cash: float, positions: list[dict], watchlist: list[str]) -> str:
    lines = ["Current Portfolio:", f"- Cash: ${cash:,.2f}"]
    if positions:
        for p in positions:
            lines.append(
                f"- {p['ticker']}: {p['quantity']} shares @ ${p['avg_cost']:.2f} avg, "
                f"current ${p.get('current_price', 0):.2f}, "
                f"P&L ${p.get('unrealized_pnl', 0):.2f} ({p.get('change_percent', 0):.2f}%)"
            )
    else:
        lines.append("- No open positions")
    lines.append(f"- Watchlist: {', '.join(watchlist)}")
    return "\n".join(lines)


def _parse_llm_response(raw: str) -> dict:
    cleaned = raw.strip()
    if cleaned.startswith("```json"):
        cleaned = cleaned[7:]
    if cleaned.startswith("```"):
        cleaned = cleaned[3:]
    if cleaned.endswith("```"):
        cleaned = cleaned[:-3]
    cleaned = cleaned.strip()

    try:
        parsed = json.loads(cleaned)
    except json.JSONDecodeError:
        return {
            "message": cleaned if cleaned else "I received your message but had trouble formatting my response.",
            "trades": [],
            "watchlist_changes": [],
        }

    return {
        "message": parsed.get("message", ""),
        "trades": parsed.get("trades", []),
        "watchlist_changes": parsed.get("watchlist_changes", []),
    }


async def call_llm(
    system_prompt: str | None = None,
    messages: list[dict] | None = None,
    portfolio_context: str | None = None,
) -> dict:
    if os.environ.get("LLM_MOCK", "").lower() == "true":
        return dict(MOCK_RESPONSE)

    system = system_prompt or SYSTEM_PROMPT
    history = messages or []

    full_messages = [{"role": "system", "content": system}]

    if portfolio_context:
        full_messages.append({"role": "system", "content": f"Portfolio Context:\n{portfolio_context}"})

    full_messages.extend(history)

    try:
        response = completion(
            model=MODEL,
            messages=full_messages,
            reasoning_effort="low",
            extra_body=EXTRA_BODY,
        )
        raw = response.choices[0].message.content
        return _parse_llm_response(raw)
    except Exception:
        return {
            "message": "I'm having trouble connecting to my AI service right now. Please try again later.",
            "trades": [],
            "watchlist_changes": [],
        }
