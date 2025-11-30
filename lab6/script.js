// --- CZĘŚĆ WSPÓLNA I ZADANIE 1 (RLE) ---

const uploadInput = document.getElementById('upload');
// Elementy z Zadania 1
const canvasRLE = document.getElementById('imageCanvas');
const compressBtn = document.getElementById('compressBtn');
const compressionResult = document.getElementById('compressionResult');
const sizeDifferenceDisplay = document.getElementById('sizeDifference');

// Elementy z Zadania 2
const originalCanvas = document.getElementById('originalCanvas');
const compressedCanvas = document.getElementById('compressedCanvas');
const bitSlider = document.getElementById('bitSlider');
const bitDisplay = document.getElementById('bitDisplay');

// Elementy z Zadania 3 (Histogramy)
const histCanvasR = document.getElementById('histCanvasR');
const histCanvasG = document.getElementById('histCanvasG');
const histCanvasB = document.getElementById('histCanvasB');

// Elementy wyświetlania rozmiaru
const originalSizeDisplay = document.getElementById('originalSize');
const compressedSizeDisplay = document.getElementById('compressedSize');

let pixelData = null; 
let originalImageDataObj = null;

// Obsługa ładowania obrazu
if (uploadInput) {
    uploadInput.addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = function(event) {
            const img = new Image();
            img.onload = function() {
                // SCENARIUSZ 1: Zadanie 1
                if (canvasRLE) {
                    canvasRLE.width = img.width;
                    canvasRLE.height = img.height;
                    const ctx = canvasRLE.getContext('2d');
                    ctx.drawImage(img, 0, 0);
                    pixelData = ctx.getImageData(0, 0, canvasRLE.width, canvasRLE.height).data;
                    
                    if(compressionResult) compressionResult.innerText = "";
                    if(originalSizeDisplay) originalSizeDisplay.innerText = "";
                    if(compressedSizeDisplay) compressedSizeDisplay.innerText = "";
                    if(sizeDifferenceDisplay) sizeDifferenceDisplay.innerText = "";
                }

                // SCENARIUSZ 2 i 3: Zadanie 2 + Histogramy
                if (originalCanvas && compressedCanvas) {
                    originalCanvas.width = img.width;
                    originalCanvas.height = img.height;
                    compressedCanvas.width = img.width;
                    compressedCanvas.height = img.height;

                    const origCtx = originalCanvas.getContext('2d');
                    origCtx.drawImage(img, 0, 0);
                    
                    originalImageDataObj = origCtx.getImageData(0, 0, originalCanvas.width, originalCanvas.height);
                    
                    updateCompression();
                }
            }
            img.src = event.target.result;
        }
        reader.readAsDataURL(file);
    });
}

// --- LOGIKA ZADANIA 1: RLE ---
if (compressBtn) {
    compressBtn.addEventListener('click', function() {
        if (!pixelData) {
            alert("Najpierw załaduj obraz!");
            return;
        }
        const compressedRuns = compressRLE(pixelData);
        const originalSizeBytes = pixelData.length; 
        const compressedSizeBytes = compressedRuns.length * 8; 
        const differenceBytes = originalSizeBytes - compressedSizeBytes;
        const ratio = originalSizeBytes / compressedSizeBytes;

        compressionResult.innerText = `Współczynnik kompresji: ${ratio.toFixed(2)}`;
        originalSizeDisplay.innerText = `Rozmiar oryginalnych danych: ${originalSizeBytes} bajtów`;
        compressedSizeDisplay.innerText = `Rozmiar skompresowanych danych: ${compressedSizeBytes} bajtów`;
        sizeDifferenceDisplay.innerText = `Różnica: ${differenceBytes} bajtów`;
    });
}

function compressRLE(data) {
    if (!data || data.length === 0) return [];
    const runs = [];
    let prevR = data[0], prevG = data[1], prevB = data[2], prevA = data[3];
    let count = 1;

    for (let i = 4; i < data.length; i += 4) {
        const r = data[i], g = data[i + 1], b = data[i + 2], a = data[i + 3];
        if (r === prevR && g === prevG && b === prevB && a === prevA) {
            count++;
        } else {
            runs.push({ count: count, pixel: [prevR, prevG, prevB, prevA] });
            prevR = r; prevG = g; prevB = b; prevA = a;
            count = 1;
        }
    }
    runs.push({ count: count, pixel: [prevR, prevG, prevB, prevA] });
    return runs;
}

// --- LOGIKA ZADANIA 2: Kompresja Stratna ---

