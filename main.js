/**
 * EXAMS VENTURE - UNIFIED MAIN APPLICATION LOGIC
 * Supports both 4.0 and 5.0 scales using config.js
 */

/**
 * THEME (Light / Dark)
 */
const THEME_KEY = 'ev-theme';
const CHART_JS_URL = 'https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js';
const JSPDF_URL = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
const ADSENSE_URL = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-XXXXXXXXXXXXXXXX';
const IS_NATIVE_CAPACITOR = Boolean(window.Capacitor?.isNativePlatform?.());
const NATIVE_APP_PACKAGE_ID = 'com.examsventure.app';
const NATIVE_APP_NAME = 'Exams Venture';

let chartLibraryPromise = null;
let jsPdfLibraryPromise = null;
let adSenseLibraryPromise = null;

function loadExternalScript(src) {
    return new Promise((resolve, reject) => {
        const existing = document.querySelector(`script[data-src="${src}"]`);
        if (existing && (existing.dataset.loaded === 'true' || (window.Chart && src === CHART_JS_URL) || (window.jspdf && src === JSPDF_URL))) {
            resolve();
            return;
        }

        if (existing) {
            existing.addEventListener('load', () => resolve(), { once: true });
            existing.addEventListener('error', () => reject(new Error(`Failed to load ${src}`)), { once: true });
            return;
        }

        const script = document.createElement('script');
        script.src = src;
        script.async = true;
        script.dataset.src = src;
        script.addEventListener('load', () => {
            script.dataset.loaded = 'true';
            resolve();
        }, { once: true });
        script.addEventListener('error', () => reject(new Error(`Failed to load ${src}`)), { once: true });
        document.head.appendChild(script);
    });
}

function ensureChartLibrary() {
    if (window.Chart) return Promise.resolve(window.Chart);
    if (!chartLibraryPromise) {
        chartLibraryPromise = loadExternalScript(CHART_JS_URL).then(() => window.Chart);
    }
    return chartLibraryPromise;
}

function ensureJsPdfLibrary() {
    if (window.jspdf?.jsPDF) return Promise.resolve(window.jspdf.jsPDF);
    if (!jsPdfLibraryPromise) {
        jsPdfLibraryPromise = loadExternalScript(JSPDF_URL).then(() => window.jspdf.jsPDF);
    }
    return jsPdfLibraryPromise;
}

function ensureAdSenseLibrary() {
    if (window.adsbygoogle) return Promise.resolve(window.adsbygoogle);
    if (!adSenseLibraryPromise) {
        adSenseLibraryPromise = loadExternalScript(ADSENSE_URL).then(() => window.adsbygoogle);
    }
    return adSenseLibraryPromise;
}

function initTheme() {
    const saved = localStorage.getItem(THEME_KEY) || 'light';
    document.documentElement.setAttribute('data-theme', saved);
    updateThemeButton(saved);
}

function toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme') || 'light';
    const next = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem(THEME_KEY, next);
    updateThemeButton(next);
}

function updateThemeButton(theme) {
    const btn = document.getElementById('theme-toggle-btn');
    if (btn) btn.textContent = theme === 'dark' ? ' Light Mode' : ' Dark Mode';
}

function readThemeVar(name, fallback) {
    const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    return value || fallback;
}

function bootAdSenseWhenReady() {
    const adHouse = document.getElementById('ad-house');
    if (!adHouse || adHouse.style.display === 'none') return;

    void ensureAdSenseLibrary()
        .then(() => {
            AdEngine.init();
        })
        .catch(err => console.warn('AdSense library could not be loaded:', err));
}

function installNativeApp() {
    const platform = window.Capacitor?.getPlatform?.() || 'web';
    const androidMarketUrl = `market://details?id=${NATIVE_APP_PACKAGE_ID}`;
    const androidWebUrl = `https://play.google.com/store/apps/details?id=${NATIVE_APP_PACKAGE_ID}`;
    const iosSearchUrl = `https://apps.apple.com/us/search?term=${encodeURIComponent(NATIVE_APP_NAME)}`;

    if (platform === 'android' || /Android/i.test(navigator.userAgent)) {
        try {
            window.location.href = androidMarketUrl;
            setTimeout(() => {
                if (document.visibilityState === 'visible') {
                    window.location.href = androidWebUrl;
                }
            }, 1200);
        } catch (error) {
            window.location.href = androidWebUrl;
        }
        return;
    }

    if (platform === 'ios' || /iPhone|iPad|iPod/i.test(navigator.userAgent)) {
        window.location.href = iosSearchUrl;
        return;
    }

    window.open(androidWebUrl, '_blank', 'noopener,noreferrer');
}

function openContactPage() {
    const scaleFromQuery = new URLSearchParams(window.location.search).get('scale');
    const scale = (scaleFromQuery || localStorage.getItem('ev-scale') || '5.0').toString();
    let page = 'contact_5_0.html';
    if (scale.startsWith('4')) page = 'contact_4_0.html';
    else if (scale.startsWith('7')) page = 'contact_7_0.html';
    window.location.href = page;
}

/**
 * UI & VIEW CONTROLS
 */
function toggleSidebar() {
    const menu = document.getElementById("side-menu");
    const overlay = document.getElementById("overlay");
    const isOpen = menu ? !menu.classList.contains("active") : false;

    if (menu) menu.classList.toggle("active", isOpen);
    document.body.classList.toggle("sidebar-open", isOpen);
    if (overlay) overlay.style.display = isOpen ? "block" : "none";
}

function switchView(viewId) {
    document.querySelectorAll('.view').forEach(view => view.classList.remove('active'));
    const targetView = document.getElementById(viewId);
    if (targetView) targetView.classList.add('active');

    const navLinks = document.querySelectorAll('.sidebar-nav .nav-item');
    navLinks.forEach(item => item.classList.remove('active'));
    
    const navIndices = { 
        'view-dashboard': 0, 
        'view-calc': 1, 
        'view-target': 2,
        'view-profile': 3,
    };
    
    const activeIndex = navIndices[viewId];
    if (activeIndex !== undefined && navLinks[activeIndex]) {
        navLinks[activeIndex].classList.add('active');
    }

    if (viewId === 'view-target' || viewId === 'view-dashboard') {
        updateRemainingUnitsDisplay();
    }
    if (viewId === 'view-calc') {
        setTimeout(updateProjectedCGPA, 100);
    }

    updatePWAInstallUI();

    const menu = document.getElementById("side-menu");
    if (menu && menu.classList.contains("active")) toggleSidebar();
    
    // ===== NAVIGATION-TRIGGERED AD REFRESH (Google AdSense User-Action Model) =====
    // Only refresh on navigation if online and eligible per 3-minute rule
    if (navigator.onLine && canContextRefreshAd() && AdEngine.isEligibleForRefresh()) {
        recordContextAdRefresh();
        AdEngine.pushAd();
    }
}

/**
 * SEMESTER & COURSE ROW LOGIC
 */
function renderCourseRow(code = '', unit = '', grade = '') {
    const config = getConfig();
    const defaultGrade = grade || config.defaultGrade;
    
    const container = document.getElementById('course-container');
    const row = document.createElement('div');
    row.className = 'course-row';
    row.style.opacity = '0';
    row.style.transform = 'translateY(15px)';
    row.style.transition = 'all 0.3s ease-out';
    
    let gradeOptions = config.grades.map(g => 
        `<option value="${g.value}" ${defaultGrade == g.value ? 'selected' : ''}>${g.letter}</option>`
    ).join('');
    
    row.innerHTML = `
        <input type="text" placeholder="Course" class="inp-code" value="${code}">
        <input type="text" inputmode="decimal" placeholder="Unit" class="inp-unit" value="${unit}" pattern="[0-9]*">
        <select class="inp-grade">
            ${gradeOptions}
        </select>
        <button class="btn-remove" onclick="removeRow(this)"></button>
    `;
    
    container.appendChild(row);
    requestAnimationFrame(() => {
        row.style.opacity = '1';
        row.style.transform = 'translateY(0)';
    });
}

function addCourseRow() {
    renderCourseRow();
    setTimeout(updateProjectedCGPA, 50);
}

function removeRow(btn) {
    const row = btn.parentElement;
    row.style.opacity = '0';
    row.style.transform = 'translateX(20px)';
    setTimeout(() => {
        row.remove();
        updateProjectedCGPA();
    }, 200);
}

function populateSemesters() {
    const select = document.getElementById('sem-select');
    if (!select) return;
    const levels = [100, 200, 300, 400, 500, 600];
    const sessions = ["First Semester", "Second Semester"];
    
    select.innerHTML = ''; 
    levels.forEach(level => {
        sessions.forEach(session => {
            const option = document.createElement('option');
            option.value = `${level}-${session.split(' ')[0]}`;
            option.textContent = `${level} Level - ${session}`;
            select.appendChild(option);
        });
    });

    select.addEventListener('change', (e) => loadSemesterData(e.target.value));
}

function updateProjectedCGPA() {
    const config = getConfig();
    const el = document.getElementById('projected-cgpa');
    if (!el) return;
    const selectedSem = document.getElementById('sem-select')?.value;
    if (!selectedSem) { el.textContent = '--'; return; }

    let totalPoints = 0, totalUnits = 0;

    Object.keys(localStorage).filter(k => k.startsWith(config.prefixes.data) && k !== getStorageKey('data', selectedSem)).forEach(key => {
        (JSON.parse(localStorage.getItem(key) || '[]')).forEach(c => {
            const u = parseInt(c.unit) || 0;
            const g = limitGrade(c.grade);
            totalUnits += u;
            totalPoints += (u * g);
        });
    });

    document.querySelectorAll('.course-row').forEach(row => {
        const code = row.querySelector('.inp-code')?.value;
        const unit = parseInt(row.querySelector('.inp-unit')?.value) || 0;
        const grade = limitGrade(row.querySelector('.inp-grade')?.value);
        if (code || unit > 0) {
            totalUnits += unit;
            totalPoints += (unit * grade);
        }
    });

    if (totalUnits === 0) { el.textContent = '--'; return; }
    el.textContent = (totalPoints / totalUnits).toFixed(2);
}

/**
 * DATA PERSISTENCE (SAVE & LOAD)
 */
function loadSemesterData(semesterKey) {
    const config = getConfig();
    const container = document.getElementById('course-container');
    container.innerHTML = '';
    const savedData = localStorage.getItem(getStorageKey('data', semesterKey));
    if (savedData) {
        JSON.parse(savedData).forEach(c => renderCourseRow(c.code, c.unit, c.grade));
    } else {
        for(let i=0; i<5; i++) renderCourseRow();
    }
    const notesEl = document.getElementById('semester-notes');
    if (notesEl) notesEl.value = localStorage.getItem(getStorageKey('notes', semesterKey)) || '';
    setTimeout(updateProjectedCGPA, 50);
}

function saveSemesterData() {
    const config = getConfig();
    const selectedSem = document.getElementById('sem-select').value;
    const rows = document.querySelectorAll('.course-row');
    const semesterData = [];

    rows.forEach(row => {
        const code = row.querySelector('.inp-code').value;
        const unit = row.querySelector('.inp-unit').value;
        const grade = row.querySelector('.inp-grade').value;

        if (code || unit > 0) {
            semesterData.push({ 
                code: code, 
                unit: parseInt(unit) || 0, 
                grade: grade 
            });
        }
    });

    if (semesterData.length === 0) {
        alert("Please add at least one course before saving.");
        return;
    }

    localStorage.setItem(getStorageKey('data', selectedSem), JSON.stringify(semesterData));
    const notes = document.getElementById('semester-notes')?.value?.trim() || '';
    localStorage.setItem(getStorageKey('notes', selectedSem), notes);
    
    updateDashboard(); 
    getRemainingUnits(); 
    switchView('view-dashboard');
    
    alert(`Semester saved successfully to ${ACTIVE_SCALE} database!`);
    triggerAdRefresh();
}

/**
 * DASHBOARD & ANALYSIS
 */
