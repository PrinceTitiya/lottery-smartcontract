/*
1) Enter the lottery (paying some amount)
2) pick a random winner(verifyably random)(VRF) -> Chainlink VRF)  
3) Winner to be selected every X minutes -> completely automated
using..........
Chainlink Oracle -> Randomness and Automated Execution(smart contract can't be executed automatically, 
need someone to trigger it automatically(Chainlink keepers)*/


//SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import  "@chainlink/contracts/src/v0.8/vrf/VRFConsumerBaseV2.sol";
import "@chainlink/contracts/src/v0.8/vrf/interfaces/VRFCoordinatorV2Interface.sol";
//import "@chainlink/contracts/src/v0.8/automation/KeeperCompatible.sol";
import "@chainlink/contracts/src/v0.8/automation/interfaces/AutomationCompatibleInterface.sol";

//Error Codes
error Raffle__NotEnoughETHEntered();
error Raffle__TransferFailed();
error Raffle__NotOpen();
error Raffle__UpKeepNotNeeded(uint256 currentBalance, uint256 numPlayers, uint256 raffleState);

/**
 * @title A sample Raffle contract
 * @author Prince 
 * @notice This contract is for creating a simple lottery system, untamparable and decentralized
 * @dev This implements Chainlink VRF v2 and Chainlink Keepers(Automation) to select a random winner
 */

