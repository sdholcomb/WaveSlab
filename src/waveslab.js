//****************************
//Author: sdholcomb
//****************************


//============================================================
//Waveform:
//=============================================================
function Waveform(container,
  barSize = 5, spacing = 1, amplitude= 0.25, cursorSize = 2,
  mainColor = "#ffffff", progressionColor = "#869aba", cursorColor = "#ffffff"
  ){

  //get container
  var container = document.getElementById(container);

  //setup canvas. Keeping accessible for user manipulation
  this.canvas = document.createElement('canvas');
  this.canvas.width = container.offsetWidth;
  this.canvas.height = container.offsetHeight;
  var canvasCtx = this.canvas.getContext("2d");
  container.appendChild(this.canvas);
  this.canvas.addEventListener("mousedown", handleWaveClick.bind(this));

  const WIDTH = this.canvas.width;
  const HEIGHT = this.canvas.height;

  //setup audio context
  var audioCtx = new (window.AudioContext || window.webkitAudioContext)();

  //capture arguments
  var barSize = barSize;
  var spacing = barSize + spacing;
  var amplitude = HEIGHT * amplitude;
  var mainColor = mainColor;
  var progressionColor = progressionColor;
  var cursorColor = cursorColor;
  var cursorSize = cursorSize;

  //timing variables
  var playing = false;
  var playbackTime = 0;
  var pastTime = 0;
  var source;

  //---------------------------------------------------------
  //genWaveform(): Loads audio and launches animation
  //               once audio is ready
  //---------------------------------------------------------
  this.genWaveform = function(url){
    document.addEventListener('audioReady', () => { this.render(); }, false);
    this.loadAudio(url);
  }

  //---------------------------------------------------------
  //playPause(): alternates between playing and pausing playback
  //---------------------------------------------------------
  this.playPause = function(){
    if(!playing){
  		source = audioCtx.createBufferSource();
  		source.buffer = this.audBuffer;
  		source.connect(audioCtx.destination);
  		source.start(audioCtx.currentTime, playbackTime);
  		pastTime = audioCtx.currentTime;
  		playing = true;
  	}
  	else{
  		source.stop();
  		playing = false;
  	}
  }
  //---------------------------------------------------------
  //loadAudio(): loads the audio and stores results
  //---------------------------------------------------------
  this.loadAudio = function(url){
    var readyEvent = new Event('audioReady');
    var self = this;
    var request = new XMLHttpRequest();
    request.open('GET', url, true);
    request.responseType = 'arraybuffer';

    // Decode asynchronously
    request.onload = function() {
      audioCtx.decodeAudioData(request.response,
  			function(buffer){
  				self.audBuffer = buffer;
  				self.duration = buffer.duration;
          self.chanData = buffer.getChannelData(0);
          self.step = Math.ceil(self.chanData.length / WIDTH);
          document.dispatchEvent(readyEvent);
          console.log("okay to draw!");
  			});
    }
    request.send();
  }

  //---------------------------------------------------------
  //draw(): draws this waveform
  //---------------------------------------------------------
  this.draw = function() {
    canvasCtx.clearRect(0, 0, WIDTH, HEIGHT);

  	for(var i = 0; i < WIDTH; i += spacing){
  		var min = 1.0;
  		var max = -1.0;
  		for(var j = 0; j < this.step; j++){
  			var val = this.chanData[(i*this.step)+j];
  			if(val < min)
  				min = val;
  			if(val > max)
  				max = val;
  		}

      //set color based on progression
  		if(i / WIDTH * this.duration <= playbackTime)
  			canvasCtx.fillStyle = progressionColor;
  		else
  			canvasCtx.fillStyle = mainColor;

      //draw the data bar
  		canvasCtx.fillRect(i, HEIGHT/2 + (min)*amplitude, barSize, Math.max(1,(max-min)*amplitude));
  	}

  	//draw progression bar
  	canvasCtx.fillStyle = cursorColor;
  	canvasCtx.fillRect(playbackTime/this.duration * WIDTH, HEIGHT/2 - amplitude, cursorSize, amplitude*2 );
  }

  //---------------------------------------------------------
  //setPlayback(): Handles progression of playback during render
  //---------------------------------------------------------
  function syncTime(){
    if(playing){
      playbackTime = playbackTime + audioCtx.currentTime - pastTime;
      pastTime = audioCtx.currentTime;
    }
  }
  //---------------------------------------------------------
  //handleWaveClick(): handles when waveform is clicked with mouse
  //---------------------------------------------------------
  function handleWaveClick(){
    var x  = event.clientX - this.canvas.offsetLeft;
  	playbackTime = (x/WIDTH * this.duration);
    pastTime = audioCtx.currentTime;
    if(playing){
    	source.stop();
    	source = audioCtx.createBufferSource();
    	source.buffer = this.audBuffer;
    	source.connect(audioCtx.destination);
    	source.start(audioCtx.currentTime, playbackTime);

    	playing = true;
    }
  }
  //---------------------------------------------------------
  //render(): render loop for animating and timing audio waveform
  //---------------------------------------------------------
  this.render = function(){

    this.draw();
    syncTime();
    requestAnimationFrame(() => {this.render();});
  }
} //end Waveform

//============================================================
//FrequencyChart: uses analyser node to create bar chart of current playing audio
//=============================================================
function FrequencyChart(container,
  barSize = 5, spacing = 1, amplitude= 0.25, cursorSize = 2,
  mainColor = "#ffffff", progressionColor = "#869aba", cursorColor = "#ffffff"
  ){

  //get container
  var container = document.getElementById(container);

  //setup canvas. Keeping accessible for user manipulation
  this.canvas = document.createElement('canvas');
  this.canvas.width = container.offsetWidth;
  this.canvas.height = container.offsetHeight;
  var canvasCtx = this.canvas.getContext("2d");
  container.appendChild(this.canvas);

  const WIDTH = this.canvas.width;
  const HEIGHT = this.canvas.height;

  //audio element
  var audio = new Audio();

  //audio context
  var audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  var analyser = audioCtx.createAnalyser();

  var source, bufferLength, dataArray;

  this.generate = function(url){
    audio.src = url;
    audio.controls = true;
    document.body.appendChild(audio);

    //audio source
    source = audioCtx.createMediaElementSource(audio);
    source.connect(analyser);
    analyser.connect(audioCtx.destination);

    analyser.fftSize = 512;
    bufferLength = analyser.frequencyBinCount;
    dataArray = new Uint8Array(bufferLength);
    this.render();
  }

  this.draw = function(){
    analyser.getByteFrequencyData(dataArray);

    canvasCtx.clearRect(0, 0, WIDTH, HEIGHT);

    var barWidth = (WIDTH / bufferLength) * 2;
    var barHeight;
    var x = 0;

    for(var i = 0; i < bufferLength; i++) {
      barHeight = dataArray[i];

      canvasCtx.fillStyle = 'rgb(50,'+ (x) +',' + (barHeight + 100) +')';
      canvasCtx.fillRect(x,HEIGHT/2-barHeight/3,barWidth,barHeight/3);

      canvasCtx.fillStyle = 'rgba(50,'+ (x) +',' + (barHeight + 100) + ', 0.3)';
      canvasCtx.fillRect(x, HEIGHT/2, barWidth, barHeight/5);

      x += barWidth + 5;
    }
  }

  this.render = function(){
    this.draw();
    requestAnimationFrame(() => {this.render();});
  }

}
