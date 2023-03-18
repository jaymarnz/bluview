const x2js = new X2JS()

// send the player a command and return the result converted to json
function playerRequest(command, options) {
  return new Promise((resolve, reject) => {
    const url = _bluosURL(command, options)

    $.ajax({
      url,
      type: 'get',
      dataType: 'xml',
      timeout: options.fetchTimeout
    })
      .done((data, status, xhr) => {
        return resolve(x2js.xml2json(xhr.responseXML))
      })
      .fail((xhr, status, error) => {
        return reject(new Error(
          options.errorMessage || (error === 'timeout' ? 'Player request timed out'
            : `Error conmmunicating with the player ${error ? '(' + error + ')' : ''}<br>Check the IP address is correct and reachable`)
        ))
      })
  })
}

// set the src attribute of an image object to a normalized URL provided by BluOS
// hide the image if there is no url
function setImageSrc(obj, url, options) {
  if (url) {
    obj.attr('src', _bluosURL(url, options))
    obj.show()
  }
  else
    obj.hide()
}

// construct the BluOS URL for a given API string
// if the API is undefined return undefined
// if the API starts with http or https then just return it as-is
// finally prepend the base url but remove an optional slash at the beginning of the API as BluOS doesn't like that
function _bluosURL(api, options) {
  const baseUrl = `http://${options.playerIP}:11000/`

  if (!api) return api
  if (api.match(/https?:\/\//)) return api
  return baseUrl + api.replace(/^\//, '')
}

// the usual sleep...
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

const IpPatternStr = '(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)'
const IpPattern = new RegExp('^' + IpPatternStr + '$')
const IpPortPattern = new RegExp('^' + IpPatternStr + '(:[0-9]+)?$')

function isValidIpPort(str) {
  const match = str.match(IpPortPattern)
  if (!match) return false
  return (!match[6] || (match[6] >= 1 && match[6] <= 65535))
}

// adapted from: https://jsfiddle.net/cse_tushar/aPM5X/3
// pass a jquery selector for the ip address text field and the button to be enabled/disabled
function enableButtonIfValidIP(field, button) {
  let x = 46

  // start with the button disabled if the IP isn't currently valid
  $(button).prop("disabled", !IpPattern.test($(field).val()))

  $(field).keypress(e => {
    if (e.which != 8 && e.which != 0 && e.which != x && (e.which < 48 || e.which > 57)) {
      $(button).prop("disabled", true)
      return false
    }
  }).keyup(() => {
    const this1 = $(field)
    if (!IpPattern.test(this1.val())) {
      $(button).prop("disabled", true)
      while (this1.val().indexOf("..") !== -1) {
        this1.val(this1.val().replace('..', '.'))
      }
      x = 46
    } else {
      x = 0
      const lastChar = this1.val().substr(this1.val().length - 1)
      if (lastChar == '.') {
        this1.val(this1.val().slice(0, -1))
      }
      if (this1.val().split('.').length == 4) {
        $(button).prop("disabled", false)
      }
    }
  })
}
