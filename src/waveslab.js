//****************************
//Author: sdholcomb
//****************************


//==============================================================================
//Waveform:
//==============================================================================
function Waveform({
  container,
  barSize = 5,
  spacing = 1,
  amplitude = 1,
  cursorSize = 2,
  mainColor = "#ffffff",
  progressionColor = "#869aba",
  cursorColor = "#ffffff"
}) {

  // Canvas setup.
  var container = document.getElementById(container);
  this.canvas = document.createElement('canvas');
  this.canvas.width = container.offsetWidth;
  this.canvas.height = container.offsetHeight;
  var canvasCtx = this.canvas.getContext("2d");
  container.appendChild(this.canvas);
  const WIDTH = this.canvas.width;
  const HEIGHT = this.canvas.height;

  // Event handlers.
  var mouseDown = false;
  this.canvas.addEventListener("mousemove", handleMouseMove.bind(this));
  this.canvas.addEventListener("touchmove", handleMouseMove.bind(this));

  this.canvas.addEventListener("mousedown", handleMouseDown.bind(this));
  this.canvas.addEventListener("touchstart", handleMouseDown.bind(this));

  this.canvas.addEventListener("mouseup", handleMouseUp.bind(this));
  this.canvas.addEventListener("touchend", handleMouseUp.bind(this));

  // Setup audio components.
  var audioCtx = new(window.AudioContext || window.webkitAudioContext)();
  var source;
  var waveData = [];

  // Process arguments.
  var barSize = barSize;
  var spacing = barSize + spacing;
  var amplitude = HEIGHT * amplitude;
  var mainColor = mainColor;
  var progressionColor = progressionColor;
  var cursorColor = cursorColor;
  var cursorSize = cursorSize;

  // Timing variables
  var playing = false;
  var playbackTime = 0;
  var pastTime = 0;

  //---------------------------------------------------------
  //generate(): Loads audio and launches animation
  //            once audio is ready
  //---------------------------------------------------------
  this.generate = function(url) {
    document.addEventListener('audioReady', () => {
      this.processChannelData();
      this.render();
    }, false);
    this.loadAudio(url);
  }

  //---------------------------------------------------------
  //processChannelData(): Stores the channel data into a canvas usable form
  //---------------------------------------------------------
  this.processChannelData = function() {
    for (var i = 0; i < WIDTH; i += spacing) {
      var loc = Math.floor(this.chanData.length / (WIDTH - spacing)) * i;
      var val = this.chanData[loc];
      waveData[i] = val;
    }
  }

  //---------------------------------------------------------
  //loadAudio(): loads the audio and stores results
  //---------------------------------------------------------
  this.loadAudio = function(url) {
    var readyEvent = new Event('audioReady');
    var self = this;
    var request = new XMLHttpRequest();
    request.open('GET', url, true);
    request.responseType = 'arraybuffer';

    // Decode asynchronously
    request.onload = function() {
      audioCtx.decodeAudioData(request.response,
        function(buffer) {
          self.audBuffer = buffer;
          self.duration = buffer.duration;
          self.chanData = buffer.getChannelData(0);
          self.step = Math.ceil(self.chanData.length / WIDTH);
          document.dispatchEvent(readyEvent);
        });
    }
    request.send();
  }

  //---------------------------------------------------------
  //playPause(): alternates between playing and pausing playback
  //---------------------------------------------------------
  this.playPause = function() {
    if (!playing) {
      source = audioCtx.createBufferSource();
      source.buffer = this.audBuffer;
      source.connect(audioCtx.destination);
      source.start(audioCtx.currentTime, playbackTime);
      pastTime = audioCtx.currentTime;
      playing = true;
    }
    else {
      source.stop();
      playing = false;
    }
  }

  //---------------------------------------------------------
  //setPlaybackTime(seconds): Sets the time in seconds for the playback
  //---------------------------------------------------------
  this.setPlaybackTime = function(seconds) {
    playbackTime = seconds;

    if (playing) {
      source.stop();
      source = audioCtx.createBufferSource();
      source.buffer = this.audBuffer;
      source.connect(audioCtx.destination);
      source.start(audioCtx.currentTime, playbackTime);
      playing = true;
    }
  }

  //---------------------------------------------------------
  //syncTime(): Handles progression of playback during render
  //---------------------------------------------------------
  function syncTime() {
    if (playing) {
      playbackTime = playbackTime + audioCtx.currentTime - pastTime;
      pastTime = audioCtx.currentTime;
    }
  }

  //---------------------------------------------------------
  //handleMouseMove():
  //---------------------------------------------------------
  function handleMouseMove() {
    if (!mouseDown)
      return;

    var x = event.clientX - this.canvas.offsetLeft;
    playbackTime = (x / WIDTH * this.duration);
    pastTime = audioCtx.currentTime;
  }

  //---------------------------------------------------------
  //handleMouseUp():
  //---------------------------------------------------------
  function handleMouseUp() {
    mouseDown = false;
    if (playing) {
      source.stop();
      source = audioCtx.createBufferSource();
      source.buffer = this.audBuffer;
      source.connect(audioCtx.destination);
      source.start(audioCtx.currentTime, playbackTime);
      playing = true;
    }
  }

  //---------------------------------------------------------
  //handleMouseDown():
  //---------------------------------------------------------
  function handleMouseDown() {
    mouseDown = true;

    var x = event.clientX - this.canvas.offsetLeft;
    playbackTime = (x / WIDTH * this.duration);
    pastTime = audioCtx.currentTime;
    if (playing) {
      source.stop();
      source = audioCtx.createBufferSource();
      source.buffer = this.audBuffer;
      source.connect(audioCtx.destination);
      source.start(audioCtx.currentTime, playbackTime);
      playing = true;
    }
  }

  //---------------------------------------------------------
  //draw(): draws this waveform
  //---------------------------------------------------------
  this.draw = function() {
    canvasCtx.clearRect(0, 0, WIDTH, HEIGHT);
    for (var i = 0; i < WIDTH; i += spacing) {

      //set color based on progression
      canvasCtx.fillStyle = (i / WIDTH * this.duration <= playbackTime) ? progressionColor : mainColor;

      //draw the data bar
      canvasCtx.fillRect(i, HEIGHT / 2 + (-1 * waveData[i] / 2) * amplitude, barSize, waveData[i] * amplitude);
    }
    //draw progression bar
    canvasCtx.fillStyle = cursorColor;
    canvasCtx.fillRect(playbackTime / this.duration * WIDTH, HEIGHT / 2 - amplitude, cursorSize, amplitude * 2);
  }

  //---------------------------------------------------------
  //render(): render loop for animating and timing audio waveform
  //---------------------------------------------------------
  this.render = function() {
    this.draw();
    syncTime();
    requestAnimationFrame(() => {
      this.render();
    });
  }
}

