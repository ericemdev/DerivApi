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

// Fetch valid contract details and durations
async function getValidContractDetails(Deriv, symbol) {
    try {
        if (!symbol || typeof symbol !== 'string') {
            throw new Error('Invalid symbol provided. It must be a non-empty string.');
        }

        console.log(`Fetching contracts for symbol: ${symbol}`);
        const contracts = await Deriv.fetchContractsForSymbol(symbol);

        if (!Array.isArray(contracts) || contracts.length === 0) {
            throw new Error(`No contracts available for symbol ${symbol}`);
        }

        contracts.forEach((contract) => {
            if (!contract.minDuration || typeof contract.minDuration !== 'string') {
                console.warn(`Missing or invalid minDuration for contract:`, contract);
                contract.minDuration = '1d'; // Assign a default value if missing
            }
        });

        console.log('Available contracts:', JSON.stringify(contracts, null, 2));
        return contracts;
    } catch (error) {
        console.error(`Error fetching contract details for symbol "${symbol}":`, error.message);
        throw error;
    }
}

// Select valid duration from contracts
function selectValidDuration(contracts) {
    if (!Array.isArray(contracts) || contracts.length === 0) {
        throw new Error('No contracts available to select a valid duration.');
    }

    for (const contract of contracts) {
        const minDurationMatch = contract.minDuration.match(/\d+/); // Extract numeric value
        const unitMatch = contract.minDuration.match(/[a-zA-Z]+/); // Extract unit

        if (minDurationMatch && unitMatch) {
            const durationValue = parseInt(minDurationMatch[0], 10);
            const durationUnit = unitMatch[0].toLowerCase();

            if (VALID_UNITS.includes(durationUnit)) {
                return { durationValue, durationUnit };
            }
        }
    }

    // If no valid duration found, throw an error
    throw new Error('No valid duration found in the contracts.');
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
        const selectedSymbol = 'R_100';

        const validSymbols = tradeTypes.map((trade) => trade.symbol);
        if (!validSymbols.includes(selectedSymbol)) {
            throw new Error(`Invalid symbol: ${selectedSymbol}`);
        }


        const contracts = await getValidContractDetails(Deriv, selectedSymbol);
        const { durationValue, durationUnit } = selectValidDuration(contracts);

        if (contracts.length === 0) {
            throw new Error(`No contracts available for symbol ${selectedSymbol}`);
        }

        if (!VALID_UNITS.includes(durationUnit)) {
            throw new Error(`Invalid duration unit: ${durationUnit}`);
        }


        const orderResponse = await Deriv.placeOrder({
            symbol: selectedSymbol,
            amount: 8.5,
            duration: durationValue,
            durationUnit,
            contractType: 'PUT',
        });
        console.log('Order placed successfully:', orderResponse);


        const portfolio = await Deriv.fetchPortfolio();
        console.log('Portfolio fetched:', portfolio);

        const contractId = portfolio[0]?.contract_id;
        console.log('Selected Contract:', JSON.stringify(portfolio[0], null, 2));

        if (!contractId) {
            console.error('Contract ID not found for the selected contract.');
            return;
        }

        // Modify the selected order
        const modifyResponse = await Deriv.modifyOrder(
            contractId,
            '150.0', // Replace with the desired take-profit value
            '100.0'  // Replace with the desired stop-loss value
        );
        console.log('Order modified successfully:', modifyResponse);

        console.log('Order modified successfully:', modifyResponse);

        // Sell the contract
        // const contractId = orderResponse.buy?.contract_id;
        // if (contractId) {
        //     const sellResponse = await Deriv.sellContract(contractId, 10);
        //     console.log('Sell response:', sellResponse);
        // } else {
        //     console.log('No contract ID found for the buy order.');
        // }
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
