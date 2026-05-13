// ==================== WA BLAST PRO - WEB VERSION ====================
// Clean version - NO chrome.runtime, direct fetch() API calls

// ==================== NAVIGASI TAB ====================

function switchTab(tabName) {
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });
    
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });
    
    const navItem = document.querySelector(`[data-tab="${tabName}"]`);
    if (navItem) {
        navItem.classList.add('active');
    }
    
    const tabContent = document.getElementById(`${tabName}-tab`);
    if (tabContent) {
        tabContent.classList.add('active');
    }
    
    loadTabData(tabName);
}

function loadTabData(tabName) {
    switch(tabName) {
        case 'overview':
            loadOverview();
            break;
        case 'sessions':
            loadSessions();
            break;
        case 'blast':
            loadBlastOptions();
            break;
        case 'contacts':
            loadContacts();
            break;
        case 'templates':
            loadTemplates();
            break;
        case 'schedules':
            loadSchedules();
            break;
        case 'analytics':
            loadAnalytics();
            break;
    }
}

// ==================== KOMUNIKASI API - WEB VERSION (DIRECT FETCH) ====================

async function apiCall(endpoint, options = {}) {
    try {
        const baseUrl = window.location.origin;
        const url = endpoint.startsWith('/') ? `${baseUrl}${endpoint}` : `${baseUrl}/${endpoint}`;
        
        console.log(`🌐 API Call: ${options.method || 'GET'} ${url}`);
        
        const fetchOptions = {
            method: options.method || 'GET',
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            }
        };
        
        if (options.body && (options.method === 'POST' || options.method === 'PUT')) {
            fetchOptions.body = JSON.stringify(options.body);
        }
        
        const response = await fetch(url, fetchOptions);
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error(`❌ API Error: ${response.status} ${response.statusText}`);
            console.error(`   Response: ${errorText}`);
            throw new Error(`HTTP ${response.status}: ${errorText}`);
        }
        
        const data = await response.json();
        console.log(`✅ API Response:`, data);
        return data;
        
    } catch (error) {
        console.error('❌ API Call failed:', error);
        
        if (error.message.includes('Failed to fetch')) {
            alert('❌ Backend server tidak berjalan!\n\nSolusi:\n1. Buka terminal\n2. cd ke folder backend\n3. Jalankan: npm start\n4. Refresh halaman ini');
        } else {
            alert(`❌ Error: ${error.message}`);
        }
        
        throw error;
    }
}

// ==================== FUNGSI MODAL ====================

function showModal(content) {
    const modal = document.getElementById('modal');
    const modalContent = document.getElementById('modal-content');
    modalContent.innerHTML = content;
    modal.style.display = 'flex';
}

function closeModal() {
    document.getElementById('modal').style.display = 'none';
}

// ==================== HELPER MODAL PROGRESS ====================

function showBlastProgress(title, message) {
    showModal(`
        <h2 style="color: #667eea;">${title}</h2>
        <div style="text-align: center; padding: 40px;">
            <div style="font-size: 64px; animation: pulse 1.5s infinite;">⚡</div>
            <p style="margin-top: 20px; color: #666; font-size: 16px;">${message}</p>
            <div style="margin-top: 30px;">
                <div style="width: 100%; height: 4px; background: #e2e8f0; border-radius: 2px; overflow: hidden;">
                    <div style="width: 100%; height: 100%; background: linear-gradient(90deg, #667eea, #764ba2); animation: progress 2s infinite;"></div>
                </div>
            </div>
        </div>
        <style>
            @keyframes pulse {
                0%, 100% { transform: scale(1); opacity: 1; }
                50% { transform: scale(1.1); opacity: 0.8; }
            }
            @keyframes progress {
                0% { transform: translateX(-100%); }
                100% { transform: translateX(100%); }
            }
        </style>
    `);
}

function hideBlastProgress() {
    closeModal();
}

function showNotification(message, type = 'info') {
    alert(message);
}

function updateBlastStats(total, success, failed) {
    const statsEl = document.getElementById('blast-stats');
    if (statsEl) {
        statsEl.style.display = 'block';
        document.getElementById('stat-total').textContent = total;
        document.getElementById('stat-success').textContent = success;
        document.getElementById('stat-failed').textContent = failed;
    }
}

// ==================== TAB RINGKASAN ====================

async function loadOverview() {
    try {
        const sessions = await apiCall('/sessions');
        const analytics = await apiCall('/analytics/overview');
        const contacts = await apiCall('/contacts/lists');
        const schedules = await apiCall('/schedules');
        
        document.getElementById('stat-sessions').textContent = sessions.sessions?.length || 0;
        document.getElementById('stat-today').textContent = analytics.messages?.today?.total || 0;
        document.getElementById('stat-contacts').textContent = contacts.lists?.length || 0;
        document.getElementById('stat-scheduled').textContent = schedules.schedules?.filter(s => s.status === 'pending').length || 0;
        
        const logs = await apiCall('/analytics/logs?limit=10');
        const tbody = document.getElementById('activity-tbody');
        
        if (logs.logs && logs.logs.length > 0) {
            tbody.innerHTML = logs.logs.map(log => `
                <tr>
                    <td>${new Date(log.timestamp || log.sent_at).toLocaleString('id-ID')}</td>
                    <td>${log.sessionId || log.session_id}</td>
                    <td>${log.recipient}</td>
                    <td><span class="status-badge ${log.status}">${log.status === 'sent' ? 'terkirim' : 'gagal'}</span></td>
                </tr>
            `).join('');
        }
    } catch (err) {
        console.error('Error memuat ringkasan:', err);
    }
}

// ==================== TAB SESI ====================

