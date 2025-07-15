const { ethers } = require("ethers")

const networkConfig = {
    11155111: {
        name: "sepolia",
        vrfCoordinatorV2: "0x9DdfaCa8183c41ad55329BdeeD9F6A8d53168B1B",
        entranceFee: ethers.utils.parseEther("0.01"), // 0.01 ETH
        gasLane: "0x787d74caea10b2b357790d5b5247c2f63d1d91572a9846f780606e4d953677ae", //750wei keyhash   //VRF v2.5
        //0x787d74caea10b2b357790d5b5247c2f63d1d91572a9846f780606e4d953677ae
        subscriptionId  : "384719",

        callbackGasLimit: 500000, // 500,000 gas
        interval: "30", // 30 seconds
    },
    31337: {
        name: "hardhat",
        entranceFee: ethers.utils.parseEther("0.01"), // 0.01 ETH
        gasLane: "0x787d74caea10b2b357790d5b5247c2f63d1d91572a9846f780606e4d953677ae", //mocks does not need a keyhash actually
        callbackGasLimit: 500000, // 500,000 gas
        interval: "30", // 30 seconds
    }
}

const developmentChains = ["hardhat", "localhost"]

module.exports = {
    networkConfig,
    developmentChains,
}