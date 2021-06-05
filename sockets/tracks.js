const ss = require("socket.io-stream");
const fs = require("fs")
const path  = require("path")
const net = require("net")
const portAudio = require("naudiodon");

const connectionFun = client => {

    console.log("Entro aqui putos");
    client.emit("start", "Hay conexion")

    const defaultdevice = "BlackHole 16ch";
    const index = portAudio.getDevices().findIndex(({name}) => name === defaultdevice);

    const ai = new portAudio.AudioIO({
        inOptions: {
            channelCount: 16,
            sampleFormat: portAudio.SampleFormat16Bit,
            sampleRate: 44100,
            deviceId: index, // Use -1 or omit the deviceId to select the default device
            closeOnError: false, // Close the stream if an audio error is detected, if set false then just log the error
        }
    });

    client.on("track", () => {
        console.log("Pidiendo rolon");
        //console.log(portAudio.getDevices())

        //console.log(index);        

        /* const stream = ss.createStream();

        const filePath = path.resolve(__dirname, "../public/audio", "./musica.mp3");
        const stat = fs.statSync(filePath);
        const readStream = fs.createReadStream(filePath);
        
        readStream.on("data", (chunk) => {
            client.emit("sound-piece", chunk)
        }) */

        const filePath = path.resolve(__dirname, "../public/audio", "./musica.mp3");
        const ws = fs.createWriteStream(filePath);
        
        //Start streaming
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

                /* console.log(tempA.byteLength);
                console.log(tempB.byteLength); */

                /* tempA.set(channelABuffer, 0);
                tempA.set(chANewSlice, chALength);

                tempB.set(channelBBuffer, 0);
                tempB.set(chBNewSlice, chBLength);
                
                channelABuffer = tempA;
                channelBBuffer = tempB; */

                /* console.log(channelABuffer.byteLength);
                console.log(channelBBuffer.byteLength);
                console.log("---------------------"); */
            }

            //console.log(chunk);
            //console.log(result.buffer);
            //console.log(chunk.slice(0,2));
            //console.log(chunk.slice(2,4));
            //console.log("***************");
            //client.emit("sound-piece", result.buffer.slice(0));

            
        });
        
        /* fs.open(filePath, fs.constants.O_RDONLY | fs.constants.O_NONBLOCK, (err, fd) => {
            const pipe = new net.Socket({ fd });

            pipe.on("data", (chunk) => {
                client.emit("sound-piece", chunk)
            })
        }) */
    })


    client.on("disconnect", ()=> {
        console.log("La connecion se ha rompido, por favor no lo queremos aqui cerca en un rato... Que hace con su vida pidiendo por socket un audio de prueba... Busque pareja, tenga hijos, casa y busque una vida plena... Pase un  buen día :v");
        ai.quit()
    })
}

module.exports = { connectionFun }