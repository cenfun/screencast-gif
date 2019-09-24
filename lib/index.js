const fs = require("fs");
const omggif = require("omggif");
const UPNG = require("upng-js");
const neuquant = require('./neuquant.js');

const initOption = (option) => {

    let defaultOption = {

        //transform png transparent pixels
        pngBgColor: 0xffffff,

        //global

        //the number of times to loop, or 0 for forever.
        loop: 0,

        //Handling of Global Color Table
        palette: [0xffffff, 0x000000],
        //background color index
        background: 0,

        //===================================================
        //frame
        frame: {
            x: 0,
            y: 0,
            width: 0,
            height: 0,

            //ms
            delay: 100,

            //0 - No disposal specified.
            //1 - Do not dispose. 
            //2 - Restore to background color.
            //3 - Restore to previous. 
            disposal: 0,

            //transparent color index
            transparent: 0,

            palette: [],
            indices: []
        },

        //data
        frames: []
    };

    let frameOption = option.frame;
    delete option.frame;

    option = Object.assign(defaultOption, option);

    option.frame = Object.assign(option.frame, frameOption);

    return option;
};

const mergeColor = function(c, b, p) {
    let v = c * p + b * (1 - p);
    return Math.round(v);
};

const getImagePixels = (image, w, h, bgColor = 0xffffff) => {

    let bgR = bgColor >> 16 & 0xff;
    let bgG = bgColor >> 8 & 0xff;
    let bgB = bgColor & 0xff;

    let l = w * h;
    //png rgba 4 => rgb 3
    const pixels = new Uint8Array(l * 3);
    let i = 0;
    let j = 0;
    while (i < l) {
        let p = i * 4;
        let r = image[p++];
        let g = image[p++];
        let b = image[p++];
        let a = image[p++];
        if (a === 0) {
            r = bgR;
            g = bgG;
            b = bgB;
        } else if (a !== 255) {
            // console.log(r, g, b, a);
            let p = a / 255;
            r = mergeColor(r, bgR, p);
            g = mergeColor(g, bgG, p);
            b = mergeColor(b, bgB, p);
            // console.log(r, g, b);
        }
        pixels[j++] = r;
        pixels[j++] = g;
        pixels[j++] = b;
        i++;
    }
    return pixels;
};

const generateFrameList = (frames) => {
    //frame buffer handler
    let frameList = frames.map((frame) => {
        if (!frame) {
            return;
        }
        if (Buffer.isBuffer(frame)) {
            return {
                buffer: frame
            };
        }

        if (typeof(frame) === "string" && fs.existsSync(frame)) {
            let buffer = fs.readFileSync(frame);
            if (buffer) {
                return {
                    buffer: buffer
                };
            }
            return;
        }

        if (Buffer.isBuffer(frame.buffer)) {
            return frame;
        }

        if (typeof(frame.path) === "string" && fs.existsSync(frame.path)) {
            let buffer = fs.readFileSync(frame.path);
            if (buffer) {
                frame.buffer = buffer;
                return frame;
            }
            return;
        }

    });
    frameList = frameList.filter((item) => {
        return item && item.buffer;
    });
    return frameList;
};

const ScreencastGIF = (option) => {

    option = initOption(option);

    let frameList = generateFrameList(option.frames);

    //frame decode and neuquant handler
    frameList.forEach((frame) => {
        let img = UPNG.decode(frame.buffer);
        frame.width = img.width;
        frame.height = img.height;
        //img.data - rgba list: img.data.byteLength = img.width * img.height * 4
        let pixels = getImagePixels(img.data, img.width, img.height, option.pngBgColor);
        let nq = neuquant(pixels, img.width, img.height);
        frame.palette = nq.palette;
        frame.indices = nq.indices;
    });

    //canvas size
    let maxWidth = Math.max.apply(Math, frameList.map(frame => frame.width));
    let maxHeight = Math.max.apply(Math, frameList.map(frame => frame.height));

    let buf = Buffer.alloc(maxWidth * maxHeight * frameList.length + 1024);
    let gif = new omggif.GifWriter(buf, maxWidth, maxHeight, {
        loop: option.loop
    });

    frameList.forEach((frame) => {
        frame = Object.assign({}, option.frame, frame);
        gif.addFrame(frame.x, frame.y, frame.width, frame.height, frame.indices, {
            palette: frame.palette,
            // delay in hundredths of a sec (100 = 1s).
            delay: frame.delay * 0.1
        });
    });

    return buf.slice(0, gif.end());
};


module.exports = ScreencastGIF;
