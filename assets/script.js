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
    console.log('Initializing app...');
    showWelcomePopup();
    loadjadwals();
}

// Fungsi untuk menampilkan welcome popup
function showWelcomePopup() {
    // Cek jika user sudah pernah menutup popup
    const hasSeenPopup = localStorage.getItem('wancisa_hasSeenPopup');
    
    console.log('showWelcomePopup called, hasSeenPopup:', hasSeenPopup);
    
    if (!hasSeenPopup) {
        $('#welcome-popup').show();
        $('body').addClass('popup-active');
        console.log('Welcome popup shown');
        
        // Setup event listeners khusus untuk popup setelah ditampilkan
        setTimeout(setupPopupEventListeners, 100);
    } else {
        // Langsung tampilkan halaman start jika sudah pernah melihat popup
        console.log('User has seen popup before, going directly to start page');
        showPage('page-start');
        createWeeklyChart();
    }
}

// Fungsi untuk menutup welcome popup
function closeWelcomePopup() {
    $('#welcome-popup').fadeOut(300);
    $('body').removeClass('popup-active');
    
    // Simpan status bahwa user sudah melihat popup
    localStorage.setItem('wancisa_hasSeenPopup', 'true');
    
    // Tampilkan halaman start
    showPage('page-start');
    createWeeklyChart();
}

// Fungsi khusus untuk setup event listener popup
function setupPopupEventListeners() {
    console.log('Setting up popup-specific event listeners...');
    
    // Hapus event listener lama untuk menghindari duplikasi
    $('#start-button').off('click');
    $('.popup-overlay').off('click');
    
    // Tambah event listener langsung ke elemen
    $('#start-button').click(function(e) {
        e.preventDefault();
        e.stopPropagation();
        console.log('Start button clicked - DIRECT');
        closeWelcomePopup();
    });
    
    $('.popup-overlay').click(function(e) {
        console.log('Overlay clicked - DIRECT');
        closeWelcomePopup();
    });
    
    console.log('Popup event listeners setup complete');
}

