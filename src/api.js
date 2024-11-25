const WebSocket = require('ws');
const { APP_ID, API_TOKEN } = require('../config');

class DerivExchange {
    constructor() {
        this.ws = new WebSocket(`wss://ws.binaryws.com/websockets/v3?app_id=${APP_ID}`);
    }

    connect() {
        console.log('Connecting to Deriv WebSocket...💥');
        return new Promise((resolve, reject) => {
            this.ws.on('open', () => {
                console.log('Connected to Deriv WebSocket');
                resolve();
            });

            this.ws.on('error', (error) => {
                console.error('WebSocket error:', error);
                reject(error);
            });

            this.ws.on('close', (code, reason) => {
                console.log(`WebSocket closed. Code: ${code}, Reason: ${reason}`);
            });
        });
    }

    authorize() {
        console.log('Authorizing...');
        return new Promise((resolve, reject) => {
            this.ws.send(JSON.stringify({ authorize: API_TOKEN }), (error) => {
                if (error) return reject(error);
                this.ws.once('message', (data) => {
                    const response = JSON.parse(data);
                    response.error ? reject(response.error) : resolve(response);
                });
            });
        });
    }

    send(request) {
        console.log('Sending request...');
        return new Promise((resolve, reject) => {
            this.ws.send(JSON.stringify(request), (error) => {
                if (error) return reject(error);
                this.ws.once('message', (data) => {
                    const response = JSON.parse(data);
                    response.error ? reject(response.error) : resolve(response);
                });
            });
        });
    }

    async fetchBalance() {
        return await this.send({ balance: 1 });
    }

    async fetchPortfolio() {
        const response = await this.send({ portfolio: 1 });
        return response.portfolio?.contracts || [];
    }

    async fetchTradeTypesFromSymbols() {
        const response = await this.send({ active_symbols: 'brief' });
        const symbols = response.active_symbols;

        return symbols.map((symbol) => ({
            market: symbol.market,
            submarket: symbol.submarket,
            symbol: symbol.symbol,
            display_name: symbol.display_name,
        })).sort((a, b) => a.display_name.localeCompare(b.display_name));
    }

    async fetchContractsForSymbol(symbol) {
        const response = await this.send({ contracts_for: symbol });
        return response.contracts_for?.available.map((contract) => ({
            contractType: contract.contract_type,
            minDuration: contract.min_contract_duration,
            maxDuration: contract.max_contract_duration,
            barriers: contract.barrier_category,
        })) || [];
    }

    async placeOrder({ symbol, amount, duration, durationUnit, contractType }) {
        const proposal = await this.send({
            proposal: 1,
            amount: amount.toString(),
            basis: 'stake',
            contract_type: contractType,
            currency: 'USD',
            duration: duration.toString(),
            duration_unit: durationUnit,
            symbol,
        });

        const buyRequest = {
            buy: proposal.proposal.id,
            price: amount.toString(),
        };

        return await this.send(buyRequest);
    }

    async sellContract(contractId, price) {
        const sellRequest = {
            sell: contractId,
            price: price,
        };

        try {
            const sellResponse = await this.send(sellRequest);
            console.log('Sell response:', sellResponse);
            return sellResponse;
        } catch (error) {
            console.error('Error selling contract:', error.message);
            throw error;
        }
    }

    createContractUpdateRequest(contractId, tp = null, sl = null) {
        const request = {
            contract_update: 1,
            contract_id: contractId,
        };

        if (tp || sl) {
            request.limit_order = {};
            if (tp) request.limit_order.take_profit = parseFloat(tp);
            if (sl) request.limit_order.stop_loss = parseFloat(sl);
        }

        return request;
    }


    async modifyOrder(contractId, tp = null, sl = null) {
        try {
            console.log(`Attempting to modify order for contract ID: ${contractId}`);
            const modifyRequest = this.createContractUpdateRequest(contractId, tp, sl);
            console.log('Generated request:', modifyRequest);
            const response = await this.send(modifyRequest);
            console.log('Order Modification Response:', response);
            return response;
        } catch (error) {
            console.error('Failed to modify order:', error.message);
            throw error;
        }
    }


    async unsubscribeAllTicks() {
        return await this.send({ forget_all: 'ticks' });
    }


    keepConnectionAlive() {
        setInterval(() => {
            if (this.ws.readyState === WebSocket.OPEN) {
                this.ws.send(JSON.stringify({ ping: 1 }));
                console.log('Pinging...🏓');
            } else {
                console.log('WebSocket is not open. Cannot send ping. ❌');
            }
        }, 30000);
    }
}

module.exports = DerivExchange;