async function loadSessions() {
    try {
        const result = await apiCall('/sessions');
        const container = document.getElementById('sessions-container');
        
        if (!result.sessions || result.sessions.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <p style="font-size: 48px; margin-bottom: 16px;">📱</p>
                    <h3>Belum Ada Sesi</h3>
                    <p>Buat sesi WhatsApp pertama Anda untuk mulai blast</p>
                </div>
            `;
            return;
        }
        
        container.innerHTML = result.sessions.map(session => `
            <div class="session-card">
                <div class="session-header">
                    <div>
                        <h3>${session.id || session.sessionId}</h3>
                        <span class="status-badge ${session.connected ? 'connected' : 'disconnected'}">
                            ${session.connected ? '● Terhubung' : '○ Terputus'}
                        </span>
                    </div>
                    <button class="btn-delete" data-action="delete-session" data-id="${session.id || session.sessionId}">Hapus</button>
                </div>
                
                <div class="stats-row">
                    <div class="stat-item">
                        <div class="stat-value">${session.messagesSent || 0}</div>
                        <div class="stat-label">Total</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-value">${session.messagesThisHour || 0}</div>
                        <div class="stat-label">Jam Ini</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-value" style="color: #10b981;">∞</div>
                        <div class="stat-label">Tak Terbatas</div>
                    </div>
                </div>
                
                ${!session.connected ? `
                    <button class="btn-secondary btn-block" data-action="show-qr" data-id="${session.id || session.sessionId}">
                        📱 Tampilkan QR Code
                    </button>
                ` : ''}
            </div>
        `).join('');
        
        setupEventDelegation();
        
    } catch (err) {
        console.error('Error memuat sesi:', err);
    }
}

async function createSessionWithQR() {
    const sessionId = prompt('Masukkan ID sesi (contoh: sesi1, kerja, pribadi):');
    
    if (!sessionId || !sessionId.trim()) return;
    
    try {
        showModal(`
            <h2>Membuat Sesi...</h2>
            <p style="text-align: center; padding: 40px;">
                <span style="font-size: 64px;">⚙️</span><br><br>
                Menyiapkan sesi WhatsApp "${sessionId.trim()}"
            </p>
        `);
        
        const result = await apiCall('/session/create', {
            method: 'POST',
            body: { sessionId: sessionId.trim() }
        });
        
        if (result.error) {
            closeModal();
            alert('Error: ' + result.error);
            return;
        }
        
        showModal(`
            <h2 style="color: #25D366;">✅ Sesi Berhasil Dibuat!</h2>
            <p style="text-align: center; padding: 40px;">
                <span style="font-size: 64px;">📱</span><br><br>
                Menghasilkan QR code...
            </p>
        `);
        
        await new Promise(resolve => setTimeout(resolve, 3000));
        await loadSessions();
        await showQR(sessionId.trim());
        
    } catch (err) {
        closeModal();
        alert('Gagal membuat sesi: ' + err.message);
    }
}

async function showQR(sessionId) {
    try {
        showModal(`
            <h2>Memuat QR Code...</h2>
            <p style="text-align: center; padding: 40px;">
                <span style="font-size: 64px;">⏳</span>
            </p>
        `);
        
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const result = await apiCall(`/session/qr/${sessionId}`);
        
        if (result.error || !result.qrImage) {
            closeModal();
            alert('QR code belum siap. Tunggu beberapa detik lalu coba lagi.');
            return;
        }
        
        showModal(`
            <h2 style="color: #25D366;">📱 Scan QR Code</h2>
            <p style="margin: 20px 0; color: #666;">
                Buka WhatsApp → Pengaturan → Perangkat Tertaut → Tautkan Perangkat
            </p>
            <div style="background: white; padding: 20px; border-radius: 12px; text-align: center;">
                <img src="${result.qrImage}" style="max-width: 300px; border-radius: 8px;">
            </div>
            <p style="margin-top: 20px; color: #666; font-size: 14px; text-align: center;">
                Sesi: <strong>${sessionId}</strong><br>
                <span style="color: #e53e3e;">⚠️ QR kadaluarsa dalam 60 detik</span>
            </p>
            <button class="btn-secondary" id="modal-close-btn" style="margin-top: 20px; width: 100%;">Tutup</button>
        `);
        
        document.getElementById('modal-close-btn')?.addEventListener('click', closeModal);
        
        const checkInterval = setInterval(async () => {
            try {
                const status = await apiCall(`/session/status/${sessionId}`);
                if (status.connected) {
                    clearInterval(checkInterval);
                    closeModal();
                    await loadSessions();
                    alert('✅ Sesi berhasil terhubung!');
                }
            } catch (err) {
                console.error('Error cek status:', err);
            }
        }, 2000);
        
        setTimeout(() => clearInterval(checkInterval), 60000);
        
    } catch (err) {
        closeModal();
        alert('Gagal memuat QR: ' + err.message);
    }
}

async function deleteSession(sessionId) {
    if (!confirm(`Hapus sesi "${sessionId}"? Tindakan ini tidak dapat dibatalkan.`)) return;
    
    try {
        await apiCall(`/session/${sessionId}`, { method: 'DELETE' });
        await loadSessions();
        alert('Sesi berhasil dihapus');
    } catch (err) {
        alert('Gagal menghapus sesi: ' + err.message);
    }
}

// ==================== TAB BLAST ====================

function saveBlastFormState() {
    const formState = {
        session: document.getElementById('blast-session')?.value || '',
        contacts: document.getElementById('blast-contacts')?.value || '',
        template: document.getElementById('blast-template')?.value || '',
        message: document.getElementById('blast-message')?.value || '',
        delay: document.getElementById('blast-delay')?.value || '0',
        mode: document.querySelector('input[name="blast-mode"]:checked')?.value || 'advanced'
    };
    localStorage.setItem('wablast-form-state', JSON.stringify(formState));
}

function restoreBlastFormState() {
    try {
        const saved = localStorage.getItem('wablast-form-state');
        if (!saved) return;
        
        const formState = JSON.parse(saved);
        
        setTimeout(() => {
            if (formState.session) document.getElementById('blast-session').value = formState.session;
            if (formState.contacts) document.getElementById('blast-contacts').value = formState.contacts;
            if (formState.template) document.getElementById('blast-template').value = formState.template;
            if (formState.message) document.getElementById('blast-message').value = formState.message;
            if (formState.delay) document.getElementById('blast-delay').value = formState.delay;
            if (formState.mode) {
                const modeRadio = document.querySelector(`input[name="blast-mode"][value="${formState.mode}"]`);
                if (modeRadio) modeRadio.checked = true;
            }
        }, 100);
    } catch (err) {
        console.log('Could not restore form state:', err);
    }
}

async function loadBlastOptions() {
    try {
        const sessions = await apiCall('/sessions');
        const sessionSelect = document.getElementById('blast-session');
        sessionSelect.innerHTML = '<option value="">Pilih sesi...</option>' + 
            sessions.sessions.filter(s => s.connected).map(s => 
                `<option value="${s.id || s.sessionId}">${s.id || s.sessionId}</option>`
            ).join('');
        
        const contacts = await apiCall('/contacts/lists');
        const contactsSelect = document.getElementById('blast-contacts');
        contactsSelect.innerHTML = '<option value="">Pilih daftar kontak...</option>' + 
            (contacts.lists?.map(l => 
                `<option value="${l.id}">${l.name} (${l.contact_count} kontak)</option>`
            ).join('') || '');
        
        const templates = await apiCall('/templates');
        const templateSelect = document.getElementById('blast-template');
        templateSelect.innerHTML = '<option value="">Pilih template atau tulis manual...</option>' + 
            (templates.templates?.map(t => 
                `<option value="${t.id}">${t.name}</option>`
            ).join('') || '');
        
        templateSelect.onchange = function(e) {
            if (e.target.value) {
                apiCall(`/templates/${e.target.value}`).then(template => {
                    const messageContent = template.content || template.message || template.text || '';
                    if (messageContent && messageContent !== 'undefined') {
                        document.getElementById('blast-message').value = messageContent;
                        saveBlastFormState();
                    }
                }).catch(err => {
                    console.error('Error loading template:', err);
                });
            } else {
                saveBlastFormState();
            }
        };
        
        document.getElementById('blast-session')?.addEventListener('change', saveBlastFormState);
        document.getElementById('blast-contacts')?.addEventListener('change', saveBlastFormState);
        document.getElementById('blast-message')?.addEventListener('input', saveBlastFormState);
        document.getElementById('blast-delay')?.addEventListener('input', saveBlastFormState);
        document.querySelectorAll('input[name="blast-mode"]').forEach(radio => {
            radio.addEventListener('change', saveBlastFormState);
        });
        
        restoreBlastFormState();
        
    } catch (err) {
        console.error('Error memuat opsi blast:', err);
    }
}

async function sendBlast() {
    const sessionId = document.getElementById('blast-session').value;
    const listId = document.getElementById('blast-contacts').value;
    const message = document.getElementById('blast-message').value.trim();
    const delay = parseInt(document.getElementById('blast-delay').value) * 1000;
    
    if (!sessionId || !listId || !message) {
        alert('Mohon lengkapi semua field yang diperlukan');
        return;
    }
    
    if (!confirm(`Kirim blast ke daftar kontak? Pesan akan dikirim dengan jeda ${delay/1000} detik.`)) {
        return;
    }
    
    try {
        showModal(`
            <h2>Mengirim Blast...</h2>
            <div style="text-align: center; padding: 40px;">
                <div style="font-size: 64px;">📤</div>
                <p style="margin-top: 20px;">Memproses pesan...</p>
            </div>
        `);
        
        const result = await apiCall('/blast/safe', {
            method: 'POST',
            body: { sessionId, listId, message }
        });
        
        closeModal();
        alert(`✅ Blast dimulai!\nTotal: ${result.total}\nSukses: ${result.success}\nGagal: ${result.failed}`);
        
        document.getElementById('blast-message').value = '';
        localStorage.removeItem('wablast-form-state');
        
    } catch (err) {
        closeModal();
        alert('Gagal mengirim blast: ' + err.message);
    }
}

async function sendInstantBlast() {
    const sessionId = document.getElementById('blast-session').value;
    const listId = document.getElementById('blast-contacts').value;
    const message = document.getElementById('blast-message').value.trim();
    
    if (!sessionId || !listId || !message) {
        alert('⚠️ Mohon lengkapi semua field yang diperlukan');
        return;
    }
    
    const confirmed = confirm(`
⚡ INSTAN MEGA BLAST - PERINGATAN! ⚡

Ini akan mengirim pesan ke SEMUA kontak BERSAMAAN dengan:
❌ TANPA jeda antar pesan
❌ TANPA batas kecepatan
❌ TANPA perlindungan anti-banned

⚠️ RISIKO TINGGI akun dibanned/disuspend!

Lanjutkan?
    `);
    
    if (!confirmed) return;
    
    const doubleConfirm = confirm('⚠️ PERINGATAN TERAKHIR: Ini dapat membuat akun Anda dibanned. Lanjutkan?');
    if (!doubleConfirm) return;
    
    try {
        showBlastProgress('⚡ Instan Blast Berjalan...', 'Mengirim ke semua kontak bersamaan... Mode kecepatan maksimal aktif!');
        
        const result = await apiCall('/blast/instant', {
            method: 'POST',
            body: { sessionId, listId, message }
        });
        
        closeModal();
        updateBlastStats(result.total, result.success, result.failed);
        
        showModal(`
            <div style="text-align: center; padding: 40px;">
                <div style="font-size: 80px; margin-bottom: 20px;">⚡</div>
                <h2 style="color: #10b981; margin-bottom: 16px;">Instan Blast Selesai!</h2>
                <div style="background: #f0fdf4; padding: 20px; border-radius: 8px; margin: 20px 0;">
                    <p style="font-size: 18px; margin: 8px 0;">
                        <strong style="color: #10b981;">✅ Sukses: ${result.success}</strong>
                    </p>
                    <p style="font-size: 18px; margin: 8px 0;">
                        <strong style="color: #ef4444;">❌ Gagal: ${result.failed}</strong>
                    </p>
                    <p style="font-size: 16px; margin: 8px 0; color: #666;">
                        Total: ${result.total} kontak
                    </p>
                </div>
                <button class="btn-primary" id="btn-done" style="margin-top: 20px;">Selesai</button>
            </div>
        `);
        
        document.getElementById('btn-done')?.addEventListener('click', closeModal);
        document.getElementById('blast-message').value = '';
        localStorage.removeItem('wablast-form-state');
        
    } catch (err) {
        closeModal();
        alert('❌ Instan blast gagal: ' + err.message);
    }
}

async function sendAdvancedBlast() {
    const sessionId = document.getElementById('blast-session')?.value;
    const listId = document.getElementById('blast-contacts')?.value;
    const message = document.getElementById('blast-message')?.value?.trim();
    const mode = document.getElementById('blast-mode')?.value || 'aggressive';

    if (!sessionId || !listId || !message) {
        alert('⚠️ Mohon lengkapi semua field yang diperlukan');
        return;
    }

    const modeInfo = {
        safe: 'Mode Aman (50/jam, risiko minimal)',
        aggressive: 'Agresif (200/jam, risiko sedang)',
        insane: 'Ekstrim (1000/jam, risiko tinggi)'
    };

    const confirmed = confirm(
        `🛡️ MODE ANTI-DETEKSI CANGGIH\n\n` +
        `Mode: ${modeInfo[mode]}\n\n` +
        `Fitur:\n` +
        `✓ Variasi pesan (5-10 versi)\n` +
        `✓ Simulasi perilaku manusia\n` +
        `✓ Jeda adaptif\n` +
        `✓ Istirahat berkala\n\n` +
        `Lanjutkan?`
    );

    if (!confirmed) return;

    try {
        showBlastProgress('🛡️ Blast Canggih Berjalan...', 'Menggunakan teknik anti-deteksi...');

        const result = await apiCall('/blast/advanced', {
            method: 'POST',
            body: { sessionId, listId, message, mode }
        });
        
        hideBlastProgress();

        if (result.success !== undefined) {
            updateBlastStats(result.total, result.success, result.failed);
            
            showModal(`
                <div style="text-align: center; padding: 40px;">
                    <div style="font-size: 80px; margin-bottom: 20px;">🛡️</div>
                    <h2 style="color: #667eea; margin-bottom: 16px;">Blast Canggih Selesai!</h2>
                    <div style="background: linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%); padding: 20px; border-radius: 12px; margin: 20px 0; border-left: 4px solid #667eea;">
                        <p style="font-size: 18px; margin: 8px 0;">
                            <strong style="color: #10b981;">✅ Sukses: ${result.success}</strong>
                        </p>
                        <p style="font-size: 18px; margin: 8px 0;">
                            <strong style="color: #ef4444;">❌ Gagal: ${result.failed}</strong>
                        </p>
                        <p style="font-size: 16px; margin: 8px 0; color: #666;">
                            📊 Total: ${result.total} kontak
                        </p>
                        <p style="font-size: 16px; margin: 8px 0; color: #667eea;">
                            📈 Tingkat Sukses: ${((result.success / result.total) * 100).toFixed(1)}%
                        </p>
                    </div>
                    <button class="btn-primary" id="btn-done" style="margin-top: 20px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border: none;">Selesai</button>
                </div>
            `);
            
            document.getElementById('btn-done')?.addEventListener('click', closeModal);
            document.getElementById('blast-message').value = '';
        } else {
            alert(`❌ Blast canggih gagal: ${result.error || 'Error tidak diketahui'}`);
        }
    } catch (err) {
        hideBlastProgress();
        alert(`❌ Error: ${err.message}`);
    }
}

async function sendStealthInstant() {
    const sessionId = document.getElementById('blast-session')?.value;
    const listId = document.getElementById('blast-contacts')?.value;
    const message = document.getElementById('blast-message')?.value?.trim();

    if (!sessionId || !listId || !message) {
        alert('⚠️ Mohon lengkapi semua field yang diperlukan');
        return;
    }

    const confirm1 = confirm(
        `⚫ INSTAN TERSEMBUNYI BLAST\n\n` +
        `⚠️ PERINGATAN:\n` +
        `• Kirim ke semua kontak dengan micro-delay (50-200ms)\n` +
        `• Menggunakan variasi pesan untuk penyamaran\n` +
        `• Risiko banned Sedang-Tinggi\n\n` +
        `Lanjutkan?`
    );
    if (!confirm1) return;

    const confirm2 = confirm('⚫ Konfirmasi terakhir - Lanjutkan dengan instan tersembunyi blast?');
    if (!confirm2) return;

    try {
        showBlastProgress('⚫ Instan Tersembunyi Berjalan...', 'Kecepatan maksimal dengan teknik penghindaran aktif!');

        const result = await apiCall('/blast/stealth-instant', {
            method: 'POST',
            body: { sessionId, listId, message }
        });
        
        hideBlastProgress();

        if (result.success !== undefined) {
            updateBlastStats(result.total, result.success, result.failed);
            
            showModal(`
                <div style="text-align: center; padding: 40px;">
                    <div style="font-size: 80px; margin-bottom: 20px;">⚫</div>
                    <h2 style="color: #00f2fe; margin-bottom: 16px;">Blast Tersembunyi Selesai!</h2>
                    <div style="background: linear-gradient(135deg, rgba(79, 172, 254, 0.1) 0%, rgba(0, 242, 254, 0.1) 100%); padding: 20px; border-radius: 12px; margin: 20px 0; border-left: 4px solid #00f2fe;">
                        <p style="font-size: 18px; margin: 8px 0;">
                            <strong style="color: #10b981;">✅ Sukses: ${result.success}</strong>
                        </p>
                        <p style="font-size: 18px; margin: 8px 0;">
                            <strong style="color: #ef4444;">❌ Gagal: ${result.failed}</strong>
                        </p>
                        <p style="font-size: 16px; margin: 8px 0; color: #666;">
                            📊 Total: ${result.total} kontak
                        </p>
                    </div>
                    <button class="btn-primary" id="btn-done" style="margin-top: 20px; background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%); border: none;">Selesai</button>
                </div>
            `);
            
            document.getElementById('btn-done')?.addEventListener('click', closeModal);
            document.getElementById('blast-message').value = '';
        } else {
            alert(`❌ Blast tersembunyi gagal: ${result.error || 'Error tidak diketahui'}`);
        }
    } catch (err) {
        hideBlastProgress();
        alert(`❌ Error: ${err.message}`);
    }
}

async function validateNumbers() {
    const sessionId = document.getElementById('blast-session')?.value;
    const listId = document.getElementById('blast-contacts')?.value;

    if (!sessionId || !listId) {
        alert('Mohon pilih sesi dan daftar kontak');
        return;
    }

    if (!confirm('Validasi semua nomor dalam daftar ini?')) {
        return;
    }

    try {
        showBlastProgress('✅ Memvalidasi Nomor...', 'Mengecek nomor mana saja yang ada di WhatsApp...');

        const result = await apiCall('/contacts/validate', {
            method: 'POST',
            body: { sessionId, listId }
        });
        
        hideBlastProgress();

        if (result.success) {
            showModal(`
                <div style="text-align: center; padding: 40px;">
                    <div style="font-size: 80px; margin-bottom: 20px;">✅</div>
                    <h2 style="color: #10b981; margin-bottom: 16px;">Validasi Selesai!</h2>
                    <div style="background: #f0fdf4; padding: 20px; border-radius: 12px; margin: 20px 0; border-left: 4px solid #10b981;">
                        <p style="font-size: 18px; margin: 8px 0;">
                            <strong style="color: #10b981;">✅ Valid: ${result.valid?.length || 0}</strong>
                        </p>
                        <p style="font-size: 18px; margin: 8px 0;">
                            <strong style="color: #ef4444;">❌ Tidak Valid: ${result.invalid?.length || 0}</strong>
                        </p>
                        <p style="font-size: 16px; margin: 8px 0; color: #666;">
                            Total: ${result.total} nomor diperiksa
                        </p>
                    </div>
                    <button class="btn-primary" id="btn-done" style="margin-top: 20px; background: linear-gradient(135deg, #10b981 0%, #059669 100%); border: none;">Selesai</button>
                </div>
            `);
            
            document.getElementById('btn-done')?.addEventListener('click', closeModal);
        } else {
            alert(`❌ Validasi gagal: ${result.error}`);
        }
    } catch (err) {
        hideBlastProgress();
        alert(`❌ Error: ${err.message}`);
    }
}

async function warmupAccount() {
    const sessionId = document.getElementById('blast-session')?.value;
    const listId = document.getElementById('blast-contacts')?.value;

    if (!sessionId || !listId) {
        alert('Mohon pilih sesi dan daftar kontak');
        return;
    }

    if (!confirm('Panaskan akun dengan chat acak?')) {
        return;
    }

    try {
        showBlastProgress('🔥 Memanaskan Akun...', 'Mengirim chat acak untuk simulasi aktivitas manusia...');

        const result = await apiCall('/warmup/random-chats', {
            method: 'POST',
            body: { sessionId, listId }
        });
        
        hideBlastProgress();

        if (result.success) {
            showModal(`
                <div style="text-align: center; padding: 40px;">
                    <div style="font-size: 80px; margin-bottom: 20px;">🔥</div>
                    <h2 style="color: #f59e0b; margin-bottom: 16px;">Pemanasan Selesai!</h2>
                    <div style="background: #fef3c7; padding: 20px; border-radius: 12px; margin: 20px 0; border-left: 4px solid #f59e0b;">
                        <p style="font-size: 18px; margin: 8px 0; color: #92400e;">
                            ✅ ${result.randomChats} chat acak terkirim
                        </p>
                    </div>
                    <button class="btn-primary" id="btn-done" style="margin-top: 20px; background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); border: none;">Selesai</button>
                </div>
            `);
            
            document.getElementById('btn-done')?.addEventListener('click', closeModal);
        } else {
            alert(`❌ Pemanasan gagal: ${result.error}`);
        }
    } catch (err) {
        hideBlastProgress();
        alert(`❌ Error: ${err.message}`);
    }
}

async function sendUltraSafeBlast() {
    const sessionId = document.getElementById('blast-session')?.value;
    const listId = document.getElementById('blast-contacts')?.value;
    const message = document.getElementById('blast-message')?.value?.trim();

    if (!sessionId || !listId || !message) {
        alert('⚠️ Mohon lengkapi semua field yang diperlukan');
        return;
    }

    const confirmed = confirm(
        `🛡️ MODE BLAST ULTRA AMAN\n\n` +
        `Proses:\n` +
        `1️⃣ Validasi semua nomor\n` +
        `2️⃣ Panaskan akun\n` +
        `3️⃣ Kirim dengan aman\n\n` +
        `Lanjutkan?`
    );

    if (!confirmed) return;

    try {
        showBlastProgress('🛡️ Blast Ultra Aman Berjalan...', 'Langkah 1: Validasi... Langkah 2: Pemanasan... Langkah 3: Kirim...');

        const result = await apiCall('/blast/ultra-safe', {
            method: 'POST',
            body: { sessionId, listId, message }
        });
        
        hideBlastProgress();

        if (result.success !== undefined) {
            updateBlastStats(result.total, result.success, result.failed);
            
            showModal(`
                <div style="text-align: center; padding: 40px;">
                    <div style="font-size: 80px; margin-bottom: 20px;">🛡️</div>
                    <h2 style="color: #8b5cf6; margin-bottom: 16px;">Blast Ultra Aman Selesai!</h2>
                    <div style="background: linear-gradient(135deg, rgba(139, 92, 246, 0.1) 0%, rgba(124, 58, 237, 0.1) 100%); padding: 20px; border-radius: 12px; margin: 20px 0; border-left: 4px solid #8b5cf6;">
                        <p style="font-size: 18px; margin: 8px 0;">
                            <strong style="color: #10b981;">✅ Sukses: ${result.success}</strong>
                        </p>
                        <p style="font-size: 18px; margin: 8px 0;">
                            <strong style="color: #ef4444;">❌ Gagal: ${result.failed}</strong>
                        </p>
                        <p style="font-size: 16px; margin: 8px 0; color: #666;">
                            Total: ${result.total} kontak
                        </p>
                    </div>
                    <button class="btn-primary" id="btn-done" style="margin-top: 20px; background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%); border: none;">Selesai</button>
                </div>
            `);
            
            document.getElementById('btn-done')?.addEventListener('click', closeModal);
            document.getElementById('blast-message').value = '';
        } else {
            alert(`❌ Blast ultra aman gagal: ${result.error}`);
        }
    } catch (err) {
        hideBlastProgress();
        alert(`❌ Error: ${err.message}`);
    }
}

// ==================== TAB KONTAK ====================

async function loadContacts() {
    try {
        const result = await apiCall('/contacts/lists');
        const container = document.getElementById('contacts-container');
        
        if (!result.lists || result.lists.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <p style="font-size: 48px;">👥</p>
                    <h3>Belum Ada Daftar Kontak</h3>
                    <p>Buat daftar kontak pertama Anda</p>
                </div>
            `;
            return;
        }
        
        container.innerHTML = result.lists.map(list => `
            <div class="contact-card">
                <h3>${list.name}</h3>
                <p>${list.description || 'Tidak ada deskripsi'}</p>
                <div class="contact-stats">
                    <span>📱 ${list.contact_count} kontak</span>
                </div>
                <button class="btn-secondary btn-block" data-action="view-contacts" data-id="${list.id}">
                    Lihat Kontak
                </button>
            </div>
        `).join('');
        
        setupEventDelegation();
        
    } catch (err) {
        console.error('Error memuat kontak:', err);
    }
}

