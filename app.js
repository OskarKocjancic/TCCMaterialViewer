var materialLibraryURL = "https://materials.tccbuilder.org/";
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
var whiteColor = getComputedStyle(document.documentElement).getPropertyValue("--light-white");
var datasets;
var minTemp = 0;
var maxTemp = 2000;
var currentShownProperty = "";

fetch(urlFlags).then((response) =>
	response.text().then((data) => {
		var materialsList = document.querySelector(".materialsList");
		materials = Papa.parse(data.trim(), { header: true }).data;
		materials.forEach((m) => {
			Object.keys(m).forEach((a) => (a !== "name" ? (m[a] = a != "" ? m[a] === "1" : m[a]) : a));
			console.log(m);
			m.properties = ["rho"];
			m.color = getRandomColor();
			fetch(materialLibraryURL + m.name + "/appInfo/" + "info.json")
				.then((response) =>
					response.text().then((data) => {
						Object.assign(m, JSON.parse(data));
					})
				)
				.then(() => {
					let unit = m.magnetocaloric ? "T" : m.electrocaloric ? "MVm" : "kbar";
					if (!m.cpFields && !m.cpThysteresis) {
						m.properties.push(`cp`);
					} else if (!m.cpFields && m.cpThysteresis) {
						m.properties.push(`cp_heating`);
						m.properties.push(`cp_cooling`);
					} else if (m.cpFields && !m.cpThysteresis)
						m.fields.forEach((field) => {
							if (field === "") return;
							field = m.electrocaloric ? field : field.toFixed(2);
							m.properties.push(`cp_${field}${unit}`);
						});
					else if (m.cpFields && m.cpThysteresis)
						m.fields.forEach((field) => {
							if (field === "") return;
							field = m.electrocaloric ? field : field.toFixed(2);
							m.properties.push(`cp_${field}${unit}_heating`);
							m.properties.push(`cp_${field}${unit}_cooling`);
						});
					// DISABLED FOR NOW
					// if (m.fields && m.dTThysteresis)
					// 	m.fields.forEach((field) => {
					// 		if (field != 0) {
					// 			m.properties.push(`dT_${field}${unit}_apply`);
					// 			m.properties.push(`dT_${field}${unit}_remove`);
					// 		}
					// 	});
					// else if (m.fields && !m.dTThysteresis)
					// 	m.fields.forEach((field) => {
					// 		if (field != 0) {
					// 			m.properties.push(`dT_${field}${unit}`);
					// 		}
					// 	});
					if (m.fields) {
						m.fields.forEach((field) => {
							if (field === "") return;
							field = m.electrocaloric ? field : field.toFixed(2);
							if (field != 0) {
								m.properties.push(`dT_${field}${unit}_apply`);
								m.properties.push(`dT_${field}${unit}_remove`);
							}
							1;
						});
					}

					if (m.kThysteresis) {
						m.properties.push(`k_heating`);
						m.properties.push(`k_cooling`);
					} else m.properties.push(`k`);
				})
				.then(() => {
					let materialContainer = makeMaterialContainer(m);
					materialsList.appendChild(materialContainer);

					var items = materialsList.childNodes;
					var itemsArr = [];
					for (var i in items) {
						if (items[i].nodeType == 1) {
							itemsArr.push(items[i]);
						}
					}
					itemsArr.sort(function (a, b) {
						return a.innerHTML == b.innerHTML ? 0 : a.innerHTML > b.innerHTML ? 1 : -1;
					});
					for (i = 0; i < itemsArr.length; ++i) {
						materialsList.appendChild(itemsArr[i]);
					}
					m.properties.forEach((p) => (!selectProperties.includes(p) ? selectProperties.push(p) : p));
				});
		});

		var select = document.querySelector(".selectProperties");
		select.onclick = () => {
			loadGraph(materials.filter((a) => a.properties.includes(select.value)).map((m) => m.name + "/appInfo/" + select.value));
		};
	})
);

function makeMaterialContainer(m) {
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
	loadProperties(m, propertiesContainer);

	materialContainer.appendChild(materialName);
	materialContainer.appendChild(propertiesContainer);
	return materialContainer;
}

function loadProperties(material, propertiesContainer) {
	var select = document.querySelector(".selectProperties");
	select.innerHTML = "";
	selectProperties.sort();
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
			if (currentShownProperty != "" && currentShownProperty != property.split("_")[0]) return;
			else currentShownProperty = property.split("_")[0];
			var name = material.name + "/appInfo/" + property;
			if (!button.classList.contains("activeMaterialProperty")) button.classList.add("activeMaterialProperty");
			else button.classList.remove("activeMaterialProperty");
			if (shownFiles.includes(name)) {
				shownFiles = shownFiles.filter((m) => m !== name);
				if (shownFiles.length == 0) reset();
			} else shownFiles.push(name);
			materials.forEach((m) => (m.shadeCounter = 0));
			loadGraph(shownFiles);
		};
	});
	material.shadeCounter = 0;
}
function applyRange() {
	const fromValue = from.value,
		toValue = to.value;
	const regex = /^\d+$/;

	minTemp = regex.test(fromValue) ? Math.round(parseFloat(fromValue)) : 0;
	maxTemp = regex.test(toValue) ? Math.round(parseFloat(toValue)) : 2000;

	if (chart != undefined) chart.destroy();

	chart = generateChart();
}

