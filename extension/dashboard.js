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

// ==================== KOMUNIKASI API ====================

async function apiCall(method, endpoint, data) {
    return new Promise((resolve, reject) => {
        chrome.runtime.sendMessage({
            action: 'apiCall',
            method,
            endpoint,
            data
        }, response => {
            if (chrome.runtime.lastError) {
                console.error('Chrome runtime error:', chrome.runtime.lastError);
                reject(new Error(chrome.runtime.lastError.message));
                return;
            }
            
            if (!response) {
                console.error('No response from background script');
                reject(new Error('No response from background script'));
                return;
            }
            
            if (response.error) {
                console.error('API Error:', response.error);
                console.error('Details:', response.details);
                
                // Show user-friendly error
                if (response.details && response.details.includes('Backend might not be running')) {
                    alert('❌ Backend server tidak berjalan!\n\nSolusi:\n1. Buka terminal/cmd\n2. cd ke folder backend\n3. Jalankan: npm start\n4. Refresh halaman ini');
                } else {
                    alert(`❌ Error: ${response.error}\n\n${response.details || ''}`);
                }
                
                reject(new Error(response.error));
                return;
            }
            
            resolve(response);
        });
    });
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
        const sessions = await apiCall('GET', '/sessions');
        const analytics = await apiCall('GET', '/analytics/overview');
        const contacts = await apiCall('GET', '/contacts/lists');
        const schedules = await apiCall('GET', '/schedules');
        
        document.getElementById('stat-sessions').textContent = sessions.sessions?.length || 0;
        document.getElementById('stat-today').textContent = analytics.total_sent || 0;
        document.getElementById('stat-contacts').textContent = contacts.lists?.length || 0;
        document.getElementById('stat-scheduled').textContent = schedules.schedules?.filter(s => s.status === 'pending').length || 0;
        
        const logs = await apiCall('GET', '/analytics/logs?limit=10');
        const tbody = document.getElementById('activity-tbody');
        
        if (logs.logs && logs.logs.length > 0) {
            tbody.innerHTML = logs.logs.map(log => `
                <tr>
                    <td>${new Date(log.sent_at).toLocaleString('id-ID')}</td>
                    <td>${log.session_id}</td>
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
        const result = await apiCall('GET', '/sessions');
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
                        <h3>${session.id}</h3>
                        <span class="status-badge ${session.connected ? 'connected' : 'disconnected'}">
                            ${session.connected ? '● Terhubung' : '○ Terputus'}
                        </span>
                    </div>
                    <button class="btn-delete" data-action="delete-session" data-id="${session.id}">Hapus</button>
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
                    <button class="btn-secondary btn-block" data-action="show-qr" data-id="${session.id}">
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
        
        const result = await apiCall('POST', '/session/create', { sessionId: sessionId.trim() });
        
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
        
        const result = await apiCall('GET', `/session/qr/${sessionId}`);
        
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
                const status = await apiCall('GET', `/session/status/${sessionId}`);
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
        await apiCall('DELETE', `/session/${sessionId}`);
        await loadSessions();
        alert('Sesi berhasil dihapus');
    } catch (err) {
        alert('Gagal menghapus sesi: ' + err.message);
    }
}

// ==================== TAB BLAST ====================

// Form persistence helpers
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
        
        // Restore values after a small delay to ensure options are loaded
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
        const sessions = await apiCall('GET', '/sessions');
        const sessionSelect = document.getElementById('blast-session');
        sessionSelect.innerHTML = '<option value="">Pilih sesi...</option>' + 
            sessions.sessions.filter(s => s.connected).map(s => 
                `<option value="${s.id}">${s.id}</option>`
            ).join('');
        
        const contacts = await apiCall('GET', '/contacts/lists');
        const contactsSelect = document.getElementById('blast-contacts');
        contactsSelect.innerHTML = '<option value="">Pilih daftar kontak...</option>' + 
            (contacts.lists?.map(l => 
                `<option value="${l.id}">${l.name} (${l.contact_count} kontak)</option>`
            ).join('') || '');
        
        const templates = await apiCall('GET', '/templates');
        const templateSelect = document.getElementById('blast-template');
        templateSelect.innerHTML = '<option value="">Pilih template atau tulis manual...</option>' + 
            (templates.templates?.map(t => 
                `<option value="${t.id}">${t.name}</option>`
            ).join('') || '');
        
        templateSelect.onchange = function(e) {
            if (e.target.value) {
                apiCall('GET', `/templates/${e.target.value}`).then(template => {
                    // Check multiple possible field names with fallback
                    const messageContent = template.content || template.message || template.text || '';
                    
                    // Only update if we have valid content
                    if (messageContent && messageContent !== 'undefined') {
                        document.getElementById('blast-message').value = messageContent;
                        saveBlastFormState(); // Save after template load
                    } else {
                        console.warn('Template tidak memiliki konten:', template);
                    }
                }).catch(err => {
                    console.error('Error loading template:', err);
                });
            } else {
                // Template cleared, save state
                saveBlastFormState();
            }
        };
        
        // Add auto-save on form field changes
        document.getElementById('blast-session')?.addEventListener('change', saveBlastFormState);
        document.getElementById('blast-contacts')?.addEventListener('change', saveBlastFormState);
        document.getElementById('blast-message')?.addEventListener('input', saveBlastFormState);
        document.getElementById('blast-delay')?.addEventListener('input', saveBlastFormState);
        document.querySelectorAll('input[name="blast-mode"]').forEach(radio => {
            radio.addEventListener('change', saveBlastFormState);
        });
        
        // Restore previous form state
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
        
        const result = await apiCall('POST', '/send/bulk', {
            sessionId,
            listId,
            message,
            delay
        });
        
        closeModal();
        alert(`✅ Blast dimulai!\nID Tugas: ${result.jobId}\nPenerima: ${result.recipients || 'Memproses...'}`);
        
        // Clear form after successful blast
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

Ini adalah mode KECEPATAN MAKSIMAL - gunakan dengan risiko sendiri!

Kirim ke ${document.getElementById('blast-contacts').selectedOptions[0].text}?
    `);
    
    if (!confirmed) return;
    
    const doubleConfirm = confirm('⚠️ PERINGATAN TERAKHIR: Ini dapat membuat akun Anda dibanned. Lanjutkan?');
    if (!doubleConfirm) return;
    
    try {
        showBlastProgress('⚡ Instan Blast Berjalan...', 'Mengirim ke semua kontak bersamaan... Mode kecepatan maksimal aktif!');
        
        const result = await apiCall('POST', '/blast/instant', {
            sessionId,
            listId,
            message
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
                    <p style="font-size: 14px; margin-top: 16px; color: #666;">
                        ID Tugas: ${result.jobId}
                    </p>
                </div>
                <button class="btn-primary" id="btn-done" style="margin-top: 20px;">Selesai</button>
            </div>
        `);
        
        document.getElementById('btn-done')?.addEventListener('click', closeModal);
        
        // Clear form after successful instant blast
        document.getElementById('blast-message').value = '';
        localStorage.removeItem('wablast-form-state');
        
    } catch (err) {
        closeModal();
        alert('❌ Instan blast gagal: ' + err.message);
    }
}

// ==================== FUNGSI BLAST CANGGIH ====================
async function sendAdvancedBlast() {
    const sessionId = document.getElementById('blast-session')?.value;
    const listId = document.getElementById('blast-contacts')?.value;
    const message = document.getElementById('blast-message')?.value?.trim();
    const mode = document.getElementById('blast-mode')?.value || 'aggressive';

    if (!sessionId || !listId || !message) {
        alert('⚠️ Mohon lengkapi semua field yang diperlukan');
        return;
    }

    // Deskripsi mode
    const modeInfo = {
        safe: 'Mode Aman (50/jam, risiko minimal)',
        aggressive: 'Agresif (200/jam, risiko sedang)',
        insane: 'Ekstrim (1000/jam, risiko tinggi)'
    };

    // Dialog konfirmasi
    const confirmed = confirm(
        `🛡️ MODE ANTI-DETEKSI CANGGIH\n\n` +
        `Mode: ${modeInfo[mode]}\n\n` +
        `Fitur:\n` +
        `✓ Variasi pesan (5-10 versi)\n` +
        `✓ Simulasi perilaku manusia\n` +
        `✓ Jeda adaptif\n` +
        `✓ Istirahat berkala\n` +
        `✓ Rotasi proxy (jika dikonfigurasi)\n\n` +
        `Lanjutkan dengan blast canggih?`
    );

    if (!confirmed) return;

    try {
        showBlastProgress('🛡️ Blast Canggih Berjalan...', 'Menggunakan teknik anti-deteksi... Ini mungkin memakan waktu.');

        const response = await fetch('https://wa.tuanmuda.id/api/blast/advanced', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sessionId, listId, message, mode })
        });

        const result = await response.json();
        
        hideBlastProgress();

        if (result.success !== undefined) {
            // Update tampilan statistik
            updateBlastStats(result.total, result.success, result.failed);
            
            // Modal sukses
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
                        <p style="font-size: 14px; margin-top: 16px; color: #666;">
                            Mode: ${modeInfo[mode]}
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
        console.error('Error blast canggih:', err);
    }
}

// ==================== INSTAN TERSEMBUNYI ====================
async function sendStealthInstant() {
    const sessionId = document.getElementById('blast-session')?.value;
    const listId = document.getElementById('blast-contacts')?.value;
    const message = document.getElementById('blast-message')?.value?.trim();

    if (!sessionId || !listId || !message) {
        alert('⚠️ Mohon lengkapi semua field yang diperlukan');
        return;
    }

    // Konfirmasi pertama
    const confirm1 = confirm(
        `⚫ INSTAN TERSEMBUNYI BLAST\n\n` +
        `⚠️ PERINGATAN:\n` +
        `• Kirim ke semua kontak dengan micro-delay (50-200ms)\n` +
        `• Menggunakan variasi pesan untuk penyamaran\n` +
        `• Risiko banned Sedang-Tinggi\n` +
        `• Lebih baik dari instan biasa, tapi tetap berisiko\n\n` +
        `Lanjutkan?`
    );
    if (!confirm1) return;

    // Konfirmasi final
    const confirm2 = confirm(
        `⚫ KONFIRMASI TERAKHIR\n\n` +
        `Akun ini masih bisa dibanned.\n` +
        `Rekomendasi: Gunakan nomor WhatsApp sekali pakai saja!\n\n` +
        `Lanjutkan dengan instan tersembunyi blast?`
    );
    if (!confirm2) return;

    try {
        showBlastProgress('⚫ Instan Tersembunyi Berjalan...', 'Kecepatan maksimal dengan teknik penghindaran aktif!');

        const response = await fetch('https://wa.tuanmuda.id/api/blast/stealth-instant', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sessionId, listId, message })
        });

        const result = await response.json();
        
        hideBlastProgress();

        if (result.success !== undefined) {
            // Update stats
            updateBlastStats(result.total, result.success, result.failed);
            
            // Modal sukses
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
                        <p style="font-size: 14px; margin-top: 16px; color: #666;">
                            Micro-delay: 50-200ms per pesan
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
        console.error('Error instan tersembunyi:', err);
    }
}

// ==================== VALIDASI NOMOR (BARU) ====================
async function validateNumbers() {
    const sessionId = document.getElementById('blast-session')?.value;
    const listId = document.getElementById('blast-contacts')?.value;

    if (!sessionId || !listId) {
        alert('Mohon pilih sesi dan daftar kontak');
        return;
    }

    if (!confirm('Validasi semua nomor dalam daftar ini?\n\nIni akan mengecek setiap nomor di WhatsApp dan menandai yang tidak valid.')) {
        return;
    }

    try {
        showBlastProgress('✅ Memvalidasi Nomor...', 'Mengecek nomor mana saja yang ada di WhatsApp... Ini mungkin memakan beberapa menit.');

        const response = await fetch('https://wa.tuanmuda.id/api/contacts/validate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sessionId, listId })
        });

        const result = await response.json();
        
        hideBlastProgress();

        if (result.success) {
            showModal(`
                <div style="text-align: center; padding: 40px;">
                    <div style="font-size: 80px; margin-bottom: 20px;">✅</div>
                    <h2 style="color: #10b981; margin-bottom: 16px;">Validasi Selesai!</h2>
                    <div style="background: #f0fdf4; padding: 20px; border-radius: 12px; margin: 20px 0; border-left: 4px solid #10b981;">
                        <p style="font-size: 18px; margin: 8px 0;">
                            <strong style="color: #10b981;">✅ Valid: ${result.valid.length}</strong>
                        </p>
                        <p style="font-size: 18px; margin: 8px 0;">
                            <strong style="color: #ef4444;">❌ Tidak Valid: ${result.invalid.length}</strong>
                        </p>
                        <p style="font-size: 16px; margin: 8px 0; color: #666;">
                            Total: ${result.total} nomor diperiksa
                        </p>
                    </div>
                    <p style="color: #666; font-size: 14px; margin-top: 16px;">Nomor tidak valid telah ditandai di database dan tidak akan digunakan dalam blast berikutnya</p>
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
        console.error('Error validasi:', err);
    }
}

// ==================== PEMANASAN AKUN (BARU) ====================
async function warmupAccount() {
    const sessionId = document.getElementById('blast-session')?.value;
    const listId = document.getElementById('blast-contacts')?.value;

    if (!sessionId || !listId) {
        alert('Mohon pilih sesi dan daftar kontak');
        return;
    }

    if (!confirm('Panaskan akun dengan chat acak?\n\nIni akan mengirim 5 pesan ramah acak untuk simulasi perilaku manusia sebelum blast Anda.')) {
        return;
    }

    try {
        showBlastProgress('🔥 Memanaskan Akun...', 'Mengirim chat acak untuk simulasi aktivitas manusia... Memakan waktu sekitar 1-2 menit.');

        const response = await fetch('https://wa.tuanmuda.id/api/warmup/random-chats', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sessionId, listId })
        });

        const result = await response.json();
        
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
                        <p style="font-size: 16px; margin: 8px 0; color: #92400e;">
                            Akun berhasil dipanaskan!
                        </p>
                    </div>
                    <p style="color: #666; font-size: 14px; margin-top: 16px;">Akun Anda sekarang terlihat lebih manusiawi dan aktif. Aman untuk melanjutkan blast!</p>
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
        console.error('Error pemanasan:', err);
    }
}

