// ──────────────────────────────────────────────
// ALL IT ROLES — searchable master list
// ──────────────────────────────────────────────
const ALL_IT_ROLES = [
  "Frontend Developer", "Backend Developer", "Full Stack Developer",
  "Mobile Developer (iOS)", "Mobile Developer (Android)", "Mobile Developer (React Native)",
  "DevOps Engineer", "Cloud Engineer", "Site Reliability Engineer (SRE)",
  "Data Engineer", "Data Scientist", "Machine Learning Engineer", "AI Engineer",
  "UI/UX Designer", "Product Designer", "Graphic Designer",
  "Product Manager", "Project Manager", "Scrum Master", "Agile Coach",
  "QA Engineer", "Automation Test Engineer", "Performance Engineer",
  "Security Engineer", "Penetration Tester", "Cybersecurity Analyst",
  "Database Administrator (DBA)", "System Administrator", "Network Engineer",
  "System Architect", "Solution Architect", "Enterprise Architect",
  "Business Analyst", "Technical Writer", "Documentation Engineer",
  "API Developer", "Integration Engineer", "Microservices Developer",
  "Blockchain Developer", "Game Developer", "Embedded Systems Engineer",
  "IoT Developer", "AR/VR Developer", "Computer Vision Engineer",
  "NLP Engineer", "Data Analyst", "BI Developer", "ETL Developer",
  "Infrastructure Engineer", "Platform Engineer", "Release Manager",
  "Tech Lead", "Engineering Manager", "CTO / Technical Director"
];

let selectedRoles = [];
let csvFiles = [];
let currentSession = null;
let latestData = null;
let latestProjectName = "";
let historyData = [];

// ──── DOM refs ────
const userEmailEl    = document.getElementById("user-email");
const logoutBtn      = document.getElementById("logout-btn");
const analyzeForm    = document.getElementById("analyze-form");
const projectInput   = document.getElementById("project-name");
const descInput      = document.getElementById("project-description");
const durationInput  = document.getElementById("duration-hint");
const teamSizeInput  = document.getElementById("team-size-hint");
const techPrefInput  = document.getElementById("tech-preferences");
const roleSearchEl   = document.getElementById("role-search");
const roleDropdown   = document.getElementById("role-dropdown");
const selectedRolesEl= document.getElementById("selected-roles");
const addCsvBtn      = document.getElementById("add-csv-btn");
const csvContainer   = document.getElementById("csv-container");
const analyzeBtn     = document.getElementById("analyze-btn");
const analyzeBtnTxt  = document.getElementById("analyze-btn-text");
const analyzeSpinner = document.getElementById("analyze-spinner");
const resultsSection = document.getElementById("results-section");
const noResultsMsg   = document.getElementById("no-results-msg");
const mainAlert      = document.getElementById("main-alert");
const historyList    = document.getElementById("history-list");

// ──── Init ────
(async () => {
  currentSession = await requireAuth();
  if (!currentSession) return;
  userEmailEl.textContent = currentSession.user.email;
  logoutBtn.addEventListener("click", signOut);
  addCsvBtn.addEventListener("click", addCsvBlock);
  analyzeForm.addEventListener("submit", handleAnalyze);
  setupTabs();
  setupRoleSearch();
  loadHistory();
})();

// ──────────────────────────────────────────────
// Role Search
// ──────────────────────────────────────────────

function setupRoleSearch() {
  roleSearchEl.addEventListener("input", () => {
    const q = roleSearchEl.value.trim().toLowerCase();
    if (!q) { roleDropdown.style.display = "none"; return; }
    const matches = ALL_IT_ROLES.filter(r =>
      r.toLowerCase().includes(q) && !selectedRoles.includes(r)
    ).slice(0, 8);
    if (matches.length === 0) { roleDropdown.style.display = "none"; return; }
    roleDropdown.innerHTML = matches.map(r =>
      `<div class="role-option" onclick="selectRole('${r.replace(/'/g,"\\'")}')">\
<span class="role-dot"></span>${r}</div>`
    ).join("");
    roleDropdown.style.display = "block";
  });

  document.addEventListener("click", (e) => {
    if (!e.target.closest(".role-search-wrap")) {
      roleDropdown.style.display = "none";
    }
  });
}

