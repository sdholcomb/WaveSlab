# WaveSlab
Audio Waveform Generation

#### Disclaimer: WaveSlab is newly created and much work still has to be done.

---
# How to use

* include waveslab.js in document being used
* create a container to house the waveform
* specify that container upon creation of waveform along with optional customizations
* generate waveform

```javascript
var wave = new Waveform(container="waveholder");
wave.genWaveform("myaudio.mp3");
```