function updateDashboard() {
    const config = getConfig();
    const displayCgpaEl = document.getElementById('display-cgpa');
    const displayUnitsEl = document.getElementById('display-units');
    const displayClassEl = document.getElementById('display-class');
    if (!displayCgpaEl || !displayUnitsEl || !displayClassEl) return;

    let totalPoints = 0, totalUnits = 0;

    Object.keys(localStorage).filter(k => k.startsWith(config.prefixes.data)).forEach(key => {
        JSON.parse(localStorage.getItem(key)).forEach(course => {
            const units = parseInt(course.unit) || 0;
            totalUnits += units;
            totalPoints += (units * limitGrade(course.grade));
        });
    });

    const cgpa = totalUnits > 0 ? (totalPoints / totalUnits).toFixed(2) : "0.00";
    
    displayCgpaEl.innerText = cgpa;
    displayUnitsEl.innerText = totalUnits;

    let degreeClass = "Pass";
    let nextBoundary = config.maxGPA;
    let boundaryName = `Max GPA`;

    for (const boundary of config.boundaries) {
        if (cgpa >= boundary.threshold) {
            degreeClass = boundary.label;
            nextBoundary = boundary.nextThreshold;
            boundaryName = boundary.nextLabel;
            break;
        }
    }

    displayClassEl.innerText = degreeClass;

    const gap = (nextBoundary - parseFloat(cgpa)).toFixed(2);
    const progressPercent = (parseFloat(cgpa) / config.maxGPA) * 100;

    const predictorDiv = document.getElementById('class-predictor');
    if (predictorDiv) {
        predictorDiv.innerHTML = `
            <div class="progress-container">
                <div class="progress-bar" style="width: ${progressPercent}%"></div>
            </div>
            <small style="color: var(--text-dim)">
                ${gap > 0 ? `<b>${gap}</b> points away from <b>${boundaryName}</b>` : "Top Tier Reached"}
            </small>
        `;
    }

    const cgpaCard = document.getElementById('current-cgpa-card');
    if (cgpaCard) {
        cgpaCard.style.cursor = 'pointer';
        cgpaCard.title = 'Open CGPA Calculator';
        cgpaCard.onclick = () => {
            switchView('view-calc');
        };
    }

    renderAcademicHistory();
    scheduleDashboardCharts();
}

function scheduleDashboardCharts() {
    const trendCanvas = document.getElementById('gpa-trend-chart');
    const distCanvas = document.getElementById('grade-dist-chart');
    if (!trendCanvas || !distCanvas) return;

    if (window.Chart) {
        renderGpaTrendChart();
        renderGradeDistributionChart();
        return;
    }

    void ensureChartLibrary()
        .then(() => {
            renderGpaTrendChart();
            renderGradeDistributionChart();
        })
        .catch(err => console.warn('Chart library could not be loaded:', err));
}

let gpaTrendChartInstance = null;
let gradeDistChartInstance = null;

function renderGpaTrendChart() {
    if (!window.Chart) return;
    const config = getConfig();
    const textDim = readThemeVar('--text-dim', '#b8c7db');
    const grid = readThemeVar('--line', 'rgba(148, 163, 184, 0.2)');
    const keys = Object.keys(localStorage).filter(k => k.startsWith(config.prefixes.data)).sort();
    const canvas = document.getElementById('gpa-trend-chart');
    const emptyMsg = document.getElementById('gpa-chart-empty');
    if (!canvas) return;

    if (keys.length === 0) {
        canvas.parentElement.style.display = 'none';
        if (emptyMsg) emptyMsg.style.display = 'block';
        if (gpaTrendChartInstance) {
            gpaTrendChartInstance.destroy();
            gpaTrendChartInstance = null;
        }
        return;
    }

    canvas.parentElement.style.display = 'block';
    if (emptyMsg) emptyMsg.style.display = 'none';

    let cumulativePoints = 0, cumulativeUnits = 0;
    const labels = [];
    const cgpaData = [];

    keys.forEach(key => {
        const semesterData = JSON.parse(localStorage.getItem(key) || '[]');
        let sPoints = 0, sUnits = 0;
        semesterData.forEach(c => {
            const u = parseInt(c.unit) || 0;
            const g = limitGrade(c.grade);
            sUnits += u;
            sPoints += (u * g);
        });
        cumulativePoints += sPoints;
        cumulativeUnits += sUnits;
        const cgpa = cumulativeUnits > 0 ? parseFloat((cumulativePoints / cumulativeUnits).toFixed(2)) : 0;
        const prefix = config.prefixes.data;
        labels.push(key.replace(prefix, '').replace('-', ' Lvl '));
        cgpaData.push(cgpa);
    });

    if (gpaTrendChartInstance) gpaTrendChartInstance.destroy();

    const ctx = canvas.getContext('2d');
    gpaTrendChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels,
            datasets: [{
                label: 'CGPA',
                data: cgpaData,
                borderColor: '#fbbf24',
                backgroundColor: 'rgba(251, 191, 36, 0.1)',
                borderWidth: 2,
                fill: true,
                tension: 0.3,
                pointBackgroundColor: '#fbbf24',
                pointBorderColor: '#0b0e14',
                pointBorderWidth: 1,
                pointRadius: 4,
                pointHoverRadius: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false }
            },
            scales: {
                x: {
                    grid: { color: grid },
                    ticks: { color: textDim, maxRotation: 45, fontSize: 10 }
                },
                y: {
                    min: 0,
                    max: config.chartMaxY,
                    grid: { color: grid },
                    ticks: { color: textDim, fontSize: 10 }
                }
            }
        }
    });
}

function renderGradeDistributionChart() {
    if (!window.Chart) return;
    const config = getConfig();
    const textDim = readThemeVar('--text-dim', '#b8c7db');
    const chartBorder = readThemeVar('--card', '#111d2f');
    const unitCount = {};
    config.grades.forEach(g => unitCount[g.value] = 0);

    Object.keys(localStorage).filter(k => k.startsWith(config.prefixes.data)).forEach(key => {
        (JSON.parse(localStorage.getItem(key) || '[]')).forEach(c => {
            const u = parseInt(c.unit) || 0;
            const g = String(c.grade ?? 0);
            if (u > 0 && unitCount.hasOwnProperty(g)) unitCount[g] += u;
        });
    });

    const total = Object.values(unitCount).reduce((a, b) => a + b, 0);
    const canvas = document.getElementById('grade-dist-chart');
    const emptyMsg = document.getElementById('grade-dist-empty');
    if (!canvas) return;

    if (total === 0) {
        canvas.parentElement.style.display = 'none';
        if (emptyMsg) emptyMsg.style.display = 'block';
        if (gradeDistChartInstance) { gradeDistChartInstance.destroy(); gradeDistChartInstance = null; }
        return;
    }

    canvas.parentElement.style.display = 'block';
    if (emptyMsg) emptyMsg.style.display = 'none';

    const labels = [];
    const data = [];
    const bgColors = [];
    config.grades.forEach(g => {
        if (unitCount[g.value] > 0) {
            labels.push(`${g.letter} (${unitCount[g.value]} units)`);
            data.push(unitCount[g.value]);
            bgColors.push(config.colors[g.value]);
        }
    });

    if (gradeDistChartInstance) gradeDistChartInstance.destroy();

    const ctx = canvas.getContext('2d');
    gradeDistChartInstance = new Chart(ctx, {
        type: 'doughnut',
        data: { labels, datasets: [{ data, backgroundColor: bgColors, borderColor: chartBorder, borderWidth: 2 }] },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '60%',
            plugins: {
                legend: { position: 'bottom', labels: { color: textDim, font: { size: 10 }, boxWidth: 12 } }
            }
        }
    });
}

function getRemainingUnits() {
    const config = getConfig();
    const profile = JSON.parse(localStorage.getItem(getStorageKey('profile')) || '{}');
    const totalDegreeUnits = parseFloat(profile.totalUnits) || config.totalDegreeUnits;
    let earnedUnits = 0;
    Object.keys(localStorage).filter(k => k.startsWith(config.prefixes.data)).forEach(key => {
        JSON.parse(localStorage.getItem(key)).forEach(c => earnedUnits += (parseInt(c.unit) || 0));
    });
    
    const remainingInput = document.getElementById('remaining-units');
    if (remainingInput) remainingInput.value = Math.max(0, totalDegreeUnits - earnedUnits);
}

