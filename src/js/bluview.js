let config = {
  disableLongPoll: false,
  logStatus: false
}

let state = {} // latest player status

// entry point
$(async function () {
  // clicking on the screen in clock-mode will force back into config mode by reloading the page
  // I reload the page so all outstanding requests are cleaned up and we just start from scratch
  $('#notPlaying').click(() => {
    localStorage.setItem('config', JSON.stringify({ priorIP: config.playerIP }))
    location.reload()
  });

  await run()
})

// main run loop
async function run() {
  config = await getConfig(config)

  $('#playing').hide()
  $('#notPlaying').show()
  $('#run').show()

  updateTime()
  setInterval(updateTime, 250)

  enableVolumeManagement({ ...config, ...{ dialServer: '192.168.68.69:3000' } }) // TBS *********** put this into config object

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

    setImageSrc($('#image'), state.image, config)
    $('#title1').html(state.title1 || '') // song title or device (eg. TV)
    $('#title2').html(state.title2 || '') // artist
    $('#title3').html(state.title3 || '') // album

    $('#timeOfDay').css('fontSize', (state.title1 && (state.title2 || state.title3)) ? '6em' : '10em')

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
