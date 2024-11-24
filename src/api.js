const WebSocket = require('ws');
const { APP_ID, API_TOKEN } = require('../config');


/***class Deriv Exchange creates a new instance of the WebSocket class
the constructor method is called when a new instance of the class is created
authorize method sends an authorization message to the server with the API token as the value of the authorization key
 */
class DerivExchange {
    constructor() {
        this.ws = new WebSocket(`wss://ws.binaryws.com/websockets/v3?app_id=${APP_ID}`);
    }

    connect() {
        console.log('Connecting to Deriv WebSocket...');
        return new Promise((resolve, reject) => {
            this.ws.on('open', () => {
                console.log('Connected to Deriv WebSocket');
                resolve();
            });
            this.ws.on('error', (error) => {
                console.error('Connection error:', error);
                reject(error);
            });
        });
    }

    authorize() {
        console.log('Authorizing...');
        return new Promise((resolve, reject) => {
            this.ws.send(JSON.stringify({ authorize: API_TOKEN }), (error) => {
                if (error) {
                    console.error('Authorization error:', error);
                    return reject(error);
                }

                // Listen for the rensponse
                this.ws.once('message', (data) => {
                    const response = JSON.parse(data);
                    if (response.error) {
                        console.error('Authorization failed:', response.error);
                        reject(response.error);
                    } else {
                        console.log('Authorization successful:', response);
                        resolve(response);
                    }
                });
            });
        });
    }

    send(request) {
        console.log('Sending request...');
        return new Promise((resolve, reject) => {
            this.ws.send(JSON.stringify(request), (error) => {
                if (error) {
                    console.error('Send request error:', error);
                    return reject(error);
                }

                // Listen for response
                this.ws.once('message', (data) => {
                    const response = JSON.parse(data);
                    if (response.error) {
                        console.error('Request failed:', response.error);
                        reject(response.error);
                    } else {
                        resolve(response);
                    }
                });
            });
        });
    }

    async fetchBalance() {
        try {
            return await this.send({ balance: 1 });
        } catch (error) {
            console.error('Failed to fetch balance:', error);
            throw error; 
        }
    }


    // updated fetchTicker method to handle existing subscriptions
    async fetchTicker(symbol) {
        try {
            // Unsubscribe first if already subscribed
            await this.send({ forget_all: 'ticks' });

            const response = await this.send({ ticks: symbol });
            const price = response.tick?.quote;
            console.log(`Fetched price for ${symbol}:`, price);

            return price;
        } catch (error) {
            console.error(`Error fetching ticker for ${symbol}:`, error);
            throw error;
        }
    }


    async fetchPortfolio() {
        try {
            const response = await this.send({ portfolio: 1 });
            const openOrders = response.portfolio?.contracts || [];
            console.log('Open Orders:', openOrders);
            return openOrders;
        } catch (error) {
            console.error('Failed to fetch portfolio:', error);
            throw error;
        }
    }

    // fetchTradeTypesFromSymbols sends a request to the server to fetch trade types derived from active symbols
    async fetchTradeTypesFromSymbols() {
        try {
            const response = await this.send({ active_symbols: 'brief' });
            const symbols = response.active_symbols;

            const tradeTypes = symbols.map((symbol) => ({
                market: symbol.market,
                submarket: symbol.submarket,
                symbol: symbol.symbol,
                display_name: symbol.display_name,
            }));

            // Sort trade types by market, submarket, or display_name
            const sortedTradeTypes = tradeTypes.sort((a, b) => {
                if (a.market === b.market) {
                    if (a.submarket === b.submarket) {
                        return a.display_name.localeCompare(b.display_name);
                    }
                    return a.submarket.localeCompare(b.submarket);
                }
                return a.market.localeCompare(b.market);
            });

            return sortedTradeTypes;
        } catch (error) {
            console.error('Failed to fetch trade types:', error);
            throw error;
        }
    }

    // Fetch contracts available for a symbol
    async fetchContractsForSymbol(symbol) {
        try {
            const response = await this.send({ contracts_for: symbol });
            const availableContracts = response.contracts_for?.available || [];

            const contracts = availableContracts.map((contract) => ({
                contractType: contract.contract_type,
                minDuration: contract.min_contract_duration,
                maxDuration: contract.max_contract_duration,
                barriers: contract.barrier_category,
            }));

            console.log(`Contracts for Symbol ${symbol}:`, contracts);
            return contracts;
        } catch (error) {
            console.error('Failed to fetch contracts for symbol:', error);
            throw error;
        }
    }