//==============================================================================
//HtmlFrequencyChart: Deprecated
//==============================================================================
function HtmlFrequencyChart({
  container,
  url,
  barSize = 5,
  amplitude = 0.33,
  fftSize = 8,
  spacing = 2,
  bottomAmplitude = amplitude,
  mainColor = "#42cef4",
  bottomColor = mainColor,
  useAudioControls = true
}) {

  var audioCtx;
  var analyser;
  var fftSize = fftSize;
  var source, bufferLength, dataArray, barWidth, barHeight;
  var mainColor = mainColor;
  var isGenerated = false;

  // Get container for the canvas.
  var container = document.getElementById(container);

  // Setup canvas. Keeping accessible for user manipulation.
  this.canvas = document.createElement('canvas');
  this.canvas.width = container.offsetWidth;
  this.canvas.height = container.offsetHeight;
  var canvasCtx = this.canvas.getContext("2d");
  container.appendChild(this.canvas);

  const WIDTH = this.canvas.width;
  const HEIGHT = this.canvas.height;

  //---------------------------------------------------------
  //generate(): generates frequency chart
  //---------------------------------------------------------
  this.generate = function() {
    if (isGenerated)
      return;

    // Audio element
    var audio = new Audio();
    audio.src = url;
    audio.controls = useAudioControls;
    document.body.appendChild(audio);

    //audio context
    audioCtx = new(window.AudioContext || window.webkitAudioContext)();
    analyser = audioCtx.createAnalyser();

    fftSize = Math.pow(2, fftSize);

    //audio source
    source = audioCtx.createMediaElementSource(audio);
    source.connect(analyser);
    analyser.connect(audioCtx.destination);

    analyser.fftSize = fftSize;
    bufferLength = analyser.frequencyBinCount;
    dataArray = new Uint8Array(bufferLength);
    barWidth = (WIDTH / bufferLength);
    isGenerated = true;
    this.render();
  }

  //---------------------------------------------------------
  //draw():
  //---------------------------------------------------------
  this.draw = function() {
    analyser.getByteFrequencyData(dataArray);

    //clear canvas
    canvasCtx.clearRect(0, 0, WIDTH, HEIGHT);

    var x = 0;
    for (var i = 0; i < bufferLength; i++) {
      //get barHeight data
      barHeight = dataArray[i];

      //draw bars using canvas
      this.drawBars(x, barWidth, barHeight, amplitude, canvasCtx, HEIGHT);
      x += barWidth + spacing;
    }
  }

  //---------------------------------------------------------
  //setBarStyle(): Used inside the draw function. It is made available
  //               through the object so it can be overriden with custom styles
  //               without having to override the whole draw function
  //---------------------------------------------------------
  this.drawBars = function(currentX, barWidth, barHeight, amplitude, ctx, ctxHeight) {
    //top bar
    ctx.fillStyle = mainColor;
    ctx.fillRect(currentX, ctxHeight / 2 - barHeight * amplitude, barWidth, barHeight * amplitude);

    //bottom bar
    ctx.fillStyle = bottomColor;
    ctx.fillRect(currentX, Math.floor(ctxHeight / 2), barWidth, barHeight * bottomAmplitude);
  }

  //---------------------------------------------------------
  //render(): render loop drawing on canvas
  //---------------------------------------------------------
  this.render = function() {
    this.draw();
    requestAnimationFrame(() => {
      this.render();
    });
  }
}