function calculateTarget() {
    const config = getConfig();
    const goal = parseFloat(document.getElementById('goal-input').value);
    const remainingUnitsInput = document.getElementById('remaining-units');
    const resultDiv = document.getElementById('target-result');

    if (!goal || !remainingUnitsInput.value) {
        alert("Wait! I need your target CGPA and remaining units to start the audit. ");
        return;
    }

    // ===== COLLECT HISTORICAL DATA =====
    let currentPoints = 0;
    let currentUnits = 0;
    let asCount = 0;
    let bsCount = 0;
    let csCount = 0;
    let courseHistory = [];
    let semesterGPAs = [];
    let coursesByUnit = { easy: [], medium: [], hard: [], ultraHard: [] };

    Object.keys(localStorage).filter(k => k.startsWith(config.prefixes.data)).sort().forEach(key => {
        const semesterData = JSON.parse(localStorage.getItem(key) || '[]');
        let semPoints = 0, semUnits = 0;
        
        semesterData.forEach(c => {
            const u = parseFloat(c.unit || c.units || 0);
            const g = parseFloat(c.grade || 0);
            if (u > 0) {
                currentUnits += u;
                currentPoints += (u * g);
                semPoints += (u * g);
                semUnits += u;
                
                courseHistory.push({ code: c.code || 'N/A', grade: g, units: u });
                
                if(g === config.maxGPA) asCount++;
                if(g === config.maxGPA - 1) bsCount++;
                if(g === config.maxGPA - 2) csCount++;
                
                // Categorize by unit size for study focus
                if(u <= 2) coursesByUnit.easy.push({code: c.code, grade: g, units: u});
                else if(u <= 3) coursesByUnit.medium.push({code: c.code, grade: g, units: u});
                else if(u <= 4) coursesByUnit.hard.push({code: c.code, grade: g, units: u});
                else coursesByUnit.ultraHard.push({code: c.code, grade: g, units: u});
            }
        });
        if(semUnits > 0) semesterGPAs.push(semPoints / semUnits);
    });

    // ===== CALCULATE METRICS =====
    const remainingUnits = parseFloat(remainingUnitsInput.value);
    const totalUnitsFinal = currentUnits + remainingUnits;
    const currentCGPA = currentUnits > 0 ? (currentPoints / currentUnits).toFixed(2) : "0.00";
    
    const totalPointsNeeded = goal * totalUnitsFinal;
    const pointsToEarn = totalPointsNeeded - currentPoints;
    const requiredGPA = (pointsToEarn / remainingUnits).toFixed(2);
    
    const maxPossiblePoints = currentPoints + (remainingUnits * config.maxGPA);
    const maxPossibleCGPA = (maxPossiblePoints / totalUnitsFinal).toFixed(2);
    
    // ===== ADVANCED ANALYTICS =====
    // GPA Velocity (trend)
    let gpaVelocity = "STABLE";
    let velocityColor = "#34d399";
    if(semesterGPAs.length >= 2) {
        const recentGPA = semesterGPAs[semesterGPAs.length - 1];
        const prevGPA = semesterGPAs[semesterGPAs.length - 2];
        if(recentGPA > prevGPA + 0.1) { gpaVelocity = "IMPROVING "; velocityColor = "#34d399"; }
        else if(recentGPA < prevGPA - 0.1) { gpaVelocity = "DECLINING "; velocityColor = "#ff6b6b"; }
    }
    
    // Predictability Score (based on performance variance)
    const avgGPA = courseHistory.length > 0 ? courseHistory.reduce((s,c) => s + c.grade, 0) / courseHistory.length : 0;
    const variance = courseHistory.length > 0 ? Math.sqrt(courseHistory.reduce((s,c) => s + Math.pow(c.grade - avgGPA, 2), 0) / courseHistory.length) : 0;
    let predictability = "HIGHLY CONSISTENT ";
    let predictColor = "#34d399";
    if(variance > 0.8) { predictability = "VARIABLE - Need more focus"; predictColor = "#fbbf24"; }
    if(variance > 1.2) { predictability = "HIGHLY INCONSISTENT - High risk"; predictColor = "#ff6b6b"; }
    
    // Probability of Success
    let successProbability = 100;
    if(requiredGPA > config.maxGPA) successProbability = 0;
    else if(requiredGPA > avgGPA + 0.5) successProbability = Math.max(30, 100 - (requiredGPA - avgGPA) * 20);
    else if(requiredGPA <= avgGPA) successProbability = 95;
    else successProbability = 100 - ((requiredGPA - avgGPA) * 15);
    successProbability = Math.max(0, Math.min(100, successProbability));
    
    // Build per-course performance stats for smarter, non-contradictory insights
    const courseStatsMap = new Map();
    courseHistory.forEach(c => {
        const code = (c.code || 'N/A').toString().trim().toUpperCase();
        if (!courseStatsMap.has(code)) {
            courseStatsMap.set(code, {
                code,
                totalGrade: 0,
                count: 0,
                minGrade: Number.POSITIVE_INFINITY,
                maxGrade: Number.NEGATIVE_INFINITY
            });
        }
        const stat = courseStatsMap.get(code);
        stat.totalGrade += c.grade;
        stat.count += 1;
        stat.minGrade = Math.min(stat.minGrade, c.grade);
        stat.maxGrade = Math.max(stat.maxGrade, c.grade);
    });
    const courseStats = Array.from(courseStatsMap.values()).map(stat => ({
        ...stat,
        avgGrade: stat.count > 0 ? stat.totalGrade / stat.count : 0
    }));

    resultDiv.style.display = "block";
    
    let greeting = "Hello Champ! ";
    if (currentCGPA >= (config.maxGPA - 0.5)) greeting = "First Class Scholar in the building! ";
    else if (currentCGPA >= (config.maxGPA - 1)) greeting = "Solid work so far! Let's push higher. ";

    let html = `<h2 class="target-audit-title">${greeting}</h2>`;
    html += `<p class="target-audit-intro">
                I've audited your <b>${currentUnits} units</b> of history with ADVANCED ANALYTICS enabled. 
                With <b>${asCount} As</b>, <b>${bsCount} Bs</b>, and <b>${csCount} Cs</b> secured, here is your INTELLIGENT roadmap to a <b>${goal} CGPA</b>.
             </p>`;

    let statusTheme = { label: "MODERATE", color: "#34d399", msg: "Very achievable with a structured study plan." };
    if (requiredGPA > config.maxGPA) statusTheme = { label: "IMPOSSIBLE", color: "#ff4444", msg: "Mathematically, this specific target is out of reach." };
    else if (requiredGPA > config.statusThresholds.elite) statusTheme = { label: "ELITE MODE", color: "#fbbf24", msg: "Zero margin for error. Maximum focus required." };
    else if (requiredGPA > config.statusThresholds.hard) statusTheme = { label: "HARD MODE", color: "#60a5fa", msg: "Consistent high performance is mandatory." };

    html += `
        <div class="target-status-card">
            <div class="target-status-head">
                <div>
                    <small class="target-micro-label">Current Standing</small>
                    <p class="target-standing-value">${currentCGPA}</p>
                </div>
                <span class="target-pill" style="--pill-color:${statusTheme.color};">${statusTheme.label}</span>
            </div>
            <p class="target-status-note" style="--status-color:${statusTheme.color};"><i>"${statusTheme.msg}"</i></p>
        </div>
    `;

    // NEW: Smart Analytics Dashboard
    html += `
        <div class="target-analytics-card">
            <h4 class="target-analytics-title"> SMART ANALYTICS DASHBOARD</h4>
            <div class="target-analytics-grid">
                <div class="target-analytics-item" style="--metric-color:${velocityColor}; --metric-bg:rgba(52,211,153,0.08);">
                    <small class="target-metric-label">Performance Trend</small>
                    <b style="color:${velocityColor};">${gpaVelocity}</b>
                </div>
                <div class="target-analytics-item" style="--metric-color:${predictColor}; --metric-bg:rgba(96,165,250,0.08);">
                    <small class="target-metric-label">Consistency Score</small>
                    <b style="color:${predictColor};">${predictability}</b>
                </div>
                <div class="target-analytics-item" style="--metric-color:#8ba6f6; --metric-bg:rgba(139,166,246,0.08);">
                    <small class="target-metric-label">Success Probability</small>
                    <b style="color:#8ba6f6;">${Math.round(successProbability)}% Likely </b>
                </div>
            </div>
        </div>
    `;

    if (requiredGPA > config.maxGPA) {
        html += `
            <div class="target-alert-danger">
                <p class="target-alert-title danger">System Reality Check</p>
                <p class="target-alert-copy">
                    To reach a ${goal}, you'd need to average a <b>${requiredGPA} GPA</b>. Since the max is ${config.maxGPA}, this target is not possible.
                </p>
            </div>
            
            <div class="target-alert-neutral">
                <p class="target-alert-title">Your New Max Potential</p>
                <p class="target-alert-copy">
                    If you secure a perfect ${config.maxGPA} in every remaining course, you will graduate with a <b>${maxPossibleCGPA} CGPA</b>.
                </p>
            </div>`;
    } else {
        let minUnitsA = Math.ceil(pointsToEarn - ((config.maxGPA - 1) * remainingUnits));
        if (minUnitsA < 0) minUnitsA = 0; 
        if (minUnitsA > remainingUnits) minUnitsA = remainingUnits;

        let maxUnitsB = Math.floor(remainingUnits - minUnitsA);

        // ===== ADVANCED STRATEGY ENGINE =====
        // Calculate alternative scenarios
        const scenarios = [];
        
        // Scenario 1: Conservative (Safe path with buffer)
        let conservativeA = Math.ceil(minUnitsA * 1.15);
        if(conservativeA > remainingUnits) conservativeA = remainingUnits;
        scenarios.push({
            name: "Safe Path (Recommended)",
            aUnits: conservativeA,
            bUnits: remainingUnits - conservativeA,
            risk: "LOW",
            riskColor: "#34d399",
            description: "Extra buffer for unexpected challenges"
        });
        
        // Scenario 2: Aggressive (Minimum path)
        scenarios.push({
            name: "Minimum Path (Risky)",
            aUnits: minUnitsA,
            bUnits: remainingUnits - minUnitsA,
            risk: "HIGH",
            riskColor: "#ff6b6b",
            description: "Zero margin for error, any slip-up damages target"
        });
        
        // Scenario 3: Balanced (Middle ground)
        let balancedA = Math.round((minUnitsA + conservativeA) / 2);
        if(balancedA > remainingUnits) balancedA = remainingUnits;
        scenarios.push({
            name: "Balanced Path",
            aUnits: balancedA,
            bUnits: remainingUnits - balancedA,
            risk: "MEDIUM",
            riskColor: "#fbbf24",
            description: "Middle ground with reasonable flexibility"
        });

        // Identify courses needing focus with disjoint weak/strong sets
        const gradeRange = courseHistory.length > 0
            ? Math.max(...courseHistory.map(c => c.grade)) - Math.min(...courseHistory.map(c => c.grade))
            : 0;
        const hasMeaningfulVariation = gradeRange >= 0.5;
        const maxListSize = Math.min(4, Math.max(2, Math.floor(courseStats.length * 0.35)));

        let weakSubjectCodes = [];
        let strongSubjectCodes = [];

        if (hasMeaningfulVariation && courseStats.length > 0) {
            const spreadOffset = Math.max(0.35, variance * 0.25);
            const weakThreshold = avgGPA - spreadOffset;
            const strongThreshold = avgGPA + spreadOffset;

            const weakCandidates = courseStats
                .filter(c => c.avgGrade < weakThreshold || c.minGrade <= (avgGPA - 1))
                .sort((a, b) => a.avgGrade - b.avgGrade);

            const strongCandidates = courseStats
                .filter(c => c.avgGrade > strongThreshold || c.maxGrade >= (avgGPA + 1))
                .sort((a, b) => b.avgGrade - a.avgGrade);

            weakSubjectCodes = weakCandidates.slice(0, maxListSize).map(c => c.code);

            strongSubjectCodes = strongCandidates
                .filter(c => !weakSubjectCodes.includes(c.code))
                .slice(0, maxListSize)
                .map(c => c.code);

            if (weakSubjectCodes.length === 0) {
                weakSubjectCodes = [...courseStats]
                    .sort((a, b) => a.avgGrade - b.avgGrade)
                    .slice(0, Math.min(2, courseStats.length))
                    .map(c => c.code)
                    .filter(code => !strongSubjectCodes.includes(code));
            }
            if (strongSubjectCodes.length === 0) {
                strongSubjectCodes = [...courseStats]
                    .sort((a, b) => b.avgGrade - a.avgGrade)
                    .slice(0, Math.min(2, courseStats.length))
                    .map(c => c.code)
                    .filter(code => !weakSubjectCodes.includes(code));
            }
        }

        html += `
            <h3 class="target-engine-title"> INTELLIGENT STRATEGY ENGINE</h3>
            <p class="target-engine-intro">
                You must maintain an average of <b>${requiredGPA} GPA</b> across <b>${remainingUnits} units</b>. 
                The system analyzed ${courseHistory.length} past courses to build personalized strategies.
            </p>

            <div class="target-strategy-card">
                <p class="target-strategy-title"> THREE STRATEGIC PATHWAYS</p>
                <div class="target-strategy-grid">
        `;
        
        scenarios.forEach(s => {
            html += `
                <div class="target-strategy-item" style="--risk-color:${s.riskColor};">
                    <div class="target-strategy-head">
                        <div class="target-strategy-copy">
                            <p class="target-strategy-name">${s.name}</p>
                            <small class="target-strategy-desc">${s.description}</small>
                        </div>
                        <span class="target-risk-pill" style="--pill-color:${s.riskColor};">${s.risk} RISK</span>
                    </div>
                    <div class="target-split-grid">
                        <div class="target-split-box a">
                            <small class="target-metric-label tiny">Target A's</small>
                            <p class="target-split-value a">${s.aUnits} units</p>
                        </div>
                        <div class="target-split-box b">
                            <small class="target-metric-label tiny">Max B's</small>
                            <p class="target-split-value b">${s.bUnits} units</p>
                        </div>
                    </div>
                </div>
            `;
        });
        
        html += `
                </div>
            </div>

            <div class="target-profile-card">
                <h4 class="target-profile-title"> YOUR PERFORMANCE PROFILE</h4>
        `;
        
        if(weakSubjectCodes.length > 0) {
            html += `
                <div class="target-profile-block">
                    <small class="target-micro-label"> Subjects That Needed Improvement:</small>
                    <p class="target-profile-copy weak"><b>${weakSubjectCodes.join(', ')}</b><br><small>These courses historically challenged you. Plan extra study time.</small></p>
                </div>
            `;
        } else {
            html += `
                <div class="target-profile-block">
                    <small class="target-micro-label"> Subjects That Needed Improvement:</small>
                    <p class="target-profile-copy weak"><b>No clear weak subjects detected</b><br><small>Your records are consistent across subjects. Keep this balance.</small></p>
                </div>
            `;
        }
        
        if(strongSubjectCodes.length > 0) {
            html += `
                <div class="target-profile-block">
                    <small class="target-micro-label"> Your Strength Areas:</small>
                    <p class="target-profile-copy strong"><b>${strongSubjectCodes.join(', ')}</b><br><small>Leverage these strengths and master similar course types.</small></p>
                </div>
            `;
        } else {
            html += `
                <div class="target-profile-block">
                    <small class="target-micro-label"> Your Strength Areas:</small>
                    <p class="target-profile-copy strong"><b>Balanced performance across subjects</b><br><small>No single subject dominates yet. Build momentum in core high-unit courses.</small></p>
                </div>
            `;
        }
        
        html += `
                <small class="target-variance-note">Performance Variance: <b>${variance.toFixed(2)}</b> (0=perfect consistency, 2+=highly variable)</small>
            </div>

            <div class="target-reco-card">
                <p class="target-alert-copy">
                    <b> Smart Recommendation:</b> Start with the <b>Safe Path</b> (${scenarios[0].aUnits} A's). This gives you breathing room. 
                    Once you ace your first 2-3 exams this semester, you can reassess and pivot to Balanced or even Minimum if needed.
                </p>
            </div>

            <div class="target-critical-card">
                <p class="target-critical-copy">
                    <b> Critical:</b> High-unit courses (4+ units) are leverage points. Securing an A in one 4-unit course equals securing A's in two 2-unit courses. 
                    Prioritize ${coursesByUnit.ultraHard.length > 0 ? 'high-unit courses' : 'strategic course selection'}.
                </p>
            </div>
        `;
    }

    html += `
        <div class="target-footer-actions">
            <button onclick="document.getElementById('goal-input').focus();" class="target-adjust-btn">
                Adjust Target CGPA
            </button>
        </div>
    `;

    resultDiv.innerHTML = html;
    triggerAdRefresh();
}

