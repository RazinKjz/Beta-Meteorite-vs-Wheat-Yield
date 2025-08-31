let chartInstance;

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
        {
          label: "Wheat Yield (ton/ha)",
          data: wheatVals,
          backgroundColor: "rgba(54, 162, 235, 0.6)",
          yAxisID: "y1",
        },
        {
          label: "Meteorite Count",
          data: meteoriteVals,
          type: "line",
          borderColor: "rgba(255, 99, 132, 1)",
          backgroundColor: "rgba(255, 99, 132, 0.2)",
          yAxisID: "y2",
          tension: 0.3,
          fill: false,
        },
      ],
    },
    options: {
      responsive: true,
      interaction: { mode: "index", intersect: false },
      scales: {
        y1: { type: "linear", position: "left", title: { display: true, text: "Wheat Yield" } },
        y2: { type: "linear", position: "right", title: { display: true, text: "Meteorites" } },
      },
    },
  });
}
