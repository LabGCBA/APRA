var express = require('express');
var app = express();
var mysql = require('mysql');
var pug = require('pug');
var bodyParser = require('body-parser');
app.set('view engine', 'pug');
app.use(express.static(__dirname))
var requestify = require('requestify');


app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());


var connection = mysql.createConnection({
  host     : 'localhost',
  user     : 'root',
  password : '',
  database : 'APRA'
});

connection.connect(function(err){
	if(err) console.log(err);
	else console.log("Conectado a base de datos");
});

var estaciones = [];
var sensores = [];
var mediciones = [];

function altaEstacion(estacion, callback){
  var query = "INSERT INTO estacion (nombre, ubicacion, modelo, marca, estado) values ('"+estacion['nombre']+"', '"+estacion['ubicacion']+"', '"+estacion['modelo']+"', '"+estacion['marca']+"', '"+estacion['estado']+"');";
  connection.query(query, function(err, rows){
    if(err) callback(err, null);
    else callback(null, rows.insertId);
  });
}

function bajaEstacion(estacion, callback){
  var query = "DELETE FROM estacion WHERE id = "+estacion['id']+";";
  connection.query(query, function(err, rows){
    if (err) callback(err, null);
    else callback(null, 1);;
  });
}

function modificaEstacion(estacion){
  var query = "UPDATE estacion SET nombre='"+estacion['nombre']+"', ubicacion='"+estacion['ubicacion']+"', modelo='"+estacion['modelo']+"', inicioactividad='"+estacion['inicioactividad']+"', marca='"+estacion['marca']+"', estado='"+estacion['estado']+"';";
  connection.query(query, function(err, rows){
    if (err) return 0;
    else return 1;
  });
}



function listarEstacion(callback){
  estaciones = [];
  var query = "SELECT * FROM estacion;";
  connection.query(query, function(err, result){
    if(err) callback(err, null);
    else {
		for (var i = 0; i<result.length; i++){
			estaciones.push(result[i]);
		}
		callback(null, result.lenght);
	}
  });
}

function altaSensor(sensor){
  var query = "INSERT INTO sensor (estacion_id, nombre, unidad, descripcion) values ('"+sensor['estacion_id']+"', '"+sensor['nombre']+"', '"+sensor['unidad']+"', '"+sensor['descripcion']+"');";
  connection.query(query, function(err, rows){
    if(err) return 0;
    else return rows['insertId'];
  });
}

function bajaSensor(sensor){
  var query = "DELETE FROM sensor WHERE id = "+sensor['id']+";";
  connection.query(query, function(err, rows){
    if (err) return 0;
    else return 1;
  });
}

function modificaSensor(sensor){
  var query = "UPDATE sensor SET estacion_id='"+sensor['estacion_id']+"', nombre='"+sensor['nombre']+"', unidad='"+sensor['unidad']+"', descripcion='"+sensor['descripcion']+"';";
  connection.query(query, function(err, rows){
    if(err) return 0;
    else return 1;
  });
}

function altaMedicion(medicion){
	  var query = "INSERT INTO medicion (timestamp, valor, unidad, descripcion, sensor_id) values ('"+medicion['timestamp']+"', '"+medicion['valor']+"', '"+medicion['unidad']+"', '"+medicion['descripcion']+"', '"+medicion['sensor_id']+"');";
  connection.query(query, function(err, rows){
    if(err) return 0;
    else return rows['insertId'];
  });
}

function bajaMedicion(medicion){
  var query = "DELETE FROM medicion WHERE id = "+medicion['id']+";";
  connection.query(query, function(err, rows){
    if (err) return 0;
    else return 1;
  });
}

function modificaMedicion(sensor){
  var query = "UPDATE medicion SET timestamp='"+medicion['timestamp']+"', valor='"+medicion['valor']+"', unidad='"+medicion['unidad']+"', descripcion='"+medicion['descripcion']+"', sensor_id='"+medicion['sensor_id']+"';";
  connection.query(query, function(err, rows){
    if(err) return 0;
    else return 1;
  });
}

function listarSensor(callback){
  sensores = [];
  var query = "SELECT * FROM sensor;";
  connection.query(query, function(err, rows){
    if(err) callback(err, null);
    else for(var i = 0; i<rows.length; i++){
		sensores.push(rows[i]);
	}
		callback(null, sensores.length);
  });
}

function listarMedicion(callback){
	mediciones = [];
  var query = "SELECT * FROM medicion;";
  connection.query(query, function(err, rows){
    if(err) callback(err, null);
    else for(var i = 0; i<rows.length; i++){
		mediciones.push(rows[i]);
	}
		callback(null, mediciones.length);
  });
}

app.get('/estacion/sensor/medicion', function(req, res){
	listarSensor(function(err, data){
		listarMedicion(function (err, data){
			data = {
				data : {
				estacion_id : req.query.id,
				sensores : req.query.id,
				mediciones : req.query.id 
				}
			}
			res.render('medicion', data);
		});
	});
});

app.get('/estacion/sensor', function(req, res){
	listarMedicion(function(err, data){
		data = {
			data : {
				estacion_id : req.query.estacion,
				sensor_id : req.query.id,
				mediciones : mediciones
			}
		};
		res.render('sensor', data);
	});
});

app.get('/estacion', function(req, res){
	requestify.get('http://bapocbulkserver.azurewebsites.net/api1/stations/')
  .then(function(response) {
      // Get the response body (JSON parsed or jQuery object for XMLs)
      estaciones = response.getBody();
			data = {
					data : {
					estaciones : estaciones,
					sensores : sensores,
					mediciones : mediciones
					}
				};
			res.render('estacion', data);
  	});
});

app.get('/', function (req, res) {
  listarEstacion(function(err, data){
	if (err) console.log(err);
	listarSensor(function(err, data){
		if(err) console.log(err);
		listarMedicion(function(err, data){
			if(err) console.log(err);
			var data = {
				data : {
					estaciones : estaciones,
					sensores : sensores,
					mediciones : mediciones
				}
			};
				res.render('index', data);
		});
	});
  });
});
		

app.post('/', function(req, res){
	var date = new Date(req.body.inicioactividad);
	var estacion = {
		nombre : req.body.nombre,
		ubicacion : req.body.ubicacion,
		marca : req.body.marca,
		inicioactividad : date,
		modelo : req.body.modelo,
		estado : req.body.estado
	}
	console.log(estacion.nombre);
	altaEstacion(estacion, function(err, id){
		if(err) console.log(err);
		res.redirect('/');
	});
});

app.delete('/', function(req, res){
	var estacion = {
			id : req.query.id
		}
		console.log(estacion.id);
		bajaEstacion(estacion, function(err, data){
			if (err) console.log(err);
			else
				res.send("1");
	});
});

app.listen(3000, function () {
  console.log("Escuchando en el puerto "+ 3000);
});