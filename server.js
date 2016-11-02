var express = require('express');
var app = express();
var pug = require('pug');
var bodyParser = require('body-parser');
app.set('view engine', 'pug');
var aqi = require('./aqi.js');
var requestify = require('requestify');
var json2csv = require('json2csv');
var jwt = require('jsonwebtoken');
var fs = require('fs');
var users = [];
fs.readFile('ddbb.in', 'utf8', function (err,data) {
  if (err) {
    return console.log(err);
  }
  usuarios = data.split(/\n/);
  for (var i = 0; i< usuarios.length; i++)
  {
	  element = usuarios[i].split(",");
	  users.push({
		  user : element[0].replace(/(\r\n|\n|\r)/gm,""),
		  password : element[1].replace(/(\r\n|\n|\r)/gm,""),
	  });
  }
});


app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(express.static('public'));



var estaciones = [];
var sensores = [];
var mediciones = [];

var dictionary = {
  "laboca" : "La Boca",
  "cordoba" : "Córdoba",
  "centenario" : "Centenario",
  "atmpressure" : ["Presión Atmosférica", "hPa"],
  "ozon" : ["Ozono - O3", "ppb"],
  "temperature" : ["Temperatura", "°C"],
  "carbonoxide" : ["Monóxido de Carbono - CO", "ppm"],
  "nitricoxide" : ["Óxido nítrico - NO", "ppb"],
  "mononitrogenoxide" : ["Óxidos de Nitrógeno - NOx","ppb"],
  "nitricdioxide" : ["Dióxido de Nitrógeno - NO2", "ppb"],
  "particulatematter" : ["Particulado menor a 10 - PM10", "ug/m3"],
  "winddirection" : ["Dirección del viento", "grados"],
  "windspeed" : ["Velocidad del viento", "m/s"],
  "relativehumidity" : ["Humedad relativa","%"],
  "globalradiation" : ["Radiación global", "W/m2"],
  "rain" : ["Lluvia", "mm"],
  "uva" : ["Radiación Ultravioleta A - UV-A", "x"],
  "sulfhidricacid" : ["Ácido Sulfhídrico - H2S", "ppb"],
  "sulfurdioxide" : ["Dióxido de Azufre - SO2", "ppb"],
  "unknown" : ["Desconocido" , ""],
  "fineparticulatematter" : ["Particulado menor a 2.5 micrones - PM2.5", "ug/m3"],
}

app.get('/', function(req, res){
  res.render('login');
});

app.get('/calcularAqi', function(req,res){
	var now = new Date();
	var prom = 0.0;
	var get= "sensors/" + req.query.estacion + "/" + req.query.polucion + "/" + now.getFullYear() + "/" + (now.getMonth()+1) + "/" + now.getDate();
	listApi(get, "mediciones", function(){
		var result;
		if (mediciones.length == 0)
			result = "Error";
		else
		{
			switch(req.query.polucion)
			{
				case "sulfurdioxide" : 
				case "fineparticulatematter" : 
				case "particulatematter":
					prom = mediciones[mediciones.length - 1].FullDay;
					break;
				case "ozon" :
				case "nitricdioxide":
				case "carbonoxide" :
					prom =  mediciones[mediciones.length - 1].EightHour;
			}
			result = caqi.alcularAqi(prom, req.query.polucion);
		}
		res.json({aqi : result});
	});
});


app.post('/login', function(req, res) {
  authenticated = false;
  for (var i = 0; i < users.length; i++) {
	  if (users[i].user == req.body.usuario && users[i].password == req.body.password)
	  {
		  authenticated = true;
	  }
	  	
  }

    if (!authenticated) res.send("Error de usuario/contraseña");

    else
	{
		var token = jwt.sign(req.body.usuario, "apra");
		res.render('index', {token: token});
	}
});

var apiRoutes = express.Router();

apiRoutes.use(function(req, res, next) {
  var token = req.body.token || req.query.token || req.headers['x-access-token'];
  if (token) {
    jwt.verify(token, "apra", function(err, decoded) {      
      if (err) {
        return res.json({ success: false, message: 'Failed to authenticate token.' });    
      } else {
        req.decoded = decoded;    
        next();
      }
    });

  } else {
    return res.send({ 
        success: false, 
        message: 'No token provided.' 
    });
    
  }
});

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
			case "medicioneshoy" : medicioneshoy = response.getBody();
				break;
			case "promedioaqi" : promedioaqi = response.getBody();
		}
		callback();
	});
}

