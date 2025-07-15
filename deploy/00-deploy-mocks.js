const {developmentChains, networkConfig} = require("../helper-hardhat-config");
const { ethers } = require("hardhat");
console.log("Ethers version:", ethers.version);
const BASE_FEE = ethers.utils.parseEther("0.25");    // 0.25 is  the premium, which cost 0.25LINK per request,
const GAS_PRICE_LINK = 1e9;                         // (LINK per gas) ...calculated value based on the gas price of chain(LINK token)

//price of the request changes based on the gas price of the chain

module.exports = async function({
  getNamedAccounts,
  deployments,
}) {
  const { deploy, log } = deployments;
  const { deployer } = await getNamedAccounts();
  const args = [
    BASE_FEE,          // the premium for the VRF Coordinator
    GAS_PRICE_LINK,    // the gas price of LINK token
  ];

  if (developmentChains.includes(network.name)) {
    log("local network detected! Deploying mocks...");
    //deploy a mock VRF Coordinator.....
    await deploy("VRFCoordinatorV2Mock",{
        from: deployer,
        log: true,
        args: args,
    })
    log("You are deploying to a local network, so we are using a mock VRF Coordinator!");
    log("Mocks deployed!");
    log(".......................................................................................................................")
    
  }
}

module.exports.tags = ["all", "mocks"]; 