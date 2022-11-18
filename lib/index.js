const fs = require('fs');
const GIF = require('omggif');
const PNG = require('upng-js');
const neuquant = require('./neuquant.js');

const initOption = (option) => {

    const defaultOption = {

        // transform png transparent pixels
        pngBgColor: 0xffffff,

        // global

        // the number of times to repeat, or 0 for forever.
        repeat: 0,

        // Net Quantization Algorithm quality 1 - 30
        quality: 10,

        // Handling of Global Color Table
        palette: [0xffffff, 0x000000],
        // background color index
        background: 0,

        // ===================================================
        // frame
        frame: {
            x: 0,
            y: 0,
            width: 0,
            height: 0,

            // ms
            delay: 100,

            // 0 - No disposal specified.
            // 1 - Do not dispose.
            // 2 - Restore to background color.
            // 3 - Restore to previous.
            disposal: 0,

            // transparent color index
            transparent: 0,

            palette: [],
            indices: []
        },

        // data
        frames: []
    };

    const frameOption = option.frame;
    delete option.frame;

    option = Object.assign(defaultOption, option);

    option.frame = Object.assign(option.frame, frameOption);

    return option;
};

const mergeColor = function(c, b, p) {
    const v = c * p + b * (1 - p);
    return Math.round(v);
};

const getImagePixels = (image, w, h, bgColor = 0xffffff) => {

    const bgR = bgColor >> 16 & 0xff;
    const bgG = bgColor >> 8 & 0xff;
    const bgB = bgColor & 0xff;

    const l = w * h;
    // png rgba 4 => rgb 3
    const pixels = new Uint8Array(l * 3);
    let i = 0;
    let j = 0;
    while (i < l) {
        let p = i * 4;
        let r = image[p++];
        let g = image[p++];
        let b = image[p++];
        const a = image[p++];
        if (a === 0) {
            r = bgR;
            g = bgG;
            b = bgB;
        } else if (a !== 255) {
            // console.log(r, g, b, a);
            const pa = a / 255;
            r = mergeColor(r, bgR, pa);
            g = mergeColor(g, bgG, pa);
            b = mergeColor(b, bgB, pa);
            // console.log(r, g, b);
        }
        pixels[j++] = r;
        pixels[j++] = g;
        pixels[j++] = b;
        i++;
    }
    return pixels;
};

const getFrameBuffer = (frame, filePath) => {
    if (fs.existsSync(filePath)) {
        const buffer = fs.readFileSync(filePath);
        if (buffer) {
            frame.buffer = buffer;
            return frame;
        }
    }
};

const generateFrameList = (frames) => {
    // frame buffer handler
    let frameList = frames.map((frame) => {
        if (!frame) {
            return;
        }

        if (Buffer.isBuffer(frame)) {
            return {
                buffer: frame
            };
        }

        if (Buffer.isBuffer(frame.buffer)) {
            return frame;
        }

        if (typeof frame === 'string') {
            return getFrameBuffer({}, frame);
        }

        if (typeof frame.path === 'string') {
            return getFrameBuffer(frame, frame.path);
        }
    });
    frameList = frameList.filter((item) => item && item.buffer);
    return frameList;
};

const ScreencastGIF = (option) => {

    option = initOption(option);

    const frameList = generateFrameList(option.frames);

    // frame decode and neuquant handler
    frameList.forEach((frame) => {
        const img = PNG.decode(frame.buffer);
        frame.width = img.width;
        frame.height = img.height;

        // img.data - rgba list: img.data.byteLength = img.width * img.height * 4
        const rgba = new Uint8Array(PNG.toRGBA8(img)[0]);
        const pixels = getImagePixels(rgba, img.width, img.height, option.pngBgColor);

        // pixels - array of pixels in RGB format
        // samplefac - sampling factor 1 to 30 where lower is better quality
        const nq = neuquant(pixels, option.quality);
        frame.palette = nq.palette;
        frame.indices = nq.indices;
    });

    // canvas size
    const maxWidth = Math.max.apply(Math, frameList.map((frame) => frame.width));
    const maxHeight = Math.max.apply(Math, frameList.map((frame) => frame.height));

    const buf = Buffer.alloc(maxWidth * maxHeight * frameList.length + 1024);
    const gif = new GIF.GifWriter(buf, maxWidth, maxHeight, {
        loop: option.repeat
    });

    frameList.forEach((frame) => {
        frame = {
            ... option.frame,
            ... frame
        };
        gif.addFrame(frame.x, frame.y, frame.width, frame.height, frame.indices, {
            palette: frame.palette,
            // delay in hundredths of a sec (100 = 1s).
            delay: frame.delay * 0.1
        });
    });

    return Uint8Array.prototype.slice.call(buf);
};


module.exports = ScreencastGIF;
