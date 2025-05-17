document.addEventListener('DOMContentLoaded', () => {
    const dbUrl = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vT216WTQadamMw4sIIFvBuWNWe69BCz3GedD5Ahcy3i187k9XGtiBve_yUiDc7jtqYZjtB4mrgDPnbK/pub?gid=0&single=true&output=csv';
    let database = [];

    // DOM Elements
    const openRadio = document.getElementById('openRadio');
    const closedRadio = document.getElementById('closedRadio');
    const openSystemInputs = document.getElementById('openSystemInputs');
    const closedSystemInputs = document.getElementById('closedSystemInputs');
    const electricalCostInputSection = document.getElementById('electricalCostInput');
    const calculateButtonSection = document.getElementById('calculateButtonSection');
    const resultsSection = document.getElementById('resultsSection');

    const recircRateInput = document.getElementById('recircRate');
    const tonnageInput = document.getElementById('tonnage');
    const systemVolumeInput = document.getElementById('systemVolume');
    const electricalCostInput = document.getElementById('electricalCost');
    const calculateBtn = document.getElementById('calculateBtn');

    // --- Fetch and Parse CSV Database ---
    async function fetchData() {
        try {
            const response = await fetch(dbUrl);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const csvText = await response.text();
            database = parseCSV(csvText);
            // console.log('Database loaded:', database); // For debugging
        } catch (error) {
            console.error('Error fetching or parsing database:', error);
            alert('Failed to load the filter database. Please check the console for errors.');
        }
    }

    function parseCSV(csvText) {
        const lines = csvText.trim().split('\n');
        const headers = lines[0].split(',').map(header => header.trim());
        const data = [];
        for (let i = 1; i < lines.length; i++) {
            const values = lines[i].split(',');
            const entry = {};
            headers.forEach((header, index) => {
                const value = values[index] ? values[index].trim() : '';
                // Convert numerical fields from strings to numbers
                if (!isNaN(value) && value !== '') {
                    entry[header] = parseFloat(value);
                } else {
                    entry[header] = value;
                }
            });
            data.push(entry);
        }
        return data;
    }

    // --- Event Listeners ---
    openRadio.addEventListener('change', handleSystemTypeChange);
    closedRadio.addEventListener('change', handleSystemTypeChange);
    calculateBtn.addEventListener('click', handleCalculation);

    // Disable other inputs if one is filled for open system
    recircRateInput.addEventListener('input', () => {
        if (recircRateInput.value) {
            tonnageInput.disabled = true;
            tonnageInput.value = ''; // Clear other input
        } else {
            tonnageInput.disabled = false;
        }
    });

    tonnageInput.addEventListener('input', () => {
        if (tonnageInput.value) {
            recircRateInput.disabled = true;
            recircRateInput.value = ''; // Clear other input
        } else {
            recircRateInput.disabled = false;
        }
    });


    function handleSystemTypeChange() {
        openSystemInputs.classList.add('hidden');
        closedSystemInputs.classList.add('hidden');
        electricalCostInputSection.classList.add('hidden');
        calculateButtonSection.classList.add('hidden');
        resultsSection.classList.add('hidden'); // Hide results when type changes

        // Clear previous inputs when system type changes
        recircRateInput.value = '';
        tonnageInput.value = '';
        systemVolumeInput.value = '';
        electricalCostInput.value = '';
        recircRateInput.disabled = false;
        tonnageInput.disabled = false;


        if (openRadio.checked) {
            openSystemInputs.classList.remove('hidden');
            electricalCostInputSection.classList.remove('hidden');
            calculateButtonSection.classList.remove('hidden');
        } else if (closedRadio.checked) {
            closedSystemInputs.classList.remove('hidden');
            electricalCostInputSection.classList.remove('hidden');
            calculateButtonSection.classList.remove('hidden');
        }
    }

    function handleCalculation() {
        if (database.length === 0) {
            alert("Database is not loaded yet. Please wait or try refreshing.");
            return;
        }

        const electricalCost = parseFloat(electricalCostInput.value);
        if (isNaN(electricalCost) || electricalCost < 0) {
            alert('Please enter a valid Electrical Cost.');
            return;
        }

        let selectedSeparator = null;
        let selectedVaf = null;
        let selectedVortisand = null;

        if (openRadio.checked) {
            const recircRate = parseFloat(recircRateInput.value);
            const tonnage = parseFloat(tonnageInput.value);

            if (isNaN(recircRate) && isNaN(tonnage)) {
                alert('Please enter either Recirc Rate or Tonnage for an open system.');
                return;
            }
            if (!isNaN(recircRate) && recircRate < 0) {
                alert('Recirc Rate cannot be negative.');
                return;
            }
             if (!isNaN(tonnage) && tonnage < 0) {
                alert('Tonnage cannot be negative.');
                return;
            }


            database.forEach(item => {
                const matchesRecirc = !isNaN(recircRate) && item['Min Recirc Rate'] <= recircRate && item['Max Recirc Rate'] >= recircRate;
                const matchesTonnage = !isNaN(tonnage) && item['Tonnage Min'] <= tonnage && item['Tonnage Max'] >= tonnage;

                if (matchesRecirc || matchesTonnage) {
                    if (item['Filter Type'] === 'Separator' && !selectedSeparator) {
                        selectedSeparator = item;
                    } else if (item['Filter Type'] === 'VAF' && !selectedVaf) {
                        selectedVaf = item;
                    } else if (item['Filter Type'] === 'Vortisand' && !selectedVortisand) {
                        selectedVortisand = item;
                    }
                }
            });

        } else if (closedRadio.checked) {
            const systemVolume = parseFloat(systemVolumeInput.value);
            if (isNaN(systemVolume) || systemVolume <= 0) {
                alert('Please enter a valid System Volume for a closed system.');
                return;
            }

            database.forEach(item => {
                if (item['Loop Min'] <= systemVolume && item['Loop Max'] >= systemVolume) {
                    if (item['Filter Type'] === 'Separator' && !selectedSeparator) {
                        selectedSeparator = item;
                    } else if (item['Filter Type'] === 'VAF' && !selectedVaf) {
                        selectedVaf = item;
                    } else if (item['Filter Type'] === 'Vortisand' && !selectedVortisand) {
                        selectedVortisand = item;
                    }
                }
            });
        }

        displayResults(selectedSeparator, selectedVaf, selectedVortisand, electricalCost);
    }

    function displayResults(separator, vaf, vortisand, electricalCost) {
        resultsSection.classList.remove('hidden');

        updateResultColumn('separator', separator, electricalCost);
        updateResultColumn('vaf', vaf, electricalCost);
        updateResultColumn('vortisand', vortisand, electricalCost);
    }

    function updateResultColumn(type, item, electricalCost) {
        const modelEl = document.getElementById(`${type}Model`);
        const flowrateEl = document.getElementById(`${type}Flowrate`);
        const opCostEl = document.getElementById(`${type}OpCost`);
        const filtrationEl = document.getElementById(`${type}Filtration`);
        const descriptionEl = document.getElementById(`${type}Description`);

        if (item) {
            modelEl.textContent = item['Model'] || '-';
            flowrateEl.textContent = item['Flow Rate (gpm)'] || '-';
            // Electrical Usage is in kWh/year based on typical usage for these systems
            // If Electrical Usage is in kWh per some other unit, adjust calculation
            const operatingCost = (item['Electrical Usage (kWh/yr)'] * electricalCost).toFixed(2);
            opCostEl.textContent = isNaN(operatingCost) ? '-' : operatingCost;
            filtrationEl.textContent = item['Filtration (micron)'] || '-';
            descriptionEl.textContent = item['Description'] || '-';
        } else {
            modelEl.textContent = 'No suitable model found';
            flowrateEl.textContent = '-';
            opCostEl.textContent = '-';
            filtrationEl.textContent = '-';
            descriptionEl.textContent = '-';
        }
    }

    // --- Initial Setup ---
    fetchData(); // Load the database when the script runs
});