// script.js

// State Management
let currentjadwalId = null;
let customActivityCounter = 0;
let chartInstance = null;

// Kecepatan transportasi (km/jam)
const KECEPATAN_TRANSPORTASI = {
    'jalan_kaki': 20,
    'sepeda': 35,
    'motor': 60,
    'mobil': 55,
    'transportasi_umum': 45
};

const NAMA_TRANSPORTASI = {
    'jalan_kaki': 'Jalan Kaki',
    'sepeda': 'Sepeda',
    'motor': 'Motor',
    'mobil': 'Mobil',
    'transportasi_umum': 'Transportasi Umum'
};

// Inisialisasi
$(document).ready(function() {
    initializeApp();
    setupEventListeners();
});

// Inisialisasi Aplikasi
function initializeApp() {
    loadjadwals();
    showPage('page-start');
}

// Setup Event Listeners
function setupEventListeners() {
    // Navigasi
    $('#btn-create-jadwal').click(function() {
        resetjadwalForm();
        showPage('page-jadwal');
    });

    $('#btn-back-start').click(function() {
        showPage('page-start');
    });

    $('#btn-back-home').click(function() {
        showPage('page-start');
        loadjadwals();
    });

    $('#btn-back-jadwal').click(function() {
        showPage('page-jadwal');
    });

    // Form submission
    $('#form-jadwal').submit(function(e) {
        e.preventDefault();
        savejadwalAndCalculate();
    });

    // Checkbox aktivitas optional
    $('#checkbox-makan').change(function() {
        $('#durasi-makan-container').toggle(this.checked);
        if (!this.checked) $('#durasi-makan').val('');
    });

    $('#checkbox-mandi').change(function() {
        $('#durasi-mandi-container').toggle(this.checked);
        if (!this.checked) $('#durasi-mandi').val('');
    });

    // Tambah aktivitas custom
    $('#btn-add-custom').click(function() {
        addCustomActivity();
    });
}

// Load jadwals dari localStorage
function loadjadwals() {
    const jadwals = getjadwals();
    const jadwalList = $('#jadwal-list');
    jadwalList.empty();

    if (jadwals.length === 0) {
        jadwalList.html('<p class="text-muted">Belum ada jadwal tersimpan</p>');
        return;
    }

    jadwals.forEach(function(jadwal) {
        const jadwalCard = $(`
            <div class="jadwal-card">
                <div class="jadwal-actions">
                    <button class="btn btn-sm btn-warning btn-edit-jadwal" data-id="${jadwal.id}">
                        <i class="fas fa-edit"></i> Edit
                    </button>
                    <button class="btn btn-sm btn-danger btn-delete-jadwal" data-id="${jadwal.id}">
                        <i class="fas fa-trash"></i> Hapus
                    </button>
                </div>
                <div class="jadwal-name">${jadwal.name}</div>
                <div class="jadwal-info">
                    <i class="fas fa-route"></i> ${jadwal.jarak} km | 
                    <i class="fas fa-motorcycle"></i> ${NAMA_TRANSPORTASI[jadwal.transportasi]} | 
                    <i class="fas fa-clock"></i> Berangkat ${jadwal.jamBerangkat}
                </div>
            </div>
        `);

        // Click untuk kalkulasi langsung
        jadwalCard.click(function(e) {
            if (!$(e.target).closest('.jadwal-actions').length) {
                loadjadwal(jadwal.id);
                calculateAndShowResult();
            }
        });

        jadwalList.append(jadwalCard);
    });

    // Event untuk edit dan hapus
    $('.btn-edit-jadwal').click(function(e) {
        e.stopPropagation();
        const id = $(this).data('id');
        loadjadwal(id);
        showPage('page-jadwal');
    });

    $('.btn-delete-jadwal').click(function(e) {
        e.stopPropagation();
        const id = $(this).data('id');
        if (confirm('Yakin ingin menghapus jadwal ini?')) {
            deletejadwal(id);
            loadjadwals();
        }
    });
}

// Get jadwals dari localStorage
function getjadwals() {
    const jadwals = localStorage.getItem('antiTelatjadwals');
    return jadwals ? JSON.parse(jadwals) : [];
}

