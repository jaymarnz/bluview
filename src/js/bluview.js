let config = { 
  disableLongPoll: false,
  logStatus: false
}

// entry point
$(async function() {
  // clicking on the screen in clock-mode will force back into config mode by reloading the page
  // I reload the page so all outstanding requests are cleaned up and we just start from scratch
  $('#notPlaying').click(() => {
    window.localStorage.removeItem('config')
    window.localStorage.setItem('priorIP', config.playerIP)
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
  setInterval(updateTime, 1000)

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
  
  let status = await playerRequest(query, {
    // ensure that all requests have a timeout. if no fetchTimeout is supplied then use the pollTimeout+1s or 30s if not long polling
    ...{ fetchTimeout: (canLongPoll() ? config.pollTimeout*1000 + 1000  : 30000)}, 
    ...config
  })

  status = status.status || {}
  etag = status._etag
  if (config.logStatus) console.log(status)

  if (status.state !== 'play' && status.state !== 'stream') {
    $('#playing').hide()
    $('#notPlaying').show()
  } else {
    $('#playing').show()
    $('#notPlaying').hide()

    setImageSrc($('#image'), status.image, config)
    $('#title1').html(status.title1 || '') // song title or device (eg. TV)
    $('#title2').html(status.title2 || '') // artist
    $('#title3').html(status.title3 || '') // album
    
    setImageSrc($('#serviceIcon'), status.serviceIcon, config)
    // $('#serviceName').html(status.serviceName || '')
    
    if (isNaN(status.quality)) {
      status.quality = (status.quality || '').toString().toUpperCase()
    } else {
      status.quality = `${status.quality/1000} Kbps`
    }

    if (status.quality === 'MQAAUTHORED')
    status.quality = 'MQA (AUTH)'

    $('#quality').html(status.quality)
    $('#streamFormat').html(status.streamFormat || '')

    $('#timeOfDay').css('fontSize', (status.title1 && (status.title2 || status.title3)) ? '6em' : '10em')
  }
}

// runs on a interval timer to keep the time of day displays updated
function updateTime() {
  const now = new Date()

  $('.timeOfDay').each(function() {
    $(this).html(`${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`)
  })

  $('.today').each(function() {
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
