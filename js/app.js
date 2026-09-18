/**
 * Main Application Initializer
 */
document.addEventListener('DOMContentLoaded', () => {
  // 1. Render Main Tools Tray
  if (window.AI_TOOLS && document.getElementById('toolsHorizontalTray')) {
    window.UIController.renderToolsTray('toolsHorizontalTray', window.AI_TOOLS);
  }

  // 2. Setup Upload Interactions
  const dropZone = document.getElementById('uploadBox');
  const fileInput = document.getElementById('fileInput');
  const previewContainer = document.getElementById('previewContainer');
  const fileNameEl = document.getElementById('previewFileName');
  const fileSizeEl = document.getElementById('previewFileSize');
  const removeBtn = document.getElementById('removeFileBtn');
  const beforeImg = document.getElementById('sliderBeforeImg');
  const afterImg = document.getElementById('sliderAfterImg');

  if (dropZone && fileInput) {
    new window.MediaUploadHandler({
      dropZone: dropZone,
      fileInput: fileInput,
      onFileReady: (meta) => {
        dropZone.style.display = 'none';
        if (previewContainer) previewContainer.classList.add('active');
        if (fileNameEl) fileNameEl.innerText = meta.name;
        if (fileSizeEl) fileSizeEl.innerText = meta.size;
        
        // Populate Before/After placeholder with the uploaded preview
        if (meta.type === 'photo') {
          if (beforeImg) beforeImg.src = meta.blobUrl;
          if (afterImg) afterImg.src = meta.blobUrl;
        }
      }
    });
  }

  if (removeBtn) {
    removeBtn.addEventListener('click', () => {
      if (fileInput) fileInput.value = '';
      if (previewContainer) previewContainer.classList.remove('active');
      if (dropZone) dropZone.style.display = 'block';
    });
  }

  // 3. Init Comparison Sliders
  document.querySelectorAll('.comparison-wrapper').forEach(slider => {
    window.UIController.setupComparisonSlider(slider);
  });

  // 4. Register Service Worker
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./service-worker.js').catch((err) => {
      console.warn('SW registration skipped:', err);
    });
  }
});
