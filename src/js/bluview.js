// Copyright 2023 jaymarnz, https://github.com/jaymarnz
// See LICENSE for details

let config = {
  disableLongPoll: false,
  logStatus: false,
  fullscreenButton: false, // add a button in upper right corner to switch browser to fullscreen (not needed if using in kiosk mode)
  artworkParams: {
    TIDAL: { width: 640, height: 640 } // additional parameters when calling artwork api's
  }
}

let state = {} // latest player status

// entry point
$(async function () {
  // clicking on the screen in clock-mode will force back into config mode by reloading the page
  // I reload the page so all outstanding requests are cleaned up and we just start from scratch
  $('#notPlaying').click(() => {
    localStorage.setItem(configlocalStorage, JSON.stringify({
      priorIP: config.playerIP,
      priorDialServerIP: config.dialServerIP
    }))
    location.reload()
  });

  // add a fullscreen button - this is currently disabled by default (above).
  // I thought I could do this to avoid having to use a kiosk app. It works fine but
  // even with "Developer Settings->Keep Awake" my Samsung tablet still dims the screen when
  // the display timeout is reached and the maximum I can set the timeout is 30 mins.
  // So, I'll need to continue using a Kiosk Browser app.
  //
  // But for others with different tablets or phones they may find this feature useful
  //
  if (config.fullscreenButton) {
    $('#fullscreen').show()
    $('#fullscreen').click(() => enableFullScreen())

    // hide the fullscreen button when running in fullscreen mode
    $(document).on("fullscreenchange", function() {
      if (document.fullscreenElement) {
        $('#fullscreen').hide()
      } else {
        $('#fullscreen').show()
      }
    })
  }

  run()
})

async function enableFullScreen() {
  let requestFunc = 
    document.documentElement.requestFullscreen ||
    document.documentElement.webkitRequestFullscreen || // Safari
    document.documentElement.mozRequestFullScreen ||    // Firefox
    document.documentElement.msRequestFullscreen        // IE/Edge

    if (requestFunc) {
      // call function with the documentElement context
      requestFunc.call(document.documentElement).catch((err) => {
        console.error('Failed to enter full screen:', err)
    })
  }
}

// main run loop
async function run() {
  config = await getConfig(config)

  $('#playing').hide()
  $('#notPlaying').show()
  $('#run').show()

  updateTime()
  setInterval(updateTime, 250)

  if (config.dialServerIP)
    enableVolumeManagement(config)

  while (true) {
    try {
      await updatePlayer()
    } catch (error) {
      etag = undefined
      console.log(error)
    }

    await sleep(canLongPoll() ? 1000 : 30000) // BluOS maximum rate allowed for long and regular polling
  }
}

// BluOS long polling Etag and helper function
let etag
function canLongPoll() {
  return etag && config.pollTimeout && !config.disableLongPoll
}

// poll for player status. first time it is a short poll. subsequent times it is a long poll unless that fails
async function updatePlayer() {
  let query = 'Status'
  if (canLongPoll()) query = query + `?timeout=${config.pollTimeout}&etag=${etag}`

  state = await playerRequest(query, {
    // ensure that all requests have a timeout. if no fetchTimeout is supplied then use the pollTimeout+1s or 30s if not long polling
    ...{ fetchTimeout: (canLongPoll() ? config.pollTimeout * 1000 + 1000 : 30000) },
    ...config
  })

  state = state.status || {}
  etag = state._etag
  updateDisplay()
}

function isPlaying() {
  return (state.state === 'play' || state.state === 'stream')
}

function isMute() { // must return 0 or 1 since it is used in an arithmetic expression to toggle
  let mute = parseInt(state.mute)
  if (mute < 0 || mute > 1) throw new Error(`invalid mute value: ${mute}`)
  return mute
}

function updateDisplay() {
  if (config.logStatus) console.log(state)

  if (!isPlaying()) {
    $('#playing').hide()
    $('#notPlaying').show()
  } else {
    $('#playing').show()
    $('#notPlaying').hide()

    setArtworkSrc($('#image'), state, config)

    $('#title1').html(state.title1 || '') // song title or device (eg. TV)
    $('#title2').html(state.title2 || '') // artist
    $('#title3').html(state.title3 || '') // album

    const hasTitle1 = state.title1 !== undefined && state.title1 !== ''
    const hasTitle2OrTitle3 = state.title2 !== undefined || state.title3 !== undefined
    const isSmallTime = hasTitle1 && hasTitle2OrTitle3
    
    $('#timeOfDay').toggleClass('small', isSmallTime)
    $('#timeOfDay').toggleClass('large', !isSmallTime)

    setImageSrc($('#serviceIcon'), state.serviceIcon, config)
    // $('#serviceName').html(state.serviceName || '')

    let quality
    if (isNaN(state.quality)) {
      quality = (state.quality || '').toString().toUpperCase()
    } else {
      quality = `${state.quality / 1000} Kbps`
    }

    $('#quality').html((quality === 'MQAAUTHORED') ? 'MQA (AUTH)' : quality)
    $('#streamFormat').html(state.streamFormat || '')

    $('#volume').attr('class', (state.mute === '1') ? 'muted' : 'notmuted')
    $('#volume_level').width(((state.mute === '1') ? state.muteVolume : state.volume) + '%')
  }
}

// runs on a interval timer to keep the time of day displays updated
function updateTime() {
  const now = new Date()

  $('.timeOfDay').each(function () {
    $(this).html(`${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`)
  })

  $('.today').each(function () {
    $(this).html(formatDate(now))
  })
}

// Format the local date as Sunday December 25, 2022
// Note: does not take into account local languages or formats
function formatDate(now) {
  const weekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

  const [day, month, date, year] = [
    now.getDay(),
    now.getMonth(),
    now.getDate(),
    now.getFullYear()
  ]

  return `${weekdays[day]} ${months[month]} ${date}, ${year}`
}
