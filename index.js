var express = require('express');
var app = express();
var mysql = require('mysql');
var pug = require('pug');
var bodyParser = require('body-parser');
app.set('view engine', 'pug');
app.use(express.static(__dirname));
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
	listApi("sensors/"+req.params.estacion+"/"+req.params.sensor+"/2014", "mediciones", function(){
		listApi("stations/"+req.params.estacion, "sensores", function(){
		data = {
					data : {
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