function selectRole(role) {
  if (selectedRoles.includes(role)) return;
  selectedRoles.push(role);
  roleSearchEl.value = "";
  roleDropdown.style.display = "none";
  renderSelectedRoles();
}

function quickAddRole(role) { selectRole(role); }

function removeRole(role) {
  selectedRoles = selectedRoles.filter(r => r !== role);
  renderSelectedRoles();
}

function renderSelectedRoles() {
  if (selectedRoles.length === 0) {
    selectedRolesEl.innerHTML = `<span class="no-roles-hint">No roles selected — AI will determine the best team composition</span>`;
    return;
  }
  selectedRolesEl.innerHTML = selectedRoles.map(r => `
    <span class="role-tag">
      ${r}
      <button type="button" class="role-tag-remove" onclick="removeRole('${r.replace(/'/g,"\\'")}')">&#x2715;</button>
    </span>
  `).join("");
}

// ──────────────────────────────────────────────
// CSV File Management
// ──────────────────────────────────────────────

function addCsvBlock() {
  const idx = csvFiles.length;
  csvFiles.push({ name: `dataset_${idx + 1}.csv`, content: "" });

  const item = document.createElement("div");
  item.className = "csv-file-item";
  item.dataset.idx = idx;
  item.innerHTML = `
    <div class="csv-file-header">
      <input class="csv-name-input" type="text" value="${csvFiles[idx].name}"
        placeholder="filename.csv"
        style="background:transparent;border:none;border-bottom:1px solid var(--border);
        color:var(--accent);font-size:13px;font-weight:500;outline:none;width:200px;padding:2px 4px;"
        onchange="updateCsvName(${idx}, this.value)"/>
      <button type="button" class="remove-csv" onclick="removeCsvBlock(this, ${idx})" title="Remove">&#x2715;</button>
    </div>
    <div class="form-group" style="margin:0;">
      <textarea placeholder="Paste CSV content here (employees, projects, tools datasets)..."
        onchange="updateCsvContent(${idx}, this.value)"
        oninput="updateCsvContent(${idx}, this.value)"
        rows="6"></textarea>
    </div>
  `;
  csvContainer.appendChild(item);
}

function updateCsvName(idx, val)    { csvFiles[idx].name = val; }
function updateCsvContent(idx, val) { csvFiles[idx].content = val; }
function removeCsvBlock(btn, idx) {
  btn.closest(".csv-file-item").remove();
  csvFiles[idx] = null;
}

// ──────────────────────────────────────────────
// Analyze
// ──────────────────────────────────────────────

async function handleAnalyze(e) {
  e.preventDefault();
  hideAlert();

  const projectName = projectInput.value.trim();
  if (!projectName) { showAlert("Please enter a project name.", "error"); return; }

  setLoading(true);
  resultsSection.style.display = "none";
  noResultsMsg.style.display = "block";

  const validFiles = (csvFiles || []).filter(f => f && f.content && f.content.trim());

  try {
    const resp = await fetch("/api/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        user_token:          currentSession.access_token,
        project_name:        projectName,
        project_description: descInput.value.trim(),
        duration_hint:       durationInput.value.trim(),
        team_size_hint:      teamSizeInput.value.trim(),
        tech_preferences:    techPrefInput.value.trim(),
        preferred_roles:     selectedRoles,
        csv_files:           validFiles
      })
    });

    const data = await resp.json();
    if (!resp.ok) throw new Error(data.error || "Analysis failed");

    renderResults(data, projectName);
    loadHistory();
    switchTab("tab-analysis");

  } catch (err) {
    showAlert("Error: " + err.message, "error");
    noResultsMsg.style.display = "block";
  } finally {
    setLoading(false);
  }
}

// ──────────────────────────────────────────────
// Render Results
// ──────────────────────────────────────────────

