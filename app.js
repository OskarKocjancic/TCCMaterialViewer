var materialLibraryURL = "https://materials.tccbuilder.org/";
// var materialLibraryURL = "http://127.0.0.1:5555/";
var from = document.getElementById("from");
var to = document.getElementById("to");
var fromSlider = document.getElementById("fromSlider");
var toSlider = document.getElementById("toSlider");
var min = document.getElementById("min");
var max = document.getElementById("max");
var minSlider = document.getElementById("minSlider");
var maxSlider = document.getElementById("maxSlider");
var ranges = document.querySelector(".ranges");
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
var minTemp = null;
var maxTemp = null;
var maxScale = null;
var minScale = null;

var currentShownProperty = "";
var server;
var promisedFiles = [];

db.open({
	server: "database",
	version: 1,
	schema: {
		files: {
			key: { keyPath: "url" },
			indexes: {
				answer: { unique: true },
			},
		},
	},
})
	.then(function (s) {
		server = s;
	})
	.then(
		fetch(urlFlags).then((response) =>
			response.text().then((data) => {
				var materialsList = document.querySelector(".materialsList");
				materials = Papa.parse(data.trim(), { header: true }).data;
				let promises = [];
				materials.forEach((m) => {
					Object.keys(m).forEach((a) => (a !== "name" ? (m[a] = a != "" ? m[a] === "1" : m[a]) : a));
					m.properties = ["rho"];
					m.color = getRandomColor();
					promises.push(
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
							})
					);
				});
				Promise.all(promises).then(() => {
					materials.forEach((m) => fetchAllFiles(m));
					Promise.all(promisedFiles).then(() => {
						document.querySelector(".loadingScreen").style.display = "none";
					});
				});

				var select = document.querySelector(".selectProperties");
				select.onchange = () => {
					fetchDatasets(
						materials.filter((a) => a.properties.includes(select.value)).map((m) => m.name + "/appInfo/" + select.value),
						(d) => {
							datasets = d.filter((p) => p.data.length > 1);
							canvas.style.display = "block";
							document.querySelector("#loading").style.display = "none";
							generateChart();
						}
					);
				};
			})
		)
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
	var option = document.createElement("option");
	option.innerHTML = "Select your option";
	option.disabled = true;
	option.selected = true;
	select.appendChild(option);
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

			if (shownFiles.length > 0)
				fetchDatasets(shownFiles, (d) => {
					datasets = d.filter((p) => p.data.length > 1);

					materials.forEach((m) => {
						m.temp_color = undefined;
					});
					canvas.style.display = "block";
					document.querySelector("#loading").style.display = "none";
					generateChart();
				});
		};
	});
}
function applyRange() {
	const regex = /^-?\d+$/;

	from.style.border = regex.test(from.value) ? "1px solid #ccc" : "1px solid red";
	to.style.border = regex.test(to.value) ? "1px solid #ccc" : "1px solid red";
	max.style.border = regex.test(max.value) ? "1px solid #ccc" : "1px solid red";
	min.style.border = regex.test(min.value) ? "1px solid #ccc" : "1px solid red";

	minTemp = regex.test(from.value) ? parseFloat(from.value) : minTemp;
	maxTemp = regex.test(to.value) ? parseFloat(to.value) : maxTemp;
	minScale = regex.test(min.value) ? parseFloat(min.value) : minScale;
	maxScale = regex.test(max.value) ? parseFloat(max.value) : maxScale;

	updateChartScales();
}

function updateChartScales() {
	if (chart != undefined) {
		chart.options.scales.x.min = Math.floor(minTemp);
		chart.options.scales.x.max = Math.ceil(maxTemp);
		chart.options.scales.y.min = Math.floor(minScale);
		chart.options.scales.y.max = Math.ceil(maxScale);
		chart.update();
	}
}

