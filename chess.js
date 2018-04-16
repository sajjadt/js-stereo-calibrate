var cv = require('./opencv.js');
var jpeg = require('jpeg-js');
var fs = require('fs');

var jpeg_data = fs.readFileSync("./assets/perfect.jpg");
var raw_data = jpeg.decode(jpeg_data);

// Create a matrix from image. input image expected to be in RGBA format
var src_mat = cv.matFromImageData(raw_data);
cv.cvtColor(src_mat, src_mat, cv.COLOR_RGBA2GRAY); // Convert to grayscale

var corners = new cv.Point2fVector();

let dst_mat  = new cv.Mat();
var boardSize = new cv.Size(7, 7);

var ret = cv.findChessboardCorners(src_mat, boardSize, dst_mat);

if (ret) {
	
	var view = dst_mat.data32F;
	console.log(view.length);
	for( i =0 ;i < view.length; i+=2) {
		console.log("X = ", view[i], "Y = ", view[i+1]);
	}

	cv.drawChessboardCorners(src_mat, boardSize, dst_mat, true);

  cv.cvtColor(src_mat, src_mat, cv.COLOR_GRAY2RGBA);
	var raw_data = {
	data: src_mat.data,
    width: src_mat.size().width,
		height: src_mat.size().height
  };
	var jpeg_data = jpeg.encode(raw_data, 50);
	fs.writeFileSync("out_blob.jpg", jpeg_data.data);
} else {
  console.log("NO chess board was found!");
}
