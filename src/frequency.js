//==============================================================================
//FrequencyChart: uses analyser node to create bar chart of current playing audio
//
//==============================================================================
/**
 * Represents a FrequencyChart.

 * @constructor
 * @param container - The ID of the parent element for the canvas.
 * @param barWidth - The width in pixels of the bars. (Default based on data size)
 * @param amplitude - The max amplitude of the graphic. Float value between 0 and 1.
 * @param fftSize - An unsigned integer, representing the window size of the FFT, given in number of samples. A
 * higher value will result in more details in the frequency domain but fewer details in the time domain.
 * @param spacing - The size in pixels between individual bars.
 * @param hertzCeiling - The hertz ceiling.
 * @param bottomAmplitude - The amplitude of the bottom half. (Default equal to amplitude).
 * @param mainColor - The color of the top bars.
 * @param bottomColotr - The color of the bottom bars. (Default equal to mainColor).
 */
function FrequencyChart(
{
  container,
  barWidth = -1,
  amplitude = 0.5,
  fftSize = 8, // A value between 5 and 15.
  spacing = 2,
  hertzCeiling = 1,
  bottomAmplitude = amplitude,
  mainColor = "#42cef4",
  bottomColor = mainColor
})
{
  // Audio context
  var audioCtx = new(window.AudioContext || window.webkitAudioContext)();
  var analyser = audioCtx.createAnalyser();
  var fftSize = Math.pow(2, fftSize);
  analyser.fftSize = fftSize;

  // Set up canvas. Keeping accessible for user manipulation.
  container = document.getElementById(container);
  this.canvas = document.createElement('canvas');
  this.canvas.width = container.offsetWidth;
  this.canvas.height = container.offsetHeight;
  var canvasCtx = this.canvas.getContext("2d");
  container.appendChild(this.canvas);
  var WIDTH = this.canvas.width;
  var HEIGHT = this.canvas.height;

  // Timing variables
  var playing = false;
  var playbackTime = 0;
  var pastTime = 0;
  var source;
  var rendering = false;

  // Event handlers
  window.addEventListener('resize', handleResize.bind(this));
  container.addEventListener('WaveSlab:AudioLoadComplete', handleAudioLoadComplete.bind(this));

  // Events
  var audioLoadCompleteEvent = new Event('WaveSlab:AudioLoadComplete');
  var playEvent = new Event('WaveSlab:PlayEvent');
  var stopEvent = new Event('WaveSlab:StopEvent');
  var playbackCompleteEvent = new Event('WaveSlab:PlaybackComplete');

  // Process arguments.
  var bufferLength = analyser.frequencyBinCount;
  hertzCeiling = Math.floor(bufferLength * hertzCeiling);
  var dataArray = new Uint8Array(hertzCeiling + 1);

  if (barWidth <= 0)
  {
    barWidth = (WIDTH / dataArray.length);
  }

  //---------------------------------------------------------
  //generate(): Loads audio and launches animation
  //            once audio is ready
  //---------------------------------------------------------
  this.generate = function(url)
  {
    setPlayback(0);
    this.loadAudio(url);
  }

  //---------------------------------------------------------
  //handleAudioLoadComplete(): Handles the the actions to complete when audio has loaded.
  //---------------------------------------------------------
  function handleAudioLoadComplete()
  {
    if (!rendering)
    {
      this.startRenderLoop();
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

    setPlayback(seconds);
    source = audioCtx.createBufferSource();
    source.buffer = this.audBuffer;
    source.connect(analyser);
    analyser.connect(audioCtx.destination);
    source.start(audioCtx.currentTime, playbackTime);
    pastTime = audioCtx.currentTime;
    playing = true;
  }

  //---------------------------------------------------------
  //setPlayback(): Gateway function for playback time.
  //---------------------------------------------------------
  function setPlayback(seconds)
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
  //handleResize(): Handles the resizing of the window
  //---------------------------------------------------------
  function handleResize()
  {
    this.canvas.style.width = '100%';
    this.canvas.style.height = '100%';
    this.canvas.width = this.canvas.offsetWidth;
    this.canvas.height = this.canvas.offsetHeight;

    WIDTH = this.canvas.width;
    HEIGHT = this.canvas.height;
    barWidth = (WIDTH / dataArray.length);
  }

  //---------------------------------------------------------
  //setBarStyle(): Used inside the draw function. It is made available
  //               through the object so it can be overriden with custom styles
  //               without having to override the whole draw function
  //---------------------------------------------------------
  this.drawBars = function(currentX, barWidth, barHeight, amplitude, ctx, ctxHeight)
  {
    //top bar
    ctx.fillStyle = mainColor;
    ctx.fillRect(currentX, ctxHeight / 2 - barHeight * amplitude, barWidth, barHeight * amplitude);

    //bottom bar
    ctx.fillStyle = bottomColor;
    ctx.fillRect(currentX, Math.floor(ctxHeight / 2), barWidth, barHeight * bottomAmplitude);
  }

  //---------------------------------------------------------
  //draw():
  //---------------------------------------------------------
  this.draw = function()
  {
    analyser.getByteFrequencyData(dataArray);

    //clear canvas
    canvasCtx.clearRect(0, 0, WIDTH, HEIGHT);

    var x = 0;
    for (var i = 0; i < bufferLength; i++)
    {
      //get barHeight data
      barHeight = dataArray[i];

      //draw bars using canvas
      this.drawBars(x, barWidth, barHeight, amplitude, canvasCtx, HEIGHT);
      x += barWidth + spacing;
    }
  }

  //---------------------------------------------------------
  //syncTime(): Handles progression of playback during render
  //---------------------------------------------------------
  this.syncTime = function()
  {
    if (playing)
    {
      setPlayback(playbackTime + audioCtx.currentTime - pastTime);
      pastTime = audioCtx.currentTime;
    }

    if (playbackTime >= this.duration)
    {
      this.clear();
      container.dispatchEvent(playbackCompleteEvent);
    }
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

  //---------------------------------------------------------
  //clear(): Stops audio, clears the canvas
  //---------------------------------------------------------
  this.clear = function()
  {
    this.stop();
    setPlayback(0);
    canvasCtx.clearRect(0, 0, WIDTH, HEIGHT);
  }
}