        /*** placing my  order for a symbol
              -validate symbol
              -set leverage if specified
              -Fetch the current market price
              -Calculate TP and SL based on percentage or fixed value
              -Construct the order request
              -Add TP and SL to the request if defined
              -Send the order request to the API
         */
    async placeOrder({ symbol, amount, duration, durationUnit, contractType, tp = null, sl = null }) {
        try {

            const validSymbolsResponse = await this.send({ active_symbols: 'brief' });
            const validSymbols = validSymbolsResponse?.active_symbols?.map(s => s.symbol) || [];

            if (!validSymbols.includes(symbol)) {
                throw new Error(`Invalid symbol: ${symbol}`);
            }


            if (leverage) {
                const leverageResponse =await this.send ({
                    set_leverage:{
                        leverage,
                        symbol
                    }
                });
                console.log(`Leverage set for ${symbol}: ${leverageResponse}`);
            }

            const currentPrice = await this.fetchTicker(symbol);
            console.log(`Current Price: ${currentPrice}`);

            const tpPrice = tp && tp.includes('%')
                ? currentPrice * (1 + parseFloat(tp.replace('%', '')) / 100)
                : tp ? parseFloat(tp) : null;

            const slPrice = sl && sl.includes('%')
                ? currentPrice * (1 - parseFloat(sl.replace('%', '')) / 100)
                : sl ? parseFloat(sl) : null;

            console.log(`Take-Profit Price: ${tpPrice}, Stop-Loss Price: ${slPrice}`);


            const request = {
                buy: 1,
                price: amount,
                parameters: {
                    symbol,
                    currency: 'USD',
                    duration,
                    duration_unit: durationUnit,
                    amount,
                    basis: 'stake',
                    contract_type: contractType,
                },
            };

            if (tpPrice) request.parameters.barrier = tpPrice.toFixed(2);
            if (slPrice) request.parameters.barrier2 = slPrice.toFixed(2);

            console.log('Order Request:', JSON.stringify(request, null, 2));

            const response = await this.send(request);
            console.log('Order Response:', JSON.stringify(response, null, 2));

            return response;
        } catch (error) {
            console.error('Failed to place order:', error);
            throw error;
        }
    }


    // Modify existing order for a symbol
    async modifyOrder({ contractId, tp = null, sl = null }) {
        try {
            // Fetch current details of the contract
            const contractDetails = await this.send({ contract_info: contractId });
            const currentPrice = contractDetails?.current_spot;

            // check if market is open
            const marketStatus = await this.send({contract_info: contractId});
            const isMarketOpen = marketStatus?.active_symbols?.some(symbol => symbol.symbol === contractDetails.symbol && symbol.exchange_is_open);

            if (!isMarketOpen) {
                throw new Error(`Market is closed for symbo ${contractDetails.symbol}. Cannot modify order.`);
            }
            // Calculate new TP and SL based on percentage or fixed value
            const tpPrice = tp && tp.includes('%')
                ? currentPrice * (1 + parseFloat(tp.replace('%', '')) / 100)
                : tp ? parseFloat(tp) : null;

            const slPrice = sl && sl.includes('%')
                ? currentPrice * (1 - parseFloat(sl.replace('%', '')) / 100)
                : sl ? parseFloat(sl) : null;

            console.log(`New Take-Profit Price: ${tpPrice}, New Stop-Loss Price: ${slPrice}`);

            // Construct the modification request
            const request = {
                contract_id: contractId,
                ...(tpPrice && { barrier: tpPrice.toFixed(2) }),
                ...(slPrice && { barrier2: slPrice.toFixed(2) })
            };

            // Send the modification request to the API
            const response = await this.send({ modify_contract: request });
            console.log('Order Modification Response:', JSON.stringify(response, null, 2));

            return response;
        } catch (error) {
            console.error('Failed to modify order:', error);
            throw error;
        }
    }

    // Find a specific order based on criteria
    findOrder(orders, criteria) {
        return orders.find(criteria);
    }

    async closePosition(contractId) {
        try {
            console.log(`Attempting to close position with contract ID: ${contractId}`);

            // Construct the close position request
            const request = { sell: contractId, price: 0 };

            // Send the close position request to the API
            const response = await this.send(request);
            console.log('Position Close Response:', JSON.stringify(response, null, 2));

            return response;
        } catch (error) {
            console.error('Failed to close position:', error);
            throw error;
        }
    }


// Function to cancel a specific order based on contract ID
    async cancelOrder(contractId) {
        try {
            console.log(`Attempting to cancel order with contract ID: ${contractId}`);

            const request = {
                sell: contractId,
            };

            const response = await this.send(request);
            console.log('Order Cancellation Response:', JSON.stringify(response, null, 2));

            return response;
        } catch (error) {
            console.error('Failed to cancel order:', error);
            throw error;
        }
    }


    // pinging....
    keepConnectionAlive() {
        setInterval(() => {
            if (this.ws.readyState === WebSocket.OPEN) {
                this.ws.send(JSON.stringify({ ping: 1 }));
                console.log('pinging....');
            }
        }, 30000);
    }
}

module.exports = DerivExchange;