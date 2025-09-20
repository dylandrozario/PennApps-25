/**
 * AI Note-Taking Button Component
 * A compact button that opens a modal for text simplification
 */

class NoteTakingButton {
    constructor(options = {}) {
        this.options = {
            buttonText: options.buttonText || '📝 Simplify Text',
            buttonClass: options.buttonClass || 'note-taking-btn',
            apiKey: options.apiKey || null,
            model: options.model || 'gemini-1.5-flash',
            maxSummaryLength: options.maxSummaryLength || 200,
            minSummaryLength: options.minSummaryLength || 100,
            summaryRatio: options.summaryRatio || 0.3,
            ...options
        };
        
        this.isOpen = false;
        this.init();
    }

    init() {
        this.createButton();
        this.createModal();
        this.bindEvents();
    }

    createButton() {
        this.button = document.createElement('button');
        this.button.className = this.options.buttonClass;
        this.button.innerHTML = this.options.buttonText;
        this.button.type = 'button';
    }

    createModal() {
        // Create modal overlay
        this.modal = document.createElement('div');
        this.modal.className = 'note-taking-modal';
        this.modal.style.display = 'none';
        
        this.modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>📝 AI Note-Taking Assistant</h3>
                    <div class="modal-controls">
                        <div class="api-status" id="api-status">
                            <span class="status-indicator" id="status-indicator"></span>
                            <span id="status-text">Local Mode</span>
                        </div>
                        <button class="close-btn" id="close-btn">&times;</button>
                    </div>
                </div>
                
                <div class="modal-body">
                    <div class="input-section">
                        <label for="text-input">Enter text to simplify for notes:</label>
                        <textarea 
                            id="text-input" 
                            placeholder="Paste your text here..."
                            rows="6"
                        ></textarea>
                        <div class="input-info">
                            <span id="word-count">0 words</span>
                            <div class="length-controls">
                                <label for="summary-length">Length:</label>
                                <select id="summary-length">
                                    <option value="short">Short (50-100 words)</option>
                                    <option value="medium" selected>Medium (100-200 words)</option>
                                    <option value="long">Long (200-300 words)</option>
                                </select>
                            </div>
                            <button id="simplify-btn" class="simplify-btn">Simplify for Notes</button>
                        </div>
                    </div>
                    
                    <div class="output-section" id="output-section" style="display: none;">
                        <label>Simplified Notes:</label>
                        <div class="notes-output" id="notes-output"></div>
                        <div class="output-info">
                            <span id="notes-stats"></span>
                            <button id="copy-notes" class="copy-btn">Copy Notes</button>
                        </div>
                    </div>
                    
                    <div class="loading" id="loading" style="display: none;">
                        <div class="spinner"></div>
                        <span>Simplifying for notes...</span>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(this.modal);
    }

