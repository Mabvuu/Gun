// /backend/blockchain/contractClient.js
const { JsonRpcProvider, Wallet, Contract } = require('ethers');
const path = require('path');
const artifact = require('../../contracts/artifacts/FirearmToken.json');

const provider = new JsonRpcProvider(process.env.RPC_URL);
const wallet = new Wallet(process.env.PRIVATE_KEY, provider);
const contractAddress = process.env.CONTRACT_ADDRESS;
const contract = new Contract(contractAddress, artifact.abi, wallet);

async function mint(serialHashHex, metadataUri) {
  const tx = await contract.mint(serialHashHex, metadataUri);
  const receipt = await tx.wait();
  const transferEvt = receipt.events.find(e => e.event === 'Transfer');
  const tokenId = transferEvt.args[2].toString();
  return { txHash: receipt.transactionHash, tokenId };
}

async function transfer(tokenId, toAddress) {
  const tx = await contract['safeTransferFrom(address,address,uint256)'](wallet.address, toAddress, tokenId);
  const receipt = await tx.wait();
  return receipt.transactionHash;
}

module.exports = { mint, transfer };
