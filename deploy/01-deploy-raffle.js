const { network, ethers } = require("hardhat")
const {
    networkConfig,
    developmentChains,
    VERIFICATION_BLOCK_CONFIRMATIONS,
} = require("../helper-hardhat-config")
const { verify } = require("../utils/verify")

const FUND_AMOUNT = ethers.utils.parseEther("1") // 1 Ether, or 1e18 (10^18) Wei

module.exports = async ({ getNamedAccounts, deployments }) => {
    const { deploy, log, get } = deployments
    const { deployer } = await getNamedAccounts()
    const chainId = network.config.chainId
    let vrfCoordinatorV2Address, subscriptionId, vrfCoordinatorV2Mock

    if (chainId == 31337) {
    const vrfCoordinatorV2Mock = await get("VRFCoordinatorV2Mock")
    vrfCoordinatorV2Address = vrfCoordinatorV2Mock.address

    // attach contract
    const vrfCoordinatorV2 = await ethers.getContractAt(
        "VRFCoordinatorV2Mock",
        vrfCoordinatorV2Address
    )

    const tx = await vrfCoordinatorV2.createSubscription()
    const txReceipt = await tx.wait(1)
    subscriptionId = txReceipt.events[0].args.subId

    await vrfCoordinatorV2.fundSubscription(subscriptionId, FUND_AMOUNT)
    } else {
        vrfCoordinatorV2Address = networkConfig[chainId]["vrfCoordinatorV2"]
        subscriptionId = networkConfig[chainId]["subscriptionId"]
    }
    const waitBlockConfirmations = developmentChains.includes(network.name)
        ? 1
        : VERIFICATION_BLOCK_CONFIRMATIONS

    log("----------------------------------------------------")


    const callbackGasLimit = Number(networkConfig[chainId]["callbackGasLimit"])

    // console.log("Deploy arguments:")
    // console.log("vrfCoordinatorV2Address:", vrfCoordinatorV2Address)
    // console.log("subscriptionId:", subscriptionId.toString())
    // console.log("gasLane:", networkConfig[chainId]["gasLane"])
    // console.log("interval:", networkConfig[chainId]["interval"]) // ← matches config key
    // console.log("entranceFee:", networkConfig[chainId]["entranceFee"]) // ← matches config key
    // console.log("callbackGasLimit:", networkConfig[chainId]["callbackGasLimit"])
    // log("----------------------------------------------------")
    // console.log("callbackGasLimit TYPE:", typeof callbackGasLimit)
    // console.log("callbackGasLimit VALUE:", callbackGasLimit)

    const arguments = [
    vrfCoordinatorV2Address,                  // address
    networkConfig[chainId]["entranceFee"],    // uint256
    networkConfig[chainId]["gasLane"],        // bytes32
    subscriptionId,                           // uint64
    callbackGasLimit,                         // uint32
    networkConfig[chainId]["interval"],       // uint256
    ]
    console.log("Deploying Raffle with arguments:", arguments)
    
    const raffle = await deploy("Raffle", {
        from: deployer,
        args: arguments,
        log: true,
        waitConfirmations: waitBlockConfirmations,
    })

    // Ensure the Raffle contract is a valid consumer of the VRFCoordinatorV2Mock contract.
    if (developmentChains.includes(network.name)) {
        const vrfCoordinatorV2MockDeployment = await get("VRFCoordinatorV2Mock")
        const vrfCoordinatorV2Mock = await ethers.getContractAt(
        "VRFCoordinatorV2Mock",
        vrfCoordinatorV2MockDeployment.address
  )
  await vrfCoordinatorV2Mock.addConsumer(subscriptionId, raffle.address)
    }

    // Verify the deployment
    if (!developmentChains.includes(network.name) && process.env.ETHERSCAN_API_KEY) {
        log("Verifying...")
        await verify(raffle.address, arguments)
    }
}

module.exports.tags = ["all", "raffle"]