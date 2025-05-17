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
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const csvText = await response.text();
            // Check if Papa is defined (it should be if the script tag is correct in HTML)
            if (typeof Papa === 'undefined') {
                console.error('PapaParse library is not loaded. Please check the script tag in your HTML.');
                alert('Error: CSV parsing library not loaded. Site may not function correctly.');
                return;
            }
            const parsedData = Papa.parse(csvText, { header: true, skipEmptyLines: true });
            if (parsedData.errors.length > 0) {
                console.warn("CSV parsing errors encountered:", parsedData.errors);
                // Decide if you want to alert the user or try to use partial data
            }
            database = parsedData.data;

            // Convert relevant string numbers to actual numbers
            database = database.map(row => {
                const numFields = [
                    'Min Recirc Rate', 'Max Recirc Rate', 'Tonnage Min', 'Tonnage Max',
                    'Loop Min', 'Loop Max', 'Flow Rate', 'Electrical Usage (kWh/yr)'
                ];
                numFields.forEach(field => {
                    if (row[field] !== undefined && row[field] !== null && String(row[field]).trim() !== '') {
                        row[field] = parseFloat(String(row[field]).replace(/,/g, ''));
                    } else {
                        row[field] = null;
                    }
                });
                 // Clean up Document fields
                for (let i = 1; i <= 5; i++) {
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
            // console.log('Database loaded:', database);
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
            electricalCostSection.classList.remove('hidden');

            if (selectedType === 'open') {
                openSystemInputsSection.classList.remove('hidden');
                systemVolumeInput.value = '';
            } else if (selectedType === 'closed') {
                closedSystemInputsSection.classList.remove('hidden');
                recircRateInput.value = '';
                tonnageInput.value = '';
            }
            resultsSection.classList.add('hidden');
            downloadSelectionSection.classList.add('hidden');
            clearResults();
        });
    });

    recircRateInput.addEventListener('input', () => {
        if (recircRateInput.value) tonnageInput.value = '';
    });
    tonnageInput.addEventListener('input', () => {
        if (tonnageInput.value) recircRateInput.value = '';
    });

    calculateButton.addEventListener('click', () => {
        if (!database.length) {
            alert('Data is not loaded yet or is empty. Please wait a moment or check data source and try again.');
            fetchData(); // Optionally try to fetch data again
            return;
        }
        calculateAndDisplayResults();
    });

    modelSelectForDownload.addEventListener('change', displaySelectedModelDocuments);

    // --- Calculation and Display Logic ---
    function calculateAndDisplayResults() {
        const selectedType = document.querySelector('input[name="systemType"]:checked')?.value;
        const electricalCost = parseFloat(electricalCostInput.value);

        clearResults(); // Clear previous results first

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

        selectedModelsForDownload = [];

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

        const filterTypes = ['Separator', 'VAF', 'Vortisand']; // Ensure these match 'Filter Type' column in CSV
        let foundFilters = { Separator: null, VAF: null, Vortisand: null };

        database.forEach(row => {
            const filterType = row['Filter Type'];
            if (!filterTypes.includes(filterType)) return;

            let match = false;
            if (selectedType === 'open') {
                if (!isNaN(inputRecircRate) && row['Min Recirc Rate'] !== null && row['Max Recirc Rate'] !== null) {
                    if (inputRecircRate >= row['Min Recirc Rate'] && inputRecircRate <= row['Max Recirc Rate']) {
                        match = true;
                    }
                } else if (!isNaN(inputTonnage) && row['Tonnage Min'] !== null && row['Tonnage Max'] !== null) {
                    if (inputTonnage >= row['Tonnage Min'] && inputTonnage <= row['Tonnage Max']) {
                        match = true;
                    }
                }
            } else if (selectedType === 'closed' && row['Loop Min'] !== null && row['Loop Max'] !== null) {
                if (inputSystemVolume >= row['Loop Min'] && inputSystemVolume <= row['Loop Max']) {
                    match = true;
                }
            }

            if (match && !foundFilters[filterType]) {
                foundFilters[filterType] = row;
            }
        });

        displayFilter(foundFilters.Separator, 'separator', electricalCost);
        displayFilter(foundFilters.VAF, 'vaf', electricalCost);
        displayFilter(foundFilters.Vortisand, 'vortisand', electricalCost);

        if (selectedModelsForDownload.length > 0) {
            populateDownloadDropdown();
            resultsSection.classList.remove('hidden');
            downloadSelectionSection.classList.remove('hidden');
        } else {
            alert('No suitable filters found for the given parameters.');
            resultsSection.classList.add('hidden'); // Keep results hidden if none found
            downloadSelectionSection.classList.add('hidden');
        }
    }

    function displayFilter(filterData, typePrefix, electricalCost) {
        const modelSpan = document.getElementById(`${typePrefix}Model`);
        const flowrateSpan = document.getElementById(`${typePrefix}Flowrate`);
        const opCostSpan = document.getElementById(`${typePrefix}OpCost`);
        const filtrationSpan = document.getElementById(`${typePrefix}Filtration`);
        const descriptionSpan = document.getElementById(`${typePrefix}Description`);

        // Check if all span elements were found
        if (!modelSpan || !flowrateSpan || !opCostSpan || !filtrationSpan || !descriptionSpan) {
            console.error(`One or more display spans for prefix "${typePrefix}" not found. Check HTML IDs.`);
            return; // Exit if essential display elements are missing
        }

        if (filterData) {
            const electricalUsage = filterData['Electrical Usage (kWh/yr)'];
            const opCost = (typeof electricalUsage === 'number' && !isNaN(electricalUsage)) ? electricalUsage * electricalCost : 0;

            modelSpan.textContent = filterData.Model || 'N/A';
            flowrateSpan.textContent = filterData['Flow Rate'] !== null ? filterData['Flow Rate'] : '-';
            opCostSpan.textContent = opCost.toFixed(2);
            filtrationSpan.textContent = filterData.Filtration || '-';
            descriptionSpan.textContent = filterData.Description || '-';

            const documents = [];
            for (let i = 1; i <= 5; i++) {
                const docLink = filterData[`Document ${i}`];
                const docDesc = filterData[`Document ${i} Description`];
                if (docLink && String(docLink).trim() !== '') {
                    documents.push({ link: String(docLink).trim(), description: (docDesc || `Document ${i}`).trim() });
                }
            }
            selectedModelsForDownload.push({
                name: `${filterData['Filter Type']} - ${filterData.Model}`,
                documents: documents,
                // Storing all data might be useful if needed later
                // fullData: filterData
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
            vortisandModelSpan, vortisand