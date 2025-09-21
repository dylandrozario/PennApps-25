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
        
        // Simple cache for API responses
        this.apiCache = new Map();
        
        
        this.initializeElements();
        this.bindEvents();
        this.initializePDFJS();
        this.initializeNoteTakingButton();
        this.initializeQuizTool();
        this.initializePrintTool();
        this.initializeFormTool();
        this.initializeFlashcardTool();
        this.initializeDiagramTool();
        this.initializeResourcesTool();
        this.initializeNotesEditor();
    }
    
    initializeElements() {
        this.uploadArea = document.getElementById('uploadArea');
        this.fileInput = document.getElementById('fileInput');
        this.fileList = document.getElementById('fileList');
        this.status = document.getElementById('status');
        
        // PDF viewer elements
        this.pdfViewerSection = document.getElementById('pdfViewerSection');
        this.prevPage = document.getElementById('prevPage');
        this.nextPage = document.getElementById('nextPage');
        this.pageInfo = document.getElementById('pageInfo');
        this.currentPageNum = document.getElementById('currentPageNum');
        this.totalPagesNum = document.getElementById('totalPagesNum');
        this.zoomOut = document.getElementById('zoomOut');
        this.zoomIn = document.getElementById('zoomIn');
        this.zoomLevel = document.getElementById('zoomLevel');
        this.pdfCanvas = document.getElementById('pdfCanvas');
        this.insertNewDocBtn = document.getElementById('insertNewDocBtn');
        
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
        
        // Current page number click event for direct page navigation
        if (this.currentPageNum) {
            this.currentPageNum.addEventListener('click', () => {
                this.showPageInput();
            });
        }
        
        // Insert New Doc button event
        if (this.insertNewDocBtn) {
            this.insertNewDocBtn.addEventListener('click', () => {
                this.closePDFViewer();
            });
        }
        
        
        
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
        if (this.currentPageNum) {
            this.currentPageNum.textContent = this.currentPage;
        }
        if (this.totalPagesNum) {
            this.totalPagesNum.textContent = this.totalPages;
        }
        
        if (this.prevPage) {
            this.prevPage.disabled = this.currentPage <= 1;
        }
        
        if (this.nextPage) {
            this.nextPage.disabled = this.currentPage >= this.totalPages;
        }
    }
    
    updateZoomControls() {
        this.zoomLevel.textContent = `${Math.round(this.scale * 100)}%`;
    }
    
    showPageInput() {
        if (!this.currentPDF || this.totalPages === 0) return;
        
        const currentPageElement = this.currentPageNum;
        
        // Create input element
        const input = document.createElement('input');
        input.type = 'number';
        input.min = '1';
        input.max = this.totalPages.toString();
        input.value = this.currentPage.toString();
        input.className = 'page-input';
        input.style.cssText = `
            width: 40px;
            padding: 0.25rem 0.25rem;
            border: 1px solid #007bff;
            border-radius: 4px;
            text-align: center;
            font-size: 0.9rem;
            background: white;
            box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.25);
            font-weight: 500;
        `;
        
        // Replace current page number with input
        currentPageElement.innerHTML = '';
        currentPageElement.appendChild(input);
        currentPageElement.classList.add('editing');
        
        // Focus and select the input
        input.focus();
        input.select();
        
        // Handle input events
        const handleInput = () => {
            const pageNum = parseInt(input.value);
            if (pageNum >= 1 && pageNum <= this.totalPages) {
                this.goToPage(pageNum);
                this.restorePageInfo();
            }
        };
        
        const handleKeyDown = (e) => {
            if (e.key === 'Enter') {
                handleInput();
            } else if (e.key === 'Escape') {
                this.restorePageInfo();
            }
        };
        
        const handleBlur = () => {
            setTimeout(() => this.restorePageInfo(), 100);
        };
        
        input.addEventListener('blur', handleBlur);
        input.addEventListener('keydown', handleKeyDown);
        
        // Store references for cleanup
        this.currentPageInput = { input, handleInput, handleKeyDown, handleBlur };
    }
    
    restorePageInfo() {
        const currentPageElement = this.currentPageNum;
        currentPageElement.classList.remove('editing');
        currentPageElement.textContent = this.currentPage;
        
        // Clean up event listeners if they exist
        if (this.currentPageInput) {
            const { input, handleBlur, handleKeyDown } = this.currentPageInput;
            input.removeEventListener('blur', handleBlur);
            input.removeEventListener('keydown', handleKeyDown);
            this.currentPageInput = null;
        }
    }
    
    async goToPage(pageNum) {
        if (pageNum < 1 || pageNum > this.totalPages) return;
        
        this.currentPage = pageNum;
        await this.renderPage();
        this.updatePageControls();
        this.resetScrollPosition();
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
        // Note-taking functionality is now handled in the notes section
        // Initialize the inline interface for the summary panel
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
        
        // Close summary panel button
        const closeSummaryBtn = document.getElementById('close-summary-btn');
        if (closeSummaryBtn) {
            closeSummaryBtn.addEventListener('click', () => this.closeSummaryPanel());
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
            const apiKey = window.CONFIG?.GEMINI_API_KEY || 'YOUR_GEMINI_API_KEY_HERE';
            if (apiKey === 'YOUR_GEMINI_API_KEY_HERE') {
                throw new Error('Please configure your Gemini API key in config.js');
            }
            
            return await this.makeAPICallWithRetry(async () => {
                const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
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
            });
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
    
    // Quiz Tool Methods
    initializeQuizTool() {
        // Create quiz button
        const quizButton = document.createElement('button');
        quizButton.className = 'quiz-btn';
        quizButton.innerHTML = '🧠 Quiz Me';
        quizButton.addEventListener('click', () => this.toggleQuizSidebar());
        
        // Add the button to the PDF controls
        const quizContainer = document.getElementById('quiz-button-container');
        if (quizContainer) {
            quizContainer.appendChild(quizButton);
        }
        
        // Initialize quiz functionality
        this.initializeQuizFunctionality();
    }
    
    initializeQuizFunctionality() {
        // Quiz state
        this.quizState = {
            isOpen: false,
            questions: [],
            currentQuestion: 0,
            answers: [],
            startTime: null,
            score: 0,
            difficulty: 'medium',
            questionCount: 10
        };
        
        // Bind quiz events
        this.bindQuizEvents();
    }
    
    bindQuizEvents() {
        const closeQuizBtn = document.getElementById('close-quiz-sidebar');
        
        if (closeQuizBtn) {
            closeQuizBtn.addEventListener('click', () => this.closeQuizSidebar());
        }
    }
    
    toggleQuizSidebar() {
        if (!this.currentPDF) {
            alert('No PDF loaded. Please upload a PDF first.');
            return;
        }
        
        const quizSidebar = document.getElementById('quizSidebar');
        if (!quizSidebar) return;
        
        if (this.quizState.isOpen) {
            this.closeQuizSidebar();
        } else {
            this.openQuizSidebar();
        }
    }
    
    openQuizSidebar() {
        // Close other sidebars first
        this.closeFlashcardsSidebar();
        this.closeDiagramsSidebar();
        this.closeResourcesSidebar();
        
        const quizSidebar = document.getElementById('quizSidebar');
        const notesArea = document.querySelector('.notes-area');
        if (quizSidebar) {
            quizSidebar.classList.add('open');
            if (notesArea) notesArea.classList.add('sidebar-open');
            this.quizState.isOpen = true;
            this.showQuizGenerationSection();
        }
    }
    
    closeQuizSidebar() {
        const quizSidebar = document.getElementById('quizSidebar');
        const notesArea = document.querySelector('.notes-area');
        if (quizSidebar) {
            quizSidebar.classList.remove('open');
            if (notesArea) notesArea.classList.remove('sidebar-open');
            this.quizState.isOpen = false;
        }
    }
    
    showQuizGenerationSection() {
        const sidebarContent = document.getElementById('quizSidebarContent');
        if (!sidebarContent) return;
        
        sidebarContent.innerHTML = `
            <div class="sidebar-section">
                <h4>🎯 Generate Quiz</h4>
                <p>AI will analyze your PDF and create quiz questions</p>
            </div>
            
            <div class="sidebar-options">
                <div class="sidebar-option-group">
                    <label for="quiz-difficulty">Difficulty:</label>
                    <select id="quiz-difficulty" class="sidebar-form-select">
                        <option value="easy">Easy</option>
                        <option value="medium" selected>Medium</option>
                        <option value="hard">Hard</option>
                    </select>
                </div>
                
                <div class="sidebar-option-group">
                    <label for="quiz-count">Questions:</label>
                    <select id="quiz-count" class="sidebar-form-select">
                        <option value="5">5 Questions</option>
                        <option value="10" selected>10 Questions</option>
                        <option value="15">15 Questions</option>
                    </select>
                </div>
            </div>
            
            <div class="sidebar-actions">
                <button id="generate-quiz-btn" class="sidebar-btn">
                    🎯 Generate Quiz
                </button>
            </div>
            
            <div id="quizLoading" class="sidebar-loading" style="display: none;">
                <div class="sidebar-spinner"></div>
                <p>Generating quiz questions...</p>
            </div>
        `;
        
        // Bind new events
        this.bindQuizSidebarEvents();
    }
    
    bindQuizSidebarEvents() {
        const generateQuizBtn = document.getElementById('generate-quiz-btn');
        const difficultySelect = document.getElementById('quiz-difficulty');
        const questionCountSelect = document.getElementById('quiz-count');
        
        if (generateQuizBtn) {
            generateQuizBtn.addEventListener('click', () => this.generateQuiz());
        }
        
        if (difficultySelect) {
            difficultySelect.addEventListener('change', (e) => {
                this.quizState.difficulty = e.target.value;
            });
        }
        
        if (questionCountSelect) {
            questionCountSelect.addEventListener('change', (e) => {
                this.quizState.questionCount = parseInt(e.target.value);
            });
        }
    }
    
    showQuizQuestionsSection() {
        const sidebarContent = document.getElementById('quizSidebarContent');
        if (!sidebarContent) return;
        
        const question = this.quizState.questions[this.quizState.currentQuestion];
        if (!question) return;
        
        sidebarContent.innerHTML = `
            <div class="quiz-progress">
                <div class="quiz-progress-bar">
                    <div class="quiz-progress-fill" style="width: ${((this.quizState.currentQuestion + 1) / this.quizState.questions.length) * 100}%"></div>
                </div>
                <div style="color: #cccccc; font-size: 0.9rem; text-align: center;">
                    Question ${this.quizState.currentQuestion + 1} of ${this.quizState.questions.length}
                </div>
            </div>
            
            <div class="quiz-question">
                <div class="quiz-question-text">${question.question}</div>
                <div class="quiz-options" id="quizOptions">
                    ${this.generateQuizOptionsHTML(question)}
                </div>
            </div>
            
            <div class="sidebar-actions">
                <button id="submit-answer-btn" class="sidebar-btn" disabled>
                    Submit Answer
                </button>
                <button id="next-question-btn" class="sidebar-btn secondary" style="display: none;">
                    Next Question
                </button>
            </div>
        `;
        
        // Bind quiz question events
        this.bindQuizQuestionEvents();
    }
    
    generateQuizOptionsHTML(question) {
        if (question.type === 'multiple_choice') {
            return question.options.map((option, index) => `
                <div class="quiz-option" data-option="${option}">
                    ${option}
                </div>
            `).join('');
        } else if (question.type === 'true_false') {
            return `
                <div class="quiz-option" data-option="True">True</div>
                <div class="quiz-option" data-option="False">False</div>
            `;
        } else if (question.type === 'fill_blank') {
            return `
                <input type="text" id="fill-blank-input" class="sidebar-form-select" placeholder="Type your answer here..." style="margin-top: 0.5rem;">
            `;
        }
        return '';
    }
    
    bindQuizQuestionEvents() {
        const quizOptions = document.getElementById('quizOptions');
        const submitBtn = document.getElementById('submit-answer-btn');
        const nextBtn = document.getElementById('next-question-btn');
        const fillBlankInput = document.getElementById('fill-blank-input');
        
        if (quizOptions) {
            quizOptions.addEventListener('click', (e) => {
                if (e.target.classList.contains('quiz-option')) {
                    // Remove previous selection
                    quizOptions.querySelectorAll('.quiz-option').forEach(opt => {
                        opt.classList.remove('selected');
                    });
                    
                    // Select current option
                    e.target.classList.add('selected');
                    this.quizState.selectedAnswer = e.target.dataset.option;
                    
                    // Enable submit button
                    if (submitBtn) {
                        submitBtn.disabled = false;
                    }
                }
            });
        }
        
        if (fillBlankInput) {
            fillBlankInput.addEventListener('input', () => {
                this.quizState.selectedAnswer = fillBlankInput.value.trim();
                if (submitBtn) {
                    submitBtn.disabled = !this.quizState.selectedAnswer;
                }
            });
        }
        
        if (submitBtn) {
            submitBtn.addEventListener('click', () => this.submitAnswer());
        }
        
        if (nextBtn) {
            nextBtn.addEventListener('click', () => this.nextQuestion());
        }
    }
    
    showQuizResultsSection() {
        const sidebarContent = document.getElementById('quizSidebarContent');
        if (!sidebarContent) return;
        
        const percentage = Math.round((this.quizState.score / this.quizState.questions.length) * 100);
        const timeTaken = Math.round((Date.now() - this.quizState.startTime) / 1000);
        const minutes = Math.floor(timeTaken / 60);
        const seconds = timeTaken % 60;
        
        let scoreMessage = '';
        if (percentage >= 90) {
            scoreMessage = 'Excellent! Outstanding performance!';
        } else if (percentage >= 80) {
            scoreMessage = 'Great job! Well done!';
        } else if (percentage >= 70) {
            scoreMessage = 'Good work! Keep it up!';
        } else if (percentage >= 60) {
            scoreMessage = 'Not bad! Room for improvement.';
        } else {
            scoreMessage = 'Keep studying! You can do better.';
        }
        
        sidebarContent.innerHTML = `
            <div class="sidebar-section">
                <h4>🎉 Quiz Complete!</h4>
                <p>${scoreMessage}</p>
            </div>
            
            <div class="sidebar-results">
                <div class="sidebar-stats">
                    <div class="sidebar-stat">
                        <span class="sidebar-stat-number">${percentage}%</span>
                        <span class="sidebar-stat-label">Score</span>
                    </div>
                    <div class="sidebar-stat">
                        <span class="sidebar-stat-number">${this.quizState.score}</span>
                        <span class="sidebar-stat-label">Correct</span>
                    </div>
                    <div class="sidebar-stat">
                        <span class="sidebar-stat-number">${minutes}:${seconds.toString().padStart(2, '0')}</span>
                        <span class="sidebar-stat-label">Time</span>
                    </div>
                </div>
            </div>
            
            <div class="sidebar-actions">
                <button id="retake-quiz-btn" class="sidebar-btn secondary">
                    🔄 Retake Quiz
                </button>
                <button id="new-quiz-btn" class="sidebar-btn">
                    🆕 New Quiz
                </button>
            </div>
        `;
        
        // Bind results events
        const retakeBtn = document.getElementById('retake-quiz-btn');
        const newQuizBtn = document.getElementById('new-quiz-btn');
        
        if (retakeBtn) {
            retakeBtn.addEventListener('click', () => this.retakeQuiz());
        }
        
        if (newQuizBtn) {
            newQuizBtn.addEventListener('click', () => this.newQuiz());
        }
    }
    
    async generateQuiz() {
        if (!this.currentPDF) {
            alert('No PDF loaded. Please upload a PDF first.');
            return;
        }
        
        this.showQuizLoading();
        
        try {
            // Extract text from PDF
            const pdfText = await this.extractPDFText();
            
            if (!pdfText || pdfText.trim().length === 0) {
                throw new Error('No text found in PDF. Cannot generate quiz.');
            }
            
            // Generate quiz using Gemini AI
            const questions = await this.generateQuizQuestions(pdfText);
            
            this.quizState.questions = questions;
            this.quizState.currentQuestion = 0;
            this.quizState.answers = [];
            this.quizState.startTime = Date.now();
            this.quizState.score = 0;
            
            this.hideQuizLoading();
            this.showQuizQuestionsSection();
            this.displayCurrentQuestion();
            
        } catch (error) {
            console.error('Quiz generation error:', error);
            this.hideQuizLoading();
            alert('Error generating quiz: ' + error.message);
        }
    }
    
    async extractPDFText() {
        let fullText = '';
        for (let pageNum = 1; pageNum <= this.totalPages; pageNum++) {
            const page = await this.currentPDF.getPage(pageNum);
            const textContent = await page.getTextContent();
            const pageText = textContent.items.map(item => item.str).join(' ');
            fullText += pageText + '\n\n';
        }
        return fullText.trim();
    }
    
    async generateQuizQuestions(pdfText) {
        const apiKey = this.validateAPIKey();
        
        const difficulty = this.quizState.difficulty;
        const questionCount = this.quizState.questionCount;
        
        const prompt = `Generate ${questionCount} comprehension quiz questions based on the following text. 
        
Difficulty Level: ${difficulty}
- Easy: Simple recall questions, basic facts
- Medium: Analysis questions, understanding concepts
- Hard: Complex reasoning, inference, application

Requirements:
1. Mix of question types: multiple choice (3-4 options), true/false, and fill-in-the-blank
2. Questions should test comprehension, not just memorization
3. Include nuanced questions that require understanding
4. Make some questions reworded versions of key concepts
5. Ensure all answers can be found in the text
6. Make incorrect options plausible but clearly wrong

Format the response as a JSON array with this structure:
[
  {
    "question": "Question text here?",
    "type": "multiple_choice|true_false|fill_blank",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correct_answer": "Correct answer",
    "explanation": "Brief explanation of why this is correct"
  }
]

Text to analyze:
${pdfText}

Generate ${questionCount} questions:`;

        try {
            return await this.makeAPICallWithRetry(async () => {
                const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
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
                            temperature: 1.0,
                            topK: 40,
                            topP: 0.95,
                            maxOutputTokens: 2048,
                        }
                    })
                });

                if (!response.ok) {
                    throw new Error(`Gemini API error: ${response.status} ${response.statusText}`);
                }

                const data = await response.json();
                
                if (data.candidates && data.candidates[0] && data.candidates[0].content) {
                    const responseText = data.candidates[0].content.parts[0].text.trim();
                    
                    // Try to parse JSON from the response
                    try {
                        const jsonMatch = responseText.match(/\[[\s\S]*\]/);
                        if (jsonMatch) {
                            const questions = JSON.parse(jsonMatch[0]);
                            return questions;
                        } else {
                            throw new Error('No valid JSON found in response');
                        }
                    } catch (parseError) {
                        console.error('JSON parse error:', parseError);
                        console.log('Raw response:', responseText);
                        throw new Error('Failed to parse quiz questions from AI response');
                    }
                } else {
                    throw new Error('Invalid response format from Gemini API');
                }
            });
        } catch (error) {
            console.error('Gemini API error:', error);
            throw error;
        }
    }
    
    displayCurrentQuestion() {
        const question = this.quizState.questions[this.quizState.currentQuestion];
        if (!question) return;
        
        // Update progress
        this.updateQuizProgress();
        
        // Update question counter
        const questionCounter = document.getElementById('question-counter');
        if (questionCounter) {
            questionCounter.textContent = `Question ${this.quizState.currentQuestion + 1} of ${this.quizState.questions.length}`;
        }
        
        // Update question type and difficulty
        const questionType = document.getElementById('questionType');
        const questionDifficulty = document.getElementById('questionDifficulty');
        
        if (questionType) {
            questionType.textContent = question.type.replace('_', ' ').toUpperCase();
        }
        
        if (questionDifficulty) {
            questionDifficulty.textContent = this.quizState.difficulty.toUpperCase();
        }
        
        // Update question text
        const questionText = document.getElementById('questionText');
        if (questionText) {
            questionText.textContent = question.question;
        }
        
        // Update options
        this.displayQuestionOptions(question);
        
        // Reset buttons
        const submitBtn = document.getElementById('submit-answer-btn');
        const nextBtn = document.getElementById('next-question-btn');
        
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.style.display = 'inline-block';
        }
        
        if (nextBtn) {
            nextBtn.style.display = 'none';
        }
    }
    
    displayQuestionOptions(question) {
        const optionsContainer = document.getElementById('questionOptions');
        if (!optionsContainer) return;
        
        optionsContainer.innerHTML = '';
        
        if (question.type === 'multiple_choice') {
            question.options.forEach((option, index) => {
                const optionElement = document.createElement('div');
                optionElement.className = 'option-item';
                optionElement.innerHTML = `
                    <div class="option-radio"></div>
                    <div class="option-text">${option}</div>
                `;
                
                optionElement.addEventListener('click', () => this.selectOption(optionElement, option));
                optionsContainer.appendChild(optionElement);
            });
        } else if (question.type === 'true_false') {
            const trueOption = document.createElement('div');
            trueOption.className = 'option-item';
            trueOption.innerHTML = `
                <div class="option-radio"></div>
                <div class="option-text">True</div>
            `;
            trueOption.addEventListener('click', () => this.selectOption(trueOption, 'True'));
            
            const falseOption = document.createElement('div');
            falseOption.className = 'option-item';
            falseOption.innerHTML = `
                <div class="option-radio"></div>
                <div class="option-text">False</div>
            `;
            falseOption.addEventListener('click', () => this.selectOption(falseOption, 'False'));
            
            optionsContainer.appendChild(trueOption);
            optionsContainer.appendChild(falseOption);
        } else if (question.type === 'fill_blank') {
            const inputElement = document.createElement('input');
            inputElement.type = 'text';
            inputElement.className = 'fill-blank-input';
            inputElement.placeholder = 'Type your answer here...';
            inputElement.style.cssText = `
                width: 100%;
                padding: 1rem;
                border: 2px solid #e0e0e0;
                border-radius: 8px;
                font-size: 1rem;
                margin-bottom: 1rem;
            `;
            
            inputElement.addEventListener('input', () => {
                const submitBtn = document.getElementById('submit-answer-btn');
                if (submitBtn) {
                    submitBtn.disabled = !inputElement.value.trim();
                }
            });
            
            optionsContainer.appendChild(inputElement);
        }
    }
    
    selectOption(optionElement, value) {
        // Remove previous selection
        const optionsContainer = document.getElementById('questionOptions');
        if (optionsContainer) {
            const allOptions = optionsContainer.querySelectorAll('.option-item');
            allOptions.forEach(opt => opt.classList.remove('selected'));
        }
        
        // Select current option
        optionElement.classList.add('selected');
        
        // Enable submit button
        const submitBtn = document.getElementById('submit-answer-btn');
        if (submitBtn) {
            submitBtn.disabled = false;
        }
        
        // Store selected answer
        this.quizState.selectedAnswer = value;
    }
    
    submitAnswer() {
        const question = this.quizState.questions[this.quizState.currentQuestion];
        if (!question) return;
        
        let userAnswer = '';
        
        if (question.type === 'fill_blank') {
            const input = document.getElementById('fill-blank-input');
            userAnswer = input ? input.value.trim() : '';
        } else {
            userAnswer = this.quizState.selectedAnswer || '';
        }
        
        if (!userAnswer) {
            alert('Please select an answer before submitting.');
            return;
        }
        
        // Check if answer is correct
        const isCorrect = this.checkAnswer(question, userAnswer);
        
        // Store answer
        this.quizState.answers.push({
            question: question.question,
            userAnswer: userAnswer,
            correctAnswer: question.correct_answer,
            isCorrect: isCorrect,
            explanation: question.explanation
        });
        
        if (isCorrect) {
            this.quizState.score++;
        }
        
        // Show result in sidebar
        this.showAnswerResultInSidebar(question, userAnswer, isCorrect);
        
        // Update buttons
        const submitBtn = document.getElementById('submit-answer-btn');
        const nextBtn = document.getElementById('next-question-btn');
        
        if (submitBtn) {
            submitBtn.style.display = 'none';
        }
        
        if (nextBtn) {
            nextBtn.style.display = 'block';
        }
    }
    
    showAnswerResultInSidebar(question, userAnswer, isCorrect) {
        const quizOptions = document.getElementById('quizOptions');
        if (!quizOptions) return;
        
        // Update option colors
        quizOptions.querySelectorAll('.quiz-option').forEach(option => {
            const optionText = option.textContent.trim();
            
            if (optionText === question.correct_answer) {
                option.classList.add('correct');
            } else if (optionText === userAnswer && !isCorrect) {
                option.classList.add('incorrect');
            }
        });
        
        // Add explanation below options
        const existingExplanation = document.querySelector('.quiz-explanation');
        if (existingExplanation) {
            existingExplanation.remove();
        }
        
        const explanation = document.createElement('div');
        explanation.className = 'quiz-explanation';
        explanation.style.cssText = `
            margin-top: 1rem;
            padding: 0.75rem;
            background: ${isCorrect ? '#28a745' : '#dc3545'};
            border-radius: 6px;
            color: white;
            font-size: 0.9rem;
            line-height: 1.4;
        `;
        explanation.innerHTML = `
            <strong>${isCorrect ? '✅ Correct!' : '❌ Incorrect'}</strong><br>
            <strong>Explanation:</strong> ${question.explanation}
        `;
        
        quizOptions.appendChild(explanation);
    }
    
    checkAnswer(question, userAnswer) {
        if (question.type === 'fill_blank') {
            // For fill-in-the-blank, check if answer is close enough
            const correctAnswer = question.correct_answer.toLowerCase();
            const userAnswerLower = userAnswer.toLowerCase();
            
            // Simple similarity check
            return correctAnswer.includes(userAnswerLower) || 
                   userAnswerLower.includes(correctAnswer) ||
                   this.calculateSimilarity(correctAnswer, userAnswerLower) > 0.7;
        } else {
            // For multiple choice and true/false
            return userAnswer === question.correct_answer;
        }
    }
    
    calculateSimilarity(str1, str2) {
        const longer = str1.length > str2.length ? str1 : str2;
        const shorter = str1.length > str2.length ? str2 : str1;
        
        if (longer.length === 0) return 1.0;
        
        const distance = this.levenshteinDistance(longer, shorter);
        return (longer.length - distance) / longer.length;
    }
    
    levenshteinDistance(str1, str2) {
        const matrix = [];
        
        for (let i = 0; i <= str2.length; i++) {
            matrix[i] = [i];
        }
        
        for (let j = 0; j <= str1.length; j++) {
            matrix[0][j] = j;
        }
        
        for (let i = 1; i <= str2.length; i++) {
            for (let j = 1; j <= str1.length; j++) {
                if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
                    matrix[i][j] = matrix[i - 1][j - 1];
                } else {
                    matrix[i][j] = Math.min(
                        matrix[i - 1][j - 1] + 1,
                        matrix[i][j - 1] + 1,
                        matrix[i - 1][j] + 1
                    );
                }
            }
        }
        
        return matrix[str2.length][str1.length];
    }
    
    showAnswerResult(question, userAnswer, isCorrect) {
        const optionsContainer = document.getElementById('questionOptions');
        if (!optionsContainer) return;
        
        const allOptions = optionsContainer.querySelectorAll('.option-item');
        allOptions.forEach(option => {
            const optionText = option.querySelector('.option-text').textContent;
            
            if (optionText === question.correct_answer) {
                option.classList.add('correct');
            } else if (optionText === userAnswer && !isCorrect) {
                option.classList.add('incorrect');
            }
        });
        
        // Show explanation
        const explanation = document.createElement('div');
        explanation.className = 'answer-explanation';
        explanation.style.cssText = `
            margin-top: 1rem;
            padding: 1rem;
            background: ${isCorrect ? '#e8f5e8' : '#ffeaea'};
            border: 1px solid ${isCorrect ? '#28a745' : '#dc3545'};
            border-radius: 8px;
            font-size: 0.9rem;
            color: #333;
        `;
        explanation.innerHTML = `
            <strong>${isCorrect ? '✅ Correct!' : '❌ Incorrect'}</strong><br>
            <strong>Explanation:</strong> ${question.explanation}
        `;
        
        optionsContainer.appendChild(explanation);
    }
    
    nextQuestion() {
        this.quizState.currentQuestion++;
        
        if (this.quizState.currentQuestion >= this.quizState.questions.length) {
            this.showQuizResults();
        } else {
            this.displayCurrentQuestion();
        }
    }
    
    showQuizResults() {
        this.showQuizResultsSection();
        this.displayQuizResults();
    }
    
    displayQuizResults() {
        const finalScore = document.getElementById('finalScore');
        const scoreText = document.getElementById('scoreText');
        const scoreBreakdown = document.getElementById('scoreBreakdown');
        const accuracyStat = document.getElementById('accuracyStat');
        const timeStat = document.getElementById('timeStat');
        const difficultyStat = document.getElementById('difficultyStat');
        
        const percentage = Math.round((this.quizState.score / this.quizState.questions.length) * 100);
        const timeTaken = Math.round((Date.now() - this.quizState.startTime) / 1000);
        const minutes = Math.floor(timeTaken / 60);
        const seconds = timeTaken % 60;
        
        if (finalScore) {
            finalScore.textContent = `${percentage}%`;
        }
        
        if (scoreText) {
            if (percentage >= 90) {
                scoreText.textContent = 'Excellent! Outstanding performance!';
            } else if (percentage >= 80) {
                scoreText.textContent = 'Great job! Well done!';
            } else if (percentage >= 70) {
                scoreText.textContent = 'Good work! Keep it up!';
            } else if (percentage >= 60) {
                scoreText.textContent = 'Not bad! Room for improvement.';
            } else {
                scoreText.textContent = 'Keep studying! You can do better.';
            }
        }
        
        if (scoreBreakdown) {
            scoreBreakdown.textContent = `${this.quizState.score} out of ${this.quizState.questions.length} questions correct`;
        }
        
        if (accuracyStat) {
            accuracyStat.textContent = `${percentage}%`;
        }
        
        if (timeStat) {
            timeStat.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
        }
        
        if (difficultyStat) {
            difficultyStat.textContent = this.quizState.difficulty.charAt(0).toUpperCase() + this.quizState.difficulty.slice(1);
        }
    }
    
    updateQuizProgress() {
        const progressFill = document.getElementById('progressFill');
        if (progressFill) {
            const progress = ((this.quizState.currentQuestion + 1) / this.quizState.questions.length) * 100;
            progressFill.style.width = `${progress}%`;
        }
    }
    
    showQuizLoading() {
        const loading = document.getElementById('quizLoading');
        const generateBtn = document.getElementById('generate-quiz-btn');
        
        if (loading) loading.style.display = 'flex';
        if (generateBtn) {
            generateBtn.disabled = true;
            generateBtn.textContent = 'Generating...';
        }
    }
    
    hideQuizLoading() {
        const loading = document.getElementById('quizLoading');
        const generateBtn = document.getElementById('generate-quiz-btn');
        
        if (loading) loading.style.display = 'none';
        if (generateBtn) {
            generateBtn.disabled = false;
            generateBtn.textContent = '🎯 Generate Quiz';
        }
    }
    
    retakeQuiz() {
        this.quizState.currentQuestion = 0;
        this.quizState.answers = [];
        this.quizState.score = 0;
        this.quizState.startTime = Date.now();
        
        this.showQuizQuestionsSection();
        this.displayCurrentQuestion();
    }
    
    newQuiz() {
        this.showQuizGenerationSection();
    }
    
    reviewAnswers() {
        // Create a review modal or section
        let reviewContent = '<h3>📝 Quiz Review</h3>';
        
        this.quizState.answers.forEach((answer, index) => {
            const question = this.quizState.questions[index];
            reviewContent += `
                <div style="margin-bottom: 1rem; padding: 1rem; border: 1px solid #ddd; border-radius: 8px;">
                    <strong>Question ${index + 1}:</strong> ${question.question}<br>
                    <strong>Your Answer:</strong> ${answer.userAnswer}<br>
                    <strong>Correct Answer:</strong> ${answer.correctAnswer}<br>
                    <strong>Result:</strong> ${answer.isCorrect ? '✅ Correct' : '❌ Incorrect'}<br>
                    <strong>Explanation:</strong> ${answer.explanation}
                </div>
            `;
        });
        
        // Create a simple modal for review
        const modal = document.createElement('div');
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.5);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 2000;
        `;
        
        const modalContent = document.createElement('div');
        modalContent.style.cssText = `
            background: white;
            padding: 2rem;
            border-radius: 12px;
            max-width: 600px;
            max-height: 80vh;
            overflow-y: auto;
            position: relative;
        `;
        
        modalContent.innerHTML = `
            <button onclick="this.parentElement.parentElement.remove()" style="position: absolute; top: 1rem; right: 1rem; background: none; border: none; font-size: 1.5rem; cursor: pointer;">&times;</button>
            ${reviewContent}
        `;
        
        modal.appendChild(modalContent);
        document.body.appendChild(modal);
        
        // Close on background click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });
    }
    
    // Print Tool Methods
    initializePrintTool() {
        // Create print button
        const printButton = document.createElement('button');
        printButton.className = 'btn btn-secondary print-btn tool-control-btn';
        printButton.innerHTML = '🖨️';
        printButton.title = 'Print PDF';
        printButton.addEventListener('click', () => this.executePrint());
        
        // Add the button to the tool controls container
        const toolControlsContainer = document.getElementById('tool-controls-container');
        if (toolControlsContainer) {
            toolControlsContainer.appendChild(printButton);
        }
        
        // Initialize print functionality
        this.initializePrintFunctionality();
    }
    
    initializePrintFunctionality() {
        // Print state
        this.printState = {
            isOpen: false
        };
        
        // Bind print events
        this.bindPrintEvents();
    }
    
    bindPrintEvents() {
        const closePrintBtn = document.getElementById('close-print-btn');
        const printExecuteBtn = document.getElementById('print-execute-btn');
        
        if (closePrintBtn) {
            closePrintBtn.addEventListener('click', () => this.closePrintDialog());
        }
        
        if (printExecuteBtn) {
            printExecuteBtn.addEventListener('click', () => this.executePrint());
        }
        
        // Close dialog on background click
        const printDialog = document.getElementById('printDialog');
        if (printDialog) {
            printDialog.addEventListener('click', (e) => {
                if (e.target === printDialog) {
                    this.closePrintDialog();
                }
            });
        }
    }
    
    openPrintDialog() {
        if (!this.currentPDF) {
            alert('No PDF loaded. Please upload a PDF first.');
            return;
        }
        
        const printDialog = document.getElementById('printDialog');
        if (printDialog) {
            printDialog.style.display = 'flex';
            this.printState.isOpen = true;
        }
    }
    
    closePrintDialog() {
        const printDialog = document.getElementById('printDialog');
        if (printDialog) {
            printDialog.style.display = 'none';
            this.printState.isOpen = false;
        }
    }
    
    
    async executePrint() {
        if (!this.currentPDF) {
            alert('No PDF loaded. Please upload a PDF first.');
            return;
        }
        
        try {
            // Create a new window for printing
            const printWindow = window.open('', '_blank', 'width=800,height=600');
            
            if (!printWindow) {
                alert('Please allow popups for this site to enable printing.');
                return;
            }
            
            // Write the HTML structure
            printWindow.document.write(`
                <!DOCTYPE html>
                <html>
                <head>
                    <title>Print PDF - ${this.files[0]?.name || 'Document'}</title>
                    <style>
                        @media print {
                            @page {
                                size: A4;
                                margin: 0.5in;
                            }
                            body { margin: 0; }
                            .page { page-break-after: always; }
                            .page:last-child { page-break-after: avoid; }
                        }
                        body { 
                            margin: 0; 
                            padding: 20px; 
                            font-family: Arial, sans-serif;
                        }
                        .page { 
                            margin: 0; 
                            padding: 0; 
                            display: flex;
                            justify-content: center;
                            align-items: center;
                        }
                        canvas { 
                            max-width: 100%; 
                            height: auto; 
                            border: 1px solid #ccc;
                        }
                        .loading {
                            text-align: center;
                            padding: 50px;
                            font-size: 18px;
                        }
                    </style>
                </head>
                <body>
                    <div class="loading">Preparing pages for printing...</div>
                </body>
                </html>
            `);
            
            printWindow.document.close();
            
            // Wait a moment for the window to load
            await new Promise(resolve => setTimeout(resolve, 100));
            
            // Clear the loading message and add pages
            printWindow.document.body.innerHTML = '';
            
            // Render all pages
            for (let pageNum = 1; pageNum <= this.totalPages; pageNum++) {
                const page = await this.currentPDF.getPage(pageNum);
                const viewport = page.getViewport({ scale: 1.5 }); // Higher scale for better print quality
                
                const canvas = document.createElement('canvas');
                canvas.width = viewport.width;
                canvas.height = viewport.height;
                
                const context = canvas.getContext('2d');
                const renderContext = {
                    canvasContext: context,
                    viewport: viewport
                };
                
                await page.render(renderContext).promise;
                
                // Create a new canvas for the print window
                const printCanvas = document.createElement('canvas');
                printCanvas.width = viewport.width;
                printCanvas.height = viewport.height;
                const printContext = printCanvas.getContext('2d');
                printContext.drawImage(canvas, 0, 0);
                
                // Add the page to the print window
                const pageDiv = printWindow.document.createElement('div');
                pageDiv.className = 'page';
                pageDiv.appendChild(printCanvas);
                printWindow.document.body.appendChild(pageDiv);
            }
            
            // Wait for all pages to render, then trigger print
            setTimeout(() => {
                printWindow.print();
                // Close the window after printing
                setTimeout(() => {
                    printWindow.close();
                }, 1000);
            }, 500);
            
        } catch (error) {
            console.error('Error printing PDF:', error);
            alert('Error printing PDF. Please try again.');
        }
    }
    
    // Form Tool Methods
    initializeFormTool() {
        // Initialize form functionality
        this.initializeFormFunctionality();
    }
    
    initializeFormFunctionality() {
        // Form state
        this.formState = {
            isOpen: false,
            currentTool: 'text',
            isDrawing: false,
            formElements: [],
            currentPage: 1,
            canvas: null,
            overlay: null,
            textProperties: {
                fontSize: 14,
                fontFamily: 'Arial',
                color: '#000000'
            },
            signatureProperties: {
                color: '#000000',
                width: 3
            }
        };
        
        // Bind form events
        this.bindFormEvents();
    }
    
    bindFormEvents() {
        const closeFormBtn = document.getElementById('close-form-btn');
        const textToolBtn = document.getElementById('text-tool-btn');
        const signatureToolBtn = document.getElementById('signature-tool-btn');
        const clearToolBtn = document.getElementById('clear-tool-btn');
        const downloadFormBtn = document.getElementById('download-form-btn');
        const resetFormBtn = document.getElementById('reset-form-btn');
        const fontSizeSelect = document.getElementById('fontSize');
        const textColorInput = document.getElementById('textColor');
        const fontFamilySelect = document.getElementById('fontFamily');
        const signatureColorInput = document.getElementById('signatureColor');
        const signatureWidthInput = document.getElementById('signatureWidth');
        const clearSignatureBtn = document.getElementById('clear-signature-btn');
        
        if (closeFormBtn) {
            closeFormBtn.addEventListener('click', () => this.closeFormDialog());
        }
        
        if (textToolBtn) {
            textToolBtn.addEventListener('click', () => this.setActiveTool('text'));
        }
        
        if (signatureToolBtn) {
            signatureToolBtn.addEventListener('click', () => this.setActiveTool('signature'));
        }
        
        
        if (clearToolBtn) {
            clearToolBtn.addEventListener('click', () => this.clearAllFormElements());
        }
        
        
        if (downloadFormBtn) {
            downloadFormBtn.addEventListener('click', () => this.downloadFilledPDF());
        }
        
        if (resetFormBtn) {
            resetFormBtn.addEventListener('click', () => this.resetForm());
        }
        
        // Text properties
        if (fontSizeSelect) {
            fontSizeSelect.addEventListener('change', (e) => {
                this.formState.textProperties.fontSize = parseInt(e.target.value);
            });
        }
        
        if (textColorInput) {
            textColorInput.addEventListener('change', (e) => {
                this.formState.textProperties.color = e.target.value;
            });
        }
        
        if (fontFamilySelect) {
            fontFamilySelect.addEventListener('change', (e) => {
                this.formState.textProperties.fontFamily = e.target.value;
            });
        }
        
        // Signature properties
        if (signatureColorInput) {
            signatureColorInput.addEventListener('change', (e) => {
                this.formState.signatureProperties.color = e.target.value;
            });
        }
        
        if (signatureWidthInput) {
            signatureWidthInput.addEventListener('change', (e) => {
                this.formState.signatureProperties.width = parseInt(e.target.value);
            });
        }
        
        if (clearSignatureBtn) {
            clearSignatureBtn.addEventListener('click', () => this.clearSignature());
        }
        
        // Close dialog on background click
        const formDialog = document.getElementById('formDialog');
        if (formDialog) {
            formDialog.addEventListener('click', (e) => {
                if (e.target === formDialog) {
                    this.closeFormDialog();
                }
            });
        }
    }
    
    openFormDialog() {
        if (!this.currentPDF) {
            alert('No PDF loaded. Please upload a PDF first.');
            return;
        }
        
        const formDialog = document.getElementById('formDialog');
        if (formDialog) {
            formDialog.style.display = 'flex';
            this.formState.isOpen = true;
            
            // Initialize form canvas
            this.initializeFormCanvas();
        }
    }
    
    closeFormDialog() {
        const formDialog = document.getElementById('formDialog');
        if (formDialog) {
            formDialog.style.display = 'none';
            this.formState.isOpen = false;
        }
    }
    
    async initializeFormCanvas() {
        const formCanvas = document.getElementById('formCanvas');
        const formOverlay = document.getElementById('formOverlay');
        
        if (!formCanvas || !formOverlay) return;
        
        this.formState.canvas = formCanvas;
        this.formState.overlay = formOverlay;
        
        // Render current page
        await this.renderFormPage();
        
        // Bind canvas events
        this.bindCanvasEvents();
    }
    
    async renderFormPage() {
        if (!this.currentPDF || !this.formState.canvas) return;
        
        const page = await this.currentPDF.getPage(this.currentPage);
        const viewport = page.getViewport({ scale: this.scale });
        
        const canvas = this.formState.canvas;
        const context = canvas.getContext('2d');
        
        // Set canvas size
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        
        // Render page
        const renderContext = {
            canvasContext: context,
            viewport: viewport
        };
        
        await page.render(renderContext).promise;
        
        // Render form elements
        this.renderFormElements();
    }
    
    bindCanvasEvents() {
        const canvas = this.formState.canvas;
        const overlay = this.formState.overlay;
        
        if (!canvas || !overlay) return;
        
        // Mouse events for drawing signatures
        canvas.addEventListener('mousedown', (e) => this.handleMouseDown(e));
        canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        canvas.addEventListener('mouseup', (e) => this.handleMouseUp(e));
        canvas.addEventListener('click', (e) => this.handleCanvasClick(e));
        
        // Touch events for mobile
        canvas.addEventListener('touchstart', (e) => this.handleTouchStart(e));
        canvas.addEventListener('touchmove', (e) => this.handleTouchMove(e));
        canvas.addEventListener('touchend', (e) => this.handleTouchEnd(e));
    }
    
    handleMouseDown(e) {
        if (this.formState.currentTool === 'signature') {
            this.formState.isDrawing = true;
            const rect = this.formState.canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            
            this.startSignature(x, y);
        }
    }
    
    handleMouseMove(e) {
        if (this.formState.isDrawing && this.formState.currentTool === 'signature') {
            const rect = this.formState.canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            
            this.drawSignature(x, y);
        }
    }
    
    handleMouseUp(e) {
        if (this.formState.isDrawing) {
            this.formState.isDrawing = false;
            this.endSignature();
        }
    }
    
    handleCanvasClick(e) {
        if (this.formState.currentTool === 'text') {
            this.addTextElement(e);
        }
    }
    
    handleTouchStart(e) {
        e.preventDefault();
        const touch = e.touches[0];
        const mouseEvent = new MouseEvent('mousedown', {
            clientX: touch.clientX,
            clientY: touch.clientY
        });
        this.handleMouseDown(mouseEvent);
    }
    
    handleTouchMove(e) {
        e.preventDefault();
        const touch = e.touches[0];
        const mouseEvent = new MouseEvent('mousemove', {
            clientX: touch.clientX,
            clientY: touch.clientY
        });
        this.handleMouseMove(mouseEvent);
    }
    
    handleTouchEnd(e) {
        e.preventDefault();
        const mouseEvent = new MouseEvent('mouseup', {});
        this.handleMouseUp(mouseEvent);
    }
    
    addTextElement(e) {
        const rect = this.formState.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        const textInput = document.createElement('textarea');
        textInput.className = 'form-text-input';
        textInput.style.left = x + 'px';
        textInput.style.top = y + 'px';
        textInput.style.fontSize = this.formState.textProperties.fontSize + 'px';
        textInput.style.fontFamily = this.formState.textProperties.fontFamily;
        textInput.style.color = this.formState.textProperties.color;
        textInput.placeholder = 'Type here...';
        
        this.formState.overlay.appendChild(textInput);
        textInput.focus();
        
        // Add to form elements
        this.formState.formElements.push({
            type: 'text',
            x: x,
            y: y,
            element: textInput,
            properties: { ...this.formState.textProperties }
        });
    }
    
    
    startSignature(x, y) {
        const canvas = this.formState.canvas;
        const context = canvas.getContext('2d');
        
        context.beginPath();
        context.moveTo(x, y);
        context.strokeStyle = this.formState.signatureProperties.color;
        context.lineWidth = this.formState.signatureProperties.width;
        context.lineCap = 'round';
        context.lineJoin = 'round';
    }
    
    drawSignature(x, y) {
        const canvas = this.formState.canvas;
        const context = canvas.getContext('2d');
        
        context.lineTo(x, y);
        context.stroke();
    }
    
    endSignature() {
        const canvas = this.formState.canvas;
        const context = canvas.getContext('2d');
        
        context.closePath();
    }
    
    setActiveTool(tool) {
        this.formState.currentTool = tool;
        
        // Update button states
        document.querySelectorAll('.tool-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        
        const toolBtn = document.getElementById(tool + '-tool-btn');
        if (toolBtn) {
            toolBtn.classList.add('active');
        }
        
        // Update properties visibility
        const textProperties = document.getElementById('textProperties');
        const signatureProperties = document.getElementById('signatureProperties');
        
        if (textProperties) {
            textProperties.style.display = tool === 'text' ? 'block' : 'none';
        }
        
        if (signatureProperties) {
            signatureProperties.style.display = tool === 'signature' ? 'block' : 'none';
        }
        
        // Update cursor
        const canvas = this.formState.canvas;
        if (canvas) {
            if (tool === 'signature') {
                canvas.style.cursor = 'crosshair';
            } else {
                canvas.style.cursor = 'pointer';
            }
        }
    }
    
    renderFormElements() {
        // This will be called when the page is rendered
        // Form elements are already positioned on the overlay
    }
    
    clearAllFormElements() {
        if (confirm('Are you sure you want to clear all form elements?')) {
            this.formState.formElements.forEach(element => {
                if (element.element && element.element.parentNode) {
                    element.element.parentNode.removeChild(element.element);
                }
            });
            this.formState.formElements = [];
            
            // Clear signature from canvas
            this.clearSignature();
        }
    }
    
    clearSignature() {
        const canvas = this.formState.canvas;
        if (canvas) {
            const context = canvas.getContext('2d');
            context.clearRect(0, 0, canvas.width, canvas.height);
            
            // Re-render the PDF page
            this.renderFormPage();
        }
    }
    
    resetForm() {
        if (confirm('Are you sure you want to reset the form? This will clear all changes.')) {
            this.clearAllFormElements();
            this.renderFormPage();
        }
    }
    
    
    async downloadFilledPDF() {
        try {
            // Create a canvas with the filled PDF
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            
            // Copy the form canvas
            canvas.width = this.formState.canvas.width;
            canvas.height = this.formState.canvas.height;
            context.drawImage(this.formState.canvas, 0, 0);
            
            // Convert to blob and download
            canvas.toBlob((blob) => {
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'filled_' + this.files[0].name;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            }, 'image/png');
            
        } catch (error) {
            console.error('Error downloading form:', error);
            alert('Error downloading form. Please try again.');
        }
    }
    
    async generateFilledPDF() {
        // This would integrate with a PDF library to create a proper PDF
        // For now, we'll return the canvas data
        return this.formState.canvas.toDataURL();
    }
    
    // Flashcard Tool Methods
    initializeFlashcardTool() {
        // Create flashcard button
        const flashcardButton = document.createElement('button');
        flashcardButton.className = 'flashcard-btn';
        flashcardButton.innerHTML = '🎴 Flashcards';
        flashcardButton.addEventListener('click', () => this.toggleFlashcardsSidebar());
        
        // Add the button to the PDF controls
        const flashcardContainer = document.getElementById('flashcard-button-container');
        if (flashcardContainer) {
            flashcardContainer.appendChild(flashcardButton);
        }
        
        // Initialize flashcard functionality
        this.initializeFlashcardFunctionality();
    }
    
    initializeFlashcardFunctionality() {
        // Flashcard state
        this.flashcardState = {
            isOpen: false,
            flashcards: [],
            previousFlashcards: [],
            currentCardIndex: 0,
            correctCount: 0,
            incorrectCount: 0,
            incorrectCards: [],
            isFlipped: false,
            isReviewMode: false,
            reviewIndex: 0,
            cardCount: 15,
            difficulty: 'intermediate'
        };
        
        // Bind flashcard events
        this.bindFlashcardEvents();
    }
    
    bindFlashcardEvents() {
        const closeFlashcardsBtn = document.getElementById('close-flashcards-sidebar');
        
        if (closeFlashcardsBtn) {
            closeFlashcardsBtn.addEventListener('click', () => this.closeFlashcardsSidebar());
        }
    }
    
    toggleFlashcardsSidebar() {
        if (!this.currentPDF) {
            alert('No PDF loaded. Please upload a PDF first.');
            return;
        }
        
        const flashcardsSidebar = document.getElementById('flashcardsSidebar');
        if (!flashcardsSidebar) return;
        
        if (this.flashcardState.isOpen) {
            this.closeFlashcardsSidebar();
        } else {
            this.openFlashcardsSidebar();
        }
    }
    
    openFlashcardsSidebar() {
        // Close other sidebars first
        this.closeQuizSidebar();
        this.closeDiagramsSidebar();
        this.closeResourcesSidebar();
        
        const flashcardsSidebar = document.getElementById('flashcardsSidebar');
        const notesArea = document.querySelector('.notes-area');
        if (flashcardsSidebar) {
            flashcardsSidebar.classList.add('open');
            if (notesArea) notesArea.classList.add('sidebar-open');
            this.flashcardState.isOpen = true;
            this.showFlashcardsGenerationSection();
        }
    }
    
    closeFlashcardsSidebar() {
        const flashcardsSidebar = document.getElementById('flashcardsSidebar');
        const notesArea = document.querySelector('.notes-area');
        if (flashcardsSidebar) {
            flashcardsSidebar.classList.remove('open');
            if (notesArea) notesArea.classList.remove('sidebar-open');
            this.flashcardState.isOpen = false;
        }
    }
    
    showFlashcardsGenerationSection() {
        const sidebarContent = document.getElementById('flashcardsSidebarContent');
        if (!sidebarContent) return;
        
        sidebarContent.innerHTML = `
            <div class="sidebar-section">
                <h4>🎴 Generate Flashcards</h4>
                <p>AI will create interactive flashcards from your PDF content</p>
            </div>
            
            <div class="sidebar-options">
                <div class="sidebar-option-group">
                    <label for="flashcardCount">Number of Cards:</label>
                    <select id="flashcardCount" class="sidebar-form-select">
                        <option value="10">10 Cards</option>
                        <option value="15" selected>15 Cards</option>
                        <option value="20">20 Cards</option>
                    </select>
                </div>
                
                <div class="sidebar-option-group">
                    <label for="flashcardDifficulty">Difficulty:</label>
                    <select id="flashcardDifficulty" class="sidebar-form-select">
                        <option value="basic">Basic</option>
                        <option value="intermediate" selected>Intermediate</option>
                        <option value="advanced">Advanced</option>
                    </select>
                </div>
            </div>
            
            <div class="sidebar-actions">
                <button id="generate-flashcards-btn" class="sidebar-btn">
                    🎯 Generate Flashcards
                </button>
                ${this.flashcardState.previousFlashcards && this.flashcardState.previousFlashcards.length > 0 ? `
                    <button id="clear-flashcard-history-btn" class="sidebar-btn secondary">
                        🗑️ Clear History
                    </button>
                ` : ''}
            </div>
            
            <div id="flashcardLoading" class="sidebar-loading" style="display: none;">
                <div class="sidebar-spinner"></div>
                <p>Generating flashcards...</p>
            </div>
        `;
        
        // Bind flashcards sidebar events
        this.bindFlashcardsSidebarEvents();
    }
    
    bindFlashcardsSidebarEvents() {
        const generateFlashcardsBtn = document.getElementById('generate-flashcards-btn');
        const clearHistoryBtn = document.getElementById('clear-flashcard-history-btn');
        const flashcardCountSelect = document.getElementById('flashcardCount');
        const flashcardDifficultySelect = document.getElementById('flashcardDifficulty');
        
        if (generateFlashcardsBtn) {
            generateFlashcardsBtn.addEventListener('click', () => this.generateFlashcards());
        }
        
        if (clearHistoryBtn) {
            clearHistoryBtn.addEventListener('click', () => this.clearFlashcardHistory());
        }
        
        if (flashcardCountSelect) {
            flashcardCountSelect.addEventListener('change', (e) => {
                this.flashcardState.cardCount = parseInt(e.target.value);
            });
        }
        
        if (flashcardDifficultySelect) {
            flashcardDifficultySelect.addEventListener('change', (e) => {
                this.flashcardState.difficulty = e.target.value;
            });
        }
    }
    
    clearFlashcardHistory() {
        if (confirm('Are you sure you want to clear the flashcard history? This will allow generating similar questions again.')) {
            this.flashcardState.previousFlashcards = [];
            this.showFlashcardsGenerationSection(); // Refresh the generation section
        }
    }
    
    bindCardFlipEvents() {
        // Bind flip events to current card
        const currentCard = document.getElementById('currentCard');
        const reviewCard = document.getElementById('reviewCard');
        
        if (currentCard) {
            currentCard.addEventListener('click', () => this.flipCard());
        }
        
        if (reviewCard) {
            reviewCard.addEventListener('click', () => this.flipReviewCard());
        }
    }
    
    openFlashcardDialog() {
        if (!this.currentPDF) {
            alert('No PDF loaded. Please upload a PDF first.');
            return;
        }
        
        const flashcardDialog = document.getElementById('flashcardDialog');
        if (flashcardDialog) {
            flashcardDialog.style.display = 'flex';
            this.flashcardState.isOpen = true;
            this.showGenerationSection();
        }
    }
    
    closeFlashcardDialog() {
        const flashcardDialog = document.getElementById('flashcardDialog');
        if (flashcardDialog) {
            flashcardDialog.style.display = 'none';
            this.flashcardState.isOpen = false;
        }
    }
    
    showGenerationSection() {
        const generationSection = document.getElementById('flashcardGenerationSection');
        const studySection = document.getElementById('flashcardStudySection');
        const resultsSection = document.getElementById('flashcardResultsSection');
        const reviewSection = document.getElementById('flashcardReviewSection');
        
        if (generationSection) generationSection.style.display = 'block';
        if (studySection) studySection.style.display = 'none';
        if (resultsSection) resultsSection.style.display = 'none';
        if (reviewSection) reviewSection.style.display = 'none';
    }
    
    showStudySection() {
        const sidebarContent = document.getElementById('flashcardsSidebarContent');
        if (!sidebarContent) return;
        
        const card = this.flashcardState.flashcards[this.flashcardState.currentCardIndex];
        if (!card) return;
        
        sidebarContent.innerHTML = `
            <div class="quiz-progress">
                <div class="quiz-progress-bar">
                    <div class="quiz-progress-fill" style="width: ${((this.flashcardState.currentCardIndex + 1) / this.flashcardState.flashcards.length) * 100}%"></div>
                </div>
                <div style="color: #cccccc; font-size: 0.9rem; text-align: center;">
                    Card ${this.flashcardState.currentCardIndex + 1} of ${this.flashcardState.flashcards.length}
                </div>
            </div>
            
            <div class="flashcard-container" id="currentCard">
                <div class="flashcard-question">${card.question}</div>
            </div>
            
            <div class="flashcard-actions">
                <button class="sidebar-btn success" onclick="pdfUploader.markCardCorrect()">
                    ✓
                </button>
                <button class="sidebar-btn danger" onclick="pdfUploader.markCardIncorrect()">
                    ✗
                </button>
            </div>
            
            <div class="sidebar-stats" style="margin-top: 1rem;">
                <div class="sidebar-stat">
                    <span class="sidebar-stat-number">${this.flashcardState.correctCount}</span>
                    <span class="sidebar-stat-label">Correct</span>
                </div>
                <div class="sidebar-stat">
                    <span class="sidebar-stat-number">${this.flashcardState.incorrectCount}</span>
                    <span class="sidebar-stat-label">Incorrect</span>
                </div>
            </div>
        `;
        
        // Bind card flip event
        const currentCard = document.getElementById('currentCard');
        if (currentCard) {
            currentCard.addEventListener('click', () => this.flipCard());
        }
    }
    
    showResultsSection() {
        const sidebarContent = document.getElementById('flashcardsSidebarContent');
        if (!sidebarContent) return;
        
        sidebarContent.innerHTML = `
            <div class="sidebar-section">
                <h4>🎉 Study Complete!</h4>
                <p>Great job studying with flashcards!</p>
            </div>
            
            <div class="sidebar-results">
                <div class="sidebar-stats">
                    <div class="sidebar-stat">
                        <span class="sidebar-stat-number">${this.flashcardState.correctCount}</span>
                        <span class="sidebar-stat-label">Correct</span>
                    </div>
                    <div class="sidebar-stat">
                        <span class="sidebar-stat-number">${this.flashcardState.incorrectCount}</span>
                        <span class="sidebar-stat-label">Incorrect</span>
                    </div>
                    <div class="sidebar-stat">
                        <span class="sidebar-stat-number">${this.flashcardState.flashcards.length}</span>
                        <span class="sidebar-stat-label">Total</span>
                    </div>
                </div>
            </div>
            
            <div class="sidebar-actions">
                <button id="continue-studying-btn" class="sidebar-btn">
                    📚 Continue Studying
                </button>
                ${this.flashcardState.incorrectCards.length > 0 ? `
                    <button id="replay-incorrect-btn" class="sidebar-btn secondary">
                        🔄 Review Incorrect (${this.flashcardState.incorrectCards.length})
                    </button>
                ` : ''}
                <button id="new-flashcards-btn" class="sidebar-btn secondary">
                    🆕 New Set
                </button>
            </div>
        `;
        
        // Bind results events
        const continueBtn = document.getElementById('continue-studying-btn');
        const replayBtn = document.getElementById('replay-incorrect-btn');
        const newSetBtn = document.getElementById('new-flashcards-btn');
        
        if (continueBtn) {
            continueBtn.addEventListener('click', () => this.continueStudying());
        }
        
        if (replayBtn) {
            replayBtn.addEventListener('click', () => this.startReviewMode());
        }
        
        if (newSetBtn) {
            newSetBtn.addEventListener('click', () => this.newFlashcardSet());
        }
    }
    
    continueStudying() {
        // Reset counters to 0 and start studying the same set again
        this.flashcardState.currentCardIndex = 0;
        this.flashcardState.correctCount = 0;
        this.flashcardState.incorrectCount = 0;
        this.flashcardState.incorrectCards = [];
        this.flashcardState.isFlipped = false;
        this.flashcardState.isReviewMode = false;
        this.flashcardState.reviewIndex = 0;
        
        // Show the study section with the first card
        this.showStudySection();
    }
    
    showReviewSection() {
        const generationSection = document.getElementById('flashcardGenerationSection');
        const studySection = document.getElementById('flashcardStudySection');
        const resultsSection = document.getElementById('flashcardResultsSection');
        const reviewSection = document.getElementById('flashcardReviewSection');
        
        if (generationSection) generationSection.style.display = 'none';
        if (studySection) studySection.style.display = 'none';
        if (resultsSection) resultsSection.style.display = 'none';
        if (reviewSection) reviewSection.style.display = 'block';
    }
    
    async generateFlashcards() {
        if (!this.currentPDF) {
            alert('No PDF loaded. Please upload a PDF first.');
            return;
        }
        
        this.showFlashcardLoading();
        
        try {
            // Extract text from PDF
            const pdfText = await this.extractPDFText();
            
            if (!pdfText || pdfText.trim().length === 0) {
                throw new Error('No text found in PDF. Cannot generate flashcards.');
            }
            
            // Generate flashcards using Gemini AI
            const flashcards = await this.generateFlashcardQuestions(pdfText);
            
            // Store previous flashcards to avoid duplicates in future generations
            if (this.flashcardState.flashcards && this.flashcardState.flashcards.length > 0) {
                this.flashcardState.previousFlashcards = this.flashcardState.previousFlashcards || [];
                this.flashcardState.previousFlashcards.push(...this.flashcardState.flashcards);
            }
            
            this.flashcardState.flashcards = flashcards;
            this.flashcardState.currentCardIndex = 0;
            this.flashcardState.correctCount = 0;
            this.flashcardState.incorrectCount = 0;
            this.flashcardState.incorrectCards = [];
            this.flashcardState.isFlipped = false;
            
            this.hideFlashcardLoading();
            this.showStudySection();
            this.displayCurrentCard();
            
        } catch (error) {
            console.error('Flashcard generation error:', error);
            this.hideFlashcardLoading();
            alert('Error generating flashcards: ' + error.message);
        }
    }
    
    async extractPDFText() {
        let fullText = '';
        for (let pageNum = 1; pageNum <= this.totalPages; pageNum++) {
            const page = await this.currentPDF.getPage(pageNum);
            const textContent = await page.getTextContent();
            const pageText = textContent.items.map(item => item.str).join(' ');
            fullText += pageText + '\n\n';
        }
        return fullText.trim();
    }
    
    async generateFlashcardQuestions(pdfText) {
        const apiKey = window.CONFIG?.GEMINI_API_KEY || 'YOUR_GEMINI_API_KEY_HERE';
        if (apiKey === 'YOUR_GEMINI_API_KEY_HERE') {
            throw new Error('Please configure your Gemini API key in config.js');
        }
        
        const cardCount = this.flashcardState.cardCount;
        const difficulty = this.flashcardState.difficulty;
        
        // Get previously generated flashcards to avoid duplicates
        const previousFlashcards = this.flashcardState.previousFlashcards || [];
        let avoidDuplicatesText = '';
        
        if (previousFlashcards.length > 0) {
            const previousQuestions = previousFlashcards.map(card => card.question).join('\n- ');
            avoidDuplicatesText = `