function renderResults(data, projectName) {
  // Store for export
  latestData = data;
  latestProjectName = projectName;

  // Overview
  document.getElementById("res-project-title").textContent = projectName;
  document.getElementById("res-overview").textContent = data.project_overview || "—";

  // Skills
  const skillsEl = document.getElementById("res-skills");
  skillsEl.innerHTML = (data.required_skills || [])
    .map((s, i) => `<span class="badge ${["","badge-purple","badge-green"][i%3]}">${esc(s)}</span>`)
    .join("") || "—";

  // ── Stats Row ──
  const dur = data.estimated_duration || {};
  const tsz = data.team_size || {};
  const comp = data.team_composition || data.team_assignment || [];
  document.getElementById("stat-days").textContent  = dur.total_days  || "—";
  document.getElementById("stat-weeks").textContent = dur.total_weeks || "—";
  document.getElementById("stat-team").textContent  = tsz.total || (comp.reduce ? comp.reduce((s,r) => s + (r.count||1), 0) : "—");
  document.getElementById("stat-roles").textContent = comp.length || "—";

  // Team Size Panel
  const breakdownText = [tsz.breakdown, tsz.rationale].filter(Boolean).join(" — ");
  document.getElementById("res-team-breakdown").textContent = breakdownText || (tsz.total ? `Total team: ${tsz.total} members` : "—");

  // ── Team Composition Table ──
  const compBody = document.getElementById("composition-table-body");
  compBody.innerHTML = (data.team_composition || []).map(row => {
    const skills = Array.isArray(row.skills_required)
      ? row.skills_required.map(s => `<span class="badge badge-purple" style="font-size:11px;padding:2px 8px">${esc(s)}</span>`).join(" ")
      : esc(row.skills_required || "");
    return `
      <tr>
        <td style="font-weight:600">${esc(row.role)}</td>
        <td><span class="count-badge">${row.count || 1}</span></td>
        <td>${skills}</td>
        <td class="muted">${esc(row.responsibility || "")}</td>
      </tr>`;
  }).join("") || `<tr><td colspan="4" class="muted" style="text-align:center;padding:24px">No composition data</td></tr>`;

  // ── Team Assignment Table ──
  const teamBody = document.getElementById("team-table-body");
  teamBody.innerHTML = (data.team_assignment || []).map(row => `
    <tr>
      <td><span class="badge">${esc(row.role)}</span></td>
      <td><span class="count-badge">${row.count || 1}</span></td>
      <td style="font-weight:600">${esc(row.employee)}</td>
      <td class="muted">${esc(row.reason)}</td>
    </tr>`
  ).join("") || `<tr><td colspan="4" class="muted" style="text-align:center;padding:24px">No assignments</td></tr>`;

  // ── Tech Stack Table ──
  const techBody = document.getElementById("tech-table-body");
  const categoryColors = {
    "frontend": "badge-purple", "backend": "badge-green",
    "database": "badge-warn",  "devops": "",
    "testing":  "badge-danger", "mobile": "badge-purple"
  };
  techBody.innerHTML = (data.tech_stack || []).map(row => {
    const cat = (row.category || "").toLowerCase();
    const color = Object.keys(categoryColors).find(k => cat.includes(k));
    const cls = color ? categoryColors[color] : "";
    return `<tr>
      <td style="font-weight:600">${esc(row.technology)}</td>
      <td><span class="badge ${cls}" style="font-size:11px">${esc(row.category)}</span></td>
      <td class="muted">${esc(row.purpose)}</td>
      <td class="muted" style="font-size:11px">${esc(row.version || "")}</td>
    </tr>`;
  }).join("") || `<tr><td colspan="4" class="muted" style="text-align:center;padding:24px">No tech stack data</td></tr>`;

  // ── Timeline Breakdown Table ──
  const timelineBody = document.getElementById("timeline-table-body");
  const totalDays = dur.total_days || 1;
  timelineBody.innerHTML = (dur.per_phase || []).map(p => {
    const pct = Math.round((p.days / totalDays) * 100);
    return `<tr>
      <td style="font-weight:600">${esc(p.phase)}</td>
      <td><span class="days-pill">&#x23F1; ${p.days} days</span></td>
      <td>
        <div class="progress-bar"><div class="progress-fill" style="width:${pct}%"></div></div>
        <span style="font-size:11px;color:var(--text-muted)">${pct}%</span>
      </td>
    </tr>`;
  }).join("") || `<tr><td colspan="3" class="muted" style="text-align:center;padding:24px">No timeline data</td></tr>`;
  document.getElementById("res-timeline").textContent = data.timeline_summary || dur.summary || "—";

  // ── Tools Table ──
  const toolsBody = document.getElementById("tools-table-body");
  toolsBody.innerHTML = (data.recommended_tools || []).map(row => `
    <tr>
      <td><span class="badge badge-purple">${esc(row.tool)}</span></td>
      <td class="muted">${esc(row.reason)}</td>
    </tr>`
  ).join("") || `<tr><td colspan="2" class="muted" style="text-align:center;padding:24px">No tools</td></tr>`;

  // ── Execution Plan ──
  const planBody = document.getElementById("plan-table-body");
  planBody.innerHTML = (data.execution_plan || []).map(row => {
    const tags = (row.tasks || []).map(t => `<span>${esc(t)}</span>`).join("");
    return `<tr>
      <td style="font-weight:600">${esc(row.phase)}</td>
      <td><span class="days-pill">&#x23F1; ${row.estimated_days} days</span></td>
      <td class="td-tasks">${tags}</td>
    </tr>`;
  }).join("") || `<tr><td colspan="3" class="muted" style="text-align:center;padding:24px">No plan yet</td></tr>`;

  // ── Risk Table ──
  const riskBody = document.getElementById("risk-table-body");
  riskBody.innerHTML = (data.risk_analysis || []).map(row => {
    const risk = typeof row === "object" ? row.risk : row;
    const mit  = typeof row === "object" ? row.mitigation : "—";
    return `<tr>
      <td><span class="badge badge-danger">&#x26A0; ${esc(risk)}</span></td>
      <td class="muted">${esc(mit)}</td>
    </tr>`;
  }).join("") || `<tr><td colspan="2" class="muted" style="text-align:center;padding:24px">No risks identified</td></tr>`;

  // Show results
  resultsSection.style.display = "block";
  noResultsMsg.style.display   = "none";
  resultsSection.scrollIntoView({ behavior: "smooth", block: "start" });
}

