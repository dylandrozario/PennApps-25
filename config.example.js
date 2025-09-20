// Example configuration file for API keys
// Copy this file to config.js and add your actual API keys

const CONFIG = {
    // Gemini API Key - Get your key from: https://makersuite.google.com/app/apikey
    GEMINI_API_KEY: 'YOUR_GEMINI_API_KEY_HERE'
};

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CONFIG;
} else {
    window.CONFIG = CONFIG;
}
