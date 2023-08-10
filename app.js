var CORSproxy = "https://corsproxy.io/?";
var materialLibraryURL = CORSproxy + "http://materials.tccbuilder.org/";
//materialLibraryURL = "http://127.0.0.1:8888/";
var from = document.getElementById("from");
var to = document.getElementById("to");
const canvas = document.getElementById("myChart");
const ctx = canvas.getContext("2d");
var urlFlags = materialLibraryURL + "materials_flags.csv";
var materials = [];
var chart;
var labels = [];
var shownFiles = [];
var selectProperties = ["rho"];
var whiteColor = getComputedStyle(document.documentElement).getPropertyValue("--white");
var datasets;
var minTemp = 0;
var maxTemp = 2000;

fetch(urlFlags).then((response) =>
	response.text().then((data) => {
		var materialsList = document.querySelector(".materialsList");
		materials = Papa.parse(data.trim(), { header: true }).data;
		materials.forEach((m) => {
			Object.keys(m).forEach((a) => (a !== "name" ? (m[a] = a != "" ? m[a] === "1" : m[a]) : a));
			m.properties = ["rho"];
			fetch(materialLibraryURL + m.name + "/appInfo/" + "info.json").then((response) =>
				response.text().then((data) => {
					Object.assign(m, JSON.parse(data));
				})
			);
			m.color = getRandomColor();
			if (m.invariant) {
				m.properties.push("cp");
				m.properties.push(`k`);
			} else if (m.magnetocaloric || m.barocaloric || m.elastocaloric || m.electrocaloric) {
				var url = materialLibraryURL + m.name + "/appInfo/" + "Fields.txt";
				fetch(url)
					.then((response) => response.text())
					.then((data) => {
						data.split("\n").forEach((field) => {
							if (field === "") return;
							if (m.cpThysteresis) {
								m.properties.push(`cp_${field}T_heating`);
								m.properties.push(`cp_${field}T_cooling`);
							} else {
								m.properties.push(`cp_${field}T`);
							}
							if (field != 0) {
								if (m.dTThysteresis) {
									m.properties.push(`dT_${field}T_heating`);
									m.properties.push(`dT_${field}T_cooling`);
								} else {
									m.properties.push(`dT_${field}T`);
								}
							}
						});
						if (m.kThysteresis) {
							m.properties.push(`k_heating`);
							m.properties.push(`k_cooling`);
						} else {
							m.properties.push(`k`);
						}
						m.properties.sort();
						m.properties.forEach((p) => (!selectProperties.includes(p) ? selectProperties.push(p) : p));
						loadProperties(m, propertiesContainer);
					});
			} else {
				if (m.kThysteresis) {
					m.properties.push(`k_heating`);
					m.properties.push(`k_cooling`);
				} else {
					m.properties.push(`k`);
				}
			}
			var materialContainer = document.createElement("div");
			materialContainer.className = "materialContainer";
			var materialName = document.createElement("div");
			materialName.className = "materialName";
			materialName.innerHTML = m["name"];
			materialName.onclick = () => {
				Array.from(document.getElementsByClassName("propertiesContainer")).forEach((c) => (c != propertiesContainer ? (c.style.display = "none") : {}));
				propertiesContainer.style.display = propertiesContainer.style.display == "none" ? "flex" : "none";
			};

			var propertiesContainer = document.createElement("div");
			propertiesContainer.className = "propertiesContainer";
			propertiesContainer.style.display = "none";

			materialContainer.appendChild(materialName);
			materialContainer.appendChild(propertiesContainer);
			materialsList.appendChild(materialContainer);

			m.properties.forEach((p) => (!selectProperties.includes(p) ? selectProperties.push(p) : p));
			loadProperties(m, propertiesContainer);
		});

		var select = document.querySelector(".selectProperties");
		select.onclick = () => {
			loadGraph(materials.filter((a) => a.properties.includes(select.value)).map((m) => m.name + "/appInfo/" + select.value));
		};
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
	material.properties.forEach((property) => {
		var button = document.createElement("button");
		button.innerHTML = property;
		button.className = "materialProperty";
		propertiesContainer.appendChild(button);
		button.onclick = () => {
			var name = material.name + "/appInfo/" + property;
			if (shownFiles.includes(name)) shownFiles = shownFiles.filter((m) => m !== name);
			else shownFiles.push(name);

			if (!button.classList.contains("activeMaterialProperty")) button.classList.add("activeMaterialProperty");
			else button.classList.remove("activeMaterialProperty");
			loadGraph(shownFiles);
		};
	});
}
function applyRange() {
	const fromValue = from.value,
		toValue = to.value;
	const regex = /^\d+$/;

	minTemp = regex.test(fromValue) ? Math.round(parseFloat(fromValue)) : 0;
	maxTemp = regex.test(toValue) ? Math.round(parseFloat(toValue)) : 2000;

	console.log(regex, minTemp, maxTemp);
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
					grid: {
						color: whiteColor,
					},
					ticks: {
						color: whiteColor,
					},
					type: "linear",
					position: "bottom",
					min: minTemp,
					max: maxTemp,
					title: {
						display: true,
						text: "Temperature (K)",
						color: whiteColor,
					},
				},

				y: {
					grid: {
						color: whiteColor,
					},
					ticks: {
						color: whiteColor,
					},
				},
			},
			layout: {
				padding: {
					left: 0,
				},
			},
			plugins: {
				legend: {
					align: "start",
					position: "right",
					display: true,
					labels: {
						color: whiteColor,
					},
				},
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
}

function reset() {
	from.value = "";
	to.value = "";
	shownFiles = [];
	if (chart != undefined) chart.destroy();
	document.querySelectorAll("button").forEach((button) => button.classList.remove("activeMaterialProperty"));
}

function loadGraph(names) {
	/* 	if ((shownFiles.length == 0) & (chart !== undefined)) {
		chart.destroy();
		return;
	} */
	datasets = names.map((name) => {
		const url = materialLibraryURL + name + ".txt";
		return fetch(url)
			.then((response) => response.text())
			.then((data) => {
				var dataPoints = data.trim().split("\n");
				dataPoints = dataPoints.map((a) => parseFloat(a));
				var newDataPoints = [];
				if (dataPoints.length == 1) {
					for (let i = 0; i < maxTemp; i++) {
						newDataPoints.push(dataPoints[0]);
						labels.push(i);
					}
				} else {
					for (let i = 0; i < dataPoints.length; i++) {
						if (i % 10 == 0) {
							newDataPoints.push(dataPoints[i]);
							labels.push(i * 0.1);
						}
					}
				}
				var material = materials.find((m) => m.name === name.split("/")[0]);
				var value = name.split("/")[2].split("_")[0];
				var map = {
					cp: "specificHeatCapacity",
					rho: "density",
					k: "thermalConductivity",
					dT: "adiabaticTemperatureChange",
				};
				if (material.ranges[map[value]] !== undefined || material.ranges[map[value]] !== "") {
					var min = parseFloat(material.ranges[map[value]].split("-")[0]);
					var max = parseFloat(material.ranges[map[value]].split("-")[1]);
					for (let i = 0; i < newDataPoints.length; i++) {
						if (!(i > min && i < max)) newDataPoints[i] = null;
					}
				}
				return {
					label: name.replace("/appInfo/", " - "),
					data: newDataPoints,
					fill: false,
					borderColor: material.color,
					tension: 0.1,
				};
			});
	});
	Promise.all(datasets).then((d) => {
		datasets = d.filter((p) => p.data.length > 1);
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
						grid: {
							color: whiteColor,
						},
						ticks: {
							color: whiteColor,
						},
						type: "linear",
						position: "bottom",
						min: minTemp,
						max: maxTemp,
						title: {
							display: true,
							text: "Temperature (K)",
							color: whiteColor,
						},
					},

					y: {
						grid: {
							color: whiteColor,
						},
						ticks: {
							color: whiteColor,
						},
						min: 0,
					},
				},
				layout: {
					padding: {
						left: 0,
					},
				},
				plugins: {
					legend: {
						align: "start",
						position: "right",
						display: true,
						labels: {
							color: whiteColor,
						},
					},
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
		canvas.style.display = "block";
	});
}

