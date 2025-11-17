document.getElementById("hitungBtn").addEventListener("click", () => {
    const jarak = parseFloat(document.getElementById("jarak").value);
    const transport = document.getElementById("transport").value;
    const macet = document.getElementById("macet").value;
    const snooze = document.getElementById("snooze").value;
    const mandi = parseInt(document.getElementById("mandi").value);
    const berangkat = document.getElementById("berangkat").value;

    if (!jarak || !berangkat) {
        document.getElementById("hasil").innerHTML = "Isikan semua input rek!";
        return;
    }

    // ---- 1. Kecepatan dasar (km/jam)
    let kecepatan;
    switch (transport) {
        case "motor": kecepatan = 60; break;
        case "sepeda": kecepatan = 40; break;
        case "jalan": kecepatan = 5; break;
        case "nebeng": kecepatan = 55; break;
    }

    // ---- 2. Hitung waktu tempuh dasar
    let waktuTempuh = (jarak / kecepatan) * 60; // menit

    // ---- 3. Faktor macet (menit)
    let faktorMacet = 0;
    if (macet === "sedang") faktorMacet = waktuTempuh * 0.3;
    else if (macet === "macet") faktorMacet = waktuTempuh * 0.6;

    // ---- 4. Faktor snooze
    let faktorSnooze = 0;
    if (snooze === "1-2") faktorSnooze = 5;
    else if (snooze === "3+") faktorSnooze = 12;

    // ---- 5. Total waktu akhir
    let totalWaktu = waktuTempuh + faktorMacet + faktorSnooze + mandi;

    // ---- 6. Hitung jam sampai
    const [jam, menit] = berangkat.split(":").map(Number);
    let totalMenit = jam * 60 + menit + totalWaktu;

    let tibaJam = Math.floor(totalMenit / 60);
    let tibaMenit = Math.floor(totalMenit % 60);

    // Format 2 digit
    if (tibaJam < 10) tibaJam = "0" + tibaJam;
    if (tibaMenit < 10) tibaMenit = "0" + tibaMenit;

    // ---- 7. Risiko Telat
    const jamMasuk = 7 * 60; // 07:00
    let status = "";

    if (totalMenit <= jamMasuk - 10) {
        status = "Aman rek! Ngacir pol!";
    } else if (totalMenit <= jamMasuk) {
        status = "Waduh! Tipis rek, gaskeun!";
    } else if (totalMenit <= jamMasuk + 10) {
        status = "Telat dikit rek... hati-hati disambit guru piket.";
    } else {
        status = "Yowes rek... telat parah. Siap-siap dicatat BK.";
    }

    // ---- 8. Tampilkan hasil
    document.getElementById("hasil").innerHTML = `
        <b>Tiba di sekolah jam: ${tibaJam}:${tibaMenit}</b><br><br>
        ${status}
    `;
});