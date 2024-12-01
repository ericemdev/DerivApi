
# Deriv API Project

## Getting Started

### Prerequisites

Before you start, ensure you have the following installed:

- **Node.js**
- **Node Package Manager (npm)**
- **Deriv API credentials** (`APP_ID` and `API_TOKEN`) link [here](https://api.deriv.com/dashboard/)

---

## Features

- Connect to the **Deriv WebSocket**
- Authorize using **API token**
- Fetch **account balance**
- Place **buy** and **sell** orders
- Modify orders to set **Take Profit (TP)** and **Stop Loss (SL)**
- Close **open positions**
- Cancel **all open orders**
- Fetch **active symbols**
- Display **account balance** and **available symbols**

---

## Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/ericemdev/DerivAPI.git
2. **Navigate to the project directory**:
   ```bash
   cd DerivAPI
3. **Install the dependencies**:
   ```bash
    npm install
4. **Create a `.env` file**:
5. **Add your `APP_ID` and `API_TOKEN`**:
   ```env
   APP_ID=your_app_id
   API_TOKEN=your_api_token
6. **Start the server**:
   ```bash
    npm start
   
## Usage
### Commands
place a buy order
```bash
node src/index.js long SYMBOL Q=quantity T=type E=expiry A=account
```
- `SYMBOL`: The symbol to trade(e.g. `frxEURUSD,R_100,OTC_SPC`).
- `Quantity`: The quantity to trade(e.g. default `1`).
- `Type`: The type of order(e.g. `Binary or Digital`).
- `Expiry`: The expiry time for the order(e.g. default `1m`).
- `Account`: The account to trade on(e.g. default `real`).
- `Example`: 
    ```bash
    node src/index.js long frxEURUSD Q=1 T=Binary E=1m A=real
    ```
place a sell order
```bash
node src/index.js short SYMBOL Q=quantity T=type E=expiry A=account
```
- `SYMBOL`: The symbol to trade(e.g. `frxEURUSD,R_100,OTC_SPC`).
- `Quantity`: The quantity to trade(e.g. default `1`).
- `Type`: The type of order(e.g. `Binary or Digital`).
- `Expiry`: The expiry time for the order(e.g. default `1m`).
- `Account`: The account to trade on(e.g. default `real`).
- `Example`: 
    ```bash
    node src/index.js short frxEURUSD Q=1 T=Binary E=1m A=real
    ```
  view account balance
- `Example`: 
    ```bash
    node src/index.js balance A=real
    ```
  view available symbols
- `Example`: 
    ```bash
    node src/index.js symbols T=type
    node src/index.js symbols T=binary
    ```
  close an open position
- `Example`: 
    ```bash
    node src/index.js close ID=position_id
    ```
  cancel an order
- `Example`: 
    ```bash
    node src/index.js cancel symbol=order_symbol
    ```
  modify an open order
- `Example`: 
    ```bash
    node src/index.js modify ID=order_id TP=take_profit SL=stop_loss
    ```
  fetch active symbols
- `Example`: 
    ```bash
    node src/index.js symbols
    ```
## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
```

author: Developed with ❤️ and valour by Ericem
```