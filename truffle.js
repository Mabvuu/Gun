// truffle-config.js
require('dotenv').config({ path: './backend/.env' });
const path = require('path');
const HDWalletProvider = require('@truffle/hdwallet-provider');

module.exports = {
  contracts_build_directory: path.join(__dirname, 'contracts', 'artifacts'),

  networks: {
    development: {
      host: '127.0.0.1',
      port: 8545,
      network_id: '*'
    },
    deploy: {
      provider: () => new HDWalletProvider({
        privateKeys: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
        providerOrUrl: process.env.RPC_URL
      }),
      network_id: '*',
      gas: 6000000,
      skipDryRun: true
    }
  },

  compilers: {
    solc: {
      version: '0.8.20'
    }
  }
};
