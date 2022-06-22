const {getWEth, AMOUNT}  = require("./getWEth")
const {getNamedAccounts, ethers} = require("hardhat")

async function main() {
    // aave protocol treats every token as erc20 token, so we need to convert our eth to WETH
    await getWEth()

    const {deployer} = await getNamedAccounts()
    // interact with the aave protocol
    // we need the abi and the address
    const lendingPool = await getLendingPool(deployer)
    console.log(`Lending pool at ${lendingPool.address}`)

    const WETHTokenAddress = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2"
    await approveERC20(WETHTokenAddress, lendingPool.address,AMOUNT, deployer)
    console.log("depositing...")
    await lendingPool.deposit(WETHTokenAddress, AMOUNT, deployer, 0)
    console.log("token deposited ...")

    // BORROW
    const {availableBorrowsETH,totalDebtETH} = await getBorrowUserData(lendingPool, deployer)
    // dai price
    const daiPrice = await getDai()
    // amount you can borrow
    const amountToBorrow = availableBorrowsETH.toString() * 0.95 * (1 / daiPrice.toNumber())
    console.log(`the amount you can borrow is ${amountToBorrow}`)
    const amountDaiToWei = ethers.utils.parseEther(amountToBorrow.toString())
    console.log(`The DAI Amount is ${amountDaiToWei}`)
    const daiTokenAddress = "0x6B175474E89094C44Da98b954EedeAC495271d0F"

    await borrowDAI(daiTokenAddress, lendingPool, amountDaiToWei, deployer)

    await repay(daiTokenAddress,amountDaiToWei,lendingPool, deployer)
    await getBorrowUserData(lendingPool, deployer)
}
// we are only reading from this contract as such we dont need a signer

//GET DAI PRICE USING CHAINLINK PRICE FEED
async function getDai(){
    const daiPriceFeed = await ethers.getContractAt("AggregatorV3Interface", "0x773616E4d11A78F511299002da57A0a94577F1f4")
    // we want to get the answer returned,
    const daiethPrice = (await daiPriceFeed.latestRoundData())[1]
    console.log(`The DAIETH price is ${daiethPrice.toString()}`)
    return daiethPrice
}
// BORROW DAU FUNCTION
async function borrowDAI(daiAddress, lendingPool, amountDaiToWei, account){
    const borrowTx = await lendingPool.borrow(daiAddress, amountDaiToWei,1,0, account)
    await borrowTx.wait(1)

    console.log(`You've borrowed...`)
}
//REPAY FUNCTION
async function repay(daiAddress, amount, lendingPool, account){
   // the repay function in the ILENDINGPOOL INterface returns the following
    // address asset,
    // uint256 amount,
    // uint256 rateMode,
    // address onBehalfOf
    // to repay we need to first approve the contract to withdraw from us
    await approveERC20(daiAddress, lendingPool.address, amount, account )

    const repayTx = await lendingPool.repay(daiAddress, amount, 1, account)

    await repayTx.wait(1)
    console.log("repaid! ....")
}
//GET BORROW USER DATA FUNCTION
async function  getBorrowUserData(lendingPool, account) {
    // console.log(`${JSON.parse(lendingPool)}, ${account}`)
    // const poolLend = await getLendingPool(account)
    const {totalCollateralETH, totalDebtETH, availableBorrowsETH } = await lendingPool.getUserAccountData(account)
    console.log(`You have ${totalCollateralETH} ETH`)
    console.log(`You have ${totalDebtETH} ETH`)
    console.log(`You can borrow ${availableBorrowsETH} ETH`)
    return {availableBorrowsETH,totalDebtETH}
}
// GET LENDING POOL 
async function getLendingPool(account) {
    // lending pool address: 0xB53C1a33016B2DC2fF3653530bfF1848a515c8c5
    const lendingPoolAddressProvider = await ethers.getContractAt("ILendingPoolAddressesProvider", 
    "0xB53C1a33016B2DC2fF3653530bfF1848a515c8c5", account )

    const lendingPoolAddress = await lendingPoolAddressProvider.getLendingPool() //getLendingPool is a function in the Lendingppoladdressprovider contract
    const lendingPool = await ethers.getContractAt("ILendingPool", lendingPoolAddress, account)

    return lendingPool
}
// APPROVE FUNCTION
async function approveERC20(erc20Address,spenderAddress, amountToSpend, account ){
    const erc20Token = await ethers.getContractAt("IERC20",  erc20Address, account)
    const tx = await erc20Token.approve(spenderAddress, amountToSpend)
    tx.wait(1)
    console.log("approved")
}
//DAIETH PRICE FEED ADDRESS
//0x773616E4d11A78F511299002da57A0a94577F1f4
/* ANOTHER WAY TO DEPOSIT */

// async function deposit(assetAddress, depositAmount, senderAddress, refcode) {
//     const tokenDeposit = await ethers.getContractAt("ILendingPool", assetAddress,  senderAddress)
//     const tx = await tokenDeposit.deposit(assetAddress, depositAmount, senderAddress, refcode)
//     await tx.wait(1)
//     console.log("Token deposited")
// }

main().then(() => process.exit(0)).catch((error) => {
    console.error(error)
    process.exit(1)
})