    bindEvents() {
        // Button click to open modal
        this.button.addEventListener('click', () => this.openModal());
        
        // Modal events
        const closeBtn = this.modal.querySelector('#close-btn');
        const textInput = this.modal.querySelector('#text-input');
        const simplifyBtn = this.modal.querySelector('#simplify-btn');
        const copyBtn = this.modal.querySelector('#copy-notes');
        const lengthSelect = this.modal.querySelector('#summary-length');

        closeBtn.addEventListener('click', () => this.closeModal());
        this.modal.addEventListener('click', (e) => {
            if (e.target === this.modal) this.closeModal();
        });
        
        textInput.addEventListener('input', () => this.updateWordCount());
        simplifyBtn.addEventListener('click', () => this.simplifyText());
        copyBtn.addEventListener('click', () => this.copyNotes());
        lengthSelect.addEventListener('change', () => this.updateSummaryLength());
        
        // Close on Escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isOpen) {
                this.closeModal();
            }
        });
        
        this.updateApiStatus();
    }

    openModal() {
        this.modal.style.display = 'flex';
        this.isOpen = true;
        document.body.style.overflow = 'hidden'; // Prevent background scrolling
    }

    closeModal() {
        this.modal.style.display = 'none';
        this.isOpen = false;
        document.body.style.overflow = 'auto'; // Restore scrolling
    }

    updateWordCount() {
        const textInput = this.modal.querySelector('#text-input');
        const wordCount = this.modal.querySelector('#word-count');
        const text = textInput.value.trim();
        const words = text ? text.split(/\s+/).length : 0;
        wordCount.textContent = `${words} words`;
    }

    updateSummaryLength() {
        const lengthSelect = this.modal.querySelector('#summary-length');
        const length = lengthSelect.value;
        
        switch(length) {
            case 'short':
                this.options.maxSummaryLength = 100;
                this.options.minSummaryLength = 50;
                this.options.summaryRatio = 0.2;
                break;
            case 'medium':
                this.options.maxSummaryLength = 200;
                this.options.minSummaryLength = 100;
                this.options.summaryRatio = 0.3;
                break;
            case 'long':
                this.options.maxSummaryLength = 300;
                this.options.minSummaryLength = 200;
                this.options.summaryRatio = 0.4;
                break;
        }
    }

    async simplifyText() {
        const textInput = this.modal.querySelector('#text-input');
        const text = textInput.value.trim();
        
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
        if (this.options.apiKey) {
            return await this.generateNotesWithGemini(text);
        } else {
            console.warn('No Gemini API key provided. Using local algorithm.');
            return await this.generateNotesLocal(text);
        }
    }

    async generateNotesWithGemini(text) {
        const words = text.split(/\s+/);
        const targetLength = Math.max(
            this.options.minSummaryLength,
            Math.min(this.options.maxSummaryLength, Math.floor(words.length * this.options.summaryRatio))
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
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${this.options.model}:generateContent?key=${this.options.apiKey}`, {
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
            console.log('Falling back to local algorithm...');
            return await this.generateNotesLocal(text);
        }
    }

    async generateNotesLocal(text) {
        // Simplified local algorithm for note-taking
        const sentences = text.split(/[.!?]+/).map(s => s.trim()).filter(s => s.length > 0);
        const words = text.split(/\s+/);
        
        const wordFreq = this.calculateWordFrequency(words);
        const sentenceScores = this.scoreSentences(sentences, wordFreq);
        
        const targetLength = Math.max(
            this.options.minSummaryLength,
            Math.min(this.options.maxSummaryLength, Math.floor(words.length * this.options.summaryRatio))
        );
        
        const selectedSentences = this.selectTopSentences(sentences, sentenceScores, targetLength);
        
        return selectedSentences.join(' ').trim();
    }

    calculateWordFrequency(words) {
        const freq = {};
        const stopWords = new Set([
            'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by',
            'is', 'are', 'was', 'were', 'be', 'been', 'have', 'has', 'had', 'do', 'does', 'did',
            'will', 'would', 'could', 'should', 'may', 'might', 'can', 'this', 'that', 'these', 'those'
        ]);
        
        words.forEach(word => {
            const cleanWord = word.toLowerCase().replace(/[^\w]/g, '');
            if (cleanWord.length > 2 && !stopWords.has(cleanWord)) {
                freq[cleanWord] = (freq[cleanWord] || 0) + 1;
            }
        });
        
        return freq;
    }

    scoreSentences(sentences, wordFreq) {
        return sentences.map((sentence, index) => {
            const words = sentence.toLowerCase().split(/\s+/);
            let score = 0;
            
            words.forEach(word => {
                const cleanWord = word.replace(/[^\w]/g, '');
                score += wordFreq[cleanWord] || 0;
            });
            
            if (index < sentences.length * 0.3) {
                score *= 1.2;
            }
            
            if (sentence.includes('however') || sentence.includes('therefore') || 
                sentence.includes('important') || sentence.includes('significant')) {
                score *= 1.3;
            }
            
            return score / words.length;
        });
    }

    selectTopSentences(sentences, scores, targetLength) {
        const sentenceData = sentences.map((sentence, index) => ({
            sentence,
            score: scores[index],
            wordCount: sentence.split(/\s+/).length
        }));
        
        sentenceData.sort((a, b) => b.score - a.score);
        
        const selected = [];
        let currentLength = 0;
        
        for (const data of sentenceData) {
            if (currentLength + data.wordCount <= targetLength) {
                selected.push(data.sentence);
                currentLength += data.wordCount;
            }
        }
        
        if (currentLength < this.options.minSummaryLength) {
            for (const data of sentenceData) {
                if (!selected.includes(data.sentence) && currentLength < this.options.maxSummaryLength) {
                    selected.push(data.sentence);
                    currentLength += data.wordCount;
                }
            }
        }
        
        return selected;
    }

    displayNotes(notes, originalText) {
        const outputSection = this.modal.querySelector('#output-section');
        const notesOutput = this.modal.querySelector('#notes-output');
        const notesStats = this.modal.querySelector('#notes-stats');
        
        notesOutput.textContent = notes;
        
        const originalWords = originalText.split(/\s+/).length;
        const notesWords = notes.split(/\s+/).length;
        const compressionRatio = ((originalWords - notesWords) / originalWords * 100).toFixed(1);
        
        notesStats.textContent = `${notesWords} words (${compressionRatio}% reduction)`;
        
        outputSection.style.display = 'block';
    }

    copyNotes() {
        const notesOutput = this.modal.querySelector('#notes-output');
        const text = notesOutput.textContent;
        
        navigator.clipboard.writeText(text).then(() => {
            const copyBtn = this.modal.querySelector('#copy-notes');
            const originalText = copyBtn.textContent;
            copyBtn.textContent = 'Copied!';
            setTimeout(() => {
                copyBtn.textContent = originalText;
            }, 2000);
        }).catch(err => {
            console.error('Failed to copy text: ', err);
            alert('Failed to copy notes to clipboard');
        });
    }

    showLoading() {
        const loading = this.modal.querySelector('#loading');
        const simplifyBtn = this.modal.querySelector('#simplify-btn');
        
        loading.style.display = 'flex';
        simplifyBtn.disabled = true;
        simplifyBtn.textContent = 'Simplifying...';
    }

    hideLoading() {
        const loading = this.modal.querySelector('#loading');
        const simplifyBtn = this.modal.querySelector('#simplify-btn');
        
        loading.style.display = 'none';
        simplifyBtn.disabled = false;
        simplifyBtn.textContent = 'Simplify for Notes';
    }

    updateApiStatus() {
        const statusIndicator = this.modal.querySelector('#status-indicator');
        const statusText = this.modal.querySelector('#status-text');
        
        if (this.options.apiKey) {
            statusIndicator.className = 'status-indicator gemini-active';
            statusText.textContent = 'Gemini AI';
        } else {
            statusIndicator.className = 'status-indicator local-mode';
            statusText.textContent = 'Local Mode';
        }
    }

    // Public methods
    setApiKey(apiKey) {
        this.options.apiKey = apiKey;
        this.updateApiStatus();
    }

    getButton() {
        return this.button;
    }

    setText(text) {
        const textInput = this.modal.querySelector('#text-input');
        textInput.value = text;
        this.updateWordCount();
    }

    clear() {
        const textInput = this.modal.querySelector('#text-input');
        const outputSection = this.modal.querySelector('#output-section');
        
        textInput.value = '';
        outputSection.style.display = 'none';
        this.updateWordCount();
    }

    destroy() {
        if (this.button && this.button.parentNode) {
            this.button.parentNode.removeChild(this.button);
        }
        if (this.modal && this.modal.parentNode) {
            this.modal.parentNode.removeChild(this.modal);
        }
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = NoteTakingButton;
}
