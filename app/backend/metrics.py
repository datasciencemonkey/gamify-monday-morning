"""All dashboard queries (BUILD-SPEC section 3 contracts). Current month = 2025-12.
Each function returns JSON-ready shapes the frontend consumes verbatim."""
from .db import q

CUR, PY_CUR, PREV = "2025-12", "2024-12", "2025-11"


def exec_kpis(tok=None) -> dict:
    t = q(f"""SELECT round(sum(sales_amt),0) s, round(sum(sales_amt)/sum(plan_amt)-1,3) vp,
              sum(units) u FROM {{S}}.fact_sales WHERE month='{CUR}'""", tok)[0]
    margin = q(f"""SELECT round(avg(m),1) gm FROM (
        SELECT p.category, sum(f.margin_amt)/sum(f.sales_amt)*100 m FROM {{S}}.fact_sales f
        JOIN {{S}}.dim_product p USING(sku_id) WHERE f.month='{CUR}' GROUP BY 1)""", tok)[0]
    comp = q(f"""SELECT round(sum(CASE WHEN f.month='{CUR}' THEN f.sales_amt END),0) c,
        round(sum(CASE WHEN f.month='{CUR}' THEN f.sales_amt END)
            / sum(CASE WHEN f.month='{PY_CUR}' THEN f.sales_amt END)-1,3) yoy
        FROM {{S}}.fact_sales f JOIN {{S}}.dim_store s USING(store_id)
        WHERE s.is_comp_store AND f.month IN ('{CUR}','{PY_CUR}')""", tok)[0]
    ecom = q(f"""SELECT round(sum(CASE WHEN month='{CUR}' THEN sales_amt END),0) e,
        round(sum(CASE WHEN month='{CUR}' THEN sales_amt END)
            / sum(CASE WHEN month='{PY_CUR}' THEN sales_amt END)-1,3) yoy
        FROM {{S}}.fact_channel WHERE channel='e-commerce'""", tok)[0]
    tr = q(f"""SELECT sum(CASE WHEN month='{CUR}' THEN customer_traffic END) t,
        sum(CASE WHEN month='{CUR}' THEN transactions END) x,
        round(sum(CASE WHEN month='{CUR}' THEN customer_traffic END)
            / sum(CASE WHEN month='{PY_CUR}' THEN customer_traffic END)-1,3) yoy
        FROM {{S}}.fact_store_traffic""", tok)[0]
    inv = q("SELECT round(avg(in_stock_pct),1) i FROM {S}.fact_inventory", tok)[0]
    sc = q(f"SELECT on_time_delivery_pct otd FROM {{S}}.fact_supply_chain WHERE month='{CUR}'", tok)[0]
    return {"total_sales": t["s"], "vs_plan": t["vp"], "comp_sales": comp["c"], "comp_yoy": comp["yoy"],
            "ecom_sales": ecom["e"], "ecom_yoy": ecom["yoy"], "transactions": tr["x"],
            "in_stock_rate": inv["i"], "gross_margin": margin["gm"],
            "customer_traffic": tr["t"], "traffic_yoy": tr["yoy"], "on_time_delivery": sc["otd"]}


def trend(tok=None) -> list[dict]:
    return q(f"""SELECT month, round(sum(sales_amt),0) sales FROM {{S}}.fact_sales
                 WHERE month LIKE '2025-%' GROUP BY 1 ORDER BY 1""", tok)


def category_sales(tok=None) -> list[dict]:
    return q(f"""SELECT p.category, round(sum(f.sales_amt),0) sales
        FROM {{S}}.fact_sales f JOIN {{S}}.dim_product p USING(sku_id)
        WHERE f.month='{CUR}' GROUP BY 1 ORDER BY 2 DESC""", tok)


def category_kpis(tok=None) -> list[dict]:
    return q("""SELECT category, growth_vs_market_pp, trip_conversion_pct, basket_attach_pct,
                dollars_per_linear_foot, planogram_compliance_pct, new_items_launched,
                new_items_successful FROM {S}.fact_category_market
                ORDER BY growth_vs_market_pp DESC""", tok)


