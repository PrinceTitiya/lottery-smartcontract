const { developmentChains, networkConfig } = require("../../helper-hardhat-config");
const { getNamedAccounts, deployments, ethers } = require("hardhat");
const { assert, expect } = require("chai");

!developmentChains.includes(network.name) ? describe.skip :
describe("Raffle Unit Tests", async function () { 
    let raffle, vrfCoordinatorV2Mock, raffleEntranceFee, deployer,interval
    const chainId = network.config.chainId

    beforeEach(async function () {
        const { get } = deployments
        // const { deployer } = await getNamedAccounts()
        deployer = (await getNamedAccounts()).deployer
        const accounts = await ethers.getSigners()
        const deployerSigner = accounts[0]
        await deployments.fixture(["all"])
        const raffleDeployment = await get("Raffle")
        raffle = await ethers.getContractAt("Raffle", raffleDeployment.address, deployerSigner)

        const vrfDeployment = await get("VRFCoordinatorV2Mock")
        vrfCoordinatorV2Mock = await ethers.getContractAt(
            "VRFCoordinatorV2Mock",
            vrfDeployment.address,
            deployerSigner
        )
        raffleEntranceFee = await raffle.getEntranceFee()
        interval = await raffle.getInterval()
})

    describe("constructor", async function(){
        it("initalizes the raffle correctly!", async function(){
            //Ideally we make our tests have just "one" assertion per "it" block
            const raffleState = await raffle.getRaffleState()
            assert.equal(raffleState.toString(), "0") // 0 means OPEN
            assert.equal(interval.toString(),networkConfig[chainId]["interval"] ) // 30 seconds
        })
    })

    describe("enterRaffle", async function(){
        it("reverts when you dont pay enough", async function(){
            await expect(raffle.enterRaffle()).to.be.revertedWith("Raffle__NotEnoughETHEntered")
        })
        it("records players when they enter", async function(){
            await raffle.enterRaffle({ value: raffleEntranceFee })
            const playerFromContract = await raffle.getPlayers(0)
            assert.equal(playerFromContract, deployer)
        })
        it("emits event on enter", async function(){
            await expect(raffle.enterRaffle({ value: raffleEntranceFee }))
                .to.emit(raffle, "RaffleEnter")
        })
    })
    it("does not allow entrance when raffle is calculating", async function(){
        await raffle.enterRaffle({ value: raffleEntranceFee})
        // We pretend to be a Chainlink Keeper and call performUpkeep
        await network.provider.send("evm_increaseTime", [interval.toNumber() + 1])
        await network.provider.send("evm_mine", [])
        // Pretend to be a Chainlink Keeper and call performUpkeep
        await raffle.performUpkeep([])
        await expect(raffle.enterRaffle({ value: raffleEntranceFee })).to.be.revertedWith(
            "Raffle__NotOpen"
        )
    })

    describe("checkUpkeep", function(){
        it("returns false if people haven't sent any ETH", async function(){
            await network.provider.send("evm_increaseTime", [interval.toNumber() + 1])
            await network.provider.send("evm_mine", [])
            const { upkeepNeeded } = await raffle.callStatic.checkUpkeep([])
            assert(!upkeepNeeded)
        })
    })

    it("returns false if raffle is not open", async function(){
        await raffle.enterRaffle({value: raffleEntranceFee})
        await network.provider.send("evm_increaseTime", [interval.toNumber() + 1])
        await network.provider.send("evm_mine", [])
        await raffle.performUpkeep([])
        const raffleState = await raffle.getRaffleState()
        const { upkeepNeeded } = await raffle.callStatic.checkUpkeep([])
        assert.equal(raffleState.toString(), "1") // 1 means CALCULATING
        assert(!upkeepNeeded)
    })
    
    it("returns false if enough time hasn't passed", async function(){
        await raffle.enterRaffle({value: raffleEntranceFee})
        await network.provider.send("evm_increaseTime", [1])
        await network.provider.send("evm_mine", [])
        const { upkeepNeeded } = await raffle.callStatic.checkUpkeep([])
        assert(!upkeepNeeded)
    })

    it("returns true if enough time has passed, has players, eth, and is open", async function(){
        await raffle.enterRaffle({value: raffleEntranceFee})
        await network.provider.send("evm_increaseTime", [interval.toNumber() + 1])
        await network.provider.send("evm_mine", [])
        const { upkeepNeeded } = await raffle.callStatic.checkUpkeep([])
        assert(upkeepNeeded)
    })

    describe("performUpkeep", function(){
        it("It can only run if checkUpkeep is true", async function(){
            await raffle.enterRaffle({value: raffleEntranceFee})
            await network.provider.send("evm_increaseTime",[interval.toNumber() + 1])
            await network.provider.send("evm_mine", [])
            const tx = await raffle.performUpkeep([])
            assert(tx)
        })
        it("reverts when checkUpkeep is false", async function(){
            await expect(raffle.performUpkeep([])).to.be.revertedWith(
                "Raffle__UpKeepNotNeeded"
            )
        })
        it("updates the raffle state, emits an event and calls the vrf coordinator", async function(){
            await raffle.enterRaffle({value: raffleEntranceFee})
            await network.provider.send("evm_increaseTime", [interval.toNumber() + 1])
            await network.provider.send("evm_mine", [])
            const txResponse = await raffle.performUpkeep([])
            const txReceipt = await txResponse.wait(1)
            const requestId = txReceipt.events[1].args.requestId
            const raffleState = await raffle.getRaffleState()
            assert(requestId.toNumber() > 0)
            assert(raffleState.toString() == "1") 
        })
    })
    describe("fulfillRandomWords",function(){
        beforeEach(async function(){
            await raffle.enterRaffle({value: raffleEntranceFee})
            await network.provider.send("evm_increaseTime", [interval.toNumber() + 1])
            await network.provider.send("evm_mine", [])
        })
        it("can only be called after performUpkeep", async function(){              //fulfilRandomWords is called only when there's requestId
            await expect (vrfCoordinatorV2Mock.fulfillRandomWords(0, raffle.address)).to.be.revertedWith(   //needs (requestId, consumerAddress)
                "nonexistent request"               //In VRFCoordinatorV2Mock, the fulfillRandomWords function checks if the requestId exists, if not it reverts with "nonexistent request"
            )
             await expect (vrfCoordinatorV2Mock.fulfillRandomWords(1, raffle.address)).to.be.revertedWith(
                "nonexistent request"
            )
        })

        it("picks a winner, resets the lottery and sends money to the winner", async function(){
            const additionalEntrants = 3
            const startingAccountIndex = 1 // deployer = 0 
            const accounts = await ethers.getSigners()
            for (let i = startingAccountIndex; i<startingAccountIndex + additionalEntrants; i++){
                const accountConnectedRaffle = await raffle.connect(accounts[i])
                await accountConnectedRaffle.enterRaffle({value: raffleEntranceFee})
            }
            //keeping track of the starting time
            const startingTimeStamp = await raffle.getLatestTimeStamp()
            //performUpkeep (mock being Chainlink Keepers)
            //fulfillRandomWords (mock being Chainlink VRF)
            // We will have to wait for the fulfillRandomWords to be called
            await new Promise( async (resolve, reject) => {
                raffle.once("WinnerPicked", async () => {
                    console.log("Found the event!!!!")
                    try{
                        const recentWinner = await raffle.getRecentWinner()
                        console.log("winner is.........!!!! :",recentWinner)
                        console.log(accounts[2].address)
                        console.log(accounts[0].address)
                        console.log(accounts[1].address)
                        console.log(accounts[3].address)

                        const raffleState = await raffle.getRaffleState()
                        const endingTimeStamp = await raffle.getLatestTimeStamp()
                        const numPlayers = await raffle.getNumberOfPlayers()
                        assert.equal(numPlayers.toString(),"0")
                        assert.equal(raffleState.toString(),"0")
                        assert(endingTimeStamp > startingTimeStamp) 

                    } catch (e) {
                        reject (e)
                    }
                    resolve()
                })
                // Setting up the listener

                //below, we will fire the event, and the listener will pick it up, and resolve
                const tx = await raffle.performUpkeep([])
                const txReceipt = await tx.wait(1)
                const winnerStartingBalance = await accounts[1].getBalance() //winner is accounts[1] because we entered 3 additional players, so the winner will be the 2nd player
                await vrfCoordinatorV2Mock.fulfillRandomWords(txReceipt.events[1].args.requestId, raffle.address)
            })
        })
    })
})

