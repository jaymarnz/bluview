// Copyright 2023 jaymarnz, https://github.com/jaymarnz
// See LICENSE for details

const configlocalStorage = 'bluview-config'

const defaultConfig = {
  playerIP: undefined,
  dialServerIP: undefined,
  dialserverDefaultPort: 3000,
  pollTimeout: 100 // BluOS recommended long polling timeout (secs)
}

// return a config object from either localStorage or by prompting the user
// pass a set of overrides for the default configuration which are again
// overridden by localStorage if it exists there
async function getConfig(options) {
  const config = { ...defaultConfig, ...(options || {}), ...(JSON.parse(localStorage.getItem(configlocalStorage) || '{}')) }

  // if we have a prior IP, use that as the initial value so they don't have to do anything if its still correct
  // but if no prior IP, then leave the ip-address field untouched
  if (config.priorIP) {
    $('#ip_address').val(config.priorIP)
  }

  if (config.priorDialServerIP) {
    $('#ds_address').val(config.priorDialServerIP)
  }

  while (!config.playerIP) {
    const { playerIP, dialServerIP } = await getPlayerIP(config)

    // if we succeeded, put the IP's into the config object
    if (playerIP) {
      config.playerIP = playerIP
      config.dialServerIP = dialServerIP
      localStorage.setItem(configlocalStorage, JSON.stringify({ playerIP, dialServerIP })) // we only need to store the IP addresses
    }
  }

  return config
}

// return a valid Player IP address entered by the user and confirmed to work
async function getPlayerIP(config) {
  let playerIP, dialServerIP

  enableButtonIfValidIP('#ip_address', '#btnConfig')

  while (!playerIP) {
    $('#config').show()

    try {
      $('#btnConfig').show()
      $('#spinner').hide()

      const userSettings = await configButtonClick()

      $('#errorMessage').hide()
      $('#btnConfig').hide()
      $('#spinner').show()

      // verify the ds_address is either empty or valid
      if (!userSettings.ds_address || isValidIpPort(userSettings.ds_address)) {
        dialServerIP = (userSettings.ds_address || '')
      } else
        throw new Error("Invalid DialServer IP Address. Leave blank if you don't have a DialServer")

      // test the user-supplied IP by requesting a SyncStatus (supply a fetch timeout so we don't hang minutes!)
      const syncStatus = await playerRequest('SyncStatus', {
        ...config,
        ...{
          playerIP: userSettings.ip_address,
          fetchTimeout: 10000,
          errorMessage: 'Error connecting to the player<br>Check the IP address is correct and reachable'
        }
      })

      // if the syncStatus is valid (I just check that the player is initialized) then we've got a valid player IP
      if (syncStatus && syncStatus.SyncStatus) {
        if (syncStatus.SyncStatus._initialized !== 'true') {
          throw new Error('The player needs to be setup with the BluOS Controller app')
        }

        playerIP = userSettings.ip_address;
      }
    } catch (error) {
      $('#errorMessageText').html(error.message || error.toLocaleString())
      $('#errorMessage').show()
    }

    $('#config').hide()
    return { playerIP, dialServerIP }
  }
}

// return a promise for a button click with the value of the IP address and DialServer the user entered
async function configButtonClick() {
  return new Promise((resolve, reject) => {
    $('#btnConfig').click(() => {
      resolve({
        ip_address: $('#ip_address').val(),
        ds_address: $('#ds_address').val()
      })
    })
  })
}
