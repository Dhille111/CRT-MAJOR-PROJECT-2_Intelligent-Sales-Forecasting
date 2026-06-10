// --- Application State ---
const state = {
    store: 'all',
    dept: 'all',
    model: 'RF',
    stats: null,
    inventory: [],
    inventoryFiltered: [],
    inventoryPage: 1,
    inventoryPageSize: 10,
    currentTab: 'tab-overview'
};

// --- Chart References ---
const charts = {
    actualVsPredicted: null,
    futureForecast: null,
    categorySales: null,
    topStores: null,
    inventoryStatus: null,
    livePrediction: null
};

// --- DOM Elements ---
const elements = {
    loader: document.getElementById('loading-spinner'),
    pageTitle: document.getElementById('page-title'),
    globalFilters: document.getElementById('global-filters'),
    
    // Selectors
    storeSelect: document.getElementById('store-select'),
    deptSelect: document.getElementById('dept-select'),
    modelSelect: document.getElementById('model-select'),
    
    // KPI elements
    kpiTotalSales: document.getElementById('kpi-total-sales'),
    kpiForecastSales: document.getElementById('kpi-forecast-sales'),
    kpiProfit: document.getElementById('kpi-profit'),
    kpiMape: document.getElementById('kpi-mape'),
    kpiBestStore: document.getElementById('kpi-best-store'),
    kpiBestStoreSales: document.getElementById('kpi-best-store-sales'),
    
    // Category donut elements
    categoryLegend: document.getElementById('category-legend'),
    categoryTotalVal: document.getElementById('category-total-val'),
    
    // Heatmap elements
    heatmapTable: document.getElementById('heatmap-table'),
    
    // Inventory alert donut elements
    inventoryDonutLegend: document.getElementById('inventory-donut-legend'),
    
    // Stockout table body
    stockoutTableBody: document.getElementById('stockout-table-body'),
    
    // Insights bullet list
    insightsBulletList: document.getElementById('insights-bullet-list'),
    
    // Tab detailed contents
    forecastTimelineBody: document.getElementById('forecast-timeline-body'),
    storeRankingBody: document.getElementById('store-ranking-body'),
    productAnalysisBody: document.getElementById('product-analysis-body'),
    alertsGridBody: document.getElementById('alerts-grid-body'),
    
    // Main inventory optimization grid elements
    inventorySearch: document.getElementById('inventory-search'),
    inventoryStatusFilter: document.getElementById('inventory-status-filter'),
    inventoryTableBody: document.getElementById('inventory-table-body'),
    inventoryShowingCount: document.getElementById('inventory-showing-count'),
    btnPrevPage: document.getElementById('btn-prev-page'),
    btnNextPage: document.getElementById('btn-next-page'),
    pageIndicator: document.getElementById('page-indicator'),
    
    // Predictor form elements
    predictionForm: document.getElementById('prediction-form'),
    toggleMarkdownsBtn: document.getElementById('toggle-markdowns-btn'),
    markdownFields: document.getElementById('markdown-fields'),
    resValRf: document.getElementById('res-val-rf'),
    resValHgb: document.getElementById('res-val-hgb'),
    resValLr: document.getElementById('res-val-lr'),
    resDesc: document.getElementById('res-desc'),
    livePredictionInputDate: document.getElementById('p-date')
};

// --- Formatting Helpers ---
function formatCurrency(val) {
    const inrVal = val * 83.0;
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(inrVal);
}

function formatAbbreviatedCurrency(val) {
    const inrVal = val * 83.0;
    if (inrVal >= 10000000) {
        return `₹ ${(inrVal / 10000000).toFixed(2)}Cr`;
    } else if (inrVal >= 100000) {
        return `₹ ${(inrVal / 100000).toFixed(2)}L`;
    } else if (inrVal >= 1000) {
        return `₹ ${(inrVal / 1000).toFixed(2)}K`;
    }
    return formatCurrency(val);
}

function formatNumber(val) {
    return new Intl.NumberFormat('en-IN').format(val);
}

// --- Loading indicator ---
function showLoader(show) {
    if (show) {
        elements.loader.classList.add('active');
    } else {
        elements.loader.classList.remove('active');
    }
}

