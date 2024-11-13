const DerivExchange = require('./api');
const Deriv = new DerivExchange();

async function main() {
    try {
        await Deriv.connect();
        await Deriv.authorize();

        // Fetch balance
        const balance = await Deriv.fetchBalance();
        console.log('Balance:', balance);
    } catch (error) {
        console.error('Error in main function:', error);
    }
}

main();