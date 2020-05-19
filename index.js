
let juliaC = {
	x: getFloat('julia-c-re'),
	y: getFloat('julia-c-im')
};	

function getInt(id) {
	return parseInt(document.getElementById(id).value);
}

function getFloat(id) {
	return parseFloat(document.getElementById(id).value);
}

let state = {
	ul_screen: { x: -1.5, y: 1.5 },
	width_screen: 3,
	set_estimator_function: mandelbrot_estimator,
	max_iterations: getInt('max-iterations'),
	julia: {
		C: juliaC,
		R: juliaR(juliaC)
	}
}

function juliaR(C) {
	return (1 + Math.sqrt(1 + 4 * norm(C))) / 2
}

function norm(z) {
    return Math.sqrt(z.x * z.x + z.y * z.y);
}

// f(z, c) = z^2 + c
function f(z, c) {
    let x = (z.x * z.x) - (z.y * z.y) + c.x;
    let y = (2 * z.x * z.y) + c.y; 
    return {x, y};
}

// returns num iteration to find not in set, or null if in set
function in_set_estimator(start, update_func, threshold, max_iter) {
    let z = start;
	
    for (let i = 0; i < max_iter; i++) {
        z = update_func(z) 
        if (norm(z) > threshold) {
            return i;
        }
    }
    return null;
}

function mandelbrot_estimator(c) {
    return in_set_estimator({x: 0, y:0}, f_n_0 => f(f_n_0, c), 2, state.max_iterations);
}

function julia_estimator(z) {
    return in_set_estimator(z, z => f(z, state.julia.C), state.julia.R, state.max_iterations); 
}

function compute_pixel_values() {
	let startTime = new Date().getTime();

	const canvas = document.getElementById('canvas');
    const ctx = canvas.getContext('2d');
    const height_px = canvas.height;
    const width_px = canvas.width;
    const height_screen = (state.width_screen * height_px) / width_px;

	let px_values = [];
	let unique_values = new Set();

    for (let r = 0; r < height_px; r++) {
		let row = []
    	for (let c = 0; c < width_px; c++) {
            let z = pixel_to_point({r, c}); 
            let iterations_to_escape = state.set_estimator_function(z)
				
			row.push(iterations_to_escape);           	
			
			if (iterations_to_escape != null) {
				unique_values.add(iterations_to_escape);
			}
        }
		px_values.push(row);
    }

	let endTime = new Date().getTime();
	console.log('compute_pixel_values() time', (endTime - startTime));
	
	return [px_values, unique_values];
}

function animate() {
	let startTime = new Date().getTime();

	let [px_values, unique_values] = compute_pixel_values();
	
	let color1 = hexToRgb(document.getElementById('out-set-color1').value);
	let color2 = hexToRgb(document.getElementById('out-set-color2').value);
	let iterToColor = getIterationToColor(color1, color2, unique_values);
	
	drawFullImage(px_values, iterToColor);
	
	let endTime = new Date().getTime();
	console.log('animate() time', (endTime - startTime));
}

function getIterationToColor(color1, color2, unique_values) {
	let iterToColor = {};	
	if (unique_values.size == 1) {	
		let singleIterVal = unique_values.values().next().value;
	 	iterToColor[singleIterVal] = color2;
	} else if (unique_values.size >= 2) {
		let least_iterations = Math.min(...unique_values);
		let most_iterations = Math.max(...unique_values);
	
		let colors = interpolateColors(color1, color2, most_iterations - least_iterations + 1);
		
		for (let iterVal of unique_values) {
			iterToColor[iterVal] = colors[iterVal - least_iterations]
		} 			
	}  
	return iterToColor;
}

function drawFullImage(px_values, iterToColor) {
	let startTime = new Date().getTime();

    const canvas = document.getElementById('canvas');
    const ctx = canvas.getContext('2d');
    const height_px = canvas.height;
    const width_px = canvas.width;
    const height_screen = (state.width_screen * height_px) / width_px;

	let setColor = hexToRgb(document.getElementById('in-set-color').value);

	let data = new Uint8ClampedArray(width_px * height_px * 4); 
   
	let i = 0; 
	for (let r = 0; r < height_px; r++) {
    	for (let c = 0; c < width_px; c++) {
            let iters = px_values[r][c]; 
			let color = iters === null ? setColor : iterToColor[iters];
			data[i++] = color.r;
			data[i++] = color.g;
			data[i++] = color.b;
			data[i++] = 255; // full alpha
        }
    }

	let image = new ImageData(data, width_px, height_px);

	ctx.putImageData(image, 0, 0);

	let endTime = new Date().getTime();
	console.log('drawFullImage time', (endTime - startTime));
}


