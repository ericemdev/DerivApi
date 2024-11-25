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

    async unsubscribeAllTicks() {
        try {
            const response = await this.send({ forget_all: 'ticks' });
            console.log('Unsubscribed from all tick streams:', response);
            return response;
        } catch (error) {
            console.error('Failed to unsubscribe from tick streams:', error);
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
    async processCommand(command, params) {
        try {
            const [action, symbol] = command.split(" ");
            switch (action.toLowerCase()) {
                case 'buy':
                case '1':
                case 'long':
                    return await this.placeOrder({
                        symbol,
                        amount: params.Q,
                        price: params.P,
                        duration: params.T,
                        durationUnit: 'd',
                        contractType: 'CALL',
                        tp: params.TP,
                        sl: params.SL,
                        leverage: params.L,
                    });
                case 'sell':
                case '-1':
                case 'short':
                    return await this.placeOrder({
                        symbol,
                        amount: params.Q,
                        price: params.P,
                        duration: params.T,
                        durationUnit: 'd',
                        contractType: 'PUT',
                        tp: params.TP,
                        sl: params.SL,
                        leverage: params.L,
                    });
                case 'cancel':
                    return await this.cancelOrder(params.contractId);
                case 'unsubscribe':
                    return await this.unsubscribeAllTicks();
                default:
                    throw new Error(`Unknown command: ${action}`);
            }
        } catch (error) {
            console.error('Failed to process command:', error);
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
        async placeOrder({ symbol, amount, duration, durationUnit, contractType }) {
            try {
                // Request price proposal
                const proposalRequest = {
                    proposal: 1,
                    amount: amount.toString(),
                    basis: 'stake',
                    contract_type: contractType,
                    currency: 'USD',
                    duration: duration.toString(),
                    duration_unit: durationUnit,
                    symbol: symbol,
                };

                console.log('Requesting price with payload:', JSON.stringify(proposalRequest, null, 2));
                const proposalResponse = await this.send(proposalRequest);
                console.log('Price Proposal Response:', JSON.stringify(proposalResponse, null, 2));

                if (!proposalResponse.proposal) {
                    throw new Error(`Failed to get price proposal: ${JSON.stringify(proposalResponse)}`);
                }

                const proposalId = proposalResponse.proposal.id;

                // Buy contract using proposal ID
                const buyRequest = {
                    buy: proposalId,
                    price: amount.toString(),
                };

                console.log('Placing order with payload:', JSON.stringify(buyRequest, null, 2));

                const response = await this.send(buyRequest);
                console.log('Order placed:', JSON.stringify(response, null, 2));

                return response;
            } catch (error) {
                console.error('Failed to place order:', error.message);
                throw error;
            }
        }


    // Modify existing order for a symbol
    async modifyOrder({ contractId, tp = null, sl = null }) {
        try {
            console.log(`Attempting to modify order with contract ID: ${contractId}`);

            // Fetch current details of the contract
            const contractDetails = await this.send({ contract_info: contractId });
            console.log('Fetched contract details:', contractDetails);
            const currentPrice = contractDetails?.current_spot;

            // Check if the market is open
            const marketStatus = await this.send({ active_symbols: 'brief' });
            const isMarketOpen = marketStatus?.active_symbols?.some(symbol => symbol.symbol === contractDetails.symbol && symbol.exchange_is_open);
            console.log(`Market status for ${contractDetails.symbol}: ${isMarketOpen ? 'Open' : 'Closed'}`);

            if (!isMarketOpen) {
                throw new Error(`Market for symbol ${contractDetails.symbol} is currently closed.`);
            }

            const tpPrice = tp && tp.includes('%')
                ? currentPrice * (1 + parseFloat(tp.replace('%', '')) / 100)
                : tp ? parseFloat(tp) : null;

            const slPrice = sl && sl.includes('%')
                ? currentPrice * (1 - parseFloat(sl.replace('%', '')) / 100)
                : sl ? parseFloat(sl) : null;

            console.log(`New Take-Profit Price: ${tpPrice}, New Stop-Loss Price: ${slPrice}`);

            const request = {
                contract_id: contractId,
                ...(tpPrice && { barrier: tpPrice.toFixed(2) }),
                ...(slPrice && { barrier2: slPrice.toFixed(2) })
            };

            console.log('Modification request:', JSON.stringify(request, null, 2));

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

            const request = { sell: contractId, price: 0 };
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