function exportBackupJSON() {
    const config = getConfig();
    const profile = JSON.parse(localStorage.getItem(getStorageKey('profile')) || '{}');
    const semesters = {};
    Object.keys(localStorage)
        .filter(k => k.startsWith(config.prefixes.data))
        .sort()
        .forEach(key => {
            const shortKey = key.replace(config.prefixes.data, '');
            semesters[shortKey] = JSON.parse(localStorage.getItem(key) || '[]');
        });
    const semesterNotes = {};
    Object.keys(localStorage).filter(k => k.startsWith(config.prefixes.notes)).forEach(k => {
        semesterNotes[k.replace(config.prefixes.notes, '')] = localStorage.getItem(k) || '';
    });
    const backup = {
        version: ACTIVE_SCALE,
        exportedAt: new Date().toISOString(),
        profile,
        semesters,
        semesterNotes
    };
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `ExamVenture_${ACTIVE_SCALE}_Backup_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
    alert("Backup downloaded! Use 'Import from File' to restore on another device.");
}

async function exportToPDF() {
    const config = getConfig();
    try {
        const jsPDF = await ensureJsPdfLibrary();
        const doc = new jsPDF();

        const profile = JSON.parse(localStorage.getItem(getStorageKey('profile')) || '{}');

        // Try to load logo as a data URL so it can be embedded in the PDF header
        async function loadImageAsDataURL(urls) {
            const candidates = Array.isArray(urls) ? urls : [urls];
            for (const u of candidates) {
                try {
                    const r = await fetch(u, {cache: 'no-store'});
                    if (!r.ok) continue;
                    const blob = await r.blob();
                    const data = await new Promise((resolve, reject) => {
                        const fr = new FileReader();
                        fr.onload = () => resolve(fr.result);
                        fr.onerror = reject;
                        fr.readAsDataURL(blob);
                    });
                    if (data) return data;
                } catch (e) {
                    // try next candidate
                }
            }
            return null;
        }

        const NAVY = [11, 14, 20];
        const GOLD = [251, 191, 36];

    const logoData = await loadImageAsDataURL([
        'CGPALOGO.png',
        'cgpa_calculator/CGPALOGO.png',
        '/cgpa_calculator/CGPALOGO.png',
        '../cgpa_calculator/CGPALOGO.png'
    ]);

    doc.setFillColor(NAVY[0], NAVY[1], NAVY[2]);
    doc.rect(0, 0, 210, 40, 'F');
    doc.setFont("helvetica", "bold");
    doc.setTextColor(GOLD[0], GOLD[1], GOLD[2]);
    doc.setFontSize(22);
    doc.text("EXAMS VENTURE (" + ACTIVE_SCALE + ")", 20, 22);
    
    doc.setFontSize(10);
    doc.setTextColor(255, 255, 255);
    doc.text("OFFICIAL ACADEMIC PERFORMANCE REPORT", 20, 30);
    doc.text(`Student: ${profile.name || '---'}`, 130, 20);
    doc.text(`Dept: ${profile.dept || '---'}`, 130, 28);

    if (logoData) {
        try {
            doc.addImage(logoData, 'PNG', 164, 6, 36, 28);
        } catch (e) {
            console.warn('Could not add logo to PDF:', e);
        }
    }

    let cgpa = document.getElementById('display-cgpa').innerText;
    let units = document.getElementById('display-units').innerText;
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(11);
    doc.text(`Cumulative CGPA (${ACTIVE_SCALE}): ${cgpa}`, 20, 50);
    doc.text(`Total Units Earned: ${units}`, 120, 50);

    let y = 65;

    const drawTableHeader = (posY, title) => {
        doc.setFont("helvetica", "bold");
        doc.setTextColor(NAVY[0], NAVY[1], NAVY[2]);
        doc.text(title.toUpperCase(), 20, posY - 5);
        doc.setFillColor(240, 240, 240);
        doc.rect(20, posY, 170, 8, 'F');
        doc.setFontSize(9);
        doc.text("COURSE CODE", 25, posY + 5);
        doc.text("UNITS", 100, posY + 5);
        doc.text("GRADE", 160, posY + 5);
        return posY + 8;
    };

    Object.keys(localStorage)
        .filter(k => k.startsWith(config.prefixes.data)) 
        .sort().forEach(key => {
            if (y > 240) { doc.addPage(); y = 30; }
            
            const semTitle = key.replace(config.prefixes.data, '').replace('-', ' Level - ');
            y = drawTableHeader(y, semTitle);
            
            const semesterData = JSON.parse(localStorage.getItem(key)) || [];
            
            doc.setFont("helvetica", "normal");
            semesterData.forEach((c, index) => {
                if (index % 2 === 0) {
                    doc.setFillColor(250, 250, 250);
                    doc.rect(20, y, 170, 7, 'F');
                }
                doc.text(c.code.toUpperCase(), 25, y + 5);
                doc.text(c.unit.toString(), 105, y + 5);
                doc.text(getLetterGrade(c.grade), 165, y + 5);
                y += 7;
            });
            const semKey = key.replace(config.prefixes.data, '');
            const notes = localStorage.getItem(getStorageKey('notes', semKey)) || '';
            if (notes) {
                doc.setFontSize(8);
                doc.setTextColor(100, 100, 100);
                doc.text('Note: ' + notes, 20, y + 5);
                doc.setFontSize(9);
                doc.setTextColor(0, 0, 0);
                y += 10;
            }
            y += 15;
        });

    const pageHeight = doc.internal.pageSize.height;
    
    doc.setDrawColor(230, 230, 230);
    doc.line(20, pageHeight - 30, 190, pageHeight - 30);

    doc.setFillColor(NAVY[0], NAVY[1], NAVY[2]);
    doc.rect(20, pageHeight - 25, 45, 15, 'F'); 
    
    doc.setTextColor(GOLD[0], GOLD[1], GOLD[2]);
    doc.setFontSize(7);
    doc.text("VERIFIED BY", 25, pageHeight - 19);
    doc.setFontSize(9);
    doc.text("EXAMS VENTURE", 25, pageHeight - 14);

    doc.setFontSize(7);
    doc.setTextColor(150, 150, 150);
    const date = new Date().toLocaleDateString();
    doc.text(`Authentic ${ACTIVE_SCALE} Record: ${date}`, 70, pageHeight - 14);

        doc.save(`Transcript_${ACTIVE_SCALE}_${profile.name || 'Student'}.pdf`);
    } catch (error) {
        console.error('PDF export failed:', error);
        alert('PDF export is not available right now. Please try again in a moment.');
    }
}

function clearAllData() {
    const config = getConfig();
    if (confirm(` DANGER: Delete ALL ${ACTIVE_SCALE} records?`)) {
        Object.keys(localStorage).forEach(k => {
            if (k.startsWith(config.prefixes.data) || k.startsWith(config.prefixes.notes)) {
                localStorage.removeItem(k);
            }
        });
        
        updateDashboard();
        getRemainingUnits();
        
        const semSelect = document.getElementById('sem-select');
        if (semSelect) loadSemesterData(semSelect.value);
        
        alert(`${ACTIVE_SCALE} Data Wiped.`);
        switchView('view-dashboard');
    }
}

function saveProfile() {
    const config = getConfig();
    const profileData = {
        name: document.getElementById('setup-name')?.value || "Scholar",
        uni: document.getElementById('setup-uni')?.value || "",
        faculty: document.getElementById('setup-faculty')?.value || "",
        dept: document.getElementById('setup-dept')?.value || "",
        level: document.getElementById('setup-level')?.value || "",
        totalUnits: document.getElementById('prof-total-units').value 
    };

    if (!profileData.totalUnits) {
        alert("Please enter your Total Degree Units to enable the Target Tracker! ");
        return;
    }

    localStorage.setItem(getStorageKey('profile'), JSON.stringify(profileData));
    
    if (typeof applyProfile === "function") applyProfile(); 
    
    updateDashboard(); 
    updateRemainingUnitsDisplay(); 
    
    alert(`${ACTIVE_SCALE} Profile & Target Tracker Updated Successfully! `);
    
    switchView('view-dashboard');
}

function loadProfile() {
    const config = getConfig();
    const saved = localStorage.getItem(getStorageKey('profile'));
    if (saved) {
        const profile = JSON.parse(saved);
        const setupName = document.getElementById('setup-name');
        const setupDept = document.getElementById('setup-dept');
        const setupLevel = document.getElementById('setup-level');
        const profTotalUnits = document.getElementById('prof-total-units');
        if (setupName) setupName.value = profile.name || "";
        if (setupDept) setupDept.value = profile.dept || "";
        if (setupLevel) setupLevel.value = profile.level || "";
        if (profTotalUnits) profTotalUnits.value = profile.totalUnits || "";
    }
}

function applyProfile() {
    const config = getConfig();
    const savedProfile = localStorage.getItem(getStorageKey('profile'));
    if (!savedProfile) return;

    const data = JSON.parse(savedProfile);
    
    const safeDept = data.dept ? data.dept.substring(0, 3).toUpperCase() : 'DPT';
    
    if(document.getElementById('prof-name')) document.getElementById('prof-name').innerText = data.name || 'Student Name';
    if(document.getElementById('prof-level')) document.getElementById('prof-level').innerText = data.level || '---';
    if(document.getElementById('prof-uni')) document.getElementById('prof-uni').innerText = data.uni || '---';
    if(document.getElementById('prof-dept-short')) document.getElementById('prof-dept-short').innerText = safeDept;

    if(document.getElementById('prof-name-side')) document.getElementById('prof-name-side').innerText = data.name || 'Student Name';
    if(document.getElementById('prof-level-side')) document.getElementById('prof-level-side').innerText = data.level || '---';
    if(document.getElementById('prof-uni-side')) document.getElementById('prof-uni-side').innerText = data.uni || '---';
    if(document.getElementById('prof-dept-short-side')) document.getElementById('prof-dept-short-side').innerText = safeDept;

    if(document.getElementById('setup-name')) document.getElementById('setup-name').value = data.name || '';
    if(document.getElementById('setup-uni')) document.getElementById('setup-uni').value = data.uni || '';
    if(document.getElementById('setup-faculty')) document.getElementById('setup-faculty').value = data.faculty || '';
    if(document.getElementById('setup-dept')) document.getElementById('setup-dept').value = data.dept || '';
    if(document.getElementById('setup-level')) document.getElementById('setup-level').value = data.level || '100 Level';
    if(document.getElementById('prof-total-units')) document.getElementById('prof-total-units').value = data.totalUnits || '';
}

function renderAcademicHistory() {
    const config = getConfig();
    const listContainer = document.getElementById('dynamic-sem-list');
    if (!listContainer) return;
    listContainer.innerHTML = '';

    const keys = Object.keys(localStorage)
        .filter(k => k.startsWith(config.prefixes.data)) 
        .sort().reverse();

    if (keys.length === 0) {
        listContainer.innerHTML = `<p style="text-align:center; padding:20px; color:var(--text-dim);">No ${ACTIVE_SCALE} data found.</p>`;
        return;
    }

    keys.forEach(key => {
        const semesterData = JSON.parse(localStorage.getItem(key));
        let sPoints = 0, sUnits = 0;

        semesterData.forEach(c => {
            const u = parseInt(c.unit) || 0;
            sUnits += u;
            const gradeVal = limitGrade(c.grade);
            sPoints += (u * gradeVal);
        });

        const sGpa = sUnits > 0 ? (sPoints / sUnits).toFixed(2) : "0.00";
        const title = key.replace(config.prefixes.data, '').replace('-', ' Level - ');
        const semKey = key.replace(config.prefixes.data, '');
        const notes = localStorage.getItem(getStorageKey('notes', semKey)) || '';
        const raw = notes.length > 35 ? notes.substring(0, 35) + '...' : notes;
        const notesPreview = notes ? raw.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/"/g,'&quot;') : '';

        const card = document.createElement('div');
        card.className = 'stats-card clickable-history';
        card.onclick = () => {
            const semSelect = document.getElementById('sem-select');
            if (semSelect) {
                semSelect.value = semKey;
                loadSemesterData(semKey);
            }
            switchView('view-calc');
        };
        card.style.cursor = 'pointer';
        card.style.padding = '18px 20px';
        card.style.marginBottom = '12px';
        card.style.textAlign = 'left';

        card.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; width: 100%;">
                <div style="flex: 1; min-width: 0;">
                    <strong style="color: var(--accent); display: block; margin-bottom: 2px;">${title}</strong>
                    <p style="font-size: 0.75rem; color: var(--text-dim)">${sUnits} Units</p>
                    ${notesPreview ? `<p style="font-size: 0.7rem; color: var(--text-dim); font-style: italic; margin-top: 4px;">"${notesPreview}"</p>` : ''}
                </div>
                <div class="history-actions">
                    <span class="badge" style="background: ${sGpa >= (config.maxGPA - 0.5) ? 'rgba(76, 175, 80, 0.1)' : 'rgba(251, 191, 36, 0.1)'}; 
                                               color: ${sGpa >= (config.maxGPA - 0.5) ? '#4caf50' : 'var(--accent)'}; font-weight: bold;">
                        ${sGpa} GPA
                    </span>
                    <button type="button" class="history-action-btn history-action-edit" onclick="event.stopPropagation(); editSemester('${key}')">Edit</button>
                    <button type="button" class="history-action-btn history-action-delete" onclick="event.stopPropagation(); deleteSemester('${key}')">Delete</button>
                </div>
            </div>`;
        listContainer.appendChild(card);
    });
}

