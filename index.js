var express = require('express');
var app = express();
var mysql = require('mysql');
var pug = require('pug');
var bodyParser = require('body-parser');
app.set('view engine', 'pug');
app.use(express.static('public'));
var requestify = require('requestify');
var CronJob = require('cron').CronJob;

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

var estaciones = [];
var sensores = [];
var mediciones = [];
var medicionesayer = [];
prom8 = {};
prom12 = {};
cronJob();
function cronJob() {
	var now = new Date();
	listApi("stations", "estaciones", function(){
		estaciones.forEach(function(value, index){
			prom8[value.Id] = {};
			prom12[value.Id] = {};
			listApi("stations/"+value.Id, "sensores", function(){
				sensores.forEach(function(value2, index2){
					get = "sensors/" + value.Id + "/" + value2.Id + "/" + now.getFullYear() + "/" + (now.getMonth() + 1) + "/" + now.getDate();
					listApi(get, "mediciones", function(){
						get = "sensors/" + value.Id + "/" + value2.Id + "/" + now.getFullYear() + "/" + (now.getMonth() + 1) + "/" + (now.getDate()-1);
						if (mediciones.length >= 48){
							sum = 0;
							for (i = mediciones.length-1; i >= mediciones.length - 48; i--) {
								sum += parseFloat(mediciones[i].State);
							}
							prom12[value.Id][value2.Id] = sum/48;
							sum = 0;
							for (i = mediciones.length-1; i >= mediciones.length - 32; i--){
								sum += mediciones[i].State;
							}
							prom8[value.Id][value2.Id] = (sum/32);
						}
						else if (mediciones.length >= 32){
							console.log("Hay mas o menos suficientes");
							sum = 0;
							for (i = mediciones.length-1; i >= mediciones.length - 32; i--){
								sum += mediciones[i].State;
							}
							prom8[value.Id][value2.Id]  = (sum/32);
							listApi(get, "medicionesayer", function(){
								sum = 0;
								for (i = mediciones.length-1; i >= 0; i--){
									sum += mediciones[i].State;
								}
								for (i = medicionesayer.length-1; i >= medicionesayer.length + mediciones.length-48; i--){
									sum += medicionesayer[i].State;
								}
								prom12[value.Id][value2.Id]  = (sum/48);
								console.log(prom12);
							});
						}
						else{
							listApi(get, "medicionesayer", function(){
								sum = 0;
								console.log("No hay suficientes");
								for (i = mediciones.length-1; i >= 0; i--){
									sum += mediciones[i].State;
								}
								for (i = medicionesayer.length-1; i >= medicionesayer.length + mediciones.length-48; i--){
									sum += medicionesayer[i].State;
								}
								prom12[value.Id][value2.Id] = (sum/48);
								sum = 0;
								for (i = mediciones.length-1; i >= 0; i--){
									sum += mediciones[i].State;
								}
								for (i = medicionesayer.length-1; i >= medicionesayer.length + mediciones.length-32; i--){
									sum += medicionesayer[i].State;
								}
								prom8[value.Id][value2.Id] = (sum/32);
								console.log(prom12);
							});
						}
					});
				});
			});
		});
	});
}
new CronJob('* */30 * * * *', cronJob , function(){
	console.log(prom8);
	console.log(prom12);
}, true, 'America/Los_Angeles');

function listApi(busq, lista, callback){
	url = "http://bapocbulkserver.azurewebsites.net/api1/";
	requestify.get(url+=busq).then(function(response){
		switch(lista){
			case "estaciones" : estaciones = response.getBody();
				break;
			case "sensores" : sensores = response.getBody();
				break;
			case "mediciones" : mediciones = response.getBody();
				break;
			case "medicionesayer" : medicionesayer = response.getBody();
				break;
		}
		callback();
	});
}

app.get('/mediciones/:sensor/:estacion', function(req, res){
	var now = new Date();
	console.log(req.query.date);
	if(req.query.date){
		date = req.query.date;
		date = date.split("-");
		anio = date[0];
		mes = date[1];
		dia = date[2];
		prom = true;
		if(req.query.details)
			get = "sensors/"+req.params.estacion+"/"+req.params.sensor + "/detail/" +anio+"/"+mes+"/"+dia;
		else
			get = "sensors/"+req.params.estacion+"/"+req.params.sensor + "/" +anio+"/"+mes+"/"+dia;
	}
	else {
		anio = now.getFullYear();
		get = "sensors/"+req.params.estacion+"/"+req.params.sensor+"/"+anio;
		prom = false;
	}
	console.log(get);
	listApi(get, "mediciones", function(){
		data = {
					data : {
					fecha : req.query.date,
					details : req.query.details,
					sensor_id : req.params.sensor,
					estacion_id : req.params.estacion,
					estaciones : estaciones,
					sensores : sensores,
					mediciones : mediciones,
					medicionesayer : null,
					prom : prom
					}
				};
			if (req.query.date)
				get = "sensors/"+req.params.estacion+"/"+req.params.sensor + "/" +anio+"/"+mes+"/"+parseInt(dia)-1;
			else
				get = "sensors/"+req.params.estacion+"/"+req.params.sensor+"/"+anio+"/"+now.getMonth()+1+"/"+now.getDay()-1;
			listApi(get, "medicionesayer", function() {
				data.data.medicionesayer = medicionesayer;
			});
	 res.render('medicion', data);
	});
});

app.get('/sensores/:estacion', function(req, res){
	console.log(req.params.estacion);
	listApi("stations/"+req.params.estacion, "sensores", function(){
		data = {
					data : {
					estacion_id: req.params.estacion,
					estaciones : estaciones,
					sensores : sensores,
					mediciones : mediciones
					}
				};
	 res.render('sensor', data);
	});
});

app.get('/estacion', function(req, res){
	console.log(prom8);
	listApi("stations", "estaciones", function(){
		data = {
					data : {
					estaciones : estaciones,
					sensores : sensores,
					mediciones : mediciones
					}
				};
		res.render('estacion', data);
	})
});
 	
app.get('/', function (req, res) {
		res.render('index');
});


app.listen(3000, function () {
  console.log("Escuchando en el puerto "+ 3000);
});