if (bitSlider) {
    bitSlider.addEventListener('input', function() {
        if (bitDisplay) bitDisplay.innerText = bitSlider.value;
        updateCompression();
    });
}

function updateCompression() {
    if (!originalImageDataObj) return;

    const originalCtx = originalCanvas.getContext('2d');
    const compressedCtx = compressedCanvas.getContext('2d');

    const bitsPerChannel = parseInt(bitSlider.value, 10);
    const compressionFactor = Math.pow(2, 8 - bitsPerChannel);

    const compressedImageData = compressedCtx.createImageData(originalImageDataObj);
    const dataIn = originalImageDataObj.data;
    const dataOut = compressedImageData.data;

    for (let i = 0; i < dataIn.length; i += 4) {
        dataOut[i]     = Math.floor(dataIn[i] / compressionFactor) * compressionFactor;     // R
        dataOut[i + 1] = Math.floor(dataIn[i + 1] / compressionFactor) * compressionFactor; // G
        dataOut[i + 2] = Math.floor(dataIn[i + 2] / compressionFactor) * compressionFactor; // B
        dataOut[i + 3] = dataIn[i + 3]; // Alpha
    }

    compressedCtx.putImageData(compressedImageData, 0, 0);

    const pixelCount = originalImageDataObj.width * originalImageDataObj.height;
    const originalSize = (24 * pixelCount) / 8;
    const compressedSize = (bitsPerChannel * 3 * pixelCount) / 8;

    if (originalSizeDisplay) originalSizeDisplay.textContent = `Rozmiar oryginału (teoretyczny): ${originalSize.toFixed(2)} bajtów`;
    if (compressedSizeDisplay) compressedSizeDisplay.textContent = `Rozmiar po kompresji (teoretyczny): ${compressedSize.toFixed(2)} bajtów`;

    // --- LOGIKA ZADANIA 3: Wywołanie rysowania histogramu ---
    // Instrukcja [cite: 101] sugeruje analizę zmiany histogramu dla obrazu skompresowanego.
    if (histCanvasR && histCanvasG && histCanvasB) {
        drawHistograms(compressedImageData);
    }
}

// --- LOGIKA ZADANIA 3: Implementacja histogramu ---
function drawHistograms(imageData) {
    const ctxR = histCanvasR.getContext('2d');
    const ctxG = histCanvasG.getContext('2d');
    const ctxB = histCanvasB.getContext('2d');

    // 6.1 Krok 1: Inicjalizacja tablic histogramów 
    const rHistogram = new Array(256).fill(0);
    const gHistogram = new Array(256).fill(0);
    const bHistogram = new Array(256).fill(0);

    // 6.2 Krok 2: Zliczanie intensywności kolorów [cite: 407-416]
    for (let i = 0; i < imageData.data.length; i += 4) {
        rHistogram[imageData.data[i]]++;     // R
        gHistogram[imageData.data[i + 1]]++; // G
        bHistogram[imageData.data[i + 2]]++; // B
    }

    // 6.3 Krok 3: Czyszczenie kontekstu rysowania (dla każdego osobno) [cite: 420]
    const width = histCanvasR.width;
    const height = histCanvasR.height;
    ctxR.clearRect(0, 0, width, height);
    ctxG.clearRect(0, 0, width, height);
    ctxB.clearRect(0, 0, width, height);

    // 6.4 Krok 4: Normalizacja wartości histogramu 
    // Znajdź globalne maksimum, aby skala była spójna dla wszystkich kanałów (opcjonalnie można skalować per kanał)
    const maxCount = Math.max(
        Math.max(...rHistogram),
        Math.max(...gHistogram),
        Math.max(...bHistogram)
    );
    
    // Zabezpieczenie przed dzieleniem przez 0, jeśli obraz jest pusty/przezroczysty
    const scale = maxCount > 0 ? height / maxCount : 0;

    // 6.5 Krok 5: Rysowanie słupków histogramu 
    // Zmodyfikowano, aby rysować na osobnych canvasach zgodnie z życzeniem użytkownika
    for (let i = 0; i < 256; i++) {
        const rHeight = rHistogram[i] * scale;
        const gHeight = gHistogram[i] * scale;
        const bHeight = bHistogram[i] * scale;

        // Kanał R
        ctxR.fillStyle = 'red';
        ctxR.fillRect(i, height - rHeight, 1, rHeight);

        // Kanał G
        ctxG.fillStyle = 'green';
        ctxG.fillRect(i, height - gHeight, 1, gHeight);

        // Kanał B
        ctxB.fillStyle = 'blue';
        ctxB.fillRect(i, height - bHeight, 1, bHeight);
    }
}