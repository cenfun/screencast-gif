const fs = require('fs');
const path = require('path');
const EC = require('eight-colors');

const ScreencastGIF = require('../lib');

const getCost = (time_start) => {
    return `${(Date.now() - time_start).toLocaleString()}ms`;
};

const generateGif = (item) => {
    const time_start = Date.now();

    const name = item.name;
    const inputDir = item.inputDir;
    const outputDir = item.outputDir;

    console.log(`Reading PNG files from ${inputDir} ...`);
    const frames = fs.readdirSync(inputDir).map((png) => {
        return path.resolve(inputDir, png);
    });

    console.log('Set last frame with 3000ms delay');
    const last = frames.pop();
    frames.push({
        path: last,
        delay: 3000
    });

    // console.log(frames);

    console.log(`Got ${EC.cyan(frames.length)} PNG files and cost ${getCost(time_start)}`);

    const filename = `${name}.gif`;

    console.log(`Generating ${EC.cyan(filename)} with ${frames.length} frames ...`);
    const buf = ScreencastGIF({
        frame: {
            delay: 100
        },
        frames: frames
    });

    const gifPath = path.resolve(outputDir, filename);
    fs.writeFileSync(gifPath, buf);

    console.log(`Generated ${EC.green(filename)} and cost ${EC.cyan(getCost(time_start))}`);
    console.log('');
};

const main = () => {

    const outputDir = path.resolve(__dirname, '../.temp');
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, {
            recursive: true
        });
    }


    const exampleDir = path.resolve(__dirname, '../../gif-encoder-wasm/example');
    const dirs = fs.readdirSync(exampleDir);

    const list = dirs.map((item) => {
        const p = path.resolve(exampleDir, item);
        const stat = fs.statSync(p);
        if (stat.isDirectory()) {
            return {
                name: item,
                inputDir: p,
                outputDir
            };
        }
    });

    list.filter((item) => item).forEach((item) => {
        generateGif(item);
    });

};

main();
