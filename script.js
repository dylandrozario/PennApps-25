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
        this.initializeCommentTool();
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
            
            // Load comments for this PDF
            this.loadComments();
            
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
        
        // Render text layer for text selection
        await this.renderTextLayer(page, viewport);
        
        // Ensure scrolling works
        this.setupScrolling();
        
        // Create comment overlay if it doesn't exist
        if (!this.commentState.selectionOverlay) {
            this.createCommentOverlay();
        }
        
        // Render highlights for current page
        this.renderHighlights();
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
        const checkboxToolBtn = document.getElementById('checkbox-tool-btn');
        const clearToolBtn = document.getElementById('clear-tool-btn');
        const saveFormBtn = document.getElementById('save-form-btn');
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
        
        if (checkboxToolBtn) {
            checkboxToolBtn.addEventListener('click', () => this.setActiveTool('checkbox'));
        }
        
        if (clearToolBtn) {
            clearToolBtn.addEventListener('click', () => this.clearAllFormElements());
        }
        
        if (saveFormBtn) {
            saveFormBtn.addEventListener('click', () => this.saveFilledPDF());
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
        } else if (this.formState.currentTool === 'checkbox') {
            this.addCheckboxElement(e);
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
    
    addCheckboxElement(e) {
        const rect = this.formState.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        const checkbox = document.createElement('div');
        checkbox.className = 'form-checkbox';
        checkbox.style.left = x + 'px';
        checkbox.style.top = y + 'px';
        
        checkbox.addEventListener('click', () => {
            checkbox.classList.toggle('checked');
        });
        
        this.formState.overlay.appendChild(checkbox);
        
        // Add to form elements
        this.formState.formElements.push({
            type: 'checkbox',
            x: x,
            y: y,
            element: checkbox,
            checked: false
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
    
    async saveFilledPDF() {
        try {
            // Create a new PDF with form elements
            const filledPDF = await this.generateFilledPDF();
            
            // Save to localStorage or send to server
            localStorage.setItem('filledPDF_' + Date.now(), JSON.stringify({
                originalFile: this.files[0].name,
                formElements: this.formState.formElements.map(el => ({
                    type: el.type,
                    x: el.x,
                    y: el.y,
                    properties: el.properties,
                    checked: el.checked,
                    content: el.element ? el.element.value || el.element.textContent : ''
                })),
                timestamp: new Date().toISOString()
            }));
            
            alert('Form saved successfully!');
        } catch (error) {
            console.error('Error saving form:', error);
            alert('Error saving form. Please try again.');
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
    
    // Comment Tool Methods
    initializeCommentTool() {
        // Initialize comment functionality
        this.initializeCommentFunctionality();
    }
    
    initializeCommentFunctionality() {
        // Comment state
        this.commentState = {
            comments: [],
            selectionOverlay: null,
            contextMenu: null,
            selectedText: '',
            currentSelection: null,
            isSidebarOpen: false
        };
        
        // Bind comment events
        this.bindCommentEvents();
    }
    
    bindCommentEvents() {
        // Initialize context menu
        this.initializeContextMenu();
        
        // Bind sidebar events
        const toggleSidebarBtn = document.getElementById('toggle-comment-sidebar');
        if (toggleSidebarBtn) {
            toggleSidebarBtn.addEventListener('click', () => this.toggleCommentSidebar());
        }
        
        // Create overlay immediately when PDF loads
        this.createCommentOverlay();
    }
    
    createCommentOverlay() {
        const pdfContainer = document.querySelector('.pdf-container-fullscreen');
        if (!pdfContainer) {
            console.error('PDF container not found');
            return;
        }
        
        // Remove existing overlay if it exists
        const existingOverlay = document.getElementById('commentOverlay');
        if (existingOverlay) {
            existingOverlay.remove();
        }
        
        // Create new overlay
        const overlay = document.createElement('div');
        overlay.id = 'commentOverlay';
        overlay.className = 'comment-overlay';
        overlay.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            pointer-events: none;
            z-index: 100;
            background: transparent;
        `;
        
        pdfContainer.appendChild(overlay);
        this.commentState.selectionOverlay = overlay;
        
        // Bind events only to the PDF container for right-click
        pdfContainer.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            
            // Check if text is selected
            const selection = window.getSelection();
            const selectedText = selection.toString().trim();
            
            if (selectedText) {
                this.commentState.selectedText = selectedText;
                this.commentState.currentSelection = selection;
                this.showContextMenu(e);
            } else {
                // If no text selected, try to enable text selection
                this.enableTextSelection();
            }
        });
        
        // Add click handler to enable text selection
        pdfContainer.addEventListener('click', (e) => {
            // Enable text selection on PDF canvas
            this.enableTextSelection();
        });
        
        console.log('Comment overlay created');
    }
    
    enableTextSelection() {
        // Enable text selection on the PDF canvas
        const canvas = this.pdfCanvas;
        if (canvas) {
            canvas.style.userSelect = 'text';
            canvas.style.webkitUserSelect = 'text';
            canvas.style.mozUserSelect = 'text';
            canvas.style.msUserSelect = 'text';
        }
    }
    
    async renderTextLayer(page, viewport) {
        const textLayerDiv = document.getElementById('textLayer');
        
        if (!textLayerDiv) {
            // Create text layer if it doesn't exist
            const textLayer = document.createElement('div');
            textLayer.id = 'textLayer';
            textLayer.className = 'textLayer';
            textLayer.style.cssText = `
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                pointer-events: auto;
                user-select: text;
                z-index: 10;
            `;
            
            const pdfContainer = document.querySelector('.pdf-container-fullscreen');
            if (pdfContainer) {
                pdfContainer.appendChild(textLayer);
            }
        }
        
        // Get text content from the page
        const textContent = await page.getTextContent();
        const textLayer = document.getElementById('textLayer');
        
        if (textLayer) {
            // Clear existing text
            textLayer.innerHTML = '';
            
            // Create text items
            const textItems = textContent.items;
            for (let i = 0; i < textItems.length; i++) {
                const textItem = textItems[i];
                const textDiv = document.createElement('div');
                
                // Transform text coordinates to match the viewport
                const transform = viewport.transform;
                const tx = transform[4];
                const ty = transform[5];
                const scaleX = transform[0];
                const scaleY = transform[3];
                
                textDiv.style.cssText = `
                    position: absolute;
                    left: ${textItem.transform[4]}px;
                    top: ${textItem.transform[5]}px;
                    font-size: ${textItem.transform[0]}px;
                    font-family: ${textItem.fontName || 'sans-serif'};
                    color: transparent;
                    user-select: text;
                    pointer-events: auto;
                    white-space: pre;
                `;
                
                textDiv.textContent = textItem.str;
                textLayer.appendChild(textDiv);
            }
        }
    }
    
    toggleCommentSidebar() {
        const sidebar = document.getElementById('commentSidebar');
        if (!sidebar) return;
        
        if (this.commentState.isSidebarOpen) {
            this.closeCommentSidebar();
        } else {
            this.openCommentSidebar();
        }
    }
    
    openCommentSidebar() {
        const sidebar = document.getElementById('commentSidebar');
        if (sidebar) {
            sidebar.style.display = 'flex';
            this.commentState.isSidebarOpen = true;
            this.renderComments();
            
            // Update toggle button text
            const toggleBtn = document.getElementById('toggle-comment-sidebar');
            if (toggleBtn) {
                toggleBtn.textContent = 'Hide';
            }
        }
    }
    
    closeCommentSidebar() {
        const sidebar = document.getElementById('commentSidebar');
        if (sidebar) {
            sidebar.style.display = 'none';
            this.commentState.isSidebarOpen = false;
            
            // Update toggle button text
            const toggleBtn = document.getElementById('toggle-comment-sidebar');
            if (toggleBtn) {
                toggleBtn.textContent = 'Show';
            }
        }
    }
    
    initializeContextMenu() {
        const contextMenu = document.getElementById('commentContextMenu');
        this.commentState.contextMenu = contextMenu;
        
        // Bind context menu events
        const addCommentContext = document.getElementById('addCommentContext');
        const copyTextContext = document.getElementById('copyTextContext');
        
        if (addCommentContext) {
            addCommentContext.addEventListener('click', () => {
                this.hideContextMenu();
                if (this.commentState.selectedText) {
                    this.showCommentModalForSelection();
                }
            });
        }
        
        if (copyTextContext) {
            copyTextContext.addEventListener('click', () => {
                this.hideContextMenu();
                this.copySelectedText();
            });
        }
        
        // Hide context menu when clicking elsewhere
        document.addEventListener('click', () => this.hideContextMenu());
        document.addEventListener('contextmenu', (e) => {
            // Only show context menu on PDF canvas
            if (!e.target.closest('#pdfCanvas') && !e.target.closest('.text-selection-overlay')) {
                this.hideContextMenu();
            }
        });
    }
    
    showContextMenu(e) {
        e.preventDefault();
        
        const contextMenu = this.commentState.contextMenu;
        if (!contextMenu) return;
        
        // Get selected text
        const selection = window.getSelection();
        const selectedText = selection.toString().trim();
        
        if (!selectedText) {
            this.hideContextMenu();
            return;
        }
        
        this.commentState.selectedText = selectedText;
        this.commentState.currentSelection = selection;
        
        // Position context menu
        contextMenu.style.left = e.pageX + 'px';
        contextMenu.style.top = e.pageY + 'px';
        contextMenu.style.display = 'block';
        
        console.log('Context menu shown for text:', selectedText);
    }
    
    hideContextMenu() {
        const contextMenu = this.commentState.contextMenu;
        if (contextMenu) {
            contextMenu.style.display = 'none';
        }
    }
    
    copySelectedText() {
        const selection = window.getSelection();
        const selectedText = selection.toString().trim();
        
        if (selectedText) {
            navigator.clipboard.writeText(selectedText).then(() => {
                // Show temporary feedback
                this.showTemporaryMessage('Text copied to clipboard!');
            }).catch(() => {
                // Fallback for older browsers
                const textArea = document.createElement('textarea');
                textArea.value = selectedText;
                document.body.appendChild(textArea);
                textArea.select();
                document.execCommand('copy');
                document.body.removeChild(textArea);
                this.showTemporaryMessage('Text copied to clipboard!');
            });
        }
    }
    
    showTemporaryMessage(message) {
        const messageDiv = document.createElement('div');
        messageDiv.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #ffc107;
            color: #000;
            padding: 1rem 1.5rem;
            border: 2px solid #000;
            border-radius: 8px;
            font-weight: 600;
            z-index: 4000;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
        `;
        messageDiv.textContent = message;
        
        document.body.appendChild(messageDiv);
        
        setTimeout(() => {
            document.body.removeChild(messageDiv);
        }, 2000);
    }
    
    showCommentModalForSelection() {
        const selectedText = this.commentState.selectedText;
        const selection = this.commentState.currentSelection;
        
        if (!selectedText || !selection) return;
        
        // Get selection bounds
        const range = selection.getRangeAt(0);
        const rect = range.getBoundingClientRect();
        const pdfContainer = document.querySelector('.pdf-container-fullscreen');
        const containerRect = pdfContainer.getBoundingClientRect();
        
        const position = {
            left: rect.left - containerRect.left,
            top: rect.top - containerRect.top,
            width: rect.width,
            height: rect.height
        };
        
        // Create modal
        const modal = document.createElement('div');
        modal.className = 'comment-modal';
        modal.id = 'commentModal';
        
        modal.innerHTML = `
            <div class="comment-modal-content">
                <div class="comment-modal-header">
                    <h3>💬 Add Comment</h3>
                    <button class="comment-modal-close">&times;</button>
                </div>
                <div class="comment-modal-body">
                    <div class="comment-highlighted-text-preview">
                        "${selectedText.substring(0, 100)}${selectedText.length > 100 ? '...' : ''}"
                    </div>
                    <textarea class="comment-textarea" placeholder="Enter your comment about the selected text..." id="commentText"></textarea>
                </div>
                <div class="comment-modal-actions">
                    <button class="comment-modal-btn cancel">Cancel</button>
                    <button class="comment-modal-btn save">Add Comment</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Bind modal events
        const closeBtn = modal.querySelector('.comment-modal-close');
        const cancelBtn = modal.querySelector('.cancel');
        const saveBtn = modal.querySelector('.save');
        const textarea = modal.querySelector('#commentText');
        
        const closeModal = () => {
            modal.remove();
            this.hideContextMenu();
        };
        
        closeBtn.addEventListener('click', closeModal);
        cancelBtn.addEventListener('click', closeModal);
        
        saveBtn.addEventListener('click', () => {
            const text = textarea.value.trim();
            if (text) {
                this.addComment(text, position, selectedText);
                closeModal();
            } else {
                alert('Please enter a comment.');
            }
        });
        
        // Focus textarea
        textarea.focus();
        
        // Close on background click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeModal();
            }
        });
    }
    
    addComment(text, position, selectedText) {
        const comment = {
            id: Date.now(),
            text: text,
            position: position,
            page: this.currentPage,
            timestamp: new Date().toISOString(),
            highlightedText: selectedText
        };
        
        console.log('Adding comment:', comment);
        
        // Add to comments array
        this.commentState.comments.push(comment);
        
        // Create yellow comment box
        this.createCommentBox(comment);
        
        // Auto-show sidebar when comment is added
        if (!this.commentState.isSidebarOpen) {
            this.openCommentSidebar();
        }
        
        // Render sidebar comments
        this.renderComments();
        
        // Save to localStorage
        this.saveComments();
        
        console.log('Comment added successfully. Total comments:', this.commentState.comments.length);
    }
    
    createCommentBox(comment) {
        const overlay = this.commentState.selectionOverlay;
        if (!overlay) {
            console.error('No overlay found when creating comment box');
            return;
        }
        
        // Create comment box
        const commentBox = document.createElement('div');
        commentBox.className = 'comment-box';
        commentBox.dataset.commentId = comment.id;
        
        // Position and size the box based on selection
        const boxLeft = comment.position.left;
        const boxTop = comment.position.top;
        const boxWidth = Math.max(comment.position.width, 60);
        const boxHeight = Math.max(comment.position.height, 30);
        
        commentBox.style.cssText = `
            position: absolute;
            left: ${boxLeft}px;
            top: ${boxTop}px;
            width: ${boxWidth}px;
            height: ${boxHeight}px;
            pointer-events: auto;
            z-index: 200;
        `;
        
        // Create hover content
        const content = document.createElement('div');
        content.className = 'comment-box-content';
        content.innerHTML = `
            <div style="font-weight: 600; margin-bottom: 0.5rem; color: #333;">
                💬 Comment
            </div>
            <div style="margin-bottom: 0.5rem; color: #555;">
                ${comment.text}
            </div>
            <div style="font-size: 0.8rem; color: #888;">
                ${new Date(comment.timestamp).toLocaleString()}
            </div>
        `;
        
        commentBox.appendChild(content);
        
        // Make box draggable and resizable
        this.makeBoxDraggable(commentBox);
        
        console.log('Creating comment box at:', boxLeft, boxTop, 'size:', boxWidth, 'x', boxHeight, 'for comment:', comment.id);
        
        // Add to overlay
        overlay.appendChild(commentBox);
        
        console.log('Comment box created and added to overlay');
    }
    
    makeBoxDraggable(box) {
        let isDragging = false;
        let isResizing = false;
        let startX, startY, startWidth, startHeight, startLeft, startTop;
        
        // Mouse down
        box.addEventListener('mousedown', (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            const rect = box.getBoundingClientRect();
            const overlay = this.commentState.selectionOverlay;
            const overlayRect = overlay.getBoundingClientRect();
            
            // Check if clicking on resize handle (bottom-right corner)
            const isResizeHandle = e.offsetX > rect.width - 10 && e.offsetY > rect.height - 10;
            
            if (isResizeHandle) {
                isResizing = true;
                startX = e.clientX;
                startY = e.clientY;
                startWidth = rect.width;
                startHeight = rect.height;
            } else {
                isDragging = true;
                startX = e.clientX;
                startY = e.clientY;
                startLeft = rect.left - overlayRect.left;
                startTop = rect.top - overlayRect.top;
            }
        });
        
        // Mouse move
        document.addEventListener('mousemove', (e) => {
            if (!isDragging && !isResizing) return;
            
            e.preventDefault();
            
            if (isDragging) {
                const overlay = this.commentState.selectionOverlay;
                const overlayRect = overlay.getBoundingClientRect();
                
                const newLeft = startLeft + (e.clientX - startX);
                const newTop = startTop + (e.clientY - startY);
                
                box.style.left = newLeft + 'px';
                box.style.top = newTop + 'px';
            } else if (isResizing) {
                const newWidth = Math.max(20, startWidth + (e.clientX - startX));
                const newHeight = Math.max(20, startHeight + (e.clientY - startY));
                
                box.style.width = newWidth + 'px';
                box.style.height = newHeight + 'px';
            }
        });
        
        // Mouse up
        document.addEventListener('mouseup', () => {
            if (isDragging || isResizing) {
                isDragging = false;
                isResizing = false;
                
                // Update comment position in array
                const commentId = parseInt(box.dataset.commentId);
                const comment = this.commentState.comments.find(c => c.id === commentId);
                if (comment) {
                    comment.position = {
                        left: parseInt(box.style.left),
                        top: parseInt(box.style.top),
                        width: parseInt(box.style.width),
                        height: parseInt(box.style.height)
                    };
                    this.saveComments();
                }
            }
        });
    }
    
    renderComments() {
        const commentList = document.getElementById('commentList');
        if (!commentList) return;
        
        if (this.commentState.comments.length === 0) {
            commentList.innerHTML = `
                <div class="no-comments">
                    <p>No comments yet. Select text and right-click to add comments.</p>
                </div>
            `;
            return;
        }
        
        commentList.innerHTML = '';
        
        this.commentState.comments.forEach(comment => {
            const commentElement = this.createCommentElement(comment);
            commentList.appendChild(commentElement);
        });
    }
    
    createCommentElement(comment) {
        const div = document.createElement('div');
        div.className = 'comment-item';
        div.dataset.commentId = comment.id;
        
        const date = new Date(comment.timestamp).toLocaleDateString();
        const time = new Date(comment.timestamp).toLocaleTimeString();
        
        div.innerHTML = `
            <div class="comment-highlighted-text">${comment.highlightedText.substring(0, 50)}${comment.highlightedText.length > 50 ? '...' : ''}</div>
            <div class="comment-content">${comment.text}</div>
            <div class="comment-meta">
                <span>Page ${comment.page} • ${date} at ${time}</span>
                <div class="comment-actions">
                    <button class="view-btn" data-comment-id="${comment.id}">View</button>
                    <button class="delete-btn" data-comment-id="${comment.id}">Delete</button>
                </div>
            </div>
        `;
        
        // Bind actions
        const viewBtn = div.querySelector('.view-btn');
        const deleteBtn = div.querySelector('.delete-btn');
        
        viewBtn.addEventListener('click', () => {
            this.highlightComment(comment.id);
            this.scrollToPage(comment.page);
        });
        
        deleteBtn.addEventListener('click', () => {
            if (confirm('Are you sure you want to delete this comment?')) {
                this.deleteComment(comment.id);
            }
        });
        
        return div;
    }
    
    highlightComment(commentId) {
        // Remove existing highlights
        document.querySelectorAll('.comment-item.highlighted').forEach(item => {
            item.classList.remove('highlighted');
        });
        
        // Highlight the comment in sidebar
        const commentElement = document.querySelector(`[data-comment-id="${commentId}"]`);
        if (commentElement) {
            commentElement.classList.add('highlighted');
            commentElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
        
        // Highlight the corresponding box on PDF
        const commentBox = document.querySelector(`.comment-box[data-comment-id="${commentId}"]`);
        if (commentBox) {
            commentBox.style.background = 'rgba(255, 193, 7, 0.7)';
            commentBox.style.borderColor = '#ffca2c';
            commentBox.style.boxShadow = '0 0 10px rgba(255, 193, 7, 0.5)';
        }
    }
    
    scrollToPage(pageNumber) {
        if (pageNumber !== this.currentPage) {
            this.currentPage = pageNumber;
            this.renderPage();
            this.updatePageControls();
        }
    }
    
    createCommentPopup(comment) {
        const popup = document.createElement('div');
        popup.className = 'comment-popup';
        
        const date = new Date(comment.timestamp).toLocaleDateString();
        const time = new Date(comment.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
        
        popup.innerHTML = `
            <div class="comment-popup-header">
                <div class="comment-popup-author">You</div>
                <div class="comment-popup-time">${date} ${time}</div>
                <button class="comment-popup-close">&times;</button>
            </div>
            <div class="comment-popup-content">
                <div class="comment-popup-text">${comment.text}</div>
                <div class="comment-popup-actions">
                    <button class="comment-popup-btn edit" data-comment-id="${comment.id}">Edit</button>
                    <button class="comment-popup-btn delete" data-comment-id="${comment.id}">Delete</button>
                </div>
            </div>
        `;
        
        // Bind popup events
        const closeBtn = popup.querySelector('.comment-popup-close');
        const editBtn = popup.querySelector('.edit');
        const deleteBtn = popup.querySelector('.delete');
        
        closeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.hideCommentPopup(popup.parentElement);
        });
        
        editBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.editInlineComment(comment.id);
            this.hideCommentPopup(popup.parentElement);
        });
        
        deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (confirm('Are you sure you want to delete this comment?')) {
                this.deleteComment(comment.id);
            }
        });
        
        return popup;
    }
    
    showCommentPopup(commentIcon) {
        const popup = commentIcon.querySelector('.comment-popup');
        if (popup) {
            popup.classList.add('show');
        }
    }
    
    hideCommentPopup(commentIcon) {
        const popup = commentIcon.querySelector('.comment-popup');
        if (popup) {
            popup.classList.remove('show');
        }
    }
    
    toggleCommentPopup(commentIcon) {
        const popup = commentIcon.querySelector('.comment-popup');
        if (popup) {
            if (popup.classList.contains('show')) {
                this.hideCommentPopup(commentIcon);
            } else {
                this.showCommentPopup(commentIcon);
            }
        }
    }
    
    editInlineComment(commentId) {
        const comment = this.commentState.comments.find(c => c.id === commentId);
        if (!comment) return;
        
        const newText = prompt('Edit comment:', comment.text);
        if (newText !== null && newText.trim() !== '') {
            comment.text = newText.trim();
            
            // Update the popup display
            const commentIcon = document.querySelector(`.comment-icon[data-comment-id="${commentId}"]`);
            if (commentIcon) {
                const popup = commentIcon.querySelector('.comment-popup');
                if (popup) {
                    const commentText = popup.querySelector('.comment-popup-text');
                    if (commentText) {
                        commentText.textContent = comment.text;
                    }
                }
            }
            
            
            // Save changes
            this.saveComments();
        }
    }
    
    bindTextSelectionEvents() {
        // Create selection overlay
        const pdfContainer = document.querySelector('.pdf-container-fullscreen');
        if (pdfContainer) {
            const overlay = document.createElement('div');
            overlay.className = 'text-selection-overlay';
            overlay.id = 'textSelectionOverlay';
            overlay.style.pointerEvents = 'auto';
            overlay.style.position = 'absolute';
            overlay.style.top = '0';
            overlay.style.left = '0';
            overlay.style.width = '100%';
            overlay.style.height = '100%';
            overlay.style.zIndex = '100';
            
            pdfContainer.appendChild(overlay);
            
            this.commentState.selectionOverlay = overlay;
            
            // Bind selection events to the overlay (always active)
            overlay.addEventListener('mousedown', (e) => this.handleSelectionStart(e));
            overlay.addEventListener('mousemove', (e) => this.handleSelectionMove(e));
            overlay.addEventListener('mouseup', (e) => this.handleSelectionEnd(e));
            overlay.addEventListener('contextmenu', (e) => this.showContextMenu(e));
            
            // Make overlay always active for text selection
            overlay.classList.add('active');
        }
    }
    
    
    handleSelectionStart(e) {
        const rect = e.currentTarget.getBoundingClientRect();
        this.commentState.selectionStart = {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        };
        
        this.commentState.isSelecting = true;
        e.preventDefault();
    }
    
    handleSelectionMove(e) {
        if (!this.commentState.isSelecting) return;
        
        const rect = e.currentTarget.getBoundingClientRect();
        this.commentState.selectionEnd = {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        };
        
        this.updateSelectionHighlight();
    }
    
    handleSelectionEnd(e) {
        if (!this.commentState.isSelecting) return;
        
        this.commentState.isSelecting = false;
        
        // Check if selection is large enough
        const start = this.commentState.selectionStart;
        const end = this.commentState.selectionEnd;
        
        if (start && end && this.getSelectionArea(start, end) > 100) {
            this.showCommentModal();
        } else {
            this.clearSelection();
        }
    }
    
    updateSelectionHighlight() {
        const start = this.commentState.selectionStart;
        const end = this.commentState.selectionEnd;
        
        if (!start || !end) return;
        
        const overlay = this.commentState.selectionOverlay;
        if (!overlay) return;
        
        // Clear existing highlights
        overlay.innerHTML = '';
        
        const left = Math.min(start.x, end.x);
        const top = Math.min(start.y, end.y);
        const width = Math.abs(end.x - start.x);
        const height = Math.abs(end.y - start.y);
        
        if (width > 5 && height > 5) {
            const highlight = document.createElement('div');
            highlight.className = 'selection-highlight';
            highlight.style.left = left + 'px';
            highlight.style.top = top + 'px';
            highlight.style.width = width + 'px';
            highlight.style.height = height + 'px';
            
            overlay.appendChild(highlight);
        }
    }
    
    getSelectionArea(start, end) {
        const width = Math.abs(end.x - start.x);
        const height = Math.abs(end.y - start.y);
        return width * height;
    }
    
    clearSelection() {
        const overlay = this.commentState.selectionOverlay;
        if (overlay) {
            overlay.innerHTML = '';
        }
        this.commentState.selectionStart = null;
        this.commentState.selectionEnd = null;
    }
    
    showCommentModal() {
        // Create modal
        const modal = document.createElement('div');
        modal.className = 'comment-modal';
        modal.id = 'commentModal';
        
        const start = this.commentState.selectionStart;
        const end = this.commentState.selectionEnd;
        const left = Math.min(start.x, end.x);
        const top = Math.min(start.y, end.y);
        const width = Math.abs(end.x - start.x);
        const height = Math.abs(end.y - start.y);
        
        modal.innerHTML = `
            <div class="comment-modal-content">
                <div class="comment-modal-header">
                    <h3>💬 Add Comment</h3>
                    <button class="comment-modal-close">&times;</button>
                </div>
                <div class="comment-modal-body">
                    <div class="comment-highlighted-text-preview">
                        Selected area: ${Math.round(width)} × ${Math.round(height)} pixels
                    </div>
                    <textarea class="comment-textarea" placeholder="Enter your comment about the selected text..." id="commentText"></textarea>
                </div>
                <div class="comment-modal-actions">
                    <button class="comment-modal-btn cancel">Cancel</button>
                    <button class="comment-modal-btn save">Add Comment</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Bind modal events
        const closeBtn = modal.querySelector('.comment-modal-close');
        const cancelBtn = modal.querySelector('.cancel');
        const saveBtn = modal.querySelector('.save');
        const textarea = modal.querySelector('#commentText');
        
        const closeModal = () => {
            modal.remove();
            this.clearSelection();
        };
        
        closeBtn.addEventListener('click', closeModal);
        cancelBtn.addEventListener('click', closeModal);
        
        saveBtn.addEventListener('click', () => {
            const text = textarea.value.trim();
            if (text) {
                this.addComment(text, { left, top, width, height });
                closeModal();
            } else {
                alert('Please enter a comment.');
            }
        });
        
        // Focus textarea
        textarea.focus();
        
        // Close on background click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeModal();
            }
        });
    }
    
    addComment(text, position) {
        const comment = {
            id: Date.now(),
            text: text,
            position: position,
            page: this.currentPage,
            timestamp: new Date().toISOString(),
            highlightedText: 'Selected text area'
        };
        
        this.commentState.comments.push(comment);
        this.createHighlight(position);
        
        // Save to localStorage
        this.saveComments();
    }
    
    createHighlight(position) {
        const overlay = this.commentState.selectionOverlay;
        if (!overlay) return;
        
        const highlight = document.createElement('div');
        highlight.className = 'selection-highlight';
        highlight.style.left = position.left + 'px';
        highlight.style.top = position.top + 'px';
        highlight.style.width = position.width + 'px';
        highlight.style.height = position.height + 'px';
        highlight.dataset.commentId = this.commentState.comments[this.commentState.comments.length - 1].id;
        
        // Add click handler to highlight
        highlight.addEventListener('click', (e) => {
            const commentId = parseInt(e.target.dataset.commentId);
            this.highlightComment(commentId);
        });
        
        overlay.appendChild(highlight);
        this.commentState.highlights.push(highlight);
    }
    
    
    
    scrollToPage(pageNumber) {
        if (pageNumber !== this.currentPage) {
            this.currentPage = pageNumber;
            this.renderPage();
            this.updatePageControls();
        }
    }
    
    deleteComment(commentId) {
        console.log('Deleting comment:', commentId);
        
        // Remove from comments array
        const originalLength = this.commentState.comments.length;
        this.commentState.comments = this.commentState.comments.filter(c => c.id !== commentId);
        console.log('Comments array length changed from', originalLength, 'to', this.commentState.comments.length);
        
        // Remove comment box
        const commentBox = document.querySelector(`.comment-box[data-comment-id="${commentId}"]`);
        if (commentBox) {
            commentBox.remove();
            console.log('Removed comment box for comment:', commentId);
        }
        
        // Re-render sidebar
        this.renderComments();
        
        // Save to localStorage
        this.saveComments();
        console.log('Comments saved after deletion');
    }
    
    saveComments() {
        try {
            localStorage.setItem('pdfComments_' + this.files[0]?.name, JSON.stringify(this.commentState.comments));
        } catch (error) {
            console.error('Error saving comments:', error);
        }
    }
    
    loadComments() {
        try {
            const saved = localStorage.getItem('pdfComments_' + this.files[0]?.name);
            console.log('Loading comments for file:', this.files[0]?.name);
            if (saved) {
                this.commentState.comments = JSON.parse(saved);
                console.log('Loaded comments:', this.commentState.comments);
                
                // Auto-show sidebar if there are comments
                if (this.commentState.comments.length > 0 && !this.commentState.isSidebarOpen) {
                    this.openCommentSidebar();
                }
            } else {
                console.log('No saved comments found');
                this.commentState.comments = [];
            }
        } catch (error) {
            console.error('Error loading comments:', error);
            this.commentState.comments = [];
        }
    }
    
    renderHighlights() {
        const overlay = this.commentState.selectionOverlay;
        if (!overlay) {
            console.error('No overlay found in renderHighlights');
            return;
        }
        
        console.log('Rendering comment boxes for page:', this.currentPage, 'comments:', this.commentState.comments.length);
        overlay.innerHTML = '';
        
        this.commentState.comments.forEach(comment => {
            if (comment.page === this.currentPage) {
                console.log('Creating comment box for comment:', comment.id);
                this.createCommentBox(comment);
            }
        });
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
