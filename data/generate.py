"""Deterministic synthetic data generator for Monday Morning - CPG Retail Insights.

Calibrated to requirements/02-dashboard-requirements.md (DASH-*) and
requirements/04-data-requirements.md (DATA-6). Aggregating these tables reproduces the
values shown in the reference video. Deterministic: same output on every run (SEED=42).

Calibration decisions where the reference mock was internally inconsistent:
  C1: Brief chip TOTAL SALES $2,401,623 is canonical; donut labels render from facts
      (Food Storage donut shows ~$671K vs video's $679K - doc note N2).
  C2: GROSS MARGIN 52.7% (KPI card + brief text, simple avg across categories) is canonical;
      TOTAL MARGIN $ derives from facts (video's $1,283,688 chip is infeasible given the
      stated 49.4%-55.4% category margin range).
  C3: Air Care donut label was partially illegible ($42xK) -> resolved by the total-sales
      constraint to $424,357.
  C4/C5: Top-mover & underperformer card % = current-month YoY (tiny prior-year base for
      items launched late 2024); New Items card % = month-over-month growth.
  C6/C7: DASH-7 category $/lin-ft, trip-conv, basket-attach live in fact_category_market;
      DASH-12 SKU-level equivalents live in fact_sales (different definitions in the mock).
"""

import numpy as np
import pandas as pd
from datetime import date

SEED = 42
CATALOG = "serverless_9cefok_catalog"
SCHEMA = "monday_morning"
FQ = f"{CATALOG}.{SCHEMA}"

CUR = "2025-12"           # current month
MONTHS_2025 = [f"2025-{m:02d}" for m in range(1, 13)]
MONTHS_2024 = [f"2024-{m:02d}" for m in range(1, 13)]
ALL_MONTHS = MONTHS_2024 + MONTHS_2025

rng = np.random.default_rng(SEED)

# ---------------------------------------------------------------- stores (DASH-10)
STORES = [  # name, region, city, state, lat, lon, in_stock, nil_picks, days_supply, opened
    ("Greenwich Village",   "CT Corridor", "Greenwich",     "CT", 41.0262, -73.6282, 76.2, 100, 6.1, "2018-04-12"),
    ("Norwalk Super",       "CT Corridor", "Norwalk",       "CT", 41.1177, -73.4082, 77.3,  81, 6.1, "2017-09-20"),
    ("Jersey City Hub",     "North NJ",    "Jersey City",   "NJ", 40.7282, -74.0776, 78.0,  87, 5.4, "2019-03-15"),
    ("Manhattan Flagship",  "NYC Metro",   "New York",      "NY", 40.7541, -73.9837, 78.7, 100, 5.7, "2015-11-05"),
    ("Stamford Town Center","CT Corridor", "Stamford",      "CT", 41.0534, -73.5387, 79.1,  94, 6.7, "2018-08-23"),
    ("Staten Island Mall",  "NYC Metro",   "Staten Island", "NY", 40.5834, -74.1664, 79.2, 102, 5.8, "2016-06-30"),
    ("Bronx Gateway",       "NYC Metro",   "Bronx",         "NY", 40.8167, -73.9196, 79.3,  74, 4.9, "2019-10-11"),
    ("Newark Express",      "North NJ",    "Newark",        "NJ", 40.7353, -74.1724, 79.8,  72, 4.7, "2020-02-14"),
    ("Queens Boulevard",    "NYC Metro",   "Queens",        "NY", 40.7335, -73.8702, 79.9,  89, 6.3, "2017-05-18"),
    ("Princeton Junction",  "Central NJ",  "Princeton",     "NJ", 40.3171, -74.6202, 80.0, 103, 5.4, "2019-07-09"),
    ("Yonkers Center",      "Westchester", "Yonkers",       "NY", 40.9312, -73.8987, 80.1,  87, 6.1, "2016-03-22"),
    ("White Plains Plaza",  "Westchester", "White Plains",  "NY", 41.0339, -73.7629, 80.7,  81, 5.9, "2018-12-01"),
    ("Edison Marketplace",  "Central NJ",  "Edison",        "NJ", 40.5187, -74.4121, 80.7,  91, 5.1, "2025-03-01"),  # non-comp
    ("Brooklyn Heights",    "NYC Metro",   "Brooklyn",      "NY", 40.6958, -73.9936, 81.0,  93, 5.9, "2015-08-17"),
    ("Paramus Park",        "North NJ",    "Paramus",       "NJ", 40.9612, -74.0743, 81.7, 118, 6.7, "2017-01-26"),
]
STORE_NAMES = [s[0] for s in STORES]
NON_COMP = "Edison Marketplace"           # opened 2025-03 -> excluded from comp-store sales
# store share of chain sales (sums to 1); chosen so Yonkers carries ~11% (top-store callout)
STORE_W = np.array([0.060, 0.064, 0.062, 0.082, 0.058, 0.066, 0.052, 0.050, 0.064,
                    0.058, 0.110, 0.056, 0.084, 0.078, 0.056])
assert abs(STORE_W.sum() - 1.0) < 1e-9

