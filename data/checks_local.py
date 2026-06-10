"""Local calibration checks against requirements DATA-6 targets (pre-upload)."""
import numpy as np
import pandas as pd
import generate as g

T = g.build()
fact, prod, stores = T["fact_sales"], T["dim_product"], T["dim_store"]
fact = fact.merge(prod[["sku_id", "product_name", "category", "subcategory", "is_private_label"]], on="sku_id")
fact = fact.merge(stores[["store_id", "store_name", "is_comp_store"]], on="store_id")
CUR, M25 = "2025-12", [f"2025-{m:02d}" for m in range(1, 13)]
dec = fact[fact.month == CUR]
y25 = fact[fact.month.isin(M25)]
fails = []

def ck(name, actual, target, tol=0.005):
    ok = abs(actual - target) <= abs(target) * tol + 1e-6
    print(f"{'PASS' if ok else 'FAIL'}  {name}: {actual:,.2f} vs {target:,.2f}")
    if not ok: fails.append(name)

ck("Dec total sales", dec.sales_amt.sum(), 2_401_623, 0.0001)
for c, t in g.DEC_SALES.items():
    ck(f"Dec {c}", dec[dec.category == c].sales_amt.sum(), t, 0.0001)
for c, t in g.ANNUAL_SALES.items():
    ck(f"2025 {c} sales", y25[y25.category == c].sales_amt.sum(), t, 0.001)
for c, t in g.ANNUAL_UNITS.items():
    ck(f"2025 {c} units", y25[y25.category == c].units.sum(), t, 0.05)
for sub, (s, u) in g.FS_SUB_ANNUAL.items():
    ck(f"2025 FS/{sub} sales", y25[y25.subcategory == sub].sales_amt.sum(), s, 0.10)
    ck(f"2025 FS/{sub} units", y25[y25.subcategory == sub].units.sum(), u, 0.10)
for n, d in g.BW.items():
    ck(f"2025 {n} sales", y25[y25.product_name == n].sales_amt.sum(), d["sales"], 0.0005)
    ck(f"2025 {n} units", y25[y25.product_name == n].units.sum(), d["units"], 0.005)
    ck(f"Dec {n}", dec[dec.product_name == n].sales_amt.sum(), d["dec"], 0.0001)
    vp = y25[y25.product_name == n]
    ck(f"{n} vs plan", vp.sales_amt.sum() / vp.plan_amt.sum() - 1, d["vplan"], 0.02)
bw = list(g.BW)
ck("Dec BW Yonkers", dec[(dec.product_name.isin(bw)) & (dec.store_name == "Yonkers Center")].sales_amt.sum(), 11_000, 0.001)
ck("Dec BW Paramus", dec[(dec.product_name.isin(bw)) & (dec.store_name == "Paramus Park")].sales_amt.sum(), 8_000, 0.001)
comp = dec[dec.is_comp_store]
ck("Dec comp sales", comp.sales_amt.sum(), 2_200_000, 0.0005)
d24 = fact[fact.month == "2024-12"]
ck("comp YoY", comp.sales_amt.sum() / d24[d24.is_comp_store].sales_amt.sum() - 1, 0.021, 0.05)
ck("Dec chain vs plan", dec.sales_amt.sum() / dec.plan_amt.sum() - 1, -0.112, 0.05)
for c, t in g.VS_PLAN_Y.items():
    cc = y25[y25.category == c]
    ck(f"{c} vs plan 2025", cc.sales_amt.sum() / cc.plan_amt.sum() - 1, t, 0.03)
for c, t in g.VS_PY_Y.items():
    cc = y25[y25.category == c]
    py = fact[(fact.month.isin([m.replace('2025','2024') for m in M25])) & (fact.category == c)]
    ck(f"{c} YoY 2025", cc.sales_amt.sum() / py.sales_amt.sum() - 1, t, 0.03)
margins = {c: y25[y25.category == c].margin_amt.sum() / y25[y25.category == c].sales_amt.sum() * 100 for c in g.CATS}
ck("avg cat margin", np.mean(list(margins.values())), 52.7, 0.005)
for c, t in g.MARGIN.items():
    ck(f"{c} margin", margins[c], t * 100, 0.01)
for c, t in g.MOM_DEC.items():
    nov = fact[(fact.month == "2025-11") & (fact.category == c)].sales_amt.sum()
    ck(f"{c} MoM Dec", dec[dec.category == c].sales_amt.sum() / nov - 1, t, 0.05)
for n, (amt, yoy, mom) in g.DEC_SKU.items():
    ck(f"Dec {n}", dec[dec.product_name == n].sales_amt.sum(), amt, 0.001)
    if yoy is not None:
        pyv = d24[d24.product_name == n].sales_amt.sum()
        ck(f"{n} Dec YoY", dec[dec.product_name == n].sales_amt.sum() / pyv - 1, yoy, 0.02)
    if mom is not None:
        nv = fact[(fact.month == "2025-11") & (fact.product_name == n)].sales_amt.sum()
        ck(f"{n} Dec MoM", dec[dec.product_name == n].sales_amt.sum() / nv - 1, mom, 0.02)
