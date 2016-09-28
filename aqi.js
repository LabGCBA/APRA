function calcularAqi(prom, parametro){
	var ozone = {
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
	}

	aqi = (((ihi-ilo)/(bphi-bplo))*(prom-bplo))+ilo;
    return aqi;
}

console.log(calcularAqi(0.2, "ozone"));