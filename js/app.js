/**
 * Main Application Initializer & Supabase Bridge
 */
let currentSelectedFile = null;
let currentToolId = "v-enhancer";

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

  // 3. Setup Upload & Preview Listeners
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
        statusText.innerText = "1/3 Uploading to secure Supabase storage...";

        // Real Storage Upload
        const storagePath = await window.BackendAPI.uploadMedia(currentSelectedFile, user.id);

        statusText.innerText = "2/3 Deducting credits and queueing job...";
        const isVideo = currentSelectedFile.type.startsWith('video');
        const toolType = isVideo ? 'video-enhancer' : 'photo-enhancer';

        // Call Edge Function
        const genRes = await window.BackendAPI.startGeneration(toolType, storagePath);

        statusText.innerText = "3/3 Calling AI Engine...";
        const processRes = await window.BackendAPI.triggerProcessing(genRes.generation_id, isVideo);

        if (processRes.error) {
          alert(processRes.error);
          noticeMsg.innerText = processRes.error;
        } else {
          noticeMsg.innerText = "Job processed successfully!";
          if (processRes.output_url) {
            if (isVideo && videoPlayer) {
              videoPlayer.src = processRes.output_url;
            } else {
              document.getElementById('sliderAfterImg').src = processRes.output_url;
            }
          }
        }

      } catch (err) {
        alert(err.message);
        noticeMsg.innerText = err.message;
      } finally {
        processBtn.disabled = false;
        processingState.style.display = 'none';
      }
    });
  }

  // 5. Comparison Slider Init
  document.querySelectorAll('.comparison-wrapper').forEach(slider => {
    window.UIController.setupComparisonSlider(slider);
  });
});
