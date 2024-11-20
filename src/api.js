const WebSocket = require('ws');
const { APP_ID, API_TOKEN } = require('../config');


// class Deriv Exchange creates a new instance of the WebSocket class
// the constructor method is called when a new instance of the class is created
// authorize method sends an authorization message to the server with the API token as the value of the authorization key
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

                // Listen for response
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


    // fetchTicker  sends a request to the server to fetch the latest price for a given symbol
    async fetchTicker(symbol) {
        try {
            const response = await this.send({ ticks: symbol });
            return response; 
        } catch (error) {
            console.error(`Error fetching ticker for ${symbol}:`, error);
            throw error;
        }
    }

    // place order
    async placeOrder(symbol, amount, duration, durationUnit, contractType) {
        console.log('Placing order...');
        try {
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
                    contract_type: contractType
                }
            };

            const response = await this.send(request);
            console.log('Order response:', response);
            return response;
        } catch (error) {
            console.error('Failed to place order:', error);
            throw error;
        }
    }
}

module.exports = DerivExchange;