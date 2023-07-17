var urlFlags = "http://127.0.0.1:8888/materials_flags.csv";
var materials = [];
var chart;
var labels = [];
var shownFiles = [];
fetch(urlFlags).then((response) =>
	response.text().then((data) => {
		var materialsList = document.getElementById("materials-list");
		materials = Papa.parse(data, { header: true }).data;
		materials.forEach((m) => Object.keys(m).forEach((a) => (m[a] = a != "" ? m[a] === "1" : m[a])));
		materials.forEach((m) => (m["properties"] = []));
		materials.forEach((m) => {
			var li = document.createElement("li");
			var materialName = document.createElement("div");
			materialName.className = "materialName";
			materialName.innerHTML = m[""];
			materialName.onclick = () => {
				Array.from(document.getElementsByClassName("propertiesContainer")).forEach((c) => (c != propertiesContainer ? (c.style.display = "none") : {}));
				propertiesContainer.style.display = propertiesContainer.style.display == "none" ? "flex" : "none";
			};
			var propertiesContainer = document.createElement("div");
			propertiesContainer.className = "propertiesContainer";
			propertiesContainer.style.display = "none";
			m["properties"].push("k");
			m["properties"].push("rho");
			if (m.invariant) {
				m["properties"].push("cp");
			}
			if (m.magnetocaloric) {
				var url = "http://127.0.0.1:8888/materials_library/" + m[""] + "/" + "Fields.txt";
				fetch(url)
					.then((response) => response.text())
					.then((data) => {
						data.split("\n").forEach((prop) => {
							m["properties"].push(`cp_${prop}T`);
							if (!(prop == 0)) {
								m["properties"].push(`dT_${prop}T_heating`);
								m["properties"].push(`dT_${prop}T_cooling`);
							}
						});
						loadProperties(m, propertiesContainer);
					});
			}
			loadProperties(m, propertiesContainer);

			li.appendChild(materialName);
			li.appendChild(propertiesContainer);
			materialsList.appendChild(li);
		});
	})
);

function loadProperties(material, propertiesContainer) {
	propertiesContainer.innerHTML = "";
	material["properties"].forEach((property) => {
		var button = document.createElement("button");
		button.innerHTML = property;
		button.className = "materialProperty";
		propertiesContainer.appendChild(button);
		button.onclick = () => {
			var name = material[""] + "/" + property;
			if (shownFiles.includes(name)) shownFiles = shownFiles.filter((m) => m !== name);
			else shownFiles.push(name);

			if (!button.classList.contains("activeMaterialProperty")) button.classList.add("activeMaterialProperty");
			else button.classList.remove("activeMaterialProperty");
			loadGraph(shownFiles);
		};
	});
}

function clearShown() {
	shownFiles = [];
	if (chart != undefined) chart.destroy();
	document.querySelectorAll("button").forEach((button) => button.classList.remove("activeMaterialProperty"));
}
function loadGraph(names) {
	if (shownFiles.length == 0) {
		chart.destroy();
		return;
	}
	const ctx = document.getElementById("myChart").getContext("2d");

	const datasets = names.map((name) => {
		const url = "http://127.0.0.1:8888/materials_library/" + name + ".txt";
		return fetch(url)
			.then((response) => response.text())
			.then((data) => {
				const dataPoints = data.trim().split("\n");
				const newDataPoints = [];
				let i = 0;
				dataPoints.forEach((x) => {
					if (i % 1 === 0) {
						newDataPoints.push(x);
						labels.push(i * 0.1);
					}
					i++;
				});
				return {
					label: name,
					data: newDataPoints,
					fill: false,
					borderColor: getRandomColor(),
					tension: 0.1,
				};
			});
	});
	Promise.all(datasets).then((datasets) => {
		if (chart != undefined) chart.destroy();
		chart = new Chart(ctx, {
			type: "line",
			data: {
				labels: labels,
				datasets: datasets,
			},
			options: {
				elements: {
					point: {
						radius: 0,
					},
				},
				scales: {
					x: {
						type: "linear",
						position: "bottom",
					},
				},
				layout: {
					padding: {
						left: 0,
					},
				},
				plugins: {
					legend: {
						display: true,
						position: "top",
					},
				},
			},
		});
	});
}

function getRandomColor() {
	const letters = "0123456789ABCDEF";
	let color = "#";
	for (let i = 0; i < 6; i++) {
		color += letters[Math.floor(Math.random() * 16)];
	}
	return color;
}