//==============================================================================
//FrequencyChart: uses analyser node to create bar chart of current playing audio
//==============================================================================
function FrequencyChart({
  container,
  url,
  barSize = 5,
  amplitude = 0.33,
  fftSize = 8,
  spacing = 2,
  bottomAmplitude = amplitude,
  mainColor = "#42cef4",
  bottomColor = mainColor
}) {

  var audioCtx;
  var analyser;
  var source, bufferLength, dataArray, barWidth, barHeight;
  var mainColor = mainColor;
  var isGenerated = false;

  //timing variables
  var playing = false;
  var playbackTime = 0;
  var pastTime = 0;
  var source;

  // Get container for the canvas.
  var container = document.getElementById(container);

  //audio context
  audioCtx = new(window.AudioContext || window.webkitAudioContext)();
  analyser = audioCtx.createAnalyser();
  var fftSize = Math.pow(2, fftSize);
  analyser.fftSize = fftSize;

  // Setup canvas. Keeping accessible for user manipulation.
  this.canvas = document.createElement('canvas');
  this.canvas.width = container.offsetWidth;
  this.canvas.height = container.offsetHeight;
  var canvasCtx = this.canvas.getContext("2d");
  container.appendChild(this.canvas);

  const WIDTH = this.canvas.width;
  const HEIGHT = this.canvas.height;

  bufferLength = analyser.frequencyBinCount;
  dataArray = new Uint8Array(bufferLength);
  barWidth = (WIDTH / bufferLength);

  //---------------------------------------------------------
  //generate(): Loads audio and launches animation
  //               once audio is ready
  //---------------------------------------------------------
  this.generate = function(url) {
    document.addEventListener('audioReady', () => {
      this.render();
    }, false);
    this.loadAudio(url);
  }

  //---------------------------------------------------------
  //draw():
  //---------------------------------------------------------
  this.draw = function() {
    analyser.getByteFrequencyData(dataArray);

    //clear canvas
    canvasCtx.clearRect(0, 0, WIDTH, HEIGHT);

    var x = 0;
    for (var i = 0; i < bufferLength; i++) {
      //get barHeight data
      barHeight = dataArray[i];

      //draw bars using canvas
      this.drawBars(x, barWidth, barHeight, amplitude, canvasCtx, HEIGHT);
      x += barWidth + spacing;
    }
  }

  //---------------------------------------------------------
  //playPause(): alternates between playing and pausing playback
  //---------------------------------------------------------
  this.playPause = function() {
    if (!playing) {
      source = audioCtx.createBufferSource();
      source.buffer = this.audBuffer;
      source.connect(analyser);
      analyser.connect(audioCtx.destination);
      source.start(audioCtx.currentTime, playbackTime);
      pastTime = audioCtx.currentTime;
      playing = true;
    }
    else {
      source.stop();
      playing = false;
    }
  }

  //---------------------------------------------------------
  //loadAudio(): loads the audio and stores results
  //---------------------------------------------------------
  this.loadAudio = function(url) {
    var readyEvent = new Event('audioReady');
    var self = this;
    var request = new XMLHttpRequest();
    request.open('GET', url, true);
    request.responseType = 'arraybuffer';

    // Decode asynchronously
    request.onload = function() {
      audioCtx.decodeAudioData(request.response,
        function(buffer) {
          self.audBuffer = buffer;
          self.duration = buffer.duration;
          document.dispatchEvent(readyEvent);
        });
    }
    request.send();
  }

  //---------------------------------------------------------
  //setBarStyle(): Used inside the draw function. It is made available
  //               through the object so it can be overriden with custom styles
  //               without having to override the whole draw function
  //---------------------------------------------------------
  this.drawBars = function(currentX, barWidth, barHeight, amplitude, ctx, ctxHeight) {
    //top bar
    ctx.fillStyle = mainColor;
    ctx.fillRect(currentX, ctxHeight / 2 - barHeight * amplitude, barWidth, barHeight * amplitude);

    //bottom bar
    ctx.fillStyle = bottomColor;
    ctx.fillRect(currentX, Math.floor(ctxHeight / 2), barWidth, barHeight * bottomAmplitude);
  }

  //---------------------------------------------------------
  //setPlayback(): Handles progression of playback during render
  //---------------------------------------------------------
  function syncTime() {
    if (playing) {
      playbackTime = playbackTime + audioCtx.currentTime - pastTime;
      pastTime = audioCtx.currentTime;
    }
  }

  //---------------------------------------------------------
  //render(): render loop drawing on canvas
  //---------------------------------------------------------
  this.render = function() {
    this.draw();
    syncTime();
    requestAnimationFrame(() => {
      this.render();
    });
  }
}