// --- Tab Routing Logic ---
document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', (e) => {
        e.preventDefault();
        
        // Remove active class from navs
        document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
        item.classList.add('active');
        
        const targetTab = item.getAttribute('data-target');
        state.currentTab = targetTab;
        
        // Hide all tabs
        document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active-tab'));
        // Show target tab
        document.getElementById(targetTab).classList.add('active-tab');
        
        // Update header & filters visibility
        updateHeader(targetTab);
        
        // Load data specific to tabs
        if (targetTab === 'tab-overview') {
            loadOverviewData();
        } else if (targetTab === 'tab-forecast-details') {
            loadForecastDetailsData();
        } else if (targetTab === 'tab-store-perf') {
            loadStorePerformanceData();
        } else if (targetTab === 'tab-product-analysis') {
            loadProductAnalysisData();
        } else if (targetTab === 'tab-inventory') {
            loadInventoryTabGrid();
        } else if (targetTab === 'tab-alerts') {
            loadAlertsDetailsData();
        } else if (targetTab === 'tab-predictor') {
            loadPredictorData();
        }
    });
});

function updateHeader(tabId) {
    // Show/hide filter blocks
    if (tabId === 'tab-overview' || tabId === 'tab-forecast-details') {
        elements.globalFilters.classList.remove('hidden-fields');
    } else {
        elements.globalFilters.classList.add('hidden-fields');
    }
    
    // Update main header title
    const titles = {
        'tab-overview': 'Sales Forecasting Dashboard',
        'tab-forecast-details': 'Out-of-Sample Sales Forecasting Timeline',
        'tab-store-perf': 'Store Sales & Performance analysis',
        'tab-product-analysis': 'Product Category Revenue Breakdown',
        'tab-inventory': 'Inventory Optimization & Reorder Points',
        'tab-alerts': 'Supply Chain Warnings & Alerts',
        'tab-reports': 'Operations Reports Generator',
        'tab-predictor': 'Real-Time Sales Predictor Settings'
    };
    elements.pageTitle.textContent = titles[tabId] || 'Sales Forecasting System';
}

// --- Initialize App ---
document.addEventListener('DOMContentLoaded', () => {
    showLoader(true);
    
    // Fetch stats on startup
    fetch('/api/stats')
        .then(res => res.json())
        .then(data => {
            state.stats = data;
            
            // Populate select dropdown
            populateDropdowns(data);
            
            // Populate overview metrics and alerts
            populateMetricsAndAlerts(data);
            
            // Load dashboard charts
            return loadOverviewData();
        })
        .then(() => {
            // Load full inventory records in background
            return fetch('/api/inventory-insights');
        })
        .then(res => res.json())
        .then(data => {
            state.inventory = data;
            state.inventoryFiltered = [...data];
        })
        .catch(err => console.error("Error booting Sales Forecasting System:", err))
        .finally(() => {
            showLoader(false);
        });
        
    // Selector change events
    elements.storeSelect.addEventListener('change', (e) => {
        state.store = e.target.value;
        if (state.currentTab === 'tab-overview') {
            loadOverviewData();
        } else if (state.currentTab === 'tab-forecast-details') {
            loadForecastDetailsData();
        }
    });
    
    // Inventory search/filtering
    elements.inventorySearch.addEventListener('input', filterInventoryTable);
    elements.inventoryStatusFilter.addEventListener('change', filterInventoryTable);
    
    elements.btnPrevPage.addEventListener('click', () => {
        if (state.inventoryPage > 1) {
            state.inventoryPage--;
            renderInventoryTable();
        }
    });
    
    elements.btnNextPage.addEventListener('click', () => {
        const totalPages = Math.ceil(state.inventoryFiltered.length / state.inventoryPageSize);
        if (state.inventoryPage < totalPages) {
            state.inventoryPage++;
            renderInventoryTable();
        }
    });
    
    // Predictor form toggle and submit handlers
    elements.toggleMarkdownsBtn.addEventListener('click', () => {
        elements.markdownFields.classList.toggle('hidden-fields');
    });
    
    elements.predictionForm.addEventListener('submit', runLiveSimulation);
});

// --- Populate Dropdowns & Stats ---
function populateDropdowns(data) {
    data.unique_stores.forEach(storeNum => {
        const opt = document.createElement('option');
        opt.value = storeNum;
        opt.textContent = `Store ${storeNum}`;
        elements.storeSelect.appendChild(opt);
    });
}

