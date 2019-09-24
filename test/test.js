const fs = require("fs");
const ScreencastGIF = require("../lib");

const generateGif = (name) => {
    let time_start = Date.now();
    let folder = "example/" + name;
    let gifpath = folder + ".gif";
    console.log("start to generate: " + gifpath + " from png folder " + folder + " ...");
    let frames = fs.readdirSync(folder).map((pngname) => {
        return folder + "/" + pngname;
    });
    let buf = ScreencastGIF({
        frame: {
            delay: 100
        },
        frames: frames
    });
    fs.writeFileSync(gifpath, buf);
    console.log("generated and cost " + (Date.now() - time_start).toLocaleString() + "ms: " + gifpath);
};

generateGif("screenshot");
generateGif("elf");
generateGif("cat");
generateGif("photo");