async function createContactList() {
    showModal(`
        <h2>📝 Buat Daftar Kontak</h2>
        <div style="margin-top: 30px;">
            <div class="form-group">
                <label>Nama Daftar</label>
                <input type="text" id="list-name" class="form-control" placeholder="contoh: Leads Marketing">
            </div>
            
            <div class="form-group">
                <label>Deskripsi (Opsional)</label>
                <input type="text" id="list-description" class="form-control" placeholder="contoh: Kampanye Q1 2024">
            </div>
            
            <div class="form-group">
                <label>Nomor Telepon (Satu per baris)</label>
                <textarea id="list-numbers" class="form-control" rows="12" placeholder="Paste semua nomor:
6283827959229
6282245849598"></textarea>
            </div>
            
            <div style="display: flex; gap: 12px; margin-top: 24px;">
                <button class="btn-secondary" id="btn-cancel-list">Batal</button>
                <button class="btn-primary" id="btn-save-list">💾 Buat & Import</button>
            </div>
        </div>
    `);
    
    setTimeout(() => {
        document.getElementById('btn-cancel-list')?.addEventListener('click', closeModal);
        document.getElementById('btn-save-list')?.addEventListener('click', saveContactList);
        document.getElementById('list-name')?.focus();
    }, 100);
}

async function saveContactList() {
    const name = document.getElementById('list-name')?.value.trim();
    const description = document.getElementById('list-description')?.value.trim();
    const numbersText = document.getElementById('list-numbers')?.value.trim();
    
    if (!name) {
        alert('Mohon masukkan nama daftar');
        return;
    }
    
    if (!numbersText) {
        alert('Mohon masukkan nomor telepon');
        return;
    }
    
    try {
        showModal(`
            <h2>Memproses...</h2>
            <div style="text-align: center; padding: 40px;">
                <div style="font-size: 64px;">⚙️</div>
                <p style="margin-top: 20px;">Membuat daftar...</p>
            </div>
        `);
        
        const numbers = parsePhoneNumbers(numbersText);
        
        if (numbers.length === 0) {
            closeModal();
            alert('Tidak ada nomor valid ditemukan');
            return;
        }
        
        const listResult = await apiCall('/contacts/list', {
            method: 'POST',
            body: { name, description: description || '' }
        });
        
        const contacts = numbers.map(number => ({ number, name: '' }));
        
        await apiCall('/contacts/add', {
            method: 'POST',
            body: { listId: listResult.listId, contacts }
        });
        
        closeModal();
        await loadContacts();
        
        showModal(`
            <div style="text-align: center; padding: 40px;">
                <div style="font-size: 80px;">✅</div>
                <h2 style="color: #25D366; margin: 20px 0;">Berhasil!</h2>
                <p style="font-size: 18px;">
                    Dibuat "<strong>${name}</strong>"<br>
                    dengan <strong>${numbers.length}</strong> kontak
                </p>
                <button class="btn-primary" id="btn-done" style="margin-top: 30px;">Selesai</button>
            </div>
        `);
        
        document.getElementById('btn-done')?.addEventListener('click', closeModal);
        
    } catch (err) {
        closeModal();
        alert('Gagal: ' + err.message);
    }
}