# ------------------------------------------------------------- products (DASH-7/8/12)
# (name, category, subcategory, is_new, margin_pct_or_None)
PRODUCTS = [
    # Food Storage (10) - subcats: Vacuum Sealers 3 (100% new), Containers 3 (2/3 new), Bags & Wraps 4 (3/4 new)
    ("Vacuum Sealer Pro Starter Kit", "Food Storage", "Vacuum Sealers", 1, None),
    ("Vacuum Seal Rolls 3-Pack",      "Food Storage", "Vacuum Sealers", 1, None),
    ("Vacuum Seal Bags Quart 50ct",   "Food Storage", "Vacuum Sealers", 1, None),
    ("Meal Prep Containers 15ct",     "Food Storage", "Containers",     1, None),
    ("Plastic Container Set 20pc",    "Food Storage", "Containers",     1, None),
    ("Glass Storage Set 10pc",        "Food Storage", "Containers",     0, None),
    ("Gallon Zip Bags 75ct",          "Food Storage", "Bags & Wraps",   1, 45.3),
    ("Sandwich Bags 150ct",           "Food Storage", "Bags & Wraps",   1, 46.0),
    ("Cling Wrap 200ft",              "Food Storage", "Bags & Wraps",   1, 46.0),
    ("Aluminum Foil Heavy Duty",      "Food Storage", "Bags & Wraps",   0, 46.1),
    # Shoe Care (9) - 8/9 new (88.9%)
    ("Suede & Nubuck Cleaner",  "Shoe Care", "Cleaners",       1, None),
    ("Sneaker Cleaning Kit",    "Shoe Care", "Cleaners",       1, None),
    ("Leather Shoe Cleaner",    "Shoe Care", "Cleaners",       0, None),
    ("Boot Weather Guard",      "Shoe Care", "Protectants",    1, None),
    ("Water & Stain Repellent", "Shoe Care", "Protectants",    1, None),
    ("Sole Protector Spray",    "Shoe Care", "Protectants",    1, None),
    ("Premium Shoe Polish Black","Shoe Care","Polish & Shine", 1, None),
    ("Express Shine Sponge",    "Shoe Care", "Polish & Shine", 1, None),
    ("Shoe Cream Neutral",      "Shoe Care", "Polish & Shine", 1, None),
    # Home Cleaning (10) - 100% new
    ("Liquid Laundry Detergent",   "Home Cleaning", "Laundry Care",      1, None),
    ("Stain Remover Spray",        "Home Cleaning", "Laundry Care",      1, None),
    ("Fabric Softener Sheets",     "Home Cleaning", "Laundry Care",      1, None),
    ("Oxygen Booster Powder",      "Home Cleaning", "Laundry Care",      1, None),
    ("All-Purpose Cleaner Spray",  "Home Cleaning", "Surface Cleaners",  1, None),
    ("Disinfecting Wipes 75ct",    "Home Cleaning", "Surface Cleaners",  1, None),
    ("Glass Cleaner Streak-Free",  "Home Cleaning", "Surface Cleaners",  1, None),
    ("Floor Cleaner Concentrate",  "Home Cleaning", "Floor Care",        1, None),
    ("Mop Refill Pads 12ct",       "Home Cleaning", "Floor Care",        1, None),
    ("Carpet Spot Remover",        "Home Cleaning", "Floor Care",        1, None),
    # Air Care (9) - 8/9 new
    ("Plug-In Air Freshener Starter","Air Care", "Sprays & Plug-Ins", 1, None),
    ("Room Spray Lavender",          "Air Care", "Sprays & Plug-Ins", 1, None),
    ("Odor Eliminator Spray",        "Air Care", "Sprays & Plug-Ins", 1, None),
    ("Citrus Burst Votive 6-Pack",   "Air Care", "Candles",           1, None),
    ("Vanilla Jar Candle 14oz",      "Air Care", "Candles",           0, None),
    ("Seasonal Candle Trio",         "Air Care", "Candles",           1, None),
    ("Reed Diffuser Set",            "Air Care", "Diffusers & Melts", 1, None),
    ("Car Vent Clips 4-Pack",        "Air Care", "Diffusers & Melts", 1, None),
    ("Wax Melts Variety 12ct",       "Air Care", "Diffusers & Melts", 1, None),
    # Pest Control (9) - 8/9 new
    ("Indoor Bug Spray",          "Pest Control", "Insect Control",  1, None),
    ("Ant Bait Stations 8ct",     "Pest Control", "Insect Control",  1, None),
    ("Flying Insect Trap 2pk",    "Pest Control", "Insect Control",  1, None),
    ("Mouse Trap Multi-Pack",     "Pest Control", "Rodent Control",  0, None),
    ("Rodent Repellent Pouches",  "Pest Control", "Rodent Control",  1, None),
    ("Glue Boards 6ct",           "Pest Control", "Rodent Control",  1, None),
    ("Yard Insect Granules",      "Pest Control", "Outdoor Defense", 1, None),
    ("Mosquito Coils 10pk",       "Pest Control", "Outdoor Defense", 1, None),
    ("Perimeter Barrier Spray",   "Pest Control", "Outdoor Defense", 1, None),
]
CATS = ["Food Storage", "Shoe Care", "Home Cleaning", "Air Care", "Pest Control"]

# ------------------------------------------------------ category-level targets (DATA-6)
ANNUAL_SALES = {"Food Storage": 9_011_607.98,  # exact sum of subcats; displays as $9.0M
                "Shoe Care": 4_500_000, "Home Cleaning": 4_400_000,
                "Air Care": 4_300_000, "Pest Control": 4_200_000}
ANNUAL_UNITS = {"Food Storage": 602_205, "Shoe Care": 567_947, "Home Cleaning": 625_335,
                "Air Care": 565_073, "Pest Control": 565_384}
VS_PLAN_Y = {"Food Storage": -0.053, "Shoe Care": -0.020, "Home Cleaning": -0.030,
             "Air Care": -0.022, "Pest Control": -0.018}
VS_PY_Y = {"Food Storage": 0.072, "Shoe Care": 0.134, "Home Cleaning": 0.125,
           "Air Care": 0.111, "Pest Control": 0.115}
MARGIN = {"Food Storage": 0.518, "Shoe Care": 0.554, "Home Cleaning": 0.494,
          "Air Care": 0.541, "Pest Control": 0.528}        # simple avg = 52.7% (C2)
DEC_SALES = {"Food Storage": 670_566, "Shoe Care": 451_700, "Home Cleaning": 435_800,
             "Air Care": 424_357, "Pest Control": 419_200}   # sums to 2,401,623 (C1/C3)
MOM_DEC = {"Food Storage": -0.145, "Shoe Care": 0.030, "Home Cleaning": 0.025,
           "Air Care": 0.025, "Pest Control": 0.011}         # brief detail paragraph
FS_SUB_ANNUAL = {"Vacuum Sealers": (5_300_000, 180_394), "Containers": (2_400_000, 181_698),
                 "Bags & Wraps": (1_311_607.98, 240_113)}
