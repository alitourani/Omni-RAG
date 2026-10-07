// OmniRAG GitHub Pages Client Application
// Connects to Python FastAPI backend with fallback offline demo mode

// State
const state = {
  backendUrl: localStorage.getItem('omnirag_backend_url') || 'http://localhost:8000',
  isBackendConnected: false,
  activeSource: 'sample', // 'sample' or 'upload'
  activeSampleKey: 'financial',
  activeUploadedId: null,
  activePage: 1,
  selectedModel: 'gemini',
  uploadedFiles: [], // list of { id, name, type, url, totalPages, data }
};

// Built-in Realistic Sample Documents with Scanned Tabular Data
const SAMPLES = {
  financial: {
    name: 'TechCorp_Q3_Earnings_Report.pdf',
    title: 'TechCorp Q3 2024 Financial Operations & Segment Breakdown',
    totalPages: 2,
    tableBox: { top: 22, left: 5, width: 90, height: 48 }, // % bounds on page 1
    tables: [
      {
        title: 'Table 2: Consolidated Statements of Operations (in Millions USD)',
        markdown: `| Segment / Metric | Q3 2024 | Q3 2023 | YoY Change | Operating Margin |
                | :--- | :--- | :--- | :--- | :--- |
                | Cloud & AI Infrastructure | $4,820 | $3,410 | +41.3% | 34.2% |
                | Enterprise Software | $3,150 | $2,980 | +5.7% | 28.6% |
                | Consumer Devices | $1,940 | $2,120 | -8.5% | 14.1% |
                | Professional Services | $690 | $610 | +13.1% | 11.4% |
                | **Total Net Revenues** | **$10,600** | **$9,120** | **+16.2%** | **27.8%** |
                | Research & Development | $1,840 | $1,520 | +21.1% | - |
                | Sales & Marketing | $1,310 | $1,290 | +1.5% | - |
                | **Operating Income** | **$2,946** | **$2,310** | **+27.5%** | **27.8%** |`
      }
    ],
    generateSvg: (page) => {
      if (page === 1) {
        return `<svg viewBox="0 0 800 1000" xmlns="http://www.w3.org/2000/svg" style="background:#090d16; font-family:sans-serif;">
          <rect x="20" y="20" width="760" height="960" rx="8" fill="#0f172a" stroke="#1e293b" stroke-width="2"/>
          <text x="50" y="70" fill="#38bdf8" font-size="22" font-weight="bold">TECHCORP SYSTEMS INC.</text>
          <text x="50" y="98" fill="#94a3b8" font-size="14">FORM 10-Q • CONDENSED CONSOLIDATED STATEMENTS OF OPERATIONS</text>
          <line x1="50" y1="115" x2="750" y2="115" stroke="#334155" stroke-width="1.5"/>

          <text x="50" y="150" fill="#f8fafc" font-size="14" font-weight="600">Table 2: Revenue and Operating Income by Business Segment (Unaudited)</text>
          <text x="50" y="170" fill="#64748b" font-size="11">(Amounts in millions, except percentage and per share data)</text>

          <!-- Table Header -->
          <rect x="50" y="190" width="700" height="32" fill="#1e293b" rx="4"/>
          <text x="65" y="212" fill="#94a3b8" font-size="12" font-weight="bold">Segment / Metric</text>
          <text x="320" y="212" fill="#94a3b8" font-size="12" font-weight="bold">Q3 2024</text>
          <text x="430" y="212" fill="#94a3b8" font-size="12" font-weight="bold">Q3 2023</text>
          <text x="535" y="212" fill="#94a3b8" font-size="12" font-weight="bold">YoY Change</text>
          <text x="650" y="212" fill="#94a3b8" font-size="12" font-weight="bold">Margin %</text>

          <!-- Rows -->
          <line x1="50" y1="260" x2="750" y2="260" stroke="#1e293b"/>
          <text x="65" y="248" fill="#f1f5f9" font-size="12">Cloud &amp; AI Infrastructure</text>
          <text x="320" y="248" fill="#38bdf8" font-size="12" font-weight="bold">$4,820</text>
          <text x="430" y="248" fill="#cbd5e1" font-size="12">$3,410</text>
          <text x="535" y="248" fill="#34d399" font-size="12" font-weight="bold">+41.3%</text>
          <text x="650" y="248" fill="#f1f5f9" font-size="12">34.2%</text>

          <line x1="50" y1="300" x2="750" y2="300" stroke="#1e293b"/>
          <text x="65" y="288" fill="#f1f5f9" font-size="12">Enterprise Software</text>
          <text x="320" y="288" fill="#f1f5f9" font-size="12">$3,150</text>
          <text x="430" y="288" fill="#cbd5e1" font-size="12">$2,980</text>
          <text x="535" y="288" fill="#34d399" font-size="12">+5.7%</text>
          <text x="650" y="288" fill="#f1f5f9" font-size="12">28.6%</text>

          <line x1="50" y1="340" x2="750" y2="340" stroke="#1e293b"/>
          <text x="65" y="328" fill="#f1f5f9" font-size="12">Consumer Devices</text>
          <text x="320" y="328" fill="#f1f5f9" font-size="12">$1,940</text>
          <text x="430" y="328" fill="#cbd5e1" font-size="12">$2,120</text>
          <text x="535" y="328" fill="#f87171" font-size="12">-8.5%</text>
          <text x="650" y="328" fill="#f1f5f9" font-size="12">14.1%</text>

          <line x1="50" y1="380" x2="750" y2="380" stroke="#1e293b"/>
          <text x="65" y="368" fill="#f1f5f9" font-size="12">Professional Services</text>
          <text x="320" y="368" fill="#f1f5f9" font-size="12">$690</text>
          <text x="430" y="368" fill="#cbd5e1" font-size="12">$610</text>
          <text x="535" y="368" fill="#34d399" font-size="12">+13.1%</text>
          <text x="650" y="368" fill="#f1f5f9" font-size="12">11.4%</text>

          <rect x="50" y="390" width="700" height="35" fill="rgba(6,182,212,0.12)" stroke="#06b6d4" stroke-width="1.5" rx="4"/>
          <text x="65" y="413" fill="#38bdf8" font-size="13" font-weight="bold">Total Net Revenues</text>
          <text x="320" y="413" fill="#38bdf8" font-size="13" font-weight="bold">$10,600</text>
          <text x="430" y="413" fill="#cbd5e1" font-size="13" font-weight="bold">$9,120</text>
          <text x="535" y="413" fill="#34d399" font-size="13" font-weight="bold">+16.2%</text>
          <text x="650" y="413" fill="#38bdf8" font-size="13" font-weight="bold">27.8%</text>

          <!-- Operating expenses -->
          <text x="65" y="460" fill="#94a3b8" font-size="12">Research &amp; Development</text>
          <text x="320" y="460" fill="#cbd5e1" font-size="12">$1,840</text>
          <text x="430" y="460" fill="#cbd5e1" font-size="12">$1,520</text>
          <text x="535" y="460" fill="#f1f5f9" font-size="12">+21.1%</text>

          <text x="65" y="495" fill="#94a3b8" font-size="12">Sales &amp; Marketing</text>
          <text x="320" y="495" fill="#cbd5e1" font-size="12">$1,310</text>
          <text x="430" y="495" fill="#cbd5e1" font-size="12">$1,290</text>
          <text x="535" y="495" fill="#f1f5f9" font-size="12">+1.5%</text>

          <rect x="50" y="520" width="700" height="35" fill="#1e293b" rx="4"/>
          <text x="65" y="543" fill="#f8fafc" font-size="13" font-weight="bold">Operating Income</text>
          <text x="320" y="543" fill="#38bdf8" font-size="13" font-weight="bold">$2,946</text>
          <text x="430" y="543" fill="#cbd5e1" font-size="13">$2,310</text>
          <text x="535" y="543" fill="#34d399" font-size="13" font-weight="bold">+27.5%</text>
          <text x="650" y="543" fill="#f1f5f9" font-size="13">27.8%</text>

          <!-- Notes -->
          <text x="50" y="600" fill="#64748b" font-size="11">Note (1): Cloud segment includes accelerated computing clusters, foundation model hosting, and edge inference.</text>
          <text x="50" y="620" fill="#64748b" font-size="11">Note (2): Consumer Devices experienced component supply constraints in foreign markets.</text>
          
          <text x="380" y="950" fill="#475569" font-size="12">- Page 1 of 2 -</text>
        </svg>`;
      } else {
        return `<svg viewBox="0 0 800 1000" xmlns="http://www.w3.org/2000/svg" style="background:#090d16; font-family:sans-serif;">
          <rect x="20" y="20" width="760" height="960" rx="8" fill="#0f172a" stroke="#1e293b" stroke-width="2"/>
          <text x="50" y="70" fill="#38bdf8" font-size="18" font-weight="bold">TECHCORP SYSTEMS INC. • LIQUIDITY &amp; CAPITAL RESOURCES</text>
          <line x1="50" y1="90" x2="750" y2="90" stroke="#334155" stroke-width="1.5"/>

          <text x="50" y="130" fill="#f8fafc" font-size="14" font-weight="600">Table 3: Cash, Cash Equivalents &amp; Marketable Securities</text>
          <rect x="50" y="150" width="700" height="30" fill="#1e293b" rx="4"/>
          <text x="65" y="170" fill="#94a3b8" font-size="12" font-weight="bold">Balance Sheet Item</text>
          <text x="450" y="170" fill="#94a3b8" font-size="12" font-weight="bold">Sept 30, 2024</text>
          <text x="600" y="170" fill="#94a3b8" font-size="12" font-weight="bold">Dec 31, 2023</text>

          <text x="65" y="210" fill="#f1f5f9" font-size="12">Cash and cash equivalents</text>
          <text x="450" y="210" fill="#38bdf8" font-size="12">$14,210M</text>
          <text x="600" y="210" fill="#cbd5e1" font-size="12">$11,890M</text>

          <text x="65" y="245" fill="#f1f5f9" font-size="12">Short-term marketable securities</text>
          <text x="450" y="245" fill="#38bdf8" font-size="12">$28,450M</text>
          <text x="600" y="245" fill="#cbd5e1" font-size="12">$24,110M</text>

          <text x="380" y="950" fill="#475569" font-size="12">- Page 2 of 2 -</text>
        </svg>`;
      }
    }
  },

  energy: {
    name: 'Global_Energy_LCOE_Benchmark_2024.pdf',
    title: 'Global Clean Energy Generation & Levelized Cost Comparison (LCOE)',
    totalPages: 1,
    tableBox: { top: 18, left: 5, width: 90, height: 55 },
    tables: [
      {
        title: 'Table 1: Benchmark Levelized Cost of Energy (LCOE) per MWh',
        markdown: `| Technology Type | 2020 LCOE ($/MWh) | 2024 LCOE ($/MWh) | 4-Year Reduction | Capacity Factor |
                | :--- | :--- | :--- | :--- | :--- |
                | Utility-Scale Solar PV | $42.50 | $28.10 | -33.9% | 27.4% |
                | Onshore Wind Turbine | $46.80 | $34.20 | -26.9% | 38.6% |
                | Offshore Wind Array | $89.20 | $61.50 | -31.1% | 49.2% |
                | Battery Storage (4-hr) | $145.00 | $82.40 | -43.2% | 88.0% |
                | Combined Cycle Gas | $58.10 | $64.80 | +11.5% | 61.2% |`
      }
    ],
    generateSvg: () => {
      return `<svg viewBox="0 0 800 1000" xmlns="http://www.w3.org/2000/svg" style="background:#090d16; font-family:sans-serif;">
        <rect x="20" y="20" width="760" height="960" rx="8" fill="#0f172a" stroke="#1e293b" stroke-width="2"/>
        <text x="50" y="70" fill="#10b981" font-size="22" font-weight="bold">GLOBAL ENERGY TRANSITION COMMISSION</text>
        <text x="50" y="98" fill="#94a3b8" font-size="14">RESEARCH REPORT: LEVELIZED COST OF ELECTRICITY (LCOE) BENCHMARK</text>
        <line x1="50" y1="115" x2="750" y2="115" stroke="#334155" stroke-width="1.5"/>

        <text x="50" y="155" fill="#f8fafc" font-size="14" font-weight="600">Table 1: Generation Cost per Megawatt-Hour (Unsubsidized Global Averages)</text>

        <!-- Table -->
        <rect x="50" y="180" width="700" height="32" fill="#1e293b" rx="4"/>
        <text x="65" y="202" fill="#94a3b8" font-size="12" font-weight="bold">Technology Type</text>
        <text x="280" y="202" fill="#94a3b8" font-size="12" font-weight="bold">2020 LCOE</text>
        <text x="400" y="202" fill="#94a3b8" font-size="12" font-weight="bold">2024 LCOE</text>
        <text x="520" y="202" fill="#94a3b8" font-size="12" font-weight="bold">4-Yr Change</text>
        <text x="640" y="202" fill="#94a3b8" font-size="12" font-weight="bold">Capacity Factor</text>

        <text x="65" y="240" fill="#f1f5f9" font-size="12">Utility-Scale Solar PV</text>
        <text x="280" y="240" fill="#cbd5e1" font-size="12">$42.50/MWh</text>
        <text x="400" y="240" fill="#10b981" font-size="12" font-weight="bold">$28.10/MWh</text>
        <text x="520" y="240" fill="#34d399" font-size="12" font-weight="bold">-33.9%</text>
        <text x="640" y="240" fill="#f1f5f9" font-size="12">27.4%</text>

        <line x1="50" y1="260" x2="750" y2="260" stroke="#1e293b"/>
        <text x="65" y="285" fill="#f1f5f9" font-size="12">Onshore Wind Turbine</text>
        <text x="280" y="285" fill="#cbd5e1" font-size="12">$46.80/MWh</text>
        <text x="400" y="285" fill="#10b981" font-size="12" font-weight="bold">$34.20/MWh</text>
        <text x="520" y="285" fill="#34d399" font-size="12">-26.9%</text>
        <text x="640" y="285" fill="#f1f5f9" font-size="12">38.6%</text>

        <line x1="50" y1="305" x2="750" y2="305" stroke="#1e293b"/>
        <text x="65" y="330" fill="#f1f5f9" font-size="12">Offshore Wind Array</text>
        <text x="280" y="330" fill="#cbd5e1" font-size="12">$89.20/MWh</text>
        <text x="400" y="330" fill="#10b981" font-size="12">$61.50/MWh</text>
        <text x="520" y="330" fill="#34d399" font-size="12">-31.1%</text>
        <text x="640" y="330" fill="#f1f5f9" font-size="12">49.2%</text>

        <line x1="50" y1="350" x2="750" y2="350" stroke="#1e293b"/>
        <text x="65" y="375" fill="#f1f5f9" font-size="12">Battery Storage (4-hr)</text>
        <text x="280" y="375" fill="#cbd5e1" font-size="12">$145.00/MWh</text>
        <text x="400" y="375" fill="#38bdf8" font-size="12" font-weight="bold">$82.40/MWh</text>
        <text x="520" y="375" fill="#34d399" font-size="12" font-weight="bold">-43.2%</text>
        <text x="640" y="375" fill="#f1f5f9" font-size="12">88.0%</text>

        <line x1="50" y1="395" x2="750" y2="395" stroke="#1e293b"/>
        <text x="65" y="420" fill="#f1f5f9" font-size="12">Combined Cycle Gas</text>
        <text x="280" y="420" fill="#cbd5e1" font-size="12">$58.10/MWh</text>
        <text x="400" y="420" fill="#f87171" font-size="12">$64.80/MWh</text>
        <text x="520" y="420" fill="#f87171" font-size="12">+11.5%</text>
        <text x="640" y="420" fill="#f1f5f9" font-size="12">61.2%</text>

        <text x="380" y="950" fill="#475569" font-size="12">- Page 1 of 1 -</text>
      </svg>`;
    }
  }
};

