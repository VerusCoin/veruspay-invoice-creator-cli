const { primitives } = require('verusid-ts-client');
const { coinsToSats } = require('./math');
const BigNumber = require('bignumber.js');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

rl.stdoutMuted = false;

rl._writeToOutput = function _writeToOutput(stringToWrite) {
  if (rl.stdoutMuted)
    rl.output.write("*");
  else
    rl.output.write(stringToWrite);
};

function closeReadline() {
  rl.close();
}

function askYesNoQuestion(question) {
  return new Promise((resolve) => {
    rl.question(`${question} (yes/no): `, (answer) => {
      resolve(answer.toLowerCase() === 'yes' || answer.toLowerCase() === 'y');
    });
  });
}

function askTextQuestion(question) {
  return new Promise((resolve) => {
    rl.question(`${question}: `, (answer) => {
      resolve(answer);
    });
  });
}

function askSecureTextQuestion(question) {  
  return new Promise((resolve) => {
    console.log(`${question}: `);
    rl.stdoutMuted = true;

    rl.question('', (answer) => {
      rl.stdoutMuted = false;
      rl.history = rl.history.slice(1);
      resolve(answer);
    });
  });
}

async function askForIAddress(question) {
  while (true) {
    let iAddrString = await askTextQuestion(question);

    try {
      const { version } = primitives.fromBase58Check(iAddrString);

      if (version !== 102) console.log("Invalid i-address (incorrect base58 version) try again.")
      else {
        return iAddrString;
      }
    } catch (e) {
      console.log("Invalid i-address, try again.")
    }
  }
}

async function askForCurrencyId(question, rpcInterface) {
  while (true) {
    let currencyId = await askTextQuestion(question);

    try {
      try {
        const { version } = primitives.fromBase58Check(currencyId);
  
        if (version === 102) return currencyId;
      } catch (e) {}

      const getCurrencyResponse = await rpcInterface.getCurrency(currencyId);

      if (getCurrencyResponse.result) {
        console.log(`Found currencyid for ${currencyId} as ${getCurrencyResponse.result.currencyid}, using that.`)
        return getCurrencyResponse.result.currencyid;
      }
      else if (getCurrencyResponse.error) {
        console.log(getCurrencyResponse.error.message);
      } else {
        console.log("Could not get currency, unknown error.");
      }
    } catch(e) {
      console.log(e.message);
    }
  }
}

async function askForDestination(question, rpcInterface, identityRequired = false) {
  while (true) {
    let destination = await askTextQuestion(question);

    try {
      try {
        const { version } = primitives.fromBase58Check(destination);
  
        if (version === 102 || (version === 60 && !identityRequired)) return destination;
      } catch (e) {}

      const getIdentityResponse = await rpcInterface.getIdentity(destination);

      if (getIdentityResponse.result) {
        console.log(`Found i-address for ${destination} as ${getIdentityResponse.result.identity.identityaddress}, using that.`)
        return getIdentityResponse.result.identity.identityaddress;
      } else if (getIdentityResponse.error) {
        console.log(getIdentityResponse.error.message);
      } else {
        console.log("Could not get identity, unknown error.");
      }
    } catch(e) {
      console.log(e.message);
    }
  }
}

async function askForBN(question) {
  while (true) {
    let numString = await askTextQuestion(question);

    try {
      return new primitives.BigNumber(numString)
    } catch (e) {
      console.log("Invalid number, try again.")
    }
  }
}

async function askForSatoshisBN(question) {
  while (true) {
    let coinsString = await askTextQuestion(question);

    try {
      return new primitives.BigNumber(coinsToSats(BigNumber(coinsString)).toString())
    } catch (e) {
      console.log("Invalid amount, try again.")
    }
  }
}

async function askForCurrencyIdArray(question, rpcInterface) {
  const currencyIds = [];

  async function askForCurrency() {
    currencyIds.push(await askForCurrencyId(question, rpcInterface))
  }

  await askForCurrency();

  while (true) {
    if (await askYesNoQuestion("Add another blockchain?")) {
      await askForCurrency();
    } else return currencyIds;
  }
}

module.exports = {
  askYesNoQuestion,
  askTextQuestion,
  askForBN,
  askForCurrencyId,
  askForCurrencyIdArray,
  askForDestination,
  askForIAddress,
  askForSatoshisBN,
  askSecureTextQuestion,
  closeReadline
}