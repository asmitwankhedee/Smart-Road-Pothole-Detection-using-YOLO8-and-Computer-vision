document.addEventListener('DOMContentLoaded', () => {
    const dropZone = document.getElementById('dropZone');
    const fileInput = document.getElementById('fileInput');
    const uploadForm = document.getElementById('uploadForm');
    const uploadPanel = document.getElementById('uploadPanel');
    const loadingSection = document.getElementById('loading');
    const resultsSection = document.getElementById('results');
    const resultImage = document.getElementById('resultImage');
    const detectionsList = document.getElementById('detectionsList');
    const resetBtn = document.getElementById('resetBtn');

    // Drag & Drop Functionality
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, preventDefaults, false);
    });

    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    ['dragenter', 'dragover'].forEach(eventName => {
        dropZone.addEventListener(eventName, () => {
            dropZone.classList.add('dragover');
        }, false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, () => {
            dropZone.classList.remove('dragover');
        }, false);
    });

    dropZone.addEventListener('drop', (e) => {
        const dt = e.dataTransfer;
        const files = dt.files;
        if (files.length > 0) {
            fileInput.files = files;
            handleUpload(files[0]);
        }
    });

    // Click to upload
    dropZone.addEventListener('click', () => {
        fileInput.click();
    });

    fileInput.addEventListener('change', (e) => {
        if (fileInput.files.length > 0) {
            handleUpload(fileInput.files[0]);
        }
    });

    // Handle the file upload via fetch to our Flask backend
    function handleUpload(file) {
        if (!file.type.match('image.*')) {
            alert('Please select an image file');
            return;
        }

        const formData = new FormData();
        formData.append('file', file);

        // UI State: Show loading
        uploadPanel.classList.add('hidden');
        resultsSection.classList.add('hidden');
        loadingSection.classList.remove('hidden');

        fetch('/predict', {
            method: 'POST',
            body: formData
        })
            .then(response => {
                if (!response.ok) {
                    return response.json().then(err => { throw new Error(err.error || 'Server error') });
                }
                return response.json();
            })
            .then(data => {
                // UI State: Show results
                loadingSection.classList.add('hidden');
                displayResults(data);
            })
            .catch(error => {
                console.error('Error:', error);
                alert('Error analyzing image: ' + error.message);
                // Reset UI
                loadingSection.classList.add('hidden');
                uploadPanel.classList.remove('hidden');
            });
    }

    function displayResults(data) {
        // Set the image src from base64
        resultImage.src = 'data:image/jpeg;base64,' + data.image_b64;

        // Clear previous detections
        detectionsList.innerHTML = '';

        if (data.detections.length === 0) {
            detectionsList.innerHTML = `
                <div class="detection-card">
                    <p style="text-align: center; color: var(--text-secondary)">No potholes or cracks detected in this image.</p>
                </div>
            `;
        } else {
            // Generate HTML for each detection
            data.detections.forEach((det, index) => {
                const detClassLower = det.class_name.toLowerCase();

                const cardHtml = `
                    <div class="detection-card" style="animation-delay: ${index * 0.1}s">
                        <div class="det-header">
                            <span class="det-class ${detClassLower}">${det.class_name} #${index + 1}</span>
                        </div>
                        <div class="det-metrics">
                            <div class="metric">
                                <span class="metric-label">Width</span>
                                <span class="metric-value">${det.width_px} px</span>
                            </div>
                            <div class="metric">
                                <span class="metric-label">Height</span>
                                <span class="metric-value">${det.height_px} px</span>
                            </div>
                        </div>
                    </div>
                `;
                detectionsList.insertAdjacentHTML('beforeend', cardHtml);
            });
        }

        resultsSection.classList.remove('hidden');
    }

    // Reset button logic
    resetBtn.addEventListener('click', () => {
        resultsSection.classList.add('hidden');
        uploadPanel.classList.remove('hidden');
        fileInput.value = ''; // clears the input
    });
});
