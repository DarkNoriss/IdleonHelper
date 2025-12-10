export const formatNumber = (e: number, s?: string): string => {
  if (s === "bits") {
    let bits = e,
      t = 0
    for (let i = 0; i < 4; i++) {
      if (bits > 1e18) {
        bits /= 1e18
        t++
      }
    }
    return 1e4 > bits
      ? Math.floor(bits).toString()
      : 1e5 > bits
        ? Math.floor(bits / 100) / 10 + "K"
        : 1e6 > bits
          ? Math.floor(bits / 1e3) + "K"
          : 1e7 > bits
            ? Math.floor(bits / 1e4) / 100 + "M"
            : 1e8 > bits
              ? Math.floor(bits / 1e5) / 10 + "M"
              : 1e9 > bits
                ? Math.floor(bits / 1e6) + "M"
                : 1e10 > bits
                  ? Math.floor(bits / 1e7) / 100 + "B"
                  : 1e11 > bits
                    ? Math.floor(bits / 1e8) / 10 + "B"
                    : 1e12 > bits
                      ? Math.floor(bits / 1e9) + "B"
                      : 1e13 > bits
                        ? Math.floor(bits / 1e10) / 100 + "T"
                        : 1e14 > bits
                          ? Math.floor(bits / 1e11) / 10 + "T"
                          : 1e15 > bits
                            ? Math.floor(bits / 1e12) + "T"
                            : 1e16 > bits
                              ? Math.floor(bits / 1e13) / 100 + "Q"
                              : 1e17 > bits
                                ? Math.floor(bits / 1e14) / 10 + "Q"
                                : 1e18 > bits
                                  ? Math.floor(bits / 1e15) + "Q"
                                  : Math.floor(
                                      (bits /
                                        Math.pow(
                                          10,
                                          Math.floor(lavaLog(bits))
                                        )) *
                                        100
                                    ) /
                                      100 +
                                    "E" +
                                    Math.floor(lavaLog(bits))
  }
  return "Whole" === s
    ? 1e4 > e
      ? "" + Math.floor(e)
      : 1e6 > e
        ? Math.floor(e / 1e3) + "K"
        : 1e7 > e
          ? Math.floor(e / 1e5) / 10 + "M"
          : 1e9 > e
            ? Math.floor(e / 1e6) + "M"
            : 1e10 > e
              ? Math.floor(e / 1e8) / 10 + "B"
              : Math.floor(e / 1e9) + "B"
    : "MultiplierInfo" === s
      ? 0 === (10 * e) % 10
        ? Math.round(e) + ".00"
        : 0 === (100 * e) % 10
          ? Math.round(10 * e) / 10 + "0"
          : Math.round(100 * e) / 100 + ""
      : "Micro" === s
        ? 10 < e
          ? "" + Math.round(e)
          : 0.1 < e
            ? "" + Math.round(10 * e) / 10
            : 0.01 < e
              ? "" + Math.round(100 * e) / 100
              : "" + Math.round(1e3 * e) / 1e3
        : 100 > e
          ? "Small" === s
            ? 1 > e
              ? "" + Math.round(100 * e) / 100
              : "" + Math.round(10 * e) / 10
            : "Smallish" === s
              ? 10 > e
                ? "" + Math.round(10 * e) / 10
                : "" + Math.round(e)
              : "Smaller" === s
                ? 10 > e
                  ? "" + Math.round(100 * e) / 100
                  : "" + Math.round(10 * e) / 10
                : "" + Math.floor(e)
          : 1e3 > e
            ? "" + Math.floor(e)
            : 1e4 > e
              ? "Bigish" === s
                ? "" + Math.floor(e)
                : Math.ceil(e / 10) / 100 + "K"
              : 1e5 > e
                ? Math.ceil(e / 100) / 10 + "K"
                : 1e6 > e
                  ? Math.ceil(e / 1e3) + "K"
                  : 1e7 > e
                    ? Math.ceil(e / 1e4) / 100 + "M"
                    : 1e8 > e
                      ? Math.ceil(e / 1e5) / 10 + "M"
                      : 1e10 > e
                        ? Math.ceil(e / 1e6) + "M"
                        : 1e13 > e
                          ? Math.ceil(e / 1e9) + "B"
                          : 1e16 > e
                            ? Math.ceil(e / 1e12) + "T"
                            : 1e19 > e
                              ? Math.ceil(e / 1e15) + "Q"
                              : 1e22 > e
                                ? Math.ceil(e / 1e18) + "QQ"
                                : 1e24 > e
                                  ? Math.ceil(e / 1e21) + "QQQ"
                                  : "TinyE" === s
                                    ? "" +
                                      Math.floor(
                                        (e /
                                          Math.pow(
                                            10,
                                            Math.floor(lavaLog(e))
                                          )) *
                                          10
                                      ) /
                                        10 +
                                      ("e" + Math.floor(lavaLog(e)))
                                    : "" +
                                      Math.floor(
                                        (e /
                                          Math.pow(
                                            10,
                                            Math.floor(lavaLog(e))
                                          )) *
                                          100
                                      ) /
                                        100 +
                                      ("E" + Math.floor(lavaLog(e)))
}

export const lavaLog = (num) => {
  return Math.log(Math.max(num, 1)) / 2.30259
}
