
// global state 
const state = {
	ul_screen: { x: -1.5, y: 1.5 },
	width_screen: 3,
}


function getInt(id) {
	return parseInt(document.getElementById(id).value);
}

function getFloat(id) {
	return parseFloat(document.getElementById(id).value);
}

function getColor(id) {
	return hexToRgb(document.getElementById(id).value);
}

function getUIParameters() {
	const C = {
		x: getFloat('julia-c-re'),
		y: getFloat('julia-c-im')
	}

	return {
		max_iterations: getInt('max-iterations'),
		in_set_color: getColor('in-set-color'),
		out_set_color1: getColor('out-set-color1'),
		out_set_color2: getColor('out-set-color2'),
		is_mandelbrot: document.getElementById('mandelbrot').checked, 
		julia: {
			C,
			R: juliaR(C)
		}
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

function mandelbrot_estimator(params, c) {
    return in_set_estimator({x: 0, y:0}, f_n_0 => f(f_n_0, c), 2, params.max_iterations);
}

function julia_estimator(params, z) {
    return in_set_estimator(z, z => f(z, params.julia.C), params.julia.R, params.max_iterations); 
}

function compute_pixel_values(params) {
	let startTime = new Date().getTime();

	const canvas = document.getElementById('canvas');
    const ctx = canvas.getContext('2d');
    const height_px = canvas.height;
    const width_px = canvas.width;
    const height_screen = (state.width_screen * height_px) / width_px;

	let px_values = [];
	let unique_values = new Set();

	const set_estimator_function = params.is_mandelbrot ? mandelbrot_estimator : julia_estimator; 
    for (let r = 0; r < height_px; r++) {
		let row = []
    	for (let c = 0; c < width_px; c++) {
            let z = pixel_to_point({r, c}); 
            let iterations_to_escape = set_estimator_function(params, z)
				
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

function render() {
	const params = getUIParameters();
	console.log('UI Parameters', params);

	let startTime = new Date().getTime();

	let [px_values, unique_values] = compute_pixel_values(params);
	let iterToColor = getIterationToColor(params.out_set_color1, params.out_set_color2, unique_values);
	
	drawFullImage(px_values, params.in_set_color, iterToColor);
	
	save_settings_to_url();
	
	let endTime = new Date().getTime();
	console.log('render() time', (endTime - startTime));
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

function drawFullImage(px_values, inSetColor, iterToColor) {
	let startTime = new Date().getTime();

    const canvas = document.getElementById('canvas');
    const ctx = canvas.getContext('2d');
    const height_px = canvas.height;
    const width_px = canvas.width;
    const height_screen = (state.width_screen * height_px) / width_px;

	let data = new Uint8ClampedArray(width_px * height_px * 4); 
   
	let i = 0; 
	for (let r = 0; r < height_px; r++) {
    	for (let c = 0; c < width_px; c++) {
            let iters = px_values[r][c]; 
			let color = iters === null ? inSetColor : iterToColor[iters];
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

    console.log('center pixel', center_px);
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
    render();

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
    updateZoom(center_px, state.width_screen / Math.sqrt(2));
}

function zoomOutHandler() {
    const canvas = document.getElementById('canvas');
    
	const height_px = canvas.height;
    const width_px = canvas.width;

    let center_px = { r: height_px / 2, c: width_px / 2 }; 
    updateZoom(center_px, state.width_screen * Math.sqrt(2));
}

function disableJuliaCInputs(disable) {
	document.getElementById('julia-c-re').disabled = disable;
	document.getElementById('julia-c-im').disabled = disable;
}

function canvasClickHandler(e) {
    const canvas = document.getElementById('canvas');
    const rect = canvas.getBoundingClientRect()
    const height_px = canvas.height;
    const width_px = canvas.width;

    let center_px = { 
        r: event.clientY - rect.top, 
        c: event.clientX - rect.left 
    }
    console.log('clicked pixel', center_px);
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

function componentToHex(c) {
  var hex = c.toString(16);
  return hex.length == 1 ? "0" + hex : hex;
}
function rgbToHex(color) {
  return "#" + componentToHex(color.r) + componentToHex(color.g) + componentToHex(color.b);
}

function hexToRgb(hex) {
  var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null;
}

function downloadImageHandler() {
    const canvas = document.getElementById("canvas");
    const button = document.getElementById('download-image');
    const img = canvas.toDataURL("image/png");
    button.href = img;
}

function load_settings_from_url() {
    const settings = new URLSearchParams(window.location.hash.slice(1))

	// state
	if (settings.has('ul_screen_x')) state.ul_screen.x = parseFloat(settings.get('ul_screen_x'))
	if (settings.has('ul_screen_y')) state.ul_screen.y = parseFloat(settings.get('ul_screen_y'))
	if (settings.has('width_screen')) state.width_screen = parseFloat(settings.get('width_screen'))
	
	// ui	
	if (settings.has('julia_c_x')) document.getElementById("julia-c-re").value = parseFloat(settings.get('julia_c_x'))
	if (settings.has('julia_c_y')) document.getElementById("julia-c-im").value = parseFloat(settings.get('julia_c_y'))
	if (settings.has('max_iterations')) document.getElementById("max-iterations").value = parseFloat(settings.get('max_iterations'))
	if (settings.has('in_set_color')) document.getElementById("in-set-color").value = settings.get('in_set_color')
	if (settings.has('out_set_color1')) document.getElementById("out-set-color1").value = settings.get('out_set_color1')
	if (settings.has('out_set_color2')) document.getElementById("out-set-color2").value = settings.get('out_set_color2')

	const is_mandelbrot = settings.has("is_mandelbrot") ? JSON.parse(settings.get('is_mandelbrot')) : true
	document.getElementById("mandelbrot").checked = is_mandelbrot
	document.getElementById("julia").checked = !is_mandelbrot
	disableJuliaCInputs(is_mandelbrot)
}


function save_settings_to_url() {
    const urlParams = new URLSearchParams()

	//state
	urlParams.set('ul_screen_x', state.ul_screen.x)
	urlParams.set('ul_screen_y', state.ul_screen.y)
	urlParams.set('width_screen', state.width_screen)
	
	// ui params			
	const params = getUIParameters();
	urlParams.set('julia_c_x', params.julia.C.x) 
	urlParams.set('julia_c_y', params.julia.C.y) 
	urlParams.set('max_iterations', params.max_iterations) 
	urlParams.set('in_set_color', rgbToHex(params.in_set_color)) 
	urlParams.set('out_set_color1', rgbToHex(params.out_set_color1)) 
	urlParams.set('out_set_color2', rgbToHex(params.out_set_color2)) 
	urlParams.set('is_mandelbrot', params.is_mandelbrot)
    
    window.location.hash = urlParams.toString() 
}

window.onload = function() {
	load_settings_from_url();
    render();

	document.getElementById('mandelbrot').addEventListener('change', () => disableJuliaCInputs(true));
	document.getElementById('julia').addEventListener('change', () => disableJuliaCInputs(false));

	document.querySelectorAll('.redraw').forEach(function(element) {
		element.addEventListener('change', render);
	});

	document.getElementById('canvas').onclick = canvasClickHandler;
    document.getElementById('zoom-in').onclick = zoomInHandler;
    document.getElementById('zoom-out').onclick = zoomOutHandler;
    document.getElementById('download-image').onclick = downloadImageHandler;
}
