var urlFlags = "http://127.0.0.1:8888/materials_flags.csv";
var materials = [];
var chart;

fetch(urlFlags).then((response) =>
	response.text().then((data) => {
		var materialsList = document.getElementById("materials-list");
		materials = Papa.parse(data, { header: true }).data;
		materials.forEach((m) => Object.keys(m).forEach((a) => (m[a] = a != "" ? m[a] === "1" : m[a])));

		materials.forEach((m) => {
			console.log(m);
			var li = document.createElement("li");
			li.innerHTML = "<a>" + m[""] + "</a>";

			var select = document.createElement("select");
			var files = [];
			files.push("&lt;select file&gt;");
			files.push("k");
			files.push("rho");
			if (m.invariant) {
				files.push("cp");
			}
			if (m.magnetocaloric) {
				var url = "http://127.0.0.1:8888/materials_library/" + m[""] + "/" + "Fields.txt";
				fetch(url)
					.then((response) => response.text())
					.then((data) => {
						data.split("\n").forEach((f) => {
							var file = "cp_" + f + "T";
							var option = document.createElement("option");
							option.innerHTML = "cp_" + f + "T";
							select.appendChild(option);
							option.onclick = () => {
								if (file !== "&lt;select file&gt;") loadGraph(m[""], file);
							};

							if (!(f == 0)) {
								file = "dT_" + f + "T_heating";
								option = document.createElement("option");
								option.innerHTML = "dT_" + f + "T_heating";
								select.appendChild(option);
								option.onclick = () => {
									if (file !== "&lt;select file&gt;") loadGraph(m[""], file);
								};

								file = "dT_" + f + "T_cooling";
								option = document.createElement("option");
								option.innerHTML = "dT_" + f + "T_cooling";
								select.appendChild(option);
								option.onclick = () => {
									if (file !== "&lt;select file&gt;") loadGraph(m[""], file);
								};
							}
						});

					});
			}
			files.forEach((file) => {
				var option = document.createElement("option");
				option.innerHTML = file;
				select.appendChild(option);
				option.onclick = () => {
					if (file !== "&lt;select file&gt;") loadGraph(m[""], file);
				};
			});

			li.appendChild(select);
			materialsList.appendChild(li);
		});
	})
);

function loadGraph(name, property) {
	const proxyUrl = "https://cors-anywhere.herokuapp.com/";
	const fileUrl = "http://www.app.tccbuilder.org/war/circuitjs1/material_data/materials/Gd/k.txt";
	var url = proxyUrl + fileUrl;
	url = "http://127.0.0.1:8888/materials_library/" + name + "/" + property + ".txt";
	fetch(url)
		.then((response) => response.text())
		.then((data) => {
			var dataPoints = data.trim().split("\n");
			var labels = [];
			var i = 0;
			var newDataPoints = [];
			dataPoints.forEach((x) => {
				if (i % 100 == 0) {
					newDataPoints.push(x);
					labels.push(i * 0.1);
				}
				i++;
			});
			const ctx = document.getElementById("myChart").getContext("2d");
			if (chart != undefined) chart.destroy();
			chart = new Chart(ctx, {
				type: "line",
				data: {
					labels: labels,
					datasets: [
						{
							label: property,
							data: newDataPoints,
							fill: false,
							borderColor: "red",
							tension: 0.1,
						},
					],
				},
				options: {
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
				},
			});
		})
		.catch((error) => {
			console.log(error);
		});
}
