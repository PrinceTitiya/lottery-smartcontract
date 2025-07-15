const { developmentChains, networkConfig } = require("../../../helper-hardhat-config");
const { getNamedAccounts, deployments, ethers } = require("hardhat");
const { assert, expect } = require("chai");

developmentChains.includes(network.name) ? describe.skip :
describe("Raffle Unit Tests", async function () {
    let raffle, raffleEntranceFee, deployer, interval
    const chainId = network.config.chainId

    beforeEach(async function () {
        const { get } = deployments
        deployer = (await getNamedAccounts()).deployer
        const accounts = await ethers.getSigners()
        const deployerSigner = accounts[0]
        const raffleDeployment = await get("Raffle")
        raffle = await ethers.getContractAt("Raffle", raffleDeployment.address, deployerSigner)
        raffleEntranceFee = await raffle.getEntranceFee()

        console.log(`Raffle deployed at: ${raffle.address}`)
        console.log(`Entrance Fee: ${raffleEntranceFee.toString()}`)
    })

    describe("fulfillRandomWords", function () {
        it("works with live Chainlink Keepers & VRF, gets a random winner", async function () {
            const startingTimeStamp = await raffle.getLatestTimeStamp()
            console.log(`Starting Timestamp: ${startingTimeStamp.toString()}`)

            // ⏳ Manual check before entering
            const upkeepCheckBefore = await raffle.checkUpkeep("0x")
            console.log(`CheckUpkeep BEFORE enterRaffle: upkeepNeeded=${upkeepCheckBefore[0]}`)

            // Listen for event
            await new Promise(async (resolve, reject) => {
                raffle.once("WinnerPicked", async () => {
                    console.log("✅ WinnerPicked event fired!")
                    try {
                        const recentWinner = await raffle.getRecentWinner()
                        console.log(`🔍 Recent Winner: ${recentWinner}`)

                        const raffleState = await raffle.getRaffleState()
                        console.log(`Raffle State after picking winner: ${raffleState}`)

                        const endingTimeStamp = await raffle.getLatestTimeStamp()
                        console.log(`Ending Timestamp: ${endingTimeStamp.toString()}`)

                        await expect(raffle.getPlayer(0)).to.be.reverted

                        resolve()
                    } catch (error) {
                        console.error("❌ Error in event handler:", error)
                        reject(error)
                    }
                })

                // 📌 Enter raffle
                console.log(`Entering Raffle with fee: ${raffleEntranceFee.toString()}`)
                const tx = await raffle.enterRaffle({ value: raffleEntranceFee })
                await tx.wait(1)
                console.log("🎉 Raffle entered!")

                // Manually check upkeep after entry
                const upkeepCheckAfter = await raffle.checkUpkeep("0x")
                console.log(`CheckUpkeep AFTER enterRaffle: upkeepNeeded=${upkeepCheckAfter[0]}`)

                console.log("⏳ Now waiting for WinnerPicked...")
                // No resolve here — we resolve only inside the listener
            })
        })
    })
})