# Bags & Wraps SKU annual rows (DASH-12, exact): sales, units, vs_plan, dec_sales, dec_py, in_stock, dos, $/linft, promo, trip, basket
BW = {
    "Gallon Zip Bags 75ct":     dict(sales=421_968.35, units=60_365, vplan=-0.073, dec=33_500, in_stock=75.5, dos=7.0, dpl=54.56, promo=26.3, trip=8.3, batt=29.6),
    "Aluminum Foil Heavy Duty": dict(sales=389_000.00, units=59_747, vplan=-0.088, dec=28_000, in_stock=77.5, dos=5.8, dpl=47.40, promo=26.8, trip=7.8, batt=37.6),
    "Sandwich Bags 150ct":      dict(sales=270_000.00, units=57_963, vplan=-0.028, dec=21_500, in_stock=87.2, dos=6.3, dpl=64.98, promo=35.0, trip=6.7, batt=35.0),
    "Cling Wrap 200ft":         dict(sales=231_000.00, units=62_038, vplan=-0.038, dec=17_000, in_stock=81.5, dos=4.1, dpl=54.23, promo=26.3, trip=6.8, batt=34.6),
}
# Named current-month SKU sales: (dec_sales, yoy_dec or None, mom_dec or None)  [C4/C5]
DEC_SKU = {  # top movers (yoy)
    "Stain Remover Spray": (40_000, 14.789, None), "Suede & Nubuck Cleaner": (49_000, 14.385, None),
    "Liquid Laundry Detergent": (94_000, 14.385, None), "Sneaker Cleaning Kit": (92_000, 14.385, None),
    "Indoor Bug Spray": (45_000, 14.19, None),
    # underperformers (yoy) - BW members get dec from BW table above
    "Vacuum Seal Rolls 3-Pack": (77_000, 7.495, None), "Meal Prep Containers 15ct": (40_000, 7.705, None),
    "Vacuum Seal Bags Quart 50ct": (66_000, 7.714, 0.48),  # also on New Items card (+48% MoM)
    # new items (mom)
    "Boot Weather Guard": (70_000, None, 0.40), "Plug-In Air Freshener Starter": (57_000, None, 0.44),
    "Citrus Burst Votive 6-Pack": (53_000, None, 0.36), "Plastic Container Set 20pc": (52_000, None, 0.49),
}
UNDERPERF_YOY = {"Cling Wrap 200ft": 7.475, "Aluminum Foil Heavy Duty": 7.686}  # BW members
# DASH-12 annual category drill-down metrics (sku-grain definitions, C7)
CAT12 = {  # in_stock, dos, promo, trip, batt, $/linft
    "Food Storage": (79.5, 6.1, 26.5, 7.8, 34.1, 75.5), "Shoe Care": (79.4, 5.3, 22.6, 7.6, 34.8, 59.4),
    "Home Cleaning": (80.3, 6.4, 24.6, 7.9, 35.0, 57.4), "Air Care": (79.7, 5.5, 25.5, 7.8, 34.5, 61.3),
    "Pest Control": (78.2, 5.5, 24.8, 7.1, 32.8, 61.6),
}
FS_SUB12 = {  # subcat: in_stock, dos, promo, trip, batt, $/linft, vs_plan, vs_py
    "Vacuum Sealers": (78.7, 5.0, 25.8, 7.5, 33.6, 105.1, -0.039, 0.082),
    "Containers":     (79.2, 7.5, 24.3, 8.5, 34.6, 73.0, -0.060, 0.096),
    "Bags & Wraps":   (80.4, 5.8, 28.6, 7.4, 34.2, 55.3, -0.057, 0.047),
}
# DASH-7 category-management KPIs (category-grain definitions, C6)
CAT7 = {  # growth_pp, trip, batt, $/linft, plano, launched, successful
    "Air Care": (10.8, 63.7, 38.4, 326, 97, 9, 4), "Home Cleaning": (7.6, 57.8, 37.6, 259, 96, 10, 1),
    "Food Storage": (7.0, 53.0, 35.0, 375, 89, 10, 2), "Pest Control": (4.0, 54.1, 38.2, 252, 96, 9, 1),
    "Shoe Care": (1.7, 69.5, 32.3, 234, 94, 9, 1),
}
# headline scalars (DASH-3/9)
TXNS_DEC, TRAFFIC_DEC, TRAFFIC_YOY = 172_948, 432_370, -0.027
ECOM_DEC, ECOM_YOY, ECOM_CONV_DEC = 631_000, 0.09, 6.1
COMP_DEC, COMP_YOY = 2_200_000, 0.021
OTD, CASE_FILL, OTIF, NPS, PL_SHARE = 94.0, 96.7, 92.7, 63, 0.247
# 2025 monthly shape (Jan..Oct free months; Nov/Dec forced) - dip at 02, ~$2.4M at 04
SHAPE_10 = np.array([1.78, 1.65, 2.45, 2.40, 2.45, 2.10, 2.05, 2.30, 2.25, 2.20])

def month_split(annual, dec, nov, shape=SHAPE_10):
    """Split an annual total into 12 months with Nov/Dec fixed."""
    rest = annual - dec - nov
    w = shape / shape.sum()
    return list(np.round(rest * w, 2)) + [round(nov, 2), round(dec, 2)]

def ann25_target(c):
    return ANNUAL_SALES[c]

