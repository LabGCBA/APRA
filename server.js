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
var prom8 = {};
var prom12 = {};
cronJob();
function asyncLoop(iterations, func, callback) {
    var index = 0;
    var done = false;
    var loop = {
        next: function() {
            if (done) {
                return;
            }

            if (index < iterations) {
                index++;
                func(loop);

            } else {
                done = true;
                callback();
            }
        },

        iteration: function() {
            return index - 1;
        },

        break: function() {
            done = true;
            callback();
        }
    };
    loop.next();
    return loop;
}
function cronJob() {
	var now = new Date();
	listApi("stations", "estaciones", function(){
		asyncLoop(estaciones.length, function(loop) {
			value = estaciones[loop.iteration()];
			prom8[value.Id] = {};
			prom12[value.Id] = {};
			listApi("stations/"+value.Id, "sensores", function(){
				asyncLoop(sensores.length, function(loop2) {
					value2 = sensores[loop2.iteration()];
					get = "sensors/" + value.Id + "/" + value2.Id + "/" + now.getFullYear() + "/" + (now.getMonth() + 1) + "/" + now.getDate();
					listApi(get, "mediciones", function(){
						get = "sensors/" + value.Id + "/" + value2.Id + "/" + now.getFullYear() + "/" + (now.getMonth() + 1) + "/" + (now.getDate()-1);
						listApi(get, "medicionesayer", function(){
						if (mediciones.length >= 48){
							sum = 0;
							for (i = mediciones.length-1; i >= mediciones.length - 48; i--) {
								sum += mediciones[i].State;
							}
							prom12[value.Id][value2.Id] = sum/48;
							sum = 0;
							for (i = mediciones.length-1; i >= mediciones.length - 32; i--){
								sum += mediciones[i].State;
							}
							prom8[value.Id][value2.Id] = (sum/32);
						}
						else if (mediciones.length >= 32){
								sum = 0;
								for (i = mediciones.length-1; i >= mediciones.length - 32; i--){
									sum += mediciones[i].State;
								}
								prom8[value.Id][value2.Id]  = (sum/32);
								sum = 0;
								for (i = mediciones.length-1; i >= 0; i--){
									sum += mediciones[i].State;
								}
								for (i = medicionesayer.length-1; i >= medicionesayer.length + mediciones.length - 48; i--){
									sum += medicionesayer[i].State;
								}
								prom12[value.Id][value2.Id]  = (sum/48);
						}
						else{
								sum = 0;
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
						}
						loop2.next();
						});
					});
				}, function(){
					loop.next();
				});
			});
		}, function(){
			console.log(prom8);
			console.log(prom12);
		});
	});
}
new CronJob('*/15 * * * *', cronJob , function(){
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

app.post('/:estacion/:sensor/:accion/:anio/:mes/:dia/:hora/:minuto', function(req, res){
	var url = "http://bapocbulkserver.azurewebsites.net/api1/sensors/"+req.params.estacion+"/"+req.params.sensor+"/"+req.params.accion+"/"+req.params.anio+"/"+req.params.mes+"/"+req.params.dia+"/"+req.params.hora+"/"+req.params.minuto;
	requestify.post(url).then(function(response){
		res.send(""+response.code+"");
		console.log(response.code);
	});
});

app.get('/mediciones/:sensor/:estacion', function(req, res){
	var now = new Date();
	if(req.query.date){
		date = req.query.date;
		date = date.split("-");
		anio = date[0];
		mes = date[1];
		dia = date[2];
		prom = true;
		if(req.query.details){
			get = "sensors/"+req.params.estacion+"/"+req.params.sensor + "/detail/" +anio+"/"+mes+"/"+dia;
			detalles = true;
		}
		else{
			get = "sensors/"+req.params.estacion+"/"+req.params.sensor + "/" +anio+"/"+mes+"/"+dia;
			detalles = false;
		}
	}
	else {
		anio = now.getFullYear();
		get = "sensors/"+req.params.estacion+"/"+req.params.sensor+"/"+anio;
		detalles = false;
	}
	listApi(get, "mediciones", function(){
		data = {
					data : {
					fecha : req.query.date,
					details : detalles,
					sensor_id : req.params.sensor,
					estacion_id : req.params.estacion,
					estaciones : estaciones,
					sensores : sensores,
					mediciones : mediciones,
					prom8 : prom8[(req.params.estacion)][req.params.sensor],
					prom12 : prom12[(req.params.estacion)][req.params.sensor]
					}
				};
	 res.render('medicion', data);
	});
});

app.get('/sensores/:estacion', function(req, res){
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


app.listen(process.env.PORT || 3000, function () {
  console.log("Escuchando en el puerto "+ 3000);
});
