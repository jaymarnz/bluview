// rotary volume control is managed by a websocket server (dialServer)
//
// message format from server is JSON:
//    { button: 'up' | 'down' }
//    { degrees: +/- n }
//    { status: 'status message' }
//
const connectRetryTime = 5 * 1000 // period to check for a connection and try to establish if necessary
const keepAliveTime = 30 * 1000   // just to make sure the server hasn't gone away
const longPressTime = 500       // this is the default long press time on Android

let webSocket
let keepAliveTimer
let connectionFailed
let currentVolume
let buttonDownTimeout

// main entry point to establish volume management via a dialServer and retry as needed
async function enableVolumeManagement(config) {
  while (true) {
    if (!webSocket) connect(config)
    await sleep(connectRetryTime)
  }
}

function connect(config) {
  if (config.dialServer) {
    const url = 'ws://' + config.dialServer
    if (config.logStatus) console.log('connecting to dialServer at', url)
    webSocket = new WebSocket(url)

    webSocket.onmessage = (event) => {
      const data = JSON.parse(event.data)
      if (data.degrees && isPlaying()) adjustVolume(data, config)
      else if (data.button) buttonClick(data, config)
    }

    webSocket.onopen = () => {
      if (config.logStatus) console.log('connected to dialServer')
      keepAliveTimer = setInterval(() => webSocket.send(''), keepAliveTime)
    }

    webSocket.onclose = () => {
      if (config.logStatus) console.log('connection closed to dialServer')
      clearTimeout(keepAliveTimer)
      webSocket = undefined // try again later
    }

    webSocket.onerror = (event) => {
      if (config.logStatus) console.log('connection error with dialServer')
      if (webSocket.readyState === webSocket.OPEN) webSocket.close()
      webSocket = undefined // try again later
    }
  }
}

function buttonClick(data, config) {
  switch (data.button) {
    case 'down':
      // this auto-activates long press without waiting for button up
      if (config.logStatus) console.log('button down')

      clearTimeout(buttonDownTimeout) // cancel any prior timeout just in case
      buttonDownTimeout = setTimeout(() => {
        buttonDownTimeout = undefined
        if (config.logStatus) console.log('button down timeout - activating longPress')
        longPress(config)
      }, longPressTime)
      break
    case 'up':
      if (config.logStatus) console.log(`button up with buttonDownTimeout = ${buttonDownTimeout}`)

      if (buttonDownTimeout) { // it's a short press if we have a defined timeout value
        clearTimeout(buttonDownTimeout)
        buttonDownTimeout = undefined
        shortPress(config)
      }
      break
  }
}

function shortPress(config) {
  if (config.logStatus) console.log(`shortPress in state: ${state.state}, mute: ${state.mute}`)

  if (state.state === 'pause') longPress(config) // if paused then a short press is the same as a long press
  else if (isPlaying()) toggleMute(config)
}

function longPress(config) {
  if (config.logStatus) console.log(`shortPress in state: ${state.state}, mute: ${state.mute}`)

  if (state.state === 'pause') {
    pausePlay(config, false)
    if (isMute()) setMute(config, 0)
  } else if (isPlaying()) {
    pausePlay(config, true)
  }
}

function toggleMute(config) {
  if (config.logStatus) console.log('toggleMute')
  setMute(config, 1 - isMute())
}

function setMute(config, value) {
  if (config.logStatus) console.log(`setMute: ${value}`)
  playerRequest(`Volume?mute=${value}`, config)
    .catch((error) => console.error(error))
}

function pausePlay(config, pause) { // pass true to pause player and false to resume playing
  if (config.logStatus) console.log(`pausePlay: ${pause}`)
  playerRequest(pause ? 'Pause' : 'Play', config)
    .catch((error) => console.error(error))
}

function adjustVolume(data, config) {
  const fullscale = 270.0 // number of degrees to scale degrees to volume

  // currentVolume is used to make it smooth when there are a bunch
  // of adjustments being done in rapid succession. Each will build off
  // the prior one.
  currentVolume = currentVolume || (state.mute === "1" ? state.muteVolume : state.volume)

  // convert degrees to volume adjustment from +/- 0-100
  let volume = Math.round(Math.abs(data.degrees) / fullscale * 100) * Math.sign(data.degrees)

  // ensure we always make an adjustment of at least one so slow small rotations work
  if (volume === 0) volume = 1 * Math.sign(data.degrees)

  // add adjustment to existing volume and ensure result is between 0-100
  if (config.logStatus) console.log(`adjustVolume: { degrees: ${data.degrees}, volume: ${currentVolume}, adjustment: ${volume}`)
  const newVolume = Math.max(Math.min(parseInt(currentVolume) + volume, 100), 0)

  if (newVolume >= 0 && newVolume <= 100) {
    currentVolume = newVolume

    // optimistic update of the display to make it a more fluid UX
    state.volume = newVolume.toString()
    updateDisplay()

    // send volume level request to player
    playerRequest(`Volume?level=${newVolume}`, config)
      .then((result) => {
        // capture actual result
        state.volume = result.__text
        updateDisplay()
      })
      .catch((error) => console.error(error))
  }
}