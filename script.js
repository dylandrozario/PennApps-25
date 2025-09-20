class PDFUploader {
    constructor() {
        this.files = [];
        this.maxFileSize = 10 * 1024 * 1024; // 10MB
        this.allowedTypes = ['application/pdf'];
        
        // PDF viewer properties
        this.currentPDF = null;
        this.currentPage = 1;
        this.totalPages = 0;
        this.scale = 1.0;
        this.pdfjsReady = false;
        
        this.initializeElements();
        this.bindEvents();
        this.initializePDFJS();
    }
    
    initializeElements() {
        this.uploadArea = document.getElementById('uploadArea');
        this.fileInput = document.getElementById('fileInput');
        this.fileList = document.getElementById('fileList');
        this.status = document.getElementById('status');
        
        // PDF viewer elements
        this.pdfViewerSection = document.getElementById('pdfViewerSection');
        this.pdfTitle = document.getElementById('pdfTitle');
        this.closeViewer = document.getElementById('closeViewer');
        this.prevPage = document.getElementById('prevPage');
        this.nextPage = document.getElementById('nextPage');
        this.pageInfo = document.getElementById('pageInfo');
        this.zoomOut = document.getElementById('zoomOut');
        this.zoomIn = document.getElementById('zoomIn');
        this.zoomLevel = document.getElementById('zoomLevel');
        this.pdfCanvas = document.getElementById('pdfCanvas');
        
        // Debug: Check if all elements are found
        console.log('PDF viewer elements initialized:', {
            pdfViewerSection: !!this.pdfViewerSection,
            pdfCanvas: !!this.pdfCanvas,
            pdfTitle: !!this.pdfTitle
        });
    }
    
    bindEvents() {
        // Click to upload
        this.uploadArea.addEventListener('click', () => {
            this.fileInput.click();
        });
        
        // File input change
        this.fileInput.addEventListener('change', (e) => {
            this.handleFiles(e.target.files);
        });
        
        // Drag and drop
        this.uploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            this.uploadArea.classList.add('dragover');
        });
        
        this.uploadArea.addEventListener('dragleave', () => {
            this.uploadArea.classList.remove('dragover');
        });
        
        this.uploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            this.uploadArea.classList.remove('dragover');
            this.handleFiles(e.dataTransfer.files);
        });
        
        
        // PDF viewer events
        this.closeViewer.addEventListener('click', () => {
            this.closePDFViewer();
        });
        
        this.prevPage.addEventListener('click', () => {
            this.previousPage();
        });
        
        this.nextPage.addEventListener('click', () => {
            this.nextPage();
        });
        
        this.zoomOut.addEventListener('click', () => {
            this.zoomOut();
        });
        
        this.zoomIn.addEventListener('click', () => {
            this.zoomIn();
        });
    }
    
    initializePDFJS() {
        console.log('Starting PDF.js initialization...');
        let attempts = 0;
        const maxAttempts = 50; // 5 seconds max
        
        // Wait for PDF.js to be available
        const checkPDFJS = () => {
            attempts++;
            console.log(`PDF.js check attempt ${attempts}/${maxAttempts}`);
            
            if (typeof pdfjsLib !== 'undefined') {
                pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
                console.log('PDF.js initialized successfully');
                this.pdfjsReady = true;
            } else if (attempts < maxAttempts) {
                console.log('PDF.js not ready yet, retrying...');
                setTimeout(checkPDFJS, 100);
            } else {
                console.error('PDF.js failed to load after maximum attempts');
                this.showStatus('PDF.js library failed to load. Please refresh the page.', 'error');
            }
        };
        checkPDFJS();
    }
    
    handleFiles(fileList) {
        console.log('handleFiles called with', fileList.length, 'files');
        
        // Clear existing files since we only allow one file
        this.files = [];
        
        const file = fileList[0]; // Only take the first file
        console.log('Selected file:', file ? file.name : 'none');
        
        if (file && this.validateFile(file)) {
            console.log('File validated successfully');
            this.files.push(file);
            this.updateFileList();
            
            // Wait for PDF.js to be ready before opening viewer
            this.waitForPDFJSAndView();
        } else {
            console.log('File validation failed or no file');
        }
    }
    
    validateFile(file) {
        // Check file type
        if (!this.allowedTypes.includes(file.type)) {
            this.showStatus(`File "${file.name}" is not a PDF file.`, 'error');
            return false;
        }
        
        // Check file size
        if (file.size > this.maxFileSize) {
            this.showStatus(`File "${file.name}" is too large. Maximum size is 10MB.`, 'error');
            return false;
        }
        
        // Check if file already exists
        if (this.files.some(f => f.name === file.name && f.size === file.size)) {
            this.showStatus(`File "${file.name}" is already in the list.`, 'error');
            return false;
        }
        
        return true;
    }
    
    updateFileList() {
        this.fileList.innerHTML = '';
        
        if (this.files.length === 0) {
            return;
        }
        
        this.files.forEach((file, index) => {
            const fileItem = this.createFileItem(file, index);
            this.fileList.appendChild(fileItem);
        });
    }
    
    createFileItem(file, index) {
        const fileItem = document.createElement('div');
        fileItem.className = 'file-item';
        
        const fileSize = this.formatFileSize(file.size);
        
        fileItem.innerHTML = `
            <div class="file-info">
                <div class="file-icon">PDF</div>
                <div class="file-details">
                    <h4>${file.name}</h4>
                    <p>${fileSize}</p>
                </div>
            </div>
            <div class="file-actions">
                <button class="btn btn-primary" onclick="pdfUploader.viewPDF(${index})">View Again</button>
                <button class="btn btn-danger" onclick="pdfUploader.removeFile(${index})">Remove</button>
            </div>
        `;
        
        return fileItem;
    }
    
    removeFile(index) {
        this.files.splice(index, 1);
        this.updateFileList();
    }
    
    waitForPDFJSAndView() {
        console.log('waitForPDFJSAndView called, pdfjsReady:', this.pdfjsReady);
        console.log('pdfjsLib available:', typeof pdfjsLib !== 'undefined');
        
        if (this.pdfjsReady && typeof pdfjsLib !== 'undefined') {
            console.log('PDF.js is ready, calling viewPDF');
            this.viewPDF(0);
        } else {
            console.log('Waiting for PDF.js to be ready...');
            // Add timeout to prevent infinite waiting
            setTimeout(() => {
                if (!this.pdfjsReady) {
                    console.error('PDF.js still not ready after waiting');
                    this.showStatus('PDF viewer not ready. Please try again.', 'error');
                } else {
                    this.waitForPDFJSAndView();
                }
            }, 100);
        }
    }
    
    
    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
    
    showStatus(message, type) {
        this.status.textContent = message;
        this.status.className = `status ${type}`;
    }
    
    hideStatus() {
        this.status.className = 'status';
    }
    
    // PDF Viewer Methods
    async viewPDF(index) {
        const file = this.files[index];
        if (!file) {
            console.error('No file found at index:', index);
            return;
        }
        
        console.log('Viewing PDF:', file.name);
        this.showStatus('Loading PDF...', 'info');
        
        // Check if PDF.js is loaded and ready
        if (typeof pdfjsLib === 'undefined' || !this.pdfjsReady) {
            this.showStatus('PDF.js library not ready. Please try again.', 'error');
            return;
        }
        
        try {
            const arrayBuffer = await file.arrayBuffer();
            console.log('File loaded, size:', arrayBuffer.byteLength);
            
            const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
            console.log('PDF loaded, pages:', pdf.numPages);
            
            this.currentPDF = pdf;
            this.totalPages = pdf.numPages;
            this.currentPage = 1;
            this.scale = 1.0;
            
            this.pdfTitle.textContent = file.name;
            this.pdfViewerSection.style.display = 'block';
            
            // Hide the main container (home page)
            document.querySelector('.container').style.display = 'none';
            
            await this.renderPage();
            this.updatePageControls();
            this.updateZoomControls();
            
            this.hideStatus();
            
            // No need to scroll since it's fullscreen
            
        } catch (error) {
            console.error('Error loading PDF:', error);
            this.showStatus(`Error loading PDF: ${error.message}`, 'error');
        }
    }
    
    async renderPage() {
        if (!this.currentPDF) return;
        
        const page = await this.currentPDF.getPage(this.currentPage);
        const viewport = page.getViewport({ scale: this.scale });
        
        const canvas = this.pdfCanvas;
        const context = canvas.getContext('2d');
        
        canvas.height = viewport.height;
        canvas.width = viewport.width;
        
        const renderContext = {
            canvasContext: context,
            viewport: viewport
        };
        
        await page.render(renderContext).promise;
    }
    
    async previousPage() {
        if (this.currentPage > 1) {
            this.currentPage--;
            await this.renderPage();
            this.updatePageControls();
        }
    }
    
    async nextPage() {
        if (this.currentPage < this.totalPages) {
            this.currentPage++;
            await this.renderPage();
            this.updatePageControls();
        }
    }
    
    async zoomIn() {
        this.scale = Math.min(this.scale * 1.2, 3.0);
        await this.renderPage();
        this.updateZoomControls();
    }
    
    async zoomOut() {
        this.scale = Math.max(this.scale / 1.2, 0.5);
        await this.renderPage();
        this.updateZoomControls();
    }
    
    updatePageControls() {
        this.pageInfo.textContent = `Page ${this.currentPage} of ${this.totalPages}`;
        this.prevPage.disabled = this.currentPage <= 1;
        this.nextPage.disabled = this.currentPage >= this.totalPages;
    }
    
    updateZoomControls() {
        this.zoomLevel.textContent = `${Math.round(this.scale * 100)}%`;
    }
    
    closePDFViewer() {
        this.pdfViewerSection.style.display = 'none';
        
        // Show the main container (home page) again
        document.querySelector('.container').style.display = 'block';
        
        this.currentPDF = null;
        this.currentPage = 1;
        this.totalPages = 0;
        this.scale = 1.0;
    }
}

// Initialize the PDF uploader when the page loads
document.addEventListener('DOMContentLoaded', () => {
    window.pdfUploader = new PDFUploader();
    
    // Debug function to test PDF viewer
    window.testPDFViewer = () => {
        console.log('Testing PDF viewer...');
        console.log('PDF.js loaded:', typeof pdfjsLib !== 'undefined');
        console.log('PDF viewer section:', document.getElementById('pdfViewerSection'));
        console.log('PDF canvas:', document.getElementById('pdfCanvas'));
    };
});
