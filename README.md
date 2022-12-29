# BluView - What's Playing Display
This is a single page browser app with a continuous What's Playing display and is compatible with BluOS devices.

I purposely made it simple with no controls or buttons and easily visible across the room. Its not intended to be a controller. For that you continue to use the BluOS app.

I run it on an old Android tablet I had lying around to create a dedicated display for my Bluesound NODE.

It shows the current title, artist, album and cover art along with the quality and format. It also includes the current time of day:

<kbd><img src="https://raw.githubusercontent.com/jaymarnz/bluview/master/images/playing.jpg"></kbd>

When nothing is playing it is just a clock:

<kbd><img src="https://raw.githubusercontent.com/jaymarnz/bluview/master/images/not-playing.jpg"></kbd>

## Privacy
It runs entirely within your browser and there is no server other than to provide your browser with the index.html file. No data is sent or stored anywhere except it saves the local IP address of your streamer within your browser's local storage.

## Installation
Copy `dist/index.html` to somewhere your browser can open it. The simplest is to put it on the device itself and open it in the browser with `file://<path-to-the-file>/index.html`

Alternatively you can download index.html: `wget https://jaymarnz.dev/bluview`

If you want to have an icon for the tab in your browser you can copy the icon png files from the dist folder to the same location you put the index.html file. This is optional and isn't used if you run it as a kiosk (see below).

Alternatively you can host it on any webserver you have on your local network (eg. RPi, Quadra, PC, Laptop, NUC, basically anything that can run a simple webserver). See below about why hosting remotely is troublesome.

## Configuration
The first time you open the page it will show a configuration screen. All you need to do is enter the IP address of your player. You'll find it in the BluOS app under Help -> Diagnostics. You usually only need to do this once but if for some reason the IP address changes you can get back to the configuration screen by touching or clicking anywhere on the clock screen when nothing is playing.

## Kiosk Mode (Android)
In some browsers you can make the page full-screen (eliminates the web address and other headers so it's just the web page). I recommend using it this way.

I wasn't able to do this on my old Android tablet running Chrome so I use a free app called Fully Kiosk. There's probably others but this one works great for running BluView:<br>https://play.google.com/store/apps/details?id=com.fullykiosk.singleapp&hl=en_US&gl=US

## Kiosk Mode (iOS)
iOS has a kiosk mode built-in. It's called Guided Access and is enabled in Settings -> Accessibility>Guided Access

## TL;DR - Why don't I just host this for you?
I thought I could just create a public website and give you the link. You'll find it at https://jaymarnz.dev/bluview but it might not work without making a few changes to your browser. That's because in newer browser versions remote sites can't access local resources (your player) by default. If your device is running one of these newer browsers then it will always fail to connect to the player and you'll get an error on the configuration screen.

However, for a dedicated display device and if you don't mind making security changes to your browser (you might not be able to do this on an Android or iOS device) this will work. But it relaxes security on the device so you might not want to do this.

### Chrome
1. Allow insecure content from https://jaymarnz.dev. You need to allow this because BluOS doesn't support https. By default, secure sites served over https can't call insecure API's. But I can't serve the site over http because access to local resources are blocked unless the page is served via https.<br><br>Add `jaymarnz.dev` to the "Allowed to show insecure content" section: <br>`chrome://settings/content/insecureContent?search=site+settings`

2. Disable local preflights. I'm not certain but I think BluOS gets confused when it receives preflight OPTIONS with a newly introduced access control request and it returns a 501 error (which is ok). But the next non-preflight (the actual API call) fails with a 400. I wasn't able to figure out how to get this to work without disabling preflights for local resources. But unfortunately, this setting applies to all websites so I don't recommend doing this on a PC you use for general web browsing.<br> <br>Disable this flag: `chrome://flags/?search=preflight#private-network-access-send-preflights`<br><br>For more info: https://developer.chrome.com/blog/private-network-access-preflight/


 