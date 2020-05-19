

// global state
let ul_screen = { x: -1.5, y: 1.5 };
let width_screen = 3;

const C = { x: -1, y: 0};
const max_iter = 300;
const R = (1 + Math.sqrt(1 + 4 * norm(C))) / 2

function norm(z) {
    return Math.sqrt(z.x * z.x + z.y * z.y);
}

function f(z, c) {
    let x = (z.x * z.x) - (z.y * z.y) + c.x;
    let y = (2 * z.x * z.y) + c.y; 
    return {x, y};
}

// returns num iteration to find not in set, or null if in set
function in_set_estimator(start, update_func, threshold) {
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
    return in_set_estimator({x: 0, y:0}, f_n_0 => f(f_n_0, c), 2);
}

function julia_estimator(z) {
    return in_set_estimator(z, z => f(z, C), R);
}

function draw_pixel(ctx, color, r, c) {
    ctx.fillStyle = rgb(color.r, color.g, color.b)
    ctx.fillRect(c, r, 1, 1);
}

function rgb(r, g, b) {
    return `rgb(${r}, ${g}, ${b})`;
}


function compute_pixel_values() {
	let startTime = new Date().getTime();

	const canvas = document.getElementById('canvas');
    const ctx = canvas.getContext('2d');
    const height_px = canvas.height;
    const width_px = canvas.width;
    const height_screen = (width_screen * height_px) / width_px;

	let px_values = [];
	let unique_values = new Set();

    for (let r = 0; r < height_px; r++) {
		let row = []
    	for (let c = 0; c < width_px; c++) {
            let z = pixel_to_point({r, c}); 
            let iterations_to_escape = mandelbrot_estimator(z)
            //console.log(iterations_to_escape);
				
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
	
	console.log('iterToColor', iterToColor);	
	
	drawImage(px_values, iterToColor);
	//drawFullImage(px_values, iterToColor);
	
	let endTime = new Date().getTime();
	console.log('animate() time', (endTime - startTime));
}

function getIterationToColor(color1, color2, unique_values) {
	let iterToColor = {};	
	if (unique_values.size == 1) {	
		let singleIterVal = unique_values.values().next().value;
	 	iterToColor[singleIterVal] = color2;
	} else if (unique_values.size >= 2) {
		let min_iterations = Math.min(...unique_values);
		let max_iterations = Math.max(...unique_values);
	
		let colors = interpolateColors(color1, color2, max_iterations - min_iterations + 1);
		
		//console.log(colors);	
		for (let iterVal of unique_values) {
			iterToColor[iterVal] = colors[iterVal - min_iterations]
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
    const height_screen = (width_screen * height_px) / width_px;

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



function drawImage(px_values, iterToColor) {
	let startTime = new Date().getTime();

    const canvas = document.getElementById('canvas');
    const ctx = canvas.getContext('2d');
    const height_px = canvas.height;
    const width_px = canvas.width;
    const height_screen = (width_screen * height_px) / width_px;

	let setColor = hexToRgb(document.getElementById('in-set-color').value);
    for (let r = 0; r < height_px; r++) {
    	for (let c = 0; c < width_px; c++) {
            let iters = px_values[r][c]; 

			if (iters == null) {
                draw_pixel(ctx, setColor, r, c);
            } else {
				//console.log('here');
                draw_pixel(ctx, iterToColor[iters], r, c);
            }
        }
    }

	let endTime = new Date().getTime();
	console.log('drawImage time', (endTime - startTime));
}

// assumes existence of ul_screen and width_screen
function pixel_to_point(pixel) {
    const canvas = document.getElementById('canvas');
    const height_px = canvas.height;
    const width_px = canvas.width;
    const height_screen = (width_screen * height_px) / width_px;

    let {r, c} = pixel;
    let x = ul_screen.x + (c / width_px) * width_screen;
    let y = ul_screen.y - (r / height_px) * height_screen;
    return {x, y}
}



function updateZoom(center_px, new_screen_width) {
    const canvas = document.getElementById('canvas');
    const height_px = canvas.height;
    const width_px = canvas.width;

    console.log(center_px);
    // get cartesian coords of new center
    let center = pixel_to_point({ r: center_px.r, c: center_px.c}); 

    //console.log(center);
    // compute new width and height screen on plane
    width_screen = new_screen_width;
    //console.log(width_screen);
    
    const height_screen = (width_screen * height_px) / width_px;
    //console.log(height_screen);
   
    // set ul_screen to center - 1/2 width
    ul_screen = {
        x: center.x - width_screen / 2,
        y: center.y + height_screen / 2,
    }
    //console.log(ul_screen);
    animate();

}

// assumes existence of ul_screen and width_screen
function pixel_to_point(pixel) {
    const canvas = document.getElementById('canvas');
    const height_px = canvas.height;
    const width_px = canvas.width;
    const height_screen = (width_screen * height_px) / width_px;

    let {r, c} = pixel;
    let x = ul_screen.x + (c / width_px) * width_screen;
    let y = ul_screen.y - (r / height_px) * height_screen;
    return {x, y}
}



function updateZoom(center_px, new_screen_width) {
    const canvas = document.getElementById('canvas');
    const height_px = canvas.height;
    const width_px = canvas.width;

    //console.log(center_px);
    // get cartesian coords of new center
    let center = pixel_to_point({ r: center_px.r, c: center_px.c}); 

    console.log(center);
    // compute new width and height screen on plane
    width_screen = new_screen_width;
    console.log(width_screen);
    
    const height_screen = (width_screen * height_px) / width_px;
    console.log(height_screen);
   
    // set ul_screen to center - 1/2 width
    ul_screen = {
        x: center.x - width_screen / 2,
        y: center.y + height_screen / 2,
    }
    console.log(ul_screen);
    animate();
}


function zoomInHandler() {
    const canvas = document.getElementById('canvas');
    const height_px = canvas.height;
    const width_px = canvas.width;

    let center_px = { r: height_px / 2, c: width_px / 2 }; 
    updateZoom(center_px, width_screen / 2);
}

function zoomOutHandler() {
    const canvas = document.getElementById('canvas');
    const height_px = canvas.height;
    const width_px = canvas.width;

    let center_px = { r: height_px / 2, c: width_px / 2 }; 
    updateZoom(center_px, width_screen * 2);
}

function canvasClickHandler(e) {
    const canvas = document.getElementById('canvas');
    const height_px = canvas.height;
    const width_px = canvas.width;

    let center_px = { r: e.clientY, c: e.clientX };
    updateZoom(center_px, width_screen / 2);
}

// numColors must be >= 2
function interpolateColors(color1, color2, numColors) {
	console.log('numColors' + numColors);

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
}
