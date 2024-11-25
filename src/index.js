const DerivExchange = require('./api');
const Deriv = new DerivExchange();

// Valid duration units
const VALID_UNITS = ['d', 'm', 's', 'h', 't'];

// Fetch initial data
async function fetchInitialData(Deriv) {
    try {
        const balance = await Deriv.fetchBalance();
        console.log('Balance:', balance);

        const activeSymbols = await fetchActiveSymbols(Deriv);
        console.log('Active symbols:', activeSymbols);

        const portfolio = await Deriv.fetchPortfolio();
        console.log('Portfolio:', portfolio);

        const tradeTypes = await Deriv.fetchTradeTypesFromSymbols();
        console.log('Trade Types:', tradeTypes);

        return { balance, portfolio, tradeTypes };
    } catch (error) {
        console.error('Error fetching initial data:', error.message);
        throw error;
    }
}

// Fetch active symbols
async function fetchActiveSymbols(Deriv) {
    try {
        const response = await Deriv.send({ active_symbols: 'brief' });
        if (!response.active_symbols) throw new Error('No active symbols found.');

        return response.active_symbols.map((symbol) => symbol.symbol);
    } catch (error) {
        console.error('Error fetching active symbols:', error.message);
        throw error;
    }
}

// Adjust duration for weekends
function adjustDurationForWeekends(duration, unit) {
    if (unit !== 'd') return duration;

    const today = new Date();
    const expiryDate = new Date(today);
    expiryDate.setDate(today.getDate() + duration);

    if (expiryDate.getDay() === 6) return duration + 2;
    if (expiryDate.getDay() === 0) return duration + 1;

    return duration;
}

// Main function
async function main() {
    try {
        console.log('Starting Deriv application...🤙');
        await Deriv.connect();
        await Deriv.authorize();
        Deriv.keepConnectionAlive();

        const { tradeTypes } = await fetchInitialData(Deriv);

        const selectedSymbol = 'OTC_SPC';
        const validSymbols = tradeTypes.map((trade) => trade.symbol);
        if (!validSymbols.includes(selectedSymbol)) {
            throw new Error(`Invalid symbol: ${selectedSymbol}`);
        }

        const contracts = await Deriv.fetchContractsForSymbol(selectedSymbol);
        if (contracts.length === 0) {
            throw new Error(`No contracts available for symbol ${selectedSymbol}`);
        }

        // Parse and validate duration
        let { minDuration } = contracts[0];
        let durationValue = parseInt(minDuration.match(/\d+/)?.[0], 10);
        let durationUnit = minDuration.match(/[a-zA-Z]+/)?.[0].toLowerCase();

        if (!VALID_UNITS.includes(durationUnit)) {
            throw new Error(`Invalid duration unit: ${durationUnit}`);
        }
        durationValue = adjustDurationForWeekends(durationValue, durationUnit);

        // Place an order
        const orderResponse = await Deriv.placeOrder({
            symbol: selectedSymbol,
            amount: 8.5,
            duration: durationValue,
            durationUnit,
            contractType: 'PUT',
        });
        console.log('Order placed successfully:', orderResponse);

        await Deriv.unsubscribeAllTicks();
    } catch (error) {
        console.error('Error in main:', error.message);
    }
}

// Graceful shutdown
process.on('SIGINT', async () => {
    console.log('Closing application...');
    await Deriv.unsubscribeAllTicks();
    process.exit();
});

main();