// Save jadwal ke localStorage
function savejadwal(jadwalData) {
    let jadwals = getjadwals();
    
    if (jadwalData.id) {
        // Update existing
        jadwals = jadwals.map(p => p.id === jadwalData.id ? jadwalData : p);
    } else {
        // Create new
        jadwalData.id = 'jadwal_' + Date.now();
        jadwals.push(jadwalData);
    }
    
    localStorage.setItem('antiTelatjadwals', JSON.stringify(jadwals));
    return jadwalData.id;
}

// Delete jadwal
function deletejadwal(id) {
    let jadwals = getjadwals();
    jadwals = jadwals.filter(p => p.id !== id);
    localStorage.setItem('antiTelatjadwals', JSON.stringify(jadwals));
}

// Load jadwal ke Form
function loadjadwal(id) {
    const jadwals = getjadwals();
    const jadwal = jadwals.find(p => p.id === id);
    
    if (!jadwal) return;
    
    currentjadwalId = id;
    $('#jadwal-id').val(id);
    $('#jadwal-name').val(jadwal.name);
    $('#jarak').val(jadwal.jarak);
    $('#transportasi').val(jadwal.transportasi);
    $('#jam-berangkat').val(jadwal.jamBerangkat);
    $('#waktu-masuk').val(jadwal.waktuMasuk);
    
    // Load aktivitas optional
    if (jadwal.durasi_makan) {
        $('#checkbox-makan').prop('checked', true);
        $('#durasi-makan-container').show();
        $('#durasi-makan').val(jadwal.durasi_makan);
    }
    
    if (jadwal.durasi_mandi) {
        $('#checkbox-mandi').prop('checked', true);
        $('#durasi-mandi-container').show();
        $('#durasi-mandi').val(jadwal.durasi_mandi);
    }
    
    // Load custom activities
    $('#custom-activities-list').empty();
    customActivityCounter = 0;
    if (jadwal.customActivities && jadwal.customActivities.length > 0) {
        jadwal.customActivities.forEach(function(activity) {
            addCustomActivity(activity.name, activity.duration);
        });
    }
    
    $('#jadwal-title').text('Edit jadwal: ' + jadwal.name);
}

// Reset Form
function resetjadwalForm() {
    currentjadwalId = null;
    $('#jadwal-id').val('');
    $('#form-jadwal')[0].reset();
    $('#durasi-makan-container').hide();
    $('#durasi-mandi-container').hide();
    $('#custom-activities-list').empty();
    customActivityCounter = 0;
    $('#jadwal-title').text('Buat jadwal Baru');
}

// Add Custom Activity
function addCustomActivity(name = '', duration = '') {
    customActivityCounter++;
    const activityId = 'custom_' + customActivityCounter;
    
    const activityCard = $(`
        <div class="custom-activity-card" data-id="${activityId}">
            <button type="button" class="btn btn-sm btn-danger btn-remove-activity">
                <i class="fas fa-times"></i>
            </button>
            <div class="row">
                <div class="col-md-6 mb-2">
                    <label class="form-label">Nama Aktivitas</label>
                    <input type="text" class="form-control custom-activity-name" placeholder="Contoh: Sarapan" value="${name}" required>
                </div>
                <div class="col-md-6 mb-2">
                    <label class="form-label">Durasi (menit)</label>
                    <input type="number" class="form-control custom-activity-duration" placeholder="Contoh: 15" min="1" value="${duration}" required>
                </div>
            </div>
        </div>
    `);
    
    activityCard.find('.btn-remove-activity').click(function() {
        activityCard.remove();
    });
    
    $('#custom-activities-list').append(activityCard);
}

// Collect Custom Activities
function collectCustomActivities() {
    const activities = [];
    $('.custom-activity-card').each(function() {
        const name = $(this).find('.custom-activity-name').val();
        const duration = parseInt($(this).find('.custom-activity-duration').val());
        if (name && duration) {
            activities.push({ name, duration });
        }
    });
    return activities;
}