// DOM Elements
const backendStatusText = document.getElementById('backendStatusText');
const backendStatusEl = document.getElementById('backendStatus');
const statusDot = backendStatusEl.querySelector('.status-dot');
const settingsPanel = document.getElementById('settingsPanel');
const backendUrlInput = document.getElementById('backendUrlInput');
const testConnectionBtn = document.getElementById('testConnectionBtn');
const saveSettingsBtn = document.getElementById('saveSettingsBtn');
const testResult = document.getElementById('testResult');

const activeDocImg = document.getElementById('activeDocImg');
const docBadge = document.getElementById('docBadge');
const docName = document.getElementById('docName');
const prevPageBtn = document.getElementById('prevPageBtn');
const nextPageBtn = document.getElementById('nextPageBtn');
const pageIndicator = document.getElementById('pageIndicator');
const tableOverlayBox = document.getElementById('tableOverlayBox');
const sampleChips = document.querySelectorAll('.sample-chip');

const queryForm = document.getElementById('queryForm');
const queryInput = document.getElementById('queryInput');
const submitQueryBtn = document.getElementById('submitQueryBtn');
const quickButtons = document.querySelectorAll('.quick-btn');

const welcomePlaceholder = document.getElementById('welcomePlaceholder');
const loadingState = document.getElementById('loadingState');
const loadingText = document.getElementById('loadingText');
const insightCard = document.getElementById('insightCard');
const resultModelBadge = document.getElementById('resultModelBadge');
const resultLatency = document.getElementById('resultLatency');
const resultCitation = document.getElementById('resultCitation');
const copyResultBtn = document.getElementById('copyResultBtn');
const answerBody = document.getElementById('answerBody');
const extractedTableArea = document.getElementById('extractedTableArea');
const exportCsvBtn = document.getElementById('exportCsvBtn');
const fileInput = document.getElementById('fileInput');
const docCountEl = document.getElementById('docCount');
const uploadedFilesSection = document.getElementById('uploadedFilesSection');
const uploadedChipsContainer = document.getElementById('uploadedChipsContainer');
const sampleChipsContainer = document.getElementById('sampleChipsContainer');

