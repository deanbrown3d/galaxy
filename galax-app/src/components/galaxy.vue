<template>
  <div>
    <div class="hello">
      <div class="header"
           :style="percentGradiant">
        Galaxy Simulator - deanbrown.org <span>{{ buttonDisabled ? (percentageDone + '%') : '' }}</span>
      </div>
    </div>
    <div style="color: white; font-size: 0.8em;">
      m: {{m}},
      stars: {{prettyEstimatedStars}},
      n: {{n}},
      b: {{b}},
      frame: {{frame}} of approx: {{ desiredFrames }},
      threads: {{ numThreads }},
      coords: {{startUserZCoordinate}} to {{endUserZCoordinate}},
      currentZ: {{currentZ}},
      width: {{width}},
      height: {{height}},
      dateTime: {{dateTime}},
      preview: {{preview}},
      activePosts: {{activePosts}},
      sleeps: {{sleeps}},
      Color depth: {{rgbColors}},
      Post Frames: {{postFramesToServer}},
      Remaining time: {{remainingTime}}
    </div>
    <div style="text-align: left;">
      <input type="button" :disabled="buttonDisabled" :value="postFramesToServer ?
        (autoCreateVideos ? 'Start' : 'Start without Video') : 'Test Only'" @click="startClick()" style="width: 200px;">
      <input type="checkbox" style="margin-left: 10px;" id="preview1" v-model="preview">
      <label style="color: white; margin-left: 5px;" for="preview1">&nbsp;Preview</label>
      <input type="checkbox" :disabled="buttonDisabled" style="margin-left: 10px;" id="useColor1" v-model="useColor">
      <label style="color: white; margin-left: 5px;" for="useColor1">&nbsp;Use Color</label>
      <input type="checkbox" :disabled="buttonDisabled" style="margin-left: 10px;" id="postFramesToServer1" v-model="postFramesToServer">
      <label style="color: white; margin-left: 5px;" for="postFramesToServer1">&nbsp;Post Frames</label>
      <template v-if="postFramesToServer">
        <input type="checkbox" :disabled="buttonDisabled" style="margin-left: 10px;" id="alsoCreateVideos1" v-model="autoCreateVideos">
        <label style="color: white; margin-left: 5px;" for="alsoCreateVideos1">&nbsp;Auto-create Video</label>
      </template>
<!--      <input type="button" :disabled="buttonDisabled" value="Test Response" @click="testResponseClick()" style="width: 200px; margin-left: 10px;">-->
    </div>
    <div>
      <div style="width: 100%; display: inline-block; text-align: left;">
        <canvas id="canvas" style="width : 100%; height : 100%;"></canvas>
      </div>
    </div>
  </div>
</template>

<script>
import worker_function from '../js/worker';
import axios from "axios";

const workers = [];

