
## Getting Started

### Prerequisites
- **Node.js** installed on your machine
- **Node Package Manager (npm)**
- **Deriv API credentials** (APP_ID and API_TOKEN)

## Features

- Connect to the Deriv WebSocket
- Authorize with API token
- Fetch account balance
- Place buy and sell orders
- Modify orders to set Take Profit (TP) and Stop Loss (SL)
- Close open positions
- Cancel all open orders

## Installation

1. Clone the repository:

    ```bash
    git clone https://github.com/ericemdev/DerivAPI.git
    ```

2. Install dependencies:

    ```bash
    npm install
    ```

3. Set up environment variables in the `.env` file:

    ```env
    APP_ID = 'your Deriv app ID'
    API_TOKEN = 'your Deriv API token'
    ```

4. Start the application:

    ```bash
    npm start
    ```

Created with ❤️ by Ericem.