function editSemester(key) {
    const semKey = key.replace(getConfig().prefixes.data, '');
    const semSelect = document.getElementById('sem-select');
    if (semSelect) {
        semSelect.value = semKey;
        loadSemesterData(semKey);
    }
    switchView('view-calc');
}

function deleteSemester(key) {
    const config = getConfig();
    const title = key.replace(config.prefixes.data, '').replace('-', ' Level - ');
    if (confirm(`Delete ${title} history?`)) {
        localStorage.removeItem(key);
        const semKey = key.replace(config.prefixes.data, '');
        localStorage.removeItem(getStorageKey('notes', semKey));
        updateDashboard();
    }
}

function checkLogin() {
    const config = getConfig();
    const enteredPin = document.getElementById('login-pin').value;
    const storedPin = localStorage.getItem(getStorageKey('pin'));

    if (!storedPin) {
        if (enteredPin.length < 4) return alert("Please set a 4-digit PIN");
        localStorage.setItem(getStorageKey('pin'), enteredPin);
        alert("PIN Set Successfully!");
        unlockApp();
    } else {
        if (enteredPin === storedPin) {
            unlockApp();
        } else {
            alert("Incorrect PIN!");
            document.getElementById('login-pin').value = '';
        }
    }
}

function getSessionUnlockKey() {
    return `ev-unlocked-${ACTIVE_SCALE}`;
}

function markSessionUnlocked() {
    sessionStorage.setItem(getSessionUnlockKey(), 'true');
}

function unlockApp() {
    markSessionUnlocked();
    switchView('view-dashboard');
    updatePWAInstallUI();
    const topBar = document.querySelector('.top-bar');
    if (topBar) topBar.style.display = 'flex';
    document.getElementById('login-pin').value = '';
    const adHouse = document.getElementById('ad-house');
    if (adHouse) adHouse.style.display = 'block';
    setTimeout(() => {
        if (!localStorage.getItem(getStorageKey('onboarding'))) showOnboarding();
    }, 0);
}

function showOnboarding() {
    const overlay = document.getElementById('onboarding-overlay');
    if (!overlay) return;
    overlay.style.display = 'flex';
    document.getElementById('onboarding-step-1').style.display = 'block';
    document.getElementById('onboarding-step-2').style.display = 'none';
    document.getElementById('onboarding-step-3').style.display = 'none';
}

function onboardingNext() {
    const s1 = document.getElementById('onboarding-step-1');
    const s2 = document.getElementById('onboarding-step-2');
    const s3 = document.getElementById('onboarding-step-3');
    if (s1.style.display !== 'none') { s1.style.display = 'none'; s2.style.display = 'block'; }
    else if (s2.style.display !== 'none') { s2.style.display = 'none'; s3.style.display = 'block'; }
}

function onboardingComplete() {
    localStorage.setItem(getStorageKey('onboarding'), 'true');
    document.getElementById('onboarding-overlay').style.display = 'none';
    switchView('view-calc');
}

function onboardingSkip() {
    localStorage.setItem(getStorageKey('onboarding'), 'true');
    document.getElementById('onboarding-overlay').style.display = 'none';
}


function handleReset() {
    const config = getConfig();
    const confirmReset = confirm(`DANGER: This will delete ALL your ${ACTIVE_SCALE} saved grades and your PIN. \n\nAre you sure?`);

    if (confirmReset) {
        Object.keys(localStorage).forEach(k => {
            if (k.startsWith(config.prefixes.data) || k === getStorageKey('pin')) {
                localStorage.removeItem(k);
            }
        });
        
        alert(`${ACTIVE_SCALE} App has been reset successfully.`);
        location.reload();
    }
}

function updateRemainingUnitsDisplay() {
    const config = getConfig();
    const remainingUnitsElement = document.getElementById('remaining-units');
    if (!remainingUnitsElement) return;

    const savedProfile = JSON.parse(localStorage.getItem(getStorageKey('profile')) || '{}');
    const totalUnitsToGraduate = parseInt(savedProfile.totalUnits) || config.totalDegreeUnits; 

    let earnedUnits = 0;
    Object.keys(localStorage).filter(k => k.startsWith(config.prefixes.data)).forEach(key => {
        const semesterData = JSON.parse(localStorage.getItem(key) || '[]');
        semesterData.forEach(course => {
            earnedUnits += (parseInt(course.unit) || 0);
        });
    });

    const remaining = totalUnitsToGraduate - earnedUnits;
    remainingUnitsElement.value = remaining > 0 ? remaining : 0;
}

function importDataJSON(inputEl) {
    const config = getConfig();
    const file = inputEl?.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = JSON.parse(e.target.result);
            if (Array.isArray(data)) {
                data.forEach(c => renderCourseRow(c.code, c.unit, c.grade));
                alert(`Imported ${data.length} courses to current semester.`);
            } else if (data.semesters && typeof data.semesters === 'object') {
                const isForThisScale = data.version === ACTIVE_SCALE;
                if (!isForThisScale) {
                    alert(`Warning: This backup is for ${data.version} scale, but you're on ${ACTIVE_SCALE}. Importing anyway...`);
                }
                Object.keys(data.semesters).forEach(semKey => {
                    localStorage.setItem(getStorageKey('data', semKey), JSON.stringify(data.semesters[semKey]));
                });
                if (data.semesterNotes) {
                    Object.keys(data.semesterNotes).forEach(semKey => {
                        localStorage.setItem(getStorageKey('notes', semKey), data.semesterNotes[semKey] || '');
                    });
                }
                if (data.profile) {
                    localStorage.setItem(getStorageKey('profile'), JSON.stringify(data.profile));
                }
                updateDashboard();
                getRemainingUnits();
                const semSelect = document.getElementById('sem-select');
                if (semSelect) loadSemesterData(semSelect.value);
                applyProfile();
                renderAcademicHistory();
                alert(`Backup restored: ${Object.keys(data.semesters).length} semesters.`);
            } else {
                alert("Unsupported file format. Use a JSON array or Exams Venture backup file.");
            }
        } catch (err) {
            alert("Invalid JSON file. Please check the format.");
        }
        inputEl.value = '';
    };
    reader.readAsText(file);
}

function triggerImportFile() {
    document.getElementById('import-file').click();
}

function toggleBulkInput() {
    const area = document.getElementById('bulk-input-area');
    if (area) {
        area.style.display = area.style.display === 'none' ? 'block' : 'none';
    }
}

function copyPrompt() {
    const textElement = document.getElementById('ai-prompt-text');
    const btn = document.querySelector('.btn-copy');
    if (!textElement) return;

    const textToCopy = textElement.innerText;

    if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(textToCopy).then(() => {
            updateCopyBtnStatus(btn);
        }).catch(() => fallbackCopyText(textToCopy, btn));
    } else {
        fallbackCopyText(textToCopy, btn);
    }
}

function fallbackCopyText(text, btn) {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    document.body.appendChild(textArea);
    textArea.select();
    try {
        document.execCommand('copy');
        updateCopyBtnStatus(btn);
    } catch (err) {
        console.error('Copy failed', err);
    }
    document.body.removeChild(textArea);
}

function updateCopyBtnStatus(btn) {
    const originalText = btn.innerText;
    btn.innerText = "Copied!";
    btn.style.background = "#4caf50"; 
    setTimeout(() => {
        btn.innerText = originalText;
        btn.style.background = "var(--accent)";
    }, 2000);
}

function processBulkJSON() {
    const rawData = document.getElementById('json-paste-area').value.trim();
    
    try {
        const courses = JSON.parse(rawData);
        if (!Array.isArray(courses)) throw new Error("Invalid Format");

        courses.forEach(course => {
            renderCourseRow(course.code, course.unit, course.grade);
        });

        alert(`Successfully imported ${courses.length} courses!`);
        document.getElementById('json-paste-area').value = '';
        toggleBulkInput();
        updateProjectedCGPA(); 
    } catch (e) {
        alert("Please paste a valid JSON list from the AI (starting with [ and ending with ]).");
    }
}

/**
 * ADMOB & AD ENGINE
 */
const ADMOB_ID = 'ca-app-pub-3940256099942544/6300978111';
let adRefreshCount = 0;
const MAX_REFRESHES = 15;

// ===== PERSISTENT AD MANAGEMENT =====
const AD_REFRESH_KEY = 'last_ad_refresh_timestamp';
const AD_CONTEXT_REFRESH_KEY = 'last_context_ad_refresh';
const MIN_AD_REFRESH_INTERVAL = 180000; // 3 minutes
const MIN_CONTEXT_AD_INTERVAL = 30000;  // 30 seconds for view changes

function canRefreshAd() {
    const now = Date.now();
    const lastRefresh = localStorage.getItem(AD_REFRESH_KEY);
    
    // If no previous refresh, allow it (first time)
    if (!lastRefresh) {
        return true;
    }
    
    // Only allow if 3 minutes have passed
    const timeSinceLastRefresh = now - parseInt(lastRefresh);
    return timeSinceLastRefresh >= MIN_AD_REFRESH_INTERVAL;
}

function recordAdRefresh() {
    localStorage.setItem(AD_REFRESH_KEY, Date.now());
    console.log(" Ad refresh recorded. Next allowed in 3 minutes.", new Date().toLocaleTimeString());
}

function canContextRefreshAd() {
    const now = Date.now();
    const lastContextRefresh = localStorage.getItem(AD_CONTEXT_REFRESH_KEY);
    
    if (!lastContextRefresh) return true;
    
    const timeSinceContextRefresh = now - parseInt(lastContextRefresh);
    return timeSinceContextRefresh >= MIN_CONTEXT_AD_INTERVAL;
}

function recordContextAdRefresh() {
    localStorage.setItem(AD_CONTEXT_REFRESH_KEY, Date.now());
}

// ===== REMOVED: Timer-based ad refresh (Google AdSense policy violation) =====
// All ad refreshes now triggered by user actions (view navigation) via switchView()

function showWaitScreen(msg) {
    const loginView = document.getElementById('view-login');
    if (loginView) {
        loginView.innerHTML = `
            <div class="stats-card" style="text-align:center; border: 1px solid var(--accent); margin: 20px;">
                <h3 style="color:var(--accent)">Exams Venture</h3>
                <p style="margin: 15px 0; font-size: 0.9rem;">${msg}</p>
                <div style="width:30px; height:30px; border:3px solid #30363d; border-top:3px solid var(--accent); border-radius:50%; animation: spin 1s linear infinite; margin: 10px auto;"></div>
            </div>`;
    }
}