// ==================== BLAST ULTRA AMAN (BARU) ====================
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
        `Ini adalah mode blast TERAMAN yang tersedia!\n\n` +
        `Proses:\n` +
        `1️⃣ Validasi semua nomor telepon\n` +
        `2️⃣ Panaskan akun dengan chat acak\n` +
        `3️⃣ Kirim HANYA ke nomor valid\n` +
        `4️⃣ Gunakan variasi pesan\n` +
        `5️⃣ Simulasi perilaku manusia\n` +
        `6️⃣ Jeda adaptif (5-15 detik)\n` +
        `7️⃣ Istirahat berkala setiap 20 pesan\n\n` +
        `⏱️ Ini akan memakan waktu lebih lama tapi JAUH lebih aman!\n\n` +
        `Lanjutkan dengan blast ultra aman?`
    );

    if (!confirmed) return;

    try {
        showBlastProgress('🛡️ Blast Ultra Aman Berjalan...', 'Langkah 1: Validasi nomor... Langkah 2: Pemanasan... Langkah 3: Kirim dengan aman... Ini akan memakan waktu.');

        const response = await fetch('https://wa.tuanmuda.id/api/blast/ultra-safe', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sessionId, listId, message })
        });

        const result = await response.json();
        
        hideBlastProgress();

        if (result.success !== undefined) {
            updateBlastStats(result.total, result.success, result.failed);
            
            showModal(`
                <div style="text-align: center; padding: 40px;">
                    <div style="font-size: 80px; margin-bottom: 20px;">🛡️</div>
                    <h2 style="color: #8b5cf6; margin-bottom: 16px;">Blast Ultra Aman Selesai!</h2>
                    <div style="background: linear-gradient(135deg, rgba(139, 92, 246, 0.1) 0%, rgba(124, 58, 237, 0.1) 100%); padding: 20px; border-radius: 12px; margin: 20px 0; border-left: 4px solid #8b5cf6;">
                        <p style="font-size: 16px; margin: 8px 0; color: #666;">
                            <strong>Langkah 1 - Validasi:</strong><br>
                            ✅ ${result.validation.valid.length} valid | ❌ ${result.validation.invalid.length} tidak valid
                        </p>
                        <p style="font-size: 16px; margin: 8px 0; color: #666;">
                            <strong>Langkah 2 - Pemanasan:</strong> ✅ Selesai
                        </p>
                        <hr style="border: none; border-top: 1px solid rgba(139, 92, 246, 0.2); margin: 12px 0;">
                        <p style="font-size: 18px; margin: 8px 0;">
                            <strong style="color: #10b981;">✅ Sukses: ${result.success}</strong>
                        </p>
                        <p style="font-size: 18px; margin: 8px 0;">
                            <strong style="color: #ef4444;">❌ Gagal: ${result.failed}</strong>
                        </p>
                        <p style="font-size: 16px; margin: 8px 0; color: #666;">
                            Total terkirim: ${result.total} kontak
                        </p>
                        <p style="font-size: 16px; margin: 8px 0; color: #8b5cf6;">
                            📈 Tingkat Sukses: ${((result.success / result.total) * 100).toFixed(1)}%
                        </p>
                    </div>
                    <p style="color: #666; font-size: 14px; margin-top: 16px;">✅ Blast selesai dengan langkah keamanan maksimal!</p>
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
        console.error('Error blast ultra aman:', err);
    }
}

// ==================== TAB KONTAK ====================

async function loadContacts() {
    try {
        const result = await apiCall('GET', '/contacts/lists');
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
6282245849598
6285974200665"></textarea>
                <small style="color: #718096; margin-top: 8px; display: block;">
                    💡 Paste semua nomor sekaligus
                </small>
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
        
        const listResult = await apiCall('POST', '/contacts/list', {
            name,
            description: description || ''
        });
        
        const contacts = numbers.map(number => ({ number, name: '' }));
        
        await apiCall('POST', '/contacts/add', {
            listId: listResult.listId,
            contacts
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
        
        const result = await apiCall('GET', `/contacts/list/${listId}`);
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
        await apiCall('DELETE', `/contacts/list/${listId}`);
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
        const result = await apiCall('GET', '/templates');
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
                <textarea id="template-content" class="form-control" rows="8" placeholder="Masukkan template pesan Anda...

Anda bisa menggunakan variabel seperti:
{name} - Nama pelanggan
{product} - Nama produk
{date} - Tanggal saat ini"></textarea>
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
        await apiCall('POST', '/templates', {
            name,
            content,
            variables: '[]'
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
        await apiCall('DELETE', `/templates/${templateId}`);
        await loadTemplates();
        alert('✅ Template dihapus');
    } catch (err) {
        alert('Gagal: ' + err.message);
    }
}

function useTemplate(templateId) {
    switchTab('blast');
    
    setTimeout(() => {
        apiCall('GET', `/templates/${templateId}`).then(template => {
            document.getElementById('blast-message').value = template.content;
            document.getElementById('blast-template').value = templateId;
        });
    }, 100);
}

// ==================== TAB JADWAL ====================

async function loadSchedules() {
    try {
        const result = await apiCall('GET', '/schedules');
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
        const sessions = await apiCall('GET', '/sessions');
        document.getElementById('schedule-session').innerHTML = '<option value="">Pilih sesi...</option>' + 
            sessions.sessions.filter(s => s.connected).map(s => `<option value="${s.id}">${s.id}</option>`).join('');
        
        const contacts = await apiCall('GET', '/contacts/lists');
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
        await apiCall('POST', '/schedules', {
            name,
            sessionId,
            listId,
            message,
            scheduledTime
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
        await apiCall('DELETE', `/schedules/${scheduleId}`);
        await loadSchedules();
        alert('✅ Jadwal dihapus');
    } catch (err) {
        alert('Gagal: ' + err.message);
    }
}

// ==================== TAB ANALITIK ====================

async function loadAnalytics() {
    try {
        const result = await apiCall('GET', '/analytics/overview');
        
        document.getElementById('analytics-sent').textContent = result.total_sent || 0;
        document.getElementById('analytics-failed').textContent = result.total_failed || 0;
        document.getElementById('analytics-recipients').textContent = result.total_recipients || 0;
        
        const total = (result.total_sent || 0) + (result.total_failed || 0);
        const rate = total > 0 ? Math.round((result.total_sent / total) * 100) : 0;
        document.getElementById('analytics-rate').textContent = rate + '%';
        
        const logs = await apiCall('GET', '/analytics/logs?limit=50');
        const tbody = document.getElementById('logs-tbody');
        
        if (logs.logs && logs.logs.length > 0) {
            tbody.innerHTML = logs.logs.map(log => `
                <tr>
                    <td>${new Date(log.sent_at).toLocaleString('id-ID')}</td>
                    <td>${log.session_id}</td>
                    <td>${log.recipient}</td>
                    <td>${log.message.substring(0, 50)}...</td>
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
    // Navigasi tab
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const tabName = item.dataset.tab;
            switchTab(tabName);
        });
    });
    
    // Event listener tombol
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
    
    // Kontrol modal
    document.querySelector('.close-modal')?.addEventListener('click', closeModal);
    document.getElementById('modal')?.addEventListener('click', (e) => {
        if (e.target.id === 'modal' || e.target.classList.contains('modal-backdrop')) {
            closeModal();
        }
    });
    
    // Muat awal
    loadOverview();
    
    // Auto-refresh setiap 10 detik
    setInterval(() => {
        const activeTab = document.querySelector('.nav-item.active')?.dataset.tab;
        if (activeTab) loadTabData(activeTab);
    }, 10000);
});

// Expose fungsi secara global
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