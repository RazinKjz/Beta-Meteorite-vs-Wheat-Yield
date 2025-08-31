const map = L.map("map").setView([20, 0], 2);
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: 18,
}).addTo(map);

const markers = L.markerClusterGroup();
map.addLayer(markers);


let meteoriteData = [];
let wheatData = [];
let wheatByCountryYear = {};
let meteoritesByCountryYear = {};
let chartInstance, scatterInstance;

Papa.parse("meteorite-landings.csv", {
  header: true,
  download: true,
  complete: function (results) {
    meteoriteData = results.data.filter(d => d.reclat && d.reclong && d.year);

    meteoriteData.forEach(d => {
      d.year = new Date(d.year).getFullYear();
      d.reclat = +d.reclat;
      d.reclong = +d.reclong;

      const country = d.recclass || "Unknown";
      const year = d.year;
      if (!meteoritesByCountryYear[country]) meteoritesByCountryYear[country] = {};
      meteoritesByCountryYear[country][year] =
        (meteoritesByCountryYear[country][year] || 0) + 1;
    });

    loadWheatData();
  },
});

function loadWheatData() {
  Papa.parse("wheat-yield.csv", {
    header: true,
    download: true,
    complete: function (results) {
      wheatData = results.data;

      wheatData.forEach(d => {
        const country = d.Entity;
        const year = +d.Year;
        const yieldVal = +d["Wheat yield"];
        if (!wheatByCountryYear[country]) wheatByCountryYear[country] = {};
        wheatByCountryYear[country][year] = yieldVal;
      });

      populateCountryDropdown();
      updateMap(1985);
      const defaultCountry = document.getElementById("countrySelect").value;
      if (defaultCountry) {
        updateChart(defaultCountry, 1985);
        updateScatter(defaultCountry);
        updateStats(defaultCountry);
      }
    },
  });
}
function populateCountryDropdown() {
  const countrySelect = document.getElementById("countrySelect");
  countrySelect.innerHTML = "";

  const uniqueCountries = [...new Set(wheatData.map(d => d.Entity))].sort();
  uniqueCountries.forEach(country => {
    const opt = document.createElement("option");
    opt.value = country;
    opt.textContent = country;
    countrySelect.appendChild(opt);
  });

  countrySelect.addEventListener("change", function () {
    const year = +document.getElementById("yearRange").value;
    updateChart(this.value, year);
    updateScatter(this.value);
    updateStats(this.value);
    zoomToCountry(this.value);
  });
}

function updateMap(year) {
  markers.clearLayers();
  meteoriteData
    .filter(d => d.year === year)
    .forEach(d => {
      const marker = L.circleMarker([d.reclat, d.reclong], {
        radius: 6,
        color: "red",
        fillOpacity: 0.6,
      }).bindPopup(`<b>${d.name}</b><br>Year: ${d.year}`);
      markers.addLayer(marker);
    });
}

function zoomToCountry(country) {
  fetch(`https://nominatim.openstreetmap.org/search?country=${country}&format=geojson`)
    .then(res => res.json())
    .then(data => {
      if (data.features.length > 0) {
        const bbox = data.features[0].bbox;
        map.fitBounds([
          [bbox[1], bbox[0]],
          [bbox[3], bbox[2]],
        ]);
      }
    });
}
function updateChart(country, year) {
  const ctx = document.getElementById("wheatChart").getContext("2d");
  const wheatVals = [];
  const meteoriteVals = [];
  const years = [];

  for (let y = year - 10; y <= year; y++) {
    years.push(y);
    wheatVals.push(wheatByCountryYear[country]?.[y] || 0);
    meteoriteVals.push(meteoritesByCountryYear[country]?.[y] || 0);
  }

  if (chartInstance) chartInstance.destroy();

  chartInstance = new Chart(ctx, {
    type: "bar",
    data: {
      labels: years,
      datasets: [
        { label: "Wheat Yield (ton/ha)", data: wheatVals, backgroundColor: "rgba(54, 162, 235, 0.6)", yAxisID: "y1" },
        { label: "Meteorite Count", type: "line", data: meteoriteVals, borderColor: "rgba(255, 99, 132, 1)", backgroundColor: "rgba(255, 99, 132, 0.2)", yAxisID: "y2", tension: 0.3, fill: false },
      ],
    },
    options: { responsive: true, interaction: { mode: "index", intersect: false },
      scales: {
        y1: { type: "linear", position: "left", title: { display: true, text: "Wheat Yield" } },
        y2: { type: "linear", position: "right", title: { display: true, text: "Meteorites" } },
      },
    },
  });
}

function updateScatter(country) {
  const ctx = document.getElementById("scatterChart").getContext("2d");
  const points = [];

  const years = Object.keys(wheatByCountryYear[country] || {});
  years.forEach(year => {
    const yieldVal = wheatByCountryYear[country][year];
    const meteorVal = meteoritesByCountryYear[country]?.[year] || 0;
    if (yieldVal) {
      points.push({ x: yieldVal, y: meteorVal });
    }
  });

  if (scatterInstance) scatterInstance.destroy();

  scatterInstance = new Chart(ctx, {
    type: "scatter",
    data: { datasets: [{ label: "Yield vs Meteorites", data: points, backgroundColor: "rgba(75, 192, 192, 0.6)" }] },
    options: {
      scales: {
        x: { title: { display: true, text: "Wheat Yield" } },
        y: { title: { display: true, text: "Meteorite Count" } }
      }
    }
  });
}

function updateStats(country) {
  const statsDiv = document.getElementById("stats");
  const yields = Object.values(wheatByCountryYear[country] || []);
  const meteors = Object.values(meteoritesByCountryYear[country] || []);

  const avg = arr => arr.length ? (arr.reduce((a,b) => a+b,0)/arr.length).toFixed(2) : 0;
  const min = arr => arr.length ? Math.min(...arr) : 0;
  const max = arr => arr.length ? Math.max(...arr) : 0;

  statsDiv.innerHTML = `
    <b>Stats for ${country}</b><br>
    Wheat Yield → Min: ${min(yields)}, Max: ${max(yields)}, Avg: ${avg(yields)}<br>
    Meteorites → Min: ${min(meteors)}, Max: ${max(meteors)}, Avg: ${avg(meteors)}
  `;
}

document.getElementById("yearRange").addEventListener("input", function () {
  const year = +this.value;
  document.getElementById("selectedYear").textContent = year;

  updateMap(year);

  const country = document.getElementById("countrySelect").value;
  if (country) {
    updateChart(country, year);
    updateScatter(country);
    updateStats(country);
  }
});