function generateChart() {
	const config = {
		type: "line",
		data: {
			labels: labels,
			datasets: datasets,
		},

		options: {
			parsing: false,
			animation: false,
			elements: {
				point: {
					radius: 3,
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
				decimation: {
					enabled: true,
					algorithm: "lttb",
					samples: 100,
					threshold: 100,
				},
				draggable: {
					enabled: true,
				},
			},
		},
	};
	if (Chart.getChart("myChart")) {
		Chart.getChart("myChart").destroy();
	}
	chart = new Chart(ctx, config);

	updateChartScales();

	fromSlider.max = chart.scales.x.max;
	fromSlider.min = chart.scales.x.min;
	from.value = chart.scales.x.min;
	fromSlider.value = chart.scales.x.min;

	toSlider.max = chart.scales.x.max;
	toSlider.min = chart.scales.x.min;
	to.value = chart.scales.x.max;
	toSlider.value = chart.scales.x.max;

	maxSlider.max = chart.scales.y.max;
	maxSlider.min = chart.scales.y.min;
	max.value = chart.scales.y.max;
	maxSlider.value = chart.scales.y.max;

	minSlider.max = chart.scales.y.max;
	minSlider.min = chart.scales.y.min;
	min.value = chart.scales.y.min;
	minSlider.value = chart.scales.y.min;

	ranges.style.display = 'flex';
}

function reset() {
	minScale = maxScale = minTemp = maxTemp = null;
	from.value = to.value = min.value = max.value = "-";
	fromSlider.value = toSlider.value = minSlider.value = maxSlider.value = null;
	currentShownProperty = "";
	shownFiles = [];
	if (chart != undefined) chart.destroy();
	document.querySelectorAll("button").forEach((button) => button.classList.remove("activeMaterialProperty"));
}
function reload() {
	server.files.clear();
	location.reload();
}

function getFile(name, url) {
	return new Promise((resolve, reject) => {
		server.files.get(name).then(function (results) {
			if (results !== undefined) {
				// console.log(`${name} already in database`);
				resolve(results.data);
			} else {
				fetch(url)
					.then((response) => {
						if (!response.ok) {
							console.log(name + " not found");
							return "0.0\n".repeat(20000);
						} else return response.text();
					})
					.then((data) => {
						server.files.add({
							url: name,
							data: data,
						});
						console.log(`added ${name} database`);
						resolve(data);
					})
					.catch((error) => reject(error));
			}
		});
	});
}

async function fetchAllFiles(m) {
	m.properties.forEach((p) => {
		promisedFiles.push(getFile(m.name + "/appInfo/" + p + ".txt", materialLibraryURL + m.name + "/appInfo/" + p + ".txt"));
		promisedFiles[promisedFiles.length - 1].then((data) => {});
	});
}

async function fetchDatasets(names, callback) {
	document.querySelector("#loading").style.display = "block";
	canvas.style.display = "none";
	minTemp = maxTemp = minScale = maxScale = null;
	datasets = names.map(async (name) => {
		const url = materialLibraryURL + name + ".txt";
		var data = await getFile(name + ".txt", url);
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

		if (dataPoints.length > 1 && dataPoints.length < 20000) console.log(name, " has less than 20000 data points.");

		if (dataPoints.length == 1) {
			let roomTemp = dataPoints[0];
			dataPoints = [];
			for (let i = 0; i < 20000; i++) {
				if (i > 2850 && i < 3020) dataPoints.push(roomTemp);
				else dataPoints.push(null);
				labels.push(i);
			}
		}

		let labeledDataPoints = [];
		for (let i = 0; i < dataPoints.length; i++) {
			if (dataPoints[i] > 15000) dataPoints[i] = 16000;
			if (dataPoints[i] < -15000) dataPoints[i] = -16000;
			if (i > min * 10 && i < max * 10 && dataPoints[i] != null) {
				labeledDataPoints.push({
					x: i / 10,
					y: dataPoints[i],
				});
				let tempValue = i / 10;
				let scaleValue = dataPoints[i];

				if (minTemp == null || minTemp > tempValue) minTemp = tempValue;
				if (maxTemp == null || maxTemp < tempValue) maxTemp = tempValue;

				if (maxScale == null || maxScale < scaleValue) maxScale = scaleValue;
				if (minScale == null || minScale > scaleValue) minScale = scaleValue;
			}
		}

		if (minTemp == maxTemp) {
			minTemp = minTemp - 1;
			maxTemp = maxTemp + 1;
		}
		if (minScale == maxScale) {
			minScale = minScale - 1;
			maxScale = maxScale + 1;
		}

		material.temp_color = changeShadeOfColor(material.temp_color || material.color, 10);

		return {
			type: "line",
			indexAxis: "x",
			label: names != shownFiles ? name.split("/")[0] : name.replace("/appInfo/", " - "),
			data: labeledDataPoints,
			fill: false,
			borderColor: material.temp_color,
			backgroundColor: material.temp_color,
			tension: 1,
			value: value,
		};
	});

	Promise.all(datasets).then(callback);
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
function changeShadeOfColor(color, amount) {
	return "#" + color.replace(/^#/, "").replace(/../g, (color) => ("0" + Math.min(255, Math.max(0, parseInt(color, 16) + amount)).toString(16)).substr(-2));
}
function getRandomColor() {
	const brightnessThreshold = 16;
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
		}

		color = "#";
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

function syncInputsWithSliders() {
	if (chart == undefined) return;

	from.value = fromSlider.value;
	to.value = toSlider.value;
	min.value = minSlider.value;
	max.value = maxSlider.value;
	// if (from.value > to.value) {
	// 	from.value = to.value;
	// 	fromSlider.value = toSlider.value;
	// }
	applyRange();
}

function syncSlidersWithInputs() {
	let fromValue = Number(from.value);
	let toValue = Number(to.value);
	let minValue = Number(min.value);
	let maxValue = Number(max.value);

	if (fromSlider.max < fromValue) {
		fromSlider.max = fromValue;
	} else if (fromSlider.min > fromValue) fromSlider.min = fromValue;

	if (toSlider.max < toValue) toSlider.max = toValue;
	else if (toSlider.min > toValue) toSlider.min = toValue;

	if (minSlider.max < minValue) minSlider.max = minValue;
	else if (minSlider.min > minValue) minSlider.min = minValue;

	if (maxSlider.max < maxValue) maxSlider.max = maxValue;
	else if (maxSlider.min > maxValue) maxSlider.min = maxValue;

	maxSlider.value = maxValue;
	minSlider.value = minValue;
	toSlider.value = toValue;
	fromSlider.value = fromValue;

	applyRange();
}
