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
        const selectedSymbol = 'OTC_SPC'; // Example symbol
        if (!validSymbols.includes(selectedSymbol)) {
            throw new Error(`Symbol ${selectedSymbol} is not valid. Please use one of the following valid symbols: ${validSymbols.join(', ')}`);
        } else {
            console.log(`Symbol ${selectedSymbol} is valid and ready for trading.`);

            // Fetch additional details or prepare trade logic
            const tickerInfo = await Deriv.fetchTicker(selectedSymbol);
            console.log(`Latest price for ${selectedSymbol}:`, tickerInfo);

            // Additional trading setup or execution logic goes here
        }
        
    } catch (error) {
        console.error('Error in main function:', error);
    }
}

main();