def movers(tok=None) -> dict:
    top = q(f"""WITH d AS (SELECT sku_id, sum(sales_amt) s FROM {{S}}.fact_sales WHERE month='{CUR}' GROUP BY 1),
        y AS (SELECT sku_id, sum(sales_amt) s FROM {{S}}.fact_sales WHERE month='{PY_CUR}' GROUP BY 1)
        SELECT p.product_name, p.category, round(d.s,0) sales, round((d.s/y.s-1)*100,1) pct
        FROM d JOIN y USING(sku_id) JOIN {{S}}.dim_product p USING(sku_id)
        WHERE y.s > 0 ORDER BY pct DESC LIMIT 5""", tok)
    under = q(f"""WITH d AS (SELECT sku_id, sum(sales_amt) s, sum(plan_amt) pl
            FROM {{S}}.fact_sales WHERE month='{CUR}' GROUP BY 1),
        y AS (SELECT sku_id, sum(sales_amt) s FROM {{S}}.fact_sales WHERE month='{PY_CUR}' GROUP BY 1)
        SELECT p.product_name, p.category, round(d.s,0) sales, round((d.s/y.s-1)*100,1) pct
        FROM d JOIN y USING(sku_id) JOIN {{S}}.dim_product p USING(sku_id)
        WHERE y.s > 0 ORDER BY (d.s - d.pl) ASC LIMIT 5""", tok)
    under = sorted(under, key=lambda r: r["pct"])
    new = q(f"""WITH d AS (SELECT sku_id, sum(sales_amt) s FROM {{S}}.fact_sales WHERE month='{CUR}' GROUP BY 1),
        m AS (SELECT sku_id, sum(sales_amt) s FROM {{S}}.fact_sales WHERE month='{PREV}' GROUP BY 1)
        SELECT p.product_name, p.category, round(d.s,0) sales, round((d.s/m.s-1)*100,1) pct
        FROM d JOIN m USING(sku_id) JOIN {{S}}.dim_product p USING(sku_id)
        WHERE p.new_item_pct = 100 AND m.s > 0 ORDER BY d.s DESC LIMIT 5""", tok)
    return {"top_movers": top, "underperformers": under, "new_items": new}


def secondary(tok=None) -> dict:
    t = q(f"""SELECT round(sum(f.sales_amt),0) s, sum(f.units) u FROM {{S}}.fact_sales f
              WHERE f.month='{CUR}'""", tok)[0]
    tr = q(f"SELECT sum(transactions) x FROM {{S}}.fact_store_traffic WHERE month='{CUR}'", tok)[0]
    ch = q(f"""SELECT conversion_pct FROM {{S}}.fact_channel
               WHERE month='{CUR}' AND channel='e-commerce'""", tok)[0]
    ex = q(f"SELECT nps_score FROM {{S}}.fact_experience WHERE month='{CUR}'", tok)[0]
    pl = q(f"""SELECT round(sum(CASE WHEN p.is_private_label THEN f.sales_amt END)/sum(f.sales_amt)*100,1) pl
        FROM {{S}}.fact_sales f JOIN {{S}}.dim_product p USING(sku_id) WHERE f.month='{CUR}'""", tok)[0]
    sc = q(f"SELECT case_fill_rate_pct cf, otif_pct FROM {{S}}.fact_supply_chain WHERE month='{CUR}'", tok)[0]
    return {"avg_basket": round(t["s"] / tr["x"], 2), "avg_items": round(t["u"] / tr["x"]),
            "conversion_rate": ch["conversion_pct"], "nps": ex["nps_score"],
            "private_label_pct": pl["pl"], "case_fill_rate": sc["cf"], "otif": sc["otif_pct"]}


def inventory(tok=None) -> list[dict]:
    return q("""SELECT s.store_name, s.region, round(avg(i.in_stock_pct),1) in_stock_pct,
        sum(i.nil_picks) nil_picks, round(avg(i.days_supply),1) days_supply
        FROM {S}.fact_inventory i JOIN {S}.dim_store s USING(store_id)
        GROUP BY 1,2 ORDER BY 3 ASC""", tok)