function parsePhoneNumbers(text) {
    const lines = text.split(/[\n,]+/);
    const numbers = [];
    
    for (let line of lines) {
        let number = line.trim().replace(/[\s\-\(\)\.]/g, '');
        if (!number) continue;
        
        number = number.replace(/^\+/, '');
        
        if (number.startsWith('08')) {
            number = '62' + number.substring(1);
        }
        
        if (/^62\d{9,13}$/.test(number)) {
            numbers.push(number);
        }
    }
    
    return [...new Set(numbers)];
}

async function viewContacts(listId) {
    try {
        showModal(`<h2>Memuat...</h2>`);
        
        const result = await apiCall(`/contacts/list/${listId}`);
        const list = result.list;
        const contacts = result.contacts || [];
        
        showModal(`
            <div style="max-height: 70vh; overflow-y: auto;">
                <h2>📱 ${list.name}</h2>
                <p style="color: #667eea; font-weight: 600; margin: 20px 0;">
                    Total: ${contacts.length} kontak
                </p>
                
                <div style="background: #f7fafc; padding: 16px; border-radius: 8px; max-height: 400px; overflow-y: auto;">
                    ${contacts.map((c, i) => `
                        <div style="padding: 8px; border-bottom: 1px solid #e2e8f0;">
                            <strong>${i + 1}.</strong> +${c.number}
                        </div>
                    `).join('')}
                </div>
                
                <div style="display: flex; gap: 12px; margin-top: 20px;">
                    <button class="btn-secondary" id="btn-close">Tutup</button>
                    <button class="btn-delete" id="btn-delete" data-list-id="${listId}">Hapus Daftar</button>
                </div>
            </div>
        `);
        
        document.getElementById('btn-close')?.addEventListener('click', closeModal);
        document.getElementById('btn-delete')?.addEventListener('click', () => deleteContactList(listId));
        
    } catch (err) {
        closeModal();
        alert('Gagal: ' + err.message);
    }
}