app.get('/download', function(req,res){
	get = "sensors/" + req.query.estacion + "/" + (Array.isArray(req.query.pm10) ? req.query.pm10[1] : req.query.pm10) + "/" + (Array.isArray(req.query.pm25) ? req.query.pm25[1] : req.query.pm25) + "/" +
		(Array.isArray(req.query.co) ? req.query.co[1] : req.query.co) + "/" + (Array.isArray(req.query.o3) ? req.query.o3[1] : req.query.o3) + "/" + (Array.isArray(req.query.no2) ? req.query.no2[1] : req.query.no2) + "/" + (Array.isArray(req.query.nox) ? req.query.nox[1] : req.query.nox) +
		"/" + (Array.isArray(req.query.so2) ? req.query.so2[1] : req.query.so2) + "/" + (Array.isArray(req.query.h2s) ? req.query.h2s[1] : req.query.h2s) + "/" + (Array.isArray(req.query.no) ? req.query.no[1] : req.query.no) + "/" + req.query.fromDate + "/" + req.query.toDate;
	var fields = [];
	if(req.query.details == 'true'){
		get += "/details";
		fields = ["At", "sensorId", "State", "Active"];
	}
	else 
	{
		fields = ["At", "sensorId", "State", "Active", "Max", "Min", "EightHour", "FullDay"];
	}
	console.log(get);
	listApi(get, "mediciones", function(){
		var result = json2csv({ data: mediciones, fields: fields });
		res.setHeader('Content-disposition', 'attachment; filename=downloadedData.csv');
		res.setHeader('Content-type', 'text/plain');
		console.log("Procesado!");
		res.charset = 'UTF-8';
		res.write(result);
		res.end();
	});
});

app.get('/:estacion/:sensor/download/:from/:details', function(req, res){
	var desde = new Date(req.params.from);
	var detalles = req.params.details;
	if (detalles=="true")
	{
		var fields = ['At', 'State', 'Active'];
		get = "sensors/"+req.params.estacion+"/"+req.params.sensor + "/detail/" + desde.getFullYear() + "/" + (desde.getMonth()+1) + "/" + desde.getDate();
	}
		
	else
	{
		var fields = ['At', 'State', 'Active', 'Max', 'Min'];
		get = "sensors/"+req.params.estacion+"/"+req.params.sensor + "/" + desde.getFullYear() + "/" + (desde.getMonth()+1) + "/" + desde.getDate();
	}
	listApi(get, "mediciones", function(){
		var result = json2csv({ data: mediciones, fields: fields });
		res.setHeader('Content-disposition', 'attachment; filename='+req.params.estacion + req.params.sensor + req.params.from + detalles +'.csv');
		res.setHeader('Content-type', 'text/plain');
		res.charset = 'UTF-8';
		res.write(result);
		res.end();
	});
});

apiRoutes.post('/:estacion/:sensor/:accion/:anio/:mes/:dia/:hora/:minuto', function(req, res){
	var url = "http://bapocbulkserver.azurewebsites.net/api1/sensors/"+req.params.estacion+"/"+req.params.sensor+"/"+req.params.accion+"/"+req.params.anio+"/"+req.params.mes+"/"+req.params.dia+"/"+req.params.hora+"/"+req.params.minuto;
	requestify.post(url).then(function(response){
		res.send(""+response.code+"");
		console.log(response.code);
	});
});

apiRoutes.get('/mediciones/:sensor/:estacion', function(req, res){
	var now = new Date();
	if(req.query.mesanio){
		date = req.query.mesanio.split("-");
		anio = date[0];
		mes = date[1];
		detalles = false;
		prom = true;
		get = "sensors/"+req.params.estacion+"/"+req.params.sensor + "/" +anio+"/"+mes;
	}
	else if(req.query.date){
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
		mes = now.getMonth()+1;
		dia = now.getDate();
		get = "sensors/"+req.params.estacion+"/"+req.params.sensor+"/"+anio+"/"+(now.getMonth()+1);
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
				medicioneshoy : medicioneshoy,
				medicionesayer : medicionesayer,
				dictionary : dictionary,
			}
		};
	res.render('medicion', data);
	});
});

apiRoutes.get('/sensores/:estacion', function(req, res){
	listApi("stations/"+req.params.estacion, "sensores", function(){
		data = {
					data : {
					estacion_id: req.params.estacion,
					estaciones : estaciones,
					sensores : sensores,
					mediciones : mediciones,
					dictionary : dictionary,
					}
				};
	 res.render('sensor', data);
	});
});

apiRoutes.get('/estacion', function(req, res){
	listApi("stations", "estaciones", function(){
		data = {
					data : {
					estaciones : estaciones,
					sensores : sensores,
					mediciones : mediciones,
					dictionary : dictionary,
					}
				};
		res.render('estacion', data);
	})
});

apiRoutes.get('/promedioaqi', function(req, res) {
  		res.render('promedioaqi');
});

apiRoutes.get('/index', function (req, res) {
		res.render('index');
});


app.use('/', apiRoutes);

app.listen(process.env.PORT || 3000, function () {
  console.log("Escuchando en el puerto "+ 3000);
});
