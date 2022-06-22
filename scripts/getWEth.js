const {getNamedAccounts, ethers} = require("hardhat")

const AMOUNT = ethers.utils.parseEther("0.02")

async function getWEth() {
    const {deployer} = await getNamedAccounts()  
    // call the deposit function on the WETH contract
    //abi and contract address
    //0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2

    const iWeth = await ethers.getContractAt("IWeth", "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2", deployer)
    const tx = await iWeth.deposit({value: AMOUNT})
    await tx.wait(1)
    const WethBalance = await iWeth.balanceOf(deployer)
    console.log(`got ${WethBalance.toString()} WETH`)
}
module.exports = {
    getWEth,
    AMOUNT
}