function populateMetricsAndAlerts(data) {
    // Top Row KPIs
    elements.kpiTotalSales.textContent = formatAbbreviatedCurrency(data.total_historical_sales);
    elements.kpiForecastSales.textContent = formatAbbreviatedCurrency(data.total_forecast_sales);
    elements.kpiProfit.textContent = formatAbbreviatedCurrency(data.total_profit);
    elements.kpiMape.textContent = `${data.mape.toFixed(2)}%`;
    elements.kpiBestStore.textContent = `Store ${data.best_store}`;
    elements.kpiBestStoreSales.textContent = `Sales: ${formatAbbreviatedCurrency(data.best_store_sales)}`;
    
    // Update model label in sidebar and footer
    document.getElementById('sidebar-model-text').textContent = "RandomForest";
    
    // Sales by Category Donut Chart
    renderCategorySalesChart(data.category_sales);
    
    // Top 5 Stores Bar Chart
    renderTopStoresChart(data.top_5_stores);
    
    // Sales Heatmap Store vs Month grid
    renderSalesHeatmapGrid(data.heatmap_data);
    
    // Inventory Status Donut Chart
    renderInventoryStatusChart(data.inventory_status_overview);
    
    // Stockout Risk alerts table
    renderStockoutRiskTable(data.stockout_alerts);
    
    // Dynamic Insights list
    renderInsightsList(data.dynamic_insights);
}

// --- Load Overview Charts ---
function loadOverviewData() {
    showLoader(true);
    
    // Line chart Actual vs predicted
    const urlLine = `/api/charts/actual-vs-predicted?store=${state.store}&model=${state.model}`;
    // Bar chart 6 months forecast
    const urlBar = `/api/charts/future-forecast?store=${state.store}&model=${state.model}`;
    
    return Promise.all([
        fetch(urlLine).then(res => res.json()),
        fetch(urlBar).then(res => res.json())
    ])
    .then(([lineData, barData]) => {
        // Render Actual vs Predicted line
        renderActualVsPredictedLine(lineData);
        
        // Group bar forecast data into monthly aggregates for display
        renderFutureForecastBar(barData);
    })
    .catch(err => console.error("Error loading Overview charts:", err))
    .finally(() => {
        showLoader(false);
    });
}

// --- Detailed Views Tabs Loading ---
function loadForecastDetailsData() {
    showLoader(true);
    const url = `/api/charts/future-forecast?store=${state.store}&model=${state.model}`;
    fetch(url)
        .then(res => res.json())
        .then(data => {
            elements.forecastTimelineBody.innerHTML = "";
            
            data.dates.forEach((dateStr, i) => {
                const val = data.predicted[i];
                const tr = document.createElement('tr');
                
                // Get day of week and quarter details
                const dObj = new Date(dateStr);
                const dayOfWeek = dObj.toLocaleDateString('en-US', { weekday: 'long' });
                const month = dObj.getMonth() + 1;
                const quarter = Math.ceil(month / 3);
                
                // Estimate holiday status based on mockup Thanksgiving/Christmas weeks
                const isHoliday = dateStr.includes("-11-23") || dateStr.includes("-12-24") || dateStr.includes("-12-23") ? "Yes" : "No";
                const holidayBadgeClass = isHoliday === "Yes" ? "badge-danger" : "badge-optimal";
                
                tr.innerHTML = `
                    <td style="font-weight: 600;">${dateStr}</td>
                    <td>${dayOfWeek}</td>
                    <td style="font-weight: 700;">${formatCurrency(val)}</td>
                    <td><span class="badge ${holidayBadgeClass}">${isHoliday}</span></td>
                    <td>Q${quarter}</td>
                `;
                elements.forecastTimelineBody.appendChild(tr);
            });
        })
        .catch(err => console.error("Error loading forecast timeline table:", err))
        .finally(() => {
            showLoader(false);
        });
}

function loadStorePerformanceData() {
    if (!state.stats) return;
    elements.storeRankingBody.innerHTML = "";
    
    // Sort stores by total sales
    const sorted = [...state.stats.store_perf].sort((a,b) => b.Total_Sales - a.Total_Sales);
    
    sorted.forEach((item, index) => {
        const tr = document.createElement('tr');
        // Determine type classification
        let typeText = "Type A (Large)";
        let typeBadgeClass = "badge-optimal";
        if (index % 3 === 1) { typeText = "Type B (Medium)"; typeBadgeClass = "badge-info"; }
        else if (index % 3 === 2) { typeText = "Type C (Small)"; typeBadgeClass = "badge-warning"; }
        
        tr.innerHTML = `
            <td style="font-weight: 600;">Store ${item.Store}</td>
            <td style="font-weight: 700;">${formatCurrency(item.Total_Sales)}</td>
            <td>${formatCurrency(item.Avg_Sales)}</td>
            <td>${formatNumber(120000 + (item.Store * 2314) % 80000)} sq ft</td>
            <td><span class="badge ${typeBadgeClass}">${typeText}</span></td>
        `;
        elements.storeRankingBody.appendChild(tr);
    });
}

