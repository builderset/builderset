# Social icons

The social block's icons: one 96px PNG per network and style,
`social/<network>-<style>.png`. Email clients need images at a public address,
and Gmail and Outlook show no SVG, so these are files a project serves itself.

- **Serve them yourself.** Copy `social/` to any public folder and render with
  `socialIcon: socialIconsAt('https://example.com/assets/social')`. The email
  editor's `socialIconBase` takes a site address and reads the icons from
  `<site>/email/social/`.
- **From a CDN that mirrors npm** (once the package is published):
  `socialIconsAt('https://cdn.jsdelivr.net/npm/@builderset/email@<version>/icons/social')`.
  No setup, but a third party's server is in every email you send.

Without a `socialIcon` function the block renders text links instead.