async function deleteContactList(listId) {
    if (!confirm('Hapus daftar ini?')) return;
    
    try {
        await apiCall(`/contacts/list/${listId}`, { method: 'DELETE' });
        closeModal();
        await loadContacts();
        alert('✅ Daftar dihapus');
    } catch (err) {
        alert('Gagal: ' + err.message);
    }
}

// ==================== TAB TEMPLATE ====================

async function loadTemplates() {
    try {
        const result = await apiCall('/templates');
        const container = document.getElementById('templates-container');
        
        if (!result.templates || result.templates.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <p style="font-size: 48px;">📝</p>
                    <h3>Belum Ada Template</h3>
                    <p>Buat template pesan pertama Anda</p>
                </div>
            `;
            return;
        }
        
        container.innerHTML = result.templates.map(template => `
            <div class="template-card">
                <h3>${template.name}</h3>
                <p class="template-preview">${template.content.substring(0, 100)}...</p>
                <div style="display: flex; gap: 8px; margin-top: 12px;">
                    <button class="btn-secondary" data-action="use-template" data-id="${template.id}" style="flex: 1;">Gunakan</button>
                    <button class="btn-delete" data-action="delete-template" data-id="${template.id}">Hapus</button>
                </div>
            </div>
        `).join('');
        
        setupEventDelegation();
        
    } catch (err) {
        console.error('Error memuat template:', err);
    }
}

async function createTemplate() {
    showModal(`
        <h2>📝 Buat Template</h2>
        <div style="margin-top: 30px;">
            <div class="form-group">
                <label>Nama Template</label>
                <input type="text" id="template-name" class="form-control" placeholder="contoh: Pesan Selamat Datang">
            </div>
            
            <div class="form-group">
                <label>Isi Pesan</label>
                <textarea id="template-content" class="form-control" rows="8" placeholder="Masukkan template pesan..."></textarea>
            </div>
            
            <div style="display: flex; gap: 12px; margin-top: 24px;">
                <button class="btn-secondary" id="btn-cancel-template">Batal</button>
                <button class="btn-primary" id="btn-save-template">💾 Simpan Template</button>
            </div>
        </div>
    `);
    
    setTimeout(() => {
        document.getElementById('btn-cancel-template')?.addEventListener('click', closeModal);
        document.getElementById('btn-save-template')?.addEventListener('click', saveTemplate);
        document.getElementById('template-name')?.focus();
    }, 100);
}

async function saveTemplate() {
    const name = document.getElementById('template-name')?.value.trim();
    const content = document.getElementById('template-content')?.value.trim();
    
    if (!name) {
        alert('Mohon masukkan nama template');
        return;
    }
    
    if (!content) {
        alert('Mohon masukkan isi template');
        return;
    }
    
    try {
        await apiCall('/templates', {
            method: 'POST',
            body: { name, content, variables: '[]' }
        });
        
        closeModal();
        await loadTemplates();
        alert('✅ Template berhasil dibuat!');
        
    } catch (err) {
        alert('Gagal membuat template: ' + err.message);
    }
}

async function deleteTemplate(templateId) {
    if (!confirm('Hapus template ini?')) return;
    
    try {
        await apiCall(`/templates/${templateId}`, { method: 'DELETE' });
        await loadTemplates();
        alert('✅ Template dihapus');
    } catch (err) {
        alert('Gagal: ' + err.message);
    }
}

function useTemplate(templateId) {
    switchTab('blast');
    
    setTimeout(() => {
        apiCall(`/templates/${templateId}`).then(template => {
            document.getElementById('blast-message').value = template.content;
            document.getElementById('blast-template').value = templateId;
        });
    }, 100);
}

// ==================== TAB JADWAL ====================

async function loadSchedules() {
    try {
        const result = await apiCall('/schedules');
        const container = document.getElementById('schedules-container');
        
        if (!result.schedules || result.schedules.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <p style="font-size: 48px;">⏰</p>
                    <h3>Belum Ada Jadwal</h3>
                    <p>Jadwalkan blast pertama Anda</p>
                </div>
            `;
            return;
        }
        
        const statusText = {
            'pending': 'menunggu',
            'completed': 'selesai',
            'failed': 'gagal'
        };
        
        container.innerHTML = result.schedules.map(schedule => `
            <div class="schedule-card">
                <div style="display: flex; justify-content: space-between; align-items: start;">
                    <div>
                        <h3>${schedule.name}</h3>
                        <p>Dijadwalkan: ${new Date(schedule.scheduled_time).toLocaleString('id-ID')}</p>
                        <span class="status-badge ${schedule.status}">${statusText[schedule.status] || schedule.status}</span>
                    </div>
                    <button class="btn-delete" data-action="delete-schedule" data-id="${schedule.id}">Hapus</button>
                </div>
            </div>
        `).join('');
        
        setupEventDelegation();
        
    } catch (err) {
        console.error('Error memuat jadwal:', err);
    }
}

