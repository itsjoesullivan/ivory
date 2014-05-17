var context = new AudioContext();

setTimeout(function() {
navigator.requestMIDIAccess().then(function( access ) {
  access.onconnect = function() { console.log('connect'); };
  access.ondisconnect = function() { console.log('disconnect'); };
  access.inputs()[0].onmidimessage = function(message) {
    var data = message.data;
    eventHandler( data );
  };
  window.stop = function() {
    access.inputs()[0].onmidimessage = function() {};
  };
});
}, 500);

function eventHandler( event ) {
  event[1] = event[1] - 8;
  if (event[0] === 144) {
    playNote( event[1], event[2] );
  } else if (event[0] === 128) {
    stopNote( event[1] );
  }
};



var notes = {};

function playNote(note, velocity) {
  if (notes[note]) {
    notes[note].stop();
    notes[note] = false;
  }
  // Determine frequency
  var frequency = keyToFrequency(note);

  var gain = context.createGain();

  var attack = 0.001;

  var volume = 0.1;

  gain.gain.setValueAtTime( 0, context.currentTime );
  gain.gain.linearRampToValueAtTime( volume * velocity/128, context.currentTime + attack );
  gain.connect( context.destination );
  window.gain = gain;

  var sources = [];

  // Create high sine wave to add some "strike" to the attack
  var osc = context.createOscillator();
  var gainEnv = context.createGain();
  gainEnv.connect( gain );
  gainEnv.gain.setValueAtTime( 0.3, context.currentTime );
  gainEnv.gain.linearRampToValueAtTime( 0, context.currentTime + 0.1 );
  osc.type = "sine";
  osc.frequency.value = frequency*3;
  sources.push( osc );
  osc.connect( gainEnv );
  osc.start();

  // Create triangle for bulk of signal
  var filter = context.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime( 1400, context.currentTime );
  var decay = 1 * velocity/128;
  filter.frequency.linearRampToValueAtTime( 600, context.currentTime + decay );
  filter.frequency.Q = 4;
  var osc = context.createOscillator();
  osc.connect( filter );
  filter.connect( gain );
  osc.type = "triangle";
  osc.frequency.value = frequency/2;
  sources.push( osc );
  osc.start();

  // Send signal to tremolo
  var tremolo = context.createGain();
  tremolo.gain.value = 0.2
  var osc = context.createOscillator();
  osc.type = 'sine';
  osc.frequency.value = 3;
  osc.connect( tremolo.gain );
  osc.start();
  gain.connect(tremolo);
  tremoloGain = context.createGain();
  tremoloGain.gain.value = 0.3;
  tremoloGain.connect( context.destination );
  tremolo.connect( tremoloGain );


  notes[note] = {
    stop: function(when) {
      sources.forEach(function(source) {
        source.stop( when );
      });
    },
    gain: gain
  };
}

function keyToFrequency(key) {
  return Math.pow( Math.pow(2,1/12), (key-49) ) * 440;
}

function stopNote(note) {
  notes[note].gain.gain.setValueAtTime( notes[note].gain.gain.value, context.currentTime );
  var decay = 0.02;
  notes[note].gain.gain.linearRampToValueAtTime( 0.000, context.currentTime + decay );
  notes[note].stop(context.currentTime + decay);
}