// Save jadwal and Calculate
function savejadwalAndCalculate() {
    const jadwalData = {
        id: $('#jadwal-id').val() || null,
        name: $('#jadwal-name').val(),
        jarak: parseFloat($('#jarak').val()),
        transportasi: $('#transportasi').val(),
        jamBerangkat: $('#jam-berangkat').val(),
        waktuMasuk: $('#waktu-masuk').val(),
        durasi_makan: $('#checkbox-makan').is(':checked') ? parseInt($('#durasi-makan').val()) || 0 : 0,
        durasi_mandi: $('#checkbox-mandi').is(':checked') ? parseInt($('#durasi-mandi').val()) || 0 : 0,
        customActivities: collectCustomActivities()
    };
    
    currentjadwalId = savejadwal(jadwalData);
    calculateAndShowResult();
}

// Calculate and Show Result
function calculateAndShowResult() {
    const jadwals = getjadwals();
    const jadwal = jadwals.find(p => p.id === currentjadwalId);
    
    if (!jadwal) return;
    
    // Hitung durasi perjalanan (dalam menit)
    const kecepatan = KECEPATAN_TRANSPORTASI[jadwal.transportasi];
    const waktuPerjalanan = (jadwal.jarak / kecepatan) * 60;
    
    // Hitung total aktivitas
    let totalAktivitas = 0;
    totalAktivitas += jadwal.durasi_makan || 0;
    totalAktivitas += jadwal.durasi_mandi || 0;
    jadwal.customActivities.forEach(act => totalAktivitas += act.duration);
    
    // Estimasi waktu tercepat (hanya perjalanan)
    const waktuTercepat = waktuPerjalanan;
    
    // Estimasi waktu terlama (perjalanan + semua aktivitas + buffer 20%)
    const waktuTerlama = waktuPerjalanan + totalAktivitas + (waktuPerjalanan * 0.2);
    
    // Parse waktu
    const [jamBerangkat, menitBerangkat] = jadwal.jamBerangkat.split(':').map(Number);
    const [jamMasuk, menitMasuk] = jadwal.waktuMasuk.split(':').map(Number);
    
    // Hitung waktu tiba
    const tibaTercepat = addMinutes(jamBerangkat, menitBerangkat, waktuTercepat);
    const tibaTerlama = addMinutes(jamBerangkat, menitBerangkat, waktuTerlama);
    
    // Hitung persentase telat
    const waktuMasukMenit = jamMasuk * 60 + menitMasuk;
    const tibaTercepatMenit = tibaTercepat.jam * 60 + tibaTercepat.menit;
    const tibaTerlamaMenit = tibaTerlama.jam * 60 + tibaTerlama.menit;
    
    let persentaseTelat = 0;
    let status = '';
    let statusClass = '';
    
    if (tibaTerlamaMenit <= waktuMasukMenit) {
        // Aman
        const selisih = waktuMasukMenit - tibaTercepatMenit;
        persentaseTelat = Math.max(0, Math.round(100 - (selisih / 60) * 20));
        status = 'Aman! Kemungkinan telat sangat kecil 🎉';
        statusClass = 'status-aman';
    } else if (tibaTercepatMenit <= waktuMasukMenit) {
        // Hati-hati
        const keterlambatan = tibaTerlamaMenit - waktuMasukMenit;
        persentaseTelat = Math.min(99, Math.round(50 + (keterlambatan / 30) * 25));
        status = 'Hati-hati! Ada risiko telat ⚠️';
        statusClass = 'status-hati-hati';
    } else {
        // Telat
        persentaseTelat = 100;
        status = 'Telat! Berangkat lebih awal ❌';
        statusClass = 'status-telat';
    }
    
    // Update UI
    $('#result-jadwal-name').text(jadwal.name);
    $('#result-jarak').text(jadwal.jarak + ' km');
    $('#result-transportasi').text(NAMA_TRANSPORTASI[jadwal.transportasi]);
    $('#result-jam-berangkat').text(jadwal.jamBerangkat);
    $('#result-waktu-masuk').text(jadwal.waktuMasuk);
    
    $('#result-tercepat').text(formatTime(tibaTercepat.jam, tibaTercepat.menit));
    $('#result-terlama').text(formatTime(tibaTerlama.jam, tibaTerlama.menit));
    
    $('#result-persentase').text(persentaseTelat + '%');
    $('#result-status').text(status);
    $('#result-persentase').removeClass('status-aman status-hati-hati status-telat').addClass(statusClass);
    
    // Update card color
    $('#persentase-card').removeClass('border-success border-warning border-danger');
    if (statusClass === 'status-aman') {
        $('#persentase-card').addClass('border-success');
    } else if (statusClass === 'status-hati-hati') {
        $('#persentase-card').addClass('border-warning');
    } else {
        $('#persentase-card').addClass('border-danger');
    }
    
    // Rincian aktivitas
    let activitiesHtml = '';
    activitiesHtml += `<div class="activity-item"><strong>Perjalanan:</strong> ${Math.round(waktuPerjalanan)} menit</div>`;
    if (jadwal.durasi_makan) {
        activitiesHtml += `<div class="activity-item"><strong>Makan:</strong> ${jadwal.durasi_makan} menit</div>`;
    }
    if (jadwal.durasi_mandi) {
        activitiesHtml += `<div class="activity-item"><strong>Mandi:</strong> ${jadwal.durasi_mandi} menit</div>`;
    }
    jadwal.customActivities.forEach(act => {
        activitiesHtml += `<div class="activity-item"><strong>${act.name}:</strong> ${act.duration} menit</div>`;
    });
    $('#result-activities').html(activitiesHtml);
    
    // Create chart
    createPercentageChart(persentaseTelat, statusClass);
    
    showPage('page-result');
}

