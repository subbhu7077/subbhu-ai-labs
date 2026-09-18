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
  const sliderBox = document.getElementById('photoSliderContainer');
  const videoBox = document.getElementById('videoPreviewContainer');
  const videoPlayer = document.getElementById('videoPreviewPlayer');
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
        if (downloadBtn) downloadBtn.style.display = 'none';

        if (meta.type.startsWith('video/')) {
          if (sliderBox) sliderBox.style.display = 'none';
          if (videoBox) {
            videoBox.style.display = 'block';
            videoPlayer.src = meta.blobUrl;
          }
        } else {
          if (videoBox) videoBox.style.display = 'none';
          if (sliderBox) sliderBox.style.display = 'block';
          if (beforeImg) beforeImg.src = meta.blobUrl;
          if (afterImg) afterImg.src = meta.blobUrl;
        }
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
      if (videoPlayer) videoPlayer.pause();
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
        alert("Please select an image or video file first.");
        return;
      }

      const processingState = document.getElementById('processingState');
      const statusText = document.getElementById('processingStatusText');
      const noticeMsg = document.getElementById('noticeMsg');

      try {
        processBtn.disabled = true;
        if (downloadBtn) downloadBtn.style.display = 'none';
        processingState.style.display = 'block'; const laser = document.getElementById('laserScanBar'); if(laser) laser.style.display = 'block';

        statusText.innerText = "1/4 Uploading to encrypted vault...";
        const storagePath = await window.BackendAPI.uploadMedia(currentSelectedFile, user.id);

        statusText.innerText = "2/4 Verifying AI engine quota...";
        const genRes = await window.BackendAPI.startGeneration(window.currentToolId, storagePath);

        const count = document.getElementById('headerCreditCount');
        if (count && genRes.remaining_credits !== undefined) {
          count.innerText = genRes.remaining_credits;
        }

        statusText.innerText = "3/4 GPU Neural Processing (" + window.currentToolId + ")...";
        const result = await window.BackendAPI.enhanceMediaEngine(currentSelectedFile, window.currentToolId);

        if (result.isVideo) {
          if (videoPlayer) {
            videoPlayer.src = result.outputUrl;
            videoPlayer.play();
          }
        } else {
          if (afterImg) {
            afterImg.src = result.outputUrl;
          }
        }

        statusText.innerText = "4/4 Archiving processed master file...";
        const savedUrl = await window.BackendAPI.uploadOutputToStorage(result.blob, user.id, window.currentToolId);

        await window.BackendAPI.completeTask(genRes.generation_id, savedUrl || result.outputUrl);

        const ext = result.isVideo ? 'mp4' : (window.currentToolId.includes('bg') ? 'png' : 'jpg');
        if (downloadBtn) {
          downloadBtn.href = result.outputUrl;
          downloadBtn.download = `subbhu_${window.currentToolId}_${Date.now()}.${ext}`;
          downloadBtn.style.display = 'inline-flex';
        }

        noticeMsg.innerHTML = "✨ Process Complete! Master 4K / HD File ready.";
        alert("Success! High-quality processing complete. Tap 'SAVE TO DEVICE' to download.");

      } catch (err) {
        alert(err.message);
        noticeMsg.innerText = err.message;
      } finally {
        processBtn.disabled = false;
        processingState.style.display = 'none'; const laser = document.getElementById('laserScanBar'); if(laser) laser.style.display = 'none';
      }
    });
  }

  document.querySelectorAll('.comparison-wrapper').forEach(slider => {
    window.UIController.setupComparisonSlider(slider);
  });
});
