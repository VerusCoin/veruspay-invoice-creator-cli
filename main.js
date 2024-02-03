const { primitives, VerusIdInterface } = require('verusid-ts-client');
const { askYesNoQuestion, askTextQuestion, askForIAddress, askForSatoshisBN, askForCurrencyId, askForDestination, askForBN, askForCurrencyIdArray, askSecureTextQuestion, closeReadline } = require('./utils/question');
const { VRSCTEST_CURRENCY_ID, VRSC_CURRENCY_ID, VRSCTEST_RPC_SERVER, VRSC_RPC_SERVER } = require('./utils/constants');

const flags = {
  acceptsConversion: false,
  acceptsNonVerusSystems: false,
  expires: false,
  acceptsAnyAmount: false,
  acceptsAnyDestination: false,
  isTestnet: false
}

const flagQuestions = {
  acceptsConversion: "Can this invoice be paid with conversion",
  acceptsNonVerusSystems: "Does this invoice accept funds on PBaaS blockchains other than VRSC/VRSCTEST",
  expires: "Does this invoice expire",
  acceptsAnyAmount: "Does this invoice accept any amount of funds",
  acceptsAnyDestination: "Does this invoice accept funds to any destination",
  isTestnet: "Is this a testnet invoice"
}

const invoiceDetails = {
  amount: null,
  destination: null,
  requestedcurrencyid: null,
  expiryheight: null,
  maxestimatedslippage: null,
  acceptedsystems: null
}

async function main() {
  console.log('Welcome to the VerusPay v3 Invoice Creator CLI Tool!');

  for (const key in flagQuestions) {
    flags[key] = await askYesNoQuestion(flagQuestions[key]);
  }

  const VerusId = new VerusIdInterface(
    flags.isTestnet ? VRSCTEST_CURRENCY_ID : VRSC_CURRENCY_ID, flags.isTestnet ? VRSCTEST_RPC_SERVER : VRSC_RPC_SERVER
  );

  invoiceDetails.requestedcurrencyid = await askForCurrencyId("Enter the currency ID or name of the currency you wish to receive", VerusId.interface);

  if (!flags.acceptsAnyAmount) {
    invoiceDetails.amount = await askForSatoshisBN(`Enter the amount of currency to receive (in the currency you just entered)`);
  }

  if (flags.acceptsConversion) {
    invoiceDetails.maxestimatedslippage = await askForSatoshisBN(`Enter the maximum allowed estimated slippage for conversions into this invoice (a decimal number between 0 and 1)`);
  }

  if (!flags.acceptsAnyDestination) {
    invoiceDetails.destination = await askForDestination(`Enter an r-address, i-address, or VerusID handle (ending in @) as the payee for this invoice`, VerusId.interface);
  }
  
  if (flags.expires) {
    invoiceDetails.expiryheight = await askForBN(`Enter the ${flags.isTestnet ? "VRSCTEST" : "VRSC"} blockheight at which this invoice will expire`);
  }

  if (flags.acceptsNonVerusSystems) {
    invoiceDetails.acceptedsystems = await askForCurrencyIdArray(`Enter a blockchain other than ${flags.isTestnet ? "VRSCTEST" : "VRSC"} that this invoice can be paid on`, VerusId.interface);
  }

  if (invoiceDetails.destination) {
    const { version, hash } = primitives.fromBase58Check(invoiceDetails.destination);
    let destType;

    if (version === 60) destType = primitives.DEST_PKH;
    else if (version === 102) destType = primitives.DEST_ID;

    invoiceDetails.destination = new primitives.TransferDestination({
      type: destType,
      destination_bytes: hash
    })
  }

  const InvoiceDetails = new primitives.VerusPayInvoiceDetails(invoiceDetails);
  InvoiceDetails.setFlags(flags);

  console.log(`Created VerusPay invoice with the following details:`)
  console.log(JSON.stringify(InvoiceDetails.toJson(), null, 4))

  const signed = await askYesNoQuestion("Would you like to sign this invoice with a VerusID?");

  let inv;

  if (signed) {
    inv = await VerusId.createVerusPayInvoice(
      InvoiceDetails, 
      await askForDestination("Enter the VerusID handle or i-address that you will sign this invoice with", VerusId.interface, true), 
      await askSecureTextQuestion("Enter the private key (in WIF format) of the primary address of the identity you will sign this invoice with")
    );
  } else {
    inv = await VerusId.createVerusPayInvoice(
      InvoiceDetails
    );
  }

  console.log("Created the following VerusPay invoice:");
  console.log(JSON.stringify(inv.toJson(), null, 4));
  console.log("Open the following link on a mobile device or put it into a QR code and scan it with VerusPay to pay the invoice:");
  console.log(inv.toWalletDeeplinkUri())

  closeReadline();
}

main();
