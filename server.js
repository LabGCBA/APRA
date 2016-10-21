var express = require('express');
var app = express();
var mysql = require('mysql');
var pug = require('pug');
var bodyParser = require('body-parser');
var aqi = require('./aqi');
app.set('view engine', 'pug');
app.use(express.static('public'));
var requestify = require('requestify');
var json2csv = require('json2csv');
var mongoose = require('mongoose');

var jwt = require('jsonwebtoken');
var config = require('./config');
var User = require('./models/user');



var port = process.env.PORT || 3000;
mongoose.connect(config.database);

app.set('superSecret', config.secret);

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());




var estaciones = [];
var sensores = [];
var mediciones = [];
var medicionesayer = [];
var medicioneshoy = [];
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
function addDays(date, days) {
    var result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
}
app.get('/:estacion/:sensor/download/:from/:details', function(req, res){
	var desde = new Date(req.params.from);
	//desde = addDays(desde, 1);
	var detalles = req.params.details;
	console.log(req.params.from);
	var fields = ['At', 'State', 'Active'];
	if (detalles=="true")
		get = "sensors/"+req.params.estacion+"/"+req.params.sensor + "/detail/" + desde.getFullYear() + "/" + (desde.getMonth()+1) + "/" + desde.getDate();
	else
		get = "sensors/"+req.params.estacion+"/"+req.params.sensor + "/" + desde.getFullYear() + "/" + (desde.getMonth()+1) + "/" + desde.getDate();
	console.log(detalles);
	listApi(get, "mediciones", function(){
		var result = json2csv({ data: mediciones, fields: fields });
		res.setHeader('Content-disposition', 'attachment; filename='+req.params.estacion + req.params.sensor + req.params.from + detalles +'.csv');
		res.setHeader('Content-type', 'text/plain');
		res.charset = 'UTF-8';
		res.write(result);
		res.end();
	});
});

app.post('/:estacion/:sensor/:accion/:anio/:mes/:dia/:hora/:minuto', function(req, res){
	var url = "http://bapocbulkserver.azurewebsites.net/api1/sensors/"+req.params.estacion+"/"+req.params.sensor+"/"+req.params.accion+"/"+req.params.anio+"/"+req.params.mes+"/"+req.params.dia+"/"+req.params.hora+"/"+req.params.minuto;
	requestify.post(url).then(function(response){
		res.send(""+response.code+"");
		console.log(response.code);
	});
});

app.get('/mediciones/:sensor/:estacion', function(req, res){
	var now = new Date();
	if(req.query.mesanio){
		date = req.query.mesanio.split("-");
		anio = date[0];
		mes = date[1];
		detalles = false;
		if (anio==now.getFullYear() && mes == now.getMonth()+1)
			today = true;
		else
			today=false;
		prom = true;
		get = "sensors/"+req.params.estacion+"/"+req.params.sensor + "/" +anio+"/"+mes;
	}
	else if(req.query.date){
		date = req.query.date;
		date = date.split("-");
		anio = date[0];
		mes = date[1];
		dia = date[2];
		if (anio==now.getFullYear() && mes == now.getMonth()+1 && dia == now.getDate())
			today = true;
		else
			today = false;
		prom = true;
		if(req.query.details){
			get = "sensors/"+req.params.estacion+"/"+req.params.sensor + "/detail/" +anio+"/"+mes+"/"+dia;
			detalles = true;
			today = false;
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
		today = true;
	}
	listApi(get, "mediciones", function(){
		if (today){
			get = "sensors/"+req.params.estacion+"/"+req.params.sensor+"/"+anio+"/"+mes+"/"+(dia-1);
			listApi(get, "medicionesayer", function(){
				if (!req.query.date){
					get = "sensors/"+req.params.estacion+"/"+req.params.sensor+"/"+anio+"/"+mes+"/"+dia;
					listApi(get, "medicioneshoy", function(){
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
						today : today,
						dictionary : dictionary,
						}
					};
					res.render('medicion', data);
					});
				}
				else{
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
						today : today,
						dictionary : dictionary,
						}
					};
					res.render('medicion', data);
				}

		});
		}
		else {
			data = {
					data : {
					fecha : req.query.date,
					details : detalles,
					sensor_id : req.params.sensor,
					estacion_id : req.params.estacion,
					estaciones : estaciones,
					sensores : sensores,
					mediciones : mediciones,
					medicionesayer : medicionesayer,
					today : today,
					dictionary : dictionary,
					}
			};
	 		res.render('medicion', data);
		}
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
					mediciones : mediciones,
					dictionary : dictionary,
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
					mediciones : mediciones,
					dictionary : dictionary,
					}
				};
		res.render('estacion', data);
	})
});

app.get('/promedioaqi', function(req, res) {
  		res.render('promedioaqi');
});

app.get('/index', function (req, res) {
		res.render('index');
});

app.get('/', function(req, res){
  res.render('login');
});

// function setup para la creacion de usuario que luego se guardan en mongo, tome como base el ejemplo
// jsonwebtoken 

//  app.get('/setup', function(req, res) {
//
//   var ezequiel = new User({
//      usuario : 'Ezequiel',
//      password : '123',
//      admin: true
//
//    });
//
//   var admin = new User({
//     usuario : 'admin',
//     password : '123',
//     admin: true
//   });
//
//  ezequiel.save(function(err) {
//    if (err) throw err;
//  });
//
//   admin.save(function(err) {
//     if (err) throw err;
//   });
//   res.json({ success: true });
//
//});


var apiRoutes = express.Router();

apiRoutes.get('/users', function(req, res) {
  User.find({}, function(err, users) {
    res.json(users);
  });
});

//app.use('/api', apiRoutes);

app.post('/login', function(req, res) {
  console.log('estoy en el login');
  User.findOne({
    usuario: req.body.usuario
  }, function(err, user) {

    if (err) throw err;

    if (!user) {
      res.json({ success: false, message: 'Authentication failed. User not found.' });
    } else if (user) {

      if (user.password != req.body.password) {
        res.json({ success: false, message: 'Authentication failed. Wrong password.' });
      } else {

        var token = jwt.sign(user, app.get('superSecret'), {
          //expiresInMinutes: 1440
        });

        // res.json({
        //   success: true,
        //   message: 'Enjoy your token!',
        //   token: token
        // });

        res.redirect('/index');
      }

    }
  });
});


app.listen(process.env.PORT || 3000, function () {
  console.log("Escuchando en el puerto "+ 3000);
});
