"""Chat history state. Lakebase Postgres when LAKEBASE_DSN/psycopg are available, else
in-memory (BUILD-SPEC section 4: don't burn build minutes on grants - degrade gracefully).
All rows keyed by user_id captured from Databricks Apps forwarded headers."""
import os
import time
import uuid

_MEM: dict[str, list[dict]] = {}
_PG = None

DDL = """
CREATE TABLE IF NOT EXISTS genie_conversations (
  conversation_id text PRIMARY KEY, user_id text NOT NULL, title text,
  genie_conversation_id text, created_at timestamptz DEFAULT now());
CREATE TABLE IF NOT EXISTS genie_messages (
  id serial PRIMARY KEY, conversation_id text NOT NULL, role text NOT NULL,
  content text NOT NULL, created_at timestamptz DEFAULT now());
"""


def _pg():
    global _PG
    if _PG is not None:
        return _PG
    dsn = os.environ.get("LAKEBASE_DSN")
    if not dsn:
        _PG = False
        return False
    try:
        import psycopg
        conn = psycopg.connect(dsn, autocommit=True)
        with conn.cursor() as cur:
            cur.execute(DDL)
        _PG = conn
    except Exception:
        _PG = False
    return _PG


def list_conversations(user_id: str) -> list[dict]:
    pg = _pg()
    if pg:
        with pg.cursor() as cur:
            cur.execute("SELECT conversation_id, title, genie_conversation_id FROM genie_conversations "
                        "WHERE user_id=%s ORDER BY created_at DESC LIMIT 20", (user_id,))
            return [{"conversation_id": r[0], "title": r[1], "genie_conversation_id": r[2]}
                    for r in cur.fetchall()]
    return [{"conversation_id": k, "title": v[0]["content"][:48] if v else "Chat",
             "genie_conversation_id": next((m.get("genie_conversation_id") for m in v if m.get("genie_conversation_id")), None)}
            for k, v in _MEM.items() if k.startswith(user_id + ":")]


def new_conversation(user_id: str, title: str) -> str:
    cid = f"{user_id}:{uuid.uuid4().hex[:10]}"
    pg = _pg()
    if pg:
        with pg.cursor() as cur:
            cur.execute("INSERT INTO genie_conversations(conversation_id, user_id, title) VALUES (%s,%s,%s)",
                        (cid, user_id, title))
    _MEM.setdefault(cid, [])
    return cid


def add_message(cid: str, role: str, content: str, genie_conversation_id: str | None = None):
    pg = _pg()
    if pg:
        with pg.cursor() as cur:
            cur.execute("INSERT INTO genie_messages(conversation_id, role, content) VALUES (%s,%s,%s)",
                        (cid, role, content))
            if genie_conversation_id:
                cur.execute("UPDATE genie_conversations SET genie_conversation_id=%s WHERE conversation_id=%s",
                            (genie_conversation_id, cid))
    _MEM.setdefault(cid, []).append({"role": role, "content": content, "ts": time.time(),
                                     "genie_conversation_id": genie_conversation_id})


def get_messages(cid: str) -> list[dict]:
    pg = _pg()
    if pg:
        with pg.cursor() as cur:
            cur.execute("SELECT role, content FROM genie_messages WHERE conversation_id=%s ORDER BY id", (cid,))
            return [{"role": r[0], "content": r[1]} for r in cur.fetchall()]
    return [{"role": m["role"], "content": m["content"]} for m in _MEM.get(cid, [])]
