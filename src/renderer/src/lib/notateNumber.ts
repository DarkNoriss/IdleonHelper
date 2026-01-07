const lavaLog = (num: number): number => {
  return Math.log(Math.max(num, 1)) / 2.30259
}

export const notateNumber = (num: number): string => {
  const isNegative = num < 0
  const absNum = Math.abs(num)

  let result: string

  if (absNum < 100) {
    result = String(Math.floor(absNum))
  } else if (absNum < 1e3) {
    result = String(Math.floor(absNum))
  } else if (absNum < 1e4) {
    result = String(Math.ceil(absNum / 10) / 100) + "K"
  } else if (absNum < 1e5) {
    result = String(Math.ceil(absNum / 100) / 10) + "K"
  } else if (absNum < 1e6) {
    result = String(Math.ceil(absNum / 1e3)) + "K"
  } else if (absNum < 1e7) {
    result = String(Math.ceil(absNum / 1e4) / 100) + "M"
  } else if (absNum < 1e8) {
    result = String(Math.ceil(absNum / 1e5) / 10) + "M"
  } else if (absNum < 1e10) {
    result = String(Math.ceil(absNum / 1e6)) + "M"
  } else if (absNum < 1e13) {
    result = String(Math.ceil(absNum / 1e9)) + "B"
  } else if (absNum < 1e16) {
    result = String(Math.ceil(absNum / 1e12)) + "T"
  } else if (absNum < 1e19) {
    result = String(Math.ceil(absNum / 1e15)) + "Q"
  } else if (absNum < 1e22) {
    result = String(Math.ceil(absNum / 1e18)) + "QQ"
  } else if (absNum < 1e24) {
    result = String(Math.ceil(absNum / 1e21)) + "QQQ"
  } else {
    result =
      String(
        Math.floor((absNum / Math.pow(10, Math.floor(lavaLog(absNum)))) * 100) /
          100
      ) +
      ("E" + Math.floor(lavaLog(absNum)))
  }

  return isNegative ? `-${result}` : result
}
