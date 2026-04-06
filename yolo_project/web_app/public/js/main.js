const API_URL = 'http://localhost:3000/api';
const token = localStorage.getItem('token');

if (!token) {
    window.location.href = 'index.html';
}

function logout() {
    localStorage.clear();
    window.location.href = 'index.html';
}

// --- GEOLOCATION HELPER ---
let cachedLocation = null;

function getCurrentLocation() {
    return new Promise((resolve) => {
        if (cachedLocation) {
            resolve(cachedLocation);
            return;
        }
        if (!navigator.geolocation) {
            resolve(null);
            return;
        }
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                cachedLocation = {
                    latitude: pos.coords.latitude,
                    longitude: pos.coords.longitude
                };
                resolve(cachedLocation);
            },
            (err) => {
                console.log('Geolocation unavailable:', err.message);
                resolve(null);
            },
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 }
        );
    });
}

function getMapsLink(lat, lng) {
    if (lat && lng) {
        return `https://www.google.com/maps?q=${lat},${lng}`;
    }
    return null;
}

// --- COMPARISON MODAL LOGIC (Shared) ---
let currentOriginal = '';
let currentTagged = '';
let isShowingTagged = false;

function openModal(original, tagged) {
    currentOriginal = original;
    currentTagged = tagged;
    isShowingTagged = false; // Start with raw
    updateSlide();
    document.getElementById('image-modal').style.display = 'block';
}

function logout() {
    localStorage.clear();
    window.location.href = 'index.html';
}

function closeModal() {
    document.getElementById('image-modal').style.display = 'none';
}

// --- UI LOGIC (Dropdowns & Theme) ---

// Window OnClick (Handles Modal Closing)
window.onclick = function (event) {
    // Modal Close Logic
    const modal = document.getElementById('image-modal');
    if (event.target == modal) {
        closeModal();
    }
}

// Theme Logic
const themeToggleBtn = document.getElementById('theme-toggle');

function setTheme(isLight) {
    const sunIcon = document.getElementById('sun-icon');
    const moonIcon = document.getElementById('moon-icon');

    if (isLight) {
        document.body.classList.add('light-mode');
        // Show Moon (to switch back to dark)
        if (sunIcon && moonIcon) {
            sunIcon.style.display = 'none';
            moonIcon.style.display = 'block';
        }
        localStorage.setItem('theme', 'light');
    } else {
        document.body.classList.remove('light-mode');
        // Show Sun (to switch to light)
        if (sunIcon && moonIcon) {
            sunIcon.style.display = 'block';
            moonIcon.style.display = 'none';
        }
        localStorage.setItem('theme', 'dark');
    }

    // Update Charts if they exist
    const newColor = isLight ? '#000000' : '#ffffff';

    if (window.userChartInstance) {
        window.userChartInstance.options.plugins.legend.labels.color = newColor;
        window.userChartInstance.update();
    }
    if (window.adminChartInstance) {
        window.adminChartInstance.options.plugins.legend.labels.color = newColor;
        window.adminChartInstance.update();
    }
}

// Init Theme (Default: Light Mode)
const savedTheme = localStorage.getItem('theme');
setTheme(savedTheme !== 'dark');

if (themeToggleBtn) {
    themeToggleBtn.addEventListener('click', () => {
        const isLight = document.body.classList.contains('light-mode');
        setTheme(!isLight);
    });
}

// Show Admin Button if User is Admin
function checkAdminAccess() {
    const adminBtn = document.getElementById('admin-nav-btn');
    if (adminBtn && localStorage.getItem('isAdmin') === 'true') {
        adminBtn.style.display = 'flex';
    }
}
checkAdminAccess();

