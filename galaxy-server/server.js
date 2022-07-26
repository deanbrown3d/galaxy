const express = require('express');
const randomId = require('random-id');
const { createCanvas, createImageData } = require('canvas');
const fs = require("fs").promises;
const { createFFmpeg, fetchFile } = require('@ffmpeg/ffmpeg');

const app = express(),
      bodyParser = require("body-parser");
      port = 3070;

const folder = 'C:\\GalaxyImages';

const ffmpegInstance = createFFmpeg({ log: true });
console.log(`ffmpeg instance created`);
console.log(ffmpegInstance);

let ffmpegLoadingPromise = ffmpegInstance.load();
console.log(`ffmpegInstance load called`);

async function getFFmpeg() { // From https://www.digitalocean.com/community/tutorials/how-to-build-a-media-processing-api-in-node-js-with-express-and-ffmpeg-wasm
  if (ffmpegLoadingPromise) {
    await ffmpegLoadingPromise;
    ffmpegLoadingPromise = undefined;
  }
  return ffmpegInstance;
}


function getDateTime() {
  function pad2(n) {  // always returns a string
    return '_' + (n < 10 ? '0' : '') + n;
  }

  const date = new Date();

  return date.getFullYear() +
    pad2(date.getMonth() + 1) +
    pad2(date.getDate()) +
    pad2(date.getHours()) +
    pad2(date.getMinutes()) +
    pad2(date.getSeconds());
};
// place holder for the data
const users = [
  {
    id: "1",
    firstName: "first1",
    lastName: "last1",
    email: "abc@gmail.com"
  },
  {
    id: "2",
    firstName: "first2",
    lastName: "last2",
    email: "abc@gmail.com"
  },
  {
    id: "3",
    firstName: "first3",
    lastName: "last3",
    email: "abc@gmail.com"
  }
];

// New from https://codingshiksha.com/javascript/node-js-express-ffmpeg-wasm-project-to-create-videos-from-multiple-images-in-browser-using-javascript/
app.use(function (req, res, next) {
  res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
  res.setHeader("Cross-Origin-Embedder-Policy", "require-corp");
  next();
});

app.use(bodyParser.json({limit: '500mb'}));
app.use(bodyParser.urlencoded({limit: '500mb', extended: true}));

// app.use(bodyParser.json());
app.use(express.static(process.cwd() + '/my-app/dist'));

app.get('/api/users', (req, res) => {
  console.log('api/users called!!!!!!!')
  res.json(users);
});

app.post('/api/user', (req, res) => {
  const user = req.body.user;
  user.id = randomId(10);
  console.log('Adding user:::::', user);
  users.push(user);
  res.json("user addedd");
});


app.post('/api/initialize-folder', (req, res) => {
  const dateTime = getDateTime();
  const path = [folder, dateTime].join('\\');
  console.log(`mkdir: ${path}`);
  fs.mkdir(path);
  res.json(dateTime);
});

