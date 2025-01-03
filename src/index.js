const DerivExchange = require('./api');
const Deriv = new DerivExchange();

function parseArgs(args) {
    const params = {};
    args.forEach((arg) => {
        const [key, value] = arg.split('=');
        if (key && value !== undefined) {
            params[key.toUpperCase()] = value;
        } else {
            console.warn(`Invalid argument format: "${arg}". Expected "key=value".`);
        }
    });
    return params;
}

const VALID_UNITS = ['d', 'm', 's', 'h', 't'];

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

async function fetchValidDurations(Deriv, symbol) {
    try {
        const contracts = await Deriv.fetchContractsForSymbol(symbol);
        console.log('Contracts for symbol:', symbol, JSON.stringify(contracts, null, 2));
        return contracts;
    } catch (error) {
        console.error(`Error fetching contract details for symbol "${symbol}":`, error.message);
        throw error;
    }
}


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
                contract.minDuration = '1d';
            }
        });

        console.log('Available contracts:', JSON.stringify(contracts, null, 2));
        return contracts;
    } catch (error) {
        console.error(`Error fetching contract details for symbol "${symbol}":`, error.message);
        throw error;
    }
}

function selectValidDuration(contracts) {
    if (!Array.isArray(contracts) || contracts.length === 0) {
        throw new Error('No contracts available to select a valid duration.');
    }

    for (const contract of contracts) {
        const minDurationMatch = contract.minDuration.match(/\d+/);
        const unitMatch = contract.minDuration.match(/[a-zA-Z]+/);

        if (minDurationMatch && unitMatch) {
            const durationValue = parseInt(minDurationMatch[0], 10);
            const durationUnit = unitMatch[0].toLowerCase();

            if (VALID_UNITS.includes(durationUnit)) {
                return { durationValue, durationUnit };
            }
        }
    }

    throw new Error('No valid duration found in the contracts.');
}

function adjustDurationForWeekends(duration, unit) {
    if (unit !== 'd') return duration;

    const today = new Date();
    const expiryDate = new Date(today);
    expiryDate.setDate(today.getDate() + duration);

    if (expiryDate.getDay() === 6) return duration + 2;
    if (expiryDate.getDay() === 0) return duration + 1;

    return duration;
}

async function placeOrder(Deriv, contractType, symbol, params) {
    const amount = params.Q || 1;
    const expiry = params.E || 1;
    const durationUnit = 'm';
    const orderType = params.T || 'BINARY';
    const account = params.A || 'PRACTICE';

    const orderResponse = await Deriv.placeOrder({
        symbol,
        amount,
        duration: expiry,
        durationUnit,
        contractType,
        orderType,
        account,
    });
    console.log('Order placed successfully:', orderResponse);
}

async function displayBalance(Deriv, account = 'demo') {
    try {
        if (!['real', 'demo'].includes(account)) {
            throw new Error(`Invalid account type: ${account}. Use "real" or "demo".`);
        }

        const response = await Deriv.fetchBalance();
        const balance = account === 'demo' ? response.demo : response.balance;

        console.log(`${account.toUpperCase()} Balance:`, balance);
    } catch (error) {
        console.error('Error displaying balance:', error.message);
    }
}

async function displaySymbols(Deriv, type) {
    const symbols = await Deriv.fetchActiveSymbols();
    const filteredSymbols = symbols.filter(symbol => symbol.market === type);
    console.log(`Symbols (${type}):`, filteredSymbols);
}

async function closePosition(Deriv, contractId) {
    const sellPrice = 0;
    const sellResponse = await Deriv.sellContract(contractId, sellPrice);
    console.log('Position closed successfully:', sellResponse);
    return sellResponse;
}

async function main() {
    try {
        console.log('Starting Deriv application...🤙');
        await Deriv.connect();
        await Deriv.authorize();
        Deriv.keepConnectionAlive();

        const args = process.argv.slice(2);
        const command = args[0]?.toLowerCase();
        const symbol = args[1];
        const params = parseArgs(args.slice(2));

        if (!symbol) {
            throw new Error('Symbol is missing. Please provide a valid symbol.');
        }

        console.log('Command:', command);
        console.log('Symbol:', symbol);
        console.log('Parameters:', params);

        const contracts = await fetchValidDurations(Deriv, symbol);
        console.log('Available contracts:', contracts);

        switch (command) {
            case 'long':
            case 'buy':
            case '1':
                await placeOrder(Deriv, 'CALL', symbol, params);
                break;
            case 'short':
            case 'sell':
            case '-1':
                await placeOrder(Deriv, 'PUT', symbol, params);
                break;
            case 'balance':
                await displayBalance(Deriv, params.A);
                break;
            case 'symbols':
                await displaySymbols(Deriv, params.T);
                break;
            case 'cancel':
                await Deriv.cancelOrders();
                break;
            case 'close':
                const positions = await Deriv.fetchPortfolio();
                const contractId = positions[0]?.contract_id;
                if (contractId) {
                    await closePosition(Deriv, contractId);
                } else {
                    console.error('No open positions found to close.');
                }
                break;
            default:
                console.error('Invalid command:', command);
        }

        const { tradeTypes } = await fetchInitialData(Deriv);
        const selectedSymbol = 'R_100';

        const validSymbols = tradeTypes.map((trade) => trade.symbol);
        if (!validSymbols.includes(selectedSymbol)) {
            throw new Error(`Invalid symbol: ${selectedSymbol}`);
        }

        const { durationValue, durationUnit } = selectValidDuration(contracts);
        const adjustedDuration = adjustDurationForWeekends(durationValue, durationUnit);

        const orderResponse = await Deriv.placeOrder({
            symbol: selectedSymbol,
            amount: 8.5,
            duration: adjustedDuration,
            durationUnit,
            contractType: 'PUT',
            orderType: 'BINARY',
            account: 'PRACTICE',
        });
        console.log('Order placed successfully:', orderResponse);

        const portfolio = await Deriv.fetchPortfolio();
        console.log('Portfolio fetched:', portfolio);

        const contractId = portfolio[0]?.contract_id;
        if (!contractId) {
            console.error('Contract ID not found for the selected contract.');
            return;
        }

        const modifyResponse = await Deriv.modifyOrder(
            contractId,
            '150.0',
            '100.0'
        );
        console.log('Order modified successfully✅:', modifyResponse);

        await Deriv.unsubscribeAllTicks();
    } catch (error) {
        console.error('Error in main:', error.message);
    }
}

process.on('SIGINT', async () => {
    console.log('Closing application...🔐');
    await Deriv.unsubscribeAllTicks();
    process.exit();
});

main();