// Load User Info for Navbar
async function loadNavInfo() {
    // Only if logged in
    const token = localStorage.getItem('token');
    const userStr = localStorage.getItem('user');
    if (token && userStr) {
        // We might just use local storage for simple name display if available
        // But let's try to fetch if we have an endpoint or just parse JWT
        // Simply use "User" as fallback or parsed locally if we stored it
        // Ideally we would fetch `/api/user/profile` or similar to get name.
        // Let's assume we can fetch profile easily.
        try {
            const res = await fetch(`${API_URL}/user/profile`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                const navName = document.getElementById('nav-username');
                if (navName) navName.innerText = data.user.username;
            }
        } catch (e) { }
    }
}
loadNavInfo();

// --- PROFILE PAGE LOGIC ---
if (window.location.pathname.includes('profile.html')) {
    async function loadProfile() {
        const res = await fetch(`${API_URL}/user/profile`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!res.ok) return; // redirect or show error

        const data = await res.json();

        // Fill Info
        document.getElementById('profile-name').innerText = data.user.username;
        document.getElementById('profile-email').innerText = data.user.email;
        document.getElementById('profile-joined').innerText = `Joined: ${new Date(data.user.createdAt).toLocaleDateString()}`;
        document.getElementById('profile-total').innerText = data.totalUploads;

        // Update Severity Counts
        if (data.severityStats) {
            document.getElementById('count-low').innerText = data.severityStats.Low;
            document.getElementById('count-medium').innerText = data.severityStats.Medium;
            document.getElementById('count-high').innerText = data.severityStats.High;
        }

        // Table

        const tbody = document.getElementById('profile-activity-table');
        tbody.innerHTML = '';
        data.recentActivity.forEach(item => {
            const tr = document.createElement('tr');
            const percentage = (item.confidence * 100).toFixed(0) + '%';
            const itemMapsLink = getMapsLink(item.latitude, item.longitude);

            tr.innerHTML = `
                <td>
                    ${item.label} 
                    <button class="view-btn" style="margin-left:5px">View</button>
                </td>
                <td>${percentage}</td>
                <td>
                    ${new Date(item.createdAt).toLocaleString()}
                    ${itemMapsLink ? `<a href="${itemMapsLink}" target="_blank" rel="noopener" style="color: var(--accent); text-decoration: none; margin-left: 6px;" title="View on Maps">📍</a>` : ''}
                </td>
            `;

            const btn = tr.querySelector('.view-btn');
            btn.onclick = () => openModal(item.originalImagePath, item.taggedImagePath);

            tbody.appendChild(tr);
        });

        // Chart
        const ctx = document.getElementById('userChart').getContext('2d');

        // Destroy existing
        if (window.userChartInstance) window.userChartInstance.destroy();

        window.userChartInstance = new Chart(ctx, {
            type: 'pie',
            data: {
                labels: Object.keys(data.categories),
                datasets: [{
                    data: Object.values(data.categories),
                    backgroundColor: ['#10b981', '#059669', '#047857', '#065f46', '#064e3b'],
                    borderColor: '#0b1c11'
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        position: 'right',
                        labels: {
                            color: document.body.classList.contains('light-mode') ? '#064e3b' : '#e2f1e6'
                        }
                    }
                }
            }
        });
    }

    loadProfile();
}


// --- COMPARISON MODAL LOGIC (Shared) ---

function nextSlide() {
    isShowingTagged = !isShowingTagged;
    updateSlide();
}

function prevSlide() {
    isShowingTagged = !isShowingTagged;
    updateSlide();
}

function updateSlide() {
    const img = document.getElementById('modal-img');
    const label = document.getElementById('modal-label');

    if (isShowingTagged) {
        img.src = currentTagged;
        label.innerText = "Detected (After)";
    } else {
        img.src = currentOriginal;
        label.innerText = "Raw Image (Before)";
    }
}

// Close modal when clicking outside
// Close modal when clicking outside - HANDLED ABOVE IN MAIN WINDOW.ONCLICK


// --- PWA Service Worker ---
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js').then(reg => {
            console.log('SW Registered!', reg.scope);
        }).catch(err => console.log('SW Registration Failed', err));
    });
}

