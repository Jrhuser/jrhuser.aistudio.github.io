document.addEventListener('DOMContentLoaded', () => {
    const dbUrl = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vT216WTQadamMw4sIIFvBuWNWe69BCz3GedD5Ahcy3i187k9XGtiBve_yUiDc7jtqYZjtB4mrgDPnbK/pub?gid=0&single=true&output=csv';
    let database = [];

    // --- DOM Elements ---
    const systemTypeRadios = document.querySelectorAll('input[name="systemType"]');
    const openSystemInputsSection = document.getElementById('openSystemInputs');
    const closedSystemInputsSection = document.getElementById('closedSystemInputs');
    const electricalCostSection = document.getElementById('electricalCostSection');
    const resultsSection = document.getElementById('resultsSection');
    const downloadSelectionSection = document.getElementById('downloadSelection');

    const recircRateInput = document.getElementById('recircRate');
    const tonnageInput = document.getElementById('tonnage');
    const systemVolumeInput = document.getElementById('systemVolume');
    const electricalCostInput = document.getElementById('electricalCost');
    const calculateButton = document.getElementById('calculateButton');

    const modelSelectForDownload = document.getElementById('modelSelectForDownload');
    const documentLinksContainer = document.getElementById('documentLinksContainer');

    // --- Result Display Spans ---
    // Separator
    const separatorModelSpan = document.getElementById('separatorModel');
    const separatorFlowrateSpan = document.getElementById('separatorFlowrate');
    const separatorOpCostSpan = document.getElementById('separatorOpCost');
    const separatorFiltrationSpan = document.getElementById('separatorFiltration');
    const separatorDescriptionSpan = document.getElementById('separatorDescription');
    // VAF
    const vafModelSpan = document.getElementById('vafModel');
    const vafFlowrateSpan = document.getElementById('vafFlowrate');
    const vafOpCostSpan = document.getElementById('vafOpCost');
    const vafFiltrationSpan = document.getElementById('vafFiltration');
    const vafDescriptionSpan = document.getElementById('vafDescription');
    // Vortisand
    const vortisandModelSpan = document.getElementById('vortisandModel');
    const vortisandFlowrateSpan = document.getElementById('vortisandFlowrate');
    const vortisandOpCostSpan = document.getElementById('vortisandOpCost');
    const vortisandFiltrationSpan = document.getElementById('vortisandFiltration');
    const vortisandDescriptionSpan = document.getElementById('vortisandDescription');

    let selectedModelsForDownload = []; // To store details of displayed models

    // --- Fetch and Parse CSV Data ---
    async function fetchData() {
        try {
            const response = await fetch(dbUrl);
            const csvText = await response.text();
            database = Papa.parse(csvText, { header: true, skipEmptyLines: true }).data;
            // console.log('Database loaded:', database);
            // Convert relevant string numbers to actual numbers
            database = database.map(row => {
                const numFields = [
                    'Min Recirc Rate', 'Max Recirc Rate', 'Tonnage Min', 'Tonnage Max',
                    'Loop Min', 'Loop Max', 'Flow Rate', 'Electrical Usage (kWh/yr)' // Assuming this is the correct header for electrical usage
                ];
                numFields.forEach(field => {
                    if (row[field] !== undefined && row[field] !== null && row[field].trim() !== '') {
                        row[field] = parseFloat(row[field].replace(/,/g, '')); // Remove commas before parsing
                    } else {
                        row[field] = null; // Or some other default if appropriate
                    }
                });
                 // Clean up Document fields
                for (let i = 1; i <= 5; i++) { // Assuming up to 5 document links
                    const docField = `Document ${i}`;
                    const descField = `Document ${i} Description`;
                    if (row[docField] && typeof row[docField] === 'string') {
                        row[docField] = row[docField].trim();
                    }
                    if (row[descField] && typeof row[descField] === 'string') {
                        row[descField] = row[descField].trim();
                    }
                }
                return row;
            });
        } catch (error) {
            console.error('Error fetching or parsing data:', error);
            alert('Failed to load filter data. Please check the console for errors.');
        }
    }

    // --- Event Listeners ---
    systemTypeRadios.forEach(radio => {
        radio.addEventListener('change', () => {
            const selectedType = document.querySelector('input[name="systemType"]:checked').value;
            openSystemInputsSection.classList.add('hidden');
            closedSystemInputsSection.classList.add('hidden');
            electricalCostSection.classList.remove('hidden'); // Show electrical cost for both

            if (selectedType === 'open') {
                openSystemInputsSection.classList.remove('hidden');
                // Clear closed system inputs if any
                systemVolumeInput.value = '';
            } else if (selectedType === 'closed') {
                closedSystemInputsSection.classList.remove('hidden');
                // Clear open system inputs if any
                recircRateInput.value = '';
                tonnageInput.value = '';
            }
            // Hide results until calculation
            resultsSection.classList.add('hidden');
            downloadSelectionSection.classList.add('hidden');
            clearResults();
        });
    });

    // Only allow one of Recirc Rate or Tonnage for Open systems
    recircRateInput.addEventListener('input', () => {
        if (recircRateInput.value) tonnageInput.value = '';
    });
    tonnageInput.addEventListener('input', () => {
        if (tonnageInput.value) recircRateInput.value = '';
    });

    calculateButton.addEventListener('click', () => {
        if (!database.length) {
            alert('Data is not loaded yet. Please wait a moment and try again.');
            return;
        }
        calculateAndDisplayResults();
    });

    modelSelectForDownload.addEventListener('change', displaySelectedModelDocuments);

    // --- Calculation and Display Logic ---
    function calculateAndDisplayResults() {
        const selectedType = document.querySelector('input[name="systemType"]:checked')?.value;
        const electricalCost = parseFloat(electricalCostInput.value);

        if (!selectedType) {
            alert('Please select a system type (Open or Closed).');
            return;
        }
        if (isNaN(electricalCost) || electricalCost < 0) {
            alert('Please enter a valid Electrical Cost.');
            return;
        }

        let inputRecircRate = parseFloat(recircRateInput.value);
        let inputTonnage = parseFloat(tonnageInput.value);
        let inputSystemVolume = parseFloat(systemVolumeInput.value);

        selectedModelsForDownload = []; // Reset for new calculation

        clearResults(); // Clear previous results

        if (selectedType === 'open') {
            if (isNaN(inputRecircRate) && isNaN(inputTonnage)) {
                alert('For Open systems, please enter either Recirc Rate or Tonnage.');
                return;
            }
            if (!isNaN(inputRecircRate) && inputRecircRate <= 0) {
                alert('Recirc Rate must be a positive number.');
                return;
            }
             if (!isNaN(inputTonnage) && inputTonnage <= 0) {
                alert('Tonnage must be a positive number.');
                return;
            }
        } else if (selectedType === 'closed') {
            if (isNaN(inputSystemVolume) || inputSystemVolume <= 0) {
                alert('For Closed systems, please enter a valid System Volume.');
                return;
            }
        }


        const filterTypes = ['Separator', 'VAF', 'Vortisand'];
        let foundFilters = { Separator: null, VAF: null, Vortisand: null };

        database.forEach(row => {
            const filterType = row['Filter Type']; // Case sensitive, ensure matches CSV header
            if (!filterTypes.includes(filterType)) return; // Skip if not one of the target types

            let match = false;
            if (selectedType === 'open') {
                if (!isNaN(inputRecircRate)) {
                    if (inputRecircRate >= row['Min Recirc Rate'] && inputRecircRate <= row['Max Recirc Rate']) {
                        match = true;
                    }
                } else if (!isNaN(inputTonnage)) {
                    if (inputTonnage >= row['Tonnage Min'] && inputTonnage <= row['Tonnage Max']) {
                        match = true;
                    }
                }
            } else if (selectedType === 'closed') {
                if (inputSystemVolume >= row['Loop Min'] && inputSystemVolume <= row['Loop Max']) {
                    match = true;
                }
            }

            if (match && !foundFilters[filterType]) { // Take the first match for each type
                foundFilters[filterType] = row;
            }
        });

        // Populate results
        displayFilter(foundFilters.Separator, 'separator', electricalCost);
        displayFilter(foundFilters.VAF, 'vaf', electricalCost);
        displayFilter(foundFilters.Vortisand, 'vortisand', electricalCost);

        if (selectedModelsForDownload.length > 0) {
            populateDownloadDropdown();
            resultsSection.classList.remove('hidden');
            downloadSelectionSection.classList.remove('hidden');
        } else {
            alert('No suitable filters found for the given parameters.');
            resultsSection.classList.add('hidden');
            downloadSelectionSection.classList.add('hidden');
        }
    }

    function displayFilter(filterData, typePrefix, electricalCost) {
        const modelSpan = document.getElementById(`${typePrefix}Model`);
        const flowrateSpan = document.getElementById(`${typePrefix}Flowrate`);
        const opCostSpan = document.getElementById(`${typePrefix}OpCost`);
        const filtrationSpan = document.getElementById(`${typePrefix}Filtration`);
        const descriptionSpan = document.getElementById(`${typePrefix}Description`);

        if (filterData) {
            const opCost = (filterData['Electrical Usage (kWh/yr)'] || 0) * electricalCost;

            modelSpan.textContent = filterData.Model || '-';
            flowrateSpan.textContent = filterData['Flow Rate'] !== null ? filterData['Flow Rate'] : '-';
            opCostSpan.textContent = opCost.toFixed(2);
            filtrationSpan.textContent = filterData.Filtration || '-';
            descriptionSpan.textContent = filterData.Description || '-';

            // Store for download dropdown
            const documents = [];
            for (let i = 1; i <= 5; i++) { // Check for up to 5 documents
                const docLink = filterData[`Document ${i}`];
                const docDesc = filterData[`Document ${i} Description`];
                if (docLink && docLink.trim() !== '') {
                    documents.push({ link: docLink.trim(), description: (docDesc || `Document ${i}`).trim() });
                }
            }
            selectedModelsForDownload.push({
                name: `${filterData['Filter Type']} - ${filterData.Model}`,
                documents: documents
            });

        } else {
            modelSpan.textContent = 'N/A';
            flowrateSpan.textContent = '-';
            opCostSpan.textContent = '-';
            filtrationSpan.textContent = '-';
            descriptionSpan.textContent = 'No suitable model found for this type.';
        }
    }

    function clearResults() {
        const spansToClear = [
            separatorModelSpan, separatorFlowrateSpan, separatorOpCostSpan, separatorFiltrationSpan, separatorDescriptionSpan,
            vafModelSpan, vafFlowrateSpan, vafOpCostSpan, vafFiltrationSpan, vafDescriptionSpan,
            vortisandModelSpan, vortisandFlowrateSpan, vortisandOpCostSpan, vortisandFiltrationSpan, vortisandDescriptionSpan
        ];
        spansToClear.forEach(span => span.textContent = '-');
        document.getElementById('separatorOpCost').textContent = '-'; // Ensure currency symbol is handled if needed
        document.getElementById('vafOpCost').textContent = '-';
        document.getElementById('vortisandOpCost').textContent = '-';

        modelSelectForDownload.innerHTML = '<option value="">-- Select Model --</option>';
        documentLinksContainer.innerHTML = '';
    }

    function populateDownloadDropdown() {
        modelSelectForDownload.innerHTML = '<option value="">-- Select Model --</option>'; // Clear existing options
        selectedModelsForDownload.forEach((model, index) => {
            const option = document.createElement('option');
            option.value = index; // Use index to retrieve from selectedModelsForDownload
            option.textContent = model.name;
            modelSelectForDownload.appendChild(option);
        });
    }

    function displaySelectedModelDocuments() {
        documentLinksContainer.innerHTML = ''; // Clear previous links
        const selectedIndex = modelSelectForDownload.value;

        if (selectedIndex === '' || !selectedModelsForDownload[selectedIndex]) {
            return;
        }

        const model = selectedModelsForDownload[selectedIndex];
        if (model.documents && model.documents.length > 0) {
            const list = document.createElement('ul');
            model.documents.forEach(doc => {
                if (doc.link) { // Ensure link is not empty
                    const listItem = document.createElement('li');
                    const link = document.createElement('a');
                    link.href = doc.link;
                    link.textContent = doc.description || 'Download Document';
                    link.target = '_blank'; // Open in new tab
                    listItem.appendChild(link);
                    list.appendChild(listItem);
                }
            });
            documentLinksContainer.appendChild(list);
        } else {
            documentLinksContainer.textContent = 'No documents available for this model.';
        }
    }


    // --- Initial Setup ---
    fetchData(); // Load data when the page loads

    // --- PapaParse library (include this or link to a CDN) ---
    // If you don't want to include the entire library, you can link to a CDN in your HTML:
    // <script src="https://cdnjs.cloudflare.com/ajax/libs/PapaParse/5.3.0/papaparse.min.js"></script>
    // For this example, I'm assuming PapaParse is globally available.
    // If not, you'll need to add the PapaParse library to your project.
    // You can download it from https://www.papaparse.com/
    // and include it like <script src="papaparse.min.js"></script> before your script.js
});

// Make sure to include the PapaParse library for CSV parsing.
// You can download it from papaparse.com or use a CDN.
// Add this to your HTML head if using CDN:
// <script src="https://cdnjs.cloudflare.com/ajax/libs/PapaParse/5.4.1/papaparse.min.js"></script>