const UIController = {
  openToolModal: (toolId) => {
    const tool = (window.AI_TOOLS || []).find(t => t.id === toolId) || { id: toolId, name: "AI Tool", category: "AI Processing" };
    window.currentToolId = tool.id;

    const modal = document.getElementById('toolModal');
    const modalTitle = document.getElementById('modalToolTitle');
    const modalBadge = document.getElementById('modalToolBadge');
    const fileInput = document.getElementById('fileInput');

    if (modalTitle) modalTitle.innerText = tool.name;
    if (modalBadge) modalBadge.innerText = tool.badge || "Active";
    if (modal) modal.classList.add('active');

    if (fileInput) {
      fileInput.accept = (tool.id.includes('vid') || tool.id.includes('video')) ? 'video/*' : 'image/*';
    }
  },

  closeModal: () => {
    const modal = document.getElementById('toolModal');
    if (modal) modal.classList.remove('active');
    const removeBtn = document.getElementById('removeFileBtn');
    if (removeBtn) removeBtn.click();
  },

  setupComparisonSlider: (container) => {
    const sliderInput = container.querySelector('.comparison-slider-input');
    const beforeWrap = container.querySelector('.comparison-before');
    if (!sliderInput || !beforeWrap) return;
    sliderInput.addEventListener('input', (e) => {
      beforeWrap.style.width = `${e.target.value}%`;
    });
  }
};

window.UIController = UIController;