function loadProductAnalysisData() {
    if (!state.stats) return;
    elements.productAnalysisBody.innerHTML = "";
    
    const catRanges = {
        'Electronics': 'Depts 81-87, 92-95',
        'Clothing': 'Depts 1-12, 17-46',
        'Home & Kitchen': 'Depts 13-16, 18-22, 47-60',
        'Beauty': 'Depts 72, 74, 79, 90-99',
        'Others': 'All other Depts'
    };
    
    state.stats.category_sales.forEach(cat => {
        const tr = document.createElement('tr');
        
        tr.innerHTML = `
            <td style="font-weight: 600;">${cat.Category}</td>
            <td style="font-weight: 700;">${formatCurrency(cat.Weekly_Sales)}</td>
            <td style="font-weight: 600; color: var(--color-primary);">${cat.Percentage.toFixed(1)}%</td>
            <td>${catRanges[cat.Category] || 'N/A'}</td>
            <td><span class="badge badge-optimal">Active</span></td>
        `;
        elements.productAnalysisBody.appendChild(tr);
    });
}

function loadInventoryTabGrid() {
    state.inventoryPage = 1;
    filterInventoryTable();
}

function loadAlertsDetailsData() {
    if (!state.inventory) return;
    elements.alertsGridBody.innerHTML = "";
    
    // Grab all items marked as Stockout Risk or Reorder Required
    const warningItems = state.inventory.filter(item => item.Status === 'Stockout Risk' || item.Status === 'Reorder Required');
    
    warningItems.forEach(item => {
        const tr = document.createElement('tr');
        
        const shortage = Math.max(0, Math.ceil(item.Reorder_Point - item.Current_Stock));
        const badgeClass = item.Status === 'Stockout Risk' ? 'badge-danger' : 'badge-warning';
        
        tr.innerHTML = `
            <td style="font-weight: 600;">Store ${item.Store}</td>
            <td>Dept ${item.Dept}</td>
            <td style="font-weight: 600;">${item.Category}</td>
            <td>${formatNumber(item.Current_Stock)} units</td>
            <td>${formatNumber(item.Safety_Stock)} units</td>
            <td style="font-weight: 700; color: var(--color-danger);">${formatNumber(shortage)} units</td>
            <td><span class="badge ${badgeClass}">${item.Status === 'Stockout Risk' ? 'HIGH' : 'MEDIUM'}</span></td>
        `;
        elements.alertsGridBody.appendChild(tr);
    });
}

function loadPredictorData() {
    if (elements.livePredictionInputDate.value === "") {
        elements.livePredictionInputDate.value = "2023-11-23";
    }
}

// --- Local Inventory Table Filters ---
function filterInventoryTable() {
    const q = elements.inventorySearch.value.trim().toLowerCase();
    const statusFilter = elements.inventoryStatusFilter.value;
    
    state.inventoryFiltered = state.inventory.filter(item => {
        const matchSearch = q === "" || 
            `store ${item.Store}`.toLowerCase().includes(q) || 
            `dept ${item.Dept}`.toLowerCase().includes(q) ||
            item.Category.toLowerCase().includes(q) ||
            item.Store.toString().includes(q) ||
            item.Dept.toString().includes(q);
            
        const matchStatus = statusFilter === "all" || item.Status === statusFilter;
        
        return matchSearch && matchStatus;
    });
    
    state.inventoryPage = 1;
    renderInventoryTable();
}

function renderInventoryTable() {
    elements.inventoryTableBody.innerHTML = "";
    
    const startIdx = (state.inventoryPage - 1) * state.inventoryPageSize;
    const endIdx = Math.min(startIdx + state.inventoryPageSize, state.inventoryFiltered.length);
    
    const pageItems = state.inventoryFiltered.slice(startIdx, endIdx);
    
    pageItems.forEach(item => {
        const tr = document.createElement('tr');
        
        let statusBadgeClass = "badge-optimal";
        if (item.Status === 'Stockout Risk') statusBadgeClass = "badge-danger";
        else if (item.Status === 'Reorder Required') statusBadgeClass = "badge-warning";
        else if (item.Status === 'Overstocked') statusBadgeClass = "badge-info";
        
        tr.innerHTML = `
            <td>Store ${item.Store}</td>
            <td>Dept ${item.Dept}</td>
            <td style="font-weight: 500;">${item.Category}</td>
            <td>${formatCurrency(item.Avg_Weekly_Sales)}</td>
            <td>${formatNumber(item.Safety_Stock)} units</td>
            <td>${formatNumber(item.Reorder_Point)} units</td>
            <td>${formatNumber(item.Current_Stock)} units</td>
            <td><span class="badge ${statusBadgeClass}">${item.Status}</span></td>
            <td><span class="text-secondary" style="font-weight: 500; font-size: 0.78rem;">${item.Action}</span></td>
        `;
        elements.inventoryTableBody.appendChild(tr);
    });
    
    const totalPages = Math.ceil(state.inventoryFiltered.length / state.inventoryPageSize) || 1;
    elements.pageIndicator.textContent = `Page ${state.inventoryPage} of ${totalPages}`;
    elements.btnPrevPage.disabled = state.inventoryPage === 1;
    elements.btnNextPage.disabled = state.inventoryPage === totalPages;
    
    elements.inventoryShowingCount.textContent = `Showing ${startIdx + 1}-${endIdx} of ${state.inventoryFiltered.length} store-department nodes`;
}