// ===== GOOGLE ADSENSE USER-ACTION MODEL =====
// Ads only refresh when: user navigates (switchView) or page loads
// Complies with Google AdSense "User-Action" refresh policies
const AdEngine = {
    init() {
        const adWrapper = document.getElementById('dynamic-ad-wrapper');
        if (!adWrapper) return;

        // ===== PAGE LOAD: Trigger initial ad if eligible =====
        const timeUntilAllowed = this.getTimeUntilNextRefresh();
        if (timeUntilAllowed > 0) {
            console.log(` Ad refresh blocked. Allowed in ${Math.ceil(timeUntilAllowed / 1000)} seconds.`);
        } else {
            console.log(" 3-minute rule satisfied. Ad eligible for refresh on page load.");
            if (this.isEligibleForRefresh() && navigator.onLine && window.adsbygoogle) {
                this.pushAd();
            }
        }
    },

    getTimeUntilNextRefresh() {
        const now = Date.now();
        const lastRefresh = localStorage.getItem(AD_REFRESH_KEY);
        
        if (!lastRefresh) return 0; // First time, no wait needed
        
        const timeSinceLastRefresh = now - parseInt(lastRefresh);
        return Math.max(0, MIN_AD_REFRESH_INTERVAL - timeSinceLastRefresh);
    },

    isEligibleForRefresh() {
        return canRefreshAd();
    },

    pushAd() {
        // ===== SAFETY CHECKS: Only push if user is online and library loaded =====
        if (!navigator.onLine) {
            console.warn(" Ad push blocked: User is offline.");
            return;
        }

        if (!window.adsbygoogle) {
            console.warn(" Ad push blocked: adsbygoogle library not loaded.");
            return;
        }

        if (!this.isEligibleForRefresh()) {
            console.warn(" Ad push blocked by 3-minute rule. Wait " + Math.ceil(this.getTimeUntilNextRefresh() / 1000) + " seconds.");
            return;
        }

        try {
            (adsbygoogle = window.adsbygoogle || []).push({});
            recordAdRefresh(); // Record ONLY after successful push
            console.log(" Ad pushed successfully (user-action triggered)");
        } catch (e) {
            console.error("AdSense Push Error:", e);
        }
    }
};

/**
 * PWA & PERMANENT STORAGE LOGIC
 */
let deferredPrompt = null;

// Check if app is already installed/running in standalone mode
function isAppInstalled() {
    return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
}

// Request Permanent Storage from the phone
async function requestPersistentStorage() {
    if (navigator.storage && navigator.storage.persist) {
        const isPersisted = await navigator.storage.persist();
        console.log(`PWA: Permanent Storage granted? ${isPersisted}`);
    }
}

// Update PWA Install UI Visibility
function updatePWAInstallUI() {
    if (IS_NATIVE_CAPACITOR) {
        return;
    }

    const installBtns = document.querySelectorAll('.pwa-install-trigger');
    const isStandalone = isAppInstalled();
    const loginView = document.getElementById('view-login');
    const isLoginActive = loginView && loginView.classList.contains('active');
    
    installBtns.forEach(btn => {
        if (isLoginActive) {
            btn.style.display = 'none';
            return;
        }

        btn.style.display = 'flex';
        
        if (isStandalone) {
            btn.classList.add('faded');
            const textSpan = btn.querySelector('span:not(.icon)');
            if (textSpan) textSpan.textContent = 'INSTALLED';
        } else {
            btn.classList.remove('faded');
            const textSpan = btn.querySelector('span:not(.icon)');
            if (textSpan) textSpan.textContent = 'INSTALL';
        }
    });
}

window.addEventListener('beforeinstallprompt', (e) => {
    // Prevent the default browser prompt
    e.preventDefault();
    // Stash the event so it can be triggered later
    deferredPrompt = e;
    // Ensure button is visible
    updatePWAInstallUI();
});

async function triggerPWAInstall() {
    if (deferredPrompt) {
        // Show the browser's native install prompt
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        console.log(`User response to the install prompt: ${outcome}`);
        
        // We do NOT null deferredPrompt here if they dismissed it
        // This allows them to try again without refreshing
        if (outcome === 'accepted') {
            deferredPrompt = null;
            updatePWAInstallUI();
        }
    } else {
        // Fallback: Manual Instructions (for iOS or delayed prompts)
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
        if (isIOS) {
            alert("To install on iPhone/iPad:\n1. Tap the 'Share' icon (square with arrow) at the bottom.\n2. Scroll down and tap 'Add to Home Screen'.");
        } else {
            alert("To install:\n1. Open your browser menu (usually three dots ).\n2. Tap 'Install App' or 'Add to Home Screen'.");
        }
    }
}

window.addEventListener('appinstalled', (evt) => {
    console.log('App installed successfully');
    deferredPrompt = null;
    requestPersistentStorage(); // Lock files to permanent storage
    updatePWAInstallUI();
});

// ===== OFFLINE LOCKDOWN SYSTEM (5-MINUTE HARD LOCKDOWN) =====
const OFFLINE_KEY = 'offline_start_time';
const OFFLINE_LOCKOUT_TIME = 300000; // 5 minutes in milliseconds
let offlineCountdownTimer = null;

function initOfflineDetection() {
    // Check periodic online status
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    // Check if already offline
    if (!navigator.onLine) {
        handleOffline();
    }
}

function handleOffline() {
    console.log("User is now OFFLINE");
    const now = Date.now();
    
    // Only set the timer if not already set (preserve across page reloads)
    if (!sessionStorage.getItem(OFFLINE_KEY)) {
        sessionStorage.setItem(OFFLINE_KEY, now);
    }
    
    startOfflineCountdown();
}

function handleOnline() {
    console.log("User is now ONLINE");
    
    // Clear offline tracking
    sessionStorage.removeItem(OFFLINE_KEY);
    hideOfflineLockout();
    stopOfflineCountdown();
    
    // ===== STRICT: Only attempt ad refresh if 3-minute rule allows =====
    if (AdEngine.isEligibleForRefresh()) {
        AdEngine.pushAd();
    }
}

