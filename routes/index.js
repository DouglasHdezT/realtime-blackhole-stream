var express = require('express');
var router = express.Router();

const path = require("path")
const fs = require("fs")
const portAudio = require('naudiodon');
const lame = require("@suldashi/lame");
const ms = require('mediaserver');
/* GET home page. */
router.get('/track', function (req, res, next) {
  const filePath = path.resolve(__dirname, "../public/audio", "./musica.mp3");
  const stat = fs.statSync(filePath);

  res.writeHead(206, {
    'Content-Type': "audio/mp3",
    'Content-Length': stat.size
  });

  const readStream = fs.createReadStream(filePath);

  readStream.pipe(res)
});
router.get("/pipe-track", (req, res, next) => {
  const defaultdevice = "BlackHole 2ch";
  //const defaultdevice = "Built-in Input"
  const index = portAudio.getDevices().findIndex(({ name }) => name === defaultdevice);

  const ai = new portAudio.AudioIO({
    inOptions: {
      channelCount: 2,
      sampleRate: 44100,
      sampleFormat: portAudio.SampleFormat16Bit,
      deviceId: index, // Use -1 or omit the deviceId to select the default device
      lameQuality: 5, // Valid values: 2, 5, 7
      bitRate: 320, // kbps,
      closeOnError: false
    }
  });

  // create the Encoder instance
  var encoder = new lame.Encoder({
    // input
    channels: 2,        // 2 channels (left and right)
    bitDepth: 16,       // 16-bit samples
    sampleRate: 44100,  // 44,100 Hz sample rate

    // output
    bitRate: 320,
    outSampleRate: 22050,
    mode: lame.STEREO // STEREO (default), JOINTSTEREO, DUALCHANNEL or MONO
  });

  ai.on('error', err => console.error(err));

  // Create a write stream to write out to a raw audio file
  var ws = fs.createWriteStream('rawAudio.mp3');

  //Start streaming
  process.stdin.pipe(encoder);

  ai.pipe(encoder);
  ai.start();
  encoder.pipe(ws);

  process.on('SIGINT', () => {
    console.log('Received SIGINT. Stopping recording.');
    ai.quit();
  });

})

router.get("/get-stream-media",(res,req)=>{
  const route = path.join(__dirname,"rawAudio.mp3")
  ms.pipe(res, req, "rawAudio.mp3");
})

router.get("/track-streamed", (req, res, next) => {
  //const defaultdevice = "BlackHole 16ch";
  const defaultdevice = "Built-in Input"
  const index = portAudio.getDevices().findIndex(({ name }) => name === defaultdevice);

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

    for (let i = 0; i < samples; i++) {
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

  res.on("close", () => {
    console.log("Conexión terminada");
    ai.quit()
  })
})


module.exports = router;