app.post('/api/frame', (req, res) => {
  // Main data in csv string format:
  const jsonImageData = req.body.jsonImageData;

  // Parameters for creating images:
  const frameIndex = req.body.imageParameters.frameIndex;
  const dateTime = req.body.imageParameters.dateTime;
  const width = req.body.imageParameters.width;
  const height = req.body.imageParameters.height;
  const rgbColors = req.body.imageParameters.rgbColors;


  const dataLength = jsonImageData.length;
  console.log(`jsonImageData.length = ${dataLength}`);

  const sample = jsonImageData.slice(0, 100);
  console.log(`sample = ${sample}`);

  const imageDataValues = jsonImageData.split(',');

  const imageData = createImageData(width, height);
  const length = width * height * 4;
  let dataIndex = 0;
  if (rgbColors === 3) {
    for ( let i = 0; i <= length; i += 4 ) {
      imageData.data[i] = imageDataValues[dataIndex];
      imageData.data[i+1] = imageDataValues[dataIndex+1];
      imageData.data[i+2] = imageDataValues[dataIndex+2];
      imageData.data[i+3] = 255; // alpha field
      dataIndex += 3;
    }
  }
  if (rgbColors === 1) {
    for ( let i = 0; i <= length; i += 4 ) {
      imageData.data[i] = imageDataValues[dataIndex];
      imageData.data[i+1] = imageDataValues[dataIndex];
      imageData.data[i+2] = imageDataValues[dataIndex];
      imageData.data[i+3] = 255; // alpha field
      dataIndex += 1;
    }
  }

  const canvas = createCanvas(width, height);
  const context = canvas.getContext('2d');
  context.putImageData(imageData, 0, 0);
  // KEEP: contextTemp.drawImage(canvas, 0, 0, width, height, 0, 0, destWidth, destHeight);

  // https://stackoverflow.com/questions/5867534/how-to-save-canvas-data-to-file
  const img = canvas.toDataURL();
  const data = img.replace(/^data:image\/\w+;base64,/, "");
  const buf = Buffer.from(data, "base64");
  const indexString = String(frameIndex);
  const paddedIndexString = indexString.padStart(6, '0');
  const fileName = `image_${paddedIndexString}.png`;
  const path = [folder, dateTime, fileName].join('\\');
  console.log(path);
  fs.writeFile(path, buf);
  res.json(sample);
});

app.post('/api/test-response', async (req, res) => {
  // const frameIndex = req.body.imageParameters.frameIndex;
  const dateTime = req.body.videoParameters.dateTime;
  const width = req.body.videoParameters.width;
  const height = req.body.videoParameters.height;
  const rgbColors = req.body.videoParameters.rgbColors;

  console.log(`dateTime = ${dateTime}`);
  console.log(`width = ${width}`);
  console.log(`height = ${height}`);
  console.log(`rgbColors = ${rgbColors}`);

  // var files = fs.readdirSync('C:/tmp').filter(fn => fn.endsWith('.csv'));
  // const dateTime = '2022_07_25_12_36_42';
  const path = [folder, dateTime].join('\\');
  const files = await fs.readdir(path);
  const pngs = files.filter(fn => fn.endsWith('.png')); // image_000000.png
  for (let i = 0; i < pngs.length; i++) {
    console.log(pngs[i]);
  }

  res.json(`test-response OK. Number of files: ${pngs.length}`);
});

app.post('/api/create-video', async (req, res) => {
  console.log(`create-video called. Beginning now.`);

  const dateTime = req.body.videoParameters.dateTime; // e.g. '2022_07_25_12_36_42'
  const width = req.body.videoParameters.width;
  const height = req.body.videoParameters.height;
  const rgbColors = req.body.videoParameters.rgbColors;
  const m = req.body.videoParameters.m;
  const n = req.body.videoParameters.n;
  const b = req.body.videoParameters.b;
  const stars = req.body.videoParameters.stars;

  console.log(`dateTime = ${dateTime}`);
  console.log(`width = ${width}`);
  console.log(`height = ${height}`);
  console.log(`rgbColors = ${rgbColors}`);

  const videoFileName = `FinishedVideos\\galaxy-${dateTime}-${width}x${height}-m${m}-n${n}-b${b}-${stars}.mp4`;
  console.log(`Creating video file: ${videoFileName}`);

  res.json(`Creating video file now: ${videoFileName}`);

  const ffmpeg = await getFFmpeg();

  const path = [folder, dateTime].join('\\');
  const files = await fs.readdir(path);
  const pngs = files.filter(fn => fn.endsWith('.png')); // image_000000.png
  for (let i = 0; i < pngs.length; i++) {
    const indexString = String(i);
    const paddedIndexString = indexString.padStart(6, '0');
    const fileName = `image_${paddedIndexString}.png`;
    const inputPath =  [path, fileName].join('\\');
    ffmpeg.FS('writeFile', `tmp.${paddedIndexString}.png`, await fetchFile(inputPath));
  }

  const outPath = [folder, videoFileName].join('\\');

  await ffmpeg.run('-framerate', '30', '-pattern_type', 'glob', '-i', '*.png', '-pix_fmt', 'yuv420p', 'out.mp4');
  const data = ffmpeg.FS('readFile', 'out.mp4');
  // console.log('data:');
  // console.log(data);
  // console.log(data.buffer);

  fs.writeFile(outPath, data);
  ffmpeg.FS('unlink', 'out.mp4');
  console.log(`create-video done.`);
});



