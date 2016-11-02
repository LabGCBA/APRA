var express = require('express');
var app = express();
var pug = require('pug');
var bodyParser = require('body-parser');
app.set('view engine', 'pug');

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
			result = calcularAqi(prom, req.query.polucion);
		}
		res.json({aqi : result});
	});
});

var calcularAqi = function(prom, parametro){
	var ozone1 = {
		HI : {
			0.064 : 50,
			0.084 : 100,
			0.104 : 150,
			0.124 : 200,
			0.374 : 300,
		},
		LO : {
			0.000 : 0,
			0.065 : 51,
			0.085 : 101,
			0.105 : 151,
			0.125 : 201,
			0.375 : 301
		}
	}

	var ozone8 = {
		HI : {
			0.164 : 150,
			0.204 : 200,
			0.404 : 300,
			0.504 : 400,
			0.604 : 500,
		},
		LO : {
			0.000 : 0,
			0.065 : 51,
			0.085 : 101,
			0.105 : 151,
			0.125 : 201,
			0.375 : 301
		}
	}

	var particulatematter10 = {
		HI : {
			54 : 50,
			154 : 100,
			254 : 150,
			354 : 200,
			424 : 300,
			504 : 400,
			604 : 500,
		},
		LO : {
			0 : 0,
			55 : 51,
			155 : 101,
			255 : 151,
			355 : 201,
			425 : 301,
			505 : 401
		}
	}
	var particulatematter25 = {
		HI : {
			15.4 : 50,
			40.4 : 100,
			65.4 : 150,
			150.4 : 200,
			250.4 : 300,
			350.4 : 400,
			500.4 : 500,
		},
		LO : {
			0.0 : 0,
			15.5 : 51,
			40.5 : 101,
			65.5 : 151, 
			150.5 : 201,
			250.5 : 301,
			350.5 : 401
		}

	}
	var carbonoxide ={
		HI :{
		    4.4 : 50,
			9.4 : 100,
			12.4 : 150,
			15.4 : 200,
			30.4 : 300,
			40.4 : 400,
			50.4 : 500,
		},
		LO :{
			0.0 : 0,
			4.5 : 51,
			9.5 : 101,
			12.5 : 151,
			15.5 : 201,
			30.5 : 301,
			40.5 : 401
		}
	}
	var sulfuroxide ={
		HI:{
			0.034 : 50,
			0.144 : 100,
			0.244 : 150,
			0.304 : 200,
			0.604 : 300,
			0.804 : 400,
			1.004 : 500,
		},
		LO :{
			0.000 : 0,
			0.035 : 51,
			0.145 : 101,
			0.225 : 151,
			0.305 : 201,
			0.605 : 301,
			0.805 : 401
		}
	}
	var nitricdioxide ={
		HI:{
			1.24 : 300,
			1.64 : 400,
			2.04 : 500,
		},
		LO:{
			0.65 : 201,
			1.25 : 301,
			1.65 : 401	
		}
	}

	switch(parametro){
		case "ozone" : 
			for (key in ozone.HI){
				if (prom <= key){
					bphi = key;
					ihi = (ozone.HI)[key];
					break;
				}
			}
			var keys = Object.keys(ozone.LO);
			keys.sort((a,b)=>b-a);
			for (var i = 0; i < keys.length; i++){
				if (prom >= keys[i]){
					bplo = keys[i];
					ilo = (ozone.LO)[keys[i]];
					break;
				}
			}
		break;

		case "particulatematter" :
			for (key in particulatematter10.HI){
				if (prom <= key){
					bphi = key;
					ihi = (particulatematter10.HI)[key];
					break;
				}
			}
			var keys = Object.keys(particulatematter10.LO);
			keys.sort((a,b)=>b-a);
			for (var i = 0; i < keys.length; i++){
				if (prom >= keys[i]){
					bplo = keys[i];
					ilo = (particulatematter10.LO)[keys[i]];
					break;
				}
			}
		break;

		case "fineparticulatematter" :
			for (key in particulatematter25.HI){
				if (prom <= key){
					bphi = key;
					ihi = (particulatematter25.HI)[key];
					break;
				}
			}
			var keys = Object.keys(particulatematter25.LO);
			keys.sort((a,b)=>b-a);
			for (var i = 0; i < keys.length; i++){
				if (prom >= keys[i]){
					bplo = keys[i];
					ilo = (particulatematter25.LO)[keys[i]];
					break;
				}
			}
		break;

		case "carbonoxide" :
			for (key in carbonoxide.HI){
				if (prom <= key){
					bphi = key;
					ihi = (carbonoxide.HI)[key];
					break;
				}
			}
			var keys = Object.keys(carbonoxide.LO);
			keys.sort((a,b)=>b-a);
			for (var i = 0; i < keys.length; i++){
				if (prom >= keys[i]){
					bplo = keys[i];
					ilo = (carbonoxide.LO)[keys[i]];
					break;
				}
			}
		break;

		case "sulfurdioxide" :
			for (key in sulfuroxide.HI){
				if (prom <= key){
					bphi = key;
					ihi = (sulfuroxide.HI)[key];
					break;
				}
			}
			var keys = Object.keys(sulfuroxide.LO);
			keys.sort((a,b)=>b-a);
			for (var i = 0; i < keys.length; i++){
				if (prom >= keys[i]){
					bplo = keys[i];
					ilo = (sulfuroxide.LO)[keys[i]];
					break;
				}
			}
		break;

		case "nitricdioxide" : 
			for (key in nitricdioxide.HI){
				if (prom <= key){
					bphi = key;
					ihi = (nitricdioxide.HI)[key];
					break;
				}
			}
			var keys = Object.keys(nitricdioxide.LO);
			keys.sort((a,b)=>b-a);
			for (var i = 0; i < keys.length; i++){
				if (prom >= keys[i]){
					bplo = keys[i];
					ilo = (nitricdioxide.LO)[keys[i]];
					break;
				}
			}
		break;

	}

	aqi = (((ihi-ilo)/(bphi-bplo))*(prom-bplo))+ilo;
    return aqi;	
}


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
