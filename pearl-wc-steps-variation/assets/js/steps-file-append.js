/**
 * Steps File Append
 * Enhances file uploads in pearl-wc-steps-variation plugin popups
 * to append files instead of replacing them
 *
 * Target forms:
 * - .kd-quantity-popup-inner (Custom Quantity Request)
 * - .urgent-popup (Urgent Delivery Request)
 *
 * @version 1.0.0
 */

(function($) {
    'use strict';

    // Configuration
    var config = {
        maxFiles: 10,
        maxTotalMB: 20,
        allowedExtensions: ['jpg', 'jpeg', 'png', 'pdf'],
        i18n: {
            remove: 'Supprimer',
            maxFilesError: 'Vous pouvez télécharger un maximum de %d fichiers.',
            maxSizeError: 'La taille totale ne peut pas dépasser %d Mo.',
            invalidTypeError: 'Ce type de fichier n\'est pas autorisé.',
            filesSelected: '%d fichier(s) sélectionné(s)'
        }
    };

    // File stores for each form type
    var quantityPopupFiles = [];
    var urgentPopupFiles = [];

    /**
     * Convert MB to bytes
     */
    function bytesLimit() {
        return config.maxTotalMB * 1024 * 1024;
    }

    /**
     * Create unique key for file deduplication
     */
    function fileKey(f) {
        return f.name + '__' + f.size + '__' + f.lastModified;
    }

    /**
     * Get file extension
     */
    function getExtension(filename) {
        return filename.split('.').pop().toLowerCase();
    }

    /**
     * Format string with placeholders
     */
    function sprintf(str) {
        var args = Array.prototype.slice.call(arguments, 1);
        var i = 0;
        return str.replace(/%[sd]/g, function() { return args[i++]; });
    }

    /**
     * Format file size for display
     */
    function formatFileSize(bytes) {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    }

    /**
     * Validate and merge new files with existing store
     */
    function validateAndMerge(currentFiles, newFiles) {
        var map = new Map(currentFiles.map(function(f) { return [fileKey(f), f]; }));
        var errors = [];
        var allowedExt = config.allowedExtensions;

        // Validate and add new files
        for (var i = 0; i < newFiles.length; i++) {
            var f = newFiles[i];
            var ext = getExtension(f.name);

            if (allowedExt.indexOf(ext) === -1) {
                errors.push(config.i18n.invalidTypeError + ' (' + f.name + ')');
                continue;
            }

            var key = fileKey(f);
            if (!map.has(key)) {
                map.set(key, f);
            }
        }

        // Convert to array
        var merged = Array.from(map.values());

        // Check file count limit
        if (merged.length > config.maxFiles) {
            errors.push(sprintf(config.i18n.maxFilesError, config.maxFiles));
            merged = merged.slice(0, config.maxFiles);
        }

        // Check total size limit
        var totalSize = merged.reduce(function(sum, f) { return sum + f.size; }, 0);
        if (totalSize > bytesLimit()) {
            errors.push(sprintf(config.i18n.maxSizeError, config.maxTotalMB));
            // Remove files from end until under limit
            while (totalSize > bytesLimit() && merged.length > 0) {
                var removed = merged.pop();
                totalSize -= removed.size;
            }
        }

        return { files: merged, errors: errors };
    }

    /**
     * Remove file at index from store and update UI
     */
    function removeFile(fileStore, idx, displayContainer, inputElement, storeSetter) {
        fileStore.splice(idx, 1);
        storeSetter(fileStore);
        updateFileDisplay(fileStore, displayContainer, inputElement, storeSetter);
        syncFilesToReact(inputElement, fileStore);
    }

    /**
     * Update the visual file list display
     */
    function updateFileDisplay(files, $container, inputElement, storeSetter) {
        $container.empty();

        if (files.length === 0) {
            return;
        }

        files.forEach(function(file, idx) {
            var $row = $('<div class="sfa-file-item"></div>');

            var $label = $('<span class="sfa-file-name"></span>')
                .text('✔ ' + file.name);

            var $size = $('<span class="sfa-file-size"></span>')
                .text('(' + formatFileSize(file.size) + ')');

            var $removeBtn = $('<button type="button" class="sfa-remove-btn"></button>')
                .text(config.i18n.remove)
                .on('click', function(e) {
                    e.preventDefault();
                    e.stopPropagation();
                    removeFile(files, idx, $container, inputElement, storeSetter);
                });

            $row.append($label, $size, $removeBtn);
            $container.append($row);
        });
    }

    /**
     * Sync files to React state via custom event
     * This triggers the React component to update its state
     */
    function syncFilesToReact(inputElement, files) {
        // Create a DataTransfer to set files on the input
        try {
            var dt = new DataTransfer();
            files.forEach(function(f) { dt.items.add(f); });
            inputElement.files = dt.files;
        } catch (err) {
            console.warn('[SFA] DataTransfer not supported:', err);
        }

        // Dispatch a custom event that React can listen to
        var event = new CustomEvent('sfaFilesUpdated', {
            detail: { files: files },
            bubbles: true
        });
        inputElement.dispatchEvent(event);
    }

    /**
     * Get or create file display container
     */
    function getOrCreateDisplayContainer(inputElement, containerId) {
        var $existing = $('#' + containerId);
        if ($existing.length > 0) {
            // Check if our enhanced container exists
            var $enhanced = $existing.siblings('.sfa-file-list');
            if ($enhanced.length === 0) {
                $enhanced = $('<div class="sfa-file-list"></div>');
                $existing.after($enhanced);
            }
            return $enhanced;
        }
        return null;
    }

    /**
     * Initialize file input enhancement for quantity popup
     */
    function initQuantityPopupInput() {
        var $popup = $('.kd-quantity-popup-inner');
        if ($popup.length === 0) return;

        var $input = $popup.find('input[type="file"]');
        if ($input.length === 0 || $input.data('sfa-init')) return;

        $input.data('sfa-init', true);

        // Hide original display and create our enhanced one
        var $originalDisplay = $popup.find('#selected-files');
        $originalDisplay.hide();

        var $displayContainer = $('<div class="sfa-file-list"></div>');
        $originalDisplay.after($displayContainer);

        $input.on('change', function(e) {
            var newFiles = Array.from(e.target.files || []);
            if (newFiles.length === 0) return;

            var result = validateAndMerge(quantityPopupFiles, newFiles);
            quantityPopupFiles = result.files;

            updateFileDisplay(quantityPopupFiles, $displayContainer, this, function(f) {
                quantityPopupFiles = f;
            });
            syncFilesToReact(this, quantityPopupFiles);

            if (result.errors.length > 0) {
                alert(result.errors.join('\n'));
            }
        });

        console.log('[SFA] Quantity popup input initialized');
    }

    /**
     * Initialize file input enhancement for urgent popup
     */
    function initUrgentPopupInput() {
        var $popup = $('.urgent-popup');
        if ($popup.length === 0) return;

        var $input = $popup.find('input[type="file"]');
        if ($input.length === 0 || $input.data('sfa-init')) return;

        $input.data('sfa-init', true);

        // Hide original display and create our enhanced one
        var $originalDisplay = $popup.find('#urgent-selected-files');
        $originalDisplay.hide();

        var $displayContainer = $('<div class="sfa-file-list"></div>');
        $originalDisplay.after($displayContainer);

        $input.on('change', function(e) {
            var newFiles = Array.from(e.target.files || []);
            if (newFiles.length === 0) return;

            var result = validateAndMerge(urgentPopupFiles, newFiles);
            urgentPopupFiles = result.files;

            updateFileDisplay(urgentPopupFiles, $displayContainer, this, function(f) {
                urgentPopupFiles = f;
            });
            syncFilesToReact(this, urgentPopupFiles);

            if (result.errors.length > 0) {
                alert(result.errors.join('\n'));
            }
        });

        console.log('[SFA] Urgent popup input initialized');
    }

    /**
     * Reset file stores when popups close
     */
    function setupPopupCloseHandlers() {
        // Watch for popup removal/hiding
        $(document).on('click', '.kd-quantity-popup-inner button:contains("Annuler")', function() {
            quantityPopupFiles = [];
        });

        $(document).on('click', '.closeUrgentPopup, .urgent-popup button:contains("Annuler")', function() {
            urgentPopupFiles = [];
        });

        // Reset after successful submission (watch for popup disappearing)
        var lastQuantityPopupVisible = false;
        var lastUrgentPopupVisible = false;

        setInterval(function() {
            var quantityVisible = $('.kd-quantity-popup-inner').length > 0;
            var urgentVisible = $('.urgent-popup').length > 0;

            // Reset stores when popups close
            if (lastQuantityPopupVisible && !quantityVisible) {
                quantityPopupFiles = [];
                console.log('[SFA] Quantity popup closed, files reset');
            }
            if (lastUrgentPopupVisible && !urgentVisible) {
                urgentPopupFiles = [];
                console.log('[SFA] Urgent popup closed, files reset');
            }

            lastQuantityPopupVisible = quantityVisible;
            lastUrgentPopupVisible = urgentVisible;
        }, 500);
    }

    /**
     * Main initialization
     */
    function init() {
        // Use MutationObserver to detect when popups appear
        var observer = new MutationObserver(function(mutations) {
            mutations.forEach(function(mutation) {
                if (mutation.addedNodes.length) {
                    // Check if quantity popup was added
                    $(mutation.addedNodes).each(function() {
                        if ($(this).hasClass('kd-quantity-popup-inner') || $(this).find('.kd-quantity-popup-inner').length) {
                            setTimeout(initQuantityPopupInput, 100);
                        }
                        if ($(this).hasClass('urgent-popup') || $(this).find('.urgent-popup').length) {
                            setTimeout(initUrgentPopupInput, 100);
                        }
                    });
                }
            });
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });

        // Setup popup close handlers
        setupPopupCloseHandlers();

        // Initial check in case popups already exist
        setTimeout(function() {
            initQuantityPopupInput();
            initUrgentPopupInput();
        }, 1000);

        console.log('[SFA] Steps File Append initialized');
    }

    // Initialize when DOM is ready
    $(document).ready(init);

    // Expose for external use/debugging
    window.StepsFileAppend = {
        getQuantityFiles: function() { return quantityPopupFiles; },
        getUrgentFiles: function() { return urgentPopupFiles; },
        clearQuantityFiles: function() { quantityPopupFiles = []; },
        clearUrgentFiles: function() { urgentPopupFiles = []; },
        config: config
    };

})(jQuery);
