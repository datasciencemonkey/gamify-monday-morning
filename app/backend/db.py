"""Warehouse SQL access. Token strategy (BUILD-SPEC section 4): per-request OBO token from
X-Forwarded-Access-Token when present; otherwise ambient databricks-sdk Config (app SP in
Apps runtime, profile 9cefok locally). Results are cached in-process - the demo data is static."""
import os
import threading
from functools import lru_cache

from databricks import sql as dbsql
from databricks.sdk.core import Config

HOST = os.environ.get("DATABRICKS_HOST", "https://fevm-serverless-9cefok.cloud.databricks.com")
WAREHOUSE_ID = os.environ.get("WAREHOUSE_ID", "66fba25b212c4d4c")
HTTP_PATH = f"/sql/1.0/warehouses/{WAREHOUSE_ID}"
SCHEMA = os.environ.get("MM_SCHEMA", "serverless_9cefok_catalog.monday_morning")

_lock = threading.Lock()
_cache: dict[str, list[dict]] = {}
_token_lock = threading.Lock()
_token: dict = {"value": None, "expiry": 0.0}


@lru_cache(maxsize=1)
def _ambient_config() -> Config:
    if not os.environ.get("DATABRICKS_CLIENT_ID") and not os.environ.get("DATABRICKS_TOKEN"):
        os.environ.setdefault("DATABRICKS_CONFIG_PROFILE", "9cefok")
    return Config(host=HOST)


def ambient_token() -> str:
    """Serialized token acquisition: concurrent CLI `auth token --force-refresh` calls
    corrupt each other's cache (exit status 45), so fetch once under a lock and reuse
    until ~5 minutes before expiry."""
    import time
    with _token_lock:
        if _token["value"] and time.time() < _token["expiry"] - 300:
            return _token["value"]
        tok = _ambient_config().oauth_token()
        _token["value"] = tok.access_token
        expiry = getattr(tok, "expiry", None)
        _token["expiry"] = expiry.timestamp() if hasattr(expiry, "timestamp") else time.time() + 1800
        return _token["value"]


def _connect(obo_token: str | None):
    host = HOST.replace("https://", "")
    return dbsql.connect(server_hostname=host, http_path=HTTP_PATH,
                         access_token=obo_token or ambient_token())


def q(query: str, obo_token: str | None = None, cache: bool = True) -> list[dict]:
    """Run a query (schema-qualified via {S}) and return list-of-dicts. One retry on
    transient failures."""
    import time
    query = query.format(S=SCHEMA)
    if cache and query in _cache:
        return _cache[query]
    last: Exception | None = None
    for attempt in range(2):
        try:
            with _connect(obo_token) as conn, conn.cursor() as cur:
                cur.execute(query)
                cols = [c[0] for c in cur.description]
                rows = [dict(zip(cols, r)) for r in cur.fetchall()]
            if cache:
                with _lock:
                    _cache[query] = rows
            return rows
        except Exception as e:  # transient auth/connection hiccups
            last = e
            if attempt == 0:
                time.sleep(1.5)
    raise last  # type: ignore[misc]