pl = dec[dec.is_private_label].sales_amt.sum() / dec.sales_amt.sum()
ck("private label share", pl, 0.247, 0.05)
ck("avg basket", dec.sales_amt.sum() / 172_948, 13.89, 0.001)
# inventory
inv = T["fact_inventory"].merge(prod[["sku_id", "product_name"]], on="sku_id").merge(
    stores[["store_id", "store_name"]], on="store_id")
for s in g.STORES:
    ck(f"in-stock {s[0]}", inv[inv.store_name == s[0]].in_stock_pct.mean(), s[6], 0.003)
    ck(f"days-supply {s[0]}", inv[inv.store_name == s[0]].days_supply.mean(), s[8], 0.01)
    ck(f"nil-picks {s[0]}", inv[inv.store_name == s[0]].nil_picks.sum(), s[7], 0.001)
for n, d in g.BW.items():
    ck(f"in-stock {n}", inv[inv.product_name == n].in_stock_pct.mean(), d["in_stock"], 0.003)
pmBW = inv[(inv.store_name == "Paramus Park") & (inv.product_name.isin(bw))]
ck("Paramus BW in-stock", pmBW.in_stock_pct.mean(), 83.3, 0.005)
ck("Paramus BW on-hand", pmBW.on_hand_units.sum(), 443, 0.001)
ck("chain in-stock", inv.in_stock_pct.mean(), 79.4, 0.002)
# traffic / channel
traf, chan = T["fact_store_traffic"], T["fact_channel"]
ck("Dec traffic", traf[traf.month == CUR].customer_traffic.sum(), 432_370, 0.0001)
ck("Dec txns", traf[traf.month == CUR].transactions.sum(), 172_948, 0.0001)
ck("traffic YoY", traf[traf.month == CUR].customer_traffic.sum() / traf[traf.month == "2024-12"].customer_traffic.sum() - 1, -0.027, 0.05)
ec = chan[(chan.month == CUR) & (chan.channel == "e-commerce")]
ck("Dec ecom", ec.sales_amt.sum(), 631_000, 0.0001)
ck("ecom conv Dec", ec.conversion_pct.iloc[0], 6.1, 0.001)
# weekly coherence
wk = T["fact_sales_weekly"]
wk_dec = wk[wk.week_start.str.startswith("2025-12")].sales_amt.sum()
ck("Dec weekly==monthly", wk_dec, 2_401_623, 0.001)
# trend display: April 2025 total ~ $2.4M
apr = fact[fact.month == "2025-04"].sales_amt.sum()
print(f"INFO  2025-04 total (should display $2.4M): {apr:,.0f}")
nov_t = fact[fact.month == "2025-11"].sales_amt.sum()
print(f"INFO  2025-11 total (trend peak ~2.48M): {nov_t:,.0f}")

def story(name, cond):
    print(f"{'PASS' if cond else 'FAIL'}  [story] {name}")
    if not cond: fails.append(name)

dec_by_cat = dec.groupby("category").sales_amt.sum()
nov_by_cat = fact[fact.month == "2025-11"].groupby("category").sales_amt.sum()
mom = dec_by_cat / nov_by_cat - 1
story("Food Storage is #1 category in Dec", dec_by_cat.idxmax() == "Food Storage")
story("Food Storage is the ONLY declining category MoM", (mom < 0).sum() == 1 and mom["Food Storage"] < 0)
d24n = d24.groupby("product_name").sales_amt.sum()
decn = dec.groupby("product_name").sales_amt.sum()
yoy_sku = (decn / d24n.reindex(decn.index)).dropna()
story("top mover grows >10x YoY", yoy_sku.max() > 10)
under = dec.merge(prod[["sku_id"]], on="sku_id")
gap = (dec.groupby(["product_name", "category"]).agg(s=("sales_amt", "sum"), p=("plan_amt", "sum")))
gap["vs"] = gap.s / gap.p - 1
worst5 = gap.sort_values("vs").head(5).reset_index()
story("worst-5 vs-plan SKUs are all Food Storage", (worst5.category == "Food Storage").all())
bw_dec_store = dec[dec.product_name.isin(bw)].groupby("store_name").sales_amt.sum()
story("Yonkers Center is top store for Bags & Wraps", bw_dec_store.idxmax() == "Yonkers Center")
story("margin band 49-56 with ~52.7 avg", all(48.5 < v < 56.5 for v in margins.values()) and abs(np.mean(list(margins.values())) - 52.7) < 0.5)
story("store in-stock ladder spans ~76-82", inv.groupby("store_name").in_stock_pct.mean().between(75.5, 82.5).all())
story("inventory cells stay in sane bounds", inv.in_stock_pct.between(55, 99.9).all() and (inv.days_supply > 0).all())

print(f"\n{'='*50}\n{'ALL CHECKS PASSED' if not fails else f'{len(fails)} FAILURES: {fails}'}")
