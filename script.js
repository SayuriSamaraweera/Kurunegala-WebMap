// --- CONFIGURATION ---
// ⚠️ Replace these placeholders with your actual Gist ID and GitHub Token.
const GIST_ID = '8139cdcfea94fba32ef67f1f7beb9cb1'; 
const GITHUB_PAT = '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';

const mapCenter = [7.48, 80.36];
const mapZoom = 11;

// --- MAP INITIALIZATION ---
const map = L.map('map').setView(mapCenter, mapZoom);
const openStreetMap = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
}).addTo(map);

// --- DATA LAYERS ---
const landUseLayer = L.geoJSON(null);
const gndLayer = L.geoJSON(null, {
    style: { color: "#000000", weight: 2, fillOpacity: 0 }
});
const submittedPointsLayer = L.layerGroup().addTo(map);

// CORRECTED: Function to style land use layer using the 'OWNERSHIP' property from your file
function landUseStyler(feature) {
    switch (feature.properties.OWNERSHIP) {
        case 'Private': return { color: "#ff7800", weight: 1, opacity: 0.7 };
        case 'Government': return { color: "#4682B4", weight: 1, opacity: 0.7 };
        default: return { color: "#cccccc", weight: 1 };
    }
}

// CORRECTED: Fetching the new 'kurunegala_land_use.geojson' file
fetch('data/Kurunegala LU_G.geojson')
    .then(response => response.json())
    .then(data => {
        landUseLayer.addData(data);
        landUseLayer.setStyle(landUseStyler);
        landUseLayer.eachLayer(layer => {
            const props = layer.feature.properties;
            // CORRECTED: Using 'LU_DESC' and 'OWNERSHIP' properties from your file
            layer.bindPopup(`<b>DESCRIPTIO:</b> ${props.LU_DESC}<br><b>Ownership:</b> ${props.OWNERSHIP}`);
        });
        console.log("Land use layer loaded successfully.");
    }).catch(error => console.error('Error loading land use data:', error));

// CORRECTED: Fetching the new 'kurunegala_gnd.geojson' file
fetch('data/Fragmentation Kununegala_G.geojson')
    .then(response => response.json())
    .then(data => {
        gndLayer.addData(data);
        gndLayer.eachLayer(layer => {
            // CORRECTED: Using 'GND_N' property from your file for the GND name
            layer.bindPopup(`<b>GND_N:</b> ${layer.feature.properties.GND_N}`);
        });
        console.log("GND boundaries loaded successfully.");
    }).catch(error => console.error('Error loading GND boundaries:', error));

// --- LAYER CONTROL ---
const overlayMaps = {
    "Land Use": landUseLayer,
    "GND Boundaries": gndLayer,
    "Submitted Fragmentation Reports": submittedPointsLayer
};
L.control.layers(null, overlayMaps, { collapsed: false }).addTo(map);

// --- PUBLIC INTERACTION LOGIC --- (No changes needed here)
const gistURL = `https://api.github.com/gists/${GIST_ID}`;

function loadSubmittedPoints() {
    fetch(gistURL)
        .then(response => response.json())
        .then(data => {
            if (!data.files || !data.files['fragmentation_data.geojson']) throw new Error("Gist file not found.");
            const geojsonData = JSON.parse(data.files['fragmentation_data.geojson'].content);
            submittedPointsLayer.clearLayers();
            L.geoJSON(geojsonData, {
                onEachFeature: (feature, layer) => {
                    layer.bindPopup(`<b>Issue:</b> ${feature.properties.issue}<br><b>Description:</b> ${feature.properties.description}`);
                }
            }).addTo(submittedPointsLayer);
            console.log("Submitted points loaded from Gist.");
        })
        .catch(error => console.error('Error loading Gist data:', error));
}

function saveNewPoint(feature) {
    fetch(gistURL)
        .then(response => response.json())
        .then(data => {
            let geojson = JSON.parse(data.files['fragmentation_data.geojson'].content);
            geojson.features.push(feature);
            const updatePayload = { files: { 'fragmentation_data.geojson': { content: JSON.stringify(geojson, null, 2) } } };
            return fetch(gistURL, {
                method: 'PATCH',
                headers: { 'Authorization': `token ${GITHUB_PAT}`, 'Accept': 'application/vnd.github.v3+json' },
                body: JSON.stringify(updatePayload)
            });
        })
        .then(response => response.json())
        .then(() => {
            console.log("Gist updated successfully!");
            alert("Thank you! Your submission has been added.");
            loadSubmittedPoints();
        })
        .catch(error => {
            console.error('Error updating Gist:', error);
            alert("Sorry, there was an error submitting your data.");
        });
}

map.on('click', e => {
    const issueType = prompt("Enter the type of fragmentation issue:\n(e.g., Inheritance, Small Plot, Access Problem)");
    if (issueType) {
        const description = prompt("Enter a brief description (optional):");
        const newFeature = {
            type: "Feature",
            geometry: { type: "Point", coordinates: [e.latlng.lng, e.latlng.lat] },
            properties: { issue: issueType, description: description || "Not provided" }
        };
        saveNewPoint(newFeature);
    }
});

// --- INITIAL LOAD ---
loadSubmittedPoints();