def drilldown(tok=None) -> list[dict]:
    """Category -> Subcategory -> SKU tree (DASH-12). SKU-grain SQL, Python rollups:
    rate cols are sales-weighted, in-stock/DOS simple averages, $/lin-ft = sales/12/linear_feet."""
    skus = q("""SELECT p.category, p.subcategory, p.product_name, max(p.upc) upc,
        max(p.sku_id) sku_id, max(p.new_item_pct) new_pct, max(p.linear_feet) lf,
        sum(f.sales_amt) sales, sum(f.units) units, sum(f.plan_amt) plan_amt,
        sum(f.py_sales_amt) py_amt, sum(f.margin_amt) margin_amt,
        max(f.promo_lift_pct) promo_lift, max(f.trip_conversion_pct) trip_conv,
        max(f.basket_attach_pct) basket_att
        FROM {S}.fact_sales f JOIN {S}.dim_product p USING(sku_id)
        WHERE f.month LIKE '2025-%' GROUP BY 1,2,3""", tok)
    inv = {r["product_name"]: r for r in q("""SELECT p.product_name,
        round(avg(i.in_stock_pct),1) in_stock, round(avg(i.days_supply),1) dos
        FROM {S}.fact_inventory i JOIN {S}.dim_product p USING(sku_id) GROUP BY 1""", tok)}

    def sku_row(r: dict) -> dict:
        iv = inv.get(r["product_name"], {})
        return {"product_name": r["product_name"], "subcategory": r["subcategory"],
                "category": r["category"], "upc": r["upc"], "sku_id": r["sku_id"],
                "sales": round(r["sales"]), "units": int(r["units"]),
                "vs_plan": round(r["sales"] / r["plan_amt"] - 1, 3) if r["plan_amt"] else 0,
                "vs_py": round(r["sales"] / r["py_amt"] - 1, 3) if r["py_amt"] else 0,
                "margin": round(r["margin_amt"] / r["sales"] * 100, 1),
                "promo_lift": round(r["promo_lift"], 1), "trip_conv": round(r["trip_conv"], 1),
                "basket_att": round(r["basket_att"], 1),
                "dpl": round(r["sales"] / 12 / r["lf"], 2) if r["lf"] else 0,
                "new_pct": round(r["new_pct"]),
                "in_stock": iv.get("in_stock", 0), "dos": iv.get("dos", 0)}

    def rollup(rows: list[dict]) -> dict:
        s = sum(r["sales"] for r in rows)
        w = lambda k: round(sum(r["sales"] * r[k] for r in rows) / s, 1)
        return {"sales": round(s), "units": int(sum(r["units"] for r in rows)),
                "vs_plan": round(s / sum(r["plan_amt"] for r in rows) - 1, 3),
                "vs_py": round(s / sum(r["py_amt"] for r in rows) - 1, 3),
                "margin": round(sum(r["margin_amt"] for r in rows) / s * 100, 1),
                "promo_lift": w("promo_lift"), "trip_conv": w("trip_conv"),
                "basket_att": w("basket_att"),
                "dpl": round(s / 12 / sum(r["lf"] for r in rows), 2),
                "new_pct": round(sum(r["new_pct"] for r in rows) / len(rows)),
                "in_stock": round(sum(inv.get(r["product_name"], {}).get("in_stock", 0) for r in rows) / len(rows), 1),
                "dos": round(sum(inv.get(r["product_name"], {}).get("dos", 0) for r in rows) / len(rows), 1)}

    tree = []
    cats = sorted({r["category"] for r in skus},
                  key=lambda c: -sum(r["sales"] for r in skus if r["category"] == c))
    for c in cats:
        c_rows = [r for r in skus if r["category"] == c]
        subs = []
        for sname in sorted({r["subcategory"] for r in c_rows},
                            key=lambda sn: -sum(r["sales"] for r in c_rows if r["subcategory"] == sn)):
            s_rows = [r for r in c_rows if r["subcategory"] == sname]
            leaf = sorted((sku_row(r) for r in s_rows), key=lambda x: -x["sales"])
            subs.append({**rollup(s_rows), "subcategory": sname, "skus": leaf})
        tree.append({**rollup(c_rows), "category": c, "subcategories": subs})
    return tree


def store_comparison(level: str, name: str, tok=None) -> dict:
    col = "p.category" if level == "category" else "p.subcategory"
    rows = q(f"""SELECT s.store_name, s.city, s.state, s.latitude, s.longitude,
        round(sum(f.sales_amt),0) sales, sum(f.units) units
        FROM {{S}}.fact_sales f JOIN {{S}}.dim_product p USING(sku_id)
        JOIN {{S}}.dim_store s USING(store_id)
        WHERE f.month='{CUR}' AND {col} = '{name.replace("'", "''")}'
        GROUP BY 1,2,3,4,5 ORDER BY 6 DESC""", tok)
    inv = q(f"""SELECT s.store_name, round(avg(i.in_stock_pct),1) in_stock,
        sum(i.on_hand_units) on_hand
        FROM {{S}}.fact_inventory i JOIN {{S}}.dim_product p USING(sku_id)
        JOIN {{S}}.dim_store s USING(store_id)
        WHERE {col} = '{name.replace("'", "''")}' GROUP BY 1""", tok)
    inv_m = {r["store_name"]: r for r in inv}
    total = sum(r["sales"] for r in rows) or 1
    stores = [{**r, "in_stock": inv_m.get(r["store_name"], {}).get("in_stock"),
               "on_hand": inv_m.get(r["store_name"], {}).get("on_hand")} for r in rows]
    top = stores[0] if stores else None
    return {"level": level, "name": name, "stores": stores,
            "top_store": {"store_name": top["store_name"], "sales": top["sales"],
                          "share": round(top["sales"] / total * 100)} if top else None}


