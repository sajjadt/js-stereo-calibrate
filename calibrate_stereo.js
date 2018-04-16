var cv = require('./opencv.js');
var jpeg = require('jpeg-js');
var fs = require('fs');


load_image_points = function (
  board_width, 
  board_height, 
  num_imgs, 
  square_size,
  leftimg_dir, 
  rightimg_dir, 
  leftimg_filename, 
  rightimg_filename,
  extension) {

  var board_size = new cv.Size(board_width, board_height),
      board_n = board_width * board_height,
      img1, img2, 
      left_img_path, right_img_path,
      raw_data,
      jpeg_data,
      found1, found2,
      img_size,
      left_image_points = new cv.MatVector(),
      right_image_points = new cv.MatVector(),
      object_points = new cv.MatVector();

  for (var i = 1; i <= num_imgs; i++) {

    left_img_path = leftimg_dir + leftimg_filename + i + extension;
    right_img_path = rightimg_dir + rightimg_filename + i + extension;

    console.log("Processing images ", left_img_path, " and ", right_img_path);

    jpeg_data = fs.readFileSync(left_img_path);
    raw_data = jpeg.decode(jpeg_data);
    img1 = cv.matFromImageData(raw_data);
    cv.cvtColor(img1, img1, cv.COLOR_RGBA2GRAY); // Convert to grayscale

    jpeg_data = fs.readFileSync(right_img_path);
    raw_data = jpeg.decode(jpeg_data);
    img2 = cv.matFromImageData(raw_data);
    cv.cvtColor(img2, img2, cv.COLOR_RGBA2GRAY); // Convert to grayscale

    found1 = false;
    found2 = false;

    img_size = img1.size();

    var corners1 = new cv.Mat(),
        corners2 = new cv.Mat();

    // CV_CALIB_CB_ADAPTIVE_THRESH | CV_CALIB_CB_FILTER_QUADS
    found1 = cv.findChessboardCorners(img1, board_size, corners1, 1|4);
    found2 = cv.findChessboardCorners(img2, board_size, corners2, 1|4);

    if (found1) {
      cv.cornerSubPix(img1, corners1, new cv.Size(5, 5), new cv.Size(-1, -1), new cv.TermCriteria(3, 30, 0.1));
      cv.drawChessboardCorners(img1, board_size, corners1, true);
    }

    if (found2) {
      cv.cornerSubPix(img2, corners2, new cv.Size(5, 5), new cv.Size(-1, -1), new cv.TermCriteria(3, 30, 0.1));
      cv.drawChessboardCorners(img2, board_size, corners2, true);
    }

    var obj = new cv.Mat(board_height*board_width, 1, cv.CV_32FC3);
    var view = obj.data32F;

    for (var j = 0; j < board_height; j++)
      for (var k = 0; k < board_width; k++) {
        view[3*j*board_width + k*3 + 0] = k * square_size;
        view[3*j*board_width + k*3 + 1] = j * square_size;
        view[3*j*board_width + k*3 + 2] = 0;
      }

    if (found1 && found2) {
      console.log(i, ". Found corners!");
      left_image_points.push_back(corners1);
      right_image_points.push_back(corners2);
      object_points.push_back(obj);
    }
  }

  return {left_imgs: left_image_points,
          right_imgs: right_image_points,
          objs: object_points,
          img_size: img_size};
}


// ./calibrate_stereo -n 27 -u cam_left.yml -v cam_right.yml -L ../calib_imgs/1/ -R ../calib_imgs/1/ -l left -r right -o cam_stereo.yml

var board_width = 9,
    board_height = 6,
    num_imgs = 27,
    square_size = 0.02423,
    leftimg_dir = "./assets/calib_imgs/1/",
    rightimg_dir = "./assets/calib_imgs/1/";

image_points = load_image_points(board_width, board_height, num_imgs, square_size,
                 leftimg_dir, rightimg_dir, "left", "right", ".jpg");

var K1 = new cv.Mat(), 
    K2 = new cv.Mat(),
    R = new cv.Mat(),
    T = new cv.Mat(),
    F = new cv.Mat(),
    E = new cv.Mat(),
    D1 = new cv.Mat(),
    D2 = new cv.Mat(),
    flag = 0 | 256;  // | CV_CALIB_FIX_INTRINSIC;





console.log("Starting Calibration");
cv.stereoCalibrate(image_points.objs, image_points.left_imgs, image_points.right_imgs, K1, D1, K2, D2, image_points.img_size, R, T, E, F);

console.log( "K1:", K1);
console.log( "K2:", K2);
console.log( "D1:", D1);
console.log( "D2:", D2);
console.log( "R:", R);
console.log( "T:", T);
console.log( "E:", E);
console.log( "F:", F);  
console.log("Done with the Calibration");


console.log("Starting Rectification");
var R1 = new cv.Mat(), 
    R2 = new cv.Mat(),
    P1 = new cv.Mat(), 
    P2 = new cv.Mat(),
    Q = new cv.Mat();

cv.stereoRectify(K1, D1, K2, D2, image_points.img_size, R, T, R1, R2, P1, P2, Q);
console.log( "R1", R1);
console.log( "R2", R2);
console.log( "P1", P1);
console.log( "P2", P2);
console.log( "Q", Q);
console.log("Done with the Rectification");