// ──────────────────────────────────────────────
// History
// ──────────────────────────────────────────────

async function loadHistory() {
  if (!currentSession) return;
  try {
    const resp = await fetch("/api/history", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_token: currentSession.access_token })
    });
    const rows = await resp.json();
    historyData = Array.isArray(rows) ? rows : [];

    if (historyData.length === 0) {
      historyList.innerHTML = `<p style="color:var(--text-muted);font-size:13px;text-align:center;padding:20px">No analyses yet</p>`;
      return;
    }

    historyList.innerHTML = historyData.map((r, idx) => {
      try {
        const resObj = typeof r.result === "string" ? JSON.parse(r.result) : (r.result || {});
        r.parsedResult = resObj;

        const dur = resObj.estimated_duration || {};
        const tsz = resObj.team_size || {};
        const meta = [
          (dur.total_weeks || dur.total_days) ? `&#x23F1; ${dur.total_weeks || dur.total_days} ${dur.total_weeks ? "wks" : "days"}` : "",
          tsz.total ? `&#x1F465; ${tsz.total} members` : ""
        ].filter(Boolean).join("  &middot;  ");

        return `
        <div class="history-item" onclick="loadHistoryItem(${idx})">
          <div>
            <div class="proj-name">${esc(r.project_name)}</div>
            <div class="proj-date">${new Date(r.created_at).toLocaleString()}${meta ? "  &middot;  " + meta : ""}</div>
          </div>
          <span class="load-btn">Load &#x2192;</span>
        </div>`;
      } catch (err) {
        console.error("History row parse error:", err);
        return "";
      }
    }).join("");
  } catch (e) {
    console.error("Failed to load history:", e);
    historyList.innerHTML = `<p style="color:var(--accent-danger);font-size:13px;text-align:center;padding:20px">Error loading history</p>`;
  }
}