//
//
// app.post('/api/create-video-actuall-creates-153-frame-video', async (req, res) => {
//   // console.log(`POST for create-video called.`);
//   // const ffmpegInstance = createFFmpeg({ log: true });
//   // console.log(`ffmpegInstance created`);
//   // console.log(ffmpegInstance);
//   // let ffmpegLoadingPromise = ffmpegInstance.load();
//   // console.log(`ffmpegLoadingPromise created and load called`);
//   console.log(`POST for video called.`);
//   const ffmpeg = await getFFmpeg();
//
//   console.log(ffmpeg);
//   const dateTime = '2022_07_25_12_36_42';
//   const imageNames = 'image_%06d.png';
//   const path = [folder, dateTime].join('\\');
//   const outPath = [folder, dateTime, 'awesome-output.mp4'].join('\\');
//
//   for (let i = 0; i <= 153; i += 1) {
//     const indexString = String(i);
//     const paddedIndexString = indexString.padStart(6, '0');
//     const fileName = `image_${paddedIndexString}.png`;
//     const inputPath =  [path, fileName].join('\\');
//     ffmpeg.FS('writeFile', `tmp.${paddedIndexString}.png`, await fetchFile(inputPath));
//   }
//
//   // const path0 = [path, 'image_000000.png'].join('\\');
//   // const path1 = [path, 'image_000001.png'].join('\\');
//   // const path2 = [path, 'image_000002.png'].join('\\');
//   //
//   //
//   // // https://github.com/ffmpegwasm/ffmpeg.wasm/blob/master/examples/browser/image2video.html
//   // // ffmpeg.FS('writeFile', `tmp.${num}.png`, await fetchFile(`../assets/triangle/tmp.${num}.png`));
//   // ffmpeg.FS('writeFile', `tmp.${'000000'}.png`, await fetchFile(path0));
//   // ffmpeg.FS('writeFile', `tmp.${'000001'}.png`, await fetchFile(path1));
//   // ffmpeg.FS('writeFile', `tmp.${'000002'}.png`, await fetchFile(path2));
//
//   await ffmpeg.run('-framerate', '30', '-pattern_type', 'glob', '-i', '*.png', '-pix_fmt', 'yuv420p', 'out.mp4');
//   const data = ffmpeg.FS('readFile', 'out.mp4');
//   console.log('data:');
//   console.log(data);
//   console.log(data.buffer);
//
//   // fs.createWriteStream(outPath).write(buffer);
//   fs.writeFile(outPath, data);
//
//
//   ffmpeg.FS('unlink', 'out.mp4');
//
//
//   // ffmpeg -r 30 -i image_%06d.png -pix_fmt yuv420p galaxy.mp4
//   // await ffmpeg.run('-framerate', '30', '-pattern_type', 'glob', '-i', '*.png', '-i', 'audio.ogg', '-c:a', 'copy', '-shortest', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', 'out.mp4');
//
//
//
//   // await ffmpeg.run('-framerate', '30', '-pattern_type', 'glob', '-i', path, '-pix_fmt', 'yuv420p', 'out.mp4');
//
//
//
//   // ffmpeg.FS.
// });


app.get('/', (req,res) => {
  res.sendFile(process.cwd() + '/my-app/dist/index.html');
});

app.listen(port, () => {
    console.log(`Server listening on the port::${port}`);
});
