// --- Live Simulation Submit ---
function runLiveSimulation(e) {
    e.preventDefault();
    showLoader(true);
    
    const simDate = new Date(elements.livePredictionInputDate.value);
    
    const year = simDate.getFullYear();
    const month = simDate.getMonth() + 1;
    
    // ISO week
    const d = new Date(Date.UTC(simDate.getFullYear(), simDate.getMonth(), simDate.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    const week = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
    
    const quarter = Math.ceil(month / 3);
    
    const payload = {
        Store: parseInt(document.getElementById('p-store').value),
        Dept: parseInt(document.getElementById('p-dept').value),
        IsHoliday: document.getElementById('p-isholiday').checked ? 1 : 0,
        Temperature: parseFloat(document.getElementById('p-temp').value),
        Fuel_Price: parseFloat(document.getElementById('p-fuel').value),
        CPI: parseFloat(document.getElementById('p-cpi').value),
        Unemployment: parseFloat(document.getElementById('p-unemp').value),
        Size: parseInt(document.getElementById('p-size').value),
        Type: document.getElementById('p-type').value,
        Year: year,
        Month: month,
        Week: week,
        Quarter: quarter,
        MarkDown1: (parseFloat(document.getElementById('p-md1').value) || 0.0) / 83.0,
        MarkDown2: (parseFloat(document.getElementById('p-md2').value) || 0.0) / 83.0,
        MarkDown3: (parseFloat(document.getElementById('p-md3').value) || 0.0) / 83.0,
        MarkDown4: (parseFloat(document.getElementById('p-md4').value) || 0.0) / 83.0,
        MarkDown5: (parseFloat(document.getElementById('p-md5').value) || 0.0) / 83.0
    };
    
    fetch('/api/predict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    })
    .then(res => res.json())
    .then(predData => {
        if (predData.error) {
            alert("Simulation failed: " + predData.error);
            return;
        }
        
        elements.resValRf.textContent = formatCurrency(predData.RandomForest);
        elements.resValHgb.textContent = formatCurrency(predData.HistGradientBoosting);
        elements.resValLr.textContent = formatCurrency(predData.LinearRegression);
        
        elements.resDesc.textContent = `Forecast generated for Store ${payload.Store}, Dept ${payload.Dept} on ${elements.livePredictionInputDate.value} (Week ${week}, Quarter ${quarter})`;
        
        renderLivePredictionChart(predData);
    })
    .catch(err => {
        console.error("Simulation error:", err);
        alert("Server communication error occurred during prediction.");
    })
    .finally(() => {
        showLoader(false);
    });
}

// --- Chart Rendering Functions (Overview & Simulation) ---

// Chart.js Theme Settings for light mode
Chart.defaults.color = '#4b5563'; // text-secondary
Chart.defaults.font.family = 'Inter, sans-serif';
Chart.defaults.scale.grid.color = '#f3f4f6'; // light gray grid lines
Chart.defaults.plugins.tooltip.padding = 10;
Chart.defaults.plugins.tooltip.cornerRadius = 6;

// Custom Canvas Plugin: Draws a vertical dashed separator line at the Forecast Start date
const forecastLinePlugin = {
    id: 'forecastLine',
    afterDraw: (chart) => {
        const xAxis = chart.scales.x;
        const yAxis = chart.scales.y;
        
        // Find index of the forecast start date (starts in 2023-11 shifted timeline)
        const index = chart.data.labels.findIndex(label => label.startsWith('2023-11-') || label.startsWith('2023-11'));
        if (index !== -1) {
            const x = xAxis.getPixelForTick(index);
            const ctx = chart.ctx;
            ctx.save();
            ctx.beginPath();
            ctx.setLineDash([5, 5]);
            ctx.moveTo(x, yAxis.top);
            ctx.lineTo(x, yAxis.bottom);
            ctx.lineWidth = 1.5;
            ctx.strokeStyle = '#9ca3af'; // gray-400
            ctx.stroke();
            
            // Draw text tag label "Forecast Start"
            ctx.fillStyle = '#6b7280'; // gray-500
            ctx.font = 'bold 9px sans-serif';
            ctx.fillText('Forecast Start', x - 32, yAxis.top + 15);
            ctx.restore();
        }
    }
};

function renderActualVsPredictedLine(chartData) {
    if (charts.actualVsPredicted) {
        charts.actualVsPredicted.destroy();
    }
    
    const ctx = document.getElementById('actualVsPredictedChart').getContext('2d');
    
    // Draw fill gradient below predicted line
    const gradPred = ctx.createLinearGradient(0, 0, 0, 220);
    gradPred.addColorStop(0, 'rgba(16, 185, 129, 0.05)');
    gradPred.addColorStop(1, 'rgba(16, 185, 129, 0.0)');

    charts.actualVsPredicted = new Chart(ctx, {
        type: 'line',
        plugins: [forecastLinePlugin],
        data: {
            labels: chartData.dates,
            datasets: [
                {
                    label: 'Actual Sales',
                    data: chartData.actual,
                    borderColor: '#3b82f6', // blue
                    borderWidth: 1.8,
                    pointRadius: 0,
                    pointHoverRadius: 4,
                    fill: false,
                    tension: 0.1
                },
                {
                    label: 'Predicted Sales',
                    data: chartData.predicted,
                    borderColor: '#10b981', // green
                    borderWidth: 2,
                    borderDash: [4, 4],     // dashed line
                    pointRadius: 0,
                    pointHoverRadius: 4,
                    fill: true,
                    backgroundColor: gradPred,
                    tension: 0.1
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                mode: 'index',
                intersect: false,
            },
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: '#1f2937',
                    titleColor: '#ffffff',
                    bodyColor: '#cbd5e1',
                    callbacks: {
                        label: function(context) {
                            return ` ${context.dataset.label}: ${formatCurrency(context.raw)}`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    grid: { display: false },
                    ticks: {
                        maxTicksLimit: 10,
                        font: { size: 9 }
                    }
                },
                y: {
                    ticks: {
                        callback: function(value) {
                            return formatAbbreviatedCurrency(value);
                        },
                        font: { size: 9 }
                    }
                }
            }
        }
    });
}

function renderFutureForecastBar(chartData) {
    if (charts.futureForecast) {
        charts.futureForecast.destroy();
    }
    
    const ctx = document.getElementById('futureForecastChart').getContext('2d');
    
    // Aggregate weekly forecast values into monthly sums (Nov 2023 to Jul 2024 shifted timeline)
    const monthlySales = {};
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    
    chartData.dates.forEach((dateStr, i) => {
        const d = new Date(dateStr);
        const key = `${monthNames[d.getMonth()]} ${d.getFullYear()}`;
        monthlySales[key] = (monthlySales[key] || 0) + chartData.predicted[i];
    });
    
    // Sort keys chronologically
    const sortedKeys = Object.keys(monthlySales).sort((a, b) => {
        const partsA = a.split(' ');
        const partsB = b.split(' ');
        const dateA = new Date(`${partsA[0]} 1, ${partsA[1]}`);
        const dateB = new Date(`${partsB[0]} 1, ${partsB[1]}`);
        return dateA - dateB;
    }).slice(0, 6); // Grab the first 6 forecast months
    
    const labels = sortedKeys;
    const dataVals = sortedKeys.map(k => monthlySales[k]);
    
    charts.futureForecast = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                data: dataVals,
                backgroundColor: 'rgba(16, 185, 129, 0.85)',
                borderColor: '#10b981',
                borderWidth: 1,
                borderRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: '#1f2937',
                    callbacks: {
                        label: function(context) {
                            return ` Sales: ${formatCurrency(context.raw)}`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    grid: { display: false },
                    ticks: { font: { size: 9 } }
                },
                y: {
                    ticks: {
                        callback: function(value) { return formatAbbreviatedCurrency(value); },
                        font: { size: 9 }
                    }
                }
            }
        }
    });
}

function renderCategorySalesChart(catData) {
    if (charts.categorySales) {
        charts.categorySales.destroy();
    }
    
    const ctx = document.getElementById('categorySalesChart').getContext('2d');
    
    // Colors matching category styles
    const colors = {
        'Electronics': '#3b82f6',
        'Clothing': '#10b981',
        'Home & Kitchen': '#fbbf24',
        'Beauty': '#8b5cf6',
        'Others': '#06b6d4'
    };
    
    const labels = catData.map(c => c.Category);
    const dataVals = catData.map(c => c.Weekly_Sales);
    const bgColors = catData.map(c => colors[c.Category] || '#6b7280');
    
    charts.categorySales = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: dataVals,
                backgroundColor: bgColors,
                borderWidth: 1.5,
                borderColor: '#ffffff'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '68%',
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: '#1f2937',
                    callbacks: {
                        label: function(context) {
                            return ` ${context.label}: ${formatCurrency(context.raw)}`;
                        }
                    }
                }
            }
        }
    });
    
    // Render custom sidebar legend inside Card
    const legendContainer = elements.categoryLegend;
    legendContainer.innerHTML = "";
    
    let sum = 0;
    catData.forEach(c => sum += c.Weekly_Sales);
    elements.categoryTotalVal.textContent = formatCurrency(sum);
    
    catData.forEach(c => {
        const itemColor = colors[c.Category] || '#6b7280';
        const div = document.createElement('div');
        div.className = "donut-legend-item";
        div.innerHTML = `
            <div class="donut-legend-label">
                <span class="donut-legend-marker" style="background-color: ${itemColor};"></span>
                <span>${c.Category}</span>
            </div>
            <span class="donut-legend-val">${c.Percentage.toFixed(1)}%</span>
        `;
        legendContainer.appendChild(div);
    });
}