function loadHistoryItem(index) {
  const row = historyData[index];
  if (!row) return;

  let resObj = row.parsedResult;
  if (!resObj) {
    try { resObj = typeof row.result === "string" ? JSON.parse(row.result) : (row.result || {}); }
    catch(e) { resObj = {}; }
  }

  // Switch tab and show results section first
  switchTab("tab-analysis");
  resultsSection.style.display = "block";
  noResultsMsg.style.display   = "none";

  renderResults(resObj, row.project_name);
  projectInput.value = row.project_name;

  requestAnimationFrame(() => {
    resultsSection.scrollIntoView({ behavior: "smooth", block: "start" });
  });
}

// ──────────────────────────────────────────────
// Tabs
// ──────────────────────────────────────────────
function setupTabs() {
  document.querySelectorAll(".tab-btn").forEach(btn => {
    btn.addEventListener("click", () => switchTab(btn.dataset.tab));
  });
}
function switchTab(tabId) {
  document.querySelectorAll(".tab-btn").forEach(b => b.classList.toggle("active", b.dataset.tab === tabId));
  document.querySelectorAll(".tab-content").forEach(c => c.classList.toggle("active", c.id === tabId));
}

// ──────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────
function setLoading(on) {
  analyzeBtn.disabled = on;
  analyzeSpinner.style.display = on ? "block" : "none";
  analyzeBtnTxt.textContent = on ? "Generating plan..." : "&#x1F680; Generate Project Plan";
}
function showAlert(msg, type = "info") {
  mainAlert.textContent = msg;
  mainAlert.className = `alert alert-${type} show`;
}
function hideAlert() { mainAlert.className = "alert"; }
function esc(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g,"&amp;").replace(/</g,"&lt;")
    .replace(/>/g,"&gt;").replace(/"/g,"&quot;");
}

// ──────────────────────────────────────────────
// EXPORT: Build Plain Text (shared helper)
// ──────────────────────────────────────────────

function buildPlainText(d, name) {
  const ln = (c, n=40) => c.repeat(n);
  let txt = "AI PROJECT MANAGER REPORT\n" + ln("=") + "\n";
  txt += "Project: " + name + "\nGenerated: " + new Date().toLocaleString() + "\n\n";
  txt += "PROJECT OVERVIEW\n" + ln("-") + "\n" + (d.project_overview || "N/A") + "\n\n";
  txt += "REQUIRED SKILLS\n" + ln("-") + "\n" + ((d.required_skills||[]).join(", ") || "N/A") + "\n\n";

  const dur = d.estimated_duration || {};
  const tsz = d.team_size || {};
  txt += "ESTIMATED DURATION\n" + ln("-") + "\n";
  txt += "Total: " + (dur.total_days||"N/A") + " days / " + (dur.total_weeks||"N/A") + " weeks\n";
  txt += (dur.summary || "") + "\n\n";

  txt += "TEAM SIZE\n" + ln("-") + "\n";
  txt += "Total Members: " + (tsz.total||"N/A") + "\n";
  txt += (tsz.breakdown || "") + "\n" + (tsz.rationale || "") + "\n\n";

  txt += "TEAM COMPOSITION\n" + ln("-") + "\n";
  (d.team_composition||[]).forEach(r => {
    txt += "  " + r.role + " x" + (r.count||1) + "\n";
    txt += "    Skills: " + (Array.isArray(r.skills_required) ? r.skills_required.join(", ") : (r.skills_required||"")) + "\n";
    txt += "    Responsibility: " + (r.responsibility||"") + "\n";
  });
  txt += "\n";

  txt += "TEAM ASSIGNMENT\n" + ln("-") + "\n";
  (d.team_assignment||[]).forEach(r => {
    txt += "  [" + r.role + " x" + (r.count||1) + "] " + r.employee + "\n";
    txt += "    Reason: " + r.reason + "\n";
  });
  txt += "\n";

  txt += "TECH STACK\n" + ln("-") + "\n";
  (d.tech_stack||[]).forEach(r => {
    txt += "  " + r.technology + (r.version ? " v"+r.version : "") + " [" + r.category + "] - " + r.purpose + "\n";
  });
  txt += "\n";

  txt += "TIMELINE BREAKDOWN\n" + ln("-") + "\n";
  (dur.per_phase||[]).forEach(p => {
    const pct = Math.round((p.days / (dur.total_days||1)) * 100);
    txt += "  " + p.phase + ": " + p.days + " days (" + pct + "%)\n";
  });
  txt += "\n";

  txt += "RECOMMENDED TOOLS\n" + ln("-") + "\n";
  (d.recommended_tools||[]).forEach(r => txt += "  " + r.tool + ": " + r.reason + "\n");
  txt += "\n";

  txt += "EXECUTION PLAN\n" + ln("-") + "\n";
  (d.execution_plan||[]).forEach(r => {
    txt += "  " + r.phase + " (" + r.estimated_days + " days)\n";
    (r.tasks||[]).forEach(t => txt += "    - " + t + "\n");
  });
  txt += "\n";

  txt += "RISK ANALYSIS\n" + ln("-") + "\n";
  (d.risk_analysis||[]).forEach(r => {
    const risk = typeof r === "object" ? r.risk : r;
    const mit  = typeof r === "object" ? r.mitigation : "";
    txt += "  RISK: " + risk + "\n  Mitigation: " + mit + "\n\n";
  });

  txt += ln("=") + "\nEnd of Report\n";
  return txt;
}