def build():
    # ---- dim_store
    stores = pd.DataFrame(STORES, columns=["store_name", "region", "city", "state", "latitude",
                                           "longitude", "in_stock_target", "nil_picks", "days_supply_target", "opened_date"])
    stores.insert(0, "store_id", [f"ST-{i+101}" for i in range(len(stores))])
    stores["is_comp_store"] = (stores.store_name != NON_COMP)

    # ---- dim_product
    prod = pd.DataFrame(PRODUCTS, columns=["product_name", "category", "subcategory", "is_new_item", "fixed_margin"])
    prod.insert(0, "sku_id", [f"SKU-{10001+i}" for i in range(len(prod))])
    prod["upc"] = [f"0411000000{29+i:02d}" if 29+i < 100 else f"04110000{129+i-100:04d}" for i in range(len(prod))]
    # video UPCs: Gallon=...29, Sandwich=...30, Cling=...31, AlumFoil=...32 -> reorder upc by fixed map
    upc_fix = {"Gallon Zip Bags 75ct": "041100000029", "Sandwich Bags 150ct": "041100000030",
               "Cling Wrap 200ft": "041100000031", "Aluminum Foil Heavy Duty": "041100000032"}
    taken = set(upc_fix.values())
    pool = [u for u in (f"0411000000{n:02d}" for n in range(33, 33 + 60)) if u not in taken]
    prod["upc"] = prod.product_name.map(upc_fix).fillna(pd.Series(pool[:len(prod)], index=prod.index))
    prod["new_item_pct"] = prod.is_new_item * 100

    # private-label flags: greedily pick non-named SKUs until Dec PL share ~ 24.7%
    named = set(DEC_SKU) | set(BW)
    prod["is_private_label"] = False

    # ---- per-SKU December sales within each category
    dec_sku = {}
    for c in CATS:
        skus = prod[prod.category == c]
        fixed = {n: (BW[n]["dec"] if n in BW else DEC_SKU[n][0]) for n in skus.product_name if n in named}
        rest = [n for n in skus.product_name if n not in fixed]
        remainder = DEC_SALES[c] - sum(fixed.values())
        assert remainder > 0, c
        w = rng.dirichlet(np.ones(len(rest)) * 8)          # mild spread
        for n, share in zip(rest, w):
            fixed[n] = round(remainder * share, 2)
        # rounding residual -> last sku
        fixed[rest[-1]] = round(fixed[rest[-1]] + DEC_SALES[c] - sum(fixed.values()), 2)
        dec_sku.update(fixed)

    # FS subcategory Dec targets: BW=100,000 exact; VS/CT carry the underperformer/new-item SKUs
    fs_dec_bw = sum(BW[n]["dec"] for n in BW)
    assert fs_dec_bw == 100_000

    # ---- per-SKU annual 2025 sales
    ann_sku = {}
    for c in CATS:
        skus = prod[prod.category == c]
        if c == "Food Storage":
            for sub, (s_ann, _) in FS_SUB_ANNUAL.items():
                sub_skus = skus[skus.subcategory == sub]
                fixed = {n: BW[n]["sales"] for n in sub_skus.product_name if n in BW}
                rest = [n for n in sub_skus.product_name if n not in fixed]
                remainder = s_ann - sum(fixed.values())
                if rest:
                    w = rng.dirichlet(np.ones(len(rest)) * 6)
                    for n, share in zip(rest, w):
                        fixed[n] = round(remainder * share, 2)
                    fixed[rest[-1]] = round(fixed[rest[-1]] + s_ann - sum(fixed.values()), 2)
                ann_sku.update(fixed)
        else:
            w = rng.dirichlet(np.ones(len(skus)) * 6)
            vals = {n: round(ANNUAL_SALES[c] * s, 2) for n, s in zip(skus.product_name, w)}
            # ensure annual >= 12x is not required; but annual must exceed Dec sales comfortably
            for n in vals:
                vals[n] = max(vals[n], dec_sku[n] * 6)
            scale = (ANNUAL_SALES[c] - 0) / sum(vals.values())
            vals = {n: round(v * scale, 2) for n, v in vals.items()}
            k = list(vals)[-1]
            vals[k] = round(vals[k] + ANNUAL_SALES[c] - sum(vals.values()), 2)
            ann_sku.update(vals)

    # ---- monthly 2025 per SKU: Dec fixed; Nov solved per category (named MoM SKUs pinned)
    nov_sku = {}
    for c in CATS:
        names = list(prod[prod.category == c].product_name)
        cat_nov = DEC_SALES[c] / (1 + MOM_DEC[c])                  # exact category MoM
        pinned = {n: dec_sku[n] / (1 + DEC_SKU[n][2]) for n in names
                  if n in DEC_SKU and DEC_SKU[n][2] is not None}   # new-items card MoM
        free = [n for n in names if n not in pinned]
        rest = cat_nov - sum(pinned.values())
        dec_rest = sum(dec_sku[n] for n in free)
        for n in free:
            pinned[n] = rest * dec_sku[n] / dec_rest               # proportional to Dec
        nov_sku.update({k: round(v, 2) for k, v in pinned.items()})
    # annual floor so Jan-Oct stays positive, then rescale unfixed SKUs to keep cat annual exact
    for c in CATS:
        names = list(prod[prod.category == c].product_name)
        fixed_ann = {n for n in names if n in BW}
        for n in names:
            if n not in fixed_ann:
                ann_sku[n] = max(ann_sku[n], (dec_sku[n] + nov_sku[n]) * 1.9)
        target = ANNUAL_SALES[c] - sum(ann_sku[n] for n in fixed_ann)
        free = [n for n in names if n not in fixed_ann]
        floor = {n: (dec_sku[n] + nov_sku[n]) * 1.9 for n in free}
        slack = target - sum(floor.values())
        assert slack > 0, c
        extra = {n: ann_sku[n] - floor[n] for n in free}
        f = slack / sum(extra.values())
        for n in free:
            ann_sku[n] = round(floor[n] + extra[n] * f, 2)
    rows = []
    for c in CATS:
        for n in prod[prod.category == c].product_name:
            ann, dec, nov_n = ann_sku[n], dec_sku[n], nov_sku[n]
            w = SHAPE_10 / SHAPE_10.sum()
            early = (ann - dec - nov_n) * w
            months = [round(x, 2) for x in early] + [nov_n, dec]
            months[9] = round(months[9] + ann - sum(months), 2)    # rounding residual -> Oct
            for mth, amt in zip(MONTHS_2025, months):
                rows.append((mth, n, amt))
    sku_month = pd.DataFrame(rows, columns=["month", "product_name", "sales"])

    # ---- 2024 (PY): all SKUs have full history; named movers/underperformers get pinned
    #      small Dec-2024 (their card %% = Dec YoY); category 2024 annual = actual/(1+YoY) exact.
    py_dec = {}
    for n, (dec, yoy, _) in DEC_SKU.items():
        if yoy is not None:
            py_dec[n] = round(dec / (1 + yoy), 2)
    for n, yoy in UNDERPERF_YOY.items():
        py_dec[n] = round(BW[n]["dec"] / (1 + yoy), 2)
    comp_dec24 = COMP_DEC / (1 + COMP_YOY)                       # chain Dec-2024 (Edison closed)
    # category Dec-2024: pinned SKUs keep py_dec; spread the remainder proportional to cat size
    cat_ann24 = {c: ann25_target(c) / (1 + VS_PY_Y[c]) for c in CATS}
    pinned_dec24 = {c: sum(py_dec.get(n, 0) for n in prod[prod.category == c].product_name) for c in CATS}
    free_dec24_total = comp_dec24 - sum(pinned_dec24.values())
    free_w = {c: cat_ann24[c] - pinned_dec24[c] for c in CATS}
    fw_sum = sum(free_w.values())
    rows24 = []
    shape11 = np.array(list(SHAPE_10) + [2.35]); shape11 = shape11 / shape11.sum()
    for c in CATS:
        names = list(prod[prod.category == c].product_name)
        cat_dec24 = pinned_dec24[c] + free_dec24_total * free_w[c] / fw_sum
        dec24 = {n: py_dec[n] for n in names if n in py_dec}
        free = [n for n in names if n not in dec24]
        rest = cat_dec24 - sum(dec24.values())
        wsum = sum(ann_sku[n] for n in free)
        for n in free:
            dec24[n] = rest * ann_sku[n] / wsum
        # Jan-Nov 2024 fills the category annual exactly
        rest_ann = cat_ann24[c] - cat_dec24
        for n in names:
            sku_rest = rest_ann * ann_sku[n] / sum(ann_sku[m] for m in names)
            for mth, ms in zip(MONTHS_2024[:11], shape11):
                rows24.append((mth, n, round(sku_rest * ms, 2)))
            rows24.append((MONTHS_2024[-1], n, round(dec24[n], 2)))
    sku_month24 = pd.DataFrame(rows24, columns=["month", "product_name", "sales"])
    sku_month = pd.concat([sku_month24, sku_month], ignore_index=True)

    # ---- store x SKU x month fact
    pmap = prod.set_index("product_name")
    sw = pd.Series(STORE_W, index=STORE_NAMES)
    edison_zero = set(MONTHS_2024 + MONTHS_2025[:2])      # Edison opened 2025-03
    facts = []
    for (mth, n), amt in sku_month.set_index(["month", "product_name"]).sales.items():
        w = sw.copy()
        if mth in edison_zero:
            w[NON_COMP] = 0.0
        w = w / w.sum()
        alloc = (w * amt).round(2)
        alloc[w.index[-1]] += round(amt - alloc.sum(), 2)
        for st, a in alloc.items():
            facts.append((mth, st, n, a))
    fact = pd.DataFrame(facts, columns=["month", "store_name", "product_name", "sales_amt"])

    # Force Yonkers/Paramus Bags & Wraps Dec cells (DASH-13): Yonkers 11,000 / Paramus 8,000
    bw_names = list(BW)
    dec_bw = fact[(fact.month == CUR) & (fact.product_name.isin(bw_names))]
    for target_store, target_amt in [("Yonkers Center", 11_000.0), ("Paramus Park", 8_000.0)]:
        cur_amt = dec_bw[dec_bw.store_name == target_store].sales_amt.sum()
        f = target_amt / cur_amt
        m = (fact.month == CUR) & (fact.product_name.isin(bw_names)) & (fact.store_name == target_store)
        fact.loc[m, "sales_amt"] = (fact.loc[m, "sales_amt"] * f).round(2)
    # re-balance other stores so BW SKU Dec totals stay exact
    dec_bw = fact[(fact.month == CUR) & (fact.product_name.isin(bw_names))]
    others = ~dec_bw.store_name.isin(["Yonkers Center", "Paramus Park"])
    for n in bw_names:
        cur_tot = dec_bw[dec_bw.product_name == n].sales_amt.sum()
        oth = dec_bw[(dec_bw.product_name == n) & others]
        f = (BW[n]["dec"] - dec_bw[(dec_bw.product_name == n) & ~others].sales_amt.sum()) / oth.sales_amt.sum()
        m = (fact.month == CUR) & (fact.product_name == n) & (~fact.store_name.isin(["Yonkers Center", "Paramus Park"]))
        fact.loc[m, "sales_amt"] = (fact.loc[m, "sales_amt"] * f).round(2)
        # rounding residual onto Brooklyn Heights
        m2 = m & (fact.store_name == "Brooklyn Heights")
        resid = BW[n]["dec"] - fact.loc[(fact.month == CUR) & (fact.product_name == n), "sales_amt"].sum()
        fact.loc[m2, "sales_amt"] = (fact.loc[m2, "sales_amt"] + resid).round(2)

    # comp-store Dec: scale comp stores to 2.2M and Edison takes the remainder (C: comp +2.1% YoY)
    dec_m = fact.month == CUR
    comp_m = dec_m & (fact.store_name != NON_COMP)
    f = COMP_DEC / fact.loc[comp_m, "sales_amt"].sum()
    fact.loc[comp_m, "sales_amt"] = fact.loc[comp_m, "sales_amt"] * f
    ed_m = dec_m & (fact.store_name == NON_COMP)
    f2 = (2_401_623 - COMP_DEC) / fact.loc[ed_m, "sales_amt"].sum()
    fact.loc[ed_m, "sales_amt"] = fact.loc[ed_m, "sales_amt"] * f2
    # restore exact category Dec totals after store re-scaling (proportional within category x store-group)
    for c in CATS:
        names = prod[prod.category == c].product_name
        m = dec_m & fact.product_name.isin(names) & ~fact.product_name.isin(bw_names)
        bw_dec_c = fact.loc[dec_m & fact.product_name.isin(names) & fact.product_name.isin(bw_names), "sales_amt"].sum()
        f3 = (DEC_SALES[c] - bw_dec_c) / fact.loc[m, "sales_amt"].sum()
        fact.loc[m, "sales_amt"] = fact.loc[m, "sales_amt"] * f3
    fact["sales_amt"] = fact.sales_amt.round(2)

    # ---- units, margin, plan, py columns
    price = {}
    for c in CATS:
        for _, r in prod[prod.category == c].iterrows():
            if c == "Food Storage":
                s_ann, u_ann = FS_SUB_ANNUAL[r.subcategory]
                price[r.product_name] = s_ann / u_ann            # subcat-level price
            else:
                price[r.product_name] = ANNUAL_SALES[c] / ANNUAL_UNITS[c]
    for n in BW:                                                  # exact BW unit prices
        price[n] = BW[n]["sales"] / BW[n]["units"]
    fact["units"] = (fact.sales_amt / fact.product_name.map(price)).round().astype(int)
    # margins: BW fixed; others solved per category so annual cat margin hits target
    mfix = prod.set_index("product_name").fixed_margin / 100
    sku_margin = {}
    ann25 = fact[fact.month.isin(MONTHS_2025)].groupby("product_name").sales_amt.sum()
    for c in CATS:
        names = list(prod[prod.category == c].product_name)
        fixed = {n: mfix[n] for n in names if pd.notna(mfix[n])}
        free = [n for n in names if n not in fixed]
        target_amt = MARGIN[c] * ann25[names].sum()
        fixed_amt = sum(ann25[n] * m for n, m in fixed.items())
        base = (target_amt - fixed_amt) / ann25[free].sum()
        spread = rng.uniform(-0.02, 0.02, len(free)); spread -= spread.mean()
        for n, s in zip(free, spread):
            sku_margin[n] = round(base + s, 4)
        sku_margin.update(fixed)
    fact["margin_amt"] = (fact.sales_amt * fact.product_name.map(sku_margin)).round(2)
    # plan (2025 rows): BW SKUs pinned to exact annual ratios; non-BW solved per category;
    # then chain Dec vs plan = -11.2%% via Dec uplift on non-BW rows, compensated in the same
    # category's Jan-Oct so category annual vs-plan stays exact.
    fact["plan_amt"] = 0.0
    m25 = fact.month.isin(MONTHS_2025)
    cat_of = pmap.category
    fact["category"] = fact.product_name.map(cat_of)
    for n in BW:
        m = m25 & (fact.product_name == n)
        fact.loc[m, "plan_amt"] = fact.loc[m, "sales_amt"] / (1 + BW[n]["vplan"])
    bw_set = set(BW)
    for c in CATS:
        cat_target = ann25_target(c) / (1 + VS_PLAN_Y[c])
        mc = m25 & (fact.category == c)
        bw_amt = fact.loc[mc & fact.product_name.isin(bw_set), "plan_amt"].sum()
        m_free = mc & ~fact.product_name.isin(bw_set)
        f = (cat_target - bw_amt) / fact.loc[m_free, "sales_amt"].sum()
        fact.loc[m_free, "plan_amt"] = fact.loc[m_free, "sales_amt"] * f
    dec_plan_target = 2_401_623 / (1 - 0.112)
    delta = dec_plan_target - fact.loc[dec_m, "plan_amt"].sum()
    early = fact.month.isin(MONTHS_2025[:10])
    for c in CATS:
        md = dec_m & (fact.category == c) & ~fact.product_name.isin(bw_set)
        me = early & (fact.category == c) & ~fact.product_name.isin(bw_set)
        share = fact.loc[md, "plan_amt"].sum() / fact.loc[dec_m & ~fact.product_name.isin(bw_set), "plan_amt"].sum()
        d_c = delta * share
        fact.loc[md, "plan_amt"] *= (1 + d_c / fact.loc[md, "plan_amt"].sum())
        fact.loc[me, "plan_amt"] *= (1 - d_c / fact.loc[me, "plan_amt"].sum())
    fact["plan_amt"] = fact.plan_amt.round(2)
    fact = fact.drop(columns=["category"])
    # py_sales_amt on 2025 rows = same store/sku 2024 month
    py = fact[fact.month.isin(MONTHS_2024)].copy()
    py["month"] = py.month.str.replace("2024", "2025")
    fact = fact.merge(py.rename(columns={"sales_amt": "py_sales_amt"})[["month", "store_name", "product_name", "py_sales_amt"]],
                      on=["month", "store_name", "product_name"], how="left")
    fact["py_sales_amt"] = fact.py_sales_amt.fillna(0.0)

    # sku-grain rate metrics (C7): category/subcat targets with per-sku solve; BW exact
    def rate_cols(col, cat_idx, bw_key):
        out = {}
        for c in CATS:
            names = list(prod[prod.category == c].product_name)
            fixed = {n: BW[n][bw_key] for n in names if n in BW}
            free = [n for n in names if n not in fixed]
            target = CAT12[c][cat_idx]
            fixed_amt = sum(ann25[n] * v for n, v in fixed.items())
            base = (target * ann25[names].sum() - fixed_amt) / ann25[free].sum()
            spread = rng.uniform(-0.08, 0.08, len(free)) * base; spread -= spread.mean()
            for n, s in zip(free, spread):
                out[n] = round(base + s, 2)
            out.update(fixed)
        return out
    promo = rate_cols("promo_lift_pct", 2, "promo")
    trip = rate_cols("trip_conversion_pct", 3, "trip")
    batt = rate_cols("basket_attach_pct", 4, "batt")
    fact["promo_lift_pct"] = fact.product_name.map(promo)
    fact["trip_conversion_pct"] = fact.product_name.map(trip)
    fact["basket_attach_pct"] = fact.product_name.map(batt)
    # linear feet per SKU so that annual/12/linft hits DASH-12 $/lin-ft (BW exact, cat exact via slack)
    linft = {}
    for c in CATS:
        names = list(prod[prod.category == c].product_name)
        fixed = {n: ann25[n] / 12 / BW[n]["dpl"] for n in names if n in BW}
        free = [n for n in names if n not in fixed]
        cat_target_ft = ann25[names].sum() / 12 / CAT12[c][5]
        rest_ft = cat_target_ft - sum(fixed.values())
        w = ann25[free] / ann25[free].sum()
        for n in free:
            linft[n] = round(rest_ft * w[n], 2)
        linft.update({k: round(v, 2) for k, v in fixed.items()})
    prod["linear_feet"] = prod.product_name.map(linft)

    # private label: greedy pick of unnamed SKUs closest to 24.7% of Dec sales
    target_pl = PL_SHARE * 2_401_623
    cands = sorted([(dec_sku[n], n) for n in dec_sku if n not in named], reverse=True)
    acc, chosen = 0.0, []
    for amt, n in cands:
        if acc + amt <= target_pl * 1.01:
            acc += amt; chosen.append(n)
    prod["is_private_label"] = prod.product_name.isin(chosen)

    # ---- inventory (current month, store x SKU): additive model + exact fixups
    cat_in = {c: CAT12[c][0] for c in CATS}
    sku_in = {}
    for c in CATS:
        names = list(prod[prod.category == c].product_name)
        fixed = {n: BW[n]["in_stock"] for n in names if n in BW}
        free = [n for n in names if n not in fixed]
        base = (cat_in[c] * len(names) - sum(fixed.values())) / len(free)  # simple avg rollup
        spread = rng.uniform(-2.5, 2.5, len(free)); spread -= spread.mean()
        for n, s in zip(free, spread):
            sku_in[n] = round(base + s, 1)
        sku_in.update(fixed)
    chain_avg = np.mean([v for v in sku_in.values()])
    inv_rows = []
    dec_units = fact[dec_m].groupby(["store_name", "product_name"]).units.sum()
    sku_dos = {}
    for c in CATS:
        names = list(prod[prod.category == c].product_name)
        fixed = {n: BW[n]["dos"] for n in names if n in BW}
        free = [n for n in names if n not in fixed]
        base = (CAT12[c][1] * len(names) - sum(fixed.values())) / len(free)
        spread = rng.uniform(-0.8, 0.8, len(free)); spread -= spread.mean()
        for n, s in zip(free, spread):
            sku_dos[n] = round(base + s, 1)
        sku_dos.update(fixed)
    for _, st in stores.iterrows():
        st_dev = st.in_stock_target - 79.45
        dos_dev = st.days_supply_target - np.mean(list(sku_dos.values()))
        nil_w = rng.dirichlet(np.ones(len(prod)))
        for j, (_, p) in enumerate(prod.iterrows()):
            in_stock = sku_in[p.product_name] + st_dev
            dos = max(sku_dos[p.product_name] + dos_dev, 1.0)
            daily = dec_units.get((st.store_name, p.product_name), 0) / 30.0
            inv_rows.append((st.store_name, p.product_name, round(in_stock, 1), round(dos, 1),
                             int(round(daily * dos)), int(round(st.nil_picks * nil_w[j]))))
    inv = pd.DataFrame(inv_rows, columns=["store_name", "product_name", "in_stock_pct", "days_supply", "on_hand_units", "nil_picks"])
    # exact Paramus x Bags & Wraps popup: in-stock 83.3, on-hand 443 (DASH-13)
    pm = (inv.store_name == "Paramus Park") & (inv.product_name.isin(bw_names))
    delta = 83.3 - inv.loc[pm, "in_stock_pct"].mean()
    inv.loc[pm, "in_stock_pct"] = (inv.loc[pm, "in_stock_pct"] + delta).round(1)
    om = pm & True
    f6 = 443 / inv.loc[pm, "on_hand_units"].sum()
    inv.loc[pm, "on_hand_units"] = (inv.loc[pm, "on_hand_units"] * f6).round().astype(int)
    resid = 443 - inv.loc[pm, "on_hand_units"].sum()
    first_idx = inv.loc[pm].index[0]
    inv.loc[first_idx, "on_hand_units"] += resid
    # compensate other stores so BW SKU-level avgs stay exact
    for n in bw_names:
        mm = (inv.product_name == n) & (inv.store_name != "Paramus Park")
        cur = inv.loc[inv.product_name == n, "in_stock_pct"].mean()
        adj = (BW[n]["in_stock"] * 15 - inv.loc[inv.product_name == n, "in_stock_pct"].sum()) / mm.sum()
        inv.loc[mm, "in_stock_pct"] = (inv.loc[mm, "in_stock_pct"] + adj).round(2)
    # exact store-level marginals (DASH-10) - final pass adjusts non-BW cells per store
    for _, st in stores.iterrows():
        mm = (inv.store_name == st.store_name) & (~inv.product_name.isin(bw_names)) \
             if st.store_name == "Paramus Park" else (inv.store_name == st.store_name)
        cur_mean = inv.loc[inv.store_name == st.store_name, "in_stock_pct"].mean()
        adj = (st.in_stock_target * len(prod) - inv.loc[inv.store_name == st.store_name, "in_stock_pct"].sum()) / mm.sum()
        inv.loc[mm, "in_stock_pct"] = (inv.loc[mm, "in_stock_pct"] + adj).round(3)
        # days-supply store marginal
        mm2 = inv.store_name == st.store_name
        adj2 = (st.days_supply_target * len(prod) - inv.loc[mm2, "days_supply"].sum()) / len(prod)
        inv.loc[mm2, "days_supply"] = (inv.loc[mm2, "days_supply"] + adj2).clip(lower=0.5).round(2)
        # nil picks exact per store
        cur_np = inv.loc[mm2, "nil_picks"].sum()
        idx0 = inv.loc[mm2].index[0]
        inv.loc[idx0, "nil_picks"] += int(st.nil_picks - cur_np)
    inv["as_of_month"] = CUR

    # ---- store traffic / transactions (Dec exact, history shaped)
    tr_rows = []
    for mth in ALL_MONTHS:
        msales = fact.loc[fact.month == mth].groupby("store_name").sales_amt.sum()
        tot = msales.sum()
        scale_t = TRAFFIC_DEC / 2_401_623
        scale_x = TXNS_DEC / 2_401_623
        for st_name, s in msales.items():
            traffic = s * scale_t * (1 + rng.uniform(-0.03, 0.03))
            txns = s * scale_x * (1 + rng.uniform(-0.02, 0.02))
            tr_rows.append((mth, st_name, int(round(traffic)), int(round(txns))))
    traf = pd.DataFrame(tr_rows, columns=["month", "store_name", "customer_traffic", "transactions"])
    for mth, tgt_traffic, tgt_txn in [(CUR, TRAFFIC_DEC, TXNS_DEC),
                                      ("2024-12", round(TRAFFIC_DEC / (1 + TRAFFIC_YOY)), None)]:
        mm = traf.month == mth
        f7 = tgt_traffic / traf.loc[mm, "customer_traffic"].sum()
        traf.loc[mm, "customer_traffic"] = (traf.loc[mm, "customer_traffic"] * f7).round().astype(int)
        d = tgt_traffic - traf.loc[mm, "customer_traffic"].sum()
        traf.loc[traf.loc[mm].index[0], "customer_traffic"] += int(d)
        if tgt_txn:
            f8 = tgt_txn / traf.loc[mm, "transactions"].sum()
            traf.loc[mm, "transactions"] = (traf.loc[mm, "transactions"] * f8).round().astype(int)
            d2 = tgt_txn - traf.loc[mm, "transactions"].sum()
            traf.loc[traf.loc[mm].index[0], "transactions"] += int(d2)

    # ---- channel (e-commerce vs store) + e-com conversion trend
    ch_rows = []
    conv_path = np.linspace(5.0, ECOM_CONV_DEC, 12)  # rising conversion through 2025
    for i, mth in enumerate(ALL_MONTHS):
        tot = fact.loc[fact.month == mth, "sales_amt"].sum()
        if mth == CUR:
            ecom = ECOM_DEC
        elif mth == "2024-12":
            ecom = round(ECOM_DEC / (1 + ECOM_YOY), 2)
        else:
            ecom = round(tot * rng.uniform(0.24, 0.27), 2)
        conv = conv_path[i - 12] if i >= 12 else round(4.2 + 0.06 * i + rng.uniform(-0.1, 0.1), 2)
        orders = int(round(ecom / 38.5))                      # ~$38.5 e-com AOV
        sessions = int(round(orders / (conv / 100)))
        ch_rows.append((mth, "e-commerce", ecom, sessions, orders, round(conv, 1)))
        ch_rows.append((mth, "store", round(tot - ecom, 2), None, None, None))
    chan = pd.DataFrame(ch_rows, columns=["month", "channel", "sales_amt", "sessions", "orders", "conversion_pct"])

    # ---- supply chain & experience
    sc_rows, ex_rows = [], []
    for i, mth in enumerate(ALL_MONTHS):
        if mth == CUR:
            otd, cf, ot, nps = OTD, CASE_FILL, OTIF, NPS
        else:
            otd = round(OTD + rng.uniform(-1.8, 1.2), 1)
            cf = round(CASE_FILL + rng.uniform(-1.2, 0.8), 1)
            ot = round(OTIF + rng.uniform(-1.5, 1.0), 1)
            nps = int(round(NPS + rng.uniform(-5, 2)))
        sc_rows.append((mth, otd, cf, ot))
        ex_rows.append((mth, nps))
    supply = pd.DataFrame(sc_rows, columns=["month", "on_time_delivery_pct", "case_fill_rate_pct", "otif_pct"])
    exper = pd.DataFrame(ex_rows, columns=["month", "nps_score"])

    # ---- category market KPIs (DASH-7, C6)
    cm_rows = []
    for c, (g, t, b, d, p, nl, ns) in CAT7.items():
        cm_rows.append((CUR, c, g, t, b, float(d), p, nl, ns))
    catmkt = pd.DataFrame(cm_rows, columns=["month", "category", "growth_vs_market_pp", "trip_conversion_pct",
                                            "basket_attach_pct", "dollars_per_linear_foot", "planogram_compliance_pct",
                                            "new_items_launched", "new_items_successful"])

    # ---- weekly sales (category x store x week, 2025 + Dec-2024)
    wk_rows = []
    week_starts = pd.date_range("2024-12-02", "2025-12-29", freq="W-MON")
    fact_cat = fact.merge(prod[["product_name", "category"]], on="product_name")
    msum = fact_cat.groupby(["month", "category", "store_name"]).sales_amt.sum()
    for wk in week_starts:
        mth = f"{wk.year}-{wk.month:02d}"
        if mth not in ALL_MONTHS:
            continue
        n_wk = max(len([w for w in week_starts if f"{w.year}-{w.month:02d}" == mth]), 1)
        sub = msum.loc[mth]
        for (c, st_name), amt in sub.items():
            wk_rows.append((wk.date().isoformat(), c, st_name, round(amt / n_wk * rng.uniform(0.92, 1.08), 2)))
    weekly = pd.DataFrame(wk_rows, columns=["week_start", "category", "store_name", "sales_amt"])
    # normalize weeks so each month's weeks sum to the month (per category x store)
    weekly["month"] = weekly.week_start.str.slice(0, 7)
    grp = weekly.groupby(["month", "category", "store_name"]).sales_amt.transform("sum")
    tgt = weekly.set_index(["month", "category", "store_name"]).index.map(msum)
    weekly["sales_amt"] = (weekly.sales_amt / grp * tgt).round(2)
    weekly = weekly.drop(columns=["month"])

    # ---- dim_date (month grain)
    dd = pd.DataFrame({"month": ALL_MONTHS})
    dd["month_start_date"] = pd.to_datetime(dd.month + "-01").dt.date
    dd["year"] = dd.month.str.slice(0, 4).astype(int)
    dd["month_label"] = dd.month.str.slice(5, 7)
    dd["is_current_month"] = dd.month == CUR

    # ---- ids onto facts
    sid = stores.set_index("store_name").store_id
    kid = prod.set_index("product_name").sku_id
    for df in (fact, inv):
        df.insert(1, "store_id", df.store_name.map(sid))
        df.insert(2, "sku_id", df.product_name.map(kid))
        df.drop(columns=["store_name", "product_name"], inplace=True)
    traf.insert(1, "store_id", traf.store_name.map(sid)); traf.drop(columns=["store_name"], inplace=True)
    weekly.insert(2, "store_id", weekly.store_name.map(sid)); weekly.drop(columns=["store_name"], inplace=True)
    stores = stores.drop(columns=["in_stock_target", "days_supply_target", "nil_picks"])
    prod = prod.drop(columns=["fixed_margin"])
    return dict(dim_store=stores, dim_product=prod, dim_date=dd, fact_sales=fact,
                fact_inventory=inv, fact_store_traffic=traf, fact_channel=chan,
                fact_supply_chain=supply, fact_experience=exper,
                fact_category_market=catmkt, fact_sales_weekly=weekly)


