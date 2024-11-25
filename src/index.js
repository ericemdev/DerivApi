const DerivExchange = require('./api');
const Deriv = new DerivExchange();

async function fetchInitialData(Deriv) {
    const balance = await Deriv.fetchBalance();
    console.log('Balance:', balance);

    const activeSymbols = await fetchActiveSymbols(Deriv);
    console.log('Active symbols:', activeSymbols);

    const portfolio = await Deriv.fetchPortfolio();
    console.log('Portfolio:', portfolio);

    const tradeTypes = await Deriv.fetchTradeTypesFromSymbols();
    console.log('Trade Types:', tradeTypes);

    return { balance, portfolio, tradeTypes };
}

async function fetchActiveSymbols(Deriv) {
    try {
        const response = await Deriv.send({ active_symbols: 'brief' });
        if (response.active_symbols) {
            console.log('Active symbols:', response.active_symbols);
            return response.active_symbols.map((symbol) => symbol.symbol);
        } else {
            throw new Error('No active symbols found.');
        }
    } catch (e) {
        console.error('Error fetching active symbols:', e.message);
        throw e;
    }
}


async function getValidContractDetails(Deriv, symbol) {
    try {
        const contracts = await Deriv.fetchContractsForSymbol(symbol);
        if (!contracts || contracts.length === 0) {
            throw new Error(`No contracts available for symbol ${symbol}`);
        }

        // Parse duration value and unit safely
        contracts.forEach((contract) => {
            if (!contract.minDuration || typeof contract.minDuration !== 'string') {
                console.warn(`Missing or invalid minDuration for contract:`, contract);
                contract.minDuration = '1d';
            }
        });

        console.log('Available contracts:', contracts);
        return contracts;
    } catch (error) {
        console.error(`Error fetching contract details for symbol ${symbol}:`, error.message);
        throw error;
    }
}


async function monitorPriceAndPlaceOrder(Deriv, symbol, conditions, orderDetails) {
    await Deriv.unsubscribeAllTicks();
    await Deriv.send({ ticks: symbol });
    Deriv.ws.on('message', (data) => {
        const response = JSON.parse(data);
        if (response.tick) {
            const currentPrice = response.tick.quote;
            console.log(`Current price for ${symbol}: ${currentPrice}`);

            if (conditions.every((cond) => cond(currentPrice))) {
                console.log('All conditions met. Placing order...');
                Deriv.placeOrder(orderDetails).catch(console.error);
            }
        }
    });
}

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
        console.log('my deriv app api is trying to run...');
        await Deriv.connect();
        await Deriv.authorize();
        Deriv.keepConnectionAlive();


        const { tradeTypes } = await fetchInitialData(Deriv);
        const command = 'buy 10 OTC_SPC';
        const params ={
            Q: 10,
            P: null,
            TP: '15%',
            SL: '10%',
            T: 1,
            L: 10,
        };

        // const response = await Deriv.placeOrder(command, params);
        // console.log('Order placed successfully:', response);

        const selectedSymbol = 'OTC_SPC';
        const validSymbols = tradeTypes.map((trade) => trade.symbol);

        if (!validSymbols.includes(selectedSymbol)) {
            throw new Error(`Invalid symbol: ${selectedSymbol}`);
        }

        const tickerInfo = await Deriv.fetchTicker(selectedSymbol);
        console.log(`Latest price for ${selectedSymbol}:`, tickerInfo);

        const contracts = await getValidContractDetails(Deriv, selectedSymbol);

        if (contracts.length === 0) {
            throw new Error(`No contracts available for symbol ${selectedSymbol}`);
        }

        let selectedDuration = contracts[0].minDuration;
        let durationValue = parseInt(selectedDuration.match(/\d+/)?.[0], 10);
        let durationUnit = selectedDuration.match(/[a-zA-Z]+/)?.[0].toLowerCase();
        console.log(`Parsed duration value: ${durationValue}, unit: ${durationUnit}`);

        const validUnits = ['d', 'm', 's', 'h', 't'];
        if (!validUnits.includes(durationUnit)) {
            throw new Error(`Invalid duration unit: ${durationUnit}`);
        }

        durationValue = adjustDurationForWeekends(durationValue, durationUnit);

        console.log(`Selected duration: ${durationValue} ${durationUnit}`);

        const orderResponse = await Deriv.placeOrder({
            symbol: selectedSymbol,
            amount: 8.5,
            duration: durationValue,
            durationUnit,
            contractType: 'PUT',
        });
        console.log('Order placed successfully:', orderResponse);



        await monitorPriceAndPlaceOrder(Deriv, selectedSymbol, [(price) => price > 100], {
            symbol: selectedSymbol,
            amount: 10,
            duration: durationValue,
            durationUnit,
            contractType: 'CALL',
            leverage : 10,
        });
        console.log('Conditional order monitoring started.');

        const openOrders = await Deriv.fetchPortfolio();
        const criteria = (order) => order.symbol === selectedSymbol && order.contract_type === 'CALL';
        const specificOrder = Deriv.findOrder(openOrders, criteria);

        if (!specificOrder) {
            console.log('Order not found based on the provided criteria.');
            return;
        }

        const closeResponse = await Deriv.closePosition(specificOrder.contract_id);
        console.log('Position closed successfully:', closeResponse);

        const cancelResponse = await Deriv.cancelOrder(specificOrder.contract_id);
        console.log('Order canceled successfully:', cancelResponse);


    } catch (error) {
        console.error('Error in main:', error);
    }
}

main();
