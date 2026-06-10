import os
import pickle
import numpy as np
import pandas as pd
from flask import Flask, jsonify, request, render_template

app = Flask(__name__, static_folder="static", template_folder="templates")

# Paths
MODELS_DIR = r"c:\Users\user\Desktop\All_projects\CRT (TASKS)\CRT MAJOR PROJECT 2\models"

# Global Variables to store cached data
models = {}
metrics = {}
medians = {}
inventory_base = None
stats_dict = {}
hist_date_aggr = None
hist_store_date_aggr = None
future_date_aggr = None
future_store_date_aggr = None

def shift_date_string(date_str):
    try:
        # date_str is 'YYYY-MM-DD'
        parts = date_str.split('-')
        year = int(parts[0]) + 11
        return f"{year}-{parts[1]}-{parts[2]}"
    except Exception:
        return date_str

def load_resources():
    global models, metrics, medians, inventory_base, stats_dict
    global hist_date_aggr, hist_store_date_aggr, future_date_aggr, future_store_date_aggr
    
    with open(os.path.join(MODELS_DIR, "metrics.pkl"), "rb") as f:
        metrics = pickle.load(f)
        
    with open(os.path.join(MODELS_DIR, "medians.pkl"), "rb") as f:
        medians = pickle.load(f)
        
    with open(os.path.join(MODELS_DIR, "stats.pkl"), "rb") as f:
        stats_dict = pickle.load(f)
        
    with open(os.path.join(MODELS_DIR, "inventory_base.pkl"), "rb") as f:
        inventory_base = pickle.load(f)
        
    hist_date_aggr = pd.read_pickle(os.path.join(MODELS_DIR, "hist_date_aggr.pkl"))
    hist_store_date_aggr = pd.read_pickle(os.path.join(MODELS_DIR, "hist_store_date_aggr.pkl"))
    future_date_aggr = pd.read_pickle(os.path.join(MODELS_DIR, "future_date_aggr.pkl"))
    future_store_date_aggr = pd.read_pickle(os.path.join(MODELS_DIR, "future_store_date_aggr.pkl"))
    
    for name in ["linearregression", "histgradientboosting", "randomforest"]:
        with open(os.path.join(MODELS_DIR, f"model_{name}.pkl"), "rb") as f:
            models[name] = pickle.load(f)
            
    print("Resources loaded successfully.")

# Load resources at server startup
load_resources()

@app.route("/")
def index():
    return render_template("index.html")

@app.route("/api/stats")
def get_stats():
    # Calculate sum of forecast sales from the best model (RandomForest)
    total_forecast = float(future_date_aggr['RF'].sum())
    
    payload = {
        "total_historical_sales": stats_dict["total_historical_sales"],
        "total_profit": stats_dict["total_profit"],
        "mape": stats_dict["mape"],
        "best_store": stats_dict["best_store"],
        "best_store_sales": stats_dict["best_store_sales"],
        "total_rows": stats_dict["total_rows"],
        
        "total_forecast_sales": total_forecast,
        "metrics": metrics,
        
        "category_sales": stats_dict["category_sales"],
        "store_perf": stats_dict["store_perf"],
        "heatmap_data": stats_dict["heatmap_data"],
        "top_5_stores": stats_dict["top_5_stores"],
        "inventory_status_overview": stats_dict["inventory_status_overview"],
        "stockout_alerts": stats_dict["stockout_alerts"],
        "dynamic_insights": stats_dict["dynamic_insights"],
        
        "unique_stores": stats_dict["unique_stores"],
        "unique_depts": stats_dict["unique_depts"]
    }
    return jsonify(payload)

@app.route("/api/charts/actual-vs-predicted")
def get_actual_vs_predicted():
    store = request.args.get("store", "all")
    model_name = request.args.get("model", "RF")
    
    if store == "all":
        df_chart = hist_date_aggr
    else:
        try:
            store_val = int(store)
            df_chart = hist_store_date_aggr[hist_store_date_aggr['Store'] == store_val]
        except ValueError:
            return jsonify({"error": "Invalid store parameter"}), 400
            
    if df_chart.empty:
        return jsonify([])
        
    chart_data = {
        "dates": [shift_date_string(d) for d in df_chart['Date'].tolist()],
        "actual": df_chart['Actual'].tolist(),
        "predicted": df_chart[model_name].tolist()
    }
    return jsonify(chart_data)

