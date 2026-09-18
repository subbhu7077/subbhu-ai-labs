/**
 * UI Renderer, Sliders and Modals Controller
 */
const UIController = {
  renderToolsTray: function(containerId, tools) {
    const container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = tools.map(tool => `
      <div class="tool-chip glass" onclick="UIController.openToolModal('${tool.id}')">
        <div class="chip-icon">${tool.icon}</div>
        <div>
          <div class="chip-label">${tool.name}</div>
          <div class="chip-meta">${tool.tag}</div>
        </div>
      </div>
    `).join('');
  },

  openToolModal: function(toolId) {
    const tool = window.AI_TOOLS.find(t => t.id === toolId);
    if (!tool) return;

    window.currentToolId = tool.id;

    const modal = document.getElementById('toolModal');
    const title = document.getElementById('modalToolTitle');
    const badge = document.getElementById('modalToolBadge');
    
    if (title) title.innerText = tool.name;
    if (badge) badge.innerText = tool.category;
    if (modal) modal.classList.add('active');
  },

  closeModal: function() {
    const modal = document.getElementById('toolModal');
    if (modal) modal.classList.remove('active');
    
    const previewContainer = document.getElementById('previewContainer');
    const uploadBox = document.getElementById('uploadBox');
    const videoPreview = document.getElementById('videoPreviewContainer');
    const photoSlider = document.getElementById('photoSliderContainer');

    if (previewContainer) previewContainer.classList.remove('active');
    if (uploadBox) uploadBox.style.display = 'block';
    if (videoPreview) videoPreview.style.display = 'none';
    if (photoSlider) photoSlider.style.display = 'block';
  },

  setupComparisonSlider: function(containerElement) {
    if (!containerElement) return;
    const range = containerElement.querySelector('.comparison-slider-input');
    const beforeEl = containerElement.querySelector('.comparison-before');

    if (!range || !beforeEl) return;

    const updateSlider = (val) => {
      beforeEl.style.width = `${val}%`;
    };

    range.addEventListener('input', (e) => updateSlider(e.target.value));
    range.addEventListener('touchmove', (e) => updateSlider(e.target.value), { passive: true });
  }
};

window.UIController = UIController;