export default {
  name: 'galaxy',
  data() {
      return {
        percentageDone: 0,
        // Multi-threading:
        numThreads: 3, // 4, // 2 cores but selecting 4 is still faster.
        // Desired frames:
        desiredFrames: 100, // 4000, // 00, // 25, // 2000, // 3000, // 5000,
        frame: 0,

        // z-related coordinates
        startUserZCoordinate: 998.8, //998.8, // 997, // 998, // 993, // 999.5, // 990, // 965, // 995 // 950, // -800, // -975, // -800,
        endUserZCoordinate: 1000.6,
        deltaZCoordinates: null, // endUserZCoordinate - startUserZCoordinate,
        currentUserZCoordinate: null,

        // Incremental change of z-position for each frame:
        startMotionIncrement: null, // deltaZCoordinates / desiredFrames, // 0.0002, // 0.0008, // Testing memory //0.0018, // 0.0018, // 0.01, // 0.1, // 0.00125, // 0.1, // 0.003, // 0.01, // 0.05, // 0.5, // 0.02, // 0.1,
        motionIncrement: null, // = startMotionIncrement,

        width: 800, // 1600, // 800, // 2400, // 1600,
        height: 450, // 900, // 450, // 1350, // 900,

        dateTime: null,
        activePosts: 0,
        sleeps: 0,
        preview: true,
        buttonDisabled: false,
        startTime: null,
        remainingTime: 'pending...',
        useColor: false,
        postFramesToServer: true,
        autoCreateVideos: true,
        estimatedStars: 0,
        n: 0,
        m: 0,
        b: 0,
        maxFrameIndexPosted: -1,
      }
  },
  computed: {
    currentZ() {
      return (this.currentUserZCoordinate || 0).toFixed(3);
    },
    rgbColors() {
      if (this.useColor) {
        return 3;
      }
      else {
        return 1;
      }
    },
    prettyEstimatedStars() {
      return this.estimatedStars.toLocaleString();
    },
    percentGradiant() {
      const color = this.postFramesToServer ? 'dodgerblue' : 'red';
      return `background-image: linear-gradient(to right, ${color}, ${color} ${this.percentageDone}%, transparent ${this.percentageDone}%, transparent 100%);`;
    },

  },
  watch: {
    frame() {
      if (this.frame) {
        const now = new Date();
        const msTotal = now - this.startTime;
        const msPerFrame = msTotal / this.frame; // * this.desiredFrames / this.frame;
        const numFramesRemaining = Math.max(0, this.desiredFrames - this.frame);
        const timeRemaining = numFramesRemaining * msPerFrame;
        const hours = timeRemaining / (1000 * 60 * 60);
        const answer = Math.round(hours * 100) / 100;
        this.remainingTime = `${answer} hours`;
      }
    },
  },
  methods: {
    startClick() {
      this.start();
    },
    async postInitFolderFrame() {
      const res = await axios.post(`/api/initialize-folder`, {});
      console.log(res);
      this.dateTime = res.data;
      console.log(`folder: ${this.dateTime}`);
    },
    async postFrame(imageData, imageParameters ) {
      // const jsonImageData = JSON.stringify(imageData);
      this.activePosts += 1;
      const jsonImageData = imageData.join(',');
      await axios.post(`/api/frame`,{jsonImageData, imageParameters});
      this.activePosts -= 1;
    },
    async start() {
      const self = this;
      self.maxFrameIndexCreated = -1;
      self.startTime = new Date();
      self.buttonDisabled = true;
      if (self.postFramesToServer) {
        await self.postInitFolderFrame();
      }
      else {
        self.dateTime = 'now';
      }
      self.deltaZCoordinates = self.endUserZCoordinate - self.startUserZCoordinate;

      // Incremental change of z-position for each frame:
      self.motionIncrement = self.deltaZCoordinates / self.desiredFrames;

      let workerParams = {}
      let actualFramesCreated = 0;

      self.frame = 0;
      let paused = false;

      self.currentUserZCoordinate = self.startUserZCoordinate;

      const frames = (self.endUserZCoordinate - self.startUserZCoordinate) / self.motionIncrement; // 4000;

      self.width = 8 * Math.round(self.width / 8);
      self.height = 8 * Math.round(self.height / 8);

      let depth = self.height;
      let halfw = self.width / 2;
      let halfh = self.height / 2;
      workerParams.width = self.width;
      workerParams.height = self.height;
      workerParams.depth = depth;
      workerParams.halfw = halfw;
      workerParams.halfh = halfh;
      workerParams.rgbColors = self.rgbColors;

      const canvas = document.getElementById("canvas");
      const context = canvas.getContext("2d");

      const canvases = [];
      canvas.width =  self.width; // *1.5;
      canvas.height =  self.height; // *1.5;

      document.addEventListener("keydown", function(event) {
        console.log(event.which);
        let keyCode =event.which;
        if (keyCode === 32) {  // 'space''
          paused = !paused;
        }
      });

      function run(workerIndex) {
        canvases.push(null);
        const index = canvases.length - 1;
        const workerDrawParams = {
          currentUserZCoordinate: self.currentUserZCoordinate,
          index,
        }
        workers[workerIndex].postMessage(['draw', workerDrawParams]);
      }

      const sleep = async (ms) => {
        return new Promise(resolve => setTimeout(resolve, ms));
      };
      setTimeout(() => {
        for (let i = 0; i < self.numThreads; i++) {
          workers[i].postMessage(['params', workerParams]);
        }
        for (let i = 0; i < self.numThreads; i++) {
          run(i);
        }
      }, 100);

      for (let i = 0; i < self.numThreads; i++) {
        const myWorker = new Worker(URL.createObjectURL(
            new Blob(["("+worker_function.toString()+")()"],{type: 'text/javascript'})
        ));
        const workerIndex = i;
        myWorker.onmessage = async function (e) {
          const text = e.data[0];
          if (text === 'galaxy-stats') {
            console.log(e.data[1]);
            self.estimatedStars = e.data[1].estimatedStars;
            self.n = e.data[1].n;
            self.m = e.data[1].m;
            self.b = e.data[1].b;

          }
          else if (text === 'image') {
            const dataIn = e.data[1]; // <-- this is the minimum needed to post to the server for one frame.
            const canvasIndex = e.data[2];
            while (self.activePosts >= 5) {
              self.sleeps += 1;
              await sleep(500);
            }
            if (self.postFramesToServer) {
              if (canvasIndex > self.maxFrameIndexPosted) {
                self.maxFrameIndexPosted = canvasIndex;
              }
              const imageParameters = {
                frameIndex: canvasIndex,
                width: self.width,
                height: self.height,
                dateTime: self.dateTime,
                rgbColors: self.rgbColors,
              };
              self.postFrame(dataIn, imageParameters );
            }
            actualFramesCreated += 1;
            if (self.preview) {
              const imageData = new ImageData(self.width, self.height);

              const length = self.width * self.height * 4; // imageData.data.length;
              let dataIndex = 0;
              if (self.rgbColors === 3) {
                for ( let i = 0; i <= length; i += 4 ) {
                  imageData.data[i] = dataIn[dataIndex];
                  imageData.data[i+1] = dataIn[dataIndex+1];
                  imageData.data[i+2] = dataIn[dataIndex+2];
                  imageData.data[i+3] = 255; // alpha field
                  dataIndex += 3;
                }
              }
              else if (self.rgbColors === 1) {
                for ( let i = 0; i <= length; i += 4 ) {
                  imageData.data[i] = dataIn[dataIndex];
                  imageData.data[i+1] = dataIn[dataIndex];
                  imageData.data[i+2] = dataIn[dataIndex];
                  imageData.data[i+3] = 255; // alpha field
                  dataIndex += 1;
                }
              }

              // Write the returned image in full resolution to the left-hand canvas:
              context.putImageData(imageData, 0, 0);
            }

            document.title = `${paused ? '*' : ''}${self.frame + 1} of ${Math.round(frames)}, z=${Math.round(100 * self.currentUserZCoordinate) / 100}
              \nactualFramesCreated=${actualFramesCreated}`;

            self.frame += 1;
            self.percentageDone = Math.round(self.frame / frames * 1000) / 10;

            if (self.currentUserZCoordinate > self.endUserZCoordinate) {
              actualFramesCreated = canvases.length;
              // maxFrameIndexPosted
              if (workerIndex === 0 && self.postFramesToServer && self.autoCreateVideos) {
                while (self.activePosts > 0) {
                  self.sleeps += 1;
                  await sleep(500);
                }
                const videoParameters = {
                  dateTime: self.dateTime,
                  width: self.width,
                  height: self.height,
                  rgbColors: self.rgbColors,
                  m: self.m,
                  n: self.n,
                  b: self.b,
                  stars: self.prettyEstimatedStars,
                };
                axios.post(`/api/create-video`, {
                  videoParameters
                });
              }
              return;
            }
            while (paused) {
              await sleep(250);
            }

            // Advance the viewer's position:
            self.currentUserZCoordinate += self.motionIncrement;

            // Start off another process in worker thread:
            run(workerIndex);
          }
        }
        workers.push(myWorker);
      }
    },
    async createVideoClick() {
      const videoParameters = {
        width: this.width,
        height: this.height,
        dateTime: this.dateTime,
        rgbColors: this.rgbColors,
      };
      // await axios.post(`/api/frame`,{jsonImageData, imageParameters});

      const res = await axios.post(`/api/create-video`, {
        videoParameters
      });
      console.log(res);
    },
    async testResponseClick() {
      const videoParameters = {
        width: this.width,
        height: this.height,
        dateTime: this.dateTime,
        rgbColors: this.rgbColors,
        m: this.m,
        n: this.n,
        b: this.b,
        stars: this.prettyEstimatedStars,
      };
      const res = await axios.post(`/api/test-response`, {videoParameters});
      console.log(res);
    },

  },
}
</script>