function renderTopStoresChart(topStores) {
    if (charts.topStores) {
        charts.topStores.destroy();
    }
    
    const ctx = document.getElementById('topStoresChart').getContext('2d');
    
    const labels = topStores.map(s => `Store ${s.Store}`);
    const dataVals = topStores.map(s => s.Total_Sales);
    
    charts.topStores = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                data: dataVals,
                backgroundColor: '#2563eb', // primary blue
                borderColor: '#1d4ed8',
                borderWidth: 1,
                borderRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            indexAxis: 'y', // horizontal bar chart
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: '#1f2937',
                    callbacks: {
                        label: function(context) {
                            return ` Sales Volume: ${formatCurrency(context.raw)}`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    ticks: {
                        callback: function(value) { return formatAbbreviatedCurrency(value); },
                        font: { size: 8 }
                    }
                },
                y: {
                    grid: { display: false },
                    ticks: { font: { size: 9 } }
                }
            }
        }
    });
}

function renderSalesHeatmapGrid(heatmapData) {
    const table = elements.heatmapTable;
    table.innerHTML = "";
    
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    
    // Create header row
    const thead = document.createElement('tr');
    thead.innerHTML = "<th></th>" + monthNames.map(m => `<th>${m}</th>`).join('');
    table.appendChild(thead);
    
    // Find min and max values in the heatmap to perform shading
    const salesVals = heatmapData.map(h => h.Avg_Sales);
    const minVal = Math.min(...salesVals);
    const maxVal = Math.max(...salesVals);
    const range = maxVal - minVal || 1.0;
    
    // Group heatmap by Store ID
    const storesMap = {};
    for (let s = 1; s <= 20; s++) {
        storesMap[s] = Array(12).fill(0.0);
    }
    
    heatmapData.forEach(h => {
        if (h.Store <= 20) {
            storesMap[h.Store][h.Month - 1] = h.Avg_Sales;
        }
    });
    
    // Create store rows
    for (let s = 1; s <= 20; s++) {
        const tr = document.createElement('tr');
        
        let rowCellsHTML = `<td class="heatmap-row-header">Store ${s}</td>`;
        
        for (let m = 0; m < 12; m++) {
            const val = storesMap[s][m];
            
            // Map cell color using dynamic factor from yellow to blue:
            // HSL: Low is yellow (60, 93%, 77%), High is blue (217, 91%, 60%)
            const colorFactor = (val - minVal) / range;
            
            // Shading math:
            // H: 60 + colorFactor * (217 - 60) = 60 + 157 * colorFactor
            // S: 93% + colorFactor * (91% - 93%) = 93% - 2% * colorFactor
            // L: 82% - colorFactor * 22% = 82% - 22% * colorFactor
            const h = Math.round(60 + 157 * colorFactor);
            const sVal = Math.round(93 - 2 * colorFactor);
            const lVal = Math.round(82 - 25 * colorFactor);
            
            const cellColor = `hsl(${h}, ${sVal}%, ${lVal}%)`;
            
            rowCellsHTML += `
                <td>
                    <div class="heatmap-cell" 
                         style="background-color: ${cellColor};" 
                         title="Store ${s}, Month ${monthNames[m]} - Avg Sales: ${formatCurrency(val)}">
                    </div>
                </td>
            `;
        }
        
        tr.innerHTML = rowCellsHTML;
        table.appendChild(tr);
    }
}

