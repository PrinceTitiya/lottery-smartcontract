# Smart Contract Lottery (Raffle)

This project implements a **decentralized lottery** using Solidity, Chainlink Keepers, Chainlink VRF, and Hardhat.  
It demonstrates key blockchain engineering skills: smart contract design, automation, randomness, and mainnet deployment.

---

## Overview

The **Smart Contract Lottery** allows players to enter a raffle by paying an ETH entrance fee.  
After an interval, a random winner is picked using Chainlink VRF (Verifiable Random Function) and Chainlink Keepers automate the upkeep checks and winner selection.

---

## Tech Stack

- **Solidity** — Smart contract logic (OpenZeppelin, VRF Consumer)
- **Hardhat** — Development, testing, and deployment framework
- **Chainlink VRF v2** — Secure randomness for picking winners
- **Chainlink Keepers** — Automates periodic upkeep checks
- **Ethers.js** — Script interactions & manual testing
- **JavaScript** — Tests & deployment scripts
- **Sepolia Testnet** — Deployed on an EVM test network

---

##  Deployment & Automation

**Key Features:**
- Players enter by sending ETH
- Contract checks if upkeep is needed (interval passed, players exist)
- Chainlink Keepers trigger `performUpkeep` automatically
- Chainlink VRF returns a provably random number to pick the winner
- Winner is paid the total balance automatically

---


---

## Skills Demonstrated

- 🔒 Writing secure smart contracts
- 🔗 Integrating with Chainlink VRF & Keepers
- 🧪 Unit & staging testing with Hardhat & Chai
- 📡 Interacting with testnets & verifying contracts on Etherscan
- ⚡ Automation with decentralized oracles
- 🗃️ Git & GitHub best practices for Web3 projects

---

##  How to Run Locally

1. **Install Dependencies**
   ```bash
   yarn install
   yarn hardhat compile
   yarn hardhat test
   yarn hardhat deploy --network sepolia
   
This project is for learning & demonstration.
Feel free to fork & extend!