async function createSchedule() {
    showModal(`
        <h2>⏰ Jadwalkan Blast</h2>
        <div style="margin-top: 30px;">
            <div class="form-group">
                <label>Nama Jadwal</label>
                <input type="text" id="schedule-name" class="form-control" placeholder="contoh: Blast Pagi">
            </div>
            
            <div class="form-group">
                <label>Pilih Sesi</label>
                <select id="schedule-session" class="form-control">
                    <option value="">Memuat...</option>
                </select>
            </div>
            
            <div class="form-group">
                <label>Pilih Daftar Kontak</label>
                <select id="schedule-contacts" class="form-control">
                    <option value="">Memuat...</option>
                </select>
            </div>
            
            <div class="form-group">
                <label>Pesan</label>
                <textarea id="schedule-message" class="form-control" rows="6" placeholder="Masukkan pesan..."></textarea>
            </div>
            
            <div class="form-group">
                <label>Waktu Jadwal</label>
                <input type="datetime-local" id="schedule-time" class="form-control">
            </div>
            
            <div style="display: flex; gap: 12px; margin-top: 24px;">
                <button class="btn-secondary" id="btn-cancel-schedule">Batal</button>
                <button class="btn-primary" id="btn-save-schedule">⏰ Jadwalkan Blast</button>
            </div>
        </div>
    `);
    
    setTimeout(async () => {
        const sessions = await apiCall('/sessions');
        document.getElementById('schedule-session').innerHTML = '<option value="">Pilih sesi...</option>' + 
            sessions.sessions.filter(s => s.connected).map(s => `<option value="${s.id || s.sessionId}">${s.id || s.sessionId}</option>`).join('');
        
        const contacts = await apiCall('/contacts/lists');
        document.getElementById('schedule-contacts').innerHTML = '<option value="">Pilih daftar...</option>' + 
            (contacts.lists?.map(l => `<option value="${l.id}">${l.name}</option>`).join('') || '');
        
        document.getElementById('btn-cancel-schedule')?.addEventListener('click', closeModal);
        document.getElementById('btn-save-schedule')?.addEventListener('click', saveSchedule);
    }, 100);
}