function renderInventoryStatusChart(overview) {
    if (charts.inventoryStatus) {
        charts.inventoryStatus.destroy();
    }
    
    const ctx = document.getElementById('inventoryStatusChart').getContext('2d');
    
    const labels = ['Optimal', 'Low Stock', 'Overstock'];
    const dataVals = [overview.Optimal, overview.Low_Stock, overview.Overstock];
    const colors = ['#10b981', '#f59e0b', '#ef4444']; // green, orange, red
    
    charts.inventoryStatus = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: dataVals,
                backgroundColor: colors,
                borderWidth: 1.5,
                borderColor: '#ffffff'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '68%',
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: '#1f2937',
                    callbacks: {
                        label: function(context) {
                            return ` ${context.label}: ${context.raw.toFixed(1)}%`;
                        }
                    }
                }
            }
        }
    });
    
    // Render custom legend listing
    const legendContainer = elements.inventoryDonutLegend;
    legendContainer.innerHTML = "";
    
    const subLabels = {
        'Optimal': 'Stock is good',
        'Low Stock': 'Need Reorder',
        'Overstock': 'High Stock'
    };
    
    labels.forEach((label, i) => {
        const itemColor = colors[i];
        const val = dataVals[i];
        const div = document.createElement('div');
        div.className = "donut-legend-item";
        div.innerHTML = `
            <div class="donut-legend-label">
                <span class="donut-legend-marker" style="background-color: ${itemColor};"></span>
                <span>${label} <span style="font-size: 0.65rem; color: var(--text-muted);">(${subLabels[label] || ''})</span></span>
            </div>
            <span class="donut-legend-val">${val.toFixed(1)}%</span>
        `;
        legendContainer.appendChild(div);
    });
}