TABLE_COMMENTS = {
    "dim_store": "15 retail stores across the NY/NJ/CT tri-state. Edison Marketplace opened 2025-03 (non-comp).",
    "dim_product": "47 CPG SKUs across 5 categories / 15 subcategories. new_item_pct is 100 for items launched in late 2024.",
    "dim_date": "Month-grain calendar 2024-01..2025-12. Current month = 2025-12.",
    "fact_sales": "Monthly sales by store x SKU (2024-2025). plan_amt/py_sales_amt populated on 2025 rows. Rate columns are SKU-grain (drill-down definitions).",
    "fact_inventory": "Current-month (2025-12) inventory position by store x SKU.",
    "fact_store_traffic": "Monthly store foot traffic and transaction counts.",
    "fact_channel": "Monthly sales by channel (store vs e-commerce) with e-commerce sessions/orders/conversion.",
    "fact_supply_chain": "Monthly supply-chain service levels: on-time delivery, case fill, OTIF.",
    "fact_experience": "Monthly NPS score.",
    "fact_category_market": "Current-month category-management KPIs (category-grain definitions: growth vs market, trip conversion, basket attach, $/linear-foot, planogram compliance, new-item launches).",
    "fact_sales_weekly": "Weekly sales by category x store (Dec-2024..Dec-2025) for week-over-week questions.",
}

def main():
    from databricks.connect import DatabricksSession
    spark = DatabricksSession.builder.profile("9cefok").serverless(True).getOrCreate()
    tables = build()
    spark.sql(f"CREATE SCHEMA IF NOT EXISTS {FQ}")
    for name, pdf in tables.items():
        sdf = spark.createDataFrame(pdf)
        sdf.write.mode("overwrite").option("overwriteSchema", "true").saveAsTable(f"{FQ}.{name}")
        spark.sql(f"COMMENT ON TABLE {FQ}.{name} IS '{TABLE_COMMENTS[name]}'")
        print(f"wrote {FQ}.{name}: {len(pdf):,} rows")
    print("done")

if __name__ == "__main__":
    main()
