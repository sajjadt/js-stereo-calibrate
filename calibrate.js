var cv = require('./opencv.js');
var jpeg = require('jpeg-js');
var fs = require('fs');

setup_calibration = function(
  board_width, 
  board_height, 
  num_imgs, 
  square_size, 
  imgs_directory, 
  imgs_filename,
  extension ) {

  var board_size = new cv.Size(board_width, board_height),
      board_n = board_width * board_height,
      img_path, 
      jpeg_data, 
      raw_data, 
      img1,
      gray = new cv.Mat(),
      corners = new cv.Mat(),
      image_points = new cv.MatVector(),
      object_points = new cv.MatVector();


  var img_size;
  for (var k = 1; k <= num_imgs; k++) {

    img_path = imgs_directory + imgs_filename + k + extension;
    console.log("Processing image ", img_path);

    jpeg_data = fs.readFileSync(img_path);
    raw_data = jpeg.decode(jpeg_data);
    img1 = cv.matFromImageData(raw_data);
    cv.cvtColor(img1, img1, cv.COLOR_RGBA2GRAY); // Convert to grayscale

    img_size = img1.size();
    var found = cv.findChessboardCorners(img1, board_size, corners, 1|4);

    //, CV_CALIB_CB_ADAPTIVE_THRESH | CV_CALIB_CB_FILTER_QUADS);

    if (found) {
      cv.cornerSubPix(img1, corners, new cv.Size(5, 5), new cv.Size(-1, -1), 
        new cv.TermCriteria(3, 30, 0.1));
      cv.drawChessboardCorners(img1, board_size, corners, true);
      console.log(k, ". Found corners!");
    }
    
    var obj = new cv.Mat(board_height*board_width, 1, cv.CV_32FC3);
    var view = obj.data32F;

    for (var i = 0; i < board_height; i++)
      for (var j = 0; j < board_width; j++) {

        view[3*i*board_width + j*3 + 0] = j * square_size;
        view[3*i*board_width + j*3 + 1] = i * square_size;
        view[3*i*board_width + j*3 + 2] = 0;
      }

    if (found) {
      image_points.push_back(corners);
      object_points.push_back(obj);
    }
  }

  return {imgs: image_points,
          objs: object_points,
          img_size: img_size};
}


computeReprojectionErrors = function(
  objectPoints,
  imagePoints,
  rvecs, 
  tvecs,
  cameraMatrix, 
  distCoeffs) {

  var imagePoints2 = new cv.Mat(),
       i,
       totalPoints = 0,
       totalErr = 0, 
       err,
       perViewErrors = new cv.FloatVector();

  perViewErrors.resize(objectPoints.size(), 0);

  var err = 0;
  for (i = 0; i < objectPoints.size(); ++i) {

    // imagePoints2 will be a Mat of point2f s
    // objectPoints will be a Mat of point3f s

    //console.log("objectPoints", objectPoints.get(i).data32F);
    
    //continue;
    cv.projectPoints(objectPoints.get(i), rvecs.get(i), tvecs.get(i), cameraMatrix,
                  distCoeffs, imagePoints2);


    //console.log(imagePoints.get(i).total(), imagePoints2.total());
    //console.log(imagePoints.get(i).elemSize(), imagePoints2.elemSize());

    err = cv.norm1(imagePoints.get(i), imagePoints2);

    var n = objectPoints.get(i).size().width * objectPoints.get(i).size().height;
    perViewErrors.set(i, Math.sqrt(err*err/n));

    totalErr = totalErr + err*err;
    totalPoints = totalPoints + n;
  }
  return Math.sqrt(totalErr/totalPoints);
}


// ./calibrate -w 9 -h 6 -n 27 -s 0.02423 -d "../calib_imgs/1/" -i "left" -o "cam_left.yml" -e "jpg"
// ./calibrate -w 9 -h 6 -n 27 -s 0.02423 -d "../calib_imgs/1/" -i "right" -o "cam_right.yml" -e "jpg"

var board_width = 9,
    board_height = 6,
    num_imgs = 27,
    square_size = 0.02423,
    imgs_directory = "./assets/calib_imgs/1/";

points_left = setup_calibration(
  board_width,
  board_height, 
  num_imgs, 
  square_size, 
  imgs_directory, 
  "left", 
  ".jpg");

points_right = setup_calibration(
  board_width,
  board_height, 
  num_imgs, 
  square_size, 
  imgs_directory, 
  "right", 
  ".jpg");

console.log("Starting Calibration");

var K = new cv.Mat(),
    D = new cv.Mat(),
    rvecs = new cv.MatVector(), 
    tvecs = new cv.MatVector(),
    flag = 2048 | 4096; //flag |= CV_CALIB_FIX_K4 | CV_CALIB_FIX_K5;

cv.calibrateCamera(points_left.objs, points_left.imgs, points_left.img_size, K, D, rvecs, tvecs, flag);
console.log("Calibration error (left): ", computeReprojectionErrors(points_left.objs, points_left.imgs, rvecs, tvecs, K, D));


cv.calibrateCamera(points_right.objs, points_right.imgs, points_right.img_size, K, D, rvecs, tvecs, flag);
console.log("Calibration error (right): ", computeReprojectionErrors(points_right.objs, points_right.imgs, rvecs, tvecs, K, D));


points_left.imgs.delete();
points_left.objs.delete();
points_right.imgs.delete();
points_right.objs.delete();