// Setup Event Listeners
function setupEventListeners() {
    console.log('Setting up event listeners...');
    
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

    // Toggle custom kecepatan
    $('#transportasi').change(function() {
        if ($(this).val() === 'custom') {
            $('#custom-kecepatan-container').show();
            $('#custom-kecepatan').prop('required', true);
        } else {
            $('#custom-kecepatan-container').hide();
            $('#custom-kecepatan').prop('required', false);
            $('#custom-kecepatan').val('');
        }
    });

    // Tambah aktivitas custom
    $('#btn-add-custom').click(function() {
        addCustomActivity();
    });

    // === PERBAIKAN: EVENT LISTENER WELCOME POPUP YANG LEBIH ROBUST ===
    
    // Gunakan event delegation untuk elemen yang mungkin dibuat ulang
    $(document).on('click', '#start-button', function(e) {
        e.preventDefault();
        e.stopPropagation();
        console.log('Start button clicked - DELEGATION');
        closeWelcomePopup();
    });
    
    $(document).on('click', '.popup-overlay', function(e) {
        console.log('Overlay clicked - DELEGATION');
        closeWelcomePopup();
    });
    
    // Close with ESC key
    $(document).on('keyup', function(e) {
        if (e.key === "Escape" && $('#welcome-popup').is(':visible')) {
            console.log('ESC pressed - DELEGATION');
            closeWelcomePopup();
        }
    });
    
    console.log('Event listeners setup complete');
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
        // Ubah struktur jadwal card dengan tombol di kanan
        const jadwalCard = $(`
            <div class="jadwal-card">
                <div class="d-flex justify-content-between align-items-start">
                    <div class="flex-grow-1">
                        <div class="jadwal-name">${jadwal.name}</div>
                        <div class="jadwal-info">
                            <i class="fas fa-route"></i> ${jadwal.jarak} km | 
                            <i class="fas fa-motorcycle"></i> ${NAMA_TRANSPORTASI[jadwal.transportasi]} | 
                            <i class="fas fa-clock"></i> Berangkat ${jadwal.jamBerangkat}
                        </div>
                    </div>
                    <div class="jadwal-actions ms-3">
                        <button class="btn btn-sm btn-outline-warning btn-edit-jadwal" data-id="${jadwal.id}" title="Edit Jadwal">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-sm btn-outline-danger btn-delete-jadwal" data-id="${jadwal.id}" title="Hapus Jadwal">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
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

// Fungsi baru untuk membuat chart mingguan
function createWeeklyChart() {
    const ctx = document.getElementById('weekly-chart');
    
    if (!ctx) return;
    
    // Hancurkan chart instance lama jika ada
    if (window.weeklyChartInstance) {
        window.weeklyChartInstance.destroy();
    }
    
    // Data dummy untuk contoh (dalam aplikasi nyata, data ini bisa diambil dari localStorage)
    const days = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'];
    const latePercentages = [15, 25, 10, 30, 5, 0, 20]; // Data contoh
    
    // Hitung rata-rata
    const average = latePercentages.reduce((a, b) => a + b, 0) / latePercentages.length;
    
    // Simpan instance chart di window object
    window.weeklyChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: days,
            datasets: [{
                label: 'Persentase Telat (%)',
                data: latePercentages,
                backgroundColor: [
                    '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', 
                    '#9966FF', '#FF9F40', '#C9CBCF'
                ],
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    display: false
                },
                title: {
                    display: true,
                    text: `Rata-rata: ${average.toFixed(1)}%`
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    max: 100,
                    title: {
                        display: true,
                        text: 'Persentase Telat (%)'
                    }
                }
            }
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
    $('#tingkat-kemacetan').val(jadwal.tingkatKemacetan);
    $('#jam-berangkat').val(jadwal.jamBerangkat);
    $('#waktu-masuk').val(jadwal.waktuMasuk);
    
    // Load custom kecepatan jika ada
    if (jadwal.transportasi === 'custom') {
        $('#custom-kecepatan-container').show();
        $('#custom-kecepatan').val(jadwal.customKecepatan);
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
    $('#custom-kecepatan-container').hide();
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
        customKecepatan: $('#transportasi').val() === 'custom' ? parseInt($('#custom-kecepatan').val()) || 0 : 0,
        tingkatKemacetan: $('#tingkat-kemacetan').val(),
        jamBerangkat: $('#jam-berangkat').val(),
        waktuMasuk: $('#waktu-masuk').val(),
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
    let kecepatan;
    if (jadwal.transportasi === 'custom') {
        kecepatan = jadwal.customKecepatan;
    } else {
        kecepatan = KECEPATAN_TRANSPORTASI[jadwal.transportasi];
    }
    
    let waktuPerjalanan = (jadwal.jarak / kecepatan) * 60;
    
    // Tambahan waktu berdasarkan tingkat kemacetan
    const faktorKemacetan = {
        'sepi': 1.0,
        'sedang': 1.15,
        'macet': 1.3
    };
    
    waktuPerjalanan *= faktorKemacetan[jadwal.tingkatKemacetan];
    
    // Hitung total aktivitas custom
    let totalAktivitas = 0;
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
    
    // Tampilkan transportasi atau kecepatan custom
    if (jadwal.transportasi === 'custom') {
        $('#result-transportasi').text('Custom: ' + jadwal.customKecepatan + ' km/jam');
    } else {
        $('#result-transportasi').text(NAMA_TRANSPORTASI[jadwal.transportasi]);
    }
    
    // Tampilkan tingkat kemacetan
    const namaKemacetan = {
        'sepi': 'Sepi',
        'sedang': 'Sedang',
        'macet': 'Macet'
    };
    $('#result-kemacetan').text(namaKemacetan[jadwal.tingkatKemacetan]);
    
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
    activitiesHtml += `<div class="activity-item"><strong>Perjalanan:</strong> ${Math.round(waktuPerjalanan)} menit (${namaKemacetan[jadwal.tingkatKemacetan]})</div>`;
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
    
    if (!ctx) return;
    
    // Hancurkan chart instance lama jika ada
    if (chartInstance) {
        chartInstance.destroy();
        chartInstance = null;
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