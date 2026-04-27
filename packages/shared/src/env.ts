export const isIOS = (function () {
  const navigator = window?.navigator
  const ua = navigator?.userAgent

  return !!ua && (/iP(?:ad|hone|od)/.test(ua) || (navigator?.maxTouchPoints > 2 && /iPad|Macintosh/.test(ua)))
})()