CRITICAL REQUIREMENTS FOR THIS GENERATION:
1. DO NOT generate questions similar to these previously generated questions:
- ${previousQuestions}

2. Focus on DIFFERENT sections, topics, or concepts from the PDF text
3. Use different question formats (e.g., if previous were "What is...", use "How does...", "Why is...", "Compare...", etc.)
4. Target different difficulty levels or aspects of the same concepts
5. Generate questions that require different types of thinking (analysis, synthesis, application, evaluation)

Generate ${cardCount} COMPLETELY NEW flashcards that explore different aspects of the content.`;
        }
        
        // Add randomization to make each generation different
        const generationId = Date.now();
        const randomSeed = Math.floor(Math.random() * 1000);
        
        // Vary the prompt structure based on generation number
        const generationCount = this.flashcardState.previousFlashcards ? Math.floor(this.flashcardState.previousFlashcards.length / cardCount) + 1 : 1;
        
        let focusAreas = '';
        let questionTypes = '';
        
        if (generationCount === 1) {
            focusAreas = 'Focus on fundamental concepts, definitions, and basic facts.';
            questionTypes = 'Use "What is...", "Define...", "List..." question formats.';
        } else if (generationCount === 2) {
            focusAreas = 'Focus on processes, relationships, and how things work.';
            questionTypes = 'Use "How does...", "Explain the process...", "Describe the relationship..." question formats.';
        } else if (generationCount === 3) {
            focusAreas = 'Focus on applications, examples, and practical uses.';
            questionTypes = 'Use "Give an example...", "How is this applied...", "What happens when..." question formats.';
        } else {
            focusAreas = 'Focus on analysis, comparison, and critical thinking.';
            questionTypes = 'Use "Compare...", "Analyze...", "Evaluate...", "Why is..." question formats.';
        }
        
        const prompt = `Generate ${cardCount} flashcards based on the following PDF text content. 

