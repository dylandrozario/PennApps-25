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
        this.initializeNoteTakingButton();
    }
    
    initializeElements() {
        this.uploadArea = document.getElementById('uploadArea');
        this.fileInput = document.getElementById('fileInput');
        this.fileList = document.getElementById('fileList');
        this.status = document.getElementById('status');
        
        // PDF viewer elements
        this.pdfViewerSection = document.getElementById('pdfViewerSection');
        this.pdfTitle = document.getElementById('pdfTitle');
        this.prevPage = document.getElementById('prevPage');
        this.nextPage = document.getElementById('nextPage');
        this.pageInfo = document.getElementById('pageInfo');
        this.zoomOut = document.getElementById('zoomOut');
        this.zoomIn = document.getElementById('zoomIn');
        this.zoomLevel = document.getElementById('zoomLevel');
        this.pdfCanvas = document.getElementById('pdfCanvas');
        
        // Summary panel elements
        this.summaryPanel = document.getElementById('summaryPanel');
        this.summarizeButtonContainer = document.getElementById('summarize-button-container');
        
        // Debug: Check if all elements are found
        console.log('PDF viewer elements initialized:', {
            pdfViewerSection: !!this.pdfViewerSection,
            pdfCanvas: !!this.pdfCanvas
        });
    }
    
    bindEvents() {
        // Click to upload
        this.uploadArea.addEventListener('click', () => {
            this.fileInput.click();
        });
        
        // File input change
        this.fileInput.addEventListener('change', (e) => {
            console.log('File input changed, files:', e.target.files.length);
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
        this.prevPage.addEventListener('click', () => {
            this.goToPreviousPage();
        });
        
        this.nextPage.addEventListener('click', () => {
            this.goToNextPage();
        });
        
        this.zoomOut.addEventListener('click', () => {
            this.zoomOutPDF();
        });
        
        this.zoomIn.addEventListener('click', () => {
            this.zoomInPDF();
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
        console.log('Files count:', this.files.length);
        
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
                    console.log('PDF.js became ready, retrying...');
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
        console.log('PDF.js ready:', this.pdfjsReady);
        console.log('pdfjsLib available:', typeof pdfjsLib !== 'undefined');
        console.log('PDF viewer section:', this.pdfViewerSection);
        console.log('PDF canvas:', this.pdfCanvas);
        
        this.showStatus('Loading PDF...', 'info');
        
        // Check if PDF.js is loaded and ready
        if (typeof pdfjsLib === 'undefined' || !this.pdfjsReady) {
            console.error('PDF.js not ready. pdfjsLib:', typeof pdfjsLib, 'pdfjsReady:', this.pdfjsReady);
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
        
        // Set canvas size to match the PDF page dimensions
        canvas.height = viewport.height;
        canvas.width = viewport.width;
        
        // Ensure the canvas maintains its size for scrolling when zoomed
        canvas.style.width = `${viewport.width}px`;
        canvas.style.height = `${viewport.height}px`;
        
        // Position canvas for proper scrolling
        canvas.style.position = 'relative';
        canvas.style.margin = '0 auto';
        canvas.style.display = 'block';
        canvas.style.left = '0';
        canvas.style.top = '0';
        
        const renderContext = {
            canvasContext: context,
            viewport: viewport
        };
        
        await page.render(renderContext).promise;
        
        // Ensure scrolling works
        this.setupScrolling();
    }
    
    setupScrolling() {
        const container = document.querySelector('.pdf-container-fullscreen');
        const canvas = this.pdfCanvas;
        
        if (!container || !canvas) return;
        
        // Only enable vertical scrolling
        container.style.overflowX = 'hidden';
        container.style.overflowY = 'auto';
        
        // Ensure scrollbars are always visible
        container.style.scrollbarWidth = 'auto';
        container.style.scrollbarColor = '#888 #f1f1f1';
        
        // Log dimensions for debugging
        console.log(`Canvas size: ${canvas.width}x${canvas.height}, Scale: ${this.scale}`);
        console.log(`Container size: ${container.clientWidth}x${container.clientHeight}`);
        console.log('Vertical scrolling setup complete');
    }
    
    async goToPreviousPage() {
        if (this.currentPage > 1) {
            this.currentPage--;
            await this.renderPage();
            this.updatePageControls();
            this.resetScrollPosition();
        }
    }
    
    async goToNextPage() {
        if (this.currentPage < this.totalPages) {
            this.currentPage++;
            await this.renderPage();
            this.updatePageControls();
            this.resetScrollPosition();
        }
    }
    
    resetScrollPosition() {
        const container = document.querySelector('.pdf-container-fullscreen');
        if (container) {
            container.scrollTop = 0;
            container.scrollLeft = 0;
        }
    }
    
    async zoomInPDF() {
        this.scale = Math.min(this.scale * 1.2, 3.0);
        await this.renderPage();
        this.updateZoomControls();
        this.resetScrollPosition();
    }
    
    async zoomOutPDF() {
        this.scale = Math.max(this.scale / 1.2, 1.0);
        await this.renderPage();
        this.updateZoomControls();
        this.resetScrollPosition();
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
        
        // Hide summary panel
        this.summaryPanel.style.display = 'none';
        
        this.currentPDF = null;
        this.currentPage = 1;
        this.totalPages = 0;
        this.scale = 1.0;
    }
    
    initializeNoteTakingButton() {
        // Create a simple button instead of using the modal component
        const button = document.createElement('button');
        button.className = 'note-taking-btn';
        button.innerHTML = '📝 Summarize PDF';
        button.addEventListener('click', () => this.toggleSummaryPanel());
        
        // Add the button to the PDF controls
        this.summarizeButtonContainer.appendChild(button);
        
        // Initialize the inline interface
        this.initializeInlineInterface();
    }
    
    initializeInlineInterface() {
        // Bind events for the inline interface
        const textInput = document.getElementById('text-input');
        const simplifyBtn = document.getElementById('simplify-btn');
        const copyBtn = document.getElementById('copy-notes');
        const lengthSelect = document.getElementById('summary-length');
        const statusIndicator = document.getElementById('status-indicator');
        const statusText = document.getElementById('status-text');
        
        // Update API status
        if (statusIndicator && statusText) {
            statusIndicator.className = 'status-indicator gemini-active';
            statusText.textContent = 'Gemini AI';
        }
        
        if (textInput) {
            textInput.addEventListener('input', () => this.updateWordCount());
        }
        
        if (simplifyBtn) {
            simplifyBtn.addEventListener('click', () => this.simplifyText());
        }
        
        if (copyBtn) {
            copyBtn.addEventListener('click', () => this.copyNotes());
        }
        
        if (lengthSelect) {
            lengthSelect.addEventListener('change', () => this.updateSummaryLength());
        }
    }
    
    toggleSummaryPanel() {
        if (this.summaryPanel.style.display === 'none' || !this.summaryPanel.style.display) {
            this.summaryPanel.style.display = 'flex';
            // Auto-extract PDF text when opening
            this.extractPDFTextAndSummarize();
        } else {
            this.summaryPanel.style.display = 'none';
        }
    }
    
    updateWordCount() {
        const textInput = document.getElementById('text-input');
        const wordCount = document.getElementById('word-count');
        if (textInput && wordCount) {
            const text = textInput.value.trim();
            const words = text ? text.split(/\s+/).length : 0;
            wordCount.textContent = `${words} words`;
        }
    }
    
    updateSummaryLength() {
        const lengthSelect = document.getElementById('summary-length');
        if (lengthSelect) {
            const length = lengthSelect.value;
            switch(length) {
                case 'short':
                    this.summaryOptions = { maxLength: 100, minLength: 50, ratio: 0.2 };
                    break;
                case 'medium':
                    this.summaryOptions = { maxLength: 200, minLength: 100, ratio: 0.3 };
                    break;
                case 'long':
                    this.summaryOptions = { maxLength: 300, minLength: 200, ratio: 0.4 };
                    break;
            }
        }
    }
    
    async simplifyText() {
        const textInput = document.getElementById('text-input');
        const text = textInput ? textInput.value.trim() : '';
        
        if (!text) {
            alert('Please enter some text to simplify.');
            return;
        }

        if (text.split(/\s+/).length < 10) {
            alert('Text is too short to simplify effectively. Please enter at least 10 words.');
            return;
        }

        this.showLoading();
        
        try {
            const notes = await this.generateNotes(text);
            this.displayNotes(notes, text);
        } catch (error) {
            console.error('Simplification error:', error);
            alert('Error generating notes. Please try again.');
        } finally {
            this.hideLoading();
        }
    }
    
    async generateNotes(text) {
        const words = text.split(/\s+/);
        const options = this.summaryOptions || { maxLength: 200, minLength: 100, ratio: 0.3 };
        const targetLength = Math.max(
            options.minLength,
            Math.min(options.maxLength, Math.floor(words.length * options.ratio))
        );

        const prompt = `Please rewrite and simplify the following text for note-taking purposes in approximately ${targetLength} words. Make it:

- Simple and easy to understand
- Use shorter sentences and simpler words
- Focus on the main ideas and key facts
- Organize information clearly
- Remove unnecessary details but keep important points
- Make it suitable for studying and reference

Original text:
${text}

Simplified notes:`;

        try {
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=AIzaSyAltMyp-C1Ye69A621vDIk_uVfYQe-5yWM`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    contents: [{
                        parts: [{
                            text: prompt
                        }]
                    }],
                    generationConfig: {
                        temperature: 0.3,
                        topK: 40,
                        topP: 0.95,
                        maxOutputTokens: 1024,
                    }
                })
            });

            if (!response.ok) {
                throw new Error(`Gemini API error: ${response.status} ${response.statusText}`);
            }

            const data = await response.json();
            
            if (data.candidates && data.candidates[0] && data.candidates[0].content) {
                return data.candidates[0].content.parts[0].text.trim();
            } else {
                throw new Error('Invalid response format from Gemini API');
            }
        } catch (error) {
            console.error('Gemini API error:', error);
            throw error;
        }
    }
    
    displayNotes(notes, originalText) {
        const outputSection = document.getElementById('output-section');
        const notesOutput = document.getElementById('notes-output');
        const notesStats = document.getElementById('notes-stats');
        
        if (notesOutput) {
            notesOutput.textContent = notes;
        }
        
        if (notesStats) {
            const originalWords = originalText.split(/\s+/).length;
            const notesWords = notes.split(/\s+/).length;
            const compressionRatio = ((originalWords - notesWords) / originalWords * 100).toFixed(1);
            notesStats.textContent = `${notesWords} words (${compressionRatio}% reduction)`;
        }
        
        if (outputSection) {
            outputSection.style.display = 'block';
        }
    }
    
    copyNotes() {
        const notesOutput = document.getElementById('notes-output');
        const text = notesOutput ? notesOutput.textContent : '';
        
        navigator.clipboard.writeText(text).then(() => {
            const copyBtn = document.getElementById('copy-notes');
            if (copyBtn) {
                const originalText = copyBtn.textContent;
                copyBtn.textContent = 'Copied!';
                setTimeout(() => {
                    copyBtn.textContent = originalText;
                }, 2000);
            }
        }).catch(err => {
            console.error('Failed to copy text: ', err);
            alert('Failed to copy notes to clipboard');
        });
    }
    
    showLoading() {
        const loading = document.getElementById('loading');
        const simplifyBtn = document.getElementById('simplify-btn');
        
        if (loading) loading.style.display = 'flex';
        if (simplifyBtn) {
            simplifyBtn.disabled = true;
            simplifyBtn.textContent = 'Simplifying...';
        }
    }

    hideLoading() {
        const loading = document.getElementById('loading');
        const simplifyBtn = document.getElementById('simplify-btn');
        
        if (loading) loading.style.display = 'none';
        if (simplifyBtn) {
            simplifyBtn.disabled = false;
            simplifyBtn.textContent = 'Simplify for Notes';
        }
    }
    
    async extractPDFTextAndSummarize() {
        if (!this.currentPDF) {
            alert('No PDF loaded. Please upload a PDF first.');
            return;
        }
        
        try {
            // Show loading state
            const textInput = document.getElementById('text-input');
            if (textInput) {
                textInput.value = 'Extracting text from PDF...';
                textInput.disabled = true;
            }
            
            // Extract text from all pages
            let fullText = '';
            for (let pageNum = 1; pageNum <= this.totalPages; pageNum++) {
                const page = await this.currentPDF.getPage(pageNum);
                const textContent = await page.getTextContent();
                const pageText = textContent.items.map(item => item.str).join(' ');
                fullText += pageText + '\n\n';
            }
            
            if (fullText.trim().length === 0) {
                if (textInput) {
                    textInput.value = 'No text found in this PDF. It may be an image-based PDF.';
                }
                return;
            }
            
            // Set the extracted text in the textarea
            if (textInput) {
                textInput.value = fullText;
                textInput.disabled = false;
                this.updateWordCount();
            }
            
            // Auto-generate summary
            this.simplifyText();
            
        } catch (error) {
            console.error('Error extracting PDF text:', error);
            const textInput = document.getElementById('text-input');
            if (textInput) {
                textInput.value = 'Error extracting text from PDF. Please try again.';
                textInput.disabled = false;
            }
        }
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
