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
        this.initializeQuizTool();
        this.initializePrintTool();
        this.initializeFormTool();
        this.initializeFlashcardTool();
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
        quizButton.addEventListener('click', () => this.toggleQuizPanel());
        
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
        const closeQuizBtn = document.getElementById('close-quiz-btn');
        const generateQuizBtn = document.getElementById('generate-quiz-btn');
        const submitAnswerBtn = document.getElementById('submit-answer-btn');
        const nextQuestionBtn = document.getElementById('next-question-btn');
        const retakeQuizBtn = document.getElementById('retake-quiz-btn');
        const newQuizBtn = document.getElementById('new-quiz-btn');
        const reviewAnswersBtn = document.getElementById('review-answers-btn');
        const difficultySelect = document.getElementById('quiz-difficulty');
        const questionCountSelect = document.getElementById('quiz-count');
        
        if (closeQuizBtn) {
            closeQuizBtn.addEventListener('click', () => this.closeQuizPanel());
        }
        
        if (generateQuizBtn) {
            generateQuizBtn.addEventListener('click', () => this.generateQuiz());
        }
        
        if (submitAnswerBtn) {
            submitAnswerBtn.addEventListener('click', () => this.submitAnswer());
        }
        
        if (nextQuestionBtn) {
            nextQuestionBtn.addEventListener('click', () => this.nextQuestion());
        }
        
        if (retakeQuizBtn) {
            retakeQuizBtn.addEventListener('click', () => this.retakeQuiz());
        }
        
        if (newQuizBtn) {
            newQuizBtn.addEventListener('click', () => this.newQuiz());
        }
        
        if (reviewAnswersBtn) {
            reviewAnswersBtn.addEventListener('click', () => this.reviewAnswers());
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
    
    toggleQuizPanel() {
        const quizPanel = document.getElementById('quizPanel');
        if (!quizPanel) return;
        
        if (this.quizState.isOpen) {
            this.closeQuizPanel();
        } else {
            this.openQuizPanel();
        }
    }
    
    openQuizPanel() {
        const quizPanel = document.getElementById('quizPanel');
        if (quizPanel) {
            quizPanel.style.display = 'flex';
            this.quizState.isOpen = true;
            this.showQuizGenerationSection();
        }
    }
    
    closeQuizPanel() {
        const quizPanel = document.getElementById('quizPanel');
        if (quizPanel) {
            quizPanel.style.display = 'none';
            this.quizState.isOpen = false;
        }
    }
    
    showQuizGenerationSection() {
        const generationSection = document.getElementById('quizGenerationSection');
        const questionsSection = document.getElementById('quizQuestionsSection');
        const resultsSection = document.getElementById('quizResultsSection');
        
        if (generationSection) generationSection.style.display = 'block';
        if (questionsSection) questionsSection.style.display = 'none';
        if (resultsSection) resultsSection.style.display = 'none';
    }
    
    showQuizQuestionsSection() {
        const generationSection = document.getElementById('quizGenerationSection');
        const questionsSection = document.getElementById('quizQuestionsSection');
        const resultsSection = document.getElementById('quizResultsSection');
        
        if (generationSection) generationSection.style.display = 'none';
        if (questionsSection) questionsSection.style.display = 'block';
        if (resultsSection) resultsSection.style.display = 'none';
    }
    
    showQuizResultsSection() {
        const generationSection = document.getElementById('quizGenerationSection');
        const questionsSection = document.getElementById('quizQuestionsSection');
        const resultsSection = document.getElementById('quizResultsSection');
        
        if (generationSection) generationSection.style.display = 'none';
        if (questionsSection) questionsSection.style.display = 'none';
        if (resultsSection) resultsSection.style.display = 'block';
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
        const apiKey = window.CONFIG?.GEMINI_API_KEY || 'YOUR_GEMINI_API_KEY_HERE';
        if (apiKey === 'YOUR_GEMINI_API_KEY_HERE') {
            throw new Error('Please configure your Gemini API key in config.js');
        }
        
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
                        temperature: 0.7,
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
            const input = document.querySelector('.fill-blank-input');
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
        
        // Show result
        this.showAnswerResult(question, userAnswer, isCorrect);
        
        // Update buttons
        const submitBtn = document.getElementById('submit-answer-btn');
        const nextBtn = document.getElementById('next-question-btn');
        
        if (submitBtn) {
            submitBtn.style.display = 'none';
        }
        
        if (nextBtn) {
            nextBtn.style.display = 'inline-block';
        }
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
        printButton.className = 'print-btn';
        printButton.innerHTML = '🖨️ Print';
        printButton.addEventListener('click', () => this.openPrintDialog());
        
        // Add the button to the PDF controls
        const printContainer = document.getElementById('print-button-container');
        if (printContainer) {
            printContainer.appendChild(printButton);
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
            // Create a simple print window
            const printWindow = window.open('', '_blank');
            
            printWindow.document.write(`
                <!DOCTYPE html>
                <html>
                <head>
                    <title>Print PDF - ${this.files[0]?.name || 'Document'}</title>
                    <style>
                        @media print {
                            @page {
                                size: A4;
                                margin: 1in;
                            }
                            body { margin: 0; }
                            .page { page-break-after: always; }
                            .page:last-child { page-break-after: avoid; }
                        }
                        body { margin: 0; padding: 0; }
                        .page { margin: 0; padding: 0; }
                        canvas { max-width: 100%; height: auto; }
                    </style>
                </head>
                <body>
            `);
            
            // Render all pages
            for (let pageNum = 1; pageNum <= this.totalPages; pageNum++) {
                const page = await this.currentPDF.getPage(pageNum);
                const viewport = page.getViewport({ scale: 1.0 });
                
                const canvas = document.createElement('canvas');
                canvas.width = viewport.width;
                canvas.height = viewport.height;
                
                const context = canvas.getContext('2d');
                const renderContext = {
                    canvasContext: context,
                    viewport: viewport
                };
                
                await page.render(renderContext).promise;
                
                printWindow.document.write(`
                    <div class="page">
                        <canvas width="${viewport.width}" height="${viewport.height}"></canvas>
                    </div>
                `);
                
                // Copy canvas content to the print window
                const printCanvas = printWindow.document.querySelector('.page:last-child canvas');
                const printContext = printCanvas.getContext('2d');
                printContext.drawImage(canvas, 0, 0);
            }
            
            printWindow.document.write('</body></html>');
            printWindow.document.close();
            
            // Wait for content to load, then print
            printWindow.onload = () => {
                setTimeout(() => {
                    printWindow.print();
                    printWindow.close();
                }, 500);
            };
            
            this.closePrintDialog();
            
        } catch (error) {
            console.error('Error printing PDF:', error);
            alert('Error printing PDF. Please try again.');
        }
    }
    
    // Form Tool Methods
    initializeFormTool() {
        // Create form button
        const formButton = document.createElement('button');
        formButton.className = 'form-btn';
        formButton.innerHTML = '📝 Fill & Sign';
        formButton.addEventListener('click', () => this.openFormDialog());
        
        // Add the button to the PDF controls
        const formContainer = document.getElementById('form-button-container');
        if (formContainer) {
            formContainer.appendChild(formButton);
        }
        
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
        flashcardButton.addEventListener('click', () => this.openFlashcardDialog());
        
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
        const closeFlashcardBtn = document.getElementById('close-flashcard-btn');
        const generateFlashcardsBtn = document.getElementById('generate-flashcards-btn');
        const markCorrectBtn = document.getElementById('markCorrect-btn');
        const markIncorrectBtn = document.getElementById('markIncorrect-btn');
        const replayIncorrectBtn = document.getElementById('replay-incorrect-btn');
        const newFlashcardsBtn = document.getElementById('new-flashcards-btn');
        const closeFlashcardsBtn = document.getElementById('close-flashcards-btn');
        const reviewCorrectBtn = document.getElementById('reviewCorrect-btn');
        const reviewIncorrectBtn = document.getElementById('reviewIncorrect-btn');
        const flashcardCountSelect = document.getElementById('flashcardCount');
        const flashcardDifficultySelect = document.getElementById('flashcardDifficulty');
        
        if (closeFlashcardBtn) {
            closeFlashcardBtn.addEventListener('click', () => this.closeFlashcardDialog());
        }
        
        if (generateFlashcardsBtn) {
            generateFlashcardsBtn.addEventListener('click', () => this.generateFlashcards());
        }
        
        if (markCorrectBtn) {
            markCorrectBtn.addEventListener('click', () => this.markCardCorrect());
        }
        
        if (markIncorrectBtn) {
            markIncorrectBtn.addEventListener('click', () => this.markCardIncorrect());
        }
        
        if (replayIncorrectBtn) {
            replayIncorrectBtn.addEventListener('click', () => this.startReviewMode());
        }
        
        if (newFlashcardsBtn) {
            newFlashcardsBtn.addEventListener('click', () => this.newFlashcardSet());
        }
        
        if (closeFlashcardsBtn) {
            closeFlashcardsBtn.addEventListener('click', () => this.closeFlashcardDialog());
        }
        
        if (reviewCorrectBtn) {
            reviewCorrectBtn.addEventListener('click', () => this.markReviewCorrect());
        }
        
        if (reviewIncorrectBtn) {
            reviewIncorrectBtn.addEventListener('click', () => this.markReviewIncorrect());
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
        
        // Close dialog on background click
        const flashcardDialog = document.getElementById('flashcardDialog');
        if (flashcardDialog) {
            flashcardDialog.addEventListener('click', (e) => {
                if (e.target === flashcardDialog) {
                    this.closeFlashcardDialog();
                }
            });
        }
        
        // Card flip events
        this.bindCardFlipEvents();
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
        const generationSection = document.getElementById('flashcardGenerationSection');
        const studySection = document.getElementById('flashcardStudySection');
        const resultsSection = document.getElementById('flashcardResultsSection');
        const reviewSection = document.getElementById('flashcardReviewSection');
        
        if (generationSection) generationSection.style.display = 'none';
        if (studySection) studySection.style.display = 'block';
        if (resultsSection) resultsSection.style.display = 'none';
        if (reviewSection) reviewSection.style.display = 'none';
    }
    
    showResultsSection() {
        const generationSection = document.getElementById('flashcardGenerationSection');
        const studySection = document.getElementById('flashcardStudySection');
        const resultsSection = document.getElementById('flashcardResultsSection');
        const reviewSection = document.getElementById('flashcardReviewSection');
        
        if (generationSection) generationSection.style.display = 'none';
        if (studySection) studySection.style.display = 'none';
        if (resultsSection) resultsSection.style.display = 'block';
        if (reviewSection) reviewSection.style.display = 'none';
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
        
        const prompt = `Generate ${cardCount} flashcards based on the following PDF text content. 

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
                        temperature: 0.7,
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
            currentCard.classList.toggle('flipped');
            this.flashcardState.isFlipped = !this.flashcardState.isFlipped;
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
            this.displayCurrentCard();
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
        this.showReviewSection();
        this.displayReviewCard();
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
            reviewCard.classList.toggle('flipped');
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
            this.displayReviewCard();
        }
    }
    
    newFlashcardSet() {
        this.showGenerationSection();
        this.flashcardState.flashcards = [];
        this.flashcardState.currentCardIndex = 0;
        this.flashcardState.correctCount = 0;
        this.flashcardState.incorrectCount = 0;
        this.flashcardState.incorrectCards = [];
        this.flashcardState.isFlipped = false;
        this.flashcardState.isReviewMode = false;
        this.flashcardState.reviewIndex = 0;
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
        
        // Initialize button states after a short delay
        setTimeout(() => {
            this.updateFormatButtons();
        }, 100);
    }
    
    bindNotesEvents() {
        const notesEditor = document.getElementById('notesEditor');
        const clearBtn = document.getElementById('clearNotesBtn');
        const exportBtn = document.getElementById('exportNotesBtn');
        const boldBtn = document.getElementById('boldBtn');
        const italicBtn = document.getElementById('italicBtn');
        const underlineBtn = document.getElementById('underlineBtn');
        const strikethroughBtn = document.getElementById('strikethroughBtn');
        const bulletListBtn = document.getElementById('bulletListBtn');
        const numberListBtn = document.getElementById('numberListBtn');
        const indentBtn = document.getElementById('indentBtn');
        const outdentBtn = document.getElementById('outdentBtn');
        const alignLeftBtn = document.getElementById('alignLeftBtn');
        const alignCenterBtn = document.getElementById('alignCenterBtn');
        const alignRightBtn = document.getElementById('alignRightBtn');
        const fontSize = document.getElementById('fontSize');
        const fontFamily = document.getElementById('fontFamily');
        const textColor = document.getElementById('textColor');
        const highlightColor = document.getElementById('highlightColor');
        
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
        
        // Format buttons
        if (boldBtn) {
            boldBtn.addEventListener('click', () => this.toggleFormat('bold'));
        }
        
        if (italicBtn) {
            italicBtn.addEventListener('click', () => this.toggleFormat('italic'));
        }
        
        if (underlineBtn) {
            underlineBtn.addEventListener('click', () => this.toggleFormat('underline'));
        }
        
        if (strikethroughBtn) {
            strikethroughBtn.addEventListener('click', () => this.toggleFormat('strikeThrough'));
        }
        
        // List buttons
        if (bulletListBtn) {
            bulletListBtn.addEventListener('click', () => this.toggleFormat('insertUnorderedList'));
        }
        
        if (numberListBtn) {
            numberListBtn.addEventListener('click', () => this.toggleFormat('insertOrderedList'));
        }
        
        if (indentBtn) {
            indentBtn.addEventListener('click', () => document.execCommand('indent', false, null));
        }
        
        if (outdentBtn) {
            outdentBtn.addEventListener('click', () => document.execCommand('outdent', false, null));
        }
        
        // Alignment buttons
        if (alignLeftBtn) {
            alignLeftBtn.addEventListener('click', () => this.toggleFormat('justifyLeft'));
        }
        
        if (alignCenterBtn) {
            alignCenterBtn.addEventListener('click', () => this.toggleFormat('justifyCenter'));
        }
        
        if (alignRightBtn) {
            alignRightBtn.addEventListener('click', () => this.toggleFormat('justifyRight'));
        }
        
        // Font controls
        if (fontSize) {
            fontSize.addEventListener('change', (e) => {
                const size = e.target.value + 'px';
                document.execCommand('styleWithCSS', false, true);
                document.execCommand('fontSize', false, '7');
                
                // Clean up the font size implementation
                setTimeout(() => {
                    const fontElements = document.querySelectorAll('#notesEditor font[size="7"]');
                    fontElements.forEach(el => {
                        el.removeAttribute('size');
                        el.style.fontSize = size;
                    });
                }, 10);
            });
        }
        
        if (fontFamily) {
            fontFamily.addEventListener('change', (e) => {
                document.execCommand('fontName', false, e.target.value);
            });
        }
        
        if (textColor) {
            textColor.addEventListener('change', (e) => {
                document.execCommand('foreColor', false, e.target.value);
            });
        }
        
        if (highlightColor) {
            highlightColor.addEventListener('change', (e) => {
                document.execCommand('backColor', false, e.target.value);
            });
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
