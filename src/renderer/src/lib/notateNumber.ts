const lavaLog = (num: number): number => {
  return Math.log(Math.max(num, 1)) / 2.30259
}

export const notateNumber = (num: number): string => {
  if (num < 100) {
    return String(Math.floor(num))
  }

  if (num < 1e3) {
    return String(Math.floor(num))
  }

  if (num < 1e4) {
    return String(Math.ceil(num / 10) / 100) + "K"
  }

  if (num < 1e5) {
    return String(Math.ceil(num / 100) / 10) + "K"
  }

  if (num < 1e6) {
    return String(Math.ceil(num / 1e3)) + "K"
  }

  if (num < 1e7) {
    return String(Math.ceil(num / 1e4) / 100) + "M"
  }

  if (num < 1e8) {
    return String(Math.ceil(num / 1e5) / 10) + "M"
  }

  if (num < 1e10) {
    return String(Math.ceil(num / 1e6)) + "M"
  }

  if (num < 1e13) {
    return String(Math.ceil(num / 1e9)) + "B"
  }

  if (num < 1e16) {
    return String(Math.ceil(num / 1e12)) + "T"
  }

  if (num < 1e19) {
    return String(Math.ceil(num / 1e15)) + "Q"
  }

  if (num < 1e22) {
    return String(Math.ceil(num / 1e18)) + "QQ"
  }

  if (num < 1e24) {
    return String(Math.ceil(num / 1e21)) + "QQQ"
  }

  return (
    String(
      Math.floor((num / Math.pow(10, Math.floor(lavaLog(num)))) * 100) / 100
    ) +
    ("E" + Math.floor(lavaLog(num)))
  )
}