// ──────────────────────────────────────────────
// EXPORT: Copy as Plain Text
// ──────────────────────────────────────────────

function copyAsText() {
  if (!latestData) { showAlert("Run an analysis first.", "error"); return; }
  const txt = buildPlainText(latestData, latestProjectName);

  navigator.clipboard.writeText(txt).then(() => {
    const btn = document.getElementById("copy-text-btn");
    btn.innerHTML = "<span>&#x2705;</span> Copied!";
    btn.classList.add("btn-success-flash");
    setTimeout(() => {
      btn.innerHTML = "<span>&#x1F4CB;</span> Copy Text";
      btn.classList.remove("btn-success-flash");
    }, 2500);
  }).catch(() => {
    const ta = document.createElement("textarea");
    ta.value = txt; ta.style.cssText = "position:fixed;top:-9999px;opacity:0";
    document.body.appendChild(ta); ta.select();
    document.execCommand("copy"); document.body.removeChild(ta);
    showAlert("Copied to clipboard!", "success");
  });
}

// ──────────────────────────────────────────────
// EXPORT: Download as PDF (pure jsPDF — never blank)
// ──────────────────────────────────────────────

function downloadPDF() {
  if (!latestData) { showAlert("Run an analysis first.", "error"); return; }

  const btn = document.getElementById("download-pdf-btn");
  btn.innerHTML = "<span>&#x23F3;</span> Generating...";
  btn.disabled = true;

  try {
    // jsPDF UMD bundle may expose itself differently depending on version/browser
    const jsPDFClass = (window.jspdf && window.jspdf.jsPDF)
                    || window.jsPDF
                    || (window.jspdf);
    if (!jsPDFClass) {
      throw new Error("jsPDF library not loaded. Check your internet connection and reload the page.");
    }
    const doc  = new jsPDFClass({ unit: "mm", format: "a4", orientation: "portrait" });

    const d    = latestData;
    const name = latestProjectName;
    const PW   = 190;
    const ML   = 10;
    let   y    = 15;

    const newPage = (needed) => {
      needed = needed || 10;
      if (y + needed > 280) { doc.addPage(); y = 15; }
    };

    const h1 = (txt) => {
      newPage(14);
      doc.setFont("helvetica", "bold"); doc.setFontSize(16);
      doc.setTextColor(30, 58, 138);
      doc.text(txt, ML, y); y += 2;
      doc.setDrawColor(99, 179, 237); doc.setLineWidth(0.5);
      doc.line(ML, y, ML + PW, y); y += 7;
      doc.setFont("helvetica", "normal"); doc.setFontSize(10);
      doc.setTextColor(30, 30, 30);
    };

    const h2 = (txt) => {
      newPage(10);
      doc.setFont("helvetica", "bold"); doc.setFontSize(12);
      doc.setTextColor(37, 99, 235);
      doc.text(txt, ML, y); y += 6;
      doc.setFont("helvetica", "normal"); doc.setFontSize(10);
      doc.setTextColor(30, 30, 30);
    };

    const body = (txt, indent) => {
      indent = indent || 0;
      const lines = doc.splitTextToSize(String(txt), PW - indent);
      lines.forEach(line => {
        newPage(6);
        doc.text(line, ML + indent, y); y += 5;
      });
    };

    const lv = (label, val, indent) => {
      indent = indent || 0;
      newPage(6);
      doc.setFont("helvetica", "bold"); doc.setFontSize(10);
      doc.text(label + ":", ML + indent, y);
      doc.setFont("helvetica", "normal");
      const lw = doc.getTextWidth(label + ":") + 2;
      const lines = doc.splitTextToSize(String(val || "N/A"), PW - indent - lw);
      doc.text(lines[0], ML + indent + lw, y); y += 5;
      for (let i = 1; i < lines.length; i++) {
        newPage(5); doc.text(lines[i], ML + indent + lw, y); y += 5;
      }
    };

    const tr = (cols, widths, isHdr) => {
      newPage(8);
      if (isHdr) {
        doc.setFillColor(243, 244, 246);
        doc.rect(ML, y - 5, PW, 7, "F");
        doc.setFont("helvetica", "bold"); doc.setFontSize(9);
        doc.setTextColor(55, 65, 81);
      } else {
        doc.setFont("helvetica", "normal"); doc.setFontSize(9);
        doc.setTextColor(30, 30, 30);
      }
      let x = ML;
      cols.forEach((col, i) => {
        const lines = doc.splitTextToSize(String(col || ""), widths[i] - 2);
        doc.text(lines[0], x + 1, y); x += widths[i];
      });
      doc.setDrawColor(220, 220, 220); doc.setLineWidth(0.2);
      doc.line(ML, y + 2, ML + PW, y + 2); y += 7;
      doc.setFont("helvetica", "normal"); doc.setFontSize(10);
      doc.setTextColor(30, 30, 30);
    };

    // Cover
    doc.setFillColor(30, 58, 138);
    doc.rect(0, 0, 210, 32, "F");
    doc.setFont("helvetica", "bold"); doc.setFontSize(20);
    doc.setTextColor(255, 255, 255);
    doc.text("AI Project Manager Report", ML, 16);
    doc.setFontSize(11); doc.setFont("helvetica", "normal");
    doc.text("Project: " + name, ML, 24);
    doc.text("Generated: " + new Date().toLocaleString(), ML, 30);
    y = 42; doc.setTextColor(30, 30, 30);

    // Overview
    h1("Project Overview");
    body(d.project_overview || "N/A"); y += 3;
    if ((d.required_skills || []).length) {
      h2("Required Skills");
      body((d.required_skills || []).join("  |  ")); y += 3;
    }

    // Duration & Team
    const dur = d.estimated_duration || {};
    const tsz = d.team_size || {};
    h1("Duration & Team");
    lv("Total Duration", (dur.total_days||"N/A") + " days  (" + (dur.total_weeks||"N/A") + " weeks)");
    if (dur.summary) body(dur.summary);
    lv("Team Size", (tsz.total||"N/A") + " members");
    if (tsz.breakdown) body(tsz.breakdown);
    y += 3;

    // Team Composition
    if ((d.team_composition || []).length) {
      h1("Team Composition");
      tr(["Role", "Count", "Skills", "Responsibility"], [55, 18, 60, 57], true);
      d.team_composition.forEach(r => {
        const skills = Array.isArray(r.skills_required)
          ? r.skills_required.join(", ") : (r.skills_required || "");
        tr([r.role, String(r.count || 1), skills, r.responsibility || ""], [55, 18, 60, 57]);
      });
      y += 3;
    }

    // Team Assignment
    if ((d.team_assignment || []).length) {
      h1("Team Assignment");
      tr(["Role", "Count", "Employee", "Reason"], [45, 18, 55, 72], true);
      d.team_assignment.forEach(r => {
        tr([r.role, String(r.count || 1), r.employee || "N/A", r.reason || ""], [45, 18, 55, 72]);
      });
      y += 3;
    }

    // Tech Stack
    if ((d.tech_stack || []).length) {
      h1("Tech Stack");
      tr(["Technology", "Category", "Purpose", "Version"], [48, 35, 80, 27], true);
      d.tech_stack.forEach(r => {
        tr([r.technology, r.category, r.purpose, r.version || ""], [48, 35, 80, 27]);
      });
      y += 3;
    }

    // Timeline
    if ((dur.per_phase || []).length) {
      h1("Timeline Breakdown");
      tr(["Phase", "Days", "% of Total"], [100, 25, 65], true);
      dur.per_phase.forEach(p => {
        const pct = Math.round((p.days / (dur.total_days || 1)) * 100);
        tr([p.phase, String(p.days), pct + "%"], [100, 25, 65]);
      });
      y += 3;
    }

    // Tools
    if ((d.recommended_tools || []).length) {
      h1("Recommended Tools");
      tr(["Tool", "Reason"], [55, 135], true);
      d.recommended_tools.forEach(r => tr([r.tool, r.reason], [55, 135]));
      y += 3;
    }

    // Execution Plan
    if ((d.execution_plan || []).length) {
      h1("Execution Plan");
      d.execution_plan.forEach(r => {
        h2(r.phase + " (" + r.estimated_days + " days)");
        (r.tasks || []).forEach(t => body("- " + t, 4));
        y += 2;
      });
    }

    // Risk Analysis
    if ((d.risk_analysis || []).length) {
      h1("Risk Analysis");
      tr(["Risk", "Mitigation"], [80, 110], true);
      d.risk_analysis.forEach(r => {
        const risk = typeof r === "object" ? r.risk : r;
        const mit  = typeof r === "object" ? r.mitigation : "N/A";
        tr([risk, mit], [80, 110]);
      });
    }

    // Footer on every page
    const totalPages = doc.internal.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFont("helvetica", "normal"); doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text("AI Project Manager  |  " + name + "  |  Page " + i + " of " + totalPages, ML, 292);
    }

    const filename = (name || "project").replace(/[^a-z0-9]/gi, "_") + "_plan_" + new Date().toISOString().slice(0,10) + ".pdf";
    doc.save(filename);
    showAlert("PDF downloaded!", "success");

  } catch(e) {
    console.error("PDF error:", e);
    showAlert("PDF generation failed: " + e.message, "error");
  } finally {
    btn.innerHTML = "<span>&#x2B07;&#xFE0F;</span> Download PDF";
    btn.disabled = false;
  }
}

// ──────────────────────────────────────────────
// EXPORT: Execute Tasks (Copy + Open Dashboard)
// ──────────────────────────────────────────────

function executeTasks() {
  if (!latestData) { showAlert("Run an analysis first.", "error"); return; }

  // Build text and copy synchronously using textarea (guaranteed before window.open)
  const txt = buildPlainText(latestData, latestProjectName);
  const ta = document.createElement("textarea");
  ta.value = txt;
  ta.style.cssText = "position:fixed;top:-9999px;left:-9999px;opacity:0";
  document.body.appendChild(ta);
  ta.select();
  try { document.execCommand("copy"); } catch(e) {}
  document.body.removeChild(ta);

  // Also try async clipboard API as backup
  navigator.clipboard.writeText(txt).catch(() => {});

  showAlert("Plan copied! Opening Task Execution Dashboard — paste your plan into the task box.", "success");

  const win = window.open("https://hackathon-for-ai-agent.onrender.com/dashboard", "_blank");
  if (!win) {
    showAlert("Popup blocked! Allow popups and try again. Plan is already copied to clipboard.", "error");
  }
}
