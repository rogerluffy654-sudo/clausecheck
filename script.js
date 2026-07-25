const MAX_FREE_SCANS = 3;
const STORAGE_KEY = 'clausecheck_scans';

const inputSection = document.getElementById('input-section');
const resultsSection = document.getElementById('results-section');
const paywallSection = document.getElementById('paywall-section');
const contractInput = document.getElementById('contract-input');
const charCount = document.getElementById('char-count');
const analyzeBtn = document.getElementById('analyze-btn');
const btnText = analyzeBtn.querySelector('.btn-text');
const btnLoader = analyzeBtn.querySelector('.btn-loader');
const riskBadge = document.getElementById('risk-badge');
const riskScore = document.getElementById('risk-score');
const flagsList = document.getElementById('flags-list');
const scanAgainBtn = document.getElementById('scan-again-btn');

let isAnalyzing = false;

function getScanCount() {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return 0;
    try { return JSON.parse(data).count || 0; } catch { return 0; }
}

function incrementScanCount() {
    const count = getScanCount() + 1;
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ count, lastScan: Date.now() }));
    return count;
}

function hasFreeScansLeft() { return getScanCount() < MAX_FREE_SCANS; }

function showAlert(message, type = 'error') {
    const existing = document.querySelector('.alert');
    if (existing) existing.remove();
    const alert = document.createElement('div');
    alert.className = `alert alert-${type}`;
    alert.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg> ${message}`;
    inputSection.insertBefore(alert, inputSection.firstChild);
    setTimeout(() => alert.remove(), 5000);
}

function setLoading(loading) {
    isAnalyzing = loading;
    analyzeBtn.disabled = loading;
    btnText.classList.toggle('hidden', loading);
    btnLoader.classList.toggle('hidden', !loading);
}

function getRiskClass(score) {
    const s = (score || '').toLowerCase();
    if (s.includes('high')) return 'risk-high';
    if (s.includes('medium')) return 'risk-medium';
    return 'risk-low';
}

function renderResults(data) {
    riskBadge.className = 'risk-badge ' + getRiskClass(data.riskScore);
    riskScore.textContent = data.riskScore || 'Low Risk';
    flagsList.innerHTML = '';

    if (!data.flags || data.flags.length === 0) {
        flagsList.innerHTML = `
            <div class="no-flags">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                <h3>No major risks detected</h3>
                <p>We didn't find any clauses that raised significant concerns. Still, always read carefully!</p>
            </div>`;
    } else {
        data.flags.forEach(flag => {
            const card = document.createElement('div');
            card.className = 'flag-card';
            card.innerHTML = `
                <div class="flag-type"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>Flagged Clause</div>
                <div class="flag-clause">${escapeHtml(flag.clause || '')}</div>
                <div class="flag-risk">${escapeHtml(flag.risk || '')}</div>
                <div class="flag-question">${escapeHtml(flag.question || '')}</div>`;
            flagsList.appendChild(card);
        });
    }
    inputSection.classList.add('hidden');
    resultsSection.classList.remove('hidden');
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function resetTool() {
    contractInput.value = '';
    charCount.textContent = '0 / 15,000 characters';
    resultsSection.classList.add('hidden');
    paywallSection.classList.add('hidden');
    inputSection.classList.remove('hidden');
    const alert = document.querySelector('.alert');
    if (alert) alert.remove();
}

contractInput.addEventListener('input', () => {
    const len = contractInput.value.length;
    charCount.textContent = `${len.toLocaleString()} / 15,000 characters`;
    charCount.style.color = len >= 15000 ? 'var(--danger)' : 'var(--text-muted)';
});

analyzeBtn.addEventListener('click', async () => {
    if (isAnalyzing) return;
    if (!hasFreeScansLeft()) {
        inputSection.classList.add('hidden');
        paywallSection.classList.remove('hidden');
        return;
    }
    const text = contractInput.value.trim();
    if (!text) { showAlert('Please paste some contract text to analyze.'); return; }
    if (text.length > 15000) { showAlert('Contract text is too long. Please limit to 15,000 characters.'); return; }

    setLoading(true);
    try {
        const response = await fetch('/api/analyze', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contractText: text })
        });
        if (!response.ok) {
            const errData = await response.json().catch(() => ({}));
            throw new Error(errData.error || `Server error (${response.status})`);
        }
        const data = await response.json();
        incrementScanCount();
        renderResults(data);
        if (getScanCount() >= MAX_FREE_SCANS) {
            const notice = document.createElement('div');
            notice.className = 'alert alert-info';
            notice.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg> That was your last free scan. Upgrade for unlimited access.`;
            resultsSection.insertBefore(notice, resultsSection.firstChild);
        }
    } catch (err) {
        showAlert(err.message || 'Something went wrong. Please try again.');
    } finally {
        setLoading(false);
    }
});

scanAgainBtn.addEventListener('click', () => {
    if (!hasFreeScansLeft()) {
        resultsSection.classList.add('hidden');
        paywallSection.classList.remove('hidden');
        return;
    }
    resetTool();
});

if (!hasFreeScansLeft()) {
    inputSection.classList.add('hidden');
    paywallSection.classList.remove('hidden');
}