"""Genie MCP proxy (BUILD-SPEC section 1 'proven call pattern'): plain JSON-RPC over HTTP,
no MCP client or session init. Polling transport: genie_ask -> in_progress + IDs ->
genie_poll_response every 2-5s until completed."""
import os
import httpx

GENIE_MCP_URL = os.environ.get(
    "GENIE_MCP_URL", "https://fevm-serverless-9cefok.cloud.databricks.com/api/2.0/mcp/genie")


def _token(obo_token: str | None) -> str:
    if obo_token:
        return obo_token
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


def ask(question: str, conversation_id: str | None = None, obo_token: str | None = None) -> dict:
    args: dict = {"question": question}
    if conversation_id:
        args["conversation_id"] = conversation_id
    return _call("genie_ask", args, obo_token)


def poll(conversation_id: str, response_id: str, obo_token: str | None = None) -> dict:
    return _call("genie_poll_response",
                 {"conversation_id": conversation_id, "response_id": response_id}, obo_token)
