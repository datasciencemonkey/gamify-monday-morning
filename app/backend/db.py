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


@lru_cache(maxsize=1)
def _ambient_config() -> Config:
    if not os.environ.get("DATABRICKS_CLIENT_ID") and not os.environ.get("DATABRICKS_TOKEN"):
        os.environ.setdefault("DATABRICKS_CONFIG_PROFILE", "9cefok")
    return Config(host=HOST)


def _connect(obo_token: str | None):
    host = HOST.replace("https://", "")
    if obo_token:
        return dbsql.connect(server_hostname=host, http_path=HTTP_PATH, access_token=obo_token)
    cfg = _ambient_config()
    return dbsql.connect(server_hostname=host, http_path=HTTP_PATH,
                         credentials_provider=lambda: cfg.authenticate)


def q(query: str, obo_token: str | None = None, cache: bool = True) -> list[dict]:
    """Run a query (schema-qualified via {S}) and return list-of-dicts."""
    query = query.format(S=SCHEMA)
    if cache and query in _cache:
        return _cache[query]
    with _connect(obo_token) as conn, conn.cursor() as cur:
        cur.execute(query)
        cols = [c[0] for c in cur.description]
        rows = [dict(zip(cols, r)) for r in cur.fetchall()]
    if cache:
        with _lock:
            _cache[query] = rows
    return rows
