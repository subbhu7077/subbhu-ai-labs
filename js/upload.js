/**
 * Real Touch & File Handling Module
 */
class MediaUploadHandler {
  constructor(options) {
    this.dropZone = options.dropZone;
    this.fileInput = options.fileInput;
    this.onFileReady = options.onFileReady;
    this.onReset = options.onReset;
    this.initListeners();
  }

  initListeners() {
    if (!this.dropZone || !this.fileInput) return;

    this.dropZone.addEventListener('click', () => this.fileInput.click());

    this.fileInput.addEventListener('change', (e) => {
      if (e.target.files && e.target.files[0]) {
        this.processFile(e.target.files[0]);
      }
    });

    ['dragenter', 'dragover'].forEach(name => {
      this.dropZone.addEventListener(name, (e) => {
        e.preventDefault();
        this.dropZone.classList.add('dragover');
      });
    });

    ['dragleave', 'drop'].forEach(name => {
      this.dropZone.addEventListener(name, (e) => {
        e.preventDefault();
        this.dropZone.classList.remove('dragover');
      });
    });

    this.dropZone.addEventListener('drop', (e) => {
      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        this.processFile(e.dataTransfer.files[0]);
      }
    });
  }

  processFile(file) {
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/quicktime'];
    if (!validTypes.includes(file.type)) {
      alert('Supported formats: JPG, PNG, WEBP, MP4');
      return;
    }

    const metadata = {
      name: file.name,
      size: this.formatSize(file.size),
      type: file.type.startsWith('video') ? 'video' : 'photo',
      blobUrl: URL.createObjectURL(file)
    };

    if (typeof this.onFileReady === 'function') {
      this.onFileReady(metadata);
    }
  }

  formatSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}

window.MediaUploadHandler = MediaUploadHandler;