@app.route("/api/charts/future-forecast")
def get_future_forecast():
    store = request.args.get("store", "all")
    model_name = request.args.get("model", "RF")
    
    if store == "all":
        df_chart = future_date_aggr
    else:
        try:
            store_val = int(store)
            df_chart = future_store_date_aggr[future_store_date_aggr['Store'] == store_val]
        except ValueError:
            return jsonify({"error": "Invalid store parameter"}), 400
            
    if df_chart.empty:
        return jsonify([])
        
    chart_data = {
        "dates": [shift_date_string(d) for d in df_chart['Date'].tolist()],
        "predicted": df_chart[model_name].tolist()
    }
    return jsonify(chart_data)

@app.route("/api/inventory-insights")
def get_inventory_insights():
    insights = []
    for idx, row in inventory_base.iterrows():
        store = int(row['Store'])
        dept = int(row['Dept'])
        avg_sales = float(row['Avg_Sales'])
        std_sales = float(row['Std_Sales'])
        size = int(row['Size'])
        category = row['Category']
        
        safety_stock = round(1.65 * std_sales, 2)
        rop = round(avg_sales + safety_stock, 2)
        
        seed_factor = ((store * dept) % 9) / 8.0
        current_stock = round(avg_sales * (0.4 + 1.8 * seed_factor), 2)
        
        if current_stock < safety_stock:
            status = "Stockout Risk"
            reorder_qty = round(rop * 1.5 - current_stock, 2)
            action = f"CRITICAL: Expedite shipment of {reorder_qty:.1f} units immediately."
        elif current_stock < rop:
            status = "Reorder Required"
            reorder_qty = round(rop - current_stock, 2)
            action = f"Place purchase order for {reorder_qty:.1f} units."
        elif current_stock > rop * 2.2:
            status = "Overstocked"
            action = "Suspend replenishment. Implement markdown promotion to clear excess."
        else:
            status = "Optimal"
            action = "No action required. Maintain current levels."
            
        insights.append({
            "Store": store,
            "Dept": dept,
            "Category": category,
            "Avg_Weekly_Sales": round(avg_sales, 2),
            "Std_Weekly_Sales": round(std_sales, 2),
            "Safety_Stock": safety_stock,
            "Reorder_Point": rop,
            "Current_Stock": current_stock,
            "Status": status,
            "Action": action,
            "Store_Size": size
        })
        
    return jsonify(insights)

@app.route("/api/reports/forecast/download")
def download_forecast_csv():
    import io
    from flask import Response
    
    store = request.args.get("store", "all")
    model_name = request.args.get("model", "RF")
    
    if store == "all":
        df_chart = future_date_aggr
    else:
        try:
            store_val = int(store)
            df_chart = future_store_date_aggr[future_store_date_aggr['Store'] == store_val]
        except ValueError:
            return jsonify({"error": "Invalid store parameter"}), 400
            
    if df_chart.empty:
        return "No data available", 400
        
    output = io.StringIO()
    output.write("Date,Forecasted_Sales_INR,Forecasted_Sales_USD\n")
    
    for idx, row in df_chart.iterrows():
        d_str = shift_date_string(row['Date'])
        val_usd = float(row[model_name])
        val_inr = val_usd * 83.0
        output.write(f"{d_str},{val_inr:.2f},{val_usd:.2f}\n")
        
    csv_data = output.getvalue()
    output.close()
    
    filename = f"demand_forecast_store_{store}_{model_name}.csv"
    return Response(
        csv_data,
        mimetype="text/csv",
        headers={"Content-disposition": f"attachment; filename={filename}"}
    )

