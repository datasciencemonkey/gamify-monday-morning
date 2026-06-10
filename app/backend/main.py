"""Monday Morning - FastAPI backend + static host (Databricks Apps)."""
import os
from fastapi import FastAPI, Request, Query
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

from . import metrics, genie, state

app = FastAPI(title="Monday Morning API")
STATIC = os.path.join(os.path.dirname(__file__), "..", "static")


@app.on_event("startup")
def warm_cache():
    """Prefetch every dashboard query so first paint serves from cache (demo-fast)."""
    import threading

    def _warm():
        for fn in (metrics.exec_kpis, metrics.trend, metrics.category_sales,
                   metrics.category_kpis, metrics.movers, metrics.secondary,
                   metrics.inventory, metrics.drilldown, metrics.brief):
            try:
                fn()
            except Exception:
                pass
        for c in ("Food Storage", "Shoe Care", "Home Cleaning", "Air Care", "Pest Control"):
            try:
                metrics.store_comparison("category", c)
            except Exception:
                pass

    threading.Thread(target=_warm, daemon=True).start()


def _tok(req: Request) -> str | None:
    return req.headers.get("x-forwarded-access-token")


def _user(req: Request) -> str:
    return req.headers.get("x-forwarded-email") or req.headers.get("x-forwarded-user") or "local-dev"


@app.get("/api/health")
def health():
    return {"ok": True}


@app.get("/api/metrics/exec-kpis")
def exec_kpis(req: Request):
    return metrics.exec_kpis(_tok(req))


@app.get("/api/metrics/trend")
def trend(req: Request):
    return metrics.trend(_tok(req))


@app.get("/api/metrics/category-sales")
def category_sales(req: Request):
    return metrics.category_sales(_tok(req))


@app.get("/api/metrics/category-kpis")
def category_kpis(req: Request):
    return metrics.category_kpis(_tok(req))


@app.get("/api/metrics/movers")
def movers(req: Request):
    return metrics.movers(_tok(req))


@app.get("/api/metrics/secondary")
def secondary(req: Request):
    return metrics.secondary(_tok(req))


@app.get("/api/metrics/inventory")
def inventory(req: Request):
    return metrics.inventory(_tok(req))


@app.get("/api/metrics/drilldown")
def drilldown(req: Request):
    return metrics.drilldown(_tok(req))


@app.get("/api/metrics/store-comparison")
def store_comparison(req: Request, level: str = Query("category"), name: str = Query(...)):
    return metrics.store_comparison(level, name, _tok(req))


@app.post("/api/brief")
def brief(req: Request):
    return metrics.brief(_tok(req))


@app.get("/api/suggested-questions")
def suggested():
    return metrics.SUGGESTED_QUESTIONS


class AskBody(BaseModel):
    question: str
    conversation_id: str | None = None


class PollBody(BaseModel):
    conversation_id: str
    response_id: str


@app.post("/api/genie/ask")
def genie_ask(body: AskBody, req: Request):
    try:
        return genie.ask(body.question, body.conversation_id, _tok(req))
    except Exception as e:  # degrade gracefully (NFR-6)
        return JSONResponse({"status": "failed", "error": str(e)[:300]}, status_code=502)


@app.post("/api/genie/poll")
def genie_poll(body: PollBody, req: Request):
    try:
        return genie.poll(body.conversation_id, body.response_id, _tok(req))
    except Exception as e:
        return JSONResponse({"status": "failed", "error": str(e)[:300]}, status_code=502)


class ConvBody(BaseModel):
    title: str


class MsgBody(BaseModel):
    conversation_id: str
    role: str
    content: str
    genie_conversation_id: str | None = None


@app.get("/api/chat/conversations")
def conversations(req: Request):
    return state.list_conversations(_user(req))


@app.post("/api/chat/conversations")
def new_conversation(body: ConvBody, req: Request):
    return {"conversation_id": state.new_conversation(_user(req), body.title)}


@app.get("/api/chat/messages")
def messages(cid: str):
    return state.get_messages(cid)


@app.post("/api/chat/messages")
def add_message(body: MsgBody):
    state.add_message(body.conversation_id, body.role, body.content, body.genie_conversation_id)
    return {"ok": True}


if os.path.isdir(STATIC):
    app.mount("/assets", StaticFiles(directory=os.path.join(STATIC, "assets")), name="assets")

    @app.get("/{path:path}")
    def spa(path: str):
        full = os.path.join(STATIC, path)
        if path and os.path.isfile(full):
            return FileResponse(full)
        return FileResponse(os.path.join(STATIC, "index.html"))
