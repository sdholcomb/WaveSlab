# WaveSlab
Audio Waveform Generation using Web Audio and Canvas

#### Disclaimer: WaveSlab is newly created and much work still has to be done.

---
# How to use

* include waveslab.js in document being used
* create a container to house the waveform
* specify that container upon creation of waveform along with optional customizations
* generate waveform
```HTML
<div id="waveholder"></div>
<button type="button" onclick="wave.playPause()">play/pause</button>
```


```javascript
var wave = new Waveform({container:"waveholder", mainColor: "#ffffff");
wave.genWaveform("myaudio.mp3");
```

![alt text](https://github.com/sdholcomb/WaveSlab/blob/master/assets/waveform.PNG "waveform example")
