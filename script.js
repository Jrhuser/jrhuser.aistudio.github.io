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
    const separatorModelSpan = document.getElementById('separatorModel');
    const separatorFlowrateSpan = document.getElementById('separatorFlowrate');
    const separatorOpCostSpan = document.getElementById('separatorOpCost');
    const separatorFiltrationSpan = document.getElementById('separatorFiltration');
    const separatorDescriptionSpan = document.getElementById('separatorDescription');
    const vafModelSpan = document.getElementById('vafModel');
    const vafFlowrateSpan = document.getElementById('vafFlowrate');
    const vafOpCostSpan = document.getElementById('vafOpCost');
    const vafFiltrationSpan = document.getElementById('vafFiltration');
    const vafDescriptionSpan = document.getElementById('vafDescription');
    const vortisandModelSpan = document.getElementById('vortisandModel');
    const vortisandFlowrateSpan = document.getElementById('vortisandFlowrate');
    const vortisandOpCostSpan = document.getElementById('vortisandOpCost');
    const vortisandFiltrationSpan = document.getElementById('vortisandFiltration');
    const vortisandDescriptionSpan = document.getElementById('vortisandDescription');

    let selectedModelsForDownload = [];

    // --- Fetch and Parse CSV Data ---
    async function fetchData() {
        try {
            const response = await fetch(dbUrl);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}, statusText: ${response.statusText}`);
            }
            const csvText = await response.text();
            if (typeof Papa === 'undefined') {
                console.error('PapaParse library is not loaded. Please check the script tag in your HTML.');
                alert('Error: CSV parsing library not loaded. Site may not function correctly.');
                return;
            }
            const parsedData = Papa.parse(csvText, { header: true, skipEmptyLines: true });
            if (parsedData.errors.length > 0) {
                console.warn("CSV parsing errors encountered:", parsedData.errors);
                parsedData.errors.forEach(error => {
                    console.warn(`CSV Error: ${error.message}, Code: ${error.code}, Row: ${error.row}`);
                });
            }
            database = parsedData.data;

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
            // DEBUG LOG: Check loaded database
            console.log('Database loaded (first 5 rows):', database.slice(0, 5)); // Log first 5 rows to prevent overwhelming console
            if (database.length > 0) {
                console.log('Example row from database:', JSON.stringify(database[0], null, 2));
                console.log('Expected numeric fields in first row (check for actual numbers):', {
                    'Min Recirc Rate': database[0]['Min Recirc Rate'],
                    'Max Recirc Rate': database[0]['Max Recirc Rate'],
                    'Tonnage Min': database[0]['Tonnage Min'],
                    'Tonnage Max': database[0]['Tonnage Max'],
                    'Loop Min': database[0]['Loop Min'],
                    'Loop Max': database[0]['Loop Max'],
                    'Flow Rate': database[0]['Flow Rate'],
                    'Electrical Usage (kWh/yr)': database[0]['Electrical Usage (kWh/yr)']
                });
                console.log("All column headers from first data row:", Object.keys(database[0]));
            } else {
                console.warn("Database is empty after parsing.");
            }

        } catch (error) {
            console.error('Error fetching or parsing data:', error);
            alert(`Failed to load filter data: ${error.message}. Please check the console for more details.`);
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
        if (!database || database.length === 0) {
            alert('Data is not loaded yet or is empty. Please wait a moment or check data source and try again.');
            console.warn('Calculate button clicked but database is not ready. Current database:', database);
            // fetchData(); // Optionally try to fetch data again, or guide user
            return;
        }
        calculateAndDisplayResults();
    });

    modelSelectForDownload.addEventListener('change', displaySelectedModelDocuments);

    // --- Calculation and Display Logic ---
    function calculateAndDisplayResults() {
        clearResults();
        const selectedType = document.querySelector('input[name="systemType"]:checked')?.value;
        const electricalCost = parseFloat(electricalCostInput.value);

        if (!selectedType) {
            alert('Please select a system type (Open or Closed).');
            return;
        }
        if (isNaN(electricalCost) || electricalCost < 0) {
            alert('Please enter a valid Electrical Cost (non-negative number).');
            return;
        }

        let inputRecircRate = parseFloat(recircRateInput.value);
        let inputTonnage = parseFloat(tonnageInput.value);
        let inputSystemVolume = parseFloat(systemVolumeInput.value);

        selectedModelsForDownload = [];

        // DEBUG LOG: User inputs
        console.log('Calculating with User Inputs:', {
            selectedType: selectedType,
            inputRecircRate: inputRecircRate,
            inputTonnage: inputTonnage,
            inputSystemVolume: inputSystemVolume,
            electricalCost: electricalCost
        });


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
                alert('For Closed systems, please enter a valid System Volume (positive number).');
                return;
            }
        }

        const filterTypes = ['Separator', 'VAF', 'Vortisand'];
        let foundFilters = { Separator: null, VAF: null, Vortisand: null };

        console.log('--- Starting Filter Matching Process ---');
        database.forEach((row, index) => {
            const filterTypeInRow = row['Filter Type'];
            // if (!filterTypes.includes(filterTypeInRow)) { // This check might be too restrictive if CSV has other types not for this tool
            //     // console.log(`Row ${index}: Skipping row with Filter Type: ${filterTypeInRow} (Not one of ${filterTypes.join(', ')})`);
            //     return;
            // }

            let match = false;
            let reason = "Initial";

            if (selectedType === 'open') {
                const minRecirc = row['Min Recirc Rate'];
                const maxRecirc = row['Max Recirc Rate'];
                const minTon = row['Tonnage Min'];
                const maxTon = row['Tonnage Max'];

                if (!isNaN(inputRecircRate)) {
                    if (typeof minRecirc === 'number' && typeof maxRecirc === 'number') {
                        reason = `Open - Recirc: Input=${inputRecircRate}, Range=[${minRecirc}-${maxRecirc}] for Model ${row.Model || 'N/A'}`;
                        if (inputRecircRate >= minRecirc && inputRecircRate <= maxRecirc) {
                            match = true;
                            reason += ' -> MATCH';
                        } else {
                            reason += ' -> NO MATCH (Recirc out of range)';
                        }
                    } else {
                        reason = `Open - Recirc: Input=${inputRecircRate}, CSV Recirc Range Invalid/Missing ([${minRecirc}]-[${maxRecirc}]) for Model ${row.Model || 'N/A'} -> NO MATCH`;
                    }
                } else if (!isNaN(inputTonnage)) {
                     if (typeof minTon === 'number' && typeof maxTon === 'number') {
                        reason = `Open - Tonnage: Input=${inputTonnage}, Range=[${minTon}-${maxTon}] for Model ${row.Model || 'N/A'}`;
                        if (inputTonnage >= minTon && inputTonnage <= maxTon) {
                            match = true;
                            reason += ' -> MATCH';
                        } else {
                            reason += ' -> NO MATCH (Tonnage out of range)';
                        }
                    } else {
                        reason = `Open - Tonnage: Input=${inputTonnage}, CSV Tonnage Range Invalid/Missing ([${minTon}]-[${maxTon}]) for Model ${row.Model || 'N/A'} -> NO MATCH`;
                    }
                } else {
                    reason = `Open - Neither Recirc Rate nor Tonnage provided as valid number. InputRecirc: ${inputRecircRate}, InputTonnage: ${inputTonnage} -> NO MATCH`;
                }
            } else if (selectedType === 'closed') {
                const loopMin = row['Loop Min'];
                const loopMax = row['Loop Max'];
                if (typeof loopMin === 'number' && typeof loopMax === 'number') {
                    reason = `Closed - Volume: Input=${inputSystemVolume}, Range=[${loopMin}-${loopMax}] for Model ${row.Model || 'N/A'}`;
                    if (inputSystemVolume >= loopMin && inputSystemVolume <= loopMax) {
                        match = true;
                        reason += ' -> MATCH';
                    } else {
                        reason += ' -> NO MATCH (Volume out of range)';
                    }
                } else {
                     reason = `Closed - Volume: Input=${inputSystemVolume}, CSV Loop Range Invalid/Missing ([${loopMin}]-[${loopMax}]) for Model ${row.Model || 'N/A'} -> NO MATCH`;
                }
            }

            // Log details only for the relevant filter types to reduce noise or if a match is found
            if (filterTypes.includes(filterTypeInRow)) {
                 console.log(`Row ${index} (Type: ${filterTypeInRow}, Model: ${row.Model || 'N/A'}) - Check Reason: ${reason}`);
            }


            if (match && filterTypes.includes(filterTypeInRow) && !foundFilters[filterTypeInRow]) {
                console.log(`%cMATCH FOUND and selected for ${filterTypeInRow}: Model ${row.Model}`, "color: green; font-weight: bold;");
                foundFilters[filterTypeInRow] = row;
            } else if (match && filterTypes.includes(filterTypeInRow) && foundFilters[filterTypeInRow]) {
                console.log(`%cAdditional match for ${filterTypeInRow} (Model ${row.Model}), but one already selected (Model ${foundFilters[filterTypeInRow].Model}).`, "color: orange;");
            }
        });
        console.log('--- Filter Matching Process Complete ---');
        console.log('Filters selected after processing all rows:', foundFilters);


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

        if (!modelSpan || !flowrateSpan || !opCostSpan || !filtrationSpan || !descriptionSpan) {
            console.error(`One or more display spans for prefix "${typePrefix}" not found. Check HTML IDs.`);
            return;
        }

        if (filterData) {
            const electricalUsage = filterData['Electrical Usage (kWh/yr)'];
            const opCost = (typeof electricalUsage === 'number' && !isNaN(electricalUsage)) ? electricalUsage * electricalCost : 0;

            modelSpan.textContent = filterData.Model || 'N/A';
            flowrateSpan.textContent = filterData['Flow Rate'] !== null && !isNaN(filterData['Flow Rate']) ? filterData['Flow Rate'] : '-';
            opCostSpan.textContent = opCost.toFixed(2);
            filtrationSpan.textContent = filterData.Filtration || '-';
            descriptionSpan.textContent = filterData.Description || '-';

            console.log(`Displaying ${typePrefix}: Model ${filterData.Model || 'N/A'}, OpCost: ${opCost.toFixed(2)}`);


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
            });

        } else {
            console.log(`No data to display for ${typePrefix}.`);
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
        spansToClear.forEach(span => {
            if (span) {
                span.textContent = '-';
            } else {
                 // console.warn('A span element for results display was not found during clearResults.');
            }
        });

        if (separatorOpCostSpan) separatorOpCostSpan.textContent = '-';
        if (vafOpCostSpan) vafOpCostSpan.textContent = '-';
        if (vortisandOpCostSpan) vortisandOpCostSpan.textContent = '-';

        if (modelSelectForDownload) {
            modelSelectForDownload.innerHTML = '<option value="">-- Select Model --</option>';
        }
        if (documentLinksContainer) {
            documentLinksContainer.innerHTML = '';
        }
        // console.log("Results cleared.");
    }

    function populateDownloadDropdown() {
        if (!modelSelectForDownload) return;
        modelSelectForDownload.innerHTML = '<option value="">-- Select Model --</option>';
        selectedModelsForDownload.forEach((model, index) => {
            const option = document.createElement('option');
            option.value = index;
            option.textContent = model.name;
            modelSelectForDownload.appendChild(option);
        });
        // console.log("Download dropdown populated with models:", selectedModelsForDownload.map(m => m.name));
    }

    function displaySelectedModelDocuments() {
        if (!documentLinksContainer || !modelSelectForDownload) return;

        documentLinksContainer.innerHTML = '';
        const selectedIndex = modelSelectForDownload.value;

        if (selectedIndex === '' || !selectedModelsForDownload[selectedIndex]) {
            // console.log("No model selected for download or index out of bounds.");
            return;
        }

        const model = selectedModelsForDownload[selectedIndex];
        // console.log("Displaying documents for selected model:", model.name, model.documents);
        if (model.documents && model.documents.length > 0) {
            const list = document.createElement('ul');
            model.documents.forEach(doc => {
                if (doc.link) {
                    const listItem = document.createElement('li');
                    const link = document.createElement('a');
                    link.href = doc.link;
                    link.textContent = doc.description || 'Download Document';
                    link.target = '_blank';
                    link.rel = "noopener noreferrer";
                    listItem.appendChild(link);
                    list.appendChild(listItem);
                }
            });
            if (list.hasChildNodes()) {
                documentLinksContainer.appendChild(list);
            } else {
                 documentLinksContainer.textContent = 'No valid document links found for this model.';
            }
        } else {
            documentLinksContainer.textContent = 'No documents available for this model.';
        }
    }

    // --- Initial Setup ---
    console.log("DOM fully loaded. Initializing script and fetching data...");
    fetchData();
});