async function saveSchedule() {
    const name = document.getElementById('schedule-name')?.value.trim();
    const sessionId = document.getElementById('schedule-session')?.value;
    const listId = document.getElementById('schedule-contacts')?.value;
    const message = document.getElementById('schedule-message')?.value.trim();
    const scheduledTime = document.getElementById('schedule-time')?.value;
    
    if (!name || !sessionId || !listId || !message || !scheduledTime) {
        alert('Mohon lengkapi semua field');
        return;
    }
    
    try {
        await apiCall('/schedules', {
            method: 'POST',
            body: { name, sessionId, listId, message, scheduledTime }
        });
        
        closeModal();
        await loadSchedules();
        alert('✅ Blast berhasil dijadwalkan!');
        
    } catch (err) {
        alert('Gagal menjadwalkan: ' + err.message);
    }
}

async function deleteSchedule(scheduleId) {
    if (!confirm('Hapus jadwal ini?')) return;
    
    try {
        await apiCall(`/schedules/${scheduleId}`, { method: 'DELETE' });
        await loadSchedules();
        alert('✅ Jadwal dihapus');
    } catch (err) {
        alert('Gagal: ' + err.message);
    }
}

// ==================== TAB ANALITIK ====================

async function loadAnalytics() {
    try {
        const result = await apiCall('/analytics/overview');
        
        document.getElementById('analytics-sent').textContent = result.messages?.today?.success || 0;
        document.getElementById('analytics-failed').textContent = result.messages?.today?.failed || 0;
        document.getElementById('analytics-recipients').textContent = result.messages?.today?.total || 0;
        
        const rate = result.messages?.today?.successRate || 0;
        document.getElementById('analytics-rate').textContent = rate + '%';
        
        const logs = await apiCall('/analytics/logs?limit=50');
        const tbody = document.getElementById('logs-tbody');
        
        if (logs.logs && logs.logs.length > 0) {
            tbody.innerHTML = logs.logs.map(log => `
                <tr>
                    <td>${new Date(log.timestamp || log.sent_at).toLocaleString('id-ID')}</td>
                    <td>${log.sessionId || log.session_id}</td>
                    <td>${log.recipient}</td>
                    <td>${log.message?.substring(0, 50) || ''}...</td>
                    <td><span class="status-badge ${log.status}">${log.status === 'sent' ? 'terkirim' : 'gagal'}</span></td>
                </tr>
            `).join('');
        }
        
    } catch (err) {
        console.error('Error memuat analitik:', err);
    }
}

