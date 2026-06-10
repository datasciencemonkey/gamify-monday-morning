"""Verify key app data-contract queries against the live Databricks tables."""
from databricks.connect import DatabricksSession

FQ = "serverless_9cefok_catalog.monday_morning"
spark = DatabricksSession.builder.profile("9cefok").serverless(True).getOrCreate()

queries = {
    "exec_kpis": f"""
        SELECT round(sum(sales_amt),0) total_sales,
               round(sum(sales_amt)/sum(plan_amt)-1,3) vs_plan,
               round(sum(margin_amt)/sum(sales_amt)*100,1) wtd_margin_pct
        FROM {FQ}.fact_sales WHERE month='2025-12'""",
    "donut": f"""
        SELECT p.category, round(sum(f.sales_amt),0) sales
        FROM {FQ}.fact_sales f JOIN {FQ}.dim_product p USING(sku_id)
        WHERE f.month='2025-12' GROUP BY 1 ORDER BY 2 DESC""",
    "drilldown_rollup": f"""
        SELECT p.category, round(sum(f.sales_amt)/1e6,1) sales_m, sum(f.units) units,
               round(sum(f.sales_amt)/sum(f.plan_amt)-1,3) vs_plan,
               round(sum(f.margin_amt)/sum(f.sales_amt)*100,1) margin
        FROM {FQ}.fact_sales f JOIN {FQ}.dim_product p USING(sku_id)
        WHERE f.month LIKE '2025-%' GROUP BY 1 ORDER BY 2 DESC""",
    "inventory_ladder": f"""
        SELECT s.store_name, s.region, round(avg(i.in_stock_pct),1) in_stock,
               sum(i.nil_picks) nil_picks, round(avg(i.days_supply),1) days_supply
        FROM {FQ}.fact_inventory i JOIN {FQ}.dim_store s USING(store_id)
        GROUP BY 1,2 ORDER BY 3 ASC LIMIT 5""",
    "top_movers": f"""
        WITH dec AS (SELECT sku_id, sum(sales_amt) s FROM {FQ}.fact_sales WHERE month='2025-12' GROUP BY 1),
        py  AS (SELECT sku_id, sum(sales_amt) s FROM {FQ}.fact_sales WHERE month='2024-12' GROUP BY 1)
        SELECT p.product_name, p.category, round(dec.s/1000,0) dec_k,
               round((dec.s/py.s-1)*100,1) yoy_pct
        FROM dec JOIN py USING(sku_id) JOIN {FQ}.dim_product p USING(sku_id)
        ORDER BY yoy_pct DESC LIMIT 5""",
}
for name, q in queries.items():
    print(f"\n=== {name}")
    for r in spark.sql(q).collect():
        print(" ", r.asDict())
