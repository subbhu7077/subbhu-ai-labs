let currentSelectedFile = null;
window.currentToolId = "photo-enhancer";

document.addEventListener('DOMContentLoaded', async () => {
  if (window.AI_TOOLS && document.getElementById('toolsHorizontalTray')) {
    window.UIController.renderToolsTray('toolsHorizontalTray', window.AI_TOOLS);
  }

  let currentUser = null;
  if (window.BackendAPI) {
    try {
      currentUser = await window.BackendAPI.getUser();
      if (currentUser) {
        const { data: profile } = await window.BackendAPI.getProfile(currentUser.id);
        if (profile) {
          const badge = document.getElementById('headerCreditBadge');
          const count = document.getElementById('headerCreditCount');
          if (badge && count) {
            count.innerText = profile.credits;
            badge.style.display = 'inline-flex';
          }
        }
      }
    } catch (e) {
      console.warn("Unauthenticated session", e);
    }
  }

  const dropZone = document.getElementById('uploadBox');
  const fileInput = document.getElementById('fileInput');
  const previewContainer = document.getElementById('previewContainer');
  const fileNameEl = document.getElementById('previewFileName');
  const fileSizeEl = document.getElementById('previewFileSize');
  const removeBtn = document.getElementById('removeFileBtn');
  const beforeImg = document.getElementById('sliderBeforeImg');
  const afterImg = document.getElementById('sliderAfterImg');
  const processBtn = document.getElementById('processBtn');
  const downloadBtn = document.getElementById('downloadResultBtn');

  if (dropZone && fileInput) {
    new window.MediaUploadHandler({
      dropZone: dropZone,
      fileInput: fileInput,
      onFileReady: (meta) => {
        currentSelectedFile = fileInput.files[0];
        dropZone.style.display = 'none';
        if (previewContainer) previewContainer.classList.add('active');
        if (fileNameEl) fileNameEl.innerText = meta.name;
        if (fileSizeEl) fileSizeEl.innerText = meta.size;
        
        if (beforeImg) beforeImg.src = meta.blobUrl;
        if (afterImg) afterImg.src = meta.blobUrl;
        if (downloadBtn) downloadBtn.style.display = 'none';
      }
    });
  }

  if (removeBtn) {
    removeBtn.addEventListener('click', () => {
      currentSelectedFile = null;
      if (fileInput) fileInput.value = '';
      if (previewContainer) previewContainer.classList.remove('active');
      if (dropZone) dropZone.style.display = 'block';
      if (downloadBtn) downloadBtn.style.display = 'none';
    });
  }

  if (processBtn) {
    processBtn.addEventListener('click', async () => {
      const user = await window.BackendAPI.getUser();
      if (!user) {
        alert("Please sign in first via Profile -> Sign In.");
        window.location.href = "login.html";
        return;
      }

      if (!currentSelectedFile) {
        alert("Please choose a photo first.");
        return;
      }

      const processingState = document.getElementById('processingState');
      const statusText = document.getElementById('processingStatusText');
      const noticeMsg = document.getElementById('noticeMsg');

      try {
        processBtn.disabled = true;
        if (downloadBtn) downloadBtn.style.display = 'none';
        processingState.style.display = 'block';
        
        statusText.innerText = "1/4 Uploading original to storage...";
        const storagePath = await window.BackendAPI.uploadMedia(currentSelectedFile, user.id);

        statusText.innerText = "2/4 Deducting credits...";
        const genRes = await window.BackendAPI.startGeneration(window.currentToolId, storagePath);

        const count = document.getElementById('headerCreditCount');
        if (count && genRes.remaining_credits !== undefined) {
          count.innerText = genRes.remaining_credits;
        }

        statusText.innerText = "3/4 AI Neural Processing...";
        const enhanced = await window.BackendAPI.enhanceImageLocal(currentSelectedFile, window.currentToolId);
        
        if (afterImg) {
          afterImg.src = enhanced.outputUrl;
        }

        statusText.innerText = "4/4 Archiving output to Supabase Storage...";
        const savedUrl = await window.BackendAPI.uploadOutputToStorage(enhanced.blob, user.id, window.currentToolId);

        await window.BackendAPI.completeTask(genRes.generation_id, savedUrl || enhanced.outputUrl);

        const isBg = window.currentToolId.includes('bg');
        const fileExt = isBg ? 'png' : 'jpg';
        const downloadName = `subbhu_ai_${window.currentToolId}_${Date.now()}.${fileExt}`;
        
        if (downloadBtn) {
          downloadBtn.href = enhanced.outputUrl;
          downloadBtn.download = downloadName;
          downloadBtn.style.display = 'inline-flex';
        }

        noticeMsg.innerHTML = "✨ Complete! Tap below to save to device.";

      } catch (err) {
        alert(err.message);
        noticeMsg.innerText = err.message;
      } finally {
        processBtn.disabled = false;
        processingState.style.display = 'none';
      }
    });
  }

  document.querySelectorAll('.comparison-wrapper').forEach(slider => {
    window.UIController.setupComparisonSlider(slider);
  });
});