// ==================== EVENT DELEGATION ====================

function setupEventDelegation() {
    document.querySelectorAll('[data-action]').forEach(el => {
        el.addEventListener('click', async (e) => {
            e.preventDefault();
            const action = el.dataset.action;
            const id = el.dataset.id;
            
            switch(action) {
                case 'delete-session':
                    await deleteSession(id);
                    break;
                case 'show-qr':
                    await showQR(id);
                    break;
                case 'view-contacts':
                    await viewContacts(id);
                    break;
                case 'use-template':
                    useTemplate(id);
                    break;
                case 'delete-template':
                    await deleteTemplate(id);
                    break;
                case 'delete-schedule':
                    await deleteSchedule(id);
                    break;
            }
        });
    });
}

// ==================== INISIALISASI ====================

document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const tabName = item.dataset.tab;
            switchTab(tabName);
        });
    });
    
    document.getElementById('btn-create-session')?.addEventListener('click', createSessionWithQR);
    document.getElementById('btn-send-blast')?.addEventListener('click', sendBlast);
    document.getElementById('btn-instant-blast')?.addEventListener('click', sendInstantBlast);
    document.getElementById('btn-advanced-blast')?.addEventListener('click', sendAdvancedBlast);
    document.getElementById('btn-stealth-instant')?.addEventListener('click', sendStealthInstant);
    document.getElementById('btn-validate-numbers')?.addEventListener('click', validateNumbers);
    document.getElementById('btn-warmup')?.addEventListener('click', warmupAccount);
    document.getElementById('btn-ultra-safe')?.addEventListener('click', sendUltraSafeBlast);
    document.getElementById('btn-create-list')?.addEventListener('click', createContactList);
    document.getElementById('btn-create-template')?.addEventListener('click', createTemplate);
    document.getElementById('btn-create-schedule')?.addEventListener('click', createSchedule);
    
    document.querySelector('.close-modal')?.addEventListener('click', closeModal);
    document.getElementById('modal')?.addEventListener('click', (e) => {
        if (e.target.id === 'modal' || e.target.classList.contains('modal-backdrop')) {
            closeModal();
        }
    });
    
    loadOverview();
    
    setInterval(() => {
        const activeTab = document.querySelector('.nav-item.active')?.dataset.tab;
        if (activeTab) loadTabData(activeTab);
    }, 10000);
});

window.showQR = showQR;
window.deleteSession = deleteSession;
window.sendBlast = sendBlast;
window.sendInstantBlast = sendInstantBlast;
window.sendAdvancedBlast = sendAdvancedBlast;
window.sendStealthInstant = sendStealthInstant;
window.validateNumbers = validateNumbers;
window.warmupAccount = warmupAccount;
window.sendUltraSafeBlast = sendUltraSafeBlast;
window.createContactList = createContactList;
window.saveContactList = saveContactList;
window.viewContacts = viewContacts;
window.deleteContactList = deleteContactList;
window.createTemplate = createTemplate;
window.saveTemplate = saveTemplate;
window.deleteTemplate = deleteTemplate;
window.useTemplate = useTemplate;
window.createSchedule = createSchedule;
window.saveSchedule = saveSchedule;
window.deleteSchedule = deleteSchedule;
