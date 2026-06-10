"""Genie MCP proxy (BUILD-SPEC section 1 'proven call pattern'): plain JSON-RPC over HTTP,
no MCP client or session init. Polling transport: genie_ask -> in_progress + IDs ->
genie_poll_response every 2-5s until completed."""
import os
import httpx

GENIE_MCP_URL = os.environ.get(
    "GENIE_MCP_URL", "https://fevm-serverless-9cefok.cloud.databricks.com/api/2.0/mcp/genie")


def _token(obo_token: str | None) -> str:
    """Auth chain (user directive): user's X-Forwarded-Access-Token first (captures the user),
    then the GENIE_PAT secret (downscoped OBO tokens 403 on the workspace MCP), then ambient."""
    if obo_token:
        return obo_token
    pat = os.environ.get("GENIE_PAT")
    if pat:
        return pat
    from .db import _ambient_config
    return _ambient_config().oauth_token().access_token


def _call(tool: str, args: dict, obo_token: str | None) -> dict:
    body = {"jsonrpc": "2.0", "id": 1, "method": "tools/call",
            "params": {"name": tool, "arguments": args}}
    headers = {"Authorization": f"Bearer {_token(obo_token)}",
               "Content-Type": "application/json",
               "Accept": "application/json, text/event-stream"}
    r = httpx.post(GENIE_MCP_URL, json=body, headers=headers, timeout=120)
    r.raise_for_status()
    out = r.json()["result"]
    sc = out.get("structuredContent") or {}
    text = "\n".join(c.get("text", "") for c in out.get("content", []) if c.get("type") == "text")
    return {"status": sc.get("status", "completed"),
            "conversation_id": sc.get("conversation_id"),
            "response_id": sc.get("response_id"),
            "deep_link": sc.get("deep_link"),
            "progress_steps": sc.get("progress_steps") or [],
            "final_answer": sc.get("final_answer"),
            "content": text}


GROUNDING = ("Answer strictly from the serverless_9cefok_catalog.monday_morning schema "
             "(CPG retail demo: fact_sales, fact_inventory, fact_store_traffic, fact_channel, "
             "fact_supply_chain, fact_experience, fact_category_market, fact_sales_weekly, "
             "dim_store, dim_product, dim_date; current month = 2025-12). Question: ")


def _call_resilient(tool: str, args: dict, obo_token: str | None) -> dict:
    """Use the user's forwarded token when the MCP accepts it; on 401/403 (tokens missing the
    `genie` scope are rejected by the workspace MCP) retry with the PAT/ambient chain.
    Annotates which credential leg served (`auth_leg`) for observability."""
    fallback_leg = "pat" if os.environ.get("GENIE_PAT") else "ambient-sp"
    try:
        res = _call(tool, args, obo_token)
        return {**res, "auth_leg": "user-obo" if obo_token else fallback_leg}
    except httpx.HTTPStatusError as e:
        if obo_token and e.response.status_code in (401, 403):
            return {**_call(tool, args, None), "auth_leg": f"{fallback_leg}-after-obo-403"}
        raise


def ask(question: str, conversation_id: str | None = None, obo_token: str | None = None) -> dict:
    # The workspace-level Genie MCP routes across all data the caller can see; ground the
    # first turn of every conversation so answers come from the Monday Morning schema.
    args: dict = {"question": question if conversation_id else GROUNDING + question}
    if conversation_id:
        args["conversation_id"] = conversation_id
    return _call_resilient("genie_ask", args, obo_token)


def poll(conversation_id: str, response_id: str, obo_token: str | None = None) -> dict:
    return _call_resilient("genie_poll_response",
                 {"conversation_id": conversation_id, "response_id": response_id}, obo_token)