function generateChart() {
	return new Chart(ctx, {
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
						padding: 36,
						font: {
							size: 22,
						},
					},
				},

				y: {
					grid: {
						color: whiteColor,
					},
					ticks: {
						color: whiteColor,
					},
					type: "linear",
					position: "left",
					title: {
						display: true,
						text: getUnit(),
						color: whiteColor,
						padding: 36,
						font: {
							size: 22,
						},
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
	minTemp = 0;
	maxTemp = 2000;
	currentShownProperty = "";
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
			.then((response) => {
				console.log(response);
				if (!response.ok) return "0.0\n".repeat(20000);
				return response.text();
			})
			.then((data) => {
				var dataPoints = data.trim().split("\n");
				dataPoints = dataPoints.map((a) => parseFloat(a));

				var material = materials.find((m) => m.name === name.split("/")[0]);
				var value = name.split("/")[2].split("_")[0];
				var map = {
					cp: "specificHeatCapacity",
					rho: "density",
					k: "thermalConductivity",
					dT: "adiabaticTemperatureChange",
				};
				let rangeString = material.ranges[map[value]];
				var min = rangeString !== "" && rangeString != undefined ? parseFloat(rangeString.split("-")[0]) : 0;
				var max = rangeString !== "" && rangeString != undefined ? parseFloat(rangeString.split("-")[1]) : 2000;
				var newDataPoints = [];
				if (dataPoints.length == 1) {
					for (let i = 0; i < maxTemp; i++) {
						if (i > 285 && i < 302) newDataPoints.push(dataPoints[0]);
						else newDataPoints.push(null);
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
				for (let i = 0; i < newDataPoints.length; i++) {
					if (newDataPoints[i] > 15000) newDataPoints[i] = 16000;
					if (newDataPoints[i] < -15000) newDataPoints[i] = -16000;
					if (!(i > min && i < max) || newDataPoints[i] == 0) newDataPoints[i] = null;
				}

				material.shadeCounter++;

				//get number of properties that start with value
				properties = material.properties.filter((p) => p.split("_")[0] === value);

				return {
					label: names != shownFiles ? name.split("/")[0] : name.replace("/appInfo/", " - "),
					data: newDataPoints,
					fill: false,
					borderColor: getShadeOfColor(material.color, 1 + (material.shadeCounter / properties.length + 1)),
					tension: 0.1,
					value: value,
				};
			});
	});

	Promise.all(datasets).then((d) => {
		datasets = d.filter((p) => p.data.length > 1);
		if (chart != undefined) chart.destroy();
		chart = generateChart();
		canvas.style.display = "block";
	});
}

function getUnit() {
	let dataset = datasets[datasets.length - 1];
	if (dataset == undefined) return;

	switch (dataset.value) {
		case "k":
			return "Thermal Conductivity (W/(mK))";
		case "cp":
			return "Specific Heat Capacity (J/(kgK))";
		case "rho":
			return "Density (kg/m³)";
		case "dT":
			return "Adiabatic Temperature Change (K)";
		default:
			return "unknown unit";
	}
}

function getRandomColor() {
	const brightnessThreshold = 24;
	const letters = "0123456789ABCDEF";
	let color = "#";

	while (true) {
		for (let i = 0; i < 6; i++) {
			color += letters[Math.floor(Math.random() * 16)];
		}

		const r = parseInt(color.slice(1, 3), 16);
		const g = parseInt(color.slice(3, 5), 16);
		const b = parseInt(color.slice(5, 7), 16);

		const brightness = 0.299 * r + 0.587 * g + 0.114 * b;
		if (brightness >= brightnessThreshold) {
			return color;
			console.log(brightness);
		}

		color = "#";
	}
}
function getShadeOfColor(color, percent) {
	const f = parseInt(color.slice(1), 16);
	const t = percent < 0 ? 0 : 255;
	const p = percent < 0 ? percent * -1 : percent;
	const R = f >> 16;
	const G = (f >> 8) & 0x00ff;
	const B = f & 0x0000ff;
	return "#" + (0x1000000 + (Math.round((t - R) * p) + R) * 0x10000 + (Math.round((t - G) * p) + G) * 0x100 + (Math.round((t - B) * p) + B)).toString(16).slice(1);
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
