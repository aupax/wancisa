// Elemen DOM
const currentTimeDisplay = document.getElementById('currentTime');
const alarmTimeInput = document.getElementById('alarmTime');
const setAlarmButton = document.getElementById('setAlarm');
const stopAlarmButton = document.getElementById('stopAlarm');
const alarmInfo = document.getElementById('alarmInfo');
const installBtn = document.getElementById('installBtn');

// Variabel alarm
let alarmTime = null;
let alarmInterval = null;
let alarmActive = false;
let deferredPrompt = null;

// Service Worker Registration
async function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
        try {
            const registration = await navigator.registration.serviceWorker.register('/sw.js', {
                scope: '/'
            });
            console.log('Service Worker registered:', registration);
            return registration;
        } catch (error) {
            console.log('Service Worker registration failed:', error);
        }
    }
    return null;
}

// Update waktu saat ini
function updateCurrentTime() {
    const now = new Date();
    const hours = now.getHours().toString().padStart(2, '0');
    const minutes = now.getMinutes().toString().padStart(2, '0');
    const seconds = now.getSeconds().toString().padStart(2, '0');
    
    currentTimeDisplay.textContent = `🕒 ${hours}:${minutes}:${seconds}`;
}

// Set waktu default untuk input alarm
function setDefaultAlarmTime() {
    const now = new Date();
    now.setMinutes(now.getMinutes() + 5);
    
    const hours = now.getHours().toString().padStart(2, '0');
    const minutes = now.getMinutes().toString().padStart(2, '0');
    
    alarmTimeInput.value = `${hours}:${minutes}`;
}

// Text-to-Speech untuk membunyikan alarm
function playAlarmSound() {
    const now = new Date();
    const hours = now.getHours();
    const minutes = now.getMinutes();
    
    // Format waktu untuk text-to-speech
    const timeString = `Sekarang jam menunjukkan pukul ${hours} ${minutes}`;
    
    console.log('Playing TTS:', timeString);
    
    // Buat objek SpeechSynthesisUtterance
    const speech = new SpeechSynthesisUtterance();
    speech.text = timeString;
    speech.lang = 'id-ID';
    speech.volume = 1;
    speech.rate = 0.9;
    speech.pitch = 1;
    
    // Gunakan text-to-speech
    window.speechSynthesis.speak(speech);
    
    // Vibrate jika di mobile
    if (navigator.vibrate) {
        navigator.vibrate([1000, 500, 1000]);
    }
    
    // Tampilkan notifikasi sistem asli
    showSystemNotification('Alarm Berbunyi!', `Sekarang pukul ${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`);
}

// Notifikasi sistem asli menggunakan Service Worker
async function showSystemNotification(title, body) {
    // Coba notifikasi Service Worker dulu
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({
            type: 'SHOW_NOTIFICATION',
            title: title,
            body: body
        });
    }
    
    // Fallback ke Notifikasi Browser biasa
    if ('Notification' in window && Notification.permission === 'granted') {
        const notification = new Notification(title, {
            body: body,
            icon: '/icon-192.png',
            badge: '/icon-192.png',
            tag: 'alarm',
            requireInteraction: true,
            actions: [
                {
                    action: 'stop',
                    title: 'Stop Alarm'
                }
            ]
        });
        
        notification.onclick = function() {
            window.focus();
            notification.close();
        };
        
        notification.onclose = function() {
            console.log('Notification closed');
        };
    } else {
        // Final fallback - alert
        alert(`${title}\n${body}`);
    }
}

// Cek apakah alarm harus berbunyi
function checkAlarm() {
    if (!alarmActive || !alarmTime) return;
    
    const now = new Date();
    const currentHours = now.getHours();
    const currentMinutes = now.getMinutes();
    const currentSeconds = now.getSeconds();
    
    console.log(`Checking: ${currentHours}:${currentMinutes}:${currentSeconds} vs ${alarmTime.hours}:${alarmTime.minutes}`);
    
    // Bunyikan alarm tepat pada menit yang ditentukan
    if (currentHours === alarmTime.hours && currentMinutes === alarmTime.minutes && currentSeconds === 0) {
        console.log('ALARM TRIGGERED!');
        playAlarmSound();
        
        // Untuk alarm berulang, jangan stop alarm di sini
        // Biarkan user yang stop manual
    }
}

