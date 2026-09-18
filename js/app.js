/**
 * Main Application Initializer & Supabase Bridge
 */
let currentSelectedFile = null;
let currentToolId = "face-enhancer";

document.addEventListener('DOMContentLoaded', async () => {
  // 1. Render Main Tools Tray
  if (window.AI_TOOLS && document.getElementById('toolsHorizontalTray')) {
    window.UIController.renderToolsTray('toolsHorizontalTray', window.AI_TOOLS);
  }

  // 2. Auth Session Check & Credit Hydration
  if (window.BackendAPI) {
    try {
      const user = await window.BackendAPI.getUser();
      if (user) {
        const { data: profile } = await window.BackendAPI.getProfile(user.id);
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
      console.warn("User session unauthenticated", e);
    }
  }

  // 3. Setup Upload Listeners
  const dropZone = document.getElementById('uploadBox');
  const fileInput = document.getElementById('fileInput');
  const previewContainer = document.getElementById('previewContainer');
  const fileNameEl = document.getElementById('previewFileName');
  const fileSizeEl = document.getElementById('previewFileSize');
  const removeBtn = document.getElementById('removeFileBtn');
  const photoSlider = document.getElementById('photoSliderContainer');
  const beforeImg = document.getElementById('sliderBeforeImg');
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

  // 4. Handle Real Backend Process Flow
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
        statusText.innerText = "1/2 Uploading to secure Supabase storage...";

        // Real Storage Upload
        const storagePath = await window.BackendAPI.uploadMedia(currentSelectedFile, user.id);

        statusText.innerText = "2/2 Deducting credit & queuing job in database...";
        const isVideo = currentSelectedFile.type.startsWith('video');
        const toolType = isVideo ? 'video-enhancer' : 'face-enhancer';

        // Server-side deduction and job creation
        const genRes = await window.BackendAPI.startGeneration(toolType, storagePath);

        // Update credits badge in real-time
        const count = document.getElementById('headerCreditCount');
        if (count && genRes.remaining_credits !== undefined) {
          count.innerText = genRes.remaining_credits;
        }

        // Truthful notice: Real backend task queued, awaiting AI provider key
        noticeMsg.innerHTML = `✅ Job queued (ID: ${genRes.generation_id.substring(0,8)}...).<br>AI Provider configuration missing: please set AI_API_KEY in Part 3.`;
        alert(`Job queued successfully! 1 Credit deducted. Remaining credits: ${genRes.remaining_credits}.\nAI processing will be connected in Part 3.`);

      } catch (err) {
        alert(err.message);
        noticeMsg.innerText = err.message;
      } finally {
        processBtn.disabled = false;
        processingState.style.display = 'none';
      }
    });
  }

  // 5. Init Comparison Slider
  document.querySelectorAll('.comparison-wrapper').forEach(slider => {
    window.UIController.setupComparisonSlider(slider);
  });
});
