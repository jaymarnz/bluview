const defaultConfig = {
  playerIP: undefined,
  pollTimeout: 100 // BluOS recommended long polling timeout (secs)
}

// return a config object from either localStorage or by prompting the user
// pass a set of overrides for the default configuration which are again
// overridden by localStorage if it exists there
async function getConfig(options) {
  const config = { ...defaultConfig, ...(options || {}), ...(JSON.parse(localStorage.getItem('config') || '{}')) }

  // if we have a prior IP, use that as the current value so they don't have to do anything if its still correct
  // but if no prior IP, then leave the ip-address field untouched
  const priorIP = localStorage.getItem('priorIP')

  if (priorIP) {
    $('#ip_address').val(priorIP)
  }

  while (!config.playerIP) {
    const playerIP = await getPlayerIP()
    
    // if we succeeded, put the playerIP into the config object
    if (playerIP) {
      config.playerIP = playerIP
      localStorage.setItem('config', JSON.stringify(config))

      // remove prior IP last so if they refresh browser again it is still there until they've successfully changed it
      if (priorIP) {
        localStorage.removeItem('priorIP')
      }
    }
  }
  
  return config
}

// return a valid Player IP address entered by the user and confirmed to work
async function getPlayerIP() {
  let playerIP

  enableButtonIfValidIP('#ip_address', '#btnConfig')
  
  while (!playerIP) {
    $('#config').show()
    
    try {
      $('#btnConfig').show()
      $('#spinner').hide()
      
      const userIP = await configButtonClick()
      
      $('#errorMessage').hide()
      $('#btnConfig').hide()
      $('#spinner').show()
      
      // test the user-supplied IP by requesting a SyncStatus (supply a fetch timeout so we don't hang minutes!)
      const syncStatus = await playerRequest('SyncStatus', {
        ...config,
        ...{ playerIP: userIP,
             fetchTimeout: 10000 // only use this for short polling requests
           }
      })

      // if the syncStatus is valid (I just check that the player is initialized) then we've got a valid player IP
      if (syncStatus && syncStatus.SyncStatus) {
        if (syncStatus.SyncStatus._initialized !== 'true') {
          throw new Error('The player needs to be setup with the BluOS Controller app')
        }

        playerIP = userIP;
      }
    } catch (error) { 
      $('#errorMessageText').html(error.message || error.toLocaleString())
      $('#errorMessage').show()
    }

    $('#config').hide()
    return playerIP
  }
}

// return a promise for a button click with the value of the IP address the user entered
async function configButtonClick() {
  return new Promise((resolve, reject) => {
    $('#btnConfig').click(() => {
      resolve($('#ip_address').val())
    })
  })
}
