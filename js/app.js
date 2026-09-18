/**
 * Production Event Controller & Task Management
 */
let currentSelectedFile = null;
window.currentToolId = "photo-enhancer";

document.addEventListener('DOMContentLoaded', async () => {
  // 1. Render Main Tool Trays
  if (window.AI_TOOLS && document.getElementById('toolsHorizontalTray')) {
    window.UIController.renderToolsTray('toolsHorizontalTray', window.AI_TOOLS);
  }

  // 2. Auth Session Check & Credit Hydration
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

  // 3. Upload & Preview Handling
  const dropZone = document.getElementById('uploadBox');
  const fileInput = document.getElementById('fileInput');
  const previewContainer = document.getElementById('previewContainer');
  const fileNameEl = document.getElementById('previewFileName');
  const fileSizeEl = document.getElementById('previewFileSize');
  const removeBtn = document.getElementById('removeFileBtn');
  const photoSlider = document.getElementById('photoSliderContainer');
  const beforeImg = document.getElementById('sliderBeforeImg');
  const afterImg = document.getElementById('sliderAfterImg');
  const videoContainer = document.getElementById('videoPreviewContainer');
  const videoPlayer = document.getElementById('videoPreviewPlayer');
  const processBtn = document.getElementById('processBtn');

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
        
        if (meta.type === 'video') {
          if (photoSlider) photoSlider.style.display = 'none';
          if (videoContainer) videoContainer.style.display = 'block';
          if (videoPlayer) {
            videoPlayer.src = meta.blobUrl;
            videoPlayer.load();
          }
        } else {
          if (videoContainer) videoContainer.style.display = 'none';
          if (photoSlider) photoSlider.style.display = 'block';
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
      if (videoPlayer) {
        videoPlayer.pause();
        videoPlayer.src = '';
      }
    });
  }

  // 4. Real Generation Flow (Truthful API State)
  if (processBtn) {
    processBtn.addEventListener('click', async () => {
      const user = await window.BackendAPI.getUser();
      if (!user) {
        alert("Please sign in first via Profile -> Sign In.");
        window.location.href = "login.html";
        return;
      }

      if (!currentSelectedFile) {
        alert("Please choose a photo or video first.");
        return;
      }

      const processingState = document.getElementById('processingState');
      const statusText = document.getElementById('processingStatusText');
      const noticeMsg = document.getElementById('noticeMsg');

      try {
        processBtn.disabled = true;
        processingState.style.display = 'block';
        statusText.innerText = "1/2 Uploading encrypted media...";

        const storagePath = await window.BackendAPI.uploadMedia(currentSelectedFile, user.id);

        statusText.innerText = "2/2 Deducting credits and queueing job...";
        const genRes = await window.BackendAPI.startGeneration(window.currentToolId, storagePath);

        const count = document.getElementById('headerCreditCount');
        if (count && genRes.remaining_credits !== undefined) {
          count.innerText = genRes.remaining_credits;
        }

        // Truthful notice: Real backend task queued, provider status checked
        noticeMsg.innerHTML = `✅ Job queued (ID: ${genRes.generation_id.substring(0,8)}...).<br><span style="color: #f59e0b;">AI Provider: NOT CONFIGURED. Set AI_API_KEY in backend to enable model weights.</span>`;
        alert(`Job Queued in Database!\nTask ID: ${genRes.generation_id}\nRemaining Credits: ${genRes.remaining_credits}\n\nAI Provider Status: NOT CONFIGURED (Production keys required).`);

      } catch (err) {
        alert(err.message);
        noticeMsg.innerText = err.message;
      } finally {
        processBtn.disabled = false;
        processingState.style.display = 'none';
      }
    });
  }

  // 5. Watch Ad & Earn Reward Credits Handler
  const adRewardBtn = document.getElementById('claimAdRewardBtn');
  if (adRewardBtn) {
    adRewardBtn.addEventListener('click', async () => {
      const user = await window.BackendAPI.getUser();
      if (!user) {
        alert("Please log in to claim reward credits.");
        return;
      }

      adRewardBtn.innerText = "Simulating verified ad view (5s)...";
      adRewardBtn.disabled = true;

      setTimeout(async () => {
        try {
          const res = await window.BackendAPI.claimReward(user.id);
          if (res.success) {
            alert(`Reward claimed! +1 Credit added. Total: ${res.remaining_credits}`);
            const count = document.getElementById('headerCreditCount');
            if (count) count.innerText = res.remaining_credits;
          } else {
            alert(res.message);
          }
        } catch (e) {
          alert(e.message);
        } finally {
          adRewardBtn.innerText = "📺 Watch Ad (+1 Credit)";
          adRewardBtn.disabled = false;
        }
      }, 5000);
    });
  }

  // 6. Init Comparison Sliders
  document.querySelectorAll('.comparison-wrapper').forEach(slider => {
    window.UIController.setupComparisonSlider(slider);
  });
});