def brief(tok=None) -> dict:
    """Executive Brief (AI-2): exact figures computed from facts; prose follows the reference
    format. Instant by design - the live demo can't wait out a 70-260s Genie turn."""
    cats = q(f"""SELECT p.category, round(sum(CASE WHEN f.month='{CUR}' THEN f.sales_amt END),0) dec,
        round(sum(CASE WHEN f.month='{PREV}' THEN f.sales_amt END),0) nov,
        round(sum(CASE WHEN f.month='{CUR}' THEN f.margin_amt END)
            / sum(CASE WHEN f.month='{CUR}' THEN f.sales_amt END)*100,1) margin
        FROM {{S}}.fact_sales f JOIN {{S}}.dim_product p USING(sku_id)
        WHERE f.month IN ('{CUR}','{PREV}') GROUP BY 1 ORDER BY 2 DESC""", tok)
    total = sum(c["dec"] for c in cats)
    tmargin = q(f"SELECT round(sum(margin_amt),0) m FROM {{S}}.fact_sales WHERE month='{CUR}'", tok)[0]["m"]
    inv = q("SELECT round(avg(in_stock_pct),1) i FROM {S}.fact_inventory", tok)[0]["i"]
    for c in cats:
        c["mom"] = round((c["dec"] / c["nov"] - 1) * 100, 1)
    top = cats[0]
    growing = [c for c in cats if c["mom"] > 0]
    declining = [c for c in cats if c["mom"] <= 0]
    avg_margin = round(sum(c["margin"] for c in cats) / len(cats), 1)
    lo, hi = min(cats, key=lambda c: c["margin"]), max(cats, key=lambda c: c["margin"])
    others = ", ".join(c["category"] for c in cats[1:-1]) + f", and {cats[-1]['category']}"
    headline = (f"Total sales reached ${total:,.0f} this month with an average margin of {avg_margin}%, "
                f"reflecting broad category momentum. {top['category']} leads all categories at "
                f"${top['dec']:,.0f} in sales{' but is the only category trailing, down ' + str(abs(top['mom'])) + '% month-over-month' if top['mom'] < 0 else ''}. "
                f"{'All other categories - ' + ', '.join(c['category'] for c in cats[1:]) + ' - posted positive month-over-month growth.' if len(declining) == 1 and declining[0] is top else ''}")
    detail = (f"{top['category']}, while the highest-revenue category at ${top['dec']:,.0f}, "
              f"{'is the sole drag on portfolio growth at ' + str(top['mom']) + '% MoM and warrants immediate attention. ' if top['mom'] < 0 else 'continues to lead. '}"
              + " ".join(f"{c['category']} posted {'+' if c['mom'] >= 0 else ''}{c['mom']}% MoM at a {c['margin']}% margin." for c in cats[1:])
              + f" Margins across all categories remain healthy, ranging from {lo['margin']}% ({lo['category']}) to {hi['margin']}% ({hi['category']}).")
    return {"headline": headline, "detail": detail,
            "chips": [
                {"label": "TOTAL SALES", "value": f"${total:,.0f}", "tone": "neutral"},
                {"label": "TOTAL MARGIN", "value": f"${tmargin:,.0f}", "tone": "good"},
                {"label": "AVG MARGIN %", "value": f"{avg_margin}%", "tone": "good"},
                {"label": "IN-STOCK RATE", "value": f"{inv}%", "tone": "neutral"},
                {"label": f"TOP CATEGORY ({top['category'].upper()})", "value": f"${top['dec']:,.0f}",
                 "tone": "bad" if top["mom"] < 0 else "good"},
                {"label": "CATEGORIES GROWING MOM", "value": f"{len(growing)} of {len(cats)}", "tone": "good"}],
            "provenance": "Based on current-period monthly sales data across 5 product categories, with month-over-month comparisons."}


SUGGESTED_QUESTIONS = [
    "What are total sales by category this week?",
    "Which SKUs are the top movers this month?",
    "Show the underperforming SKUs in Food Storage",
    "Compare margin % across the 5 categories",
    "What is the week-over-week sales trend?",
    "Which SKUs are furthest below plan?",
    "What are the top root causes of the sales gap?",
    "What is the overall in-stock percentage by store?",
    "What are the e-commerce conversion trends by month?",
    "What is the case-fill and OTIF rate?",
]