function startOfflineCountdown() {
    if (offlineCountdownTimer) return; // Already running
    
    offlineCountdownTimer = setInterval(() => {
        const offlineStartTime = sessionStorage.getItem(OFFLINE_KEY);
        if (!offlineStartTime) return; // Online again
        
        const now = Date.now();
        const timeOffline = now - parseInt(offlineStartTime);
        const timeRemaining = Math.max(0, OFFLINE_LOCKOUT_TIME - timeOffline);
        const secondsRemaining = Math.ceil(timeRemaining / 1000);
        
        // Update countdown display
        const countdownElement = document.getElementById('offline-countdown');
        if (countdownElement) {
            if (secondsRemaining > 0) {
                const mins = Math.floor(secondsRemaining / 60);
                const secs = secondsRemaining % 60;
                countdownElement.textContent = `Offline: ${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
                countdownElement.style.display = 'inline';
            }
        }
        
        // If time expired, show lockout
        if (timeRemaining <= 0) {
            stopOfflineCountdown();
            showOfflineLockout();
        }
    }, 1000); // Update every second
}

function stopOfflineCountdown() {
    if (offlineCountdownTimer) {
        clearInterval(offlineCountdownTimer);
        offlineCountdownTimer = null;
    }
    
    const countdownElement = document.getElementById('offline-countdown');
    if (countdownElement) {
        countdownElement.style.display = 'none';
    }
}

function showOfflineLockout() {
    const overlay = document.getElementById('offline-lockout');
    if (overlay) {
        overlay.classList.add('active');
        overlay.style.display = 'flex';
    }
    
    disableAllControls(true);
}

function hideOfflineLockout() {
    const overlay = document.getElementById('offline-lockout');
    if (overlay) {
        overlay.classList.remove('active');
        overlay.style.display = 'none';
    }
    
    disableAllControls(false);
}

function disableAllControls(shouldDisable) {
    const buttons = document.querySelectorAll('button');
    const inputs = document.querySelectorAll('input, select, textarea');
    const links = document.querySelectorAll('a');
    
    const elements = [...buttons, ...inputs, ...links];
    
    elements.forEach(el => {
        if (shouldDisable) {
            el.disabled = true;
            el.style.pointerEvents = 'none';
            el.style.opacity = '0.5';
        } else {
            el.disabled = false;
            el.style.pointerEvents = 'auto';
            el.style.opacity = '1';
        }
    });
}

window.addEventListener('DOMContentLoaded', async () => {
    const registerServiceWorker = async () => {
        if (IS_NATIVE_CAPACITOR) {
            return;
        }

        if ('serviceWorker' in navigator) {
            try {
                const reg = await navigator.serviceWorker.register('sw.js');
                console.log('Exams Venture PWA: Active', reg.scope);
            } catch (err) {
                console.log('PWA Registration Failed: ', err);
            }
        }
    };

    // 1. Core State Initialization
    localStorage.setItem('ev-scale', ACTIVE_SCALE);
    initTheme();

    const isCalculatorPage = !!document.getElementById('view-login') && !!document.getElementById('view-dashboard');
    if (!isCalculatorPage) {
        if (!IS_NATIVE_CAPACITOR) {
            updatePWAInstallUI();
            void registerServiceWorker();
        }
        return;
    }

    populateSemesters();
    applyProfile();
    updateDashboard();
    updateRemainingUnitsDisplay();
    if (isCalculatorPage) {
        void ensureChartLibrary().catch(err => console.warn('Chart preload failed:', err));
    }
    
    // 2. Calculator UI Listeners
    const semSelect = document.getElementById('sem-select');
    if (semSelect) loadSemesterData(semSelect.value);

    const viewCalc = document.getElementById('view-calc');
    if (viewCalc) {
        viewCalc.addEventListener('change', () => updateProjectedCGPA());
        viewCalc.addEventListener('input', () => updateProjectedCGPA());
    }

    // 3. Login & Navigation UI
    const loginView = document.getElementById('view-login');
    if (loginView && loginView.classList.contains('active')) {
        const topBar = document.querySelector('.top-bar');
        if (topBar) topBar.style.display = 'none';
        const adHouse = document.getElementById('ad-house');
        if (adHouse) adHouse.style.display = 'none';
    }

    const savedPin = localStorage.getItem(getStorageKey('pin'));
    const instruction = document.getElementById('login-instruction');
    if (instruction) {
        if (savedPin) {
            instruction.innerText = `Enter your secret ${ACTIVE_SCALE} PIN to continue`;
        } else {
            instruction.innerText = `First time here? Create a 4-digit PIN to secure your ${ACTIVE_SCALE} data.`;
        }
    }

    const profileInput = document.getElementById('prof-total-units');
    if (profileInput) {
        const savedProfile = JSON.parse(localStorage.getItem(getStorageKey('profile')) || '{}');
        if (savedProfile.totalUnits) {
            profileInput.value = savedProfile.totalUnits;
        }
    }

    // 4. Scale Switching Sidebar
    const scaleLinksContainer = document.getElementById('scale-links');
    if (scaleLinksContainer) {
        const otherScales = Object.keys(SCALE_CONFIG).filter(s => s !== ACTIVE_SCALE);
        scaleLinksContainer.innerHTML = otherScales.map(scale => `
            <a href="calculator.html?scale=${scale}" style="color: var(--accent); text-decoration: none; font-size: 0.88rem; font-weight: 600;" title="Open the ${scale} calculator">
                Switch to ${scale} scale
            </a>
        `).join('');
    }

    const scaleSlug = ACTIVE_SCALE.replace('.', '_');
    const infoScaleLinks = [
        { id: 'nav-about-link', base: 'about_app' },
        { id: 'nav-terms-link', base: 'terms_and_conditions_ev' },
        { id: 'nav-academic-link', base: 'academic_guide' },
        { id: 'nav-privacy-link', base: 'privacy_policy' }
    ];
    infoScaleLinks.forEach(linkConfig => {
        const linkEl = document.getElementById(linkConfig.id);
        if (linkEl) {
            linkEl.href = `${linkConfig.base}_${scaleSlug}.html`;
        }
    });

    if (savedPin && sessionStorage.getItem(getSessionUnlockKey()) === 'true') {
        unlockApp();
    }

    // 5. Capacitor & AdMob
    if (window.Capacitor) {
        try {
            await window.Capacitor.Plugins.AdMob.initialize();
            triggerAdRefresh();
        } catch (e) { console.log("AdMob init failed"); }
    }

    // 6. Offline & PWA
    if (!IS_NATIVE_CAPACITOR) {
        initOfflineDetection();
        requestPersistentStorage();
        updatePWAInstallUI();
    }

    // 7. Service Worker Registration
    if (!IS_NATIVE_CAPACITOR) {
        void registerServiceWorker();
    }

    // 8. AI Chatbot Logic
    window.toggleAIChatbot = function() {
        const panel = document.getElementById('ai-chatbot-panel');
        const fab = document.getElementById('ai-chatbot-fab');
        if (!panel) return;
        
        const isVisible = panel.style.display === 'none' || panel.style.display === '';
        
        if (isVisible) {
            panel.style.display = 'flex';
            if (fab) fab.classList.add('hidden');
            document.body.classList.add('ai-chat-open');
        } else {
            panel.style.display = 'none';
            if (fab) fab.classList.remove('hidden');
            document.body.classList.remove('ai-chat-open');
        }
    };

    window.sendChatbotMessage = function() {
        const input = document.getElementById('ai-chatbot-input');
        if (!input) return;
        
        const message = input.value.trim();
        if (!message) return;
        
        addChatbotMessage(message, 'user');
        input.value = '';
        
        hideSuggestions();
        
        showTypingIndicator();
        
        setTimeout(() => {
            removeTypingIndicator();
            const response = getAIResponse(message);
            addChatbotMessage(response, 'bot');
        }, 800 + Math.random() * 600);
    };

    window.addChatbotMessage = function(text, sender) {
        const messagesContainer = document.getElementById('ai-chatbot-messages');
        if (!messagesContainer) return;
        
        const messageDiv = document.createElement('div');
        messageDiv.className = `ai-message ai-message-${sender}`;
        
        const bubble = document.createElement('div');
        bubble.className = 'ai-message-bubble';
        bubble.innerHTML = formatAIMessage(text);
        
        messageDiv.appendChild(bubble);
        messagesContainer.appendChild(messageDiv);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    };

    window.askSuggestion = function(btn) {
        const question = btn.textContent;
        const input = document.getElementById('ai-chatbot-input');
        if (input) input.value = question;
        sendChatbotMessage();
    };

    window.handleChatbotKeyPress = function(event) {
        if (event.key === 'Enter') {
            event.preventDefault();
            sendChatbotMessage();
        }
    };

    function showTypingIndicator() {
        const messagesContainer = document.getElementById('ai-chatbot-messages');
        if (!messagesContainer) return;
        
        const typingDiv = document.createElement('div');
        typingDiv.className = 'ai-message ai-message-bot';
        typingDiv.id = 'ai-typing-indicator';
        
        const bubble = document.createElement('div');
        bubble.className = 'ai-message-bubble';
        bubble.innerHTML = '<div class="ai-typing-indicator"><div class="ai-typing-dot"></div><div class="ai-typing-dot"></div><div class="ai-typing-dot"></div></div>';
        
        typingDiv.appendChild(bubble);
        messagesContainer.appendChild(typingDiv);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    function removeTypingIndicator() {
        const indicator = document.getElementById('ai-typing-indicator');
        if (indicator) indicator.remove();
    }

    function hideSuggestions() {
        const suggestions = document.getElementById('ai-suggestions');
        if (suggestions) suggestions.style.opacity = '0.4';
        suggestions.querySelectorAll('.ai-suggestion-chip').forEach(chip => {
            chip.style.pointerEvents = 'none';
        });
    }

    function formatAIMessage(text) {
        return text
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/\n/g, '<br>');
    }

    function getAIResponse(question) {
        const q = question.toLowerCase().replace(/[^\w\s+#.\-]/g, ' ').replace(/\s+/g, ' ').trim();
        const config = getConfig();
        const scale = ACTIVE_SCALE || '5.0';
        
        const knowledgeBase = [
            {
                keywords: ['how', 'calculate', 'formula', 'work', 'computed', 'compute', 'figuring', 'figure'],
                topics: ['cgpa', 'gpa', 'grade', 'point', 'average'],
                answer: `**How CGPA is calculated on ${scale} scale:**\n\n1. Multiply each course **unit** by its **grade point**\n2. Add all these values → this is your **Total Quality Points**\n3. Divide by **Total Credit Units**\n\n**Formula:** CGPA = Σ(Unit × Grade) ÷ Σ(Units)\n\n**Example (${scale} scale):**\n- Course A: 3 units × 4.0 = 12\n- Course B: 2 units × 3.0 = 6\n- Course C: 1 unit × 5.0 = 5\n- Total: 19 ÷ 6 units = **${scale === '5.0' ? '3.17' : scale === '4.0' ? '2.67' : '2.83'}**\n\nThis calculator does it automatically for you! 📊`
            },
            {
                keywords: ['how', 'improve', 'increase', 'boost', 'raise', 'better', 'increase my', 'improve my', 'raise my', 'boost my', 'better my'],
                topics: ['cgpa', 'gpa', 'grade', 'result', 'performance', 'academic'],
                answer: `**Smart ways to improve your CGPA (${scale} scale):**\n\n1. **Prioritize high-unit courses** – Fix a 4-unit D before a 1-unit A\n2. **Catch carryover courses** – Every carryover is an anchor on your GPA\n3. **Use the Target Tracker** – Know the exact GPA you need each semester\n4. **Study past questions** – Most Nigerian universities repeat questions\n5. **Attend tutorials** – They often contain exam hints\n6. **Start assignments early** – Build class participation marks\n7. **Study 2 weeks before exams** – Cramming works against retention\n8. **Form study groups** – Teaching others reinforces your knowledge\n\n**Never give up** — students have moved from 2.x to 3.5+ with focus! 💪`
            },
            {
                keywords: ['good', 'enough', 'average', 'acceptable', 'decent', 'reasonable', 'pass', 'safe', 'minimum', 'okay', 'ok'],
                topics: ['cgpa', 'gpa', 'grade', 'score', 'result'],
                answer: `**What\'s a good CGPA on ${scale} scale?**\n\nHere\'s the full Nigerian university breakdown:\n\n**${scale} Scale → Class of Degree:**\n${getClassBreakdown(scale)}\n\n**General benchmarks:**\n- **3.0+** (${scale} scale) → Solid for most jobs and further studies\n- **3.5+** → Competitive for scholarships and graduate programs\n- **4.0+** → First Class territory — excellent!\n- **2.0-2.9** → Honest passable range — you\'re fine but can improve\n- **Below ${scale === '4.0' ? '1.0' : scale === '5.0' ? '1.5' : '1.5'}** → Risk of probation — act fast!\n\nYour current class is shown on the dashboard! 🎓`
            },
            {
                keywords: ['gpa', 'difference', 'difference between', 'vs', 'versus', 'compare', 'distinguish'],
                topics: [],
                answer: `**GPA vs CGPA:**\n\n**GPA (Grade Point Average):**\n- Average for **ONE semester only**\n- Fluctuates each term\n- Used to determine semester standing\n\n**CGPA (Cumulative GPA):**\n- Average across **ALL semesters**\n- Stays stable (unless new semester changes it)\n- Used to determine **class of degree**\n\n**How they connect:**\nEach semester\'s GPA is weighted by units, then averaged into your CGPA.\n\n**Pro tip:** You can have a great CGPA even with one bad semester if you recover in the next! 📈`
            },
            {
                keywords: ['class', 'degree', 'honour', 'honor', 'division', 'first', 'second', 'third', 'upper', 'lower'],
                topics: [],
                answer: `**Class of Degree (${scale} Scale — Nigerian Universities):**\n${getClassBreakdown(scale)}\n\n🔻 Below these thresholds → **Probation** or **Withdrawal**\n\nYour class updates automatically on the dashboard as you add semesters!`
            },
            {
                keywords: ['4.0', 'four point', '4-point'],
                topics: ['scale', 'grade', 'grading'],
                answer: `**4.0 Grading Scale:**\nA = 4.0 | B = 3.0 | C = 2.0 | D = 1.0 | F = 0.0\n\n**Percentage cutoffs (typical):**\n- A: 70%–100%\n- B: 60%–69%\n- C: 50%–59%\n- D: 45%–49%\n- F: 0%–44%\n\nUsed by: UI, UNILAG, UNIBEN, and many others.\nSwitch to 4.0 scale in Settings to calculate with this system!`
            },
            {
                keywords: ['5.0', 'five point', '5-point'],
                topics: ['scale', 'grade', 'grading'],
                answer: `**5.0 Grading Scale:**\nA = 5.0 | B = 4.0 | C = 3.0 | D = 2.0 | E = 1.0 | F = 0.0\n\n**Percentage cutoffs (typical):**\n- A: 70%–100%\n- B: 60%–69%\n- C: 50%–59%\n- D: 45%–49%\n- E: 40%–44%\n- F: 0%–39%\n\nUsed by: OAU, UNN, ABU, and several others.\nSwitch to 5.0 scale from the dashboard settings!`
            },
            {
                keywords: ['7.0', 'seven point', '7-point'],
                topics: ['scale', 'grade', 'grading'],
                answer: `**7.0 Grading Scale:**\nA = 7.0 | B = 6.0 | C = 5.0 | D = 4.0 | E = 3.0 | F = 2.0 | G = 0.0\n\n**Used by:** LASU and a few other institutions.\n\n**LASU-specific scale:**\n- 70%+ = A (7.0)\n- 60–69% = B (6.0)\n- 50–59% = C (5.0)\n- 45–49% = D (4.0)\n- 40–44% = E (3.0)\n- Below 40% = F/G (0–2.0)\n\nSwitch to 7.0 scale from the dashboard!`
            },
            {
                keywords: ['target', 'goal', 'future', 'plan', 'remaining', 'need', 'achieve', 'reach', 'reach my', 'achieve my'],
                topics: ['cgpa', 'gpa', 'tracker'],
                answer: `**Using the Target CGPA Tracker:**\n\n1. Go to the **Target** page in this app\n2. Enter your **goal CGPA** (e.g., 3.5 on ${scale} scale)\n3. Enter **remaining units** left in your degree\n4. Tap **"Analyze Future"**\n\nThe tool calculates:\n- The **exact GPA** you need in remaining courses\n- Whether your goal is **realistic, tough, or nearly impossible**\n- Color-coded warnings (green/yellow/red)\n\n**Example:** If you need 3.5 CGPA with 80 units left and currently have 2.8, the tool tells you the exact GPA required going forward! 🎯`
            },
            {
                keywords: ['drop', 'failed', 'fail', 'carryover', 'carry over', 'carry-over', 'resit', 'resit', 'remedial', 'retake', 'rewrite', 'supplementary'],
                topics: ['course', 'grade', 'unit'],
                answer: `**Dealing with Failed/Carryover Courses on ${scale} Scale:**\n\n**Impact on CGPA:**\n- An F/0 grade still **counts as a unit** in the denominator\n- It lowers your CGPA because 0 × units = 0 quality points\n- It drags your average down significantly\n\n**What to do:**\n1. **Retake ASAP** – Every semester you delay keeps the F in your CGPA\n2. **Prioritize it** – Withdraw attention from easier courses temporarily\n3. **Don\'t add new courses** until you\'re confident\n4. **Check your university\'s policy** – Some allow grade replacement\n\n**Good news:** On ${scale} scale, passing even with a **D** or **E** gives you quality points, which rescues your CGPA over time!`
            },
            {
                keywords: ['probation', 'warning', 'academic', 'stand', 'standing', 'risk', 'dismiss', 'expel', 'withdraw', 'withdraw'],
                topics: [],
                answer: `**Academic Probation on ${scale} Scale (Nigerian Universities):**\n\n**What triggers probation:**\n- CGPA drops below the minimum (typically **1.0** on ${scale} scale)\n- Sometimes after one semester of critically low performance\n\n**What probation means:**\n- **Warning period** to improve your grades\n- Possible **restriction** on course units\n- If unresolved → **withdrawal of admission**\n\n**How to survive probation:**\n1. Drop heavy course loads – take fewer, easier courses\n2. Focus entirely on **passing** — don\'t chase A\'s, chase D\'s at minimum\n3. Use the Target Tracker to know minimum GPA to escape\n4. Get **academic counseling** from your department\n5. Study past questions — it\'s the safest path to passing\n\nYou **can** recover! Keep grinding. 💪`
            },
            {
                keywords: ['scholarship', 'bursary', 'financial', 'aid', 'funding', 'grant', 'sponsor', 'money'],
                topics: [],
                answer: `**CGPA Requirements for Scholarships (${scale} Scale):**\n\n**Most common requirements:**\n- **First Class** (${getFirstClassMin(scale)}+) → Full tuition + stipend\n- **Second Class Upper** (${getSecondUpperMin(scale)}+) → Partial or full tuition\n- **3.0+** on ${scale} scale → Most external scholarships (Chevening, Commonwealth)\n- **2.1+ minimum** for many internal university awards\n\n**Tips:**\n- Maintain at least **3.5 CGPA** consistently to remain eligible\n- Check your university\'s **scholarship portal** for exact cutoffs\n- Some require **minimum 3.0 in EVERY semester**, not just overall CGPA\n- External scholarships often need **essays + recommendations** too\n\nKeep your CGPA high even if it means postponing fun! 🏆`
            },
            {
                keywords: ['unit', 'credit', 'load', 'weight', 'meaning', 'what is', 'define', 'definition', 'course unit'],
                topics: [],
                answer: `**What is a Credit Unit?**\n\nA credit unit measures the **academic weight** of a course:\n\n- More units = more study hours per week\n- More units = **more impact on your CGPA**\n\n**Example impact:**\n- MATH 201 (4 units, C grade on ${scale} scale = ${getGradePoint('C', scale)}) → 4 × ${getGradePoint('C', scale)} = **${4 * getGradePoint('C', scale)} quality points**\n- GSP 102 (1 unit, A grade = ${getGradePoint('A', scale)}) → 1 × ${getGradePoint('A', scale)} = **${1 * getGradePoint('A', scale)} quality point**\n\n**Rule of thumb:** Fix a bad grade on a **high-unit course** before fixing a high-grade on a low-unit course! 📚`
            },
            {
                keywords: ['grade', 'letter', 'point', 'points', 'boundary', 'cutoff', 'cut-off', 'mark', 'score', 'marks'],
                topics: [],
                answer: `**Grade Boundaries — ${scale} Scale:**\n${getGradeBoundaries(scale)}\n\n💡 **Tip:** Focus on crossing the next boundary (e.g., 59%→60%) rather than getting 100% — the grade point is the same from the cutoff upward!`
            },
            {
                keywords: ['transfer', 'change', 'switch', 'another', 'different', 'university', 'institution'],
                topics: [],
                answer: `**CGPA When Transferring/Changing Universities:**\n\n1. **Your CGPA travels with you** — The new university evaluates your transcript\n2. **Grade conversion** — They map your grades to their scale (e.g., ${scale} scale)\n3. **Units transfer** — Most accept completed units, but check their policy\n4. **CGPA reset** — Some universities let you start fresh with a new CGPA\n\n**Before transferring:**\n- Get a **certified transcript** from your current school\n- Contact the **new university\'s admissions office**\n- Ask about **minimum GPA requirements** for transfer\n\nYour hard-earned credits are valuable — make sure they count! 🎓`
            },
            {
                keywords: ['study', 'tips', 'tips to', 'how to study', 'study plan', 'study routine', 'exam', 'exams', 'test', 'prepare', 'preparation', 'pass', 'passing'],
                topics: [],
                answer: `**Smart Study Tips for Nigerian University Students:**\n\n**1. Start Early**\n- Begin reviewing **2 weeks before** exams\n- Make a revision timetable\n\n**2. Master Past Questions**\n- 70% of questions are recycled in most Nigerian unis\n- Solve past papers under timed conditions\n\n**3. Focus on Lecturers\' Notes**\n- Highlight what the lecturer emphasized\n- Attend classes — participation marks are free points\n\n**4. Active Recall > Reading**\n- Close book → write what you remember\n- Teach concepts to a friend\n\n**5. Prioritize by Unit Value**\n- A 4-unit course exam is worth more than two 1-unit exams\n\n**6. Rest Before Exams**\n- 7 hours sleep > cramming all night\n- You recall better with a rested brain\n\n**7. Form Study Groups**\n- 3–5 serious students = powerful knowledge sharing\n\n**8. Use the Calculator**\n- This app tracks what you need for your target CGPA!\n\nConsistency beats intensity! 📚✨`
            },
            {
                keywords: ['first class', 'first class', '1st class', 'graduate with', 'graduate in'],
                topics: [],
                answer: `**How to Graduate with First Class on ${scale} Scale:**\n\n**Required CGPA:**\n- **${scale} scale:** ${getFirstClassMin(scale)}+ throughout your degree\n\n**Strategy:**\n1. **Year 1:** Get A\'s in everything — build a strong foundation\n2. **Year 2–3:** Maintain 3.5+ every semester\n3. **Year 4:** Protect your CGPA — don\'t take unnecessary risks\n\n**Critical:** One B in a 4-unit course can drop you from First to Second Class!\n\nUse the **Target Tracker** to see what GPA you need each semester! 🏆`
            },
            {
                keywords: ['2nd class', 'second class', 'second upper', 'second lower', '2:1', '2:2', 'class upper', 'class lower'],
                topics: [],
                answer: `**Second Class Honours Breakdown (${scale} Scale):**\n\n- **Second Class Upper (2:1):** ${getSecondUpperMin(scale)}–${getFirstClassMin(scale) - 0.01}\n  Most competitive for jobs and masters programs\n\n- **Second Class Lower (2:2):** ${getSecondLowerMin(scale)}–${getSecondUpperMin(scale) - 0.01}\n  Acceptable for most graduate programs\n\n**If you\'re close to the boundary:**\n- Use the Target Tracker to plan exactly what you need\n- Focus on high-unit courses first\n- One strong semester can push you up a class! 🎓`
            },
            {
                keywords: ['nigerian', 'university', 'uni', 'school', 'schools', 'polytechnic', 'which', 'what', 'where', 'recommend', 'best', 'top'],
                topics: [],
                answer: `**Nigerian University Grading Systems:**\n\n**4.0 Scale Users:** UI, UNILAG, UNIBEN, FUTA, LASUS (pre-2020), FUTO\n\n**5.0 Scale Users:** OAU, UNN, ABU Zaria, LASU (post-2020), UNILORIN\n\n**7.0 Scale Users:** LASU (old system), some polytechnics\n\n**Tips:**\n- Always verify from your **faculty handbook**\n- Some universities have **different cutoffs** per faculty\n- Engineering & Medicine often have stricter grade boundaries\n\nThe calculator supports **all three scales** — just switch from the dashboard! 🇳🇬`
            },
            {
                keywords: ['reset', 'wipe', 'clear', 'delete', 'fresh', 'start', 'start over', 'start again', 'remove all', 'erase'],
                topics: [],
                answer: `**Resetting the Calculator:**\n\nYou can wipe all data from the app\'s settings:\n\n1. Open the **sidebar menu**\n2. Tap **"Wipe All Data"**\n3. Confirm the action\n\nThis will:\n- ❌ Delete all saved semesters\n- ❌ Clear your profile\n- ❌ Remove your PIN\n\nThis cannot be undone! Make sure to **export a backup** first if you want to save your data.\n\n**To export:** Use "Export Backup (JSON)" from the dashboard.`
            }
        ];

        let bestMatch = null;
        let bestScore = 0;

        for (const entry of knowledgeBase) {
            let score = 0;
            const allTerms = [...entry.keywords, ...entry.topics];
            
            for (const term of allTerms) {
                if (term.length < 2) continue;
                if (q.includes(term)) {
                    score += term.length * 2;
                }
                const words = term.split(' ');
                const qWords = q.split(' ');
                let wordMatches = 0;
                for (const w of words) {
                    if (w.length < 2) continue;
                    for (const qw of qWords) {
                        if (qw.startsWith(w) || w.startsWith(qw)) {
                            wordMatches += 1;
                            break;
                        }
                    }
                }
                if (wordMatches > 0 && wordMatches === words.length) {
                    score += wordMatches * 3;
                }
            }
            if (score > bestScore) {
                bestScore = score;
                bestMatch = entry;
            }
        }

        if (bestMatch && bestScore >= 6) {
            return personalizeAnswer(bestMatch.answer, question);
        }

        const fallbacks = [
            `I specialize in CGPA and academic topics! Try asking me about:\n\n• How CGPA is calculated on your ${scale} scale\n• Tips to improve your grades\n• What your current class of degree means\n• How the Target Tracker works\n• Grade boundaries and pass marks\n• Dealing with carryover courses\n• Study tips and exam preparation\n\nI\'m still learning, so try rephrasing your question! 📚`,
            
            `That\'s an interesting question! While I\'m focused on academic topics, here\'s what I can help with:\n\n📊 **Calculate & understand** CGPA/GPA\n🎯 **Plan** your target grades\n📚 **Study tips** for better results\n🏆 **Degree classes** and requirements\n🎓 **Transfer** credits between schools\n\nAsk me about any of these and I\'ll give you a detailed answer!`,
            
            `I\'d love to help! I\'m your CGPA Assistant — try questions like:\n\n• "How can I raise my CGPA?"\n• "What\'s the difference between GPA and CGPA?"\n• "What CGPA do I need for first class?"\n• "How do carryover courses affect my grade?"\n• "What\'s a good CGPA on 5.0 scale?"\n\nType anything related to your academics! 🎓`
        ];

        return fallbacks[Math.floor(Math.random() * fallbacks.length)];
    }

    function getClassBreakdown(scale) {
        if (scale === '4.0') {
            return '- 3.50 – 4.00 → **First Class Honours**\n- 2.40 – 3.49 → **Second Class Honours (Upper Division)**\n- 1.50 – 2.39 → **Second Class Honours (Lower Division)**\n- 0.00 – 1.49 → **Third Class / Pass**';
        } else if (scale === '5.0') {
            return '- 4.50 – 5.00 → **First Class**\n- 3.50 – 4.49 → **Second Class Upper**\n- 2.40 – 3.49 → **Second Class Lower**\n- 1.00 – 2.39 → **Third Class**\n- 0.00 → **Fail / Pass**';
        } else {
            return '- 6.00 – 7.00 → **First Class**\n- 5.00 – 5.99 → **Second Class Upper**\n- 4.00 – 4.99 → **Second Class Lower**\n- 3.00 – 3.99 → **Third Class**\n- Below 3.00 → **Fail**';
        }
    }

    function getFirstClassMin(scale) {
        if (scale === '4.0') return '3.50';
        if (scale === '5.0') return '4.50';
        return '6.00';
    }

    function getSecondUpperMin(scale) {
        if (scale === '4.0') return '2.40';
        if (scale === '5.0') return '3.50';
        return '5.00';
    }

    function getSecondLowerMin(scale) {
        if (scale === '4.0') return '1.50';
        if (scale === '5.0') return '2.40';
        return '4.00';
    }

    function getGradePoint(letter, scale) {
        const map = {
            'A': { '4.0': 4.0, '5.0': 5.0, '7.0': 7.0 },
            'B': { '4.0': 3.0, '5.0': 4.0, '7.0': 6.0 },
            'C': { '4.0': 2.0, '5.0': 3.0, '7.0': 5.0 },
            'D': { '4.0': 1.0, '5.0': 2.0, '7.0': 4.0 },
            'E': { '4.0': 0.0, '5.0': 1.0, '7.0': 3.0 },
            'F': { '4.0': 0.0, '5.0': 0.0, '7.0': 2.0 },
            'G': { '4.0': 0.0, '5.0': 0.0, '7.0': 0.0 }
        };
        return map[letter]?.[scale] || 0;
    }

    function getGradeBoundaries(scale) {
        if (scale === '4.0') {
            return '- A: 70–100% (4.0 pts)\n- B: 60–69% (3.0 pts)\n- C: 50–59% (2.0 pts)\n- D: 45–49% (1.0 pt)\n- F: 0–44% (0.0 pts) ← FAIL';
        } else if (scale === '5.0') {
            return '- A: 70–100% (5.0 pts)\n- B: 60–69% (4.0 pts)\n- C: 50–59% (3.0 pts)\n- D: 45–49% (2.0 pts)\n- E: 40–44% (1.0 pt)\n- F: 0–39% (0.0 pts) ← FAIL';
        } else {
            return '- A: 70–100% (7.0 pts)\n- B: 60–69% (6.0 pts)\n- C: 50–59% (5.0 pts)\n- D: 45–49% (4.0 pts)\n- E: 40–44% (3.0 pts)\n- F: Below 40% (0–2.0 pts) ← FAIL';
        }
    }

    function personalizeAnswer(answer, question) {
        const cfg = getConfig();
        const currentCGPA = getCurrentDisplayCGPA();
        
        if (question.includes('my') && currentCGPA > 0) {
            const personalized = answer.replace(
                '🎓',
                `\n\n📌 **Your current CGPA: ${currentCGPA}**`
            );
            return personalized;
        }
        
        return answer;
    }

    function getCurrentDisplayCGPA() {
        const el = document.getElementById('display-cgpa');
        if (!el) return 0;
        const val = parseFloat(el.textContent);
        return isNaN(val) ? 0 : val;
    }
});

