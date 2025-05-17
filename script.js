document.addEventListener('DOMContentLoaded', () => {
    const radioOpen = document.getElementById('radioOpen');
    const radioClosed = document.getElementById('radioClosed');
    const openSystemInputs = document.getElementById('openSystemInputs');
    const closedSystemInputs = document.getElementById('closedSystemInputs');
    const calculateButtonContainer = document.getElementById('calculateButtonContainer');
    const calculateButton = document.getElementById('calculateButton');
    const resultsContainer = document.getElementById('resultsContainer');

    const recircRateInput = document.getElementById('recircRate');
    const tonnageInput = document.getElementById('tonnage');
    const electricalCostOpenInput = document.getElementById('electricalCostOpen');
    const systemVolumeInput = document.getElementById('systemVolume');
    const electricalCostClosedInput = document.getElementById('electricalCostClosed');

    const dbUrl = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vT216WTQadamMw4sIIFvBuWNWe69BCz3GedD5Ahcy3i187k9XGtiBve_yUiDc7jtqYZjtB4mrgDPnbK/pub?gid=0&single=true&output=csv';
    let dbData = [];

    // Fetch and parse CSV data
    async function fetchData() {
        try {
            const response = await fetch(dbUrl);
            const csvText = await response.text();
            dbData = parseCSV(csvText);
            // console.log("Parsed DB Data:", dbData); // For debugging
        } catch (error) {
            console.error("Error fetching or parsing CSV data:", error);
            resultsContainer.innerHTML = "<p>Error loading data. Please try again later.</p>";
            resultsContainer.style.display = 'block';
        }
    }

    function parseCSV(text) {
        const rows = text.split(/\r?\n/).map(row => row.split(',').map(cell => cell.trim()));
        const headers = rows[0];
        return rows.slice(1).map(row => {
            const rowData = {};
            headers.forEach((header, index) => {
                rowData[header] = row[index];
            });
            return rowData;
        });
    }

    function toggleInputs() {
        const selectedType = document.querySelector('input[name="systemType"]:checked');
        if (!selectedType) {
            openSystemInputs.style.display = 'none';
            closedSystemInputs.style.display = 'none';
            calculateButtonContainer.style.display = 'none';
            resultsContainer.style.display = 'none';
            return;
        }

        if (selectedType.value === 'open') {
            openSystemInputs.style.display = 'block';
            closedSystemInputs.style.display = 'none';
        } else if (selectedType.value === 'closed') {
            openSystemInputs.style.display = 'none';
            closedSystemInputs.style.display = 'block';
        }
        calculateButtonContainer.style.display = 'block';
        resultsContainer.style.display = 'none'; // Hide results when inputs change
    }

    radioOpen.addEventListener('change', toggleInputs);
    radioClosed.addEventListener('change', toggleInputs);

    calculateButton.addEventListener('click', () => {
        if (dbData.length === 0) {
            alert("Data is still loading or failed to load. Please wait or refresh.");
            return;
        }

        const selectedType = document.querySelector('input[name="systemType"]:checked').value;
        let electricalCost;
        let foundSeparator = null;
        let foundVAF = null;
        let foundVortisand = null;

        if (selectedType === 'open') {
            const recircRate = parseFloat(recircRateInput.value);
            const tonnage = parseFloat(tonnageInput.value);
            electricalCost = parseFloat(electricalCostOpenInput.value);

            if (isNaN(electricalCost) || electricalCost <= 0) {
                alert("Please enter a valid Electrical Cost for Open System.");
                return;
            }
            if ((isNaN(recircRate) || recircRate <= 0) && (isNaN(tonnage) || tonnage <= 0)) {
                alert("Please enter a valid Recirc Rate or Tonnage for Open System.");
                return;
            }

            dbData.forEach(item => {
                const minRecirc = parseFloat(item['Min Recirc Rate (gpm)']);
                const maxRecirc = parseFloat(item['Max Recirc Rate (gpm)']);
                const tonnageMin = parseFloat(item['Tonnage Min']);
                const tonnageMax = parseFloat(item['Tonnage Max']);

                let matches = false;
                if (!isNaN(recircRate) && recircRate >= minRecirc && recircRate <= maxRecirc) {
                    matches = true;
                } else if (!isNaN(tonnage) && tonnage >= tonnageMin && tonnage <= tonnageMax) {
                    matches = true;
                }
                
                if (matches) {
                    if (item['Filter Type'] === 'Separator' && !foundSeparator) foundSeparator = item;
                    if (item['Filter Type'] === 'VAF' && !foundVAF) foundVAF = item;
                    if (item['Filter Type'] === 'Vortisand' && !foundVortisand) foundVortisand = item;
                }
            });

        } else if (selectedType === 'closed') {
            const systemVolume = parseFloat(systemVolumeInput.value);
            electricalCost = parseFloat(electricalCostClosedInput.value);

            if (isNaN(electricalCost) || electricalCost <= 0) {
                alert("Please enter a valid Electrical Cost for Closed System.");
                return;
            }
            if (isNaN(systemVolume) || systemVolume <= 0) {
                alert("Please enter a valid System Volume for Closed System.");
                return;
            }

            dbData.forEach(item => {
                const loopMin = parseFloat(item['Loop Min (Gal)']);
                const loopMax = parseFloat(item['Loop Max (Gal)']);
                
                if (!isNaN(systemVolume) && systemVolume >= loopMin && systemVolume <= loopMax) {
                    if (item['Filter Type'] === 'Separator' && !foundSeparator) foundSeparator = item;
                    if (item['Filter Type'] === 'VAF' && !foundVAF) foundVAF = item;
                    if (item['Filter Type'] === 'Vortisand' && !foundVortisand) foundVortisand = item;
                }
            });
        }

        displayResults(foundSeparator, foundVAF, foundVortisand, electricalCost);
    });

    function displayResults(separator, vaf, vortisand, electricalCost) {
        updateResultColumn('separatorResult', separator, electricalCost, 'Max Recirc Rate (gpm)');
        updateResultColumn('vafResult', vaf, electricalCost, 'Flowrate (gpm)');
        updateResultColumn('vortisandResult', vortisand, electricalCost, 'Flowrate (gpm)');
        resultsContainer.style.display = 'block';
    }

    function updateResultColumn(elementId, item, electricalCost, flowrateKey) {
        const column = document.getElementById(elementId);
        if (item) {
            const electricalUsage = parseFloat(item['Electrical Usage (kWh/yr)']); // Assuming kWh/yr
            const opCost = (!isNaN(electricalUsage) && !isNaN(electricalCost)) ? (electricalUsage * electricalCost).toFixed(2) : 'N/A';
            const flowrate = item[flowrateKey] || item['Flowrate (gpm)'] || item['Min Recirc Rate (gpm)'] +'-'+ item['Max Recirc Rate (gpm)'] || 'N/A';


            column.querySelector('.model').textContent = item.Model || 'N/A';
            column.querySelector('.flowrate').textContent = flowrate;
            column.querySelector('.description').textContent = item.Description || 'N/A';
            column.querySelector('.opCost').textContent = opCost;
        } else {
            column.querySelector('.model').textContent = 'No model found';
            column.querySelector('.flowrate').textContent = '-';
            column.querySelector('.description').textContent = '-';
            column.querySelector('.opCost').textContent = '-';
        }
    }

    // Initial fetch of data
    fetchData();
});