// assumes existence of ul_screen and width_screen
function pixel_to_point(pixel) {
    const canvas = document.getElementById('canvas');
    const height_px = canvas.height;
    const width_px = canvas.width;
    const height_screen = (state.width_screen * height_px) / width_px;

    let {r, c} = pixel;
    let x = state.ul_screen.x + (c / width_px) * state.width_screen;
    let y = state.ul_screen.y - (r / height_px) * height_screen;
    return {x, y}
}


function updateZoom(center_px, new_screen_width) {
    const canvas = document.getElementById('canvas');
    const height_px = canvas.height;
    const width_px = canvas.width;

    // get cartesian coords of new center
    let center = pixel_to_point({ r: center_px.r, c: center_px.c}); 
    console.log('center point', center);
    
	// compute new width and height screen on plane
    state.width_screen = new_screen_width;
    console.log('width', state.width_screen);
    
    const height_screen = (state.width_screen * height_px) / width_px;
    console.log('height', height_screen);
   
    // set ul_screen to center - 1/2 width
    state.ul_screen = {
        x: center.x - state.width_screen / 2,
        y: center.y + height_screen / 2,
    }
    console.log('upper left corner', state.ul_screen);
    animate();

}

// assumes existence of ul_screen and width_screen
function pixel_to_point(pixel) {
    const canvas = document.getElementById('canvas');
    const height_px = canvas.height;
    const width_px = canvas.width;
    const height_screen = (state.width_screen * height_px) / width_px;

    let {r, c} = pixel;
    let x = state.ul_screen.x + (c / width_px) * state.width_screen;
    let y = state.ul_screen.y - (r / height_px) * height_screen;
    return {x, y}
}


function zoomInHandler() {
    const canvas = document.getElementById('canvas');
    const height_px = canvas.height;
    const width_px = canvas.width;

    let center_px = { r: height_px / 2, c: width_px / 2 }; 
    updateZoom(center_px, state.width_screen / 2);
}

function zoomOutHandler() {
    const canvas = document.getElementById('canvas');
    const height_px = canvas.height;
    const width_px = canvas.width;

    let center_px = { r: height_px / 2, c: width_px / 2 }; 
    updateZoom(center_px, state.width_screen * 2);
}

function setTypeHandler() {
	if (document.getElementById('mandelbrot').checked) {
		// grey out julia
		state.set_estimator_function = mandelbrot_estimator
	} else {
		state.set_estimator_function = julia_estimator
		let c_x = parseInt(document.getElementById('julia-c-re').value);
		let c_y = parseInt(document.getElementById('julia-c-im').value);
		state.julia.C = { 
            x: getFloat('julia-c-re'),
            y: getFloat('julia-c-im')
        };
		state.julia.R = juliaR(state.julia.C);
		console.log(state.julia.C);
	}

	animate();
}

function canvasClickHandler(e) {
    const canvas = document.getElementById('canvas');
    const height_px = canvas.height;
    const width_px = canvas.width;

    let center_px = { r: e.clientY, c: e.clientX };
    updateZoom(center_px, state.width_screen / 2);
}


// numColors must be >= 2
function interpolateColors(color1, color2, numColors) {
	let rDiff = (color2.r - color1.r) / (numColors - 1);
	let gDiff = (color2.g - color1.g) / (numColors - 1);
	let bDiff = (color2.b - color1.b) / (numColors - 1);
	
	let colors = [color1];
	while (colors.length < numColors) {
		let prevColor = colors[colors.length-1];
		let nextColor = {
			r: prevColor.r + rDiff,
			g: prevColor.g + gDiff,
			b: prevColor.b + bDiff
		}
		colors.push(nextColor);
	}
	return colors;	
}

function hexToRgb(hex) {
  var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null;
}


window.onload = function() {
    animate();

    document.getElementById('canvas').onclick = canvasClickHandler;
    document.getElementById('zoom-in').onclick = zoomInHandler;
    document.getElementById('zoom-out').onclick = zoomOutHandler;
    
    document.getElementById('in-set-color').onchange = animate;
    document.getElementById('out-set-color1').onchange = animate;
    document.getElementById('out-set-color2').onchange = animate;
    
	document.getElementById('max-iterations').onchange = function() {
		state.max_iterations = getInt('max-iterations');
		animate();
	}
    
	document.getElementById('mandelbrot').onchange = setTypeHandler;
	document.getElementById('julia').onchange = setTypeHandler;
	document.getElementById('julia-c-re').onchange = function() {
        state.julia.C.x = getFloat('julia-c-re');
        animate();
    };
	document.getElementById('julia-c-im').onchange =  function() {
        state.julia.C.y = getFloat('julia-c-im');
        animate();
    };
}