@app.route("/api/reports/inventory/download")
def download_inventory_json():
    import json
    from flask import Response
    
    insights = []
    for idx, row in inventory_base.iterrows():
        store = int(row['Store'])
        dept = int(row['Dept'])
        avg_sales = float(row['Avg_Sales'])
        std_sales = float(row['Std_Sales'])
        size = int(row['Size'])
        category = row['Category']
        
        safety_stock = round(1.65 * std_sales, 2)
        rop = round(avg_sales + safety_stock, 2)
        
        seed_factor = ((store * dept) % 9) / 8.0
        current_stock = round(avg_sales * (0.4 + 1.8 * seed_factor), 2)
        
        if current_stock < safety_stock:
            status = "Stockout Risk"
            reorder_qty = round(rop * 1.5 - current_stock, 2)
            action = f"CRITICAL: Expedite shipment of {reorder_qty:.1f} units immediately."
        elif current_stock < rop:
            status = "Reorder Required"
            reorder_qty = round(rop - current_stock, 2)
            action = f"Place purchase order for {reorder_qty:.1f} units."
        elif current_stock > rop * 2.2:
            status = "Overstocked"
            action = "Suspend replenishment. Implement markdown promotion to clear excess."
        else:
            status = "Optimal"
            action = "No action required. Maintain current levels."
            
        avg_sales_inr = round(avg_sales * 83.0, 2)
        
        insights.append({
            "Store": store,
            "Dept": dept,
            "Category": category,
            "Avg_Weekly_Sales_INR": avg_sales_inr,
            "Avg_Weekly_Sales_USD": round(avg_sales, 2),
            "Safety_Stock_Units": safety_stock,
            "Reorder_Point_Units": rop,
            "Current_Stock_Units": current_stock,
            "Status": status,
            "Recommended_Action": action,
            "Store_Size_SqFt": size
        })
        
    json_data = json.dumps(insights, indent=2)
    return Response(
        json_data,
        mimetype="application/json",
        headers={"Content-disposition": "attachment; filename=inventory_audit_report.json"}
    )

@app.route("/api/predict", methods=["POST"])
def predict_live():
    try:
        data = request.get_json(force=True)
        
        store = int(data.get("Store", 1))
        dept = int(data.get("Dept", 1))
        is_holiday = int(data.get("IsHoliday", 0))
        temperature = float(data.get("Temperature", medians["Temperature"]))
        fuel_price = float(data.get("Fuel_Price", medians["Fuel_Price"]))
        markdown1 = float(data.get("MarkDown1", 0.0))
        markdown2 = float(data.get("MarkDown2", 0.0))
        markdown3 = float(data.get("MarkDown3", 0.0))
        markdown4 = float(data.get("MarkDown4", 0.0))
        markdown5 = float(data.get("MarkDown5", 0.0))
        cpi = float(data.get("CPI", medians["CPI"]))
        unemployment = float(data.get("Unemployment", medians["Unemployment"]))
        size = int(data.get("Size", 136728))
        year = int(data.get("Year", 2023)) - 11 # Subtract 11 years to match ML model training dates
        month = int(data.get("Month", 10))
        week = int(data.get("Week", 42))
        quarter = int(data.get("Quarter", 4))
        store_type = data.get("Type", "A")
        
        type_b = 1 if store_type == "B" else 0
        type_c = 1 if store_type == "C" else 0
        
        features_list = [
            store, dept, is_holiday, temperature, fuel_price,
            markdown1, markdown2, markdown3, markdown4, markdown5,
            cpi, unemployment, size, year, month, week, quarter,
            type_b, type_c
        ]
        
        X_pred = np.array([features_list])
        
        pred_lr = float(models["linearregression"].predict(X_pred)[0])
        pred_hgb = float(models["histgradientboosting"].predict(X_pred)[0])
        pred_rf = float(models["randomforest"].predict(X_pred)[0])
        
        pred_lr = max(0.0, round(pred_lr, 2))
        pred_hgb = max(0.0, round(pred_hgb, 2))
        pred_rf = max(0.0, round(pred_rf, 2))
        
        response = {
            "LinearRegression": pred_lr,
            "HistGradientBoosting": pred_hgb,
            "RandomForest": pred_rf,
            "inputs": {
                "Store": store,
                "Dept": dept,
                "IsHoliday": is_holiday,
                "Temperature": temperature,
                "Fuel_Price": fuel_price,
                "CPI": cpi,
                "Unemployment": unemployment,
                "Size": size,
                "Type": store_type,
                "Year": year + 11, # Add 11 back for display in UI
                "Month": month,
                "Week": week,
                "Quarter": quarter
            }
        }
        return jsonify(response)
        
    except Exception as e:
        return jsonify({"error": str(e)}), 400

if __name__ == "__main__":
    app.run(debug=True, host="127.0.0.1", port=5000)