Generation Focus (Set ${generationCount}): ${focusAreas}
Question Types: ${questionTypes}

Difficulty Level: ${difficulty}
- Basic: Simple facts, definitions, key terms
- Intermediate: Concepts, relationships, processes
- Advanced: Complex analysis, applications, synthesis

Requirements:
1. Create question-answer pairs that test understanding of key concepts
2. Questions should be clear and specific
3. Answers should be concise but comprehensive
4. Focus on the most important information from the text
5. Include a mix of fact-based and conceptual questions
6. Make sure all information is directly from the provided text
7. Vary the topics and concepts covered to provide comprehensive coverage${avoidDuplicatesText}

Format the response as a JSON array with this structure:
[
  {
    "question": "What is the question here?",
    "answer": "The detailed answer here."
  }
]

PDF Text Content:
${pdfText}

Generate ${cardCount} flashcards:`;

        try {
            return await this.makeAPICallWithRetry(async () => {
                const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
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
                            temperature: 1.0,
                            topK: 40,
                            topP: 0.95,
                            maxOutputTokens: 2048,
                        }
                    })
                });

                if (!response.ok) {
                    throw new Error(`Gemini API error: ${response.status} ${response.statusText}`);
                }

                const data = await response.json();
                
                if (data.candidates && data.candidates[0] && data.candidates[0].content) {
                    const responseText = data.candidates[0].content.parts[0].text.trim();
                    
                    // Try to parse JSON from the response
                    try {
                        const jsonMatch = responseText.match(/\[[\s\S]*\]/);
                        if (jsonMatch) {
                            const flashcards = JSON.parse(jsonMatch[0]);
                            return flashcards;
                        } else {
                            throw new Error('No valid JSON found in response');
                        }
                    } catch (parseError) {
                        console.error('JSON parse error:', parseError);
                        console.log('Raw response:', responseText);
                        throw new Error('Failed to parse flashcards from AI response');
                    }
                } else {
                    throw new Error('Invalid response format from Gemini API');
                }
            });
        } catch (error) {
            console.error('Gemini API error:', error);
            throw error;
        }
    }
    
    displayCurrentCard() {
        const card = this.flashcardState.flashcards[this.flashcardState.currentCardIndex];
        if (!card) return;
        
        // Update progress
        this.updateCardProgress();
        
        // Update question and answer
        const cardQuestion = document.getElementById('cardQuestion');
        const cardAnswer = document.getElementById('cardAnswer');
        
        if (cardQuestion) {
            cardQuestion.textContent = card.question;
        }
        
        if (cardAnswer) {
            cardAnswer.textContent = card.answer;
        }
        
        // Reset card flip state
        this.flashcardState.isFlipped = false;
        const currentCard = document.getElementById('currentCard');
        if (currentCard) {
            currentCard.classList.remove('flipped');
        }
        
        // Update stats
        this.updateStudyStats();
    }
    
    updateCardProgress() {
        const cardProgress = document.getElementById('cardProgress');
        const progressFill = document.getElementById('cardProgressFill');
        
        if (cardProgress) {
            cardProgress.textContent = `Card ${this.flashcardState.currentCardIndex + 1} of ${this.flashcardState.flashcards.length}`;
        }
        
        if (progressFill) {
            const progress = ((this.flashcardState.currentCardIndex + 1) / this.flashcardState.flashcards.length) * 100;
            progressFill.style.width = `${progress}%`;
        }
    }
    
    updateStudyStats() {
        const correctCount = document.getElementById('correctCount');
        const incorrectCount = document.getElementById('incorrectCount');
        
        if (correctCount) {
            correctCount.textContent = this.flashcardState.correctCount;
        }
        
        if (incorrectCount) {
            incorrectCount.textContent = this.flashcardState.incorrectCount;
        }
    }
    
    flipCard() {
        const currentCard = document.getElementById('currentCard');
        if (currentCard) {
            const card = this.flashcardState.flashcards[this.flashcardState.currentCardIndex];
            if (!card) return;
            
            if (!this.flashcardState.isFlipped) {
                // Show answer
                currentCard.innerHTML = `<div class="flashcard-answer">${card.answer}</div>`;
                this.flashcardState.isFlipped = true;
            } else {
                // Show question
                currentCard.innerHTML = `<div class="flashcard-question">${card.question}</div>`;
                this.flashcardState.isFlipped = false;
            }
        }
    }
    
    markCardCorrect() {
        this.flashcardState.correctCount++;
        this.nextCard();
    }
    
    markCardIncorrect() {
        this.flashcardState.incorrectCount++;
        // Add current card to incorrect cards for review
        this.flashcardState.incorrectCards.push(this.flashcardState.currentCardIndex);
        this.nextCard();
    }
    
    nextCard() {
        this.flashcardState.currentCardIndex++;
        
        if (this.flashcardState.currentCardIndex >= this.flashcardState.flashcards.length) {
            this.showResults();
        } else {
            this.showStudySection(); // This will update the sidebar content with new card and stats
        }
    }
    
    showResults() {
        this.showResultsSection();
        
        const finalCorrectCount = document.getElementById('finalCorrectCount');
        const finalIncorrectCount = document.getElementById('finalIncorrectCount');
        
        if (finalCorrectCount) {
            finalCorrectCount.textContent = this.flashcardState.correctCount;
        }
        
        if (finalIncorrectCount) {
            finalIncorrectCount.textContent = this.flashcardState.incorrectCount;
        }
    }
    
    startReviewMode() {
        if (this.flashcardState.incorrectCards.length === 0) {
            alert('No incorrect cards to review!');
            return;
        }
        
        this.flashcardState.isReviewMode = true;
        this.flashcardState.reviewIndex = 0;
        this.showReviewSectionSidebar();
    }
    
    showReviewSectionSidebar() {
        const sidebarContent = document.getElementById('flashcardsSidebarContent');
        if (!sidebarContent) return;
        
        const cardIndex = this.flashcardState.incorrectCards[this.flashcardState.reviewIndex];
        const card = this.flashcardState.flashcards[cardIndex];
        
        sidebarContent.innerHTML = `
            <div class="quiz-progress">
                <div class="quiz-progress-bar">
                    <div class="quiz-progress-fill" style="width: ${((this.flashcardState.reviewIndex + 1) / this.flashcardState.incorrectCards.length) * 100}%"></div>
                </div>
                <div style="color: #cccccc; font-size: 0.9rem; text-align: center;">
                    Reviewing ${this.flashcardState.reviewIndex + 1} of ${this.flashcardState.incorrectCards.length} incorrect cards
                </div>
            </div>
            
            <div class="flashcard-container" id="reviewCard">
                <div class="flashcard-question">${card.question}</div>
            </div>
            
            <div class="flashcard-actions">
                <button class="sidebar-btn success" onclick="pdfUploader.markReviewCorrect()">
                    ✓
                </button>
                <button class="sidebar-btn danger" onclick="pdfUploader.markReviewIncorrect()">
                    ✗
                </button>
            </div>
            
            <div class="sidebar-stats" style="margin-top: 1rem;">
                <div class="sidebar-stat">
                    <span class="sidebar-stat-number">${this.flashcardState.correctCount}</span>
                    <span class="sidebar-stat-label">Correct</span>
                </div>
                <div class="sidebar-stat">
                    <span class="sidebar-stat-number">${this.flashcardState.incorrectCount}</span>
                    <span class="sidebar-stat-label">Incorrect</span>
                </div>
            </div>
        `;
        
        // Bind card flip event
        const reviewCard = document.getElementById('reviewCard');
        if (reviewCard) {
            reviewCard.addEventListener('click', () => this.flipReviewCard());
        }
    }
    
    displayReviewCard() {
        const cardIndex = this.flashcardState.incorrectCards[this.flashcardState.reviewIndex];
        const card = this.flashcardState.flashcards[cardIndex];
        
        if (!card) return;
        
        // Update review progress
        const reviewProgress = document.getElementById('reviewProgress');
        if (reviewProgress) {
            reviewProgress.textContent = `Reviewing ${this.flashcardState.reviewIndex + 1} of ${this.flashcardState.incorrectCards.length}`;
        }
        
        // Update question and answer
        const reviewQuestion = document.getElementById('reviewQuestion');
        const reviewAnswer = document.getElementById('reviewAnswer');
        
        if (reviewQuestion) {
            reviewQuestion.textContent = card.question;
        }
        
        if (reviewAnswer) {
            reviewAnswer.textContent = card.answer;
        }
        
        // Reset card flip state
        const reviewCard = document.getElementById('reviewCard');
        if (reviewCard) {
            reviewCard.classList.remove('flipped');
        }
    }
    
    flipReviewCard() {
        const reviewCard = document.getElementById('reviewCard');
        if (reviewCard) {
            const cardIndex = this.flashcardState.incorrectCards[this.flashcardState.reviewIndex];
            const card = this.flashcardState.flashcards[cardIndex];
            
            if (!this.flashcardState.isFlipped) {
                // Show answer
                reviewCard.innerHTML = `<div class="flashcard-answer">${card.answer}</div>`;
                this.flashcardState.isFlipped = true;
            } else {
                // Show question
                reviewCard.innerHTML = `<div class="flashcard-question">${card.question}</div>`;
                this.flashcardState.isFlipped = false;
            }
        }
    }
    
    markReviewCorrect() {
        // Remove this card from incorrect cards
        const cardIndex = this.flashcardState.incorrectCards[this.flashcardState.reviewIndex];
        this.flashcardState.incorrectCards.splice(this.flashcardState.reviewIndex, 1);
        
        this.nextReviewCard();
    }
    
    markReviewIncorrect() {
        this.nextReviewCard();
    }
    
    nextReviewCard() {
        if (this.flashcardState.incorrectCards.length === 0) {
            // All cards reviewed
            this.flashcardState.isReviewMode = false;
            this.showResults();
        } else {
            // Adjust review index if needed
            if (this.flashcardState.reviewIndex >= this.flashcardState.incorrectCards.length) {
                this.flashcardState.reviewIndex = 0;
            }
            this.showReviewSectionSidebar(); // Use sidebar version
        }
    }
    
    newFlashcardSet() {
        this.showFlashcardsGenerationSection();
        this.flashcardState.flashcards = [];
        this.flashcardState.currentCardIndex = 0;
        this.flashcardState.correctCount = 0;
        this.flashcardState.incorrectCount = 0;
        this.flashcardState.incorrectCards = [];
        this.flashcardState.isFlipped = false;
        this.flashcardState.isReviewMode = false;
        this.flashcardState.reviewIndex = 0;
        // Note: We don't clear previousFlashcards to maintain duplicate avoidance
    }
    
    showFlashcardLoading() {
        const loading = document.getElementById('flashcardLoading');
        const generateBtn = document.getElementById('generate-flashcards-btn');
        
        if (loading) loading.style.display = 'flex';
        if (generateBtn) {
            generateBtn.disabled = true;
            generateBtn.textContent = 'Generating...';
        }
    }
    
    hideFlashcardLoading() {
        const loading = document.getElementById('flashcardLoading');
        const generateBtn = document.getElementById('generate-flashcards-btn');
        
        if (loading) loading.style.display = 'none';
        if (generateBtn) {
            generateBtn.disabled = false;
            generateBtn.textContent = '🎯 Generate Flashcards';
        }
    }
    
    // Notes Editor Methods
    initializeNotesEditor() {
        this.notesState = {
            autoSaveTimeout: null,
            isDirty: false,
            lastSaved: null
        };
        
        this.bindNotesEvents();
        this.loadNotesFromStorage();
        this.updateWordCount();
        this.updateSavedNotesList();
    }
    
    bindNotesEvents() {
        const notesEditor = document.getElementById('notesEditor');
        const clearBtn = document.getElementById('clearNotesBtn');
        const exportBtn = document.getElementById('exportNotesBtn');
        const summarizeBtn = document.getElementById('summarizeBtn');
        const saveNotesBtn = document.getElementById('saveNotesBtn');
        const aiSearchInput = document.getElementById('aiSearchInput');
        const sidebarToggle = document.getElementById('sidebarToggle');
        const sidebarClose = document.getElementById('sidebarClose');
        const notesSidebar = document.getElementById('notesSidebar');
        
        if (notesEditor) {
            notesEditor.addEventListener('input', () => {
                this.updateWordCount();
                this.autoSave();
                this.updateFormatButtons();
            });
            
            notesEditor.addEventListener('paste', (e) => {
                e.preventDefault();
                const text = (e.clipboardData || window.clipboardData).getData('text/plain');
                document.execCommand('insertText', false, text);
            });
            
            // Update button states when selection changes
            notesEditor.addEventListener('mouseup', () => {
                this.updateFormatButtons();
            });
            
            notesEditor.addEventListener('keyup', () => {
                this.updateFormatButtons();
            });
            
            // Ensure focus when clicking in editor
            notesEditor.addEventListener('click', () => {
                notesEditor.focus();
                this.updateFormatButtons();
            });
        }
        
        if (clearBtn) {
            clearBtn.addEventListener('click', () => this.clearNotes());
        }
        
        if (exportBtn) {
            exportBtn.addEventListener('click', () => this.exportNotes());
        }
        
        if (summarizeBtn) {
            summarizeBtn.addEventListener('click', () => this.summarizeToNotes());
        }
        
        if (saveNotesBtn) {
            saveNotesBtn.addEventListener('click', () => this.saveNotesToSidebar());
        }
        
        if (aiSearchInput) {
            aiSearchInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.askAI();
                }
            });
        }
        
        if (sidebarToggle) {
            sidebarToggle.addEventListener('click', () => this.toggleSidebar());
        }
        
        if (sidebarClose) {
            sidebarClose.addEventListener('click', () => this.closeSidebar());
        }
        
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey || e.metaKey) {
                switch (e.key) {
                    case 'b':
                        e.preventDefault();
                        this.toggleFormat('bold');
                        break;
                    case 'i':
                        e.preventDefault();
                        this.toggleFormat('italic');
                        break;
                    case 'u':
                        e.preventDefault();
                        this.toggleFormat('underline');
                        break;
                    case 'e':
                        e.preventDefault();
                        this.exportNotes();
                        break;
                }
            }
            
            // Tab key for indentation
            if (e.key === 'Tab') {
                if (notesEditor && document.activeElement === notesEditor) {
                    e.preventDefault();
                    if (e.shiftKey) {
                        document.execCommand('outdent', false, null);
                    } else {
                        document.execCommand('indent', false, null);
                    }
                }
            }
        });
    }
    
    toggleFormat(command) {
        // Ensure the editor has focus
        const notesEditor = document.getElementById('notesEditor');
        if (notesEditor) {
            notesEditor.focus();
        }
        
        // Execute the command
        const success = document.execCommand(command, false, null);
        
        // Update button states after a short delay to ensure the command is processed
        setTimeout(() => {
            this.updateFormatButtons();
        }, 10);
        
        return success;
    }
    
    updateFormatButtons() {
        try {
            const boldBtn = document.getElementById('boldBtn');
            const italicBtn = document.getElementById('italicBtn');
            const underlineBtn = document.getElementById('underlineBtn');
            const strikethroughBtn = document.getElementById('strikethroughBtn');
            const bulletListBtn = document.getElementById('bulletListBtn');
            const numberListBtn = document.getElementById('numberListBtn');
            const alignLeftBtn = document.getElementById('alignLeftBtn');
            const alignCenterBtn = document.getElementById('alignCenterBtn');
            const alignRightBtn = document.getElementById('alignRightBtn');
            
            // Update formatting buttons
            if (boldBtn) {
                boldBtn.classList.toggle('active', document.queryCommandState('bold'));
            }
            
            if (italicBtn) {
                italicBtn.classList.toggle('active', document.queryCommandState('italic'));
            }
            
            if (underlineBtn) {
                underlineBtn.classList.toggle('active', document.queryCommandState('underline'));
            }
            
            if (strikethroughBtn) {
                strikethroughBtn.classList.toggle('active', document.queryCommandState('strikeThrough'));
            }
            
            if (bulletListBtn) {
                bulletListBtn.classList.toggle('active', document.queryCommandState('insertUnorderedList'));
            }
            
            if (numberListBtn) {
                numberListBtn.classList.toggle('active', document.queryCommandState('insertOrderedList'));
            }
            
            if (alignLeftBtn) {
                alignLeftBtn.classList.toggle('active', document.queryCommandState('justifyLeft'));
            }
            
            if (alignCenterBtn) {
                alignCenterBtn.classList.toggle('active', document.queryCommandState('justifyCenter'));
            }
            
            if (alignRightBtn) {
                alignRightBtn.classList.toggle('active', document.queryCommandState('justifyRight'));
            }
        } catch (error) {
            console.log('Error updating format buttons:', error);
        }
    }
    
    updateWordCount() {
        const notesEditor = document.getElementById('notesEditor');
        const wordCount = document.getElementById('wordCount');
        
        if (notesEditor && wordCount) {
            const text = notesEditor.textContent || notesEditor.innerText || '';
            const words = text.trim() ? text.trim().split(/\s+/).length : 0;
            wordCount.textContent = `${words} words`;
        }
    }
    
    autoSave() {
        const autoSaveStatus = document.getElementById('autoSaveStatus');
        
        if (autoSaveStatus) {
            autoSaveStatus.textContent = 'Saving...';
            autoSaveStatus.className = 'auto-save saving';
        }
        
        // Clear existing timeout
        if (this.notesState.autoSaveTimeout) {
            clearTimeout(this.notesState.autoSaveTimeout);
        }
        
        // Set new timeout
        this.notesState.autoSaveTimeout = setTimeout(() => {
            this.saveNotesToStorage();
            
            if (autoSaveStatus) {
                autoSaveStatus.textContent = 'Auto-saved';
                autoSaveStatus.className = 'auto-save';
            }
            
            this.notesState.lastSaved = new Date();
        }, 1000);
    }
    
    
    saveNotesToStorage() {
        const notesEditor = document.getElementById('notesEditor');
        if (notesEditor) {
            const notesData = {
                content: notesEditor.innerHTML,
                timestamp: new Date().toISOString()
            };
            localStorage.setItem('pdfTutor_notes', JSON.stringify(notesData));
            this.notesState.isDirty = false;
        }
    }
    
    loadNotesFromStorage() {
        const notesEditor = document.getElementById('notesEditor');
        const savedNotes = localStorage.getItem('pdfTutor_notes');
        
        if (notesEditor && savedNotes) {
            try {
                const notesData = JSON.parse(savedNotes);
                notesEditor.innerHTML = notesData.content;
                this.notesState.lastSaved = new Date(notesData.timestamp);
                this.updateWordCount();
            } catch (error) {
                console.error('Error loading notes:', error);
            }
        }
    }
    
    clearNotes() {
        if (confirm('Are you sure you want to clear all notes? This action cannot be undone.')) {
            const notesEditor = document.getElementById('notesEditor');
            const autoSaveStatus = document.getElementById('autoSaveStatus');
            
            if (notesEditor) {
                notesEditor.innerHTML = '<p>Start typing your notes here...</p>';
                this.updateWordCount();
                this.saveNotesToStorage();
            }
            
            if (autoSaveStatus) {
                autoSaveStatus.textContent = 'Cleared';
                autoSaveStatus.className = 'auto-save';
                
                setTimeout(() => {
                    autoSaveStatus.textContent = 'Auto-saved';
                }, 2000);
            }
        }
    }
    
    exportNotes() {
        const notesEditor = document.getElementById('notesEditor');
        if (!notesEditor) return;
        
        // Get the content
        const content = notesEditor.innerHTML;
        const textContent = notesEditor.textContent || notesEditor.innerText || '';
        
        // Create export options modal
        this.showExportModal(content, textContent);
    }
    
    showExportModal(htmlContent, textContent) {
        // Create modal overlay
        const modal = document.createElement('div');
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.5);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 3000;
        `;
        
        // Create modal content
        const modalContent = document.createElement('div');
        modalContent.style.cssText = `
            background: #2a2a2a;
            padding: 2rem;
            border-radius: 12px;
            color: #ffffff;
            max-width: 500px;
            width: 90%;
        `;
        
        modalContent.innerHTML = `
            <h3 style="margin: 0 0 1.5rem 0; color: #ffffff;">Export Notes</h3>
            <p style="margin-bottom: 1.5rem; color: #ccc;">Choose how you'd like to export your notes:</p>
            
            <div style="display: flex; flex-direction: column; gap: 1rem;">
                <button id="exportHTML" style="
                    background: #007bff;
                    color: white;
                    border: none;
                    padding: 0.75rem 1rem;
                    border-radius: 6px;
                    cursor: pointer;
                    font-size: 0.9rem;
                ">Export as HTML Document</button>
                
                <button id="exportTXT" style="
                    background: #28a745;
                    color: white;
                    border: none;
                    padding: 0.75rem 1rem;
                    border-radius: 6px;
                    cursor: pointer;
                    font-size: 0.9rem;
                ">Export as Text File</button>
                
                <button id="exportPDF" style="
                    background: #dc3545;
                    color: white;
                    border: none;
                    padding: 0.75rem 1rem;
                    border-radius: 6px;
                    cursor: pointer;
                    font-size: 0.9rem;
                ">Export as PDF</button>
                
                <button id="copyToClipboard" style="
                    background: #6c757d;
                    color: white;
                    border: none;
                    padding: 0.75rem 1rem;
                    border-radius: 6px;
                    cursor: pointer;
                    font-size: 0.9rem;
                ">Copy to Clipboard</button>
                
                <button id="closeExportModal" style="
                    background: #4a4a4a;
                    color: white;
                    border: none;
                    padding: 0.75rem 1rem;
                    border-radius: 6px;
                    cursor: pointer;
                    font-size: 0.9rem;
                    margin-top: 1rem;
                ">Cancel</button>
            </div>
        `;
        
        modal.appendChild(modalContent);
        document.body.appendChild(modal);
        
        // Add event listeners
        modalContent.querySelector('#exportHTML').addEventListener('click', () => {
            this.downloadAsHTML(htmlContent);
            modal.remove();
        });
        
        modalContent.querySelector('#exportTXT').addEventListener('click', () => {
            this.downloadAsText(textContent);
            modal.remove();
        });
        
        modalContent.querySelector('#exportPDF').addEventListener('click', () => {
            this.downloadAsPDF(textContent);
            modal.remove();
        });
        
        modalContent.querySelector('#copyToClipboard').addEventListener('click', () => {
            this.copyToClipboard(textContent);
            modal.remove();
        });
        
        modalContent.querySelector('#closeExportModal').addEventListener('click', () => {
            modal.remove();
        });
        
        // Close on background click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });
    }
    
    downloadAsHTML(htmlContent) {
        const blob = new Blob([`
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <title>PDF Tutor Notes</title>
                <style>
                    body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 2rem; line-height: 1.6; }
                    h1, h2, h3, h4, h5, h6 { color: #333; }
                    ul, ol { margin: 1rem 0; padding-left: 2rem; }
                    blockquote { border-left: 4px solid #ddd; padding-left: 1rem; margin: 1rem 0; color: #666; }
                </style>
            </head>
            <body>
                <h1>PDF Tutor Notes</h1>
                <p><em>Exported on ${new Date().toLocaleString()}</em></p>
                <hr>
                ${htmlContent}
            </body>
            </html>
        `], { type: 'text/html' });
        
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `pdf-tutor-notes-${new Date().toISOString().split('T')[0]}.html`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
    
    downloadAsText(textContent) {
        const blob = new Blob([`PDF Tutor Notes\nExported on ${new Date().toLocaleString()}\n\n${textContent}`], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `pdf-tutor-notes-${new Date().toISOString().split('T')[0]}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
    
    downloadAsPDF(textContent) {
        // Simple PDF generation using browser print
        const printWindow = window.open('', '_blank');
        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>PDF Tutor Notes</title>
                <style>
                    body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 2rem; line-height: 1.6; }
                    @media print { body { margin: 0; padding: 1rem; } }
                </style>
            </head>
            <body>
                <h1>PDF Tutor Notes</h1>
                <p><em>Exported on ${new Date().toLocaleString()}</em></p>
                <hr>
                <pre style="white-space: pre-wrap; font-family: inherit;">${textContent}</pre>
            </body>
            </html>
        `);
        printWindow.document.close();
        
        setTimeout(() => {
            printWindow.print();
            printWindow.close();
        }, 500);
    }
    
    copyToClipboard(textContent) {
        navigator.clipboard.writeText(textContent).then(() => {
            // Show success message
            const autoSaveStatus = document.getElementById('autoSaveStatus');
            if (autoSaveStatus) {
                const originalText = autoSaveStatus.textContent;
                autoSaveStatus.textContent = 'Copied to clipboard!';
                autoSaveStatus.className = 'auto-save';
                
                setTimeout(() => {
                    autoSaveStatus.textContent = originalText;
                }, 2000);
            }
        }).catch(err => {
            console.error('Failed to copy text: ', err);
            alert('Failed to copy to clipboard');
        });
    }
    
    closeSummaryPanel() {
        if (this.summaryPanel) {
            this.summaryPanel.style.display = 'none';
        }
    }
    
    // AI-Powered Note Taker Methods
    async summarizeToNotes() {
        if (!this.currentPDF) {
            alert('No PDF loaded. Please upload a PDF first.');
            return;
        }
        
        const notesEditor = document.getElementById('notesEditor');
        const summarizeBtn = document.getElementById('summarizeBtn');
        
        if (!notesEditor || !summarizeBtn) return;
        
        // Show loading state
        const originalText = summarizeBtn.textContent;
        summarizeBtn.textContent = 'Summarizing...';
        summarizeBtn.disabled = true;
        
        try {
            // Extract text from PDF
            const pdfText = await this.extractPDFText();
            
            if (!pdfText || pdfText.trim().length === 0) {
                throw new Error('No text found in PDF. Cannot generate summary.');
            }
            
            // Generate summary using Gemini AI
            const summary = await this.generateNotes(pdfText);
            
            // Add summary to notes editor
            const currentContent = notesEditor.innerHTML;
            const summarySection = `
                <div class="ai-summary-section" style="margin-bottom: 1.5rem; padding: 1rem; border-left: 4px solid #007bff; border-radius: 4px;">
                    <h4 style="margin: 0 0 0.5rem 0; color: #007bff; font-size: 1rem;">📝 AI Summary</h4>
                    <p style="margin: 0; line-height: 1.6;">${summary}</p>
                    <small style="color: #6c757d; font-size: 0.8rem;">Generated on ${new Date().toLocaleString()}</small>
                </div>
            `;
            
            if (currentContent === '<p>Start typing your notes here...</p>') {
                notesEditor.innerHTML = summarySection;
            } else {
                notesEditor.innerHTML = currentContent + summarySection;
            }
            
            // Focus editor and update word count
            notesEditor.focus();
            this.updateWordCount();
            this.autoSave();
            
        } catch (error) {
            console.error('Summary generation error:', error);
            alert('Error generating summary: ' + error.message);
        } finally {
            // Reset button state
            summarizeBtn.textContent = originalText;
            summarizeBtn.disabled = false;
        }
    }
    
    async askAI() {
        const aiSearchInput = document.getElementById('aiSearchInput');
        const aiSearchResults = document.getElementById('aiSearchResults');
        
        if (!aiSearchInput || !aiSearchResults) return;
        
        const query = aiSearchInput.value.trim();
        if (!query) {
            alert('Please enter a question or request.');
            return;
        }
        
        // Show loading state
        aiSearchInput.disabled = true;
        aiSearchInput.placeholder = 'Asking AI...';
        aiSearchResults.style.display = 'block';
        aiSearchResults.className = 'ai-search-results loading';
        aiSearchResults.textContent = 'AI is thinking...';
        
        try {
            // Get current notes content
            const notesEditor = document.getElementById('notesEditor');
            const notesContent = notesEditor ? notesEditor.textContent || notesEditor.innerText || '' : '';
            
            // Get PDF text for context
            let pdfContext = '';
            if (this.currentPDF) {
                try {
                    pdfContext = await this.extractPDFText();
                } catch (error) {
                    console.log('Could not extract PDF text for context');
                }
            }
            
            // Generate AI response
            const response = await this.generateAIResponse(query, notesContent, pdfContext);
            
            // Display response
            aiSearchResults.className = 'ai-search-results';
            aiSearchResults.innerHTML = `
                <div class="ai-response" style="margin-bottom: 1rem;">
                    <strong>🤖 AI Response:</strong>
                    <p style="margin: 0.5rem 0 0 0; line-height: 1.6;">${response}</p>
                </div>
                <div class="ai-actions" style="display: flex; gap: 0.5rem; margin-top: 1rem;">
                    <button onclick="pdfUploader.addToNotes('${response.replace(/'/g, "\\'")}')" style="padding: 0.5rem 1rem; background: #28a745; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 0.8rem;">Add to Notes</button>
                    <button onclick="pdfUploader.clearAIResponse()" style="padding: 0.5rem 1rem; background: #6c757d; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 0.8rem;">Clear</button>
                </div>
            `;
            
        } catch (error) {
            console.error('AI query error:', error);
            aiSearchResults.className = 'ai-search-results';
            aiSearchResults.innerHTML = `
                <div style="color: #dc3545;">
                    <strong>❌ Error:</strong> ${error.message}
                </div>
            `;
        } finally {
            // Reset input state
            aiSearchInput.disabled = false;
            aiSearchInput.placeholder = 'Ask anything';
        }
    }
    
    // Method to validate API key
    validateAPIKey() {
        const apiKey = window.CONFIG?.GEMINI_API_KEY || 'YOUR_GEMINI_API_KEY_HERE';
        
        if (apiKey === 'YOUR_GEMINI_API_KEY_HERE') {
            throw new Error('Please configure your Gemini API key in config.js');
        }
        
        if (!apiKey || apiKey.length < 20) {
            throw new Error('Invalid API key format. Please check your Gemini API key in config.js');
        }
        
        if (!apiKey.startsWith('AIza')) {
            throw new Error('API key format appears incorrect. Gemini API keys typically start with "AIza"');
        }
        
        return apiKey;
    }


    
    

    // Simple cache for API responses
    getCachedResponse(cacheKey) {
        return this.apiCache.get(cacheKey);
    }

    setCachedResponse(cacheKey, response) {
        // Limit cache size to prevent memory issues
        if (this.apiCache.size > 50) {
            const firstKey = this.apiCache.keys().next().value;
            this.apiCache.delete(firstKey);
        }
        this.apiCache.set(cacheKey, response);
    }

    // Utility method for API calls with retry logic
    async makeAPICallWithRetry(apiCall, maxRetries = 3, baseDelay = 5000) {
        
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                const result = await apiCall();
                // Clear any rate limiting messages on success
                this.hideStatus();
                return result;
            } catch (error) {
                console.log(`API call attempt ${attempt} failed:`, error.message);
                
                // Check for rate limiting (429) or quota exceeded errors
                const isRateLimit = error.message.includes('429') || 
                                  error.message.includes('quota') || 
                                  error.message.includes('rate limit') ||
                                  error.message.includes('Too Many Requests') ||
                                  error.message.includes('RESOURCE_EXHAUSTED');
                
                console.log('Error details:', {
                    message: error.message,
                    isRateLimit: isRateLimit,
                    attempt: attempt,
                    maxRetries: maxRetries
                });
                
                if (isRateLimit && attempt < maxRetries) {
                    // Longer delays with jitter to avoid thundering herd
                    const delay = baseDelay * Math.pow(2, attempt - 1) + Math.random() * 1000;
                    console.log(`Rate limited. Waiting ${Math.round(delay)}ms before retry ${attempt + 1}...`);
                    
                    // Show user-friendly message
                    this.showStatus(`🔄 Rate limited by API. Retrying in ${Math.round(delay/1000)}s... (attempt ${attempt + 1}/${maxRetries})`, 'warning');
                    
                    await new Promise(resolve => setTimeout(resolve, delay));
                    continue;
                }
                
                // If it's not a rate limit error or we're out of retries, throw the error
                throw error;
            }
        }
        
        // If we get here, all retries failed
        this.showStatus('❌ All retry attempts failed due to rate limiting. Please wait 5-10 minutes and try again.', 'error');
        console.log('Rate limiting troubleshooting:');
        console.log('1. Check if your API key has sufficient quota');
        console.log('2. Verify the API key is valid and active');
        console.log('3. Consider upgrading your Google Cloud billing plan');
        console.log('4. Try again in 5-10 minutes');
        throw new Error('All retry attempts failed due to rate limiting. Please wait a few minutes and try again.');
    }

    async generateAIResponse(query, notesContent, pdfContext) {
        const apiKey = this.validateAPIKey();
        
        let prompt = `You are an AI assistant helping with note-taking and document analysis. Please provide a helpful response to the user's query.
        
User's Question: ${query}`;

        if (notesContent && notesContent.trim()) {
            prompt += `\n\nCurrent Notes Context:\n${notesContent}`;
        }
        
        if (pdfContext && pdfContext.trim()) {
            prompt += `\n\nPDF Document Context:\n${pdfContext.substring(0, 2000)}...`;
        }
        
        prompt += `\n\nPlease provide a clear, helpful response that addresses the user's question. If relevant, suggest how they might improve their notes or understand the content better.`;

        try {
            return await this.makeAPICallWithRetry(async () => {
                const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
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
                            temperature: 1.0,
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
            });
        } catch (error) {
            console.error('Gemini API error:', error);
            throw error;
        }
    }
    
    addToNotes(text) {
        const notesEditor = document.getElementById('notesEditor');
        if (!notesEditor) return;
        
        const currentContent = notesEditor.innerHTML;
        const aiSection = `
            <div class="ai-added-section" style="margin-bottom: 1rem; padding: 0.75rem; background-color: #e8f5e8; border-left: 3px solid #28a745; border-radius: 4px;">
                <p style="margin: 0; line-height: 1.6;">${text}</p>
                <small style="color: #6c757d; font-size: 0.8rem;">Added by AI on ${new Date().toLocaleString()}</small>
            </div>
        `;
        
        if (currentContent === '<p>Start typing your notes here...</p>') {
            notesEditor.innerHTML = aiSection;
        } else {
            notesEditor.innerHTML = currentContent + aiSection;
        }
        
        notesEditor.focus();
        this.updateWordCount();
        this.autoSave();
        this.clearAIResponse();
    }
    
    clearAIResponse() {
        const aiSearchInput = document.getElementById('aiSearchInput');
        const aiSearchResults = document.getElementById('aiSearchResults');
        
        if (aiSearchInput) aiSearchInput.value = '';
        if (aiSearchResults) {
            aiSearchResults.style.display = 'none';
            aiSearchResults.innerHTML = '';
        }
    }
    
    // Sidebar Methods
    toggleSidebar() {
        const notesSidebar = document.getElementById('notesSidebar');
        const notesMainContent = document.querySelector('.notes-main-content');
        
        if (notesSidebar) {
            notesSidebar.classList.toggle('open');
            
            // Toggle the sidebar-open class for fallback support
            if (notesMainContent) {
                notesMainContent.classList.toggle('sidebar-open');
            }
        }
    }
    
    closeSidebar() {
        const notesSidebar = document.getElementById('notesSidebar');
        const notesMainContent = document.querySelector('.notes-main-content');
        
        if (notesSidebar) {
            notesSidebar.classList.remove('open');
            
            // Remove the sidebar-open class
            if (notesMainContent) {
                notesMainContent.classList.remove('sidebar-open');
            }
        }
    }
    
    saveNotesToSidebar() {
        const notesEditor = document.getElementById('notesEditor');
        const savedNotesList = document.getElementById('savedNotesList');
        
        if (!notesEditor || !savedNotesList) return;
        
        const content = notesEditor.textContent || notesEditor.innerText || '';
        if (!content.trim() || content.trim() === 'Start typing your notes here...') {
            alert('Please add some content to your notes before saving.');
            return;
        }
        
        const title = prompt('Enter a title for your notes:');
        if (!title) return;
        
        const noteId = Date.now().toString();
        const noteData = {
            id: noteId,
            title: title,
            content: notesEditor.innerHTML,
            timestamp: new Date().toISOString(),
            preview: content.substring(0, 100) + (content.length > 100 ? '...' : '')
        };
        
        // Save to localStorage
        const savedNotes = JSON.parse(localStorage.getItem('pdfTutor_savedNotes') || '[]');
        savedNotes.unshift(noteData); // Add to beginning
        localStorage.setItem('pdfTutor_savedNotes', JSON.stringify(savedNotes));
        
        // Update sidebar
        this.updateSavedNotesList();
        
        alert('Notes saved successfully!');
    }
    
    updateSavedNotesList() {
        const savedNotesList = document.getElementById('savedNotesList');
        if (!savedNotesList) return;
        
        const savedNotes = JSON.parse(localStorage.getItem('pdfTutor_savedNotes') || '[]');
        
        if (savedNotes.length === 0) {
            savedNotesList.innerHTML = '<p style="color: #999; text-align: center; padding: 2rem;">No saved notes yet</p>';
            return;
        }
        
        savedNotesList.innerHTML = savedNotes.map(note => `
            <div class="saved-note-item" data-note-id="${note.id}">
                <div class="saved-note-title">${note.title}</div>
                <div class="saved-note-preview">${note.preview}</div>
                <div style="font-size: 0.7rem; color: #666; margin-top: 0.25rem;">
                    ${new Date(note.timestamp).toLocaleDateString()}
                </div>
            </div>
        `).join('');
        
        // Add click listeners to load notes
        savedNotesList.querySelectorAll('.saved-note-item').forEach(item => {
            item.addEventListener('click', () => {
                const noteId = item.dataset.noteId;
                this.loadSavedNote(noteId);
                this.closeSidebar();
            });
        });
    }
    
    loadSavedNote(noteId) {
        const savedNotes = JSON.parse(localStorage.getItem('pdfTutor_savedNotes') || '[]');
        const note = savedNotes.find(n => n.id === noteId);
        
        if (!note) return;
        
        const notesEditor = document.getElementById('notesEditor');
        if (notesEditor) {
            notesEditor.innerHTML = note.content;
            notesEditor.focus();
            this.updateWordCount();
        }
    }
    
    // Diagram Tool Methods
    initializeDiagramTool() {
        // Create diagram button
        const diagramButton = document.createElement('button');
        diagramButton.className = 'diagram-btn';
        diagramButton.innerHTML = '📊 Diagrams';
        diagramButton.addEventListener('click', () => this.toggleDiagramsSidebar());
        
        // Add the button to the diagram container
        const diagramContainer = document.getElementById('diagram-button-container');
        if (diagramContainer) {
            diagramContainer.appendChild(diagramButton);
        }
        
        // Initialize diagram functionality
        this.initializeDiagramFunctionality();
    }
    
    initializeDiagramFunctionality() {
        // Diagram state
        this.diagramState = {
            isOpen: false,
            currentDiagram: null,
            nodes: [],
            connections: [],
            selectedNode: null,
            diagramType: 'mindmap',
            complexity: 'medium',
            isEditMode: false
        };
        
        // Bind diagram events
        this.bindDiagramEvents();
    }
    
    bindDiagramEvents() {
        const closeDiagramsBtn = document.getElementById('close-diagrams-sidebar');
        
        if (closeDiagramsBtn) {
            closeDiagramsBtn.addEventListener('click', () => this.closeDiagramsSidebar());
        }
    }
    
    toggleDiagramsSidebar() {
        if (!this.currentPDF) {
            alert('No PDF loaded. Please upload a PDF first.');
            return;
        }
        
        const diagramsSidebar = document.getElementById('diagramsSidebar');
        if (!diagramsSidebar) return;
        
        if (this.diagramState.isOpen) {
            this.closeDiagramsSidebar();
        } else {
            this.openDiagramsSidebar();
        }
    }
    
    openDiagramsSidebar() {
        // Close other sidebars first
        this.closeQuizSidebar();
        this.closeFlashcardsSidebar();
        this.closeResourcesSidebar();
        
        const diagramsSidebar = document.getElementById('diagramsSidebar');
        const notesArea = document.querySelector('.notes-area');
        if (diagramsSidebar) {
            diagramsSidebar.classList.add('open');
            if (notesArea) notesArea.classList.add('sidebar-open');
            this.diagramState.isOpen = true;
            this.showDiagramsGenerationSection();
        }
    }
    
    closeDiagramsSidebar() {
        const diagramsSidebar = document.getElementById('diagramsSidebar');
        const notesArea = document.querySelector('.notes-area');
        if (diagramsSidebar) {
            diagramsSidebar.classList.remove('open');
            if (notesArea) notesArea.classList.remove('sidebar-open');
            this.diagramState.isOpen = false;
        }
    }
    
    showDiagramsGenerationSection() {
        const sidebarContent = document.getElementById('diagramsSidebarContent');
        if (!sidebarContent) return;
        
        sidebarContent.innerHTML = `
            <div class="sidebar-section">
                <h4>📊 Generate Diagram</h4>
                <p>AI will analyze your PDF and create an interactive diagram</p>
            </div>
            
            <div class="sidebar-options">
                <div class="sidebar-option-group">
                    <label for="diagramType">Diagram Type:</label>
                    <select id="diagramType" class="sidebar-form-select">
                        <option value="mindmap">🧠 Mind Map</option>
                        <option value="flowchart">🔄 Flowchart</option>
                        <option value="timeline">⏰ Timeline</option>
                    </select>
                </div>
                
                <div class="sidebar-option-group">
                    <label for="diagramComplexity">Complexity:</label>
                    <select id="diagramComplexity" class="sidebar-form-select">
                        <option value="simple">Simple (3 nodes)</option>
                        <option value="medium" selected>Medium (6 nodes)</option>
                        <option value="detailed">Detailed (10 nodes)</option>
                    </select>
                </div>
            </div>
            
            <div class="sidebar-actions">
                <button id="generate-diagram-btn" class="sidebar-btn">
                    🎯 Generate Diagram
                </button>
            </div>
            
            <div id="diagramLoading" class="sidebar-loading" style="display: none;">
                <div class="sidebar-spinner"></div>
                <p>Generating diagram...</p>
            </div>
        `;
        
        // Bind diagrams sidebar events
        this.bindDiagramsSidebarEvents();
    }
    
    bindDiagramsSidebarEvents() {
        const generateDiagramBtn = document.getElementById('generate-diagram-btn');
        const diagramType = document.getElementById('diagramType');
        const diagramComplexity = document.getElementById('diagramComplexity');
        
        if (generateDiagramBtn) {
            generateDiagramBtn.addEventListener('click', () => this.generateDiagram());
        }
        
        if (diagramType) {
            diagramType.addEventListener('change', (e) => {
                this.diagramState.diagramType = e.target.value;
            });
        }
        
        if (diagramComplexity) {
            diagramComplexity.addEventListener('change', (e) => {
                this.diagramState.complexity = e.target.value;
            });
        }
    }
    
    
    showGenerationSection() {
        const generationSection = document.getElementById('diagramGenerationSection');
        const viewSection = document.getElementById('diagramViewSection');
        
        if (generationSection) generationSection.style.display = 'block';
        if (viewSection) viewSection.style.display = 'none';
    }
    
    showDiagramSection() {
        const sidebarContent = document.getElementById('diagramsSidebarContent');
        if (!sidebarContent) return;
        
        sidebarContent.innerHTML = `
            <div class="sidebar-section">
                <h4>📊 ${this.diagramState.diagramType.charAt(0).toUpperCase() + this.diagramState.diagramType.slice(1)}</h4>
                <p>Interactive diagram with ${this.diagramState.nodes.length} nodes</p>
            </div>
            
            <div class="diagram-canvas-sidebar" id="diagramCanvasSidebar">
                ${this.generateDiagramNodesHTML()}
            </div>
            
            <div class="sidebar-actions">
                <button id="export-diagram-btn" class="sidebar-btn secondary">
                    💾 Export
                </button>
                <button id="new-diagram-btn" class="sidebar-btn">
                    🆕 New
                </button>
            </div>
        `;
        
        // Bind diagram view events
        this.bindDiagramViewEvents();
        
        // Add click event to diagram canvas to open popup
        const diagramCanvasSidebar = document.getElementById('diagramCanvasSidebar');
        if (diagramCanvasSidebar) {
            diagramCanvasSidebar.addEventListener('click', () => {
                this.openDiagramPopup();
            });
            diagramCanvasSidebar.style.cursor = 'pointer';
            diagramCanvasSidebar.title = 'Click to open in full view';
        }
    }
    
    generateDiagramNodesHTML() {
        return this.diagramState.nodes.map(node => `
            <div class="diagram-node-sidebar ${node.type || 'branch'}" 
                 style="left: ${Math.min(node.x, 250)}px; top: ${Math.min(node.y, 200)}px;">
                ${node.label}
            </div>
        `).join('');
    }
    
    bindDiagramViewEvents() {
        const exportBtn = document.getElementById('export-diagram-btn');
        const newDiagramBtn = document.getElementById('new-diagram-btn');
        
        if (exportBtn) {
            exportBtn.addEventListener('click', () => this.exportDiagram());
        }
        
        if (newDiagramBtn) {
            newDiagramBtn.addEventListener('click', () => this.newDiagram());
        }
    }
    
    async generateDiagram() {
        if (!this.currentPDF) {
            alert('No PDF loaded. Please upload a PDF first.');
            return;
        }
        
        this.showDiagramLoading();
        
        try {
            // Extract text from PDF
            const pdfText = await this.extractPDFText();
            
            if (!pdfText || pdfText.trim().length === 0) {
                throw new Error('No text found in PDF. Cannot generate diagram.');
            }
            
            // Generate diagram using Gemini AI
            const diagramData = await this.generateDiagramStructure(pdfText);
            
            this.diagramState.currentDiagram = diagramData;
            this.diagramState.nodes = diagramData.nodes || [];
            this.diagramState.connections = diagramData.connections || [];
            
            this.hideDiagramLoading();
            this.showDiagramSection();
            this.renderDiagram();
            this.updateDiagramInfo();
            
        } catch (error) {
            console.error('Diagram generation error:', error);
            this.hideDiagramLoading();
            alert('Error generating diagram: ' + error.message);
        }
    }
    
    async generateDiagramStructure(pdfText) {
        const apiKey = window.CONFIG?.GEMINI_API_KEY || 'YOUR_GEMINI_API_KEY_HERE';
        if (apiKey === 'YOUR_GEMINI_API_KEY_HERE') {
            throw new Error('Please configure your Gemini API key in config.js');
        }
        
        const diagramType = this.diagramState.diagramType;
        const complexity = this.diagramState.complexity;
        
        let nodeCount = 6;
        switch (complexity) {
            case 'simple': nodeCount = 3; break;
            case 'medium': nodeCount = 6; break;
            case 'detailed': nodeCount = 10; break;
        }
        
        const prompt = `Analyze the following PDF text and create a ${diagramType} diagram structure. 

Diagram Type: ${diagramType}
- mindmap: Central topic with related subtopics branching out
- flowchart: Sequential process with decision points and flows
- timeline: Chronological events with dates and descriptions

Complexity: ${complexity} (exactly ${nodeCount} nodes)

Requirements:
1. Extract key concepts, terms, and relationships from the text
2. Create a logical structure based on the diagram type
3. Include meaningful connections between nodes
4. Focus on the most important information
5. Make nodes descriptive but concise
6. MUST create exactly ${nodeCount} nodes - no more, no less

Format the response as JSON with this structure:
{
  "type": "${diagramType}",
  "title": "Main topic/title",
  "nodes": [
    {
      "id": "node1",
      "label": "Node text",
      "type": "root|branch|leaf",
      "x": 100,
      "y": 100
    }
  ],
  "connections": [
    {
      "from": "node1",
      "to": "node2",
      "label": "connection text (optional)"
    }
  ]
}

PDF Text:
${pdfText}

Generate ${diagramType} diagram:`;

        try {
            return await this.makeAPICallWithRetry(async () => {
                const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
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
                            temperature: 1.0,
                            topK: 40,
                            topP: 0.95,
                            maxOutputTokens: 2048,
                        }
                    })
                });

                if (!response.ok) {
                    throw new Error(`Gemini API error: ${response.status} ${response.statusText}`);
                }

                const data = await response.json();
                
                if (data.candidates && data.candidates[0] && data.candidates[0].content) {
                    const responseText = data.candidates[0].content.parts[0].text.trim();
                    
                    // Try to parse JSON from the response
                    try {
                        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
                        if (jsonMatch) {
                            const diagramData = JSON.parse(jsonMatch[0]);
                            return diagramData;
                        } else {
                            throw new Error('No valid JSON found in response');
                        }
                    } catch (parseError) {
                        console.error('JSON parse error:', parseError);
                        console.log('Raw response:', responseText);
                        throw new Error('Failed to parse diagram structure from AI response');
                    }
                } else {
                    throw new Error('Invalid response format from Gemini API');
                }
            });
        } catch (error) {
            console.error('Gemini API error:', error);
            throw error;
        }
    }
    
    renderDiagram() {
        const canvas = document.getElementById('diagramCanvas');
        if (!canvas) return;
        
        // Clear existing diagram
        canvas.innerHTML = '';
        
        // Render nodes
        this.diagramState.nodes.forEach(node => {
            this.createDiagramNode(node);
        });
        
        // Render connections
        this.diagramState.connections.forEach(connection => {
            this.createDiagramConnection(connection);
        });
    }
    
    createDiagramNode(nodeData) {
        const canvas = document.getElementById('diagramCanvas');
        const nodeElement = document.createElement('div');
        
        nodeElement.className = `diagram-node ${nodeData.type || 'branch'}`;
        nodeElement.id = nodeData.id;
        nodeElement.textContent = nodeData.label;
        nodeElement.style.left = `${nodeData.x}px`;
        nodeElement.style.top = `${nodeData.y}px`;
        
        // Add event listeners
        nodeElement.addEventListener('click', (e) => {
            e.stopPropagation();
            this.selectNode(nodeData.id);
        });
        
        
        // Make draggable if in edit mode
        if (this.diagramState.isEditMode) {
            this.makeNodeDraggable(nodeElement);
        }
        
        canvas.appendChild(nodeElement);
    }
    
    createDiagramConnection(connectionData) {
        const canvas = document.getElementById('diagramCanvas');
        const fromNode = document.getElementById(connectionData.from);
        const toNode = document.getElementById(connectionData.to);
        
        if (!fromNode || !toNode) return;
        
        const connectionElement = document.createElement('div');
        connectionElement.className = 'diagram-connection';
        connectionElement.id = `connection-${connectionData.from}-${connectionData.to}`;
        
        // Calculate connection line
        const fromRect = fromNode.getBoundingClientRect();
        const toRect = toNode.getBoundingClientRect();
        const canvasRect = canvas.getBoundingClientRect();
        
        const fromX = fromRect.left - canvasRect.left + fromRect.width / 2;
        const fromY = fromRect.top - canvasRect.top + fromRect.height / 2;
        const toX = toRect.left - canvasRect.left + toRect.width / 2;
        const toY = toRect.top - canvasRect.top + toRect.height / 2;
        
        const length = Math.sqrt(Math.pow(toX - fromX, 2) + Math.pow(toY - fromY, 2));
        const angle = Math.atan2(toY - fromY, toX - fromX) * 180 / Math.PI;
        
        connectionElement.style.left = `${fromX}px`;
        connectionElement.style.top = `${fromY}px`;
        connectionElement.style.width = `${length}px`;
        connectionElement.style.transform = `rotate(${angle}deg)`;
        connectionElement.style.transformOrigin = '0 50%';
        
        canvas.appendChild(connectionElement);
    }
    
    selectNode(nodeId) {
        // Remove previous selection
        document.querySelectorAll('.diagram-node').forEach(node => {
            node.classList.remove('selected');
        });
        
        // Select current node
        const node = document.getElementById(nodeId);
        if (node) {
            node.classList.add('selected');
            this.diagramState.selectedNode = nodeId;
        }
    }
    
    
    makeNodeDraggable(nodeElement) {
        let isDragging = false;
        let startX, startY, startLeft, startTop;
        
        nodeElement.addEventListener('mousedown', (e) => {
            isDragging = true;
            startX = e.clientX;
            startY = e.clientY;
            startLeft = parseInt(nodeElement.style.left) || 0;
            startTop = parseInt(nodeElement.style.top) || 0;
            
            nodeElement.style.cursor = 'grabbing';
            e.preventDefault();
        });
        
        document.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            
            const deltaX = e.clientX - startX;
            const deltaY = e.clientY - startY;
            
            nodeElement.style.left = `${startLeft + deltaX}px`;
            nodeElement.style.top = `${startTop + deltaY}px`;
        });
        
        document.addEventListener('mouseup', () => {
            if (isDragging) {
                isDragging = false;
                nodeElement.style.cursor = 'pointer';
                
                // Update node data
                const nodeId = nodeElement.id;
                const nodeData = this.diagramState.nodes.find(n => n.id === nodeId);
                if (nodeData) {
                    nodeData.x = parseInt(nodeElement.style.left);
                    nodeData.y = parseInt(nodeElement.style.top);
                }
                
                // Re-render connections
                this.renderDiagram();
            }
        });
    }
    
    
    exportDiagram() {
        // Create a simple export as text
        let exportText = `Diagram: ${this.diagramState.currentDiagram?.title || 'Untitled'}\n`;
        exportText += `Type: ${this.diagramState.diagramType}\n\n`;
        exportText += 'Nodes:\n';
        
        this.diagramState.nodes.forEach(node => {
            exportText += `- ${node.label} (${node.type})\n`;
        });
        
        exportText += '\nConnections:\n';
        this.diagramState.connections.forEach(connection => {
            const fromNode = this.diagramState.nodes.find(n => n.id === connection.from);
            const toNode = this.diagramState.nodes.find(n => n.id === connection.to);
            exportText += `- ${fromNode?.label || connection.from} → ${toNode?.label || connection.to}\n`;
        });
        
        // Download as text file
        const blob = new Blob([exportText], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `diagram-${this.diagramState.diagramType}-${new Date().toISOString().split('T')[0]}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
    
    newDiagram() {
        this.showDiagramsGenerationSection();
        this.diagramState.currentDiagram = null;
        this.diagramState.nodes = [];
        this.diagramState.connections = [];
        this.diagramState.selectedNode = null;
        this.diagramState.isEditMode = false;
    }
    
    updateDiagramInfo() {
        const typeLabel = document.getElementById('diagramTypeLabel');
        const nodeCount = document.getElementById('nodeCount');
        
        if (typeLabel) {
            typeLabel.textContent = this.diagramState.diagramType.charAt(0).toUpperCase() + this.diagramState.diagramType.slice(1);
        }
        
        if (nodeCount) {
            nodeCount.textContent = `${this.diagramState.nodes.length} nodes`;
        }
    }
    
    showDiagramLoading() {
        const loading = document.getElementById('diagramLoading');
        const generateBtn = document.getElementById('generate-diagram-btn');
        
        if (loading) loading.style.display = 'flex';
        if (generateBtn) {
            generateBtn.disabled = true;
            generateBtn.textContent = 'Generating...';
        }
    }
    
    hideDiagramLoading() {
        const loading = document.getElementById('diagramLoading');
        const generateBtn = document.getElementById('generate-diagram-btn');
        
        if (loading) loading.style.display = 'none';
        if (generateBtn) {
            generateBtn.disabled = false;
            generateBtn.textContent = '🎯 Generate Diagram';
        }
    }
    
    // Resources Tool Methods
    initializeResourcesTool() {
        // Create resources button
        const resourcesButton = document.createElement('button');
        resourcesButton.className = 'resources-btn';
        resourcesButton.innerHTML = '📚 More Resources';
        resourcesButton.addEventListener('click', () => this.toggleResourcesSidebar());
        
        // Add the button to the resources container
        const resourcesContainer = document.getElementById('resources-button-container');
        if (resourcesContainer) {
            resourcesContainer.appendChild(resourcesButton);
        }
        
        // Initialize resources functionality
        this.initializeResourcesFunctionality();
    }
    
    initializeResourcesFunctionality() {
        // Resources state
        this.resourcesState = {
            isOpen: false,
            detectedSubject: null,
            video: null,
            savedResources: JSON.parse(localStorage.getItem('pdfTutor_savedResources') || '[]')
        };
        
        // Bind resources events
        this.bindResourcesEvents();
    }
    
    bindResourcesEvents() {
        const closeResourcesBtn = document.getElementById('close-resources-sidebar');
        const refreshResourcesBtn = document.getElementById('refresh-resources-btn');
        const saveStudyPlanBtn = document.getElementById('save-study-plan-btn');
        const exportResourcesBtn = document.getElementById('export-resources-btn');
        
        if (closeResourcesBtn) {
            closeResourcesBtn.addEventListener('click', () => this.closeResourcesSidebar());
        }
        
        if (refreshResourcesBtn) {
            refreshResourcesBtn.addEventListener('click', () => this.analyzeAndFindResources());
        }
        
        
        // Close dialog on background click
        const resourcesDialog = document.getElementById('resourcesDialog');
        if (resourcesDialog) {
            resourcesDialog.addEventListener('click', (e) => {
                if (e.target === resourcesDialog) {
                    this.closeResourcesDialog();
                }
            });
        }
    }
    
    toggleResourcesSidebar() {
        const resourcesSidebar = document.getElementById('resourcesSidebar');
        if (!resourcesSidebar) return;
        
        if (this.resourcesState.isOpen) {
            this.closeResourcesSidebar();
        } else {
            this.openResourcesSidebar();
        }
    }
    
    openResourcesSidebar() {
        // Close other sidebars first
        this.closeQuizSidebar();
        this.closeFlashcardsSidebar();
        this.closeDiagramsSidebar();
        
        const resourcesSidebar = document.getElementById('resourcesSidebar');
        const notesArea = document.querySelector('.notes-area');
        if (resourcesSidebar) {
            resourcesSidebar.classList.add('open');
            if (notesArea) notesArea.classList.add('sidebar-open');
            this.resourcesState.isOpen = true;
            this.showResourcesAnalysisSection();
            // Start analysis immediately
            this.analyzeAndFindResources();
        }
    }
    
    closeResourcesSidebar() {
        const resourcesSidebar = document.getElementById('resourcesSidebar');
        const notesArea = document.querySelector('.notes-area');
        if (resourcesSidebar) {
            resourcesSidebar.classList.remove('open');
            if (notesArea) notesArea.classList.remove('sidebar-open');
            this.resourcesState.isOpen = false;
        }
    }
    
    showResourcesAnalysisSection() {
        const sidebarContent = document.getElementById('resourcesSidebarContent');
        if (!sidebarContent) return;
        
        sidebarContent.innerHTML = `
            <div class="sidebar-section">
                <h4>🔍 Analyzing Your PDF</h4>
                <p>AI is detecting the subject and finding relevant resources</p>
            </div>
            
            <div id="resourcesLoading" class="sidebar-loading">
                <div class="sidebar-spinner"></div>
                <p>Analyzing content and finding resources...</p>
            </div>
        `;
    }
    
    showResourcesDisplaySection() {
        const sidebarContent = document.getElementById('resourcesSidebarContent');
        if (!sidebarContent) return;
        
        const video = this.resourcesState.video;
        const subject = this.resourcesState.detectedSubject;
        
        sidebarContent.innerHTML = `
            <div class="sidebar-section">
                <div class="subject-info">
                    <h4>📚 ${subject || 'Topic'}</h4>
                    </div>
                    </div>
            
            <div class="video-section">
                ${video ? `
                    <div class="video-card">
                        <h5>🎥 ${video.title}</h5>
                        <p class="video-description">${video.description}</p>
                        <a href="${video.url}" target="_blank" class="video-link">
                            ▶️ Watch Video
                        </a>
                </div>
                ` : '<p>No video found for this topic.</p>'}
            </div>
            
            <div class="sidebar-actions">
                <button id="refresh-resources-btn" class="sidebar-btn secondary">🔄 Find New Video</button>
            </div>
        `;
        
        this.bindResourcesSidebarEvents();
    }
    
    displayResourcesInSidebar() {
        // This will be implemented to show resources in the sidebar
        const categoriesContainer = document.querySelector('.resources-categories');
        if (!categoriesContainer) return;
        
        // Display resources by category
        if (this.resourcesState.resources) {
            this.displayResourceCategoryInSidebar('theory', this.resourcesState.resources.theory);
            this.displayResourceCategoryInSidebar('practice', this.resourcesState.resources.practice);
            this.displayResourceCategoryInSidebar('drills', this.resourcesState.resources.drills);
        }
    }
    
    displayResourceCategoryInSidebar(category, resources) {
        const categoriesContainer = document.querySelector('.resources-categories');
        if (!categoriesContainer || !resources) return;
        
        const categoryDiv = document.createElement('div');
        categoryDiv.className = 'resource-category';
        categoryDiv.innerHTML = `
            <div class="category-header">
                <h5>${this.getCategoryIcon(category)} ${this.getCategoryTitle(category)}</h5>
                <span class="resource-count">${resources.length} resources</span>
            </div>
            <div class="resource-list">
                ${resources.map(resource => `
                    <div class="resource-item">
                        <div class="resource-header">
                            <span class="resource-type ${resource.type}">${this.getTypeIcon(resource.type)}</span>
                            <h6 class="resource-title">${resource.title}</h6>
                        </div>
                        <p class="resource-description">${resource.description}</p>
                        <div class="resource-meta">
                            <span class="resource-source">${resource.source}</span>
                            <div class="resource-actions">
                                <button class="resource-action-btn" onclick="window.pdfUploader.openResource('${resource.url}')">Open</button>
                                <button class="resource-action-btn" onclick="window.pdfUploader.saveResource(this, '${resource.title}', '${resource.url}', '${resource.type}')">Save</button>
                            </div>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
        
        categoriesContainer.appendChild(categoryDiv);
    }
    
    getCategoryIcon(category) {
        const icons = {
            theory: '📖',
            practice: '💡',
            drills: '🏃'
        };
        return icons[category] || '📚';
    }
    
    getCategoryTitle(category) {
        const titles = {
            theory: 'Theory & Concepts',
            practice: 'Examples & Practice',
            drills: 'Drills & Exercises'
        };
        return titles[category] || 'Resources';
    }
    
    getTypeIcon(type) {
        const icons = {
            video: '🎥',
            article: '📄',
            practice: '💻',
            flashcards: '🎴',
            worksheet: '📝'
        };
        return icons[type] || '🔗';
    }
    
    bindResourcesSidebarEvents() {
        const refreshBtn = document.getElementById('refresh-resources-btn');
        const savePlanBtn = document.getElementById('save-study-plan-btn');
        const exportBtn = document.getElementById('export-resources-btn');
        
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => this.analyzeAndFindResources());
        }
        
    }
    
    showResourcesSection() {
        const analysisSection = document.getElementById('resourcesAnalysisSection');
        const displaySection = document.getElementById('resourcesDisplaySection');
        
        if (analysisSection) analysisSection.style.display = 'none';
        if (displaySection) displaySection.style.display = 'block';
    }
    
    async analyzeAndFindResources() {
        if (!this.currentPDF) {
            alert('No PDF loaded. Please upload a PDF first.');
            return;
        }
        
        this.showAnalysisSection();
        
        try {
            // Extract text from PDF
            const pdfText = await this.extractPDFText();
            
            if (!pdfText || pdfText.trim().length === 0) {
                throw new Error('No text found in PDF. Cannot analyze content.');
            }
            
            // Analyze subject and find resources
            const analysisResult = await this.analyzeSubjectAndFindResources(pdfText);
            
            this.resourcesState.detectedSubject = analysisResult.subject;
            this.resourcesState.video = analysisResult.video;
            
            this.showResourcesDisplaySection();
            
        } catch (error) {
            console.error('Resources analysis error:', error);
            alert('Error analyzing PDF and finding resources: ' + error.message);
        }
    }
    
    async analyzeSubjectAndFindResources(pdfText) {
        const apiKey = this.validateAPIKey();
        
        // Create cache key based on content hash
        const cacheKey = `resources_${pdfText.substring(0, 100)}`;
        const cached = this.getCachedResponse(cacheKey);
        if (cached) {
            console.log('Using cached resources response');
            return cached;
        }
        
        const prompt = `Find the main topic of this text and suggest ONE educational video. Return JSON:

{"subject": "topic", "video": {"title": "Video Title", "url": "https://youtube.com/watch?v=...", "description": "Brief description"}}

Text: ${pdfText}`;

        try {
            return await this.makeAPICallWithRetry(async () => {
                const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
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
                            temperature: 1.0,
                            topK: 40,
                            topP: 0.95,
                            maxOutputTokens: 512,
                        }
                    })
                });

                if (!response.ok) {
                    throw new Error(`Gemini API error: ${response.status} ${response.statusText}`);
                }

                const data = await response.json();
                
                if (data.candidates && data.candidates[0] && data.candidates[0].content) {
                    const responseText = data.candidates[0].content.parts[0].text.trim();
                    
                    // Try to parse JSON from the response
                    try {
                        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
                        if (jsonMatch) {
                            const analysisResult = JSON.parse(jsonMatch[0]);
                            // Cache the successful response
                            this.setCachedResponse(cacheKey, analysisResult);
                            return analysisResult;
                        } else {
                            throw new Error('No valid JSON found in response');
                        }
                    } catch (parseError) {
                        console.error('JSON parse error:', parseError);
                        console.log('Raw response:', responseText);
                        throw new Error('Failed to parse analysis result from AI response');
                    }
                } else {
                    throw new Error('Invalid response format from Gemini API');
                }
            });
        } catch (error) {
            console.error('Gemini API error:', error);
            throw error;
        }
    }
    
    displayResources() {
        // Display theory resources
        this.displayResourceCategory('theory', this.resourcesState.resources.theory);
        // Display practice resources
        this.displayResourceCategory('practice', this.resourcesState.resources.practice);
        // Display drill resources
        this.displayResourceCategory('drills', this.resourcesState.resources.drills);
    }
    
    displayResourceCategory(category, resources) {
        const container = document.getElementById(`${category}Resources`);
        const countElement = document.getElementById(`${category}Count`);
        
        if (!container) return;
        
        if (countElement) {
            countElement.textContent = `${resources.length} resources`;
        }
        
        if (resources.length === 0) {
            container.innerHTML = '<p style="color: #999; text-align: center; padding: 2rem;">No resources found for this category</p>';
            return;
        }
        
        container.innerHTML = resources.map(resource => `
            <div class="resource-item" data-resource-id="${Date.now()}_${Math.random()}">
                <div class="resource-header">
                    <h6 class="resource-title">${resource.title}</h6>
                    <span class="resource-type ${resource.type}">${resource.type}</span>
                </div>
                <p class="resource-description">${resource.description}</p>
                <div class="resource-meta">
                    <span class="resource-source">${resource.source}</span>
                    <div class="resource-actions">
                        <button class="resource-action-btn" onclick="pdfUploader.openResource('${resource.url}')">
                            🔗 Open
                        </button>
                        <button class="resource-action-btn" onclick="pdfUploader.toggleHelpful(this, '${resource.title}')">
                            👍 Helpful
                        </button>
                        <button class="resource-action-btn" onclick="pdfUploader.saveResource(this, '${resource.title}', '${resource.url}', '${resource.type}')">
                            💾 Save
                        </button>
                    </div>
                </div>
            </div>
        `).join('');
    }
    
    openResource(url) {
        window.open(url, '_blank');
    }
    
    toggleHelpful(button, resourceTitle) {
        button.classList.toggle('helpful');
        if (button.classList.contains('helpful')) {
            button.textContent = '✅ Helpful';
            // Store helpful resource
            const helpfulResources = JSON.parse(localStorage.getItem('pdfTutor_helpfulResources') || '[]');
            if (!helpfulResources.includes(resourceTitle)) {
                helpfulResources.push(resourceTitle);
                localStorage.setItem('pdfTutor_helpfulResources', JSON.stringify(helpfulResources));
            }
        } else {
            button.textContent = '👍 Helpful';
            // Remove from helpful resources
            const helpfulResources = JSON.parse(localStorage.getItem('pdfTutor_helpfulResources') || '[]');
            const index = helpfulResources.indexOf(resourceTitle);
            if (index > -1) {
                helpfulResources.splice(index, 1);
                localStorage.setItem('pdfTutor_helpfulResources', JSON.stringify(helpfulResources));
            }
        }
    }
    
    saveResource(button, resourceTitle, resourceUrl, resourceType) {
        button.classList.toggle('saved');
        if (button.classList.contains('saved')) {
            button.textContent = '✅ Saved';
            // Add to saved resources
            const resourceData = {
                title: resourceTitle,
                url: resourceUrl,
                type: resourceType,
                timestamp: new Date().toISOString()
            };
            this.resourcesState.savedResources.push(resourceData);
            localStorage.setItem('pdfTutor_savedResources', JSON.stringify(this.resourcesState.savedResources));
        } else {
            button.textContent = '💾 Save';
            // Remove from saved resources
            this.resourcesState.savedResources = this.resourcesState.savedResources.filter(
                r => r.title !== resourceTitle
            );
            localStorage.setItem('pdfTutor_savedResources', JSON.stringify(this.resourcesState.savedResources));
        }
    }
    
    // Diagram Popup Methods
    openDiagramPopup() {
        const modal = document.getElementById('diagramPopupModal');
        const canvas = document.getElementById('diagramPopupCanvas');
        
        if (!modal || !canvas) return;
        
        // Clear previous content
        canvas.innerHTML = '';
        
        // Render diagram in popup with proper scaling
        this.renderDiagramInPopup(canvas);
        
        // Show modal
        modal.style.display = 'block';
        document.body.style.overflow = 'hidden'; // Prevent background scrolling
        
        // Bind close event
        this.bindDiagramPopupEvents();
    }
    
    renderDiagramInPopup(canvas) {
        if (!this.diagramState.nodes || this.diagramState.nodes.length === 0) {
            canvas.innerHTML = '<div style="text-align: center; padding: 50px; color: #666;">No diagram data available</div>';
            return;
        }
        
        // Get canvas dimensions
        const canvasRect = canvas.getBoundingClientRect();
        const padding = 80;
        const availableWidth = Math.max(canvasRect.width - (padding * 2), 400); // Minimum width
        const availableHeight = Math.max(canvasRect.height - (padding * 2), 300); // Minimum height
        
        // Create a better layout using a force-directed approach
        const nodePositions = this.calculateOptimalNodePositions(availableWidth, availableHeight, padding);
        
        // Render nodes with optimal positioning
        this.diagramState.nodes.forEach((node, index) => {
            const nodeElement = document.createElement('div');
            nodeElement.className = `diagram-node-popup ${node.type || 'branch'}`;
            nodeElement.textContent = node.label;
            
            const position = nodePositions[index];
            nodeElement.style.left = `${position.x}px`;
            nodeElement.style.top = `${position.y}px`;
            
            canvas.appendChild(nodeElement);
        });
        
        // Render connections with optimal positioning
        this.diagramState.connections.forEach(connection => {
            const fromIndex = this.diagramState.nodes.findIndex(n => n.id === connection.from);
            const toIndex = this.diagramState.nodes.findIndex(n => n.id === connection.to);
            
            if (fromIndex !== -1 && toIndex !== -1) {
                const connectionElement = document.createElement('div');
                connectionElement.className = 'diagram-connection-popup';
                
                const fromPos = nodePositions[fromIndex];
                const toPos = nodePositions[toIndex];
                
                // Calculate connection line
                const length = Math.sqrt((toPos.x - fromPos.x) ** 2 + (toPos.y - fromPos.y) ** 2);
                const angle = Math.atan2(toPos.y - fromPos.y, toPos.x - fromPos.x) * 180 / Math.PI;
                
                // Position connection line from center of nodes
                const nodeCenterOffset = 50; // Approximate center of node
                const fromX = fromPos.x + nodeCenterOffset;
                const fromY = fromPos.y + 25; // Half of node height
                const toX = toPos.x + nodeCenterOffset;
                const toY = toPos.y + 25;
                
                const connectionLength = Math.sqrt((toX - fromX) ** 2 + (toY - fromY) ** 2);
                const connectionAngle = Math.atan2(toY - fromY, toX - fromX) * 180 / Math.PI;
                
                connectionElement.style.left = `${fromX}px`;
                connectionElement.style.top = `${fromY}px`;
                connectionElement.style.width = `${connectionLength}px`;
                connectionElement.style.transform = `rotate(${connectionAngle}deg)`;
                
                canvas.appendChild(connectionElement);
            }
        });
    }
    
    calculateOptimalNodePositions(availableWidth, availableHeight, padding) {
        const nodes = this.diagramState.nodes;
        const connections = this.diagramState.connections;
        const nodeCount = nodes.length;
        
        if (nodeCount === 0) return [];
        
        // Initialize positions
        let positions = [];
        
        if (nodeCount === 1) {
            // Single node - center it
            positions = [{
                x: padding + availableWidth / 2 - 50,
                y: padding + availableHeight / 2 - 25
            }];
        } else if (nodeCount === 2) {
            // Two nodes - place them side by side
            positions = [
                { x: padding + availableWidth / 3, y: padding + availableHeight / 2 - 25 },
                { x: padding + (availableWidth * 2) / 3, y: padding + availableHeight / 2 - 25 }
            ];
        } else {
            // Multiple nodes - use circular layout with force-directed adjustments
            positions = this.calculateCircularLayout(nodes, connections, availableWidth, availableHeight, padding);
        }
        
        return positions;
    }
    
    calculateCircularLayout(nodes, connections, availableWidth, availableHeight, padding) {
        const nodeCount = nodes.length;
        const centerX = padding + availableWidth / 2;
        const centerY = padding + availableHeight / 2;
        
        // Calculate radius based on available space
        const maxRadius = Math.min(availableWidth, availableHeight) / 2 - 100;
        const radius = Math.max(maxRadius, 150); // Minimum radius
        
        // Place nodes in a circle
        let positions = [];
        for (let i = 0; i < nodeCount; i++) {
            const angle = (2 * Math.PI * i) / nodeCount;
            const x = centerX + radius * Math.cos(angle) - 50; // Offset for node center
            const y = centerY + radius * Math.sin(angle) - 25;
            positions.push({ x, y });
        }
        
        // Apply force-directed layout to improve positioning
        positions = this.applyForceDirectedLayout(positions, connections, availableWidth, availableHeight, padding);
        
        return positions;
    }
    
    applyForceDirectedLayout(positions, connections, availableWidth, availableHeight, padding) {
        const iterations = 50;
        const k = 100; // Spring constant
        const c = 0.1; // Damping factor
        
        for (let iter = 0; iter < iterations; iter++) {
            let forces = positions.map(() => ({ x: 0, y: 0 }));
            
            // Repulsive forces between all nodes
            for (let i = 0; i < positions.length; i++) {
                for (let j = i + 1; j < positions.length; j++) {
                    const dx = positions[i].x - positions[j].x;
                    const dy = positions[i].y - positions[j].y;
                    const distance = Math.sqrt(dx * dx + dy * dy);
                    
                    if (distance > 0) {
                        const force = (k * k) / distance;
                        const fx = (dx / distance) * force;
                        const fy = (dy / distance) * force;
                        
                        forces[i].x += fx;
                        forces[i].y += fy;
                        forces[j].x -= fx;
                        forces[j].y -= fy;
                    }
                }
            }
            
            // Attractive forces for connected nodes
            connections.forEach(connection => {
                const fromIndex = this.diagramState.nodes.findIndex(n => n.id === connection.from);
                const toIndex = this.diagramState.nodes.findIndex(n => n.id === connection.to);
                
                if (fromIndex !== -1 && toIndex !== -1) {
                    const dx = positions[toIndex].x - positions[fromIndex].x;
                    const dy = positions[toIndex].y - positions[fromIndex].y;
                    const distance = Math.sqrt(dx * dx + dy * dy);
                    
                    if (distance > 0) {
                        const force = (distance * distance) / k;
                        const fx = (dx / distance) * force;
                        const fy = (dy / distance) * force;
                        
                        forces[fromIndex].x += fx;
                        forces[fromIndex].y += fy;
                        forces[toIndex].x -= fx;
                        forces[toIndex].y -= fy;
                    }
                }
            });
            
            // Apply forces with damping
            for (let i = 0; i < positions.length; i++) {
                positions[i].x += forces[i].x * c;
                positions[i].y += forces[i].y * c;
                
                // Keep nodes within bounds
                positions[i].x = Math.max(padding, Math.min(padding + availableWidth - 100, positions[i].x));
                positions[i].y = Math.max(padding, Math.min(padding + availableHeight - 50, positions[i].y));
            }
        }
        
        return positions;
    }
    
    bindDiagramPopupEvents() {
        const closeBtn = document.getElementById('closeDiagramPopup');
        const modal = document.getElementById('diagramPopupModal');
        
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.closeDiagramPopup());
        }
        
        if (modal) {
            // Close when clicking outside the content
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    this.closeDiagramPopup();
                }
            });
            
            // Close with Escape key
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape' && modal.style.display === 'block') {
                    this.closeDiagramPopup();
                }
            });
        }
    }
    
    closeDiagramPopup() {
        const modal = document.getElementById('diagramPopupModal');
        if (modal) {
            modal.style.display = 'none';
            document.body.style.overflow = ''; // Restore scrolling
        }
    }
    
    
}

// Initialize the PDF uploader when the page loads
document.addEventListener('DOMContentLoaded', () => {
    window.pdfUploader = new PDFUploader();
    
});
