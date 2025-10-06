// migrations/2_deploy_firearm.js
const FirearmToken = artifacts.require('FirearmToken');
const path = require('path');
const fs = require('fs');

module.exports = async function (deployer, network, accounts) {
  // read compiled artifact
  const artifactPath = path.join(__dirname, '..', 'contracts', 'artifacts', 'FirearmToken.json');
  let constructorInputs = [];
  try {
    const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));
    const constructorAbi = (artifact.abi || []).find(x => x.type === 'constructor') || { inputs: [] };
    constructorInputs = constructorAbi.inputs || [];
  } catch (e) {
    // if reading artifact fails, assume no inputs
    constructorInputs = [];
  }

  // prepare defaults for constructor args based on type
  const web3Accounts = accounts && accounts.length ? accounts : (await web3.eth.getAccounts());
  const defaults = constructorInputs.map((inp, idx) => {
    const t = inp.type.toLowerCase();
    if (t.includes('address')) {
      // use first available account
      return web3Accounts[0];
    }
    if (t.includes('string')) {
      // common case: name / symbol -> return sensible defaults
      if (inp.name && inp.name.toLowerCase().includes('name')) return 'FirearmToken';
      if (inp.name && inp.name.toLowerCase().includes('symbol')) return 'GUN';
      // otherwise fallback to empty string
      return '';
    }
    if (t.match(/^(uint|int)/)) return 0;
    if (t === 'bool') return false;
    // fallback
    return null;
  });

  // deploy with or without args
  if (defaults.length === 0) {
    await deployer.deploy(FirearmToken);
  } else {
    await deployer.deploy(FirearmToken, ...defaults);
  }
};
