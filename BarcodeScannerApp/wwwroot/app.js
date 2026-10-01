// ==============================================================================
// ScanCore .NET 8 - Universal Barcode Scanner & Persistent Inventory Logic
// ==============================================================================

document.addEventListener('DOMContentLoaded', () => {
  // DOM Elements - Status & Navigation
  const systemStatusChip = document.getElementById('systemStatusChip');
  const systemStatusText = document.getElementById('systemStatusText');
  const tabButtons = document.querySelectorAll('.tab-btn');
  const tabPanels = document.querySelectorAll('.tab-panel');

  // Mode Selector Elements (Option 1 vs Option 2)
  const btnModeCheck = document.getElementById('btnModeCheck');
  const btnModeSave = document.getElementById('btnModeSave');
  const activeModeBadge = document.getElementById('activeModeBadge');
  const btnOpenInventory = document.getElementById('btnOpenInventory');
  const inventoryCountBadge = document.getElementById('inventoryCountBadge');

  // Camera Elements
  const video = document.getElementById('cameraVideo');
  const canvas = document.getElementById('captureCanvas');
  const btnStartCamera = document.getElementById('btnStartCamera');
  const btnStopCamera = document.getElementById('btnStopCamera');
  const btnSwitchCamera = document.getElementById('btnSwitchCamera');
  const btnCaptureFrame = document.getElementById('btnCaptureFrame');
  const cameraPlaceholder = document.getElementById('cameraPlaceholder');
  const cameraStatusText = document.getElementById('cameraStatusText');

  // Upload Elements
  const dropZone = document.getElementById('dropZone');
  const fileInput = document.getElementById('fileInput');
  const btnBrowseFiles = document.getElementById('btnBrowseFiles');
  const uploadPreview = document.getElementById('uploadPreview');
  const previewImage = document.getElementById('previewImage');
  const previewFileName = document.getElementById('previewFileName');
  const btnRemoveFile = document.getElementById('btnRemoveFile');
  const btnProcessUpload = document.getElementById('btnProcessUpload');
  let selectedFile = null;

  // Direct Input Elements
  const barcodeInput = document.getElementById('barcodeInput');
  const btnLookupManual = document.getElementById('btnLookupManual');
  const formatHint = document.getElementById('formatHint');
  const sampleChipsContainer = document.getElementById('sampleChipsContainer');

  // Generator Elements
  const genContent = document.getElementById('genContent');
  const genFormat = document.getElementById('genFormat');
  const generatedBarcodeImg = document.getElementById('generatedBarcodeImg');
  const btnRefreshBarcode = document.getElementById('btnRefreshBarcode');
  const btnTestGeneratedBarcode = document.getElementById('btnTestGeneratedBarcode');
  const btnDownloadBarcode = document.getElementById('btnDownloadBarcode');

  // Results Elements
  const resultsLoading = document.getElementById('resultsLoading');
  const resultsEmpty = document.getElementById('resultsEmpty');
  const productView = document.getElementById('productView');
  const verifiedBadge = document.getElementById('verifiedBadge');
  const verifiedBadgeText = document.getElementById('verifiedBadgeText');

  // Saved Product Alert & Stock Control Elements
  const savedProductAlert = document.getElementById('savedProductAlert');
  const alertIconSvg = document.getElementById('alertIconSvg');
  const alertChipStatus = document.getElementById('alertChipStatus');
  const alertFirstScannedBadge = document.getElementById('alertFirstScannedBadge');
  const alertScanCountBadge = document.getElementById('alertScanCountBadge');
  const alertTitleText = document.getElementById('alertTitleText');
  const alertSubtitleText = document.getElementById('alertSubtitleText');
  const btnAlertSaveProduct = document.getElementById('btnAlertSaveProduct');
  const btnAlertIncrementStock = document.getElementById('btnAlertIncrementStock');

  const stockManagementBox = document.getElementById('stockManagementBox');
  const stockStatusPill = document.getElementById('stockStatusPill');
  const stockQuantityVal = document.getElementById('stockQuantityVal');
  const btnStockMinus = document.getElementById('btnStockMinus');
  const btnStockPlus = document.getElementById('btnStockPlus');
  const btnEditSavedProduct = document.getElementById('btnEditSavedProduct');

  // Primary Decoded Content Box
  const decodedMainValue = document.getElementById('decodedMainValue');
  const pillSymbology = document.getElementById('pillSymbology');
  const pillPayloadType = document.getElementById('pillPayloadType');
  const pillLength = document.getElementById('pillLength');
  const pillCharset = document.getElementById('pillCharset');
  const pillChecksum = document.getElementById('pillChecksum');
  const btnCopyBarcodeVal = document.getElementById('btnCopyBarcodeVal');
  const urlActionRow = document.getElementById('urlActionRow');
  const urlActionBtn = document.getElementById('urlActionBtn');

  // Breakdown Card
  const breakdownCard = document.getElementById('breakdownCard');
  const breakdownCountBadge = document.getElementById('breakdownCountBadge');
  const breakdownGrid = document.getElementById('breakdownGrid');

  // Entity Details
  const entityCard = document.getElementById('entityCard');
  const entityThumbBox = document.getElementById('entityThumbBox');
  const entityImage = document.getElementById('entityImage');
  const entityBrand = document.getElementById('entityBrand');
  const entityTitle = document.getElementById('entityTitle');
  const entityCategory = document.getElementById('entityCategory');
  const entityDesc = document.getElementById('entityDesc');

  const technicalSpecsGrid = document.getElementById('technicalSpecsGrid');
  const rawJsonCode = document.getElementById('rawJsonCode');
  const btnCopyJson = document.getElementById('btnCopyJson');

  // Subtabs
  const subtabButtons = document.querySelectorAll('.subtab-btn');
  const subtabContents = document.querySelectorAll('.subtab-content');

  // Modals
  const btnHeaderCodeSnippet = document.getElementById('btnHeaderCodeSnippet');
  const modalSnippet = document.getElementById('modalSnippet');
  const btnCloseModal = document.getElementById('btnCloseModal');
  const btnCloseModalBottom = document.getElementById('btnCloseModalBottom');
  const codeSnippetContent = document.getElementById('codeSnippetContent');
  const btnCopyCodeSnippet = document.getElementById('btnCopyCodeSnippet');
  const toast = document.getElementById('toastNotification');

  // Inventory Modal Elements
  const modalInventory = document.getElementById('modalInventory');
  const btnCloseInventoryModal = document.getElementById('btnCloseInventoryModal');
  const btnCloseInventoryBottom = document.getElementById('btnCloseInventoryBottom');
  const inventorySearchInput = document.getElementById('inventorySearchInput');
  const btnRefreshInventory = document.getElementById('btnRefreshInventory');
  const inventoryTableBody = document.getElementById('inventoryTableBody');
  const inventoryEmptyState = document.getElementById('inventoryEmptyState');
  const inventoryStatsNote = document.getElementById('inventoryStatsNote');

  // Edit Product Modal Elements
  const modalEditProduct = document.getElementById('modalEditProduct');
  const btnCloseEditModal = document.getElementById('btnCloseEditModal');
  const btnCancelEdit = document.getElementById('btnCancelEdit');
  const btnSaveProductChanges = document.getElementById('btnSaveProductChanges');
  const formEditProduct = document.getElementById('formEditProduct');
  const editBarcode = document.getElementById('editBarcode');
  const editTitle = document.getElementById('editTitle');
  const editBrand = document.getElementById('editBrand');
  const editCategory = document.getElementById('editCategory');
  const editQuantity = document.getElementById('editQuantity');
  const editPrice = document.getElementById('editPrice');
  const editStatus = document.getElementById('editStatus');
  const editNotes = document.getElementById('editNotes');

  // Workflow State: 'check' or 'save'
  let currentWorkflowMode = 'check'; // default to Check Availability
  let currentScanResult = null; // caches latest scan result { barcode, product, isPreviouslySaved, savedProduct, mode }
  let cachedInventory = [];

  // Camera State
  let cameraStream = null;
  let currentFacingMode = 'environment';
  let isScanningLive = false;
  let scanIntervalId = null;
  let lastScannedBarcode = '';
  let lastScanTime = 0;

  // ==========================================================================
  // 1. Workflow Mode Selector (Option 1 vs Option 2)
  // ==========================================================================
  function setWorkflowMode(mode) {
    currentWorkflowMode = mode;
    if (mode === 'check') {
      btnModeCheck.classList.add('active');
      btnModeSave.classList.remove('active');
      activeModeBadge.textContent = 'Option 1: Check Availability';
      activeModeBadge.style.color = '#38bdf8';
      activeModeBadge.style.borderColor = 'rgba(6, 182, 212, 0.4)';
      activeModeBadge.style.background = 'rgba(6, 182, 212, 0.15)';
      showToast('Switched to Option 1: Check Availability Mode');
    } else {
      btnModeSave.classList.add('active');
      btnModeCheck.classList.remove('active');
      activeModeBadge.textContent = 'Option 2: Scan & Save Product';
      activeModeBadge.style.color = '#c7d2fe';
      activeModeBadge.style.borderColor = 'rgba(99, 102, 241, 0.4)';
      activeModeBadge.style.background = 'rgba(99, 102, 241, 0.15)';
      showToast('Switched to Option 2: Scan & Save Product Mode');
    }

    // If a product is currently displayed, re-render it in the new mode context
    if (currentScanResult && currentScanResult.barcode?.rawValue) {
      lookupProduct(currentScanResult.barcode.rawValue, false);
    }
  }

  btnModeCheck.addEventListener('click', () => setWorkflowMode('check'));
  btnModeSave.addEventListener('click', () => setWorkflowMode('save'));

  // ==========================================================================
  // 2. Initialize & Verify Backend Health & Load Inventory
  // ==========================================================================
  async function initBackendHealth() {
    try {
      const res = await fetch('/api/health');
      if (res.ok) {
        const data = await res.json();
        systemStatusChip.style.background = 'rgba(16, 185, 129, 0.15)';
        systemStatusChip.style.borderColor = 'rgba(16, 185, 129, 0.4)';
        systemStatusText.innerHTML = `Connected: <strong>${data.runtime}</strong>`;
      } else {
        throw new Error('Health check status ' + res.status);
      }
    } catch (err) {
      systemStatusChip.style.background = 'rgba(239, 68, 68, 0.15)';
      systemStatusChip.style.borderColor = 'rgba(239, 68, 68, 0.4)';
      systemStatusChip.querySelector('.status-indicator').style.background = '#ef4444';
      systemStatusText.textContent = '.NET Engine Offline';
    }
  }

  async function refreshInventoryCount() {
    try {
      const res = await fetch('/api/inventory');
      if (res.ok) {
        cachedInventory = await res.json();
        inventoryCountBadge.textContent = cachedInventory.length;
        renderInventoryTable(cachedInventory);
      }
    } catch (err) {
      console.warn('Failed to load inventory:', err);
    }
  }

  // ==========================================================================
  // 3. Fetch Diverse Barcode Samples
  // ==========================================================================
  async function loadSampleProducts() {
    try {
      const res = await fetch('/api/samples');
      if (res.ok) {
        const samples = await res.json();
        renderSampleChips(samples);
      }
    } catch {
      sampleChipsContainer.innerHTML = '<p class="text-dim">Could not load sample list.</p>';
    }
  }

  function renderSampleChips(samples) {
    sampleChipsContainer.innerHTML = '';
    samples.forEach(sample => {
      const chip = document.createElement('div');
      chip.className = 'sample-chip';
      const displayCode = sample.barcode.length > 24 ? sample.barcode.substring(0, 24) + '...' : sample.barcode;
      chip.innerHTML = `
        <div>
          <div class="chip-name">${sample.name}</div>
          <div class="chip-meta">${sample.category} &bull; ${sample.type}</div>
        </div>
        <div class="chip-code">${displayCode}</div>
      `;
      chip.addEventListener('click', () => {
        barcodeInput.value = sample.barcode;
        updateDetectedFormat(sample.barcode);
        lookupProduct(sample.barcode);
      });
      sampleChipsContainer.appendChild(chip);
    });
  }

  // ==========================================================================
  // 4. Tab Switching
  // ==========================================================================
  tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      tabButtons.forEach(b => b.classList.remove('active'));
      tabPanels.forEach(p => p.classList.remove('active'));
      
      btn.classList.add('active');
      const targetPanel = document.getElementById(btn.getAttribute('data-target'));
      if (targetPanel) {
        targetPanel.classList.add('active');
      }

      if (btn.id !== 'tabLiveCam' && cameraStream) {
        stopCamera();
      }

      if (btn.id === 'tabGenerator') {
        updateBarcodeGenerator();
      }
    });
  });

  subtabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      subtabButtons.forEach(b => b.classList.remove('active'));
      subtabContents.forEach(c => c.classList.remove('active'));
      
      btn.classList.add('active');
      const target = document.getElementById(btn.getAttribute('data-subtab'));
      if (target) target.classList.add('active');
    });
  });

  // ==========================================================================
  // 5. Live Camera Scanner Engine with Dual-Mode Support
  // ==========================================================================
  btnStartCamera.addEventListener('click', startCamera);
  btnStopCamera.addEventListener('click', stopCamera);
  btnSwitchCamera.addEventListener('click', toggleCameraFacing);
  btnCaptureFrame.addEventListener('click', captureAndProcessFrame);

  async function startCamera() {
    try {
      cameraStatusText.textContent = 'Requesting camera stream...';
      const constraints = {
        video: {
          facingMode: currentFacingMode,
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false
      };

      cameraStream = await navigator.mediaDevices.getUserMedia(constraints);
      video.srcObject = cameraStream;
      await video.play();

      cameraPlaceholder.style.display = 'none';
      btnStartCamera.style.display = 'none';
      btnStopCamera.style.display = 'inline-flex';
      btnSwitchCamera.style.display = 'inline-flex';
      btnCaptureFrame.style.display = 'inline-flex';
      cameraStatusText.textContent = 'Optical scanning active... Align barcode in reticle.';
      
      startScanningLoop();
    } catch (err) {
      console.error('Camera access error:', err);
      cameraStatusText.textContent = `Camera error: ${err.message || 'Access denied'}`;
      showToast('Camera permission denied or camera not found');
    }
  }

  function stopCamera() {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      cameraStream = null;
    }
    video.srcObject = null;
    isScanningLive = false;
    clearInterval(scanIntervalId);

    cameraPlaceholder.style.display = 'flex';
    btnStartCamera.style.display = 'inline-flex';
    btnStopCamera.style.display = 'none';
    btnSwitchCamera.style.display = 'none';
    btnCaptureFrame.style.display = 'none';
    cameraStatusText.textContent = 'Camera is offline. Click Start to resume scanning.';
  }

  function toggleCameraFacing() {
    currentFacingMode = currentFacingMode === 'environment' ? 'user' : 'environment';
    stopCamera();
    startCamera();
  }

  function startScanningLoop() {
    isScanningLive = true;
    
    if ('BarcodeDetector' in window) {
      const barcodeDetector = new BarcodeDetector({
        formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'code_39', 'qr_code']
      });

      scanIntervalId = setInterval(async () => {
        if (!isScanningLive || video.readyState < 2) return;
        try {
          const barcodes = await barcodeDetector.detect(video);
          if (barcodes.length > 0) {
            handleDetectedBarcode(barcodes[0].rawValue, barcodes[0].format);
          }
        } catch {
          captureAndProcessFrame();
        }
      }, 500);
    } else {
      scanIntervalId = setInterval(() => {
        if (!isScanningLive || video.readyState < 2) return;
        captureAndProcessFrame();
      }, 1200);
    }
  }

  async function captureAndProcessFrame() {
    if (!video.videoWidth || !video.videoHeight) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const base64Data = canvas.toDataURL('image/jpeg', 0.85);

    try {
      const formData = new FormData();
      formData.append('imageBase64', base64Data);
      formData.append('mode', currentWorkflowMode);

      const res = await fetch('/api/barcode/scan-and-fetch', {
        method: 'POST',
        body: formData
      });

      if (res.ok) {
        const scanResult = await res.json();
        if (scanResult.barcode && scanResult.barcode.success && scanResult.barcode.rawValue) {
          handleDetectedBarcode(scanResult.barcode.rawValue, scanResult.barcode.symbologyFormat, scanResult);
        }
      }
    } catch (err) {
      console.warn('Frame scan request error:', err);
    }
  }

  function handleDetectedBarcode(barcode, format, fullResponse = null) {
    const now = Date.now();
    if (barcode === lastScannedBarcode && now - lastScanTime < 4000) {
      return;
    }

    lastScannedBarcode = barcode;
    lastScanTime = now;
    cameraStatusText.textContent = `Scanned: ${barcode} (${format || 'Detected'})`;
    showToast(`Barcode Scanned: ${barcode}`);

    barcodeInput.value = barcode;
    updateDetectedFormat(barcode);

    if (fullResponse) {
      displayBarcodeData(fullResponse);
      refreshInventoryCount();
    } else {
      lookupProduct(barcode);
    }
  }

  // ==========================================================================
  // 6. Image File Upload & Drag and Drop
  // ==========================================================================
  btnBrowseFiles.addEventListener('click', () => fileInput.click());
  dropZone.addEventListener('click', (e) => {
    if (e.target !== btnRemoveFile && !selectedFile) fileInput.click();
  });

  fileInput.addEventListener('change', (e) => {
    if (e.target.files && e.target.files[0]) {
      handleSelectedFile(e.target.files[0]);
    }
  });

  dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('dragover');
  });

  dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));

  dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('dragover');
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleSelectedFile(e.dataTransfer.files[0]);
    }
  });

  function handleSelectedFile(file) {
    selectedFile = file;
    const reader = new FileReader();
    reader.onload = (e) => {
      previewImage.src = e.target.result;
      previewFileName.textContent = file.name;
      dropZone.querySelector('.drop-zone-content').style.display = 'none';
      uploadPreview.style.display = 'block';
      btnProcessUpload.disabled = false;
    };
    reader.readAsDataURL(file);
  }

  btnRemoveFile.addEventListener('click', (e) => {
    e.stopPropagation();
    selectedFile = null;
    fileInput.value = '';
    previewImage.src = '';
    dropZone.querySelector('.drop-zone-content').style.display = 'block';
    uploadPreview.style.display = 'none';
    btnProcessUpload.disabled = true;
  });

  btnProcessUpload.addEventListener('click', async () => {
    if (!selectedFile) return;

    showLoadingState(true);
    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('mode', currentWorkflowMode);

    try {
      const res = await fetch('/api/barcode/scan-and-fetch', {
        method: 'POST',
        body: formData
      });

      if (!res.ok) throw new Error('Server returned ' + res.status);
      const data = await res.json();

      if (data.barcode && data.barcode.success) {
        showToast(`Decoded: ${data.barcode.rawValue} (${data.barcode.symbologyFormat})`);
        displayBarcodeData(data);
        refreshInventoryCount();
      } else {
        showToast(data.barcode?.errorMessage || 'No barcode detected in image');
        displayUnrecognizedBarcode(data.barcode?.errorMessage);
      }
    } catch (err) {
      console.error('Scan error:', err);
      showToast('Error processing image upload');
    } finally {
      showLoadingState(false);
    }
  });

  // ==========================================================================
  // 7. Direct Barcode Lookup & Format Detection
  // ==========================================================================
  barcodeInput.addEventListener('input', () => {
    updateDetectedFormat(barcodeInput.value);
  });

  barcodeInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      lookupProduct(barcodeInput.value);
    }
  });

  btnLookupManual.addEventListener('click', () => {
    lookupProduct(barcodeInput.value);
  });

  function updateDetectedFormat(val) {
    const clean = val.trim();
    if (!clean) {
      formatHint.textContent = 'Detected format: Waiting for input...';
      return;
    }

    if (clean.startsWith('http://') || clean.startsWith('https://')) {
      formatHint.textContent = 'Detected format: Web URL (Encoded in Code-128 / QR Code)';
      return;
    }

    const cleanDigits = clean.replace(/[-\s]/g, '');
    if (/^\d+$/.test(cleanDigits)) {
      if (cleanDigits.length === 13 && (cleanDigits.startsWith('978') || cleanDigits.startsWith('979'))) {
        formatHint.textContent = 'Detected format: ISBN-13 Book Code';
      } else if (cleanDigits.length === 8) formatHint.textContent = 'Detected format: EAN-8 (Standard Retail)';
      else if (cleanDigits.length === 12) formatHint.textContent = 'Detected format: UPC-A (Standard Retail)';
      else if (cleanDigits.length === 13) formatHint.textContent = 'Detected format: EAN-13 (Standard Retail International)';
      else if (cleanDigits.length === 14) formatHint.textContent = 'Detected format: ITF-14 / Shipping Master Carton';
      else formatHint.textContent = `Detected format: 1D Numeric Code (${cleanDigits.length} digits)`;
    } else {
      formatHint.textContent = 'Detected format: Code 128 / Code 39 (Alphanumeric)';
    }
  }

  async function lookupProduct(barcode, showLoading = true) {
    const clean = barcode?.trim();
    if (!clean) {
      showToast('Please enter a valid barcode');
      return;
    }

    if (showLoading) showLoadingState(true);
    try {
      const res = await fetch(`/api/product/${encodeURIComponent(clean)}?mode=${encodeURIComponent(currentWorkflowMode)}`);
      if (!res.ok) throw new Error('API returned ' + res.status);
      const data = await res.json();

      displayBarcodeData(data);
      refreshInventoryCount();
    } catch (err) {
      console.error('Lookup failed:', err);
      showToast('Failed to analyze barcode');
    } finally {
      if (showLoading) showLoadingState(false);
    }
  }

  // ==========================================================================
  // 8. Universal Barcode & Dual-Workflow Entity Data Renderer
  // ==========================================================================
  function displayBarcodeData(response) {
    if (!response || !response.barcode) return;
    currentScanResult = response;

    const barcode = response.barcode;
    const product = response.product;
    const isPreviouslySaved = response.isPreviouslySaved;
    const savedProduct = response.savedProduct;
    const mode = response.mode || currentWorkflowMode;

    resultsEmpty.style.display = 'none';
    productView.style.display = 'block';

    // ------------------------------------------------------------------------
    // A. Saved Product / Availability Status Alert Banner
    // ------------------------------------------------------------------------
    savedProductAlert.className = 'saved-product-alert';
    alertFirstScannedBadge.style.display = 'none';
    alertScanCountBadge.style.display = 'none';
    btnAlertSaveProduct.style.display = 'none';
    btnAlertIncrementStock.style.display = 'none';

    if (isPreviouslySaved && savedProduct) {
      // SCENARIO: PRODUCT WAS ALREADY SCANNED & SAVED FIRST!
      savedProductAlert.classList.add('state-saved-first');
      
      alertChipStatus.className = 'alert-chip chip-success';
      alertChipStatus.textContent = '🌟 Saved in Inventory (Scanned First)';

      alertFirstScannedBadge.style.display = 'inline-block';
      const firstDate = new Date(savedProduct.firstScannedAtUtc);
      alertFirstScannedBadge.textContent = `First Scanned: ${firstDate.toLocaleDateString()} ${firstDate.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}`;

      alertScanCountBadge.style.display = 'inline-block';
      alertScanCountBadge.textContent = `Scanned ${savedProduct.scanCount} Times`;

      if (mode === 'check') {
        if (savedProduct.quantity > 0) {
          alertTitleText.textContent = `Product Available in Inventory (${savedProduct.quantity} In Stock)`;
          alertSubtitleText.textContent = `Verified! This product was previously registered on ${firstDate.toLocaleDateString()}. Displaying your saved inventory details.`;
        } else {
          alertTitleText.textContent = `Product Registered But Currently Out of Stock (0 units)`;
          alertSubtitleText.textContent = `This item was previously saved, but current inventory quantity is 0.`;
        }
      } else {
        alertTitleText.textContent = `Product Already Saved (First Scanned on ${firstDate.toLocaleDateString()})`;
        alertSubtitleText.textContent = `You scanned this item before. Your saved product records are displayed below. You can increment stock or update details.`;
      }

      btnAlertIncrementStock.style.display = 'inline-flex';

      // Setup Stock Management Box
      stockManagementBox.style.display = 'flex';
      stockQuantityVal.textContent = savedProduct.quantity;
      if (savedProduct.quantity > 0) {
        stockStatusPill.className = 'stock-status-pill stock-status-available';
        stockStatusPill.textContent = savedProduct.status || 'Available';
      } else {
        stockStatusPill.className = 'stock-status-pill stock-status-outofstock';
        stockStatusPill.textContent = 'Out of Stock';
      }

    } else if (!isPreviouslySaved && mode === 'check') {
      // SCENARIO: NOT IN INVENTORY (Option 1: Check Mode)
      savedProductAlert.classList.add('state-not-saved');

      alertChipStatus.className = 'alert-chip chip-warning';
      alertChipStatus.textContent = '⚠️ Not in Saved Inventory';

      alertTitleText.textContent = 'Product Not Registered in Inventory';
      alertSubtitleText.textContent = 'This barcode was decoded successfully, but no saved record exists in your inventory. You can save it right now.';

      btnAlertSaveProduct.style.display = 'inline-flex';
      stockManagementBox.style.display = 'none';

    } else if (mode === 'save' && savedProduct) {
      // SCENARIO: NEWLY SCANNED & SAVED (Option 2: Save Mode)
      savedProductAlert.classList.add('state-newly-saved');

      alertChipStatus.className = 'alert-chip chip-primary';
      alertChipStatus.textContent = '✨ Newly Saved to Inventory';

      alertFirstScannedBadge.style.display = 'inline-block';
      alertFirstScannedBadge.textContent = 'First Scanned: Just Now';
      alertScanCountBadge.style.display = 'inline-block';
      alertScanCountBadge.textContent = 'Scanned 1 Time';

      alertTitleText.textContent = `Successfully Saved into Inventory!`;
      alertSubtitleText.textContent = `The barcode was decoded and registered into your local persistent inventory with 1 initial stock unit.`;

      btnAlertIncrementStock.style.display = 'inline-flex';

      stockManagementBox.style.display = 'flex';
      stockQuantityVal.textContent = savedProduct.quantity || 1;
      stockStatusPill.className = 'stock-status-pill stock-status-available';
      stockStatusPill.textContent = 'Available';
    }

    // Status Badge in Header
    verifiedBadge.className = 'status-badge ' + (isPreviouslySaved ? 'badge-found' : (mode === 'save' ? 'badge-found' : 'badge-idle'));
    verifiedBadgeText.textContent = isPreviouslySaved 
      ? 'Product Found in Inventory' 
      : (mode === 'save' ? 'Registered & Saved' : 'Barcode Decoded');

    // ------------------------------------------------------------------------
    // B. Decoded Value & Technical Tags
    // ------------------------------------------------------------------------
    decodedMainValue.textContent = barcode.rawValue;
    pillSymbology.textContent = (savedProduct?.symbologyFormat && savedProduct.symbologyFormat !== 'UNKNOWN') 
      ? savedProduct.symbologyFormat 
      : (barcode.symbologyFormat || 'BARCODE');
    pillPayloadType.textContent = savedProduct?.payloadType || barcode.payloadType || 'Data';
    pillLength.textContent = `${barcode.length} Chars`;
    pillCharset.textContent = barcode.characterSet || 'ASCII';

    if (barcode.checksumValid === true) {
      pillChecksum.textContent = 'Checksum Valid';
      pillChecksum.className = 'tag-pill tag-checksum';
      pillChecksum.style.display = 'inline-flex';
    } else if (barcode.checksumValid === false) {
      pillChecksum.textContent = 'Checksum Invalid';
      pillChecksum.className = 'tag-pill';
      pillChecksum.style.background = 'rgba(239, 68, 68, 0.2)';
      pillChecksum.style.color = '#fca5a5';
      pillChecksum.style.display = 'inline-flex';
    } else {
      pillChecksum.style.display = 'none';
    }

    // URL Action Button
    const isUrl = barcode.rawValue.startsWith('http://') || barcode.rawValue.startsWith('https://');
    if (isUrl) {
      urlActionRow.style.display = 'block';
      urlActionBtn.href = barcode.rawValue;
    } else {
      urlActionRow.style.display = 'none';
    }

    // ------------------------------------------------------------------------
    // C. Product Entity Display (Displaying Saved Product details if saved)
    // ------------------------------------------------------------------------
    entityCard.style.display = 'flex';

    if (isPreviouslySaved && savedProduct) {
      entityTitle.textContent = savedProduct.title || `Product ${savedProduct.barcode}`;
      entityBrand.textContent = savedProduct.brandOrManufacturer || 'Saved Product';
      entityCategory.textContent = savedProduct.category || 'General';
      entityDesc.textContent = savedProduct.notes 
        ? `${savedProduct.description || ''} [Notes: ${savedProduct.notes}]` 
        : (savedProduct.description || 'Saved in local inventory catalog.');

      if (savedProduct.imageUrl) {
        entityThumbBox.style.display = 'flex';
        entityImage.src = savedProduct.imageUrl;
      } else if (product?.imageUrl) {
        entityThumbBox.style.display = 'flex';
        entityImage.src = product.imageUrl;
      } else {
        entityThumbBox.style.display = 'none';
      }
    } else if (product && product.title && product.foundInRegistry) {
      entityTitle.textContent = product.title;
      entityBrand.textContent = product.brandOrManufacturer || 'Indexed Entity';
      entityCategory.textContent = product.category || 'General Product';
      entityDesc.textContent = product.description || 'Online registry match found.';

      if (product.imageUrl) {
        entityThumbBox.style.display = 'flex';
        entityImage.src = product.imageUrl;
      } else {
        entityThumbBox.style.display = 'none';
      }
    } else {
      entityThumbBox.style.display = 'none';
      entityTitle.textContent = `Barcode: ${barcode.rawValue}`;
      entityBrand.textContent = 'Physical Scan Engine';
      entityCategory.textContent = barcode.payloadType;
      entityDesc.textContent = '100% of data identified from the barcode. Ready to be saved to inventory.';
    }

    // ------------------------------------------------------------------------
    // D. Identified Barcode Breakdown (Segments, AI Codes, Subfields)
    // ------------------------------------------------------------------------
    breakdownGrid.innerHTML = '';
    let breakdownCount = 0;

    if (savedProduct) {
      const invFields = [
        { key: 'Inventory Status', val: savedProduct.status },
        { key: 'In-Stock Quantity', val: `${savedProduct.quantity} units` },
        { key: 'Total Times Scanned', val: `${savedProduct.scanCount} times` },
        { key: 'First Scanned Record', val: new Date(savedProduct.firstScannedAtUtc).toLocaleString() }
      ];
      if (savedProduct.price != null) {
        invFields.push({ key: 'Unit Price', val: `$${savedProduct.price.toFixed(2)}` });
      }
      if (savedProduct.notes) {
        invFields.push({ key: 'Custom Notes', val: savedProduct.notes });
      }

      invFields.forEach(f => {
        breakdownCount++;
        const item = document.createElement('div');
        item.className = 'breakdown-item';
        item.style.borderColor = 'rgba(99, 102, 241, 0.3)';
        item.innerHTML = `
          <span class="breakdown-item-key" style="color:#a5b4fc;">${f.key}</span>
          <span class="breakdown-item-val" style="color:#ffffff;">${f.val}</span>
        `;
        breakdownGrid.appendChild(item);
      });
    }

    // GS1 Segments
    if (barcode.segments && barcode.segments.length > 0) {
      barcode.segments.forEach(seg => {
        breakdownCount++;
        const item = document.createElement('div');
        item.className = 'breakdown-item';
        item.innerHTML = `
          <span class="breakdown-item-key">GS1 (AI ${seg.identifier}) &bull; ${seg.name}</span>
          <span class="breakdown-item-val">${seg.formattedValue}</span>
        `;
        breakdownGrid.appendChild(item);
      });
    }

    // Barcode Attributes
    if (barcode.attributes) {
      Object.entries(barcode.attributes).forEach(([k, v]) => {
        breakdownCount++;
        const item = document.createElement('div');
        item.className = 'breakdown-item';
        item.innerHTML = `
          <span class="breakdown-item-key">${k}</span>
          <span class="breakdown-item-val">${v}</span>
        `;
        breakdownGrid.appendChild(item);
      });
    }

    // Symbology details
    const coreDetails = [
      { key: 'Optical Symbology', val: barcode.symbologyFormat },
      { key: 'Classification', val: barcode.payloadType },
      { key: 'Character Set', val: barcode.characterSet || 'ASCII' },
      { key: 'Payload Size', val: `${barcode.length} chars (${barcode.byteCount || barcode.length} bytes)` }
    ];

    coreDetails.forEach(cd => {
      breakdownCount++;
      const item = document.createElement('div');
      item.className = 'breakdown-item';
      item.innerHTML = `
        <span class="breakdown-item-key">${cd.key}</span>
        <span class="breakdown-item-val">${cd.val}</span>
      `;
      breakdownGrid.appendChild(item);
    });

    breakdownCountBadge.textContent = `${breakdownCount} Data Elements`;
    breakdownCard.style.display = 'block';

    // ------------------------------------------------------------------------
    // E. Technical Properties Grid
    // ------------------------------------------------------------------------
    technicalSpecsGrid.innerHTML = '';
    const specs = [
      { key: 'Decoded Value', val: barcode.rawValue },
      { key: 'Barcode Symbology', val: barcode.symbologyFormat },
      { key: 'Identified Type', val: barcode.payloadType },
      { key: 'Character Length', val: `${barcode.length} characters` },
      { key: 'Inventory Status', val: isPreviouslySaved ? 'Saved in Persistent Database' : 'Not Yet Saved' },
      { key: 'Stock Count', val: savedProduct ? `${savedProduct.quantity} units` : 'N/A' },
      { key: 'First Scanned', val: savedProduct ? new Date(savedProduct.firstScannedAtUtc).toLocaleString() : 'First scan just now' },
      { key: 'Scan Count', val: savedProduct ? `${savedProduct.scanCount} times` : '1 time' },
      { key: 'Checksum Status', val: barcode.checksumValid === true ? 'Verified Valid' : barcode.checksumValid === false ? 'Checksum Mismatch' : 'Not Applicable (Self-Checking Code)' },
      { key: 'Data Authority', val: isPreviouslySaved ? 'Local Saved Inventory Database' : (product?.dataSource || 'Direct Optical Decoder') },
      { key: 'Scan Timestamp', val: new Date(barcode.scannedAtUtc || Date.now()).toLocaleString() }
    ];

    if (product?.referenceUrl) {
      specs.push({ 
        key: 'Registry Reference', 
        val: `<a href="${product.referenceUrl}" target="_blank" rel="noopener">Open Catalog Page &rarr;</a>` 
      });
    }

    specs.forEach(s => {
      const row = document.createElement('div');
      row.className = 'spec-row';
      row.innerHTML = `<span class="spec-key">${s.key}:</span><span class="spec-val">${s.val}</span>`;
      technicalSpecsGrid.appendChild(row);
    });

    // ------------------------------------------------------------------------
    // F. Raw JSON
    // ------------------------------------------------------------------------
    rawJsonCode.textContent = JSON.stringify(response, null, 2);
  }

  function displayUnrecognizedBarcode(msg) {
    resultsEmpty.style.display = 'flex';
    productView.style.display = 'none';
    verifiedBadge.className = 'status-badge badge-notfound';
    verifiedBadgeText.textContent = 'Scan Unsuccessful';
    showToast(msg || 'No barcode detected');
  }

  function showLoadingState(isLoading) {
    resultsLoading.style.display = isLoading ? 'flex' : 'none';
  }

  // ==========================================================================
  // 9. Quick Actions (Stock Adjustment & Manual Save from Check Mode)
  // ==========================================================================
  async function adjustStock(delta) {
    if (!currentScanResult?.barcode?.rawValue) return;
    const barcode = currentScanResult.barcode.rawValue;

    try {
      const res = await fetch(`/api/inventory/stock/${encodeURIComponent(barcode)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ delta: delta })
      });

      if (res.ok) {
        const updated = await res.json();
        currentScanResult.savedProduct = updated;
        currentScanResult.isPreviouslySaved = true;
        stockQuantityVal.textContent = updated.quantity;

        if (updated.quantity > 0) {
          stockStatusPill.className = 'stock-status-pill stock-status-available';
          stockStatusPill.textContent = updated.status;
        } else {
          stockStatusPill.className = 'stock-status-pill stock-status-outofstock';
          stockStatusPill.textContent = 'Out of Stock';
        }

        displayBarcodeData(currentScanResult);
        refreshInventoryCount();
        showToast(`Stock updated: ${updated.quantity} units`);
      } else {
        throw new Error('Failed to update stock');
      }
    } catch (err) {
      console.error(err);
      showToast('Error updating stock');
    }
  }

  btnStockPlus.addEventListener('click', () => adjustStock(1));
  btnStockMinus.addEventListener('click', () => adjustStock(-1));
  btnAlertIncrementStock.addEventListener('click', () => adjustStock(1));

  // Quick Save from Check Mode
  btnAlertSaveProduct.addEventListener('click', async () => {
    if (!currentScanResult?.barcode?.rawValue) return;
    const barcode = currentScanResult.barcode.rawValue;
    const prod = currentScanResult.product;

    try {
      const res = await fetch('/api/inventory/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          barcode: barcode,
          symbologyFormat: currentScanResult.barcode.symbologyFormat,
          title: prod?.title || `Product ${barcode}`,
          brandOrManufacturer: prod?.brandOrManufacturer || 'General',
          category: prod?.category || currentScanResult.barcode.payloadType || 'General',
          description: prod?.description || 'Manually saved from availability check.',
          imageUrl: prod?.imageUrl,
          payloadType: currentScanResult.barcode.payloadType,
          quantity: 1,
          status: 'Available'
        })
      });

      if (res.ok) {
        const saved = await res.json();
        currentScanResult.savedProduct = saved;
        currentScanResult.isPreviouslySaved = true;
        displayBarcodeData(currentScanResult);
        refreshInventoryCount();
        showToast(`Product saved to inventory: ${saved.title}`);
      } else {
        throw new Error('Failed to save product');
      }
    } catch (err) {
      console.error(err);
      showToast('Error saving product to inventory');
    }
  });

  // ==========================================================================
  // 10. Edit Saved Product Modal
  // ==========================================================================
  btnEditSavedProduct.addEventListener('click', openEditModal);
  btnCloseEditModal.addEventListener('click', () => modalEditProduct.style.display = 'none');
  btnCancelEdit.addEventListener('click', () => modalEditProduct.style.display = 'none');

  function openEditModal() {
    const p = currentScanResult?.savedProduct;
    if (!p) return;

    editBarcode.value = p.barcode;
    editTitle.value = p.title || '';
    editBrand.value = p.brandOrManufacturer || '';
    editCategory.value = p.category || '';
    editQuantity.value = p.quantity ?? 1;
    editPrice.value = p.price ?? '';
    editStatus.value = p.status || 'Available';
    editNotes.value = p.notes || '';

    modalEditProduct.style.display = 'flex';
  }

  btnSaveProductChanges.addEventListener('click', async (e) => {
    e.preventDefault();
    if (!editBarcode.value.trim() || !editTitle.value.trim()) {
      showToast('Barcode and Product Title are required.');
      return;
    }

    const payload = {
      barcode: editBarcode.value.trim(),
      title: editTitle.value.trim(),
      brandOrManufacturer: editBrand.value.trim(),
      category: editCategory.value.trim(),
      quantity: parseInt(editQuantity.value) || 0,
      price: editPrice.value ? parseFloat(editPrice.value) : null,
      status: editStatus.value,
      notes: editNotes.value.trim()
    };

    try {
      const res = await fetch('/api/inventory/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        const updated = await res.json();
        modalEditProduct.style.display = 'none';
        if (currentScanResult && currentScanResult.barcode.rawValue === updated.barcode) {
          currentScanResult.savedProduct = updated;
          displayBarcodeData(currentScanResult);
        }
        refreshInventoryCount();
        showToast('Product details saved successfully!');
      } else {
        throw new Error('Save failed');
      }
    } catch (err) {
      console.error(err);
      showToast('Failed to update product details');
    }
  });

  // ==========================================================================
  // 11. Saved Inventory Drawer / Modal Management
  // ==========================================================================
  btnOpenInventory.addEventListener('click', () => {
    modalInventory.style.display = 'flex';
    refreshInventoryCount();
  });
  btnCloseInventoryModal.addEventListener('click', () => modalInventory.style.display = 'none');
  btnCloseInventoryBottom.addEventListener('click', () => modalInventory.style.display = 'none');
  btnRefreshInventory.addEventListener('click', refreshInventoryCount);

  inventorySearchInput.addEventListener('input', () => {
    const q = inventorySearchInput.value.toLowerCase().trim();
    if (!q) {
      renderInventoryTable(cachedInventory);
      return;
    }
    const filtered = cachedInventory.filter(item => 
      item.barcode.toLowerCase().includes(q) ||
      (item.title && item.title.toLowerCase().includes(q)) ||
      (item.brandOrManufacturer && item.brandOrManufacturer.toLowerCase().includes(q)) ||
      (item.category && item.category.toLowerCase().includes(q))
    );
    renderInventoryTable(filtered);
  });

  function renderInventoryTable(items) {
    inventoryTableBody.innerHTML = '';
    inventoryStatsNote.textContent = `Total: ${items.length} saved products`;

    if (!items || items.length === 0) {
      inventoryEmptyState.style.display = 'block';
      return;
    }
    inventoryEmptyState.style.display = 'none';

    items.forEach(item => {
      const row = document.createElement('tr');
      const firstDate = new Date(item.firstScannedAtUtc).toLocaleDateString();

      row.innerHTML = `
        <td class="inventory-barcode-cell">${item.barcode}</td>
        <td class="inventory-title-cell">
          <strong>${item.title || 'Untitled Product'}</strong>
          <span>${item.brandOrManufacturer || 'General'}</span>
        </td>
        <td>${item.category || '-'}</td>
        <td>
          <div style="display:flex; align-items:center; gap:6px;">
            <button class="stock-counter-btn" style="width:22px; height:22px; font-size:0.8rem;" data-action="minus" data-code="${item.barcode}">&minus;</button>
            <span style="font-family:var(--font-mono); font-weight:700;">${item.quantity}</span>
            <button class="stock-counter-btn" style="width:22px; height:22px; font-size:0.8rem;" data-action="plus" data-code="${item.barcode}">&plus;</button>
          </div>
        </td>
        <td>
          <span class="stock-status-pill ${item.quantity > 0 ? 'stock-status-available' : 'stock-status-outofstock'}">
            ${item.quantity > 0 ? 'In Stock' : 'Out of Stock'}
          </span>
        </td>
        <td>${firstDate}</td>
        <td><span style="color:#a5b4fc; font-weight:600;">${item.scanCount}x</span></td>
        <td>
          <div class="inventory-actions-cell">
            <button class="btn btn-xs btn-primary" data-action="view" data-code="${item.barcode}" title="Scan & Check availability">
              Check
            </button>
            <button class="btn btn-xs btn-outline" data-action="delete" data-code="${item.barcode}" title="Delete from inventory" style="color:#f87171;">
              Delete
            </button>
          </div>
        </td>
      `;

      inventoryTableBody.appendChild(row);
    });

    // Row button event delegation
    inventoryTableBody.querySelectorAll('button[data-action]').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const action = btn.getAttribute('data-action');
        const code = btn.getAttribute('data-code');

        if (action === 'view') {
          modalInventory.style.display = 'none';
          barcodeInput.value = code;
          updateDetectedFormat(code);
          lookupProduct(code);
        } else if (action === 'plus') {
          await updateStockViaApi(code, 1);
        } else if (action === 'minus') {
          await updateStockViaApi(code, -1);
        } else if (action === 'delete') {
          if (confirm(`Are you sure you want to delete barcode "${code}" from saved inventory?`)) {
            await deleteFromInventory(code);
          }
        }
      });
    });
  }

  async function updateStockViaApi(barcode, delta) {
    try {
      const res = await fetch(`/api/inventory/stock/${encodeURIComponent(barcode)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ delta: delta })
      });
      if (res.ok) {
        refreshInventoryCount();
        if (currentScanResult?.barcode?.rawValue === barcode) {
          lookupProduct(barcode, false);
        }
      }
    } catch (err) {
      console.error(err);
    }
  }

  async function deleteFromInventory(barcode) {
    try {
      const res = await fetch(`/api/inventory/${encodeURIComponent(barcode)}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        showToast(`Product ${barcode} deleted from inventory`);
        refreshInventoryCount();
        if (currentScanResult?.barcode?.rawValue === barcode) {
          lookupProduct(barcode, false);
        }
      }
    } catch (err) {
      console.error(err);
      showToast('Failed to delete product');
    }
  }

  // ==========================================================================
  // 12. Barcode Generator
  // ==========================================================================
  function updateBarcodeGenerator() {
    const val = genContent.value.trim() || 'https://github.com/Barkha777';
    const fmt = genFormat.value;
    const url = `/api/barcode/generate/${encodeURIComponent(val)}?format=${encodeURIComponent(fmt)}&width=380&height=130`;
    
    generatedBarcodeImg.src = url;
    btnDownloadBarcode.href = url;
    btnDownloadBarcode.download = `barcode_${val.replace(/[^a-zA-Z0-9]/g, '_')}.png`;
  }

  btnRefreshBarcode.addEventListener('click', updateBarcodeGenerator);
  genFormat.addEventListener('change', updateBarcodeGenerator);
  genContent.addEventListener('input', () => {
    clearTimeout(genContent._timeout);
    genContent._timeout = setTimeout(updateBarcodeGenerator, 500);
  });

  btnTestGeneratedBarcode.addEventListener('click', () => {
    const val = genContent.value.trim();
    barcodeInput.value = val;
    updateDetectedFormat(val);
    lookupProduct(val);
    showToast(`Analyzing generated barcode: ${val}`);
  });

  // ==========================================================================
  // 13. Code Snippet Modal & Copy
  // ==========================================================================
  btnHeaderCodeSnippet.addEventListener('click', openCodeSnippetModal);
  btnCloseModal.addEventListener('click', () => modalSnippet.style.display = 'none');
  btnCloseModalBottom.addEventListener('click', () => modalSnippet.style.display = 'none');
  modalSnippet.addEventListener('click', (e) => {
    if (e.target === modalSnippet) modalSnippet.style.display = 'none';
  });

  async function openCodeSnippetModal() {
    modalSnippet.style.display = 'flex';
    try {
      const res = await fetch('/api/code-snippet');
      if (res.ok) {
        const text = await res.text();
        codeSnippetContent.textContent = text;
      }
    } catch {
      codeSnippetContent.textContent = '// Failed to load code snippet from server.';
    }
  }

  btnCopyCodeSnippet.addEventListener('click', () => {
    navigator.clipboard.writeText(codeSnippetContent.textContent).then(() => {
      showToast('C# Barcode Scanner Module copied to clipboard!');
    });
  });

  btnCopyBarcodeVal.addEventListener('click', () => {
    navigator.clipboard.writeText(decodedMainValue.textContent).then(() => {
      showToast('Barcode content copied to clipboard!');
    });
  });

  btnCopyJson.addEventListener('click', () => {
    navigator.clipboard.writeText(rawJsonCode.textContent).then(() => {
      showToast('Raw JSON copied to clipboard!');
    });
  });

  function showToast(message) {
    toast.textContent = message;
    toast.classList.add('show');
    clearTimeout(toast._timeout);
    toast._timeout = setTimeout(() => {
      toast.classList.remove('show');
    }, 3200);
  }

  // ==========================================================================
  // 14. Theme Toggle (Warm Paper Light / Night Sky Dark)
  // ==========================================================================
  const btnThemeToggle = document.getElementById('btnThemeToggle');
  const themeBtnIcon = document.getElementById('themeBtnIcon');
  const themeBtnText = document.getElementById('themeBtnText');

  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('scancore_theme', theme);
    if (theme === 'dark') {
      if (themeBtnIcon) themeBtnIcon.textContent = '☀️';
      if (themeBtnText) themeBtnText.textContent = 'Warm Paper';
    } else {
      if (themeBtnIcon) themeBtnIcon.textContent = '🌙';
      if (themeBtnText) themeBtnText.textContent = 'Night Sky';
    }
  }

  // Load saved theme or default to light (Warm Paper, like https://cd-24011-a-search-algo.vercel.app/)
  const savedTheme = localStorage.getItem('scancore_theme') || 'light';
  applyTheme(savedTheme);

  if (btnThemeToggle) {
    btnThemeToggle.addEventListener('click', () => {
      const current = document.documentElement.getAttribute('data-theme') || 'light';
      const nextTheme = current === 'dark' ? 'light' : 'dark';
      applyTheme(nextTheme);
      showToast(`Theme changed to ${nextTheme === 'dark' ? 'Night Sky (Dark)' : 'Warm Paper (Light)'}`);
    });
  }

  // Initializers
  initBackendHealth();
  refreshInventoryCount();
  loadSampleProducts();
  updateBarcodeGenerator();
});
