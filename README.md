# My Deriv Project

## Description
This project is designed to interact with the Deriv API to perform various trading operations such as fetching balances, placing orders, modifying orders, closing positions, and canceling orders.

## Project Structure
my-deriv-project/
├── src/
│   ├── api.js          # Contains the DerivExchange class and all API interactions
│   ├── index.js        # Entry point of the project, orchestrates operations
├── config.js           # Configuration file for loading API keys from .env
├── .env                # Environment variables for sensitive data
├── package.json        # Project dependencies and scripts
├── README.md           # Project documentation


## Getting Started
 
 #Prerequisites
    *Node Js installed in your machine
    *Node Package Manager (*npm)
    *Deriv API credentials (APP_ID and API_TOKEN)


## Features

* Connect to the Deriv WebSocket
* Authorize with API token
* Fetch account balance
* Place buy and sell orders
* Modify orders to set Take Profit (TP) and Stop Loss (SL)
* Close open positions
* Cancel all open orders

## Installation

 1.git clone https://github.com/ericemdev/DerivAPI.git

 ''' 
 2.Install depedancies 

    npm install

 3. Set Up Environment Variables    

        APP_ID = 'your Deriv app Id'
        API_TOKEN = 'your Deriv Api token'

 4. npm start 


 created with ❤️ by  and Valour by ericem #   D e r i v A p i  
 