contract Raffle is VRFConsumerBaseV2, AutomationCompatibleInterface{

    /* Type Declarations */
    enum RaffleState{
        OPEN,
        CALCULATING
     } //uin256 0 = OPEN, 1 = CALCULATING

    /* State Variables */
    uint256 immutable i_entranceFee; // in wei
    address payable[] private s_players; // array of players
    VRFCoordinatorV2Interface private immutable i_vrfCoordinator; // Chainlink VRF Coordinator
    bytes32 private immutable i_gasLane; // gasLane keyHash, which is the ID of the VRF keypair
    uint64 private immutable i_subscriptionId; // need for funding our request
    uint16 private constant REQUEST_CONFIRMATIONS = 3; // how many confirmations the Chainlink node should wait before responding
    uint32 private immutable i_callbackGasLimit; // how much gas we are willing to pay for the callback
    uint32 private constant NUM_WORDS = 1; // number of random words to request


    //lottery variable
    address private s_recentWinner; // address of the most recent winner
    //bool private s_isOpen; ---- //to check if the lottery is open or not
    //uint256 private s_lotteryState; // to check the state of the lottery(OPEN,CLOSE,PENDING,CALCULATING etc)   (enum is way to track this(easy))
    RaffleState private s_raffleState; 
    uint256 private s_lastTimeStamp; // to track the last time the lottery was executed
    uint256 private immutable i_interval; // time interval for the lottery to be executed


    /*Events */
    event RaffleEnter(address indexed player);
    event RequestedRaffleWinner(uint256 indexed requestId);
    event WinnerPicked(address indexed winner);


    constructor(
    address vrfCoordinatorV2,    //contract address of the VRF Coordinator
    uint256 entranceFee,        // entrance fee in wei
    bytes32 gasLane,           
    uint64 subscriptionId,      // subscription ID for funding our request
    uint32 callBackGasLimit,    // how much gas we are willing to pay for the callback
    uint256 interval)           // time interval for the lottery to be executed
     VRFConsumerBaseV2(vrfCoordinatorV2)
    {
        i_entranceFee = entranceFee;
        i_vrfCoordinator = VRFCoordinatorV2Interface(vrfCoordinatorV2);
        i_gasLane = gasLane;
        i_subscriptionId = subscriptionId;
        i_callbackGasLimit = callBackGasLimit;
        s_raffleState = RaffleState.OPEN; // initial state of the raffle
        s_lastTimeStamp = block.timestamp;  // set the last time stamp to the current block timestamp
        i_interval = interval; // set the interval for the raffle to be executed
    }


    function enterRaffle() public payable{
        if(msg.value <i_entranceFee){
            revert Raffle__NotEnoughETHEntered();
        }
        if (s_raffleState != RaffleState.OPEN){
            revert Raffle__NotOpen();
            }
        s_players.push(payable(msg.sender));
        emit RaffleEnter(msg.sender);
    }

    function getEntranceFee() public view returns(uint256){
        return i_entranceFee;
    }
    

    /** 
    * @dev This is the function that the Chainlink Keeper nodes call to see if the lottery needs to be executed and
    * look for the "upkeepNeeded" to return true, and if it is, they call the performUpkeep function.
    * The following should be true in order for the upkeepNeeded "TRUE"
    * 1. Our time interval should have passed
    * 2. The lottery should have at least 1 player and have some ETH
    * 3. Subscription is funded with LINK
    * 4. The lottery should be in an "open" state.
    */

   function checkUpkeep(bytes memory /*checkData*/) public  view override returns(bool upkeepNeeded, bytes memory /*performData*/){
        bool isOpen = (s_raffleState == RaffleState.OPEN); // check if the raffle is open
        bool timePassed = ((block.timestamp - s_lastTimeStamp) > i_interval); // check if the time interval has passed
        bool hasPlayers = (s_players.length > 0); // check if there are players in the raffle
        bool hasBalance = (address(this).balance > 0); // check if the contract has a balance
        upkeepNeeded = (isOpen && timePassed && hasPlayers && hasBalance); // return true if all conditions are met
    }

    //Request the Random Number
    //Use or do something with the random number -- 2 transactions

    function performUpkeep(bytes calldata /*performData*/) external override{
        (bool upKeepNeeded,) = checkUpkeep(""); // check if upkeep is needed
        if(!upKeepNeeded){
            revert Raffle__UpKeepNotNeeded(address(this).balance, s_players.length, uint256(s_raffleState));
        }
        s_raffleState = RaffleState.CALCULATING; // set the state to CALCULATING
        uint256 requestId = i_vrfCoordinator.requestRandomWords(                
            i_gasLane,              //gasLane keyHash, which is the ID of the VRF keypair
            i_subscriptionId,       //need for funding our request
            REQUEST_CONFIRMATIONS,  //how many confirmations the Chainlink node should wait before responding
            i_callbackGasLimit, //how much gas we are willing to pay for the callback
            NUM_WORDS   //number of random words to request
        );
        emit RequestedRaffleWinner(requestId);
    }

    function fulfillRandomWords(uint256,/*requestId*/ uint256[] memory randomWords) internal override{
        //Pick a random winner
        //Transfer the prize to the winner
        //Reset the lottery for the next round
        uint256 indexOfWinner = randomWords[0] % s_players.length; // get a random index
        address payable recentWinner = s_players[indexOfWinner]; // get the winner's address
        s_recentWinner = recentWinner; // set the recent winner
        s_raffleState = RaffleState.OPEN; // set the state back to OPEN
        s_players = new address payable[](0); // reset the players array for the next round
        s_lastTimeStamp = block.timestamp; // reset the last time stamp to the current block timestamp

        (bool success,) = recentWinner.call{value: address(this).balance}(""); // transfer the prize to the winner
        //require(success, "Transfer failed"); // check if the transfer was successful
        if(!success){
            revert Raffle__TransferFailed();
        }
        emit WinnerPicked(recentWinner); // emit the winner picked event
    }

    /* view /pure functions*/

    function getPlayers(uint256 index) public view returns(address){
        return s_players[index];
    }

    function getRecentWinner() public view returns(address){
        return s_recentWinner;
    }
    function getNumWords() public pure returns(uint256){
        return NUM_WORDS;
    }

    function getInterval() public view returns(uint256){
        return i_interval;
    }

    function getLatestTimeStamp() public view returns(uint256){
        return s_lastTimeStamp;
    }

    function getRaffleState() public view returns(RaffleState){
        return s_raffleState;
    }

    function getNumberOfPlayers() public view returns (uint256) {
        return s_players.length; // or `players.length` depending on your variable name
    }
}