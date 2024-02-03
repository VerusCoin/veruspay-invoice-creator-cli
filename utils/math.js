const BigNumber = require("bignumber.js");

const coinsToUnits = (coin, decimals) => {
  return coin.multipliedBy(BigNumber(10).pow(BigNumber(decimals)))
}

const unitsToCoins = (units, decimals) => {
  return units.dividedBy(BigNumber(10).pow(BigNumber(decimals)))
}

const coinsToSats = (coins) => {
  return BigNumber(coinsToUnits(coins, 8).toFixed(0))
}

const satsToCoins = (satoshis) => {
  return unitsToCoins(satoshis, 8)
}

module.exports = {
  coinsToUnits,
  unitsToCoins,
  coinsToSats,
  satsToCoins
}