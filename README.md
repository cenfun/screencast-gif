
# Screencast GIF
Generation GIF from Screencast PNG

## Install 
```sh
npm install screencast-gif
```
## Usage
```js
const fs = require("fs");
const ScreencastGIF = require("screencast-gif");
let buf = ScreencastGIF({
    //transform png transparent pixels
    pngBgColor: 0xffffff,

    //global

    //the number of times to repeat, or 0 for forever.
    repeat: 0,

    // Net Quantization Algorithm quality 1 - 30
    quality: 10,

    //Handling of Global Color Table
    palette: [0xffffff, 0x000000],
    //background color index
    background: 0,

    //frame
    frame: {
        //ms
        delay: 100,

        //0 - No disposal specified.
        //1 - Do not dispose. 
        //2 - Restore to background color.
        //3 - Restore to previous. 
        disposal: 0,

        //transparent color index
        transparent: 0
    },
   
    frames: ["1.png", "2.png", "3.png", {
        path: "4.png",
        delay: 500
    }]
});
fs.writeFileSync("my.gif", buf);
```

## CHANGELOG

+ v1.0.1
  - fix delay in ms (1000 = 1s) from hundredths of a sec (100 = 1s).