const DerivExchange = require('./api');
const Deriv = new DerivExchange();

async function main() {
    try {
        await Deriv.connect();
        await Deriv.authorize();

        // Fetch balance
        const balance = await Deriv.fetchBalance();
        console.log('Balance:', balance);
        
        // Fetch active symbols to validate
        const symbolResponse = await Deriv.send({active_symbols: 'brief'});
        const validSymbols = symbolResponse?.active_symbols?.map(symbol => symbol.symbol) || [];
        console.log('Valid symbols:', validSymbols);

        // Example: Validate a symbol for trading
        const selectedSymbol = 'OTC_SPC';
        if (!validSymbols.includes(selectedSymbol)) {
            throw new Error(`Symbol ${selectedSymbol} is not valid. Please use one of the following valid symbols: ${validSymbols.join(', ')}`);
        } else {
            console.log(`Symbol ${selectedSymbol} is valid and ready for trading.`);

            // Fetch additional details or prepare trade logic
            const tickerInfo = await Deriv.fetchTicker(selectedSymbol);
            console.log(`Latest price for ${selectedSymbol}:`, tickerInfo);

        // fetch contract details
            const contractDetails = await Deriv.send({ contracts_for: selectedSymbol });
            const availableContracts = contractDetails?.contracts_for?.available || [];
            if (availableContracts.length === 0) {
                throw new Error(`No contracts available for symbol ${selectedSymbol}`);
            }

        //     fetch valid durations
            const validDurations = availableContracts.map(contract => contract.min_contract_duration);
            const selectedDuration = validDurations[0];

            // Parse duration
            const durationValue = parseInt(selectedDuration.match(/\d+/)?.[0], 10);
            const durationUnit = selectedDuration.match(/[a-zA-Z]+/)?.[0].toLowerCase();

            // Validate duration unit
            const validUnits = ['d', 'm', 's', 'h', 't']; // Valid units
            if (!validUnits.includes(durationUnit)) {
                throw new Error(`Invalid duration unit: ${durationUnit}`);
            }

            console.log(`Selected contract type: CALL`);
            console.log(`Selected duration: ${durationValue} ${durationUnit}`);

            // Place order
            const orderResponse = await Deriv.placeOrder(
                selectedSymbol,
                10,
                durationValue,
                durationUnit,
                'CALL'
            );
            console.log('Order placed successfully:', orderResponse);

        }
        
    } catch (error) {
        console.error('Error in main function:', error);
    }
}

main();