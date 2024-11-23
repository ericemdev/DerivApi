const DerivExchange = require('./api');
const Deriv = new DerivExchange();

async function main() {
    try {
        await Deriv.connect();
        await Deriv.authorize();


        const balance = await Deriv.fetchBalance();
        console.log('Balance:', balance);

        // Fetch active symbols to validate
        const symbolResponse = await Deriv.send({active_symbols: 'brief'});
        const validSymbols = symbolResponse?.active_symbols?.map(symbol => symbol.symbol) || [];
        console.log('Valid symbols:', validSymbols);

        // fetch Trade types derived from active symbols
        const tradeTypes = await Deriv.fetchTradeTypesFromSymbols();
        console.log ('Trade types:', tradeTypes);

        const openMarkets = await Deriv.fetchOpenMarkets();
        console.log('Open markets:', openMarkets);

        const forexTrades = tradeTypes.filter((trade) => trade.market === 'forex');
        console.log('Forex Trades:', forexTrades);


        const selectedSymbol = 'OTC_SPC';

        if (!validSymbols.includes(selectedSymbol)) {
            throw new Error(`Symbol ${selectedSymbol} is not valid. Please use one of the following valid symbols: ${validSymbols.join(', ')}`);
        } else {
            console.log(`Symbol ${selectedSymbol} is valid and ready for trading.`);

            const tickerInfo = await Deriv.fetchTicker(selectedSymbol);
            console.log(`Latest price for ${selectedSymbol}:`, tickerInfo);

            const contractDetails = await Deriv.send({ contracts_for: selectedSymbol });
            const availableContracts = contractDetails?.contracts_for?.available || [];
            if (availableContracts.length === 0) {
                throw new Error(`No contracts available for symbol ${selectedSymbol}`);
            }


            const validDurations = availableContracts.map(contract => contract.min_contract_duration);
            let selectedDuration = validDurations[0];


            let durationValue = parseInt(selectedDuration.match(/\d+/)?.[0], 10);
            let durationUnit = selectedDuration.match(/[a-zA-Z]+/)?.[0].toLowerCase();


            const validUnits = ['d', 'm', 's', 'h', 't'];
            if (!validUnits.includes(durationUnit)) {
                throw new Error(`Invalid duration unit: ${durationUnit}`);
            }

            // check if duration leads to a weekend or holiday and adjust accordingly
            if (durationUnit === 'd') {
                const today = new Date();
                const expiryDate = new Date(today);
                expiryDate.setDate(today.getDate() + durationValue);

                if (expiryDate.getDay() === 6) {
                    durationValue += 2;
                } else if (expiryDate.getDay() === 0) {
                    durationValue += 1;
                }
            }

            console.log(`Selected contract type: CALL`);
            console.log(`Selected duration: ${durationValue} ${durationUnit}`);

            // Place order
            const orderResponse = await Deriv.placeOrder({
                symbol: selectedSymbol,
                amount: 8.50,
                duration: durationValue,
                durationUnit,
                contractType: 'CALL',
            });
            console.log('Order placed successfully:', orderResponse);

        }
        
    } catch (error) {
        console.error('Error in main function:', error);
    }
}

main();