function getRandomColor() {
	const brightnessThreshold = 64; // Adjust this threshold to control brightness
	const letters = "0123456789ABCDEF";
	let color = "#";

	while (true) {
		for (let i = 0; i < 6; i++) {
			color += letters[Math.floor(Math.random() * 16)];
		}

		const r = parseInt(color.slice(1, 3), 16);
		const g = parseInt(color.slice(3, 5), 16);
		const b = parseInt(color.slice(5, 7), 16);

		// Calculate brightness using the relative luminance formula
		const brightness = 0.299 * r + 0.587 * g + 0.114 * b;

		if (brightness >= brightnessThreshold) {
			return color;
		}

		color = "#"; // Reset the color if it's not bright enough
	}
}

function showCompare() {
	document.querySelector(".materialsList").style.display = "none";
	document.querySelector(".propertyCompare").style.display = "flex";
	document.getElementById("comparisonButton").classList.add("selectedButton");
	document.getElementById("manualButton").classList.remove("selectedButton");
	reset();
}
function showManual() {
	document.querySelector(".materialsList").style.display = "flex";
	document.querySelector(".propertyCompare").style.display = "none";
	document.getElementById("comparisonButton").classList.remove("selectedButton");
	document.getElementById("manualButton").classList.add("selectedButton");
	reset();
}