// --- USER DASHBOARD ---
if (window.location.pathname.includes('dashboard.html')) {

    // Elements
    const uploadBtnTrigger = document.getElementById('upload-btn-trigger');
    const cameraBtn = document.getElementById('camera-btn');
    const uploadZone = document.getElementById('upload-zone');
    const fileInput = document.getElementById('file-input');
    const fileInfo = document.getElementById('file-info');
    const fileRemoveBtn = document.getElementById('file-remove');
    const loadingIndicator = document.getElementById('loading-indicator');

    // Camera Elements
    const cameraContainer = document.getElementById('camera-container');
    const video = document.getElementById('camera-video');
    const canvas = document.getElementById('camera-canvas');
    const captureBtn = document.getElementById('capture-btn');
    const closeCameraBtn = document.getElementById('close-camera-btn');

    // Report Form Elements
    const reportForm = document.getElementById('report-form');
    const gpsBtn = document.getElementById('gps-btn');
    const submitReportBtn = document.getElementById('submit-report-btn');
    const reportStatus = document.getElementById('report-status');

    let stream = null;
    let lastPredictionId = null;

    // --- UPLOAD ZONE LOGIC ---
    if (uploadBtnTrigger) {
        uploadBtnTrigger.addEventListener('click', () => {
            uploadZone.style.display = 'flex';
            cameraContainer.style.display = 'none';
            stopCamera();
        });

        // Click to browse
        uploadZone.addEventListener('click', (e) => {
            if (e.target !== fileInput) fileInput.click();
        });

        // Drag & Drop
        uploadZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadZone.classList.add('drag-over');
        });

        uploadZone.addEventListener('dragleave', () => {
            uploadZone.classList.remove('drag-over');
        });

        uploadZone.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadZone.classList.remove('drag-over');
            const file = e.dataTransfer.files[0];
            if (file && file.type.startsWith('image/')) {
                handleFileSelected(file);
            }
        });
    }

    // File remove button
    if (fileRemoveBtn) {
        fileRemoveBtn.addEventListener('click', () => {
            fileInput.value = '';
            fileInfo.style.display = 'none';
            uploadZone.style.display = 'flex';
        });
    }

    // Handle file selection (from input or drag)
    function handleFileSelected(file) {
        // Show file info
        document.getElementById('file-name').textContent = file.name;
        const sizeKB = (file.size / 1024).toFixed(1);
        document.getElementById('file-size').textContent = sizeKB > 1024 ? `${(sizeKB / 1024).toFixed(1)} MB` : `${sizeKB} KB`;
        fileInfo.style.display = 'flex';
        uploadZone.style.display = 'none';

        // Show preview
        const reader = new FileReader();
        reader.onload = (e) => {
            document.getElementById('preview-image').src = e.target.result;
        };
        reader.readAsDataURL(file);

        // Start upload
        uploadImage(file);
    }

    // File Input Change
    fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        handleFileSelected(file);
    });

    // --- CAMERA LOGIC ---
    if (cameraBtn) {
        cameraBtn.addEventListener('click', async () => {
            uploadZone.style.display = 'none';
            fileInfo.style.display = 'none';
            cameraContainer.style.display = 'block';
            try {
                stream = await navigator.mediaDevices.getUserMedia({
                    video: { facingMode: 'environment' }
                });
                video.srcObject = stream;
            } catch (err) {
                alert("Camera access denied or not available.");
                console.error(err);
            }
        });
    }

    if (closeCameraBtn) {
        closeCameraBtn.addEventListener('click', () => {
            stopCamera();
            cameraContainer.style.display = 'none';
        });
    }

    function stopCamera() {
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
            stream = null;
        }
    }

    // Capture Photo
    if (captureBtn) {
        captureBtn.addEventListener('click', () => {
            const context = canvas.getContext('2d');
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            context.drawImage(video, 0, 0, canvas.width, canvas.height);

            canvas.toBlob(async (blob) => {
                const file = new File([blob], "camera_capture.jpg", { type: "image/jpeg" });
                stopCamera();
                cameraContainer.style.display = 'none';

                // Show preview
                document.getElementById('preview-image').src = URL.createObjectURL(blob);
                uploadImage(file);
            }, 'image/jpeg');
        });
    }

    // --- UPLOAD IMAGE TO SERVER ---
    async function uploadImage(file) {
        // Show loading, hide other sections
        loadingIndicator.style.display = 'flex';
        document.getElementById('result-display').style.display = 'none';

        const formData = new FormData();
        formData.append('image', file);

        try {
            const res = await fetch(`${API_URL}/predict`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
                body: formData
            });

            const data = await res.json();
            loadingIndicator.style.display = 'none';

            if (res.ok) {
                // Store prediction ID for report form
                lastPredictionId = data.predictionId;

                const severity = data.severity || 'Low';
                const badgeClass = `badge-${severity.toLowerCase()}`;
                const confidence = (data.confidence * 100).toFixed(1);
                const totalItems = data.totalItems || 0;

                // Update tagged image
                if (data.tagged_image_url) {
                    document.getElementById('preview-image').src = data.tagged_image_url;
                }

                // Populate stats
                document.getElementById('stat-category').textContent = data.label;
                document.getElementById('stat-confidence').textContent = `${confidence}%`;

                const severityEl = document.getElementById('stat-severity');
                severityEl.textContent = severity;
                severityEl.className = `stat-value severity-badge ${badgeClass}`;

                document.getElementById('stat-items').textContent = totalItems === 0 ? 'None' : totalItems;

                // Populate recyclability
                const recycleEl = document.getElementById('stat-recyclable');
                if (data.recyclable === true) {
                    recycleEl.textContent = '♻️ Yes';
                    recycleEl.style.color = '#10b981';
                } else if (data.recyclable === 'partial') {
                    recycleEl.textContent = '⚠️ Partial';
                    recycleEl.style.color = '#f59e0b';
                } else {
                    recycleEl.textContent = '❌ No';
                    recycleEl.style.color = '#ef4444';
                }

                // Show recycle tip
                const tipEl = document.getElementById('recycle-tip');
                if (data.recycleTip) {
                    document.getElementById('recycle-tip-text').textContent = `♻️ ${data.recycleTip}`;
                    tipEl.style.display = 'block';
                } else {
                    tipEl.style.display = 'none';
                }

                // Show result display
                document.getElementById('result-display').style.display = 'block';

                // Show report form if waste was detected
                if (data.label !== 'No Waste Detected') {
                    reportForm.style.display = 'block';
                    reportStatus.textContent = '';
                    // Reset form fields
                    document.getElementById('report-location').value = '';
                    document.getElementById('report-landmark').value = '';
                    document.getElementById('report-description').value = '';
                } else {
                    reportForm.style.display = 'none';
                }

                loadHistory();
            } else {
                document.getElementById('result-display').style.display = 'block';
                document.getElementById('stat-category').textContent = 'Error';
                document.getElementById('stat-confidence').textContent = '—';
                document.getElementById('stat-severity').textContent = '—';
                document.getElementById('stat-items').textContent = '—';
                reportForm.style.display = 'none';
            }
        } catch (err) {
            console.error(err);
            loadingIndicator.style.display = 'none';
            document.getElementById('result-display').style.display = 'block';
            document.getElementById('stat-category').textContent = 'Server Error';
            reportForm.style.display = 'none';
        }
    }

    // --- GPS AUTO-FILL ---
    if (gpsBtn) {
        gpsBtn.addEventListener('click', () => {
            if (!navigator.geolocation) {
                alert('Geolocation is not supported by your browser.');
                return;
            }
            gpsBtn.disabled = true;
            gpsBtn.innerHTML = '<div class="spinner" style="width:16px;height:16px;border-width:2px;"></div>';

            navigator.geolocation.getCurrentPosition(
                (pos) => {
                    const lat = pos.coords.latitude.toFixed(6);
                    const lng = pos.coords.longitude.toFixed(6);
                    document.getElementById('report-location').value = `${lat}, ${lng}`;
                    gpsBtn.disabled = false;
                    gpsBtn.innerHTML = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="3"/><line x1="12" y1="2" x2="12" y2="6"/><line x1="12" y1="18" x2="12" y2="22"/><line x1="2" y1="12" x2="6" y2="12"/><line x1="18" y1="12" x2="22" y2="12"/></svg> ✓';
                },
                (err) => {
                    alert('Could not get your location: ' + err.message);
                    gpsBtn.disabled = false;
                    gpsBtn.innerHTML = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="3"/><line x1="12" y1="2" x2="12" y2="6"/><line x1="12" y1="18" x2="12" y2="22"/><line x1="2" y1="12" x2="6" y2="12"/><line x1="18" y1="12" x2="22" y2="12"/></svg> GPS';
                },
                { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
            );
        });
    }

    // --- SUBMIT REPORT ---
    if (submitReportBtn) {
        submitReportBtn.addEventListener('click', async () => {
            if (!lastPredictionId) {
                reportStatus.textContent = '⚠️ No detection to report.';
                return;
            }

            // Parse location
            let latitude = null, longitude = null;
            const locationVal = document.getElementById('report-location').value.trim();
            if (locationVal) {
                const parts = locationVal.split(',').map(s => s.trim());
                if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
                    latitude = parts[0];
                    longitude = parts[1];
                }
            }

            const landmark = document.getElementById('report-landmark').value.trim();
            const description = document.getElementById('report-description').value.trim();

            submitReportBtn.disabled = true;
            reportStatus.textContent = 'Submitting...';

            try {
                const res = await fetch(`${API_URL}/prediction/${lastPredictionId}/report`, {
                    method: 'PUT',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ latitude, longitude, landmark, description })
                });

                const data = await res.json();
                submitReportBtn.disabled = false;

                if (res.ok) {
                    reportStatus.innerHTML = '✅ Report submitted! <span style="color: var(--text-secondary);">📧 Alert sent to authorities.</span>';
                    submitReportBtn.textContent = '✓ Submitted';
                    submitReportBtn.disabled = true;

                    if (data.mapsLink) {
                        reportStatus.innerHTML += ` <a href="${data.mapsLink}" target="_blank" rel="noopener" style="color: var(--accent);">📍 View on Maps</a>`;
                    }
                    loadHistory();
                } else {
                    reportStatus.textContent = `❌ ${data.error || 'Failed to submit.'}`;
                }
            } catch (err) {
                console.error(err);
                submitReportBtn.disabled = false;
                reportStatus.textContent = '❌ Network error. Try again.';
            }
        });
    }

    // --- LOAD HISTORY ---
    async function loadHistory() {
        try {
            const res = await fetch(`${API_URL}/history`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();

            const historyList = document.getElementById('history-list');
            if (!historyList) return;

            historyList.innerHTML = '';

            data.forEach(item => {
                const historyItem = document.createElement('div');
                historyItem.className = 'history-item';

                const percentage = (item.confidence * 100).toFixed(0) + '%';
                const labelText = item.label || 'Unknown';
                const severity = item.severity || 'Low';
                const badgeClass = `badge-${severity.toLowerCase()}`;
                const itemMapsLink = getMapsLink(item.latitude, item.longitude);

                historyItem.innerHTML = `
                    <div class="history-info">
                        <strong>${labelText}</strong>
                        <span class="severity-badge ${badgeClass}">${severity}</span>
                        <span style="color: #666;">${percentage}</span>
                        ${itemMapsLink ? `<a href="${itemMapsLink}" target="_blank" rel="noopener" style="color: var(--accent); font-size: 0.8rem; text-decoration: none;" title="View on Maps">📍</a>` : ''}
                    </div>
                    <button class="view-btn">View Results</button>
                `;

                const btn = historyItem.querySelector('.view-btn');
                btn.onclick = () => openModal(item.originalImagePath, item.taggedImagePath);

                historyList.appendChild(historyItem);
            });
        } catch (e) { console.error("History load error", e); }
    }

    loadHistory();
}

