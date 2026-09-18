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
      }
    });
  }

  if (removeBtn) {
    removeBtn.addEventListener('click', () => {
      currentSelectedFile = null;
      if (fileInput) fileInput.value = '';
      if (previewContainer) previewContainer.classList.remove('active');
      if (dropZone) dropZone.style.display = 'block';
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
        alert("Please choose a photo or video first.");
        return;
      }

      const processingState = document.getElementById('processingState');
      const statusText = document.getElementById('processingStatusText');
      const noticeMsg = document.getElementById('noticeMsg');

      try {
        processBtn.disabled = true;
        processingState.style.display = 'block';
        statusText.innerText = "1/3 Uploading to secure storage...";

        const storagePath = await window.BackendAPI.uploadMedia(currentSelectedFile, user.id);

        statusText.innerText = "2/3 Deducting credits and queuing job...";
        const genRes = await window.BackendAPI.startGeneration(window.currentToolId, storagePath);

        const count = document.getElementById('headerCreditCount');
        if (count && genRes.remaining_credits !== undefined) {
          count.innerText = genRes.remaining_credits;
        }

        statusText.innerText = "3/3 Processing with AI Model...";
        
        try {
          const aiResult = await window.BackendAPI.processRealAI(genRes.generation_id, currentSelectedFile);
          if (aiResult.output_url && afterImg) {
            afterImg.src = aiResult.output_url;
            noticeMsg.innerHTML = "✅ Enhancement Complete! Slide to compare.";
            alert("AI Processing Complete! Output loaded in After comparison slider.");
          }
        } catch (modelErr) {
          // If public token rate-limited, fallback to clean notice
          noticeMsg.innerHTML = `✅ Job queued (ID: ${genRes.generation_id.substring(0,8)}...).<br><span style="color: #f59e0b;">AI Provider Token Rate-Limited or Missing: Add your HuggingFace/Replicate token in js/supabase-client.js</span>`;
          alert(`Task Queued (ID: ${genRes.generation_id.substring(0,8)}).\nToken configuration required for live GPU inference.`);
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

  // Comparison Sliders Setup
  document.querySelectorAll('.comparison-wrapper').forEach(slider => {
    window.UIController.setupComparisonSlider(slider);
  });
});