// Helper: Add Minutes to Time
function addMinutes(jam, menit, tambahMenit) {
    let totalMenit = jam * 60 + menit + tambahMenit;
    const newJam = Math.floor(totalMenit / 60) % 24;
    const newMenit = Math.round(totalMenit % 60);
    return { jam: newJam, menit: newMenit };
}

// Helper: Format Time
function formatTime(jam, menit) {
    return String(jam).padStart(2, '0') + ':' + String(menit).padStart(2, '0');
}

// Create Percentage Chart
function createPercentageChart(percentage, statusClass) {
    const ctx = document.getElementById('chart-persentase');
    
    if (chartInstance) {
        chartInstance.destroy();
    }
    
    let color = '';
    if (statusClass === 'status-aman') {
        color = '#28a745';
    } else if (statusClass === 'status-hati-hati') {
        color = '#ffc107';
    } else {
        color = '#dc3545';
    }
    
    chartInstance = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Risiko Telat', 'Aman'],
            datasets: [{
                data: [percentage, 100 - percentage],
                backgroundColor: [color, '#e9ecef'],
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    display: true,
                    position: 'bottom'
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return context.label + ': ' + context.parsed + '%';
                        }
                    }
                }
            }
        }
    });
}

// Show Page
function showPage(pageId) {
    $('.page').removeClass('active');
    $('#' + pageId).addClass('active');
    
    // Scroll to top
    window.scrollTo(0, 0);
}// Setup Event Listeners
function setupEventListeners() {
    // Navigasi
    $('#btn-create-preset').click(function() {
        resetPresetForm();
        showPage('page-preset');
    });

    $('#btn-back-start').click(function() {
        showPage('page-start');
    });

    $('#btn-back-home').click(function() {
        showPage('page-start');
        loadPresets();
    });

    $('#btn-back-preset').click(function() {
        showPage('page-preset');
    });

    // Form submission
    $('#form-preset').submit(function(e) {
        e.preventDefault();
        savePresetAndCalculate();
    });

    // Checkbox aktivitas optional
    $('#checkbox-makan').change(function() {
        $('#durasi-makan-container').toggle(this.checked);
        if (!this.checked) $('#durasi-makan').val('');
    });

    $('#checkbox-mandi').change(function() {
        $('#durasi-mandi-container').toggle(this.checked);
        if (!this.checked) $('#durasi-mandi').val('');
    });

    // Tambah aktivitas custom
    $('#btn-add-custom').click(function() {
        addCustomActivity();
    });
}