// Atur alarm
function setAlarm() {
    const alarmValue = alarmTimeInput.value;
    
    if (!alarmValue) {
        alert('Silakan pilih waktu alarm!');
        return;
    }
    
    // Parse waktu alarm
    const [hours, minutes] = alarmValue.split(':').map(Number);
    
    // Validasi input
    if (isNaN(hours) || isNaN(minutes)) {
        alert('Waktu alarm tidak valid!');
        return;
    }
    
    // Simpan waktu alarm
    alarmTime = { hours, minutes };
    alarmActive = true;
    
    // Update UI
    updateAlarmUI(true);
    
    // Mulai pengecekan alarm setiap detik
    if (alarmInterval) {
        clearInterval(alarmInterval);
    }
    alarmInterval = setInterval(checkAlarm, 1000);
    
    // Simpan ke localStorage
    saveAlarmToStorage();
    
    // Tampilkan konfirmasi
    const formattedTime = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    showSystemNotification('Alarm Diatur', `Alarm untuk pukul ${formattedTime}`);
    
    console.log(`Alarm set for: ${formattedTime}`);
}

// Update UI alarm
function updateAlarmUI(isActive) {
    if (isActive && alarmTime) {
        const formattedTime = `${alarmTime.hours.toString().padStart(2, '0')}:${alarmTime.minutes.toString().padStart(2, '0')}`;
        alarmInfo.innerHTML = `🔔 Alarm aktif untuk <strong>${formattedTime}</strong>`;
        setAlarmButton.classList.add('hidden');
        stopAlarmButton.classList.remove('hidden');
        stopAlarmButton.classList.add('alarm-active');
    } else {
        alarmInfo.textContent = 'Tidak ada alarm yang aktif';
        setAlarmButton.classList.remove('hidden');
        stopAlarmButton.classList.add('hidden');
        stopAlarmButton.classList.remove('alarm-active');
    }
}

// Hentikan alarm
function stopAlarm() {
    if (alarmInterval) {
        clearInterval(alarmInterval);
        alarmInterval = null;
    }
    
    alarmActive = false;
    alarmTime = null;
    updateAlarmUI(false);
    
    // Hapus dari storage
    localStorage.removeItem('activeAlarm');
    
    // Hentikan text-to-speech
    window.speechSynthesis.cancel();
    
    // Hentikan vibrate
    if (navigator.vibrate) {
        navigator.vibrate(0);
    }
    
    console.log('Alarm stopped');
}

// Simpan alarm ke storage
function saveAlarmToStorage() {
    if (alarmActive && alarmTime) {
        localStorage.setItem('activeAlarm', JSON.stringify({
            time: alarmTime,
            timestamp: Date.now()
        }));
    }
}

// Load alarm dari storage
function loadAlarmFromStorage() {
    const savedAlarm = localStorage.getItem('activeAlarm');
    if (savedAlarm) {
        const alarmData = JSON.parse(savedAlarm);
        alarmTime = alarmData.time;
        alarmActive = true;
        
        updateAlarmUI(true);
        alarmInterval = setInterval(checkAlarm, 1000);
        
        console.log('Alarm loaded from storage');
    }
}

// Minta izin notifikasi
async function requestNotificationPermission() {
    if ('Notification' in window) {
        if (Notification.permission === 'default') {
            const permission = await Notification.requestPermission();
            console.log('Notification permission:', permission);
        }
    }
}

// PWA Install Prompt
function initializePWA() {
    // Listen for beforeinstallprompt event
    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        deferredPrompt = e;
        installBtn.classList.remove('hidden');
        
        installBtn.addEventListener('click', async () => {
            if (deferredPrompt) {
                deferredPrompt.prompt();
                const { outcome } = await deferredPrompt.userChoice;
                console.log(`User response to the install prompt: ${outcome}`);
                deferredPrompt = null;
                installBtn.classList.add('hidden');
            }
        });
    });
}

// Event listeners
function initializeEventListeners() {
    setAlarmButton.addEventListener('click', setAlarm);
    stopAlarmButton.addEventListener('click', stopAlarm);
    
    // Enter key support
    alarmTimeInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            setAlarm();
        }
    });
}

// Inisialisasi aplikasi
async function initializeApp() {
    updateCurrentTime();
    setDefaultAlarmTime();
    setInterval(updateCurrentTime, 1000);
    
    initializeEventListeners();
    await requestNotificationPermission();
    await registerServiceWorker();
    initializePWA();
    loadAlarmFromStorage();
    
    console.log('App initialized');
}

// Jalankan aplikasi
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeApp);
} else {
    initializeApp();
}
