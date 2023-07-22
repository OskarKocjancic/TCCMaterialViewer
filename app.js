var CORSproxy = "https://corsproxy.io/?";
var materialLibraryURL = CORSproxy + "http://materials.tccbuilder.org/";
var from = document.getElementById("from");
var to = document.getElementById("to");
var urlFlags = materialLibraryURL + "/materials_flags.csv";
var materials = [];
var chart;
var labels = [];
var shownFiles = [];
var selectProperties = ["k", "rho"];
fetch(urlFlags).then((response) =>
	response
		.text()
		.then((data) => {
			var materialsList = document.getElementById("materialsList");
			materials = Papa.parse(data, { header: true }).data;
			materials.forEach((m) => Object.keys(m).forEach((a) => (m[a] = a != "" ? m[a] === "1" : m[a])));
			materials.forEach((m) => (m["properties"] = []));
			materials.forEach((m) => {
				var materialContainer = document.createElement("div");
				materialContainer.className = "materialContainer";
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

					if (!selectProperties.includes("cp")) selectProperties.push("cp");
				}
				if (m.magnetocaloric) {
					var url = materialLibraryURL + m[""] + "/" + "Fields.txt";
					fetch(url)
						.then((response) => response.text())
						.then((data) => {
							data.split("\n").forEach((prop) => {
								m["properties"].push(`cp_${prop}T`);
								if (!selectProperties.includes(`cp_${prop}T`)) selectProperties.push(`cp_${prop}T`);
								if (!(prop == 0)) {
									m["properties"].push(`dT_${prop}T_heating`);
									m["properties"].push(`dT_${prop}T_cooling`);
									if (!selectProperties.includes(`dT_${prop}T_heating`)) selectProperties.push(`dT_${prop}T_heating`);
									if (!selectProperties.includes(`dT_${prop}T_cooling`)) selectProperties.push(`dT_${prop}T_cooling`);
								}
							});
							loadProperties(m, propertiesContainer);
						});
				}

				loadProperties(m, propertiesContainer);

				materialContainer.appendChild(materialName);
				materialContainer.appendChild(propertiesContainer);
				materialsList.appendChild(materialContainer);
			});

			var select = document.querySelector(".selectProperties");
			select.onclick = () => {
				if (chart != undefined) chart.destroy();
				var value = select.value.split("_")[0];
				var map = {
					cp: "specificHeatCapacity",
					rho: "density",
					k: "thermalConductivity",
					dT: "adiabaticTemperatureChange",
				};
				var minTemp = 2000;
				var maxTemp = 0;
				materials.forEach((m) => {
					if (m["range"][map[value]] !== undefined || m["range"][map[value]] !== "") {
						minTemp = Math.min(minTemp, parseInt(m["range"][map[value]].split("-")[0]));
						maxTemp = Math.max(maxTemp, parseInt(m["range"][map[value]].split("-")[1]));
					}
				});
				if (from.value !== "") minTemp = Math.round(from.value);
				if (to.value !== "") maxTemp = Math.round(to.value);
				loadGraph(
					materials.map((m) => m[""] + "/" + select.value),
					minTemp,
					maxTemp
				);
			};
		})
		.then(() => {
			materials.forEach((m) => {
				fetch(materialLibraryURL + "/" + m[""] + "/" + "Ranges.txt").then((response) =>
					response.text().then((data) => {
						m["range"] = JSON.parse(data);
					})
				);
			});
		})
);

function loadProperties(material, propertiesContainer) {
	var select = document.querySelector(".selectProperties");
	select.innerHTML = "";
	selectProperties.forEach((p) => {
		var option = document.createElement("option");
		option.value = p;
		option.innerHTML = p;
		select.appendChild(option);
	});
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
			var value = property.split("_")[0];
			var map = {
				cp: "specificHeatCapacity",
				rho: "density",
				k: "thermalConductivity",
				dT: "adiabaticTemperatureChange",
			};
			var minTemp = 0;
			var maxTemp = 2000;
			if (material["range"][map[value]] !== undefined || material["range"][map[value]] !== "") {
				minTemp = parseInt(material["range"][map[value]].split("-")[0]);
				maxTemp = parseInt(material["range"][map[value]].split("-")[1]);
			}
			if (from.value !== "") minTemp = Math.round(from.value);
			if (to.value !== "") maxTemp = Math.round(to.value);
			loadGraph(shownFiles, minTemp, maxTemp);
		};
	});
}

function reset() {
	from.value="";
	to.value="";
	shownFiles = [];
	if (chart != undefined) chart.destroy();
	document.querySelectorAll("button").forEach((button) => button.classList.remove("activeMaterialProperty"));
}

function loadGraph(names, from, to) {
	/* 	if ((shownFiles.length == 0) & (chart !== undefined)) {
		chart.destroy();
		return;
	} */
	const ctx = document.getElementById("myChart").getContext("2d");

	const datasets = names.map((name) => {
		const url = materialLibraryURL + name + ".txt";
		return fetch(url)
			.then((response) => response.text())
			.then((data) => {
				const dataPoints = data.trim().split("\n");
				const newDataPoints = [];
				let i = 0;
				dataPoints.forEach((x) => {
					if (i % 100 === 0) {
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
		datasets = datasets.filter((d) => d.data.length > 1);
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
						min: from,
						max: to,
					},
				},
				layout: {
					padding: {
						left: 0,
					},
				},
				plugins: {
					zoom: {
						limits: {
							x: { min: "original", max: "original" },
							y: { min: "original", max: "original" },
						},
						zoom: {
							wheel: {
								enabled: true,
							},
							pinch: {
								enabled: true,
							},
							mode: "xy",
						},
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