// Load Presets dari localStorage
function loadPresets() {
    const presets = getPresets();
    const presetList = $('#preset-list');
    presetList.empty();

    if (presets.length === 0) {
        presetList.html('<p class="text-muted">Belum ada preset tersimpan</p>');
        return;
    }

    presets.forEach(function(preset) {
        const presetCard = $(`
            <div class="preset-card">
                <div class="preset-actions">
                    <button class="btn btn-sm btn-warning btn-edit-preset" data-id="${preset.id}">
                        <i class="fas fa-edit"></i> Edit
                    </button>
                    <button class="btn btn-sm btn-danger btn-delete-preset" data-id="${preset.id}">
                        <i class="fas fa-trash"></i> Hapus
                    </button>
                </div>
                <div class="preset-name">${preset.name}</div>
                <div class="preset-info">
                    <i class="fas fa-route"></i> ${preset.jarak} km | 
                    <i class="fas fa-motorcycle"></i> ${NAMA_TRANSPORTASI[preset.transportasi]} | 
                    <i class="fas fa-clock"></i> Berangkat ${preset.jamBerangkat}
                </div>
            </div>
        `);

        // Click untuk kalkulasi langsung
        presetCard.click(function(e) {
            if (!$(e.target).closest('.preset-actions').length) {
                loadPreset(preset.id);
                calculateAndShowResult();
            }
        });

        presetList.append(presetCard);
    });

    // Event untuk edit dan hapus
    $('.btn-edit-preset').click(function(e) {
        e.stopPropagation();
        const id = $(this).data('id');
        loadPreset(id);
        showPage('page-preset');
    });

    $('.btn-delete-preset').click(function(e) {
        e.stopPropagation();
        const id = $(this).data('id');
        if (confirm('Yakin ingin menghapus preset ini?')) {
            deletePreset(id);
            loadPresets();
        }
    });
}

// Get Presets dari localStorage
function getPresets() {
    const presets = localStorage.getItem('antiTelatPresets');
    return presets ? JSON.parse(presets) : [];
}

// Save Preset ke localStorage
function savePreset(presetData) {
    let presets = getPresets();
    
    if (presetData.id) {
        // Update existing
        presets = presets.map(p => p.id === presetData.id ? presetData : p);
    } else {
        // Create new
        presetData.id = 'preset_' + Date.now();
        presets.push(presetData);
    }
    
    localStorage.setItem('antiTelatPresets', JSON.stringify(presets));
    return presetData.id;
}

// Delete Preset
function deletePreset(id) {
    let presets = getPresets();
    presets = presets.filter(p => p.id !== id);
    localStorage.setItem('antiTelatPresets', JSON.stringify(presets));
}

// Load Preset ke Form
function loadPreset(id) {
    const presets = getPresets();
    const preset = presets.find(p => p.id === id);
    
    if (!preset) return;
    
    currentPresetId = id;
    $('#preset-id').val(id);
    $('#preset-name').val(preset.name);
    $('#jarak').val(preset.jarak);
    $('#transportasi').val(preset.transportasi);
    $('#jam-berangkat').val(preset.jamBerangkat);
    $('#waktu-masuk').val(preset.waktuMasuk);
    
    // Load aktivitas optional
    if (preset.durasi_makan) {
        $('#checkbox-makan').prop('checked', true);
        $('#durasi-makan-container').show();
        $('#durasi-makan').val(preset.durasi_makan);
    }
    
    if (preset.durasi_mandi) {
        $('#checkbox-mandi').prop('checked', true);
        $('#durasi-mandi-container').show();
        $('#durasi-mandi').val(preset.durasi_mandi);
    }
    
    // Load custom activities
    $('#custom-activities-list').empty();
    customActivityCounter = 0;
    if (preset.customActivities && preset.customActivities.length > 0) {
        preset.customActivities.forEach(function(activity) {
            addCustomActivity(activity.name, activity.duration);
        });
    }
    
    $('#preset-title').text('Edit Preset: ' + preset.name);
}

// Reset Form
function resetPresetForm() {
    currentPresetId = null;
    $('#preset-id').val('');
    $('#form-preset')[0].reset();
    $('#durasi-makan-container').hide();
    $('#durasi-mandi-container').hide();
    $('#custom-activities-list').empty();
    customActivityCounter = 0;
    $('#preset-title').text('Buat Preset Baru');
}

