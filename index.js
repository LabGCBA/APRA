var express = require('express');
var app = express();
var mysql = require('mysql');
var pug = require('pug');
var bodyParser = require('body-parser');
app.set('view engine', 'pug');
app.use(express.static('public'));
var requestify = require('requestify');


app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

var estaciones = [];
var sensores = [];
var mediciones = [];

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
		if(req.query.details)
			get = "sensors/"+req.params.estacion+"/"+req.params.sensor + "/detail/" +anio+"/"+mes+"/"+dia;
		else
			get = "sensors/"+req.params.estacion+"/"+req.params.sensor + "/" +anio+"/"+mes+"/"+dia;
	}
	else {
		anio = now.getFullYear();
		get = "sensors/"+req.params.estacion+"/"+req.params.sensor+"/"+anio;
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
					mediciones : mediciones
					}
				};
	 console.log(data);
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
	 console.log(data);
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
		console.log(data);
		res.render('estacion', data);
	})
});
 	
app.get('/', function (req, res) {
		res.render('index');
});


app.listen(3000, function () {
  console.log("Escuchando en el puerto "+ 3000);
});
