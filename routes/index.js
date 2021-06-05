var express = require('express');
var router = express.Router();

const path = require("path")
const fs = require("fs")
const portAudio = require("naudiodon")

/* GET home page. */
router.get('/track', function(req, res, next) {
  const filePath = path.resolve(__dirname, "../public/audio", "./musica.mp3");
  const stat = fs.statSync(filePath);

  res.writeHead(206, {
    'Content-Type': "audio/mp3",
    'Content-Length': stat.size
  });

  const readStream = fs.createReadStream(filePath);

  readStream.pipe(res)
});

router.get("/track-streamed", (req, res, next) => {
  const defaultdevice = "BlackHole 16ch";
  const index = portAudio.getDevices().findIndex(({name}) => name === defaultdevice);

  const ai = new portAudio.AudioIO({
      inOptions: {
          channelCount: 16,
          sampleRate: 44100,
          sampleFormat: portAudio.SampleFormat16Bit,
          deviceId: index, // Use -1 or omit the deviceId to select the default device
          closeOnError: false, // Close the stream if an audio error is detected, if set false then just log the error
      }
  });

  //Setting response to stream
  res.writeHead(200, {
    'Transfer-Encoding': 'chunked',
    'Content-Type': 'audio/mpeg', 
    'Accept-Ranges': 'bytes'
  });

  ai.start();

  ai.on("data", (chunk) => {
    const [channelA, channelB] = [1, 6];

    const channelsCount = 16;
    const byteLength = chunk.byteLength;
    const bitSampleLength = 16;
    const byteSampleLength = bitSampleLength / 8;
    const allCHByteLength = channelsCount * (byteSampleLength);
    const samples = byteLength / allCHByteLength;

    let result = new Int8Array();

    for(let i=0; i<samples; i++){
        /* const chALength = channelABuffer.byteLength;
        const chBLength = channelBBuffer.byteLength;

        console.log(i);
        console.log(chALength);
        console.log(chBLength); */

        const resultLength = result.byteLength;

        const posA = (i * allCHByteLength) + ((channelA - 1) * byteSampleLength);
        const chANewSlice = chunk.slice(posA, posA + byteSampleLength);

        const posB = (i * allCHByteLength) + ((channelB - 1) * byteSampleLength);
        const chBNewSlice = chunk.slice(posB, posB + byteSampleLength);

        //console.log(chANewSlice.byteLength);
        //console.log(chBNewSlice.byteLength);

        const temp = new Int8Array(
            resultLength + chANewSlice.byteLength + chBNewSlice.byteLength
        );

        temp.set(result, 0);
        temp.set(chANewSlice, resultLength);
        temp.set(chBNewSlice, resultLength + chANewSlice.byteLength);

        result = temp;   
    }

    console.log(result.buffer);
    res.write(Buffer.from(result.buffer));
  });
  
  res.on("close", ()=>{
    console.log("Conexión terminada");
    ai.quit()
  })
})


module.exports = router;