// Add Custom Activity
function addCustomActivity(name = '', duration = '') {
    customActivityCounter++;
    const activityId = 'custom_' + customActivityCounter;
    
    const activityCard = $(`
        <div class="custom-activity-card" data-id="${activityId}">
            <button type="button" class="btn btn-sm btn-danger btn-remove-activity">
                <i class="fas fa-times"></i>
            </button>
            <div class="row">
                <div class="col-md-6 mb-2">
                    <label class="form-label">Nama Aktivitas</label>
                    <input type="text" class="form-control custom-activity-name" placeholder="Contoh: Sarapan" value="${name}" required>
                </div>
                <div class="col-md-6 mb-2">
                    <label class="form-label">Durasi (menit)</label>
                    <input type="number" class="form-control custom-activity-duration" placeholder="Contoh: 15" min="1" value="${duration}" required>
                </div>
            </div>
        </div>
    `);
    
    activityCard.find('.btn-remove-activity').click(function() {
        activityCard.remove();
    });
    
    $('#custom-activities-list').append(activityCard);
}

// Collect Custom Activities
function collectCustomActivities() {
    const activities = [];
    $('.custom-activity-card').each(function() {
        const name = $(this).find('.custom-activity-name').val();
        const duration = parseInt($(this).find('.custom-activity-duration').val());
        if (name && duration) {
            activities.push({ name, duration });
        }
    });
    return activities;
}

// Save Preset and Calculate
function savePresetAndCalculate() {
    const presetData = {
        id: $('#preset-id').val() || null,
        name: $('#preset-name').val(),
        jarak: parseFloat($('#jarak').val()),
        transportasi: $('#transportasi').val(),
        jamBerangkat: $('#jam-berangkat').val(),
        waktuMasuk: $('#waktu-masuk').val(),
        durasi_makan: $('#checkbox-makan').is(':checked') ? parseInt($('#durasi-makan').val()) || 0 : 0,
        durasi_mandi: $('#checkbox-mandi').is(':checked') ? parseInt($('#durasi-mandi').val()) || 0 : 0,
        customActivities: collectCustomActivities()
    };
    
    currentPresetId = savePreset(presetData);
    calculateAndShowResult();
}

