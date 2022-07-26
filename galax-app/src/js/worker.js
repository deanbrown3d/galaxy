  export default function worker_function() {
    let params = null;
    let width = null;
    let height = null;
    let halfw = null;
    let halfh = null;
    let rgbColors = null;

    // Pixels / pure graphics related:
    const n = 3; // 2; // 3; // 5; // 10; // 10; // stars drawn to a max of n x n pixels to look bigger than one pixel.

    // Galaxies and stars:

    const overallMultiplier = 800; // 50; // 500; // 100; // 100; // 100; // 1500; // 5; // 150; // 50; // 100; // 100; // 50; // 40; // 40; // 5; // 4; // 50; // 0.1; // 20; // 20 // 5; // 3.5; // 1; // 0.10;

    const baseStarCountMultiplier = 50;
    const starCountMultiplier = baseStarCountMultiplier * overallMultiplier; // 50; // 1000;

    const baseBrightnessMultiplier = 20; // 35; // 45; // 15; // 200; // 35;
    const brightnessMultiplier = baseBrightnessMultiplier / overallMultiplier; // 200 35 / overallMultiplier;

    const baseMaxSmoothingBrightness = 250;
    const maxSmoothingBrightness = baseMaxSmoothingBrightness * overallMultiplier; // For smoothing stars // 20

    // Other
    let estimatedStars = 0;
    const zmultiplier = 0.7; // START HERE. Try 0.7 since 0.55 is nearly perfect. // 3; // 3; // 3; // 1

    onmessage = function (e) {
      const text = e.data[0];
      // console.log(`Worker: Message received: ${text}`);
      if (text === 'params') {
        params = e.data[1];
        width = params.width;
        height = params.height;
        halfw = params.halfw;
        halfh = params.halfh;
        rgbColors = params.rgbColors;
        postMessage(['galaxy-stats', {
          estimatedStars,
          m: overallMultiplier,
          b: baseBrightnessMultiplier,
          n,
        }]);

      } else if (text === 'draw') {
        const workerDrawParams = e.data[1];
        draw(workerDrawParams);
      }
    }
    let seed1 = 0;
    let seed2 = 0;
    const numRandoms = 1000000; // 1000000; // 50000000;
    const randoms1 = [];
    for (let i = 0; i < numRandoms; i++) {
      const x = Math.sin(seed1++) * 1000000.314159261717; // 1000 for swirls
      randoms1.push(x < 0 ? -x % 1 : x % 1);
    }
    console.log(`Length of randoms1 = ${randoms1.length}`);
    const random = () => {
      seed1 += 1;
      if (seed1 >= numRandoms) {
        seed1 = 0;
        seed2 += 1;
      }
      return (randoms1[seed1] + randoms1[seed2]) % 1;
    }

    const numNormals = 100000;
    const normals = [];
    let seed3 = 0;

    const normalPrecalc = (n, t) => {
      return function () {
        let e, r, i;
        do
          e = 2 * random() - 1,
          r = 2 * random() - 1,
          i = e * e + r * r;
        while (!i || i > 1);
        return n + t * e * Math.sqrt(-2 * Math.log(i) / i)
      }
    }

    for (let i = 0; i < numNormals; i++) {
      const x = (normalPrecalc(0, 1))();
      normals.push(x);
    }
    console.log(`normals:`);
    console.log(normals);

    const normal = (n, t) => {
      return function () {
        seed3++;
        if (seed3 >= numNormals) {
          seed3 = 0;
        }
        return n + normals[seed3] * t;
      }
    }

      // const normal = (n, t) => {
      // let e = 2;
      // return 2 > e && (t = 1), 1 > e && (n = 0), function () {
      //   let e, r, i;
      //   do e = 2 * random() - 1, r = 2 * random() - 1, i = e * e + r * r; while (!i || i > 1);
      //   return n + t * e * Math.sqrt(-2 * Math.log(i) / i)
      // }
    // }

// https://stackoverflow.com/questions/2751938/random-number-within-a-range-based-on-a-normal-distribution
    const normal2D = () => {
      const r = Math.sqrt(-2 * Math.log(random()));
      const theta = 2 * Math.PI * random();
      // const phi = 1 * Math.PI * random();
      const x = r * Math.cos(theta);
      const y = r * Math.sin(theta);
      // const z = r * (Math.cos(phi));
      return {x, y}
    }
    const meanCenterOfGalaxy = 1000;

    const activeGalaxies = [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1];
    const galaxies = [
      {
        stars: 1000,
        randomZ: normal(meanCenterOfGalaxy, 3 * zmultiplier), // 0.3
        rx: 0.2, ry: 0.2, mu: 1.0,
        starBrightness: () => 0.1 + 0.9 * random(),
      },
      {
        stars: 500,
        randomZ: normal(meanCenterOfGalaxy, 0.1667 * zmultiplier),
        rx: 0.2, ry: 0.1, mu: 0.5,
        starBrightness: () => 0.1 + 0.9 * random(),
      },
      {
        stars: 100,
        randomZ: normal(meanCenterOfGalaxy, 0.14 * zmultiplier),
        rx: 0.2, ry: 0.15, mu: 0.2,
        starBrightness: () => 0.1 + 0.9 * random(),
      },
      {
        stars: 30,
        randomZ: normal(meanCenterOfGalaxy, 0.07 * zmultiplier),
        rx: 0.2, ry: 0.15, mu: 0.1,
        starBrightness: () => random() * 1, // 0.5,
      },
      // {
      //   stars: 10,
      //   randomZ: normal(meanCenterOfGalaxy, 0.015 * zmultiplier), // 0.005
      //   rx: 0.2, ry: 0.15, mu: 0.04,
      //   starBrightness: () => random() * 0.3, // 0.1, // 0.5
      // },
      {
        stars: 20,
        randomZ: normal(meanCenterOfGalaxy, 0.04 * zmultiplier), // 0.005
        rx: 0.2, ry: 0.15, mu: 0.07,
        starBrightness: () => random() * 0.3, // 0.1, // 0.5
      },
      {
        stars: 15,
        randomZ: normal(meanCenterOfGalaxy, 0.03 * zmultiplier), // 0.005
        rx: 0.2, ry: 0.15, mu: 0.05,
        starBrightness: () => random() * 0.25, // 0.1, // 0.5
      },
      {
        stars: 10,
        randomZ: normal(meanCenterOfGalaxy, 0.02 * zmultiplier), // 0.005
        rx: 0.2, ry: 0.15, mu: 0.03,
        starBrightness: () => random() * 0.2, // 0.1, // 0.5
      },
      {
        stars: 7,
        randomZ: normal(meanCenterOfGalaxy, 0.016 * zmultiplier), // 0.005
        rx: 0.2, ry: 0.15, mu: 0.025,
        starBrightness: () => random() * 0.15, // 0.1, // 0.5
      },
      {
        stars: 5,
        randomZ: normal(meanCenterOfGalaxy, 0.012 * zmultiplier), // 0.005
        rx: 0.2, ry: 0.15, mu: 0.02,
        starBrightness: () => random() * 0.1, // 0.1, // 0.5
      },
    ];
    estimatedStars = 0;

    for (let g = 0; g < galaxies.length; g++) {
      if (activeGalaxies[g]) {
        estimatedStars += galaxies[g].stars * starCountMultiplier;
      }
    }

    console.log(`estimatedStars = ${estimatedStars}`);

    function draw(workerDrawParams) {
      seed1 = 0;
      seed2 = 0;
      seed3 = 0;
      const currentUserZCoordinate = workerDrawParams.currentUserZCoordinate;
      const data = new Uint8Array(width * height * rgbColors); // imageData.data;
      // seed = 0;
      let pixels = []; // width * height away
      let pixelsSmoothed = [];
      for (let i = 0; i < width; i++) {
        pixels[i] = [];
        pixelsSmoothed[i] = [];
        for (let j = 0; j < height; j++) {
          pixels[i][j] = 0;
          pixelsSmoothed[i][j] = 0;
        }
      }

      const maxDist = n * 1.414;

      const distSquaredPrecalc = [];
      const cosineLimiterPrecalc = [];

      // Once-off calculate all required pre-calculates:
      if (n > 0) {
        for (let x = -n; x <= n; x++) {
          distSquaredPrecalc[x + n] = [];
          cosineLimiterPrecalc[x + n] = [];
          for (let y = -n; y <= n; y++) {
            if (x === 0 && y === 0) {
              continue;
            }
            const distSquared = (x * x + y * y); // never zero as filtered out above.
            distSquaredPrecalc[x + n][y + n] = distSquared;
            const dist = Math.sqrt(distSquared);
            const fractionalDistance = dist / maxDist;
            // If at the edge, fractional distance is close to 1. If near the center, it is close to 0;
            // So for brighter near the center, use cosine of this number.
            // This stop the brightest stars looking like squares.
            // const cosineLimiter = Math.cos(fractionalDistance * 1.57); // pi / 2
            const cosineLimiter = Math.max(0, Math.cos(fractionalDistance * 2)); // pi / 2
            cosineLimiterPrecalc[x + n][y + n] = 0.5 * cosineLimiter;
          }
        }
      }

      for (let g = 0; g < galaxies.length; ++g) {
        if (!activeGalaxies[g]) {
          continue;
        }
        const galaxy = galaxies[g];
        const starCount = galaxy.stars * starCountMultiplier;
        for (let s = 0; s < starCount; ++s) {
          // tally++;
          // if (tally %(starCountMultiplier * 100) === 0) {
          //     // console.log(`${tally}: Travel speed: ${factor}`);
          //     document.title = `${Math.round(tally / 1000)}K of ${Math.round(estimatedStars / 1000)}K ${frame + 1} of ${frames}, z=${Math.round(100 * currentUserZCoordinate) / 100}`;
          // }
          const xy = normal2D();
          const x = xy.x * galaxy.rx * galaxy.mu;
          const y = xy.y * galaxy.ry * galaxy.mu;
          // const z = meanCenterOfGalaxy + xy.z * galaxy.rz * galaxy.mu;
          const z = galaxy.randomZ();
          const star = {
            x, y, z,
            brightness: galaxy.starBrightness(),
          };

          const zdist = star.z - currentUserZCoordinate;
          if (zdist <= 0) {
            continue;
          }
          const xdist = star.x; // user is at x=0;
          const ydist = star.y; // ditto y=0

          const xstretch = 1.5;
          const ystretch = 1.5;
          const screenX = halfw + (star.x * width) / zdist * xstretch;
          const screenY = halfh + (star.y * height) / zdist * ystretch;
          const floorX = Math.floor(screenX);
          const floorY = Math.floor(screenY);

          const distSquared = (zdist * zdist + ydist * ydist + xdist * xdist);
          const totalBrightnessToAdd = star.brightness / distSquared;

          const antialias = true;
          const middleOfScreen = !(screenX < 1 || screenX >= (width - 1) || screenY < 1 || screenY >= (height - 1));
          if (!middleOfScreen) {
            continue;
          }
          if (antialias) {
            let fractionX = screenX - floorX;
            let fractionY = screenY - floorY;
            let left = 0;
            let midX = 0; // mid hand side!
            let right = 0;
            let top = 0;
            let midY = 0;
            let bottom = 0;
            if (fractionX < 0.5) { // e.g. fractionX = 0.1, so add 0.5 makes 0.6, and 60% goes into the rhs, and 40% into the midX
              const useX = fractionX + 0.5; // 0.6
              left = 1.0 - useX;
              midX = useX;
            }
            else { // e.g. fractionX = 0.9, so it's 0.1 near the RHS edge. We need 60% midX and 40% right:
              const useX = 1.0 - fractionX + 0.5; // 1.0 - 0.9 = 0.1, plus 0.5 = 0.6, or 60% midX, 40% right
              midX = useX;
              right = 1.0 - useX;
            }

            if (fractionY < 0.5) {
              const useY = fractionY + 0.5;
              top = 1.0 - useY;
              midY = useY;
            }
            else {
              const useY = 1.0 - fractionY + 0.5;
              midY = useY;
              bottom = 1.0 - useY;
            }
            pixels[floorX - 1][floorY - 1] += totalBrightnessToAdd * left * top;
            pixels[floorX - 1][floorY    ] += totalBrightnessToAdd * left * midY;
            pixels[floorX - 1][floorY + 1] += totalBrightnessToAdd * left * bottom;
            pixels[floorX    ][floorY - 1] += totalBrightnessToAdd * midX * top;
            pixels[floorX    ][floorY    ] += totalBrightnessToAdd * midX * midY;
            pixels[floorX    ][floorY + 1] += totalBrightnessToAdd * midX * bottom;
            pixels[floorX + 1][floorY - 1] += totalBrightnessToAdd * right * top;
            pixels[floorX + 1][floorY    ] += totalBrightnessToAdd * right * midY;
            pixels[floorX + 1][floorY + 1] += totalBrightnessToAdd * right * bottom;
          }
          else {
            // screenX = Math.round(screenX);
            // screenY = Math.round(screenY);

            // if (g === 0 && s === 0) {
            //   console.log(`dist: ${Math.sqrt(distSquared)}, zdist: ${zdist}, ydist: ${ydist}, xdist: ${xdist}`);
            // }
            // if (!(screenX < 0 || screenX >= width || screenY < 0 || screenY >= height)) {
            // if (middleOfScreen) {
              // pixels[screenX][screenY] += totalBrightnessToAdd;
            pixels[floorX][floorY] += totalBrightnessToAdd;
            // }
          }
        }
      }
      for (let i = 0; i < width; i++) {
        for (let j = 0; j < height; j++) {
          pixelsSmoothed[i][j] = pixels[i][j];
          if (n === 0) {
            continue;
          }
          // if (pixels[i][j] < 500) { // New July 25
          //   continue;
          // }
          for (let x = -n; x <= n; x++) {
            for (let y = -n; y <= n; y++) {
              if (x === 0 && y === 0) {
                continue;
              }
              if ((i + x) >= 0 && (i + x) < width && (j + y) >= 0 && (j + y) < height) {
                const brightnessToUse = Math.min(maxSmoothingBrightness, pixels[i + x][j + y]);
                const distSquared = distSquaredPrecalc[x + n][y + n]; // never zero as filtered out above.
                const cosineLimiter = cosineLimiterPrecalc[x + n][y + n]; // never zero as filtered out above.
                // // If at the edge, fractional distance is close to 1. If near the center, it is close to 0;
                // // So for brighter near the center, use cosine of this number.
                // // This stop the brightest stars looking like squares.
                pixelsSmoothed[i][j] += brightnessToUse / distSquared * cosineLimiter; //  + 10 * pixels[i + x][j + y] / (x*x*x*x+y*y*y*y) ;
              }
            }
          }
        }
      }

      for (let i = 0; i < width; i++) {
        for (let j = 0; j < height; j++) {
          let totalBrightness = pixelsSmoothed[i][j] * brightnessMultiplier;
          if (totalBrightness > 255) {
            totalBrightness = 255; // For now
          }
          if (totalBrightness === 0) {
            continue;
          }

          totalBrightness = Math.round(totalBrightness);
          if (rgbColors === 3) {
            let index = i * 3 + j * width * 3;
            data[index] = totalBrightness;
            data[++index] = totalBrightness;
            data[++index] = totalBrightness;
          }
          else if (rgbColors === 1) {
            let index = i + j * width;
            data[index] = totalBrightness;
          }
        }
      }
      // postMessage(['text', `Worker: Draw completed`]);
      postMessage(['image', data, workerDrawParams.index]);
      // console.log(`Worker ended: ${workerDrawParams.index}`);

      //
      //
      // context.putImageData(imageData, 0, 0);
      //
      // const canvasTemp = document.createElement("canvas");
      // canvasTemp.width =  destWidth;
      // canvasTemp.height =  destHeight;
      // canvases.push(canvasTemp);
      // const contextTemp = canvasTemp.getContext("2d");
      // contextTemp.drawImage(canvas, 0, 0, width, height, 0, 0, destWidth, destHeight);
      //
      // context2.drawImage(canvasTemp, 0, 0);
    }
  }
