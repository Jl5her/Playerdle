const canVibrate = typeof navigator !== "undefined" && "vibrate" in navigator

export function hapticGuess() {
  if (canVibrate) navigator.vibrate(30)
}

export function hapticWin() {
  if (canVibrate) navigator.vibrate([40, 30, 40, 30, 80])
}

export function hapticLoss() {
  if (canVibrate) navigator.vibrate([60, 40, 60])
}
