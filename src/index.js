const DerivExchange = require('./api');
const Deriv = new DerivExchange();

async function fetchInitialData(Deriv) {
    const balance = await Deriv.fetchBalance();
    console.log('Balance:', balance);

    const portfolio = await Deriv.fetchPortfolio();
    console.log('Portfolio:', portfolio);

    const tradeTypes = await Deriv.fetchTradeTypesFromSymbols();
    console.log('Trade Types:', tradeTypes);

    return { balance, portfolio, tradeTypes };
}


async function getValidContractDetails(Deriv, symbol) {
    const contracts = await Deriv.fetchContractsForSymbol(symbol);
    console.log('Available contracts:', contracts);
    return contracts;
}


async function monitorPriceAndPlaceOrder(Deriv, symbol, conditions, orderDetails) {
    await Deriv.send({ ticks: symbol });
    Deriv.ws.on('message', (data) => {
        const response = JSON.parse(data);
        if (response.tick) {
            const currentPrice = response.tick.quote;
            console.log(`Current price for ${symbol}:`, currentPrice);

            if (conditions.every((cond) => cond(currentPrice))) {
                console.log('All conditions met. Placing order...');
                Deriv.placeOrder(orderDetails).catch(console.error);
            }
        }
    });
}

//adjust duration for weekends
function adjustDurationForWeekends(duration, unit) {
    if (unit !== 'd') return duration;

    const today = new Date();
    const expiryDate = new Date(today);
    expiryDate.setDate(today.getDate() + duration);

    if (expiryDate.getDay() === 6) {
        return duration + 2;
    } else if (expiryDate.getDay() === 0) {
        return duration + 1;
    }
    return duration;
}

async function main() {
    try {
        console.log('Starting application...');
        await Deriv.connect();
        await Deriv.authorize();

        const { tradeTypes } = await fetchInitialData(Deriv);
        console.log('Trade Types:', tradeTypes);

        // random valid symbol to test my code
        const symbol = 'R_100';
        const contracts = await getValidContractDetails(Deriv, symbol);
        console.log('Contracts:', contracts);

        const contract = contracts[0];
        const duration = adjustDurationForWeekends(5, 'd');
        const amount = 1;
        const orderDetails = {
            symbol,
            contract_type: contract.contract_type,
            duration,
            amount,
        };

        const conditions = [
            (price) => price > 1.2,
            (price) => price < 1.4,
        ];

        monitorPriceAndPlaceOrder(Deriv, symbol, conditions, orderDetails);
    } catch (error) {
        console.error('Error:', error);
    }
}

main();