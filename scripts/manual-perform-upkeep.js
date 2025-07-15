const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log(`Using account: ${deployer.address}`);
  

  const raffleAddress = "0xB7813A44093bfd7697D7496043E8D6CBD2E70643"; // 👈 put your deployed Raffle address here
  const raffle = await ethers.getContractAt("Raffle", raffleAddress, deployer);
 

  const [upkeepNeeded] = await raffle.checkUpkeep("0x");
  console.log("✅ upkeepNeeded:", upkeepNeeded);

  if (upkeepNeeded) {
    console.log("🚀 Calling performUpkeep...");
     const tx = await raffle.performUpkeep("0x", { gasLimit: 500_000 });
    console.log(`TX hash: ${tx.hash}`);
    await tx.wait();
    console.log("🎉 performUpkeep executed!");
  } else {
    console.log("⚠️ Upkeep not needed right now.");
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
