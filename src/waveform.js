//==============================================================================
//Waveform:
//==============================================================================
function Waveform(
{
  container,
  barSize = 5,
  spacing = 1,
  amplitude = 1,
  cursorSize = 2,
  mainColor = "#ffffff",
  progressionColor = "#869aba",
  cursorColor = "#ffffff"
})
{

  // Canvas setup.
  var container = document.getElementById(container);
  this.canvas = document.createElement('canvas');
  this.canvas.width = container.offsetWidth;
  this.canvas.height = container.offsetHeight;
  var canvasCtx = this.canvas.getContext("2d");
  container.appendChild(this.canvas);
  var WIDTH = this.canvas.width;
  var HEIGHT = this.canvas.height;

  // Event handlers.
  var mouseDown = false;
  this.canvas.addEventListener("mousemove", handleMouseMove.bind(this));
  this.canvas.addEventListener("mousedown", handleMouseDown.bind(this));
  this.canvas.addEventListener("mouseup", handleMouseUp.bind(this));
  window.addEventListener('resize', handleResize.bind(this));
  container.addEventListener('WaveSlab:AudioLoadComplete', handleAudioLoadComplete.bind(this));

  // Events
  var audioLoadCompleteEvent = new Event('WaveSlab:AudioLoadComplete');
  var playEvent = new Event('WaveSlab:PlayEvent');
  var stopEvent = new Event('WaveSlab:StopEvent');
  var playbackCompleteEvent = new Event('WaveSlab:PlaybackComplete');

  // Set up audio components.
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
  var rendering = false;

  //---------------------------------------------------------
  //generate(): Loads audio and launches animation
  //            once audio is ready
  //---------------------------------------------------------
  this.generate = function(url)
  {
    this.setPlayback(0);
    this.loadAudio(url);
  }

  //---------------------------------------------------------
  //processChannelData(): Stores the channel data into a canvas usable form
  //---------------------------------------------------------
  this.processChannelData = function()
  {
    for (var i = 0; i < WIDTH; i += spacing)
    {
      var loc = Math.floor(this.chanData.length / (WIDTH - spacing)) * i;
      var val = this.chanData[loc];
      waveData[i] = val;
    }
  }

  //---------------------------------------------------------
  //loadAudio(): loads the audio and stores results
  //---------------------------------------------------------
  this.loadAudio = function(url)
  {
    var self = this;
    var request = new XMLHttpRequest();
    request.open('GET', url, true);
    request.responseType = 'arraybuffer';

    // Decode asynchronously
    request.onload = function()
    {
      audioCtx.decodeAudioData(request.response,
        function(buffer)
        {
          self.audBuffer = buffer;
          self.duration = buffer.duration;
          self.chanData = buffer.getChannelData(0);
          container.dispatchEvent(audioLoadCompleteEvent);
        });
    }
    request.send();
  }

  //---------------------------------------------------------
  //playPause(): alternates between playing and pausing playback
  //---------------------------------------------------------
  this.playPause = function()
  {
    if (!playing)
    {
      this.play();
    }
    else
    {
      this.stop();
    }
  }

  //---------------------------------------------------------
  //play(): plays from playbackTime or specified time in seconds if provided
  //---------------------------------------------------------
  this.play = function(seconds = playbackTime)
  {
    if (playing)
    {
      source.stop();
    }
    else
    {
      container.dispatchEvent(playEvent);
    }

    this.setPlayback(seconds);
    source = audioCtx.createBufferSource();
    source.buffer = this.audBuffer;
    source.connect(audioCtx.destination);
    source.start(audioCtx.currentTime, playbackTime);
    pastTime = audioCtx.currentTime;
    playing = true;
  }

  //---------------------------------------------------------
  //stop(): stops playback
  //---------------------------------------------------------
  this.stop = function()
  {
    if (playing)
    {
      source.stop();
      playing = false;
      container.dispatchEvent(stopEvent);
    }
  }

  //---------------------------------------------------------
  //setPlayback(seconds): Sets the time in seconds for the playback
  //---------------------------------------------------------
  this.setPlayback = function(seconds)
  {
    playbackTime = seconds;
    container.dispatchEvent(bob = new CustomEvent("WaveSlab:PlaybackTimeStatus",
    {
      detail:
      {
        timeSeconds: playbackTime
      }
    }));
  }

  //---------------------------------------------------------
  //getPlaybackTime(): Gets the current playback time.
  //---------------------------------------------------------
  this.getPlaybackTime = function()
  {
    return playbackTime;
  }

  //---------------------------------------------------------
  //getContainer(): Returns the container.
  //---------------------------------------------------------
  this.getContainer = function()
  {
    return container;
  }

  //---------------------------------------------------------
  //syncTime(): Handles progression of playback during render
  //---------------------------------------------------------
  this.syncTime = function()
  {
    if (playing)
    {
      this.setPlayback(playbackTime + audioCtx.currentTime - pastTime);
      pastTime = audioCtx.currentTime;
    }

    if (playbackTime >= this.duration)
    {
      this.stop();
      this.setPlayback(0);
      container.dispatchEvent(playbackCompleteEvent);
    }
  }

  //---------------------------------------------------------
  //handleAudioLoadComplete(): Handles the the actions to complete when audio has loaded.
  //---------------------------------------------------------
  function handleAudioLoadComplete()
  {
    if (!rendering)
    {
      this.processChannelData();
      this.startRenderLoop();
    }
  }

  //---------------------------------------------------------
  //handleMouseMove(): Handles mouse movements
  //---------------------------------------------------------
  function handleMouseMove()
  {
    if (!mouseDown)
      return;

    var x = event.clientX - this.canvas.offsetLeft;
    this.setPlayback(x / WIDTH * this.duration);
    pastTime = audioCtx.currentTime;
  }

  //---------------------------------------------------------
  //handleMouseUp(): Handles when mouse is released
  //---------------------------------------------------------
  function handleMouseUp()
  {
    mouseDown = false;
    this.setPlayback(playbackTime);
    if(playing)
    {
      this.play();
    }
  }

  //---------------------------------------------------------
  //handleMouseDown(): Handles when the mouse is pressed down
  //---------------------------------------------------------
  function handleMouseDown()
  {
    mouseDown = true;
    var x = event.clientX - this.canvas.offsetLeft;
    this.setPlayback(x / WIDTH * this.duration);
    pastTime = audioCtx.currentTime;
  }

  //---------------------------------------------------------
  //handleResize(): Handles the resizing of the window
  //---------------------------------------------------------
  function handleResize()
  {
    this.canvas.width = container.offsetWidth;
    this.canvas.height = container.offsetHeight;
    WIDTH = this.canvas.width;
    HEIGHT = this.canvas.height;
    this.processChannelData();
  }

  //---------------------------------------------------------
  //draw(): draws this waveform
  //---------------------------------------------------------
  this.draw = function()
  {
    canvasCtx.clearRect(0, 0, WIDTH, HEIGHT);
    for (var i = 0; i < WIDTH; i += spacing)
    {
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
  //render(): render loop
  //---------------------------------------------------------
  this.render = function()
  {
    if (!rendering)
    {
      return;
    }

    this.draw();
    this.syncTime();
    requestAnimationFrame(() =>
    {
      this.render();
    });
  }

  //---------------------------------------------------------
  //stopRenderLoop(): Sets the flag to stop rendering.
  //---------------------------------------------------------
  this.stopRenderLoop = function()
  {
    rendering = false;
  }

  //---------------------------------------------------------
  //startRenderLoop(): Starts the render loop.
  //---------------------------------------------------------
  this.startRenderLoop = function()
  {
    if (!rendering)
    {
      rendering = true;
      this.render();
    }
  }
}