// Calculate and Show Result
function calculateAndShowResult() {
    const presets = getPresets();
    const preset = presets.find(p => p.id === currentPresetId);
    
    if (!preset) return;
    
    // Hitung durasi perjalanan (dalam menit)
    const kecepatan = KECEPATAN_TRANSPORTASI[preset.transportasi];
    const waktuPerjalanan = (preset.jarak / kecepatan) * 60;
    
    // Hitung total aktivitas
    let totalAktivitas = 0;
    totalAktivitas += preset.durasi_makan || 0;
    totalAktivitas += preset.durasi_mandi || 0;
    preset.customActivities.forEach(act => totalAktivitas += act.duration);
    
    // Estimasi waktu tercepat (hanya perjalanan)
    const waktuTercepat = waktuPerjalanan;
    
    // Estimasi waktu terlama (perjalanan + semua aktivitas + buffer 20%)
    const waktuTerlama = waktuPerjalanan + totalAktivitas + (waktuPerjalanan * 0.2);
    
    // Parse waktu
    const [jamBerangkat, menitBerangkat] = preset.jamBerangkat.split(':').map(Number);
    const [jamMasuk, menitMasuk] = preset.waktuMasuk.split(':').map(Number);
    
    // Hitung waktu tiba
    const tibaTercepat = addMinutes(jamBerangkat, menitBerangkat, waktuTercepat);
    const tibaTerlama = addMinutes(jamBerangkat, menitBerangkat, waktuTerlama);
    
    // Hitung persentase telat
    const waktuMasukMenit = jamMasuk * 60 + menitMasuk;
    const tibaTercepatMenit = tibaTercepat.jam * 60 + tibaTercepat.menit;
    const tibaTerlamaMenit = tibaTerlama.jam * 60 + tibaTerlama.menit;
    
    let persentaseTelat = 0;
    let status = '';
    let statusClass = '';
    
    if (tibaTerlamaMenit <= waktuMasukMenit) {
        // Aman
        const selisih = waktuMasukMenit - tibaTercepatMenit;
        persentaseTelat = Math.max(0, Math.round(100 - (selisih / 60) * 20));
        status = 'Aman! Kemungkinan telat sangat kecil 🎉';
        statusClass = 'status-aman';
    } else if (tibaTercepatMenit <= waktuMasukMenit) {
        // Hati-hati
        const keterlambatan = tibaTerlamaMenit - waktuMasukMenit;
        persentaseTelat = Math.min(99, Math.round(50 + (keterlambatan / 30) * 25));
        status = 'Hati-hati! Ada risiko telat ⚠️';
        statusClass = 'status-hati-hati';
    } else {
        // Telat
        persentaseTelat = 100;
        status = 'Telat! Berangkat lebih awal ❌';
        statusClass = 'status-telat';
    }
    
    // Update UI
    $('#result-preset-name').text(preset.name);
    $('#result-jarak').text(preset.jarak + ' km');
    $('#result-transportasi').text(NAMA_TRANSPORTASI[preset.transportasi]);
    $('#result-jam-berangkat').text(preset.jamBerangkat);
    $('#result-waktu-masuk').text(preset.waktuMasuk);
    
    $('#result-tercepat').text(formatTime(tibaTercepat.jam, tibaTercepat.menit));
    $('#result-terlama').text(formatTime(tibaTerlama.jam, tibaTerlama.menit));
    
    $('#result-persentase').text(persentaseTelat + '%');
    $('#result-status').text(status);
    $('#result-persentase').removeClass('status-aman status-hati-hati status-telat').addClass(statusClass);
    
    // Update card color
    $('#persentase-card').removeClass('border-success border-warning border-danger');
    if (statusClass === 'status-aman') {
        $('#persentase-card').addClass('border-success');
    } else if (statusClass === 'status-hati-hati') {
        $('#persentase-card').addClass('border-warning');
    } else {
        $('#persentase-card').addClass('border-danger');
    }
    
    // Rincian aktivitas
    let activitiesHtml = '';
    activitiesHtml += `<div class="activity-item"><strong>Perjalanan:</strong> ${Math.round(waktuPerjalanan)} menit</div>`;
    if (preset.durasi_makan) {
        activitiesHtml += `<div class="activity-item"><strong>Makan:</strong> ${preset.durasi_makan} menit</div>`;
    }
    if (preset.durasi_mandi) {
        activitiesHtml += `<div class="activity-item"><strong>Mandi:</strong> ${preset.durasi_mandi} menit</div>`;
    }
    preset.customActivities.forEach(act => {
        activitiesHtml += `<div class="activity-item"><strong>${act.name}:</strong> ${act.duration} menit</div>`;
    });
    $('#result-activities').html(activitiesHtml);
    
    // Create chart
    createPercentageChart(persentaseTelat, statusClass);
    
    showPage('page-result');
}

// Helper: Add Minutes to Time
function addMinutes(jam, menit, tambahMenit) {
    let totalMenit = jam * 60 + menit + tambahMenit;
    const newJam = Math.floor(totalMenit / 60) % 24;
    const newMenit = Math.round(totalMenit % 60);
    return { jam: newJam, menit: newMenit };
}

// Helper: Format Time
function formatTime(jam, menit) {
    return String(jam).padStart(2, '0') + ':' + String(menit).padStart(2, '0');
}

// Create Percentage Chart
function createPercentageChart(percentage, statusClass) {
    const ctx = document.getElementById('chart-persentase');
    
    if (chartInstance) {
        chartInstance.destroy();
    }
    
    let color = '';
    if (statusClass === 'status-aman') {
        color = '#28a745';
    } else if (statusClass === 'status-hati-hati') {
        color = '#ffc107';
    } else {
        color = '#dc3545';
    }
    
    chartInstance = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Risiko Telat', 'Aman'],
            datasets: [{
                data: [percentage, 100 - percentage],
                backgroundColor: [color, '#e9ecef'],
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    display: true,
                    position: 'bottom'
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return context.label + ': ' + context.parsed + '%';
                        }
                    }
                }
            }
        }
    });
}

// Show Page
function showPage(pageId) {
    $('.page').removeClass('active');
    $('#' + pageId).addClass('active');
    
    // Scroll to top
    window.scrollTo(0, 0);
                                            }