function renderStockoutRiskTable(alerts) {
    const tbody = elements.stockoutTableBody;
    tbody.innerHTML = "";
    
    alerts.forEach(item => {
        const tr = document.createElement('tr');
        
        let badgeClass = "risk-high";
        if (item.Risk === "Medium") badgeClass = "risk-medium";
        else if (item.Risk === "Low") badgeClass = "risk-low";
        
        tr.innerHTML = `
            <td style="font-weight: 600;">${item.Category}</td>
            <td>Store ${item.Store}</td>
            <td style="font-weight: 700;">${formatNumber(item.Current_Stock)}</td>
            <td><span class="badge-risk ${badgeClass}">${item.Risk}</span></td>
        `;
        tbody.appendChild(tr);
    });
}

function renderInsightsList(insights) {
    const list = elements.insightsBulletList;
    list.innerHTML = "";
    
    const iconColors = {
        'trend-up': 'insight-green',
        'store': 'insight-blue',
        'clock': 'insight-purple',
        'warning': 'insight-orange',
        'check': 'insight-green'
    };
    
    const svgs = {
        'trend-up': `<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>`,
        'store': `<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>`,
        'clock': `<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`,
        'warning': `<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/></svg>`,
        'check': `<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round"><polyline points="20 6 9 17 4 12"/></svg>`
    };
    
    insights.forEach(item => {
        const li = document.createElement('li');
        const colorClass = iconColors[item.icon] || 'insight-blue';
        const innerSVG = svgs[item.icon] || '';
        
        li.innerHTML = `
            <div class="insight-icon ${colorClass}">
                ${innerSVG}
            </div>
            <span>${item.text}</span>
        `;
        list.appendChild(li);
    });
}

function renderLivePredictionChart(predData) {
    if (charts.livePrediction) {
        charts.livePrediction.destroy();
    }
    
    const ctx = document.getElementById('livePredictionComparisonChart').getContext('2d');
    
    charts.livePrediction = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['RandomForest (Best)', 'HistGradientBoosting', 'LinearRegression'],
            datasets: [{
                data: [predData.RandomForest, predData.HistGradientBoosting, predData.LinearRegression],
                backgroundColor: [
                    'rgba(16, 185, 129, 0.8)',
                    'rgba(139, 92, 246, 0.8)',
                    'rgba(59, 130, 246, 0.8)'
                ],
                borderColor: [
                    '#10b981',
                    '#8b5cf6',
                    '#3b82f6'
                ],
                borderWidth: 1,
                borderRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: '#1f2937',
                    callbacks: {
                        label: function(context) {
                            return ` Forecasted Demand: ${formatCurrency(context.raw)}`;
                        }
                    }
                }
            },
            scales: {
                x: { grid: { display: false } },
                y: {
                    ticks: {
                        callback: function(value) { return formatAbbreviatedCurrency(value); },
                        font: { size: 9 }
                    }
                }
            }
        }
    });
}
