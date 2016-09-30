module.exports = {
    calcularAqi : calcularAqi
};
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

		case "particulatematter10" :
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

		case "particulatematter25" :
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

		case "sulfuroxide" :
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
