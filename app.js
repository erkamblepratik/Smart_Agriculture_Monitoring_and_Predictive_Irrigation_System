/**
 * SmartAgri - IoT & Machine Learning Smart Agriculture Dashboard
 * Core Application Logic, Chart Engine, Real-Time Telemetry Simulation & Pump Controls
 */

document.addEventListener('DOMContentLoaded', () => {
  // ==========================================================================
  // APPLICATION STATE
  // ==========================================================================
  const state = {
    isSimulating: true,
    autoMode: true,
    pumpRunning: false,
    simIntervalId: null,
    clockIntervalId: null,
    pollIntervalMs: 3500,
    
    // Telemetry Values
    soilMoisture: 32,
    temperature: 28,
    humidity: 64,
    soilPh: 6.8,
    waterFlow: 2.5,
    
    // Crop & Weather
    cropHealthScore: 80,
    weatherTemp: 32,
    weatherCond: 'Sunny',
    weatherHumidity: 58,
    weatherRainfall: 0,
    weatherWind: 12,
    
    // ML Prediction
    predictedMoistureNextHour: 28,
    hoursUntilIrrigation: 4,
    confidencePct: 92,
    
    // Irrigation records
    waterUsedTodayLiters: 2.5,
    lastIrrigationTimestamp: '21 Oct 2026, 06:30 AM',
    suggestedDurationMin: 15,
    thresholdMoisture: 30,
    thresholdDuration: 15,
    
    // Historical Telemetry Store
    historyLogs: []
  };

  // ==========================================================================
  // DOM REFERENCES
  // ==========================================================================
  const dom = {
    // Topbar
    currentDate: document.getElementById('currentDate'),
    currentTime: document.getElementById('currentTime'),
    connectionStatusText: document.getElementById('connectionStatusText'),
    simToggleBtn: document.getElementById('simToggleBtn'),
    simPlayIcon: document.getElementById('simPlayIcon'),
    simBtnLabel: document.getElementById('simBtnLabel'),
    menuToggle: document.getElementById('menuToggle'),
    mobileMenuToggle: document.getElementById('mobileMenuToggle'),
    sidebar: document.getElementById('sidebar'),
    
    // Top 5 Stat Cards
    valMoisture: document.getElementById('val-soilMoisture'),
    valTemp: document.getElementById('val-temperature'),
    valHumidity: document.getElementById('val-humidity'),
    valPh: document.getElementById('val-soilPh'),
    valFlow: document.getElementById('val-waterFlow'),
    badgeMoisture: document.getElementById('badge-soilMoisture'),
    badgeTemp: document.getElementById('badge-temperature'),
    badgeHumidity: document.getElementById('badge-humidity'),
    badgePh: document.getElementById('badge-soilPh'),
    badgeFlow: document.getElementById('badge-waterFlow'),
    
    // Middle Row 1
    predictedMoisture: document.getElementById('predictedMoisture'),
    
    // Middle Row 2: Tables & Controls
    tblMoisture: document.getElementById('tbl-moisture'),
    tblTemp: document.getElementById('tbl-temp'),
    tblHumidity: document.getElementById('tbl-humidity'),
    tblPh: document.getElementById('tbl-ph'),
    tblFlow: document.getElementById('tbl-flow'),
    tblMoistureTime: document.getElementById('tbl-moisture-time'),
    tblTempTime: document.getElementById('tbl-temp-time'),
    tblHumidityTime: document.getElementById('tbl-humidity-time'),
    tblPhTime: document.getElementById('tbl-ph-time'),
    tblFlowTime: document.getElementById('tbl-flow-time'),
    
    // Irrigation Pump Controls
    autoModeToggle: document.getElementById('autoModeToggle'),
    pumpSvg: document.getElementById('pumpSvg'),
    pumpStateText: document.getElementById('pumpStateText'),
    btnPumpOn: document.getElementById('btnPumpOn'),
    btnPumpOff: document.getElementById('btnPumpOff'),
    lastIrrigationVal: document.getElementById('lastIrrigationVal'),
    waterUsedVal: document.getElementById('waterUsedVal'),
    irrigationDurationVal: document.getElementById('irrigationDurationVal'),
    
    // Crop Health
    cropDonutProgress: document.getElementById('cropDonutProgress'),
    cropScorePercent: document.getElementById('cropScorePercent'),
    cropConditionTitle: document.getElementById('cropConditionTitle'),
    
    // Alerts & Weather
    alertsList: document.getElementById('alertsList'),
    weatherTemp: document.getElementById('weatherTemp'),
    weatherCond: document.getElementById('weatherCond'),
    weatherHumidity: document.getElementById('weatherHumidity'),
    weatherRainfall: document.getElementById('weatherRainfall'),
    weatherWind: document.getElementById('weatherWind'),
    
    // Toast Container
    toastContainer: document.getElementById('toastContainer'),
    
    // Subview Panels & Nav
    navItems: document.querySelectorAll('.nav-item'),
    viewPanels: document.querySelectorAll('.view-panel'),
    rawLogStream: document.getElementById('rawLogStream'),
    clearStreamLogsBtn: document.getElementById('clearStreamLogsBtn'),
    pingEsp32Btn: document.getElementById('pingEsp32Btn'),
    historyTableBody: document.getElementById('historyTableBody'),
    tableFilterInput: document.getElementById('tableFilterInput'),
    exportCsvBtn: document.getElementById('exportCsvBtn'),
    triggerMlInferenceBtn: document.getElementById('triggerMlInferenceBtn'),
    thresholdMoistureInput: document.getElementById('thresholdMoistureInput'),
    thresholdDurationInput: document.getElementById('thresholdDurationInput'),
    sliderMoistureVal: document.getElementById('sliderMoistureVal'),
    sliderDurationVal: document.getElementById('sliderDurationVal'),
    pollIntervalSelect: document.getElementById('pollIntervalSelect'),
    saveSettingsBtn: document.getElementById('saveSettingsBtn'),

    // Module 1: Auth & User Profile
    userMenuBtn: document.getElementById('userMenuBtn'),
    profileDropdownContainer: document.querySelector('.user-profile-menu-container'),
    openAuthModalBtn: document.getElementById('openAuthModalBtn'),
    logoutBtn: document.getElementById('logoutBtn'),
    authModal: document.getElementById('authModal'),
    closeAuthModalBtn: document.getElementById('closeAuthModalBtn'),
    tabSignInBtn: document.getElementById('tabSignInBtn'),
    tabSignUpBtn: document.getElementById('tabSignUpBtn'),
    formSignIn: document.getElementById('formSignIn'),
    formSignUp: document.getElementById('formSignUp'),
    demoOneClickLoginBtn: document.getElementById('demoOneClickLoginBtn'),
    currentUserName: document.getElementById('currentUserName'),
    dropdownUserName: document.getElementById('dropdownUserName'),
    dropdownUserRole: document.getElementById('dropdownUserRole'),

    // Module 9: Alerts Management
    alertCategoryFilters: document.getElementById('alertCategoryFilters'),
    detailedAlertsBody: document.getElementById('detailedAlertsBody'),
    markAllAlertsReadBtn: document.getElementById('markAllAlertsReadBtn'),
    triggerTestAlertBtn: document.getElementById('triggerTestAlertBtn'),

    // Module 10 & 8 Actions
    refreshWeatherBtn: document.getElementById('refreshWeatherBtn'),
    exportAuditLogBtn: document.getElementById('exportAuditLogBtn')
  };

  // ==========================================================================
  // AUDIO SYNTHESIZER (Web Audio API for realistic haptic & water audio feedback)
  // ==========================================================================
  const audioCtx = (typeof window.AudioContext !== 'undefined' || typeof window.webkitAudioContext !== 'undefined')
    ? new (window.AudioContext || window.webkitAudioContext)()
    : null;

  function playTone(freq, type = 'sine', duration = 0.12) {
    if (!audioCtx) return;
    try {
      if (audioCtx.state === 'suspended') audioCtx.resume();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
      gain.gain.setValueAtTime(0.06, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + duration);
    } catch (e) {
      // Audio context might be restricted before interaction
    }
  }

  // ==========================================================================
  // CHART INITIALIZATIONS
  // ==========================================================================
  let liveSensorsChart = null;
  let moistureTrendChart = null;
  let forecastMoistureChart = null;

  function initCharts() {
    // 1. Live Multi-sensor Line Chart
    const liveSensorsCtx = document.getElementById('liveSensorsChart')?.getContext('2d');
    if (liveSensorsCtx) {
      const timeLabels = ['08:00', '10:00', '12:00', '02:00', '04:00', '06:00', '08:00', '10:00'];
      
      liveSensorsChart = new Chart(liveSensorsCtx, {
        type: 'line',
        data: {
          labels: timeLabels,
          datasets: [
            {
              label: 'Soil Moisture (%)',
              data: [35, 38, 37, 33, 25, 27, 29, 32],
              borderColor: '#22c55e',
              backgroundColor: 'rgba(34, 197, 94, 0.15)',
              borderWidth: 2.5,
              tension: 0.38,
              fill: false,
              pointBackgroundColor: '#22c55e',
              pointBorderColor: '#ffffff',
              pointBorderWidth: 2,
              pointRadius: 4,
              pointHoverRadius: 6,
              yAxisID: 'y'
            },
            {
              label: 'Temperature (°C)',
              data: [68, 72, 80, 84, 76, 68, 62, 65],
              borderColor: '#ef4444',
              backgroundColor: 'rgba(239, 68, 68, 0.1)',
              borderWidth: 2.5,
              tension: 0.38,
              fill: false,
              pointBackgroundColor: '#ef4444',
              pointBorderColor: '#ffffff',
              pointBorderWidth: 2,
              pointRadius: 4,
              pointHoverRadius: 6,
              yAxisID: 'y'
            },
            {
              label: 'Humidity (%)',
              data: [45, 52, 60, 75, 84, 82, 75, 78],
              borderColor: '#0284c7',
              backgroundColor: 'rgba(2, 132, 199, 0.1)',
              borderWidth: 2.5,
              tension: 0.38,
              fill: false,
              pointBackgroundColor: '#0284c7',
              pointBorderColor: '#ffffff',
              pointBorderWidth: 2,
              pointRadius: 4,
              pointHoverRadius: 6,
              yAxisID: 'y'
            },
            {
              label: 'pH',
              data: [12, 14, 15, 13, 14, 15, 14, 14], // scaled for dual axis visual presentation
              borderColor: '#8b5cf6',
              backgroundColor: 'rgba(139, 92, 246, 0.1)',
              borderWidth: 2.5,
              tension: 0.38,
              fill: false,
              pointBackgroundColor: '#8b5cf6',
              pointBorderColor: '#ffffff',
              pointBorderWidth: 2,
              pointRadius: 4,
              pointHoverRadius: 6,
              yAxisID: 'y1'
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          interaction: {
            mode: 'index',
            intersect: false
          },
          plugins: {
            legend: {
              position: 'top',
              labels: {
                boxWidth: 12,
                boxHeight: 12,
                usePointStyle: true,
                pointStyle: 'circle',
                font: { family: 'Plus Jakarta Sans', size: 11, weight: '600' },
                color: '#334155'
              }
            },
            tooltip: {
              backgroundColor: 'rgba(15, 23, 42, 0.88)',
              titleFont: { family: 'Plus Jakarta Sans', size: 12, weight: '700' },
              bodyFont: { family: 'Plus Jakarta Sans', size: 11 },
              padding: 10,
              cornerRadius: 8
            }
          },
          scales: {
            x: {
              grid: { color: '#f1f5f9' },
              ticks: { color: '#64748b', font: { family: 'Plus Jakarta Sans', size: 10 } }
            },
            y: {
              type: 'linear',
              display: true,
              position: 'left',
              min: 0,
              max: 100,
              title: {
                display: true,
                text: 'Moisture / Humidity (%)',
                color: '#64748b',
                font: { size: 10, weight: '600' }
              },
              grid: { color: '#f1f5f9' },
              ticks: { color: '#64748b', stepSize: 20, font: { size: 10 } }
            },
            y1: {
              type: 'linear',
              display: true,
              position: 'right',
              min: 0,
              max: 40,
              title: {
                display: true,
                text: 'Temperature (°C) / pH',
                color: '#64748b',
                font: { size: 10, weight: '600' }
              },
              grid: { drawOnChartArea: false },
              ticks: { color: '#64748b', stepSize: 10, font: { size: 10 } }
            }
          }
        }
      });
    }

    // 2. Soil Moisture Trend (Today) - Green Gradient Area Chart
    const moistureCtx = document.getElementById('moistureTrendChart')?.getContext('2d');
    if (moistureCtx) {
      // Create Gradient
      const gradient = moistureCtx.createLinearGradient(0, 0, 0, 180);
      gradient.addColorStop(0, 'rgba(34, 197, 94, 0.35)');
      gradient.addColorStop(1, 'rgba(34, 197, 94, 0.02)');

      moistureTrendChart = new Chart(moistureCtx, {
        type: 'line',
        data: {
          labels: ['8 AM', '10 AM', '12 PM', '2 PM', '4 PM', '6 PM', '8 PM'],
          datasets: [{
            label: 'Soil Moisture (%)',
            data: [48, 42, 44, 48, 30, 20, 32],
            borderColor: '#22c55e',
            borderWidth: 2.5,
            backgroundColor: gradient,
            fill: true,
            tension: 0.35,
            pointBackgroundColor: '#22c55e',
            pointBorderColor: '#ffffff',
            pointBorderWidth: 2,
            pointRadius: 4,
            pointHoverRadius: 6
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: {
              enabled: true,
              backgroundColor: '#0f172a',
              titleFont: { weight: '700' },
              padding: 8,
              cornerRadius: 6,
              callbacks: {
                label: (ctx) => `${ctx.parsed.y}%`
              }
            }
          },
          scales: {
            x: {
              grid: { color: '#f8fafc' },
              ticks: {
                color: '#64748b',
                font: { size: 10, weight: '600' },
                callback: function(val, index) {
                  const lbl = this.getLabelForValue(val);
                  return ['8 AM', '12 PM', '4 PM', '8 PM'].includes(lbl) ? lbl : '';
                }
              }
            },
            y: {
              min: 0,
              max: 100,
              title: {
                display: true,
                text: 'Soil Moisture (%)',
                color: '#64748b',
                font: { size: 10, weight: '600' }
              },
              grid: { color: '#f1f5f9' },
              ticks: { color: '#64748b', stepSize: 20, font: { size: 10 } }
            }
          }
        },
        plugins: [{
          id: 'pinnedMoistureTooltip',
          afterDatasetsDraw(chart) {
            const meta = chart.getDatasetMeta(0);
            const point = meta.data[3]; // 2 PM index
            if (!point) return;
            const { ctx } = chart;
            const x = point.x;
            const y = point.y - 10;
            const w = 58;
            const h = 32;
            const r = 5;

            ctx.save();
            ctx.fillStyle = '#0f172a';
            ctx.shadowColor = 'rgba(0, 0, 0, 0.25)';
            ctx.shadowBlur = 6;
            ctx.beginPath();
            if (ctx.roundRect) {
              ctx.roundRect(x - w / 2, y - h, w, h, r);
            } else {
              ctx.rect(x - w / 2, y - h, w, h);
            }
            ctx.fill();

            // Downward arrow
            ctx.beginPath();
            ctx.moveTo(x - 5, y);
            ctx.lineTo(x + 5, y);
            ctx.lineTo(x, y + 5);
            ctx.closePath();
            ctx.fillStyle = '#0f172a';
            ctx.fill();

            // Text
            ctx.shadowBlur = 0;
            ctx.fillStyle = '#ffffff';
            ctx.textAlign = 'center';
            ctx.font = '600 8.5px Plus Jakarta Sans, sans-serif';
            ctx.fillText('2:00 PM', x, y - h + 12);
            ctx.font = '800 10.5px Plus Jakarta Sans, sans-serif';
            ctx.fillText('48 %', x, y - h + 25);
            ctx.restore();
          }
        }]
      });
    }

    // 3. Forecast Moisture Curve (In ML Prediction Subview)
    const forecastCtx = document.getElementById('forecastMoistureChart')?.getContext('2d');
    if (forecastCtx) {
      forecastMoistureChart = new Chart(forecastCtx, {
        type: 'line',
        data: {
          labels: ['Now', '+2h', '+4h (Scheduled)', '+6h', '+8h', '+12h', '+16h', '+20h', '+24h'],
          datasets: [
            {
              label: 'Predicted with Planned Irrigation (Recommended)',
              data: [32, 30, 52, 49, 46, 42, 39, 37, 35],
              borderColor: '#16a34a',
              backgroundColor: 'rgba(22, 163, 74, 0.1)',
              borderWidth: 2.5,
              tension: 0.4,
              fill: true
            },
            {
              label: 'Predicted without Irrigation (Moisture Depletion)',
              data: [32, 29, 25, 21, 18, 15, 12, 10, 8],
              borderColor: '#ef4444',
              borderDash: [5, 5],
              borderWidth: 2,
              tension: 0.4,
              fill: false
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'top',
              labels: { font: { family: 'Plus Jakarta Sans', size: 11 } }
            }
          },
          scales: {
            y: {
              min: 0,
              max: 60,
              title: { display: true, text: 'Soil Moisture (%)' }
            }
          }
        }
      });
    }

    // 4. Water Analytics Bar Chart (In Reports & Analytics Subview)
    const waterCtx = document.getElementById('waterAnalyticsChart')?.getContext('2d');
    if (waterCtx) {
      new Chart(waterCtx, {
        type: 'bar',
        data: {
          labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
          datasets: [
            {
              label: 'SmartAgri IoT Controlled (Liters)',
              data: [142, 138, 125, 140, 110, 130, 128],
              backgroundColor: '#16a34a',
              borderRadius: 6,
              barPercentage: 0.6
            },
            {
              label: 'Traditional Baseline Schedule (Liters)',
              data: [210, 215, 205, 210, 220, 215, 210],
              backgroundColor: '#94a3b8',
              borderRadius: 6,
              barPercentage: 0.6
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'top',
              labels: { font: { family: 'Plus Jakarta Sans', size: 12, weight: '600' } }
            }
          },
          scales: {
            y: {
              beginAtZero: true,
              title: { display: true, text: 'Liters Consumed', color: '#64748b' },
              grid: { color: '#f1f5f9' }
            },
            x: {
              grid: { display: false }
            }
          }
        }
      });
    }

    // 5. 24-Hour Temp & Rain Forecast Chart (In Weather Subview)
    const weatherHourlyCtx = document.getElementById('weatherHourlyChart')?.getContext('2d');
    if (weatherHourlyCtx) {
      new Chart(weatherHourlyCtx, {
        type: 'line',
        data: {
          labels: ['00:00', '03:00', '06:00', '09:00', '12:00', '15:00', '18:00', '21:00'],
          datasets: [
            {
              label: 'Temperature (°C)',
              data: [21, 20, 22, 28, 33, 32, 27, 23],
              borderColor: '#f59e0b',
              backgroundColor: 'rgba(245, 158, 11, 0.12)',
              yAxisID: 'y',
              tension: 0.4,
              fill: true
            },
            {
              label: 'Rainfall Probability (%)',
              data: [0, 0, 5, 10, 15, 20, 10, 5],
              borderColor: '#0284c7',
              backgroundColor: 'rgba(2, 132, 199, 0.15)',
              yAxisID: 'y1',
              tension: 0.4,
              fill: true
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            y: {
              type: 'linear',
              position: 'left',
              title: { display: true, text: 'Temperature (°C)' },
              min: 15,
              max: 40,
              grid: { color: '#f1f5f9' }
            },
            y1: {
              type: 'linear',
              position: 'right',
              title: { display: true, text: 'Rainfall Chance (%)' },
              min: 0,
              max: 100,
              grid: { drawOnChartArea: false }
            }
          }
        }
      });
    }
  }

  // ==========================================================================
  // REAL-TIME TELEMETRY ENGINE & UI UPDATERS
  // ==========================================================================
  function updateTelemetryUI() {
    // 1. Stat Cards
    if (dom.valMoisture) dom.valMoisture.textContent = Math.round(state.soilMoisture);
    if (dom.valTemp) dom.valTemp.textContent = Math.round(state.temperature);
    if (dom.valHumidity) dom.valHumidity.textContent = Math.round(state.humidity);
    if (dom.valPh) dom.valPh.textContent = state.soilPh.toFixed(1);
    if (dom.valFlow) dom.valFlow.textContent = state.waterFlow.toFixed(1);

    // Dynamic badges based on thresholds
    if (dom.badgeMoisture) updateBadge(dom.badgeMoisture, state.soilMoisture < 25 ? 'Low' : (state.soilMoisture > 55 ? 'High' : 'Optimal'), state.soilMoisture < 25 ? 'warning' : 'optimal');
    if (dom.badgeTemp) updateBadge(dom.badgeTemp, state.temperature > 35 ? 'High' : 'Normal', state.temperature > 35 ? 'danger' : 'normal');
    if (dom.badgeFlow) updateBadge(dom.badgeFlow, state.pumpRunning ? 'Active' : (state.waterFlow > 0 ? 'Active' : 'Idle'), state.pumpRunning ? 'active' : 'normal');

    // 2. Table Rows
    const timeStr = getCurrentTimeFormatted();
    if (dom.tblMoisture) dom.tblMoisture.textContent = `${Math.round(state.soilMoisture)} %`;
    if (dom.tblTemp) dom.tblTemp.textContent = `${Math.round(state.temperature)} °C`;
    if (dom.tblHumidity) dom.tblHumidity.textContent = `${Math.round(state.humidity)} %`;
    if (dom.tblPh) dom.tblPh.textContent = `${state.soilPh.toFixed(1)}`;
    if (dom.tblFlow) dom.tblFlow.textContent = `${state.waterFlow.toFixed(1)} L/min`;

    if (dom.tblMoistureTime) dom.tblMoistureTime.textContent = timeStr;
    if (dom.tblTempTime) dom.tblTempTime.textContent = timeStr;
    if (dom.tblHumidityTime) dom.tblHumidityTime.textContent = timeStr;
    if (dom.tblPhTime) dom.tblPhTime.textContent = timeStr;
    if (dom.tblFlowTime) dom.tblFlowTime.textContent = timeStr;

    // 3. ML Prediction Card
    const predictedNext = Math.max(15, Math.round(state.soilMoisture - 3));
    state.predictedMoistureNextHour = predictedNext;
    if (dom.predictedMoisture) dom.predictedMoisture.textContent = predictedNext;

    // 4. Update Water Used
    if (dom.waterUsedVal) dom.waterUsedVal.textContent = `${state.waterUsedTodayLiters.toFixed(1)} L (Today)`;

    // 5. Raw Terminal Stream Entry
    addTerminalLogEntry();
    
    // 6. Record to Sensor Data History
    recordHistoricalData();
  }

  function updateBadge(el, text, type) {
    if (!el) return;
    el.textContent = text;
    el.className = `card-badge badge-${type}`;
  }

  function getCurrentTimeFormatted() {
    const now = new Date();
    let hours = now.getHours();
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12 || 12;
    return `${hours}:${minutes} ${ampm}`;
  }

  function addTerminalLogEntry() {
    if (!dom.rawLogStream) return;
    const now = new Date();
    const timeStamp = now.toTimeString().split(' ')[0];
    const jsonPacket = JSON.stringify({
      node: 'esp32_field_01',
      moist: parseFloat(state.soilMoisture.toFixed(1)),
      temp: parseFloat(state.temperature.toFixed(1)),
      hum: parseFloat(state.humidity.toFixed(1)),
      ph: parseFloat(state.soilPh.toFixed(2)),
      flow: parseFloat(state.waterFlow.toFixed(1)),
      pump: state.pumpRunning ? 1 : 0
    });
    
    const entry = document.createElement('div');
    entry.className = 'terminal-entry';
    entry.innerHTML = `<span style="color:#64748b;">[${timeStamp}]</span> <span style="color:#38bdf8;">MQTT PUB &gt; agro/sensor/packet:</span> ${jsonPacket}`;
    dom.rawLogStream.appendChild(entry);
    dom.rawLogStream.scrollTop = dom.rawLogStream.scrollHeight;

    // Limit scroll backlog
    while (dom.rawLogStream.children.length > 50) {
      dom.rawLogStream.removeChild(dom.rawLogStream.firstChild);
    }
  }

  function recordHistoricalData() {
    const timeStr = getCurrentTimeFormatted();
    const record = {
      timestamp: timeStr,
      nodeId: 'ESP32-Node-01',
      moisture: `${Math.round(state.soilMoisture)}%`,
      temp: `${Math.round(state.temperature)}°C`,
      hum: `${Math.round(state.humidity)}%`,
      ph: state.soilPh.toFixed(1),
      flow: `${state.waterFlow.toFixed(1)} L/m`,
      status: state.soilMoisture >= 30 ? 'Optimal' : 'Low Moisture'
    };
    state.historyLogs.unshift(record);
    if (state.historyLogs.length > 30) state.historyLogs.pop();
    renderHistoryTable();
  }

  function renderHistoryTable() {
    if (!dom.historyTableBody) return;
    const filter = (dom.tableFilterInput?.value || '').toLowerCase();
    
    dom.historyTableBody.innerHTML = '';
    state.historyLogs
      .filter(row => !filter || Object.values(row).some(val => String(val).toLowerCase().includes(filter)))
      .forEach(row => {
        const tr = document.createElement('tr');
        const badgeClass = row.status === 'Optimal' ? 'badge-optimal' : 'badge-warning';
        tr.innerHTML = `
          <td><strong>${row.timestamp}</strong></td>
          <td><span class="text-muted">${row.nodeId}</span></td>
          <td>${row.moisture}</td>
          <td>${row.temp}</td>
          <td>${row.hum}</td>
          <td>${row.ph}</td>
          <td>${row.flow}</td>
          <td><span class="table-badge ${badgeClass}">${row.status}</span></td>
        `;
        dom.historyTableBody.appendChild(tr);
      });
  }

  // Pre-seed some history records
  function seedHistory() {
    const seeds = [
      { timestamp: '10:24 AM', nodeId: 'ESP32-Node-01', moisture: '32%', temp: '28°C', hum: '64%', ph: '6.8', flow: '2.5 L/m', status: 'Optimal' },
      { timestamp: '10:20 AM', nodeId: 'ESP32-Node-01', moisture: '33%', temp: '28°C', hum: '63%', ph: '6.8', flow: '2.5 L/m', status: 'Optimal' },
      { timestamp: '10:15 AM', nodeId: 'ESP32-Node-01', moisture: '34%', temp: '27°C', hum: '65%', ph: '6.8', flow: '2.5 L/m', status: 'Optimal' },
      { timestamp: '10:10 AM', nodeId: 'ESP32-Node-01', moisture: '34%', temp: '27°C', hum: '65%', ph: '6.7', flow: '2.5 L/m', status: 'Optimal' },
      { timestamp: '10:05 AM', nodeId: 'ESP32-Node-01', moisture: '35%', temp: '26°C', hum: '66%', ph: '6.8', flow: '2.5 L/m', status: 'Optimal' }
    ];
    state.historyLogs.push(...seeds);
    renderHistoryTable();
  }

  // ==========================================================================
  // SIMULATION CYCLE (Tick)
  // ==========================================================================
  function runSimulationTick() {
    if (!state.isSimulating) return;

    if (state.pumpRunning) {
      // Pump is on: Moisture increases, water is consumed
      state.soilMoisture = Math.min(65, state.soilMoisture + 1.2);
      state.waterFlow = 4.2 + (Math.random() * 0.4 - 0.2);
      state.waterUsedTodayLiters += 0.3;
      
      // Auto-shutoff when optimal moisture reached in auto mode
      if (state.autoMode && state.soilMoisture >= 55) {
        stopPump(true);
        addAlert('Irrigation cycle automatically completed (Moisture optimal at 55%)', 'green');
        showToast('Auto-Irrigation Complete: Target Moisture Reached', 'success');
      }
    } else {
      // Natural evaporation / transpiration
      state.soilMoisture = Math.max(18, state.soilMoisture - 0.25);
      state.waterFlow = 2.5 + (Math.random() * 0.2 - 0.1);
      
      // Automatic trigger if moisture drops below threshold
      if (state.autoMode && state.soilMoisture <= state.thresholdMoisture) {
        startPump(true);
        addAlert(`Auto-irrigation triggered: Soil moisture dropped below ${state.thresholdMoisture}%`, 'yellow');
        showToast(`Auto Mode: Pump started (Soil Moisture ${Math.round(state.soilMoisture)}%)`, 'warning');
      }
    }

    // Micro fluctuations in atmospheric conditions
    state.temperature += (Math.random() * 0.4 - 0.2);
    state.temperature = Math.max(25, Math.min(36, state.temperature));

    state.humidity += (Math.random() * 0.6 - 0.3);
    state.humidity = Math.max(45, Math.min(85, state.humidity));

    state.soilPh += (Math.random() * 0.04 - 0.02);
    state.soilPh = Math.max(6.4, Math.min(7.2, state.soilPh));

    // Update UI elements
    updateTelemetryUI();

    // Push new data point to live chart every few ticks
    if (liveSensorsChart) {
      const currentDatasets = liveSensorsChart.data.datasets;
      // Gently update current point on live line chart
      currentDatasets[0].data[currentDatasets[0].data.length - 1] = Math.round(state.soilMoisture);
      currentDatasets[1].data[currentDatasets[1].data.length - 1] = Math.round(state.temperature * 2.3); // scaled visually
      currentDatasets[2].data[currentDatasets[2].data.length - 1] = Math.round(state.humidity);
      currentDatasets[3].data[currentDatasets[3].data.length - 1] = Math.round(state.soilPh * 2);
      liveSensorsChart.update('none');
    }
  }

  // ==========================================================================
  // IRRIGATION PUMP CONTROLS
  // ==========================================================================
  function startPump(isAuto = false) {
    state.pumpRunning = true;
    if (dom.pumpStateText) {
      dom.pumpStateText.textContent = 'RUNNING';
      dom.pumpStateText.className = 'pump-state-text state-on';
    }
    dom.pumpSvg?.classList.add('running');
    dom.btnPumpOn?.classList.add('active');
    dom.btnPumpOff?.classList.remove('active');
    
    state.lastIrrigationTimestamp = `${dom.currentDate ? dom.currentDate.textContent : '21 Oct 2026'}, ${getCurrentTimeFormatted()}`;
    if (dom.lastIrrigationVal) dom.lastIrrigationVal.textContent = state.lastIrrigationTimestamp;

    playTone(520, 'sine', 0.2);

    if (!isAuto) {
      addAlert(`Irrigation started manually via Dashboard`, 'blue');
      showToast('Water Pump Started: Active Irrigation', 'success');
    }
  }

  function stopPump(isAuto = false) {
    state.pumpRunning = false;
    if (dom.pumpStateText) {
      dom.pumpStateText.textContent = 'OFF';
      dom.pumpStateText.className = 'pump-state-text state-off';
    }
    dom.pumpSvg?.classList.remove('running');
    dom.btnPumpOff?.classList.add('active');
    dom.btnPumpOn?.classList.remove('active');

    playTone(320, 'sine', 0.15);

    if (!isAuto) {
      addAlert(`Irrigation stopped manually by user`, 'green');
      showToast('Water Pump Stopped', 'warning');
    }
  }

  dom.btnPumpOn?.addEventListener('click', () => {
    startPump(false);
  });

  dom.btnPumpOff?.addEventListener('click', () => {
    stopPump(false);
  });

  dom.autoModeToggle?.addEventListener('change', (e) => {
    state.autoMode = e.target.checked;
    showToast(state.autoMode ? 'Automatic Mode Enabled (ML Auto-Pilot Active)' : 'Automatic Mode Disabled (Manual Control)', 'success');
  });

  // ==========================================================================
  // ALERTS & NOTIFICATIONS FEED
  // ==========================================================================
  function addAlert(message, bulletColor = 'green') {
    if (!dom.alertsList) return;
    const timeStr = getCurrentTimeFormatted();
    const li = document.createElement('li');
    li.className = 'alert-item';
    li.innerHTML = `
      <span class="alert-bullet bullet-${bulletColor}"></span>
      <span class="alert-time">${timeStr}</span>
      <span class="alert-text">${message}</span>
    `;
    dom.alertsList.insertBefore(li, dom.alertsList.firstChild);

    // Limit to 7 recent alerts
    while (dom.alertsList.children.length > 7) {
      dom.alertsList.removeChild(dom.alertsList.lastChild);
    }
  }

  // ==========================================================================
  // TOAST NOTIFICATION SYSTEM
  // ==========================================================================
  function showToast(message, type = 'success') {
    if (!dom.toastContainer) return;
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    const icon = type === 'success' ? 'fa-circle-check' : (type === 'warning' ? 'fa-triangle-exclamation' : 'fa-circle-xmark');
    toast.innerHTML = `<i class="fa-solid ${icon}"></i> <span>${message}</span>`;
    
    dom.toastContainer.appendChild(toast);
    setTimeout(() => {
      toast.style.animation = 'slideOut 0.3s forwards ease';
      setTimeout(() => toast.remove(), 320);
    }, 3500);
  }

  // ==========================================================================
  // SIDEBAR NAVIGATION & SUBVIEW SWITCHER (SUPPORTS SEPARATE PAGES & IN-PAGE PANELS)
  // ==========================================================================
  // Determine current active page
  const currentPath = window.location.pathname.split('/').pop() || 'index.html';
  
  dom.navItems.forEach(item => {
    const href = item.getAttribute('href');
    
    // Highlight active link based on current page URL
    if (href === currentPath || 
        (currentPath === '' && href === 'index.html') || 
        (currentPath === 'dashboard.html' && href === 'index.html')) {
      item.classList.add('active');
    } else if (href && href.endsWith('.html')) {
      item.classList.remove('active');
    }

    item.addEventListener('click', (e) => {
      // If link points to another .html page, allow normal browser navigation!
      if (href && href.includes('.html')) {
        return;
      }

      e.preventDefault();
      const targetView = item.getAttribute('data-view');
      if (!targetView) return;

      // Update active nav class
      dom.navItems.forEach(nav => nav.classList.remove('active'));
      item.classList.add('active');

      // Update active view panel if present on this page
      dom.viewPanels.forEach(panel => {
        panel.classList.remove('active');
        if (panel.id === `view-${targetView}`) {
          panel.classList.add('active');
        }
      });

      // Close mobile sidebar if open
      if (window.innerWidth <= 1024) {
        dom.sidebar?.classList.remove('open');
      }

      playTone(440, 'triangle', 0.08);
    });
  });

  // Hamburger Toggle for Sidebar (Desktop Collapse + Mobile Slide)
  const toggleSidebar = () => {
    if (window.innerWidth <= 1024) {
      dom.sidebar?.classList.toggle('open');
    } else {
      dom.sidebar?.classList.toggle('collapsed');
      document.body.classList.toggle('sidebar-collapsed');
    }
    if (typeof playTone === 'function') {
      playTone(440, 'triangle', 0.08);
    }
  };

  dom.menuToggle?.addEventListener('click', toggleSidebar);
  dom.mobileMenuToggle?.addEventListener('click', () => {
    dom.sidebar?.classList.toggle('open');
    if (typeof playTone === 'function') {
      playTone(440, 'triangle', 0.08);
    }
  });

  // Close sidebar on click outside on mobile
  document.addEventListener('click', (e) => {
    if (window.innerWidth <= 1024 && dom.sidebar?.classList.contains('open')) {
      if (
        !dom.sidebar.contains(e.target) &&
        !dom.menuToggle?.contains(e.target) &&
        !dom.mobileMenuToggle?.contains(e.target)
      ) {
        dom.sidebar.classList.remove('open');
      }
    }
  });

  // ==========================================================================
  // MODULE 1: AUTHENTICATION & USER PROFILE DROPDOWN
  // ==========================================================================
  // Toggle profile dropdown
  dom.userMenuBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    dom.profileDropdownContainer?.classList.toggle('open');
  });

  // Close dropdown on click outside
  document.addEventListener('click', (e) => {
    if (!dom.profileDropdownContainer?.contains(e.target)) {
      dom.profileDropdownContainer?.classList.remove('open');
    }
  });

  // Auth modal open/close
  dom.openAuthModalBtn?.addEventListener('click', (e) => {
    e.preventDefault();
    if (dom.authModal) dom.authModal.style.display = 'flex';
    dom.profileDropdownContainer?.classList.remove('open');
  });

  dom.closeAuthModalBtn?.addEventListener('click', () => {
    if (dom.authModal) dom.authModal.style.display = 'none';
  });

  dom.authModal?.addEventListener('click', (e) => {
    if (e.target === dom.authModal) {
      dom.authModal.style.display = 'none';
    }
  });

  // Switch tabs in modal
  dom.tabSignInBtn?.addEventListener('click', () => {
    dom.tabSignInBtn.classList.add('active');
    dom.tabSignUpBtn?.classList.remove('active');
    if (dom.formSignIn) dom.formSignIn.style.display = 'block';
    if (dom.formSignUp) dom.formSignUp.style.display = 'none';
  });

  dom.tabSignUpBtn?.addEventListener('click', () => {
    dom.tabSignUpBtn.classList.add('active');
    dom.tabSignInBtn?.classList.remove('active');
    if (dom.formSignUp) dom.formSignUp.style.display = 'block';
    if (dom.formSignIn) dom.formSignIn.style.display = 'none';
  });

  // Demo 1-Click Instant Login
  dom.demoOneClickLoginBtn?.addEventListener('click', () => {
    if (dom.currentUserName) dom.currentUserName.textContent = 'Ram Kumar';
    if (dom.dropdownUserName) dom.dropdownUserName.textContent = 'Ram Kumar';
    if (dom.dropdownUserRole) dom.dropdownUserRole.textContent = 'Farm Agronomist';
    if (dom.authModal) dom.authModal.style.display = 'none';
    showToast('Signed in successfully as Demo Agronomist (Ram Kumar)', 'success');
  });

  // Sign In Form submission
  dom.formSignIn?.addEventListener('submit', (e) => {
    e.preventDefault();
    const email = document.getElementById('loginEmail')?.value || 'Admin';
    const role = document.getElementById('loginRole')?.value || 'Farm Agronomist';
    const name = email.split('@')[0];
    const capitalized = name.charAt(0).toUpperCase() + name.slice(1);
    if (dom.currentUserName) dom.currentUserName.textContent = capitalized;
    if (dom.dropdownUserName) dom.dropdownUserName.textContent = capitalized;
    if (dom.dropdownUserRole) dom.dropdownUserRole.textContent = role;
    if (dom.authModal) dom.authModal.style.display = 'none';
    showToast(`Welcome back, ${capitalized}! (${role})`, 'success');
  });

  // Sign Up Form submission
  dom.formSignUp?.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = document.getElementById('regName')?.value || 'New Farmer';
    if (dom.currentUserName) dom.currentUserName.textContent = name;
    if (dom.dropdownUserName) dom.dropdownUserName.textContent = name;
    if (dom.authModal) dom.authModal.style.display = 'none';
    showToast(`Account created successfully! Welcome to SmartAgri, ${name}.`, 'success');
  });

  // Sign Out
  dom.logoutBtn?.addEventListener('click', (e) => {
    e.preventDefault();
    if (dom.currentUserName) dom.currentUserName.textContent = 'Guest User';
    if (dom.dropdownUserName) dom.dropdownUserName.textContent = 'Guest';
    if (dom.dropdownUserRole) dom.dropdownUserRole.textContent = 'Visitor Mode';
    dom.profileDropdownContainer?.classList.remove('open');
    showToast('Signed out of SmartAgri Session', 'warning');
  });

  // ==========================================================================
  // SIMULATION TOGGLE CONTROL
  // ==========================================================================
  dom.simToggleBtn?.addEventListener('click', () => {
    state.isSimulating = !state.isSimulating;
    if (state.isSimulating) {
      if (dom.simPlayIcon) dom.simPlayIcon.className = 'fa-solid fa-play';
      if (dom.simBtnLabel) dom.simBtnLabel.textContent = 'Live Active';
      if (dom.simToggleBtn) dom.simToggleBtn.style.background = '#ecfdf5';
      if (dom.connectionStatusText) dom.connectionStatusText.textContent = 'Device Online';
      showToast('Live IoT Stream Resumed', 'success');
    } else {
      if (dom.simPlayIcon) dom.simPlayIcon.className = 'fa-solid fa-pause';
      if (dom.simBtnLabel) dom.simBtnLabel.textContent = 'Stream Paused';
      if (dom.simToggleBtn) dom.simToggleBtn.style.background = '#fef3c7';
      if (dom.connectionStatusText) dom.connectionStatusText.textContent = 'Stream Paused';
      showToast('Live Telemetry Simulation Paused', 'warning');
    }
  });

  // ==========================================================================
  // LIVE MONITORING SUBVIEW ACTIONS
  // ==========================================================================
  dom.clearStreamLogsBtn?.addEventListener('click', () => {
    if (dom.rawLogStream) dom.rawLogStream.innerHTML = '';
    showToast('Telemetry stream logs cleared', 'success');
  });

  dom.pingEsp32Btn?.addEventListener('click', () => {
    showToast('Ping sent to ESP32: RTT = 12ms, 0% Packet Loss', 'success');
    addAlert('ESP32 ping echo confirmed (12ms latency)', 'blue');
  });

  // ==========================================================================
  // CSV EXPORT FUNCTIONALITY
  // ==========================================================================
  dom.exportCsvBtn?.addEventListener('click', () => {
    if (!state.historyLogs.length) {
      showToast('No records to export', 'warning');
      return;
    }
    const headers = ['Timestamp', 'Node ID', 'Soil Moisture', 'Air Temperature', 'Humidity', 'pH', 'Water Flow', 'Status'];
    const rows = state.historyLogs.map(r => [
      `"${r.timestamp}"`,
      `"${r.nodeId}"`,
      `"${r.moisture}"`,
      `"${r.temp}"`,
      `"${r.hum}"`,
      `"${r.ph}"`,
      `"${r.flow}"`,
      `"${r.status}"`
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `SmartAgri_Telemetry_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Exported CSV Telemetry Report', 'success');
  });

  // Filter Input for History Table
  dom.tableFilterInput?.addEventListener('input', () => {
    renderHistoryTable();
  });

  // ==========================================================================
  // ML MODEL INFERENCE TRIGGER
  // ==========================================================================
  dom.triggerMlInferenceBtn?.addEventListener('click', () => {
    dom.triggerMlInferenceBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Calculating...';
    setTimeout(() => {
      dom.triggerMlInferenceBtn.innerHTML = '<i class="fa-solid fa-rotate"></i> Re-run Prediction';
      showToast('ML Inference complete: Next Irrigation in 4.2 Hours (Confidence 93.4%)', 'success');
      addAlert('ML Predictive Model recalibrated with recent telemetry', 'green');
    }, 900);
  });

  // ==========================================================================
  // THRESHOLD SLIDERS IN IRRIGATION TAB
  // ==========================================================================
  dom.thresholdMoistureInput?.addEventListener('input', (e) => {
    state.thresholdMoisture = parseInt(e.target.value);
    if (dom.sliderMoistureVal) dom.sliderMoistureVal.textContent = `${state.thresholdMoisture}%`;
  });

  dom.thresholdDurationInput?.addEventListener('input', (e) => {
    state.thresholdDuration = parseInt(e.target.value);
    if (dom.sliderDurationVal) dom.sliderDurationVal.textContent = `${state.thresholdDuration} Minutes`;
  });

  // Settings Save
  dom.saveSettingsBtn?.addEventListener('click', () => {
    showToast('Gateway configuration and calibration offsets saved successfully', 'success');
  });

  // Polling rate changer
  dom.pollIntervalSelect?.addEventListener('change', (e) => {
    state.pollIntervalMs = parseInt(e.target.value);
    clearInterval(state.simIntervalId);
    state.simIntervalId = setInterval(runSimulationTick, state.pollIntervalMs);
    showToast(`Telemetry polling frequency adjusted to ${state.pollIntervalMs / 1000}s`, 'success');
  });

  // Global zone test function
  window.triggerManualZone = function(zoneId) {
    showToast(`Test pulse initiated on Valve Zone ${zoneId} (5 second cycle)`, 'success');
    addAlert(`Valve Zone ${zoneId} manual pulse executed`, 'blue');
    playTone(480, 'sine', 0.15);
  };

  // ==========================================================================
  // ALERTS MANAGEMENT (MODULE 9)
  // ==========================================================================
  const filterPills = dom.alertCategoryFilters?.querySelectorAll('.filter-pill');
  filterPills?.forEach(pill => {
    pill.addEventListener('click', () => {
      filterPills.forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      const filter = pill.getAttribute('data-filter');
      const rows = dom.detailedAlertsBody?.querySelectorAll('tr');
      rows?.forEach(r => {
        if (filter === 'all' || r.getAttribute('data-category') === filter) {
          r.style.display = '';
        } else {
          r.style.display = 'none';
        }
      });
    });
  });

  dom.markAllAlertsReadBtn?.addEventListener('click', () => {
    const badges = dom.detailedAlertsBody?.querySelectorAll('.badge-warning, .badge-danger');
    badges?.forEach(b => {
      b.className = 'table-badge badge-optimal';
      b.innerHTML = '<i class="fa-solid fa-circle-check"></i> Resolved';
    });
    const critCount = document.getElementById('countCriticalAlerts');
    const warnCount = document.getElementById('countWarningAlerts');
    const resolvedCount = document.getElementById('countResolvedAlerts');
    if (critCount) critCount.textContent = '0';
    if (warnCount) warnCount.textContent = '0';
    if (resolvedCount) resolvedCount.textContent = '17';
    showToast('All system alerts marked as acknowledged and resolved', 'success');
  });

  dom.triggerTestAlertBtn?.addEventListener('click', () => {
    if (dom.detailedAlertsBody) {
      const tr = document.createElement('tr');
      tr.setAttribute('data-category', 'warning');
      tr.innerHTML = `
        <td><span class="table-badge badge-warning"><i class="fa-solid fa-triangle-exclamation"></i> Warning</span></td>
        <td><strong>${getCurrentTimeFormatted()}</strong></td>
        <td>Sensor Hub ESP32</td>
        <td>Simulated soil moisture dip detected on Plot B Zone 3</td>
        <td>24% (&lt; 30% trigger)</td>
        <td><span class="table-badge badge-warning">Active Watch</span></td>
        <td><button class="btn btn-sm btn-outline" onclick="resolveAlertRow(this)">Acknowledge</button></td>
      `;
      dom.detailedAlertsBody.insertBefore(tr, dom.detailedAlertsBody.firstChild);
      playTone(660, 'sawtooth', 0.15);
      showToast('Simulated alert generated: Soil moisture anomaly', 'warning');
    }
  });

  window.resolveAlertRow = function(btn) {
    const row = btn.closest('tr');
    if (row) {
      const badge = row.querySelector('td:nth-child(6) span');
      if (badge) {
        badge.className = 'table-badge badge-optimal';
        badge.textContent = 'Resolved';
      }
      btn.disabled = true;
      btn.textContent = 'Acknowledged';
      btn.style.opacity = '0.6';
      showToast('Incident acknowledged and marked resolved', 'success');
    }
  };

  // Weather Refresh
  dom.refreshWeatherBtn?.addEventListener('click', () => {
    dom.refreshWeatherBtn.innerHTML = '<i class="fa-solid fa-arrows-rotate fa-spin"></i> Refreshing...';
    setTimeout(() => {
      dom.refreshWeatherBtn.innerHTML = '<i class="fa-solid fa-arrows-rotate"></i> Refresh Forecast';
      const tempEl = document.getElementById('weatherHeroTemp');
      if (tempEl) tempEl.textContent = '33°C';
      showToast('Agrometeorological radar data refreshed from NOAA / OpenMeteo', 'success');
    }, 800);
  });

  // Audit Log Export
  dom.exportAuditLogBtn?.addEventListener('click', () => {
    showToast('Exporting 30-Day Agrometeorological & Water Audit Log (CSV)...', 'success');
  });

  // ==========================================================================
  // SYSTEM CLOCK
  // ==========================================================================
  function startClock() {
    const updateTimeDisplay = () => {
      const now = new Date();
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      if (dom.currentDate) {
        dom.currentDate.textContent = `${now.getDate()} ${months[now.getMonth()]} ${now.getFullYear()}`;
      }
      if (dom.currentTime) {
        dom.currentTime.textContent = getCurrentTimeFormatted();
      }
    };

    updateTimeDisplay();
    state.clockIntervalId = setInterval(updateTimeDisplay, 1000);
  }

  // ==========================================================================
  // INITIALIZE EVERYTHING
  // ==========================================================================
  initCharts();
  seedHistory();
  updateTelemetryUI();
  startClock();
  state.simIntervalId = setInterval(runSimulationTick, state.pollIntervalMs);

  console.log('🌱 SmartAgri Dashboard Initialized Successfully.');
});
