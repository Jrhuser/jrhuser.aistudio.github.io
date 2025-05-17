function showOpenFields() {
    document.getElementById('openFields').style.display = 'block';
    document.getElementById('closedFields').style.display = 'none';
}

function showClosedFields() {
    document.getElementById('openFields').style.display = 'none';
    document.getElementById('closedFields').style.display = 'block';
}

function calculateSelection() {
    const systemType = document.querySelector('input[name="systemType"]:checked').value;
    let recircRate = parseFloat(document.getElementById('recircRate').value);
    let tonnage = parseFloat(document.getElementById('tonnage').value);
    let systemVolume = parseFloat(document.getElementById('systemVolume').value);
    let electricalCost = parseFloat(document.getElementById(systemType === 'Open' ? 'electricalCostOpen' : 'electricalCostClosed').value);

    fetch('https://docs.google.com/spreadsheets/d/e/2PACX-1vT216WTQadamMw4sIIFvBuWNWe69BCz3GedD5Ahcy3i187k9XGtiBve_yUiDc7jtqYZjtB4mrgDPnbK/pub?gid=0&single=true&output=csv')
        .then(response => response.text())
        .then(csv => {
            const data = Papa.parse(csv, { header: true }).data;
            console.log("Fetched Data:", data); // Debugging: Check the fetched data

            const filtered = data.filter(item => {
                if (systemType === 'Open') {
                    console.log("Checking Open Criteria:", recircRate, tonnage, item["Min Recirc (gallons)"], item["Max Recirc (gallons)"], item["Tonnage Min"], item["Tonnage Max"]);
                    return (
                        (recircRate && recircRate >= item["Min Recirc (gallons)"] && recircRate <= item["Max Recirc (gallons)"]) ||
                        (tonnage && tonnage >= item["Tonnage Min"] && tonnage <= item["Tonnage Max"])
                    );
                } else {
                    console.log("Checking Closed Criteria:", systemVolume, item["Loop Min"], item["Loop Max"]);
                    return systemVolume >= item["Loop Min"] && systemVolume <= item["Loop Max"];
                }
            });

            console.log("Filtered Data:", filtered); // Debugging: Check the filtered data

            const types = ["Separator", "VAF", "Vortisand"];
            const resultsHTML = types.map(type => {
                const model = filtered.find(item => item["Filter Type"] === type);
                if (!model) return `<div class="result-item"><h3>${type}</h3><p>No matching model found.</p></div>`;
                const cost = (model.hp * 0.7457 * 8760 * electricalCost).toFixed(2);
                return `
                    <div class="result-item">
                        <h3>${type}</h3>
                        <p><strong>Model:</strong> ${model.Model}</p>
                        <p><strong>Flow Rate:</strong> ${model["Flow Rate"]} gpm</p>
                        <p><strong>Operating Cost:</strong> $${cost}/year</p>
                        <p><strong>Description:</strong> ${model.Description}</p>
                    </div>
                `;
            }).join("");

            document.getElementById('results').innerHTML = resultsHTML;
        });
}