// Init
function init() {
  backendUrlInput.value = state.backendUrl;
  checkBackendHealth();
  updateDocCounter();
  renderSampleDocument(state.activeSampleKey, 1);
  setupEvents();
}

function updateDocCounter() {
  const total = Object.keys(SAMPLES).length + state.uploadedFiles.length;
  if (docCountEl) {
    docCountEl.textContent = `${total} available`;
  }
}

// Check Backend Health
async function checkBackendHealth() {
  backendStatusText.textContent = 'Testing backend...';
  try {
    const res = await fetch(`${state.backendUrl}/api/health`, { method: 'GET', signal: AbortSignal.timeout(3000) });
    if (res.ok) {
      const data = await res.json();
      state.isBackendConnected = true;
      statusDot.classList.add('online');
      backendStatusText.textContent = 'Python Backend Live';
      return true;
    }
  } catch (err) {
    // Backend is offline or not deployed yet
    state.isBackendConnected = false;
    statusDot.classList.remove('online');
    backendStatusText.textContent = 'Demo Mode (Offline)';
    return false;
  }
}

// Render Document Preview (Sample)
function renderSampleDocument(key, pageNum = 1) {
  const sample = SAMPLES[key];
  if (!sample) return;

  state.activeSource = 'sample';
  state.activeSampleKey = key;
  state.activeUploadedId = null;
  state.activePage = pageNum;

  // Update active chips UI
  document.querySelectorAll('.sample-chip').forEach(c => c.classList.remove('active'));
  const activeBtn = document.querySelector(`.sample-chip[data-sample="${key}"]`);
  if (activeBtn) activeBtn.classList.add('active');

  docName.textContent = sample.name;
  docBadge.textContent = 'Built-in Sample';
  pageIndicator.textContent = `Page ${pageNum} of ${sample.totalPages}`;

  // Generate SVG Preview
  const svgXml = sample.generateSvg(pageNum);
  const blob = new Blob([svgXml], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  activeDocImg.src = url;

  // Highlight table box
  if (sample.tableBox && pageNum === 1) {
    tableOverlayBox.style.display = 'block';
    tableOverlayBox.style.top = `${sample.tableBox.top}%`;
    tableOverlayBox.style.left = `${sample.tableBox.left}%`;
    tableOverlayBox.style.width = `${sample.tableBox.width}%`;
    tableOverlayBox.style.height = `${sample.tableBox.height}%`;
  } else {
    tableOverlayBox.style.display = 'none';
  }

  // Pre and Next page buttons
  prevPageBtn.disabled = pageNum <= 1;
  nextPageBtn.disabled = pageNum >= sample.totalPages;
}

// Render Uploaded Document / Photo Preview
function renderUploadedDocument(uploadId, pageNum = 1) {
  const item = state.uploadedFiles.find(f => f.id === uploadId);
  if (!item) return;

  state.activeSource = 'upload';
  state.activeUploadedId = uploadId;
  state.activePage = pageNum;

  // Update active chips UI
  document.querySelectorAll('.sample-chip').forEach(c => c.classList.remove('active'));
  const activeBtn = document.querySelector(`.sample-chip[data-upload-id="${uploadId}"]`);
  if (activeBtn) activeBtn.classList.add('active');

  docName.textContent = item.name;
  docBadge.textContent = item.isPhoto ? 'Uploaded Photo' : 'Uploaded File';
  pageIndicator.textContent = `Page ${pageNum} of ${item.totalPages || 1}`;

  activeDocImg.src = item.url;
  tableOverlayBox.style.display = 'none';

  // For photos and single-page uploads, prev and next buttons are strictly disabled
  prevPageBtn.disabled = pageNum <= 1;
  nextPageBtn.disabled = pageNum >= (item.totalPages || 1);
}

// Refresh the list of Uploaded File Chips
function renderUploadedChips() {
  if (!uploadedChipsContainer || !uploadedFilesSection) return;

  if (state.uploadedFiles.length === 0) {
    uploadedFilesSection.classList.add('hidden');
    uploadedChipsContainer.innerHTML = '';
    return;
  }

  uploadedFilesSection.classList.remove('hidden');
  uploadedChipsContainer.innerHTML = '';

  state.uploadedFiles.forEach(file => {
    const btn = document.createElement('button');
    btn.className = `sample-chip ${state.activeSource === 'upload' && state.activeUploadedId === file.id ? 'active' : ''}`;
    btn.setAttribute('data-upload-id', file.id);

    const icon = file.isPhoto ? '🖼️' : '📄';
    btn.innerHTML = `${icon} <strong>${escapeHtml(file.name)}</strong> <span style="font-size:0.75rem;opacity:0.75;margin-left:4px;">(${file.isPhoto ? 'Photo' : '1 Page'})</span>`;

    btn.addEventListener('click', () => {
      renderUploadedDocument(file.id, 1);
    });

    uploadedChipsContainer.appendChild(btn);
  });

  updateDocCounter();
}

function escapeHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// Parse markdown table to HTML table
function markdownToHtmlTable(markdown) {
  const lines = markdown.trim().split('\n').filter(l => l.includes('|'));
  if (lines.length < 2) return '';

  let html = '<table><thead><tr>';
  
  // Headers
  const headerCells = lines[0].split('|').map(c => c.trim()).filter((c, i, arr) => i > 0 && i < arr.length - 1);
  headerCells.forEach(cell => {
    html += `<th>${cell.replace(/\*\*/g, '')}</th>`;
  });
  html += '</tr></thead><tbody>';

  // Body rows (skip separator row at index 1)
  for (let i = 2; i < lines.length; i++) {
    const cells = lines[i].split('|').map(c => c.trim()).filter((c, idx, arr) => idx > 0 && idx < arr.length - 1);
    html += '<tr>';
    cells.forEach(cell => {
      let isBold = cell.startsWith('**') && cell.endsWith('**');
      let text = cell.replace(/\*\*/g, '');
      let style = isBold ? 'font-weight: 700; color: #38bdf8;' : '';
      html += `<td style="${style}">${text}</td>`;
    });
    html += '</tr>';
  }

  html += '</tbody></table>';
  return html;
}

// Convert table to CSV
function exportCurrentTableToCsv() {
  const table = extractedTableArea.querySelector('table');
  if (!table) return;

  const rows = Array.from(table.querySelectorAll('tr'));
  const csvContent = rows.map(r => {
    const cols = Array.from(r.querySelectorAll('th, td'));
    return cols.map(c => `"${c.textContent.replace(/"/g, '""')}"`).join(',');
  }).join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `omnirag_extracted_table_${Date.now()}.csv`;
  a.click();
}

// Run Query
async function executeQuery(queryText) {
  if (!queryText.trim()) return;

  const model = document.querySelector('input[name="model"]:checked').value;
  state.selectedModel = model;

  // Show loading
  welcomePlaceholder.classList.add('hidden');
  insightCard.classList.add('hidden');
  loadingState.classList.remove('hidden');
  loadingText.textContent = `Analyzing visual page & tabular chunks with [${model === 'gemini' ? 'Gemini 3.8 Flash' : 'Llama 3.2 Vision'}]...`;

  const startTime = performance.now();

  try {
    let result;

    const currentDocName = state.activeSource === 'upload'
      ? (state.uploadedFiles.find(f => f.id === state.activeUploadedId)?.name || 'Uploaded Document')
      : (SAMPLES[state.activeSampleKey]?.name || 'Sample Document');

    if (state.isBackendConnected) {
      // Real API Call to Python Backend
      const res = await fetch(`${state.backendUrl}/api/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: queryText,
          model: model,
          document_name: currentDocName
        })
      });

      if (!res.ok) throw new Error(`Server returned ${res.status}`);
      result = await res.json();
    } else {
      // Intelligent Simulation for Demo on GitHub Pages
      await new Promise(r => setTimeout(r, 650));
      result = generateSimulatedInsight(queryText, state.activeSampleKey, model);
    }

    const elapsed = Math.round(performance.now() - startTime);

    // Render result
    loadingState.classList.add('hidden');
    insightCard.classList.remove('hidden');

    resultModelBadge.textContent = model === 'gemini' ? '✨ Gemini 3.8 Flash' : '🦙 Llama 3.2 Vision';
    resultLatency.textContent = `${result.latency_ms || elapsed} ms`;
    resultCitation.textContent = (result.citations && result.citations[0]) ? `Page ${result.citations[0].page || 1}, Table 1` : 'Page 1, Visual Table Match';

    answerBody.textContent = result.answer;

    if (result.tables && result.tables.length > 0) {
      extractedTableArea.innerHTML = markdownToHtmlTable(result.tables[0].markdown);
      document.getElementById('tableContainerWrap').style.display = 'block';
    } else {
      document.getElementById('tableContainerWrap').style.display = 'none';
    }

  } catch (err) {
    loadingState.classList.add('hidden');
    welcomePlaceholder.classList.remove('hidden');
    alert(`Query error: ${err.message}. Check backend configuration.`);
  }
}

// Intelligent Simulation for GitHub Pages preview
function generateSimulatedInsight(query, sampleKey, model) {
  const sample = SAMPLES[sampleKey];
  const qLower = query.toLowerCase();

  if (sampleKey === 'financial') {
    return {
      answer: `### Key Financial Insights Extracted from Table 2 [Page 1]:\n\n` +
        `• **Revenue Growth Driver**: The **Cloud & AI Infrastructure** division is the highest-growth segment, surging **+41.3% YoY** to **$4,820M** (up from $3,410M in Q3 2023), also delivering the highest operating margin at **34.2%**.\n` +
        `• **Segment Headwinds**: **Consumer Devices** contracted **-8.5% YoY** to **$1,940M**, with compressed margins of **14.1%**, attributed in Note 2 to foreign supply constraints.\n` +
        `• **Total Performance**: Total Net Revenues expanded **+16.2%** to **$10,600M**, while Operating Income outperformed revenue growth with a **+27.5% increase** to **$2,946M** due to disciplined SG&A expense control.`,
      tables: sample.tables,
      citations: [{ page: 1, score: 3.82 }],
      latency_ms: model === 'gemini' ? 385 : 510
    };
  } else {
    return {
      answer: `### Renewable Energy LCOE Cost Analysis [Page 1, Table 1]:\n\n` +
        `• **Steepest Cost Reduction**: **Battery Storage (4-hr)** exhibited the most dramatic cost plunge between 2020 and 2024, falling **-43.2%** from **$145.00/MWh** down to **$82.40/MWh**.\n` +
        `• **Lowest Overall Cost**: **Utility-Scale Solar PV** remains the cheapest bulk electricity generation technology at **$28.10/MWh** (-33.9% 4-year decline).\n` +
        `• **Fossil Comparison**: Unlike renewables, **Combined Cycle Gas** increased in cost by **+11.5%** to **$64.80/MWh**, largely driven by variable fuel price inputs.`,
      tables: sample.tables,
      citations: [{ page: 1, score: 4.12 }],
      latency_ms: model === 'gemini' ? 340 : 490
    };
  }
}

// Event Listeners
function setupEvents() {
  // Test connection
  testConnectionBtn.addEventListener('click', async () => {
    testResult.textContent = 'Testing connection...';
    testResult.style.color = '#94a3b8';
    try {
      const url = backendUrlInput.value.replace(/\/$/, '');
      const res = await fetch(`${url}/api/health`, { signal: AbortSignal.timeout(4000) });
      if (res.ok) {
        testResult.textContent = '✅ Connected successfully to the Python FastAPI backend!';
        testResult.style.color = '#34d399';
      } else {
        testResult.textContent = `⚠️ Backend reachable but responded with status: ${res.status}`;
        testResult.style.color = '#f59e0b';
      }
    } catch (e) {
      testResult.textContent = `❌ Could not connect: ${e.message}. Ensure backend is running.`;
      testResult.style.color = '#f87171';
    }
  });

  // Save settings
  saveSettingsBtn.addEventListener('click', () => {
    state.backendUrl = backendUrlInput.value.replace(/\/$/, '');
    localStorage.setItem('omnirag_backend_url', state.backendUrl);
    checkBackendHealth();
  });

  // Sample Chips
  sampleChips.forEach(chip => {
    chip.addEventListener('click', () => {
      sampleChips.forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      const key = chip.getAttribute('data-sample');
      renderSampleDocument(key, 1);
    });
  });

  // Pagination (Works for multi-page samples or multi-page documents; disabled for 1-page photos)
  prevPageBtn.addEventListener('click', () => {
    if (state.activeSource === 'sample') {
      if (state.activePage > 1) {
        renderSampleDocument(state.activeSampleKey, state.activePage - 1);
      }
    } else if (state.activeSource === 'upload') {
      const item = state.uploadedFiles.find(f => f.id === state.activeUploadedId);
      if (item && state.activePage > 1) {
        renderUploadedDocument(item.id, state.activePage - 1);
      }
    }
  });

  nextPageBtn.addEventListener('click', () => {
    if (state.activeSource === 'sample') {
      const sample = SAMPLES[state.activeSampleKey];
      if (sample && state.activePage < sample.totalPages) {
        renderSampleDocument(state.activeSampleKey, state.activePage + 1);
      }
    } else if (state.activeSource === 'upload') {
      const item = state.uploadedFiles.find(f => f.id === state.activeUploadedId);
      if (item && state.activePage < (item.totalPages || 1)) {
        renderUploadedDocument(item.id, state.activePage + 1);
      }
    }
  });

  // Query Submit
  queryForm.addEventListener('submit', (e) => {
    e.preventDefault();
    executeQuery(queryInput.value);
  });

  // Quick buttons
  quickButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const q = btn.getAttribute('data-query');
      queryInput.value = q;
      executeQuery(q);
    });
  });

  // Copy Result
  copyResultBtn.addEventListener('click', () => {
    navigator.clipboard.writeText(answerBody.textContent);
    copyResultBtn.textContent = '✓ Copied!';
    setTimeout(() => { copyResultBtn.textContent = '📋 Copy'; }, 2000);
  });

  // Export CSV
  exportCsvBtn.addEventListener('click', exportCurrentTableToCsv);

  // File Upload (Photos or PDFs)
  fileInput.addEventListener('change', (e) => {
    const files = Array.from(e.target.files);
    if (!files || files.length === 0) return;

    files.forEach((file) => {
      const isPhoto = file.type.startsWith('image/');
      const fileId = `upload_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

      if (isPhoto) {
        const reader = new FileReader();
        reader.onload = (evt) => {
          const fileRecord = {
            id: fileId,
            name: file.name,
            type: file.type,
            isPhoto: true,
            totalPages: 1, // Single-page photo
            url: evt.target.result,
            data: evt.target.result
          };

          state.uploadedFiles.push(fileRecord);
          renderUploadedChips();
          renderUploadedDocument(fileId, 1);
        };
        reader.readAsDataURL(file);
      } else {
        // PDF or scanned document
        const placeholderSvg = `<svg viewBox="0 0 800 1000" xmlns="http://www.w3.org/2000/svg" style="background:#090d16; font-family:sans-serif;">
          <rect x="20" y="20" width="760" height="960" fill="#0f172a" rx="8" stroke="#1e293b" stroke-width="2"/>
          <text x="400" y="440" fill="#38bdf8" font-size="24" text-anchor="middle" font-weight="bold">PDF Document: ${escapeHtml(file.name)}</text>
          <text x="400" y="480" fill="#94a3b8" font-size="14" text-anchor="middle">Ready for Multimodal Vision &amp; Tabular Extraction</text>
          <line x1="150" y1="520" x2="650" y2="520" stroke="#334155" stroke-width="2"/>
          <text x="400" y="560" fill="#64748b" font-size="12" text-anchor="middle">Ask questions about tables, metrics, or footnotes</text>
        </svg>`;
        const url = `data:image/svg+xml;utf8,${encodeURIComponent(placeholderSvg)}`;

        const fileRecord = {
          id: fileId,
          name: file.name,
          type: file.type,
          isPhoto: false,
          totalPages: 1,
          url: url,
          data: null
        };

        state.uploadedFiles.push(fileRecord);
        renderUploadedChips();
        renderUploadedDocument(fileId, 1);
      }
    });

    // Reset input so re-uploading same file name triggers change
    fileInput.value = '';
  });
}

// Start
init();