// --- ADMIN DASHBOARD ---
if (window.location.pathname.includes('admin.html')) {
    async function loadStats() {
        // 1. Fetch General Stats
        const res = await fetch(`${API_URL}/admin/stats`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!res.ok) {
            alert('Access Denied');
            window.location.href = 'dashboard.html';
            return;
        }

        const data = await res.json();

        document.getElementById('total-uploads').innerText = data.totalUploads;
        document.getElementById('active-users').innerText = data.activeUsers;

        // Table
        const tbody = document.getElementById('activity-table');
        tbody.innerHTML = '';
        data.recentActivity.forEach(item => {
            const tr = document.createElement('tr');

            // Format: User | Severity | Result (%) | Time | <Button>
            const percentage = (item.confidence * 100).toFixed(0) + '%';
            const labelText = item.label || item.Label || 'Unknown';
            const severity = item.severity || 'Low';
            const badgeClass = `badge-${severity.toLowerCase()}`;

            tr.innerHTML = `
                <td>${item.User ? item.User.username : 'Unknown'}</td>
                <td><span class="severity-badge ${badgeClass}">${severity}</span></td>
                <td>${labelText} (${percentage})</td>
                <td>${new Date(item.createdAt).toLocaleString()}</td>
                <td><button class="view-btn">View</button></td>
            `;

            const btn = tr.querySelector('.view-btn');
            btn.onclick = () => openModal(item.originalImagePath, item.taggedImagePath);

            tbody.appendChild(tr);
        });

        // Category Chart
        const ctx = document.getElementById('categoryChart').getContext('2d');
        if (window.adminChartInstance) window.adminChartInstance.destroy();
        window.adminChartInstance = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: Object.keys(data.categories),
                datasets: [{
                    data: Object.values(data.categories),
                    backgroundColor: ['#10b981', '#059669', '#047857', '#065f46', '#064e3b'],
                    borderColor: '#0b1c11'
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        position: 'right',
                        labels: { color: document.body.classList.contains('light-mode') ? '#064e3b' : '#e2f1e6' }
                    }
                }
            }
        });

        // 2. Fetch Analytics (New)
        renderAnalytics();
    }

    async function renderAnalytics() {
        try {
            const res = await fetch(`${API_URL}/admin/activity`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();

            // Helper to render line/bar charts
            const createChart = (id, label, labels, values, type = 'bar') => {
                const ctx = document.getElementById(id).getContext('2d');
                new Chart(ctx, {
                    type: type,
                    data: {
                        labels: labels,
                        datasets: [{
                            label: label,
                            data: values,
                            backgroundColor: 'rgba(16, 185, 129, 0.6)',
                            borderColor: '#10b981',
                            borderWidth: 1
                        }]
                    },
                    options: {
                        responsive: true,
                        scales: {
                            y: { beginAtZero: true, grid: { color: 'rgba(16, 185, 129, 0.15)' }, ticks: { color: document.body.classList.contains('light-mode') ? '#047857' : '#8ba896' } },
                            x: { grid: { color: 'rgba(16, 185, 129, 0.15)' }, ticks: { color: document.body.classList.contains('light-mode') ? '#047857' : '#8ba896' } }
                        },
                        plugins: {
                            legend: { display: false }
                        }
                    }
                });
            };

            // Daily (Line)
            createChart('dailyChart', 'Uploads', data.daily.map(d => d.date), data.daily.map(d => d.count), 'line');
            // Weekly (Bar)
            createChart('weeklyChart', 'Uploads', data.weekly.map(d => d.week), data.weekly.map(d => d.count), 'bar');
            // Monthly (Bar)
            createChart('monthlyChart', 'Uploads', data.monthly.map(d => d.month), data.monthly.map(d => d.count), 'bar');

        } catch (e) {
            console.error("Analytics Error", e);
        }
    }

    loadStats();

    // --- PENDING REPORTS ---
    async function loadPendingReports() {
        try {
            const res = await fetch(`${API_URL}/admin/pending`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const reports = await res.json();
            const container = document.getElementById('pending-reports-list');
            const countEl = document.getElementById('pending-count');
            const badgeEl = document.getElementById('pending-badge');

            countEl.textContent = reports.length;
            if (reports.length > 0) {
                badgeEl.textContent = reports.length;
                badgeEl.style.display = 'inline-block';
            } else {
                badgeEl.style.display = 'none';
            }

            if (reports.length === 0) {
                container.innerHTML = '<p style="color: var(--text-secondary); text-align: center; padding: 30px;">✅ No pending reports. All clear!</p>';
                return;
            }

            container.innerHTML = '';
            reports.forEach(report => {
                const confidence = (report.confidence * 100).toFixed(1);
                const severity = report.severity || 'Low';
                const badgeClass = `badge-${severity.toLowerCase()}`;
                const mapsLink = (report.latitude && report.longitude)
                    ? `https://www.google.com/maps?q=${report.latitude},${report.longitude}` : null;
                const timeStr = new Date(report.createdAt).toLocaleString();
                const username = report.User ? report.User.username : 'Unknown';
                const email = report.User ? report.User.email : '';

                const card = document.createElement('div');
                card.className = 'report-card';
                card.innerHTML = `
                    <div class="report-card-header">
                        <img src="${report.taggedImagePath}" alt="Detection" class="report-thumb" onerror="this.src='${report.originalImagePath}'">
                        <div class="report-card-info">
                            <div class="report-card-top">
                                <strong style="font-size: 1.1rem;">${report.label}</strong>
                                <span class="severity-badge ${badgeClass}">${severity}</span>
                            </div>
                            <div class="report-card-meta">
                                <span>📊 ${confidence}% confidence</span>
                                <span>📦 ${report.totalItems} items</span>
                                <span>👤 ${username}</span>
                                <span>🕐 ${timeStr}</span>
                            </div>
                        </div>
                    </div>

                    <div class="report-card-details">
                        ${mapsLink ? `<div class="report-detail"><strong>📍 Location:</strong> ${report.latitude}, ${report.longitude} <a href="${mapsLink}" target="_blank" style="color: var(--accent);">View on Maps →</a></div>` : '<div class="report-detail"><strong>📍 Location:</strong> <span style="color: var(--text-secondary);">Not provided</span></div>'}
                        ${report.landmark ? `<div class="report-detail"><strong>🏘️ Landmark:</strong> ${report.landmark}</div>` : ''}
                        ${report.description ? `<div class="report-detail"><strong>📝 Description:</strong> ${report.description}</div>` : ''}
                        ${email ? `<div class="report-detail"><strong>📧 Reporter Email:</strong> ${email}</div>` : ''}
                    </div>

                    <div class="report-card-actions">
                        <button class="btn approve-btn" onclick="approveReport(${report.id}, this)">✅ Approve & Send Alert</button>
                        <button class="btn reject-btn" onclick="rejectReport(${report.id}, this)">❌ Reject</button>
                        <span class="action-status" style="font-size: 0.85rem; color: var(--text-secondary);"></span>
                    </div>
                `;
                container.appendChild(card);
            });
        } catch (e) {
            console.error("Pending load error:", e);
        }
    }

    loadPendingReports();
}

// --- ADMIN: Approve/Reject (global so onclick works) ---
async function approveReport(id, btn) {
    if (!confirm('Approve this report and send alert email to government authorities?')) return;
    const token = localStorage.getItem('token');
    btn.disabled = true;
    const statusEl = btn.parentElement.querySelector('.action-status');
    statusEl.textContent = 'Approving...';

    try {
        const res = await fetch(`${API_URL}/admin/prediction/${id}/approve`, {
            method: 'PUT',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        if (res.ok) {
            const p = data.prediction;
            btn.parentElement.querySelector('.reject-btn').disabled = true;
            btn.textContent = '✓ Approved';

            // Build Gmail compose URL
            const mapsLink = (p.latitude && p.longitude)
                ? `https://www.google.com/maps?q=${p.latitude},${p.longitude}` : 'Not provided';
            const locationText = (p.latitude && p.longitude) ? `${p.latitude}, ${p.longitude}` : 'Not provided';
            const confidence = p.confidence ? (p.confidence * 100).toFixed(1) + '%' : 'N/A';

            const subject = `[EcoSight Alert] ${p.label} Waste Detected — ${p.severity} Severity`;
            const body = `Dear Sir/Madam,

This is an automated waste detection alert from the EcoSight Environmental Monitoring System.

═══ DETECTION DETAILS ═══
• Waste Type: ${p.label}
• Severity Level: ${p.severity}
• Items Detected: ${p.totalItems}
• AI Confidence: ${confidence}

═══ LOCATION INFORMATION ═══
• Coordinates: ${locationText}
• Google Maps: ${mapsLink}
${p.landmark ? '• Landmark: ' + p.landmark : ''}
${p.description ? '• Description: ' + p.description : ''}

═══ EVIDENCE ═══
• Tagged Image: ${window.location.origin}${p.taggedImagePath}
• Original Image: ${window.location.origin}${p.originalImagePath}

This report has been reviewed and approved by the EcoSight Admin.
Immediate action is requested to address this environmental concern.

Regards,
EcoSight Environmental Monitoring System`;

            const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

            statusEl.innerHTML = `✅ Approved! &nbsp;
                <a href="${gmailUrl}" target="_blank" rel="noopener" class="btn mail-btn" style="display: inline-flex; align-items: center; gap: 6px; padding: 6px 14px; font-size: 0.85rem; text-decoration: none;">
                    📧 Send Mail to Authorities
                </a>`;

            // Refresh count
            const countEl = document.getElementById('pending-count');
            countEl.textContent = Math.max(0, parseInt(countEl.textContent) - 1);
            // Dim card slightly
            btn.closest('.report-card').style.borderColor = '#059669';
        } else {
            statusEl.textContent = `❌ ${data.error}`;
            btn.disabled = false;
        }
    } catch (e) {
        statusEl.textContent = '❌ Network error.';
        btn.disabled = false;
    }
}

async function rejectReport(id, btn) {
    if (!confirm('Reject this report? No email will be sent.')) return;
    const token = localStorage.getItem('token');
    btn.disabled = true;
    const statusEl = btn.parentElement.querySelector('.action-status');
    statusEl.textContent = 'Rejecting...';

    try {
        const res = await fetch(`${API_URL}/admin/prediction/${id}/reject`, {
            method: 'PUT',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        if (res.ok) {
            statusEl.innerHTML = '🚫 Rejected.';
            btn.parentElement.querySelector('.approve-btn').disabled = true;
            btn.textContent = '✗ Rejected';
            const countEl = document.getElementById('pending-count');
            countEl.textContent = Math.max(0, parseInt(countEl.textContent) - 1);
            btn.closest('.report-card').style.opacity = '0.5';
        } else {
            statusEl.textContent = `❌ ${data.error}`;
            btn.disabled = false;
        }
    } catch (e) {
        statusEl.textContent = '❌ Network error.';
        btn.disabled = false;
    }
}

// Admin: Reset Database
async function resetDatabase() {
    if (!confirm("⚠️ ARE YOU SURE? \n\nThis will delete ALL users, images, and data permanently.\nYou will be logged out and need to sign up again.")) {
        return;
    }

    const token = localStorage.getItem('token');
    try {
        const res = await fetch(`${API_URL}/admin/reset`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (res.ok) {
            alert('Database has been reset.');
            logout();
        } else {
            alert('Failed to reset database.');
        }
    } catch (err) {
        console.error(err);
        alert('Error resetting database.');
    }
}
