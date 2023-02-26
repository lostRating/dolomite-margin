# Smart Contracts

## DolomiteMargin

<a href='https://github.com/dolomite-exchange/dolomite-margin' style="text-decoration:none;">
  <img src='https://img.shields.io/badge/GitHub-dolomite--exchange%2Fdolomite--margin-lightgrey' alt='GitHub'/>
</a>

### Deployed Addresses

The contracts are officially deployed to the following networks:

#### Arbitrum Mainnet

##### Core Smart Contracts

| Contract Name                                                                                                                                                                        | Description                                                                                                                                                                                               | Address                                                                                                              |
|--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|----------------------------------------------------------------------------------------------------------------------|
| [`AAVECopyCatAltCoinInterestSetter`](https://github.com/dolomite-exchange/dolomite-margin/blob/master/contracts/external/interestsetters/AAVECopyCatAltCoinInterestSetter.sol)       | Sets interest rates for the alt coins in the system that mimics AAVE's utilization curve                                                                                                                  | [0xc2cBd99bb35b22C43010a8c8266Cdff057f70BB1](https://arbiscan.io/address/0xc2cBd99bb35b22C43010a8c8266Cdff057f70BB1) |
| [`AAVECopyCatStableCoinInterestSetter`](https://github.com/dolomite-exchange/dolomite-margin/blob/master/contracts/external/interestsetters/AAVECopyCatStableCoinInterestSetter.sol) | Sets interest rates for the stable coins in the system that mimics AAVE's utilization curve                                                                                                               | [0xEA4E670fD64aE82af5a3d77b3Db6b5E28A5522de](https://arbiscan.io/address/0xEA4E670fD64aE82af5a3d77b3Db6b5E28A5522de) |
| [`AdminImpl`](https://github.com/dolomite-exchange/dolomite-margin/blob/master/contracts/protocol/impl/AdminImpl.sol)                                                                | DolomiteMargin library containing admin functions                                                                                                                                                         | [0xb04CCB2d3850Bf08eCA8a9FF7dB7d018FA17cfC9](https://arbiscan.io/address/0xb04CCB2d3850Bf08eCA8a9FF7dB7d018FA17cfC9) |
| [`BorrowPositionProxyV1`](https://github.com/dolomite-exchange/dolomite-margin/blob/master/contracts/external/proxies/BorrowPositionProxyV1.sol)                                     | Proxy contract for opening borrow positions. This makes indexing easier and lowers gas costs on Arbitrum by minimizing call data.                                                                         | [0xe43638797513ef7A6d326a95E8647d86d2f5a099](https://arbiscan.io/address/0xe43638797513ef7A6d326a95E8647d86d2f5a099) |
| [`BorrowPositionProxyV2`](https://github.com/dolomite-exchange/dolomite-margin/blob/master/contracts/external/proxies/BorrowPositionProxyV2.sol)                                     | Proxy contract for opening borrow positions. This makes indexing easier and lowers gas costs on Arbitrum by minimizing call data. V2 enables opening borrow positions between wallet owners.              | [0x38E49A617305101216eC6306e3a18065D14Bf3a7](https://arbiscan.io/address/0x38E49A617305101216eC6306e3a18065D14Bf3a7) |
| [`CallImpl`](https://github.com/dolomite-exchange/dolomite-margin/blob/master/contracts/protocol/impl/CallImpl.sol)                                                                  | DolomiteMargin library containing the logic for executing general invocations from DolomiteMargin to an arbitrary address                                                                                 | [0xCdA1826bE8764B7104E66A3b4bF93cdBf2464419](https://arbiscan.io/address/0xCdA1826bE8764B7104E66A3b4bF93cdBf2464419) |
| [`ChainlinkPriceOracleV1`](https://github.com/dolomite-exchange/dolomite-margin/blob/master/contracts/external/oracles/ChainlinkPriceOracleV1.sol)                                   | Price oracle for all assets, utilizing Chainlink                                                                                                                                                          | [0xeA3Fe12d8CC2E87f99e985EE271971C808006531](https://arbiscan.io/address/0xeA3Fe12d8CC2E87f99e985EE271971C808006531) |
| [`DelayedMultiSig`](https://github.com/dolomite-exchange/dolomite-margin/blob/master/contracts/external/amm/DelayedMultiSig.sol)                                                     | Multi-signature wallet that owns the `DolomiteMargin` . On Mainnet all admin changes are time-gated for a certain period of time. Learn more below.                                                       | [0xE412991Fb026df586C2f2F9EE06ACaD1A34f585B](https://arbiscan.io/address/0xE412991Fb026df586C2f2F9EE06ACaD1A34f585B) |
| [`DepositImpl`](https://github.com/dolomite-exchange/dolomite-margin/blob/master/contracts/protocol/impl/DepositImpl.sol)                                                            | DolomiteMargin library containing the logic for executing deposits                                                                                                                                        | [0xF884B50A1d0D1FfD96fd8aB9e4D1C0d8D0803a33](https://arbiscan.io/address/0xF884B50A1d0D1FfD96fd8aB9e4D1C0d8D0803a33) |
| [`DepositWithdrawalProxy`](https://github.com/dolomite-exchange/dolomite-margin/blob/master/contracts/external/proxies/DepositWithdrawalProxy.sol)                                   | Contract for making deposits into `DolomiteMargin` easily, and it utilizes significantly less call-data, which lowers the gas fees significantly on Arbitrum.                                             | [0xAdB9D68c613df4AA363B42161E1282117C7B9594](https://arbiscan.io/address/0xAdB9D68c613df4AA363B42161E1282117C7B9594) |
| [`DolomiteAmmFactory`](https://github.com/dolomite-exchange/dolomite-margin/blob/master/contracts/external/amm/DolomiteAmmFactory.sol)                                               | Factory for creating templated AMM pools. These AMM pools allow users to trade with on-chain liquidity. They also are natively integrated with DolomiteMargin, so LPs also accrue interest from borrowers | [0xD99c21C96103F36BC1FA26DD6448af4DA030c1EF](https://arbiscan.io/address/0xD99c21C96103F36BC1FA26DD6448af4DA030c1EF) |
| [`DolomiteAmmRouterProxy`](https://github.com/dolomite-exchange/dolomite-margin/blob/master/contracts/external/traders/DolomiteAmmRouterProxy.sol)                                   | Routing contract for trading against Dolomite AMM pools                                                                                                                                                   | [0xD8F9C59176AE25414FC4180f6433Fc45b0cbb632](https://arbiscan.io/address/0xD8F9C59176AE25414FC4180f6433Fc45b0cbb632) |
| [`DolomiteMargin`](https://github.com/dolomite-exchange/dolomite-margin/blob/master/contracts/protocol/DolomiteMargin.sol)                                                           | Main margin contract                                                                                                                                                                                      | [0x6Bd780E7fDf01D77e4d475c821f1e7AE05409072](https://arbiscan.io/address/0x6Bd780E7fDf01D77e4d475c821f1e7AE05409072) |
| [`DoubleExponentInterestSetter`](https://github.com/dolomite-exchange/dolomite-margin/blob/master/contracts/external/interestsetters/DoubleExponentInterestSetter.sol)               | Sets interest rates for the system based on each asset's utilization (% of the total pool that's borrowed)                                                                                                | [0xf74FDC3e515F05bd0c5f89FBF03F59A02CFdB37b](https://arbiscan.io/address/0xf74FDC3e515F05bd0c5f89FBF03F59A02CFdB37b) |
| [`Expiry`](https://github.com/dolomite-exchange/dolomite-margin/blob/master/contracts/external/traders/Expiry.sol)                                                                   | Handles account expirations                                                                                                                                                                               | [0xDEc1ae3b570ac3c57871BBD7bFeacC807f973Bea](https://arbiscan.io/address/0xDEc1ae3b570ac3c57871BBD7bFeacC807f973Bea) |
| [`GnosisSafe`](https://gnosis-safe.io/app/arb1:0xa75c21C5BE284122a87A37a76cc6C4DD3E55a1D4)                                                                                           | Operational multi signature wallet that owns the `DelayedMultiSig` wallet                                                                                                                                 | [0xa75c21C5BE284122a87A37a76cc6C4DD3E55a1D4](https://arbiscan.io/address/0xa75c21C5BE284122a87A37a76cc6C4DD3E55a1D4) |
| [`LiquidateOrVaporizeImpl`](https://github.com/dolomite-exchange/dolomite-margin/blob/master/contracts/protocol/impl/LiquidateOrVaporizeImpl.sol)                                    | DolomiteMargin library containing liquidation and vaporization functions. Designed to be used within `OperationImpl`                                                                                      | [0x20faD8614e40E486c79F26B1c053873119B8Fa3B](https://arbiscan.io/address/0x20faD8614e40E486c79F26B1c053873119B8Fa3B) |
| [`LiquidatorAssetRegistry`](https://github.com/dolomite-exchange/dolomite-margin/blob/master/contracts/external/proxies/LiquidatorAssetRegistry.sol)                                 | A global registry for tracking which held tokens can be liquidated by which proxy contracts                                                                                                               | [0x89324260096f1e7D3678Bf0ec9E3b8c7530111b2](https://arbiscan.io/address/0x89324260096f1e7D3678Bf0ec9E3b8c7530111b2) |
| [`LiquidatorProxyV1`](https://github.com/dolomite-exchange/dolomite-margin/blob/master/contracts/external/proxies/LiquidatorProxyV1.sol)                                             | Proxy contract for liquidating other accounts                                                                                                                                                             | [0x84b027f8fcefe40d044ccf9ccb54cc6e48c53450](https://arbiscan.io/address/0x84b027f8fcefe40d044ccf9ccb54cc6e48c53450) |
| [`LiquidatorProxyV1WithAmm`](https://github.com/dolomite-exchange/dolomite-margin/blob/master/contracts/external/proxies/LiquidatorProxyV1WithAmm.sol)                               | Proxy contract for liquidating other accounts and automatically selling collateral using Dolomite's AMM pools                                                                                             | [0xF61A26FF162685c22b880E568f607D0aEB41f1f2](https://arbiscan.io/address/0xF61A26FF162685c22b880E568f607D0aEB41f1f2) |
| [`LiquidatorProxyV2WithExternalLiquidity`](https://github.com/dolomite-exchange/dolomite-margin/blob/master/contracts/external/proxies/LiquidatorProxyV2WithExternalLiquidity.sol)   | Proxy contract for liquidating other accounts and automatically selling collateral using Paraswap liquidity aggregation                                                                                   | [0xCC24cAA605375c011a4F7E6BE7f6C2a3e377F368](https://arbiscan.io/address/0xCC24cAA605375c011a4F7E6BE7f6C2a3e377F368) |
| [`LiquidatorProxyV3WithLiquidityToken`](https://github.com/dolomite-exchange/dolomite-margin/blob/master/contracts/external/proxies/LiquidatorProxyV3WithLiquidityToken.sol)         | Proxy contract for liquidating other accounts and automatically selling wrapped collateral tokens (like dolomite-GLP) using Paraswap liquidity aggregation                                                | [0x0c35882B90bc7Da4d499553A8C681Ce4e17fCC02](https://arbiscan.io/address/0x0c35882B90bc7Da4d499553A8C681Ce4e17fCC02) |
| [`MultiCall`](https://github.com/dolomite-exchange/dolomite-margin/blob/master/contracts/external/utils/MultiCall.sol)                                                               | A utility contract for aggregating calls to the RPC node                                                                                                                                                  | [0xB18B8B1A5BDEa1f3c9776715b9325F932803FB1f](https://arbiscan.io/address/0xB18B8B1A5BDEa1f3c9776715b9325F932803FB1f) |
| [`OperationImpl`](https://github.com/dolomite-exchange/dolomite-margin/blob/master/contracts/protocol/impl/OperationImpl.sol)                                                        | DolomiteMargin library containing operation functions                                                                                                                                                     | [0x7908b447Ed2050043bb32dAffab0673970124527](https://arbiscan.io/address/0x7908b447Ed2050043bb32dAffab0673970124527) |
| [`PayableProxy`](https://github.com/dolomite-exchange/dolomite-margin/blob/master/contracts/external/proxies/PayableProxy.sol)                                                       | WETH wrapper proxy                                                                                                                                                                                        | [0xaa1A2EdDa1715353526Ed09086b457b46375e0Fa](https://arbiscan.io/address/0xaa1A2EdDa1715353526Ed09086b457b46375e0Fa) |
| [`SignedOperationProxy`](https://github.com/dolomite-exchange/dolomite-margin/blob/master/contracts/external/proxies/SignedOperationProxy.sol)                                       | Contract for sending signed operations on behalf of another account owner                                                                                                                                 | [0x3d28c55EbDa31f811F43A7601f36f420825531b1](https://arbiscan.io/address/0x3d28c55EbDa31f811F43A7601f36f420825531b1) |
| [`SimpleFeeOwner`](https://github.com/dolomite-exchange/dolomite-margin/blob/master/contracts/external/amm/SimpleFeeOwner.sol)                                                       | Can potentially own the admin fees that are accrued by AMM liquidity providers (LPs)                                                                                                                      | [0xd802D4B2586C80f60D55707bC26DA71a64c631C2](https://arbiscan.io/address/0xd802D4B2586C80f60D55707bC26DA71a64c631C2) |
| [`TradeImpl`](https://github.com/dolomite-exchange/dolomite-margin/blob/master/contracts/protocol/impl/TradeImpl.sol)                                                                | DolomiteMargin library containing the logic for executing internal trades and trades with external accounts, outside of DolomiteMargin                                                                    | [0x1E0bE797880d3Db0Ce503Cd40429a3a9f1cF56D7](https://arbiscan.io/address/0x1E0bE797880d3Db0Ce503Cd40429a3a9f1cF56D7) |
| [`TransferImpl`](https://github.com/dolomite-exchange/dolomite-margin/blob/master/contracts/protocol/impl/TransferImpl.sol)                                                          | DolomiteMargin library containing the logic for executing transfers                                                                                                                                       | [0x2F503BEB8C79B739F55e5b702273267492f9bA90](https://arbiscan.io/address/0x2F503BEB8C79B739F55e5b702273267492f9bA90) |
| [`TransferProxy`](https://github.com/dolomite-exchange/dolomite-margin/blob/master/contracts/external/proxies/TransferProxy.sol)                                                     | Contract for transferring funds within Dolomite to other users                                                                                                                                            | [0xe04f884e8BB9868b6013dEAd84ad5A3B8cb1Df5A](https://arbiscan.io/address/0xe04f884e8BB9868b6013dEAd84ad5A3B8cb1Df5A) |
| [`WithdrawalImpl`](https://github.com/dolomite-exchange/dolomite-margin/blob/master/contracts/protocol/impl/WithdrawalImpl.sol)                                                      | DolomiteMargin library containing the logic for executing withdrawals                                                                                                                                     | [0x8dC7C04644b14e04E7A84654680Bbf5E83A88332](https://arbiscan.io/address/0x8dC7C04644b14e04E7A84654680Bbf5E83A88332) |

##### Modularized Smart Contracts (these smart contracts rest atop the core system)


| Contract Name                                                                                                                                                            | Description                                                                                                                                                                                                                         | Address                                                                                                              |
|--------------------------------------------------------------------------------------------------------------------------------------------------------------------------|-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|----------------------------------------------------------------------------------------------------------------------|
| [`GmxRegistryV1`](https://github.com/dolomite-exchange/dolomite-margin-modules/blob/master/contracts/external/glp/GmxRegistryV1.sol)                                     | A registry that contains all of the GMX-related addresses. Used for offering Dolomite's smart contracts a uniform entrypoint for reading ecosystem smart contracts                                                                  | [0xc2cBd99bb35b22C43010a8c8266Cdff057f70BB1](https://arbiscan.io/address/0xc2cBd99bb35b22C43010a8c8266Cdff057f70BB1) |
| [`GLPWrappedTokenUserVaultV1`](https://github.com/dolomite-exchange/dolomite-margin-modules/blob/master/contracts/external/glp/GLPWrappedTokenUserVaultV1.sol)           | Implementation contract for each user's proxy contract vault. It stores the users fsGLP tokens, esGMX, sbfGMX, and interacts with GMX ecosystem                                                                                     | [0xc2cBd99bb35b22C43010a8c8266Cdff057f70BB1](https://arbiscan.io/address/0xc2cBd99bb35b22C43010a8c8266Cdff057f70BB1) |
| [`GLPWrappedTokenUserVaultFactory`](https://github.com/dolomite-exchange/dolomite-margin-modules/blob/master/contracts/external/glp/GLPWrappedTokenUserVaultFactory.sol) | The wrapper around the fsGLP token that is used to create user vaults and manage the entry points that a user can use to interact with DolomiteMargin from the vault.                                                               | [0xc2cBd99bb35b22C43010a8c8266Cdff057f70BB1](https://arbiscan.io/address/0xc2cBd99bb35b22C43010a8c8266Cdff057f70BB1) |
| [`GLPPriceOracleV1`](https://github.com/dolomite-exchange/dolomite-margin-modules/blob/master/contracts/external/glp/GLPPriceOracleV1.sol)                               | An implementation of the IDolomitePriceOracle interface that makes GMX's GLP prices compatible with `DolomiteMargin`. The GLP price it calculates understates the price by using the highest bid and factors in any withdrawal fees | [0xc2cBd99bb35b22C43010a8c8266Cdff057f70BB1](https://arbiscan.io/address/0xc2cBd99bb35b22C43010a8c8266Cdff057f70BB1) |
| [`GLPWrapperTraderV1`](https://github.com/dolomite-exchange/dolomite-margin-modules/blob/master/contracts/external/glp/GLPWrapperTraderV1.sol)                           | Used for wrapping GLP (via minting from the GLPRewardsRouter) from USDC. Upon settlement, the minted GLP is sent to the user's vault and dfsGLP is minted to `DolomiteMargin`.                                                      | [0xc2cBd99bb35b22C43010a8c8266Cdff057f70BB1](https://arbiscan.io/address/0xc2cBd99bb35b22C43010a8c8266Cdff057f70BB1) |
| [`GLPUnwrapperTraderV1`](https://github.com/dolomite-exchange/dolomite-margin-modules/blob/master/contracts/external/glp/GLPUnwrapperTraderV1.sol)                       | Used for unwrapping GLP (via burning via the GLPRewardsRouter) into USDC. Upon settlement, the burned GLP is sent from the user's vault to this contract and dfsGLP is burned from `DolomiteMargin`.                                | [0xc2cBd99bb35b22C43010a8c8266Cdff057f70BB1](https://arbiscan.io/address/0xc2cBd99bb35b22C43010a8c8266Cdff057f70BB1) |


#### Arbitrum Goerli

| Contract Name                                                                                                                                                          | Description                                                                                                                                                                                               | Address                                                                                                                     |
|------------------------------------------------------------------------------------------------------------------------------------------------------------------------|-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|-----------------------------------------------------------------------------------------------------------------------------|
| [`AdminImpl`](https://github.com/dolomite-exchange/dolomite-margin/blob/master/contracts/protocol/impl/AdminImpl.sol)                                                  | DolomiteMargin library containing admin functions                                                                                                                                                         | [0x57Fdc7cBE3b60FFbF62F5522dC13B1E586dF49B5](https://goerli.arbiscan.io/address/0x57Fdc7cBE3b60FFbF62F5522dC13B1E586dF49B5) |
| [`BorrowPositionProxyV1`](https://github.com/dolomite-exchange/dolomite-margin/blob/master/contracts/external/proxies/BorrowPositionProxyV1.sol)                       | Proxy contract for opening borrow positions. This makes indexing easier and lowers gas costs on Arbitrum by minimizing call data.                                                                         | [0xaD6bAE6EF017ad733fF5F59DD2B6E52d26b06e31](https://goerli.arbiscan.io/address/0xaD6bAE6EF017ad733fF5F59DD2B6E52d26b06e31) |
| [`CallImpl`](https://github.com/dolomite-exchange/dolomite-margin/blob/master/contracts/protocol/impl/CallImpl.sol)                                                    | DolomiteMargin library containing the logic for executing general invocations from DolomiteMargin to an arbitrary address                                                                                 | [0x05E9F8DD99d70Fb51cfe7AC509fe6DE859caB5b3](https://goerli.arbiscan.io/address/0x05E9F8DD99d70Fb51cfe7AC509fe6DE859caB5b3) |
| [`ChainlinkPriceOracleV1`](https://github.com/dolomite-exchange/dolomite-margin/blob/master/contracts/external/oracles/ChainlinkPriceOracleV1.sol)                     | Price oracle for all assets, utilizing Chainlink                                                                                                                                                          | [0x1BEC3A1331d36e57Ef3b1A8ccf1946c8cfe3Fef0](https://goerli.arbiscan.io/address/0x1BEC3A1331d36e57Ef3b1A8ccf1946c8cfe3Fef0) |
| [`DelayedMultiSig`](https://github.com/dolomite-exchange/dolomite-margin/blob/master/contracts/external/amm/DelayedMultiSig.sol)                                       | Multi-signature wallet that owns the `DolomiteMargin` protocol. On the testnet, all changes are time-gated for 60 seconds.                                                                                | [0xE412991Fb026df586C2f2F9EE06ACaD1A34f585B](https://goerli.arbiscan.io/address/0xE412991Fb026df586C2f2F9EE06ACaD1A34f585B) |
| [`DepositImpl`](https://github.com/dolomite-exchange/dolomite-margin/blob/master/contracts/protocol/impl/DepositImpl.sol)                                              | DolomiteMargin library containing the logic for executing deposits                                                                                                                                        | [0x8c1BcEE8fA445AB605F85356FcaA0E586a28548F](https://goerli.arbiscan.io/address/0x8c1BcEE8fA445AB605F85356FcaA0E586a28548F) |
| [`DepositWithdrawalProxy`](https://github.com/dolomite-exchange/dolomite-margin/blob/master/contracts/external/proxies/DepositWithdrawalProxy.sol)                     | Contract for making deposits into `DolomiteMargin` easily, and it utilizes significantly less call-data, which lowers the gas fees significantly on Arbitrum.                                             | [0x06a22131E3F2a06141FF46B4d9766201F0aa84Fd](https://goerli.arbiscan.io/address/0x06a22131E3F2a06141FF46B4d9766201F0aa84Fd) |
| [`DolomiteAmmFactory`](https://github.com/dolomite-exchange/dolomite-margin/blob/master/contracts/external/amm/DolomiteAmmFactory.sol)                                 | Factory for creating templated AMM pools. These AMM pools allow users to trade with on-chain liquidity. They also are natively integrated with DolomiteMargin, so LPs also accrue interest from borrowers | [0xa712182078dD19642C00fB1f49A5D9a2D7283a5b](https://goerli.arbiscan.io/address/0xa712182078dD19642C00fB1f49A5D9a2D7283a5b) |
| [`DolomiteAmmRouterProxy`](https://github.com/dolomite-exchange/dolomite-margin/blob/master/contracts/external/traders/DolomiteAmmRouterProxy.sol)                     | Routing contract for trading against Dolomite AMM pools                                                                                                                                                   | [0xCb03Aa6B00e087A90c0A98554462Fa4fbed9C57F](https://goerli.arbiscan.io/address/0xCb03Aa6B00e087A90c0A98554462Fa4fbed9C57F) |
| [`DolomiteMargin`](https://github.com/dolomite-exchange/dolomite-margin/blob/master/contracts/protocol/DolomiteMargin.sol)                                             | Main margin contract                                                                                                                                                                                      | [0xb4de6b0Aa8c1187633Ab33a73eF0c840bC9B6D49](https://goerli.arbiscan.io/address/0xb4de6b0Aa8c1187633Ab33a73eF0c840bC9B6D49) |
| [`DoubleExponentInterestSetter`](https://github.com/dolomite-exchange/dolomite-margin/blob/master/contracts/external/interestsetters/DoubleExponentInterestSetter.sol) | Sets interest rates for the system based on each asset's utilization (% of the total pool that's borrowed)                                                                                                | [0xBF35F5D837e22550b8DBA6Df8AF5bC92c1f47f9A](https://goerli.arbiscan.io/address/0xBF35F5D837e22550b8DBA6Df8AF5bC92c1f47f9A) |
| [`Expiry`](https://github.com/dolomite-exchange/dolomite-margin/blob/master/contracts/external/traders/Expiry.sol)                                                     | Handles account expirations                                                                                                                                                                               | [0x16Ec03D86cC8B8bb57646b533d6fBda07D992229](https://goerli.arbiscan.io/address/0x16Ec03D86cC8B8bb57646b533d6fBda07D992229) |
| [`LiquidateOrVaporizeImpl`](https://github.com/dolomite-exchange/dolomite-margin/blob/master/contracts/protocol/impl/LiquidateOrVaporizeImpl.sol)                      | DolomiteMargin library containing liquidation and vaporization functions. Designed to be used within `OperationImpl`                                                                                      | [0x7fA3d8e4e8A2E5285a97B255b12f94feD2e71374](https://goerli.arbiscan.io/address/0x7fA3d8e4e8A2E5285a97B255b12f94feD2e71374) |
| [`LiquidatorProxyV1`](https://github.com/dolomite-exchange/dolomite-margin/blob/master/contracts/external/proxies/LiquidatorProxyV1.sol)                               | Proxy contract for liquidating other accounts                                                                                                                                                             | [0x67d1287Ae9e7beAd6cf0ea993a0A9145503D452e](https://goerli.arbiscan.io/address/0x67d1287Ae9e7beAd6cf0ea993a0A9145503D452e) |
| [`LiquidatorProxyV1WithAmm`](https://github.com/dolomite-exchange/dolomite-margin/blob/master/contracts/external/proxies/LiquidatorProxyV1WithAmm.sol)                 | Proxy contract for liquidating other accounts and automatically selling collateral using Dolomite's AMM pools                                                                                             | [0x253ab314Db0688A22280F800790cF1493E660b07](https://goerli.arbiscan.io/address/0x253ab314Db0688A22280F800790cF1493E660b07) |
| [`MultiCall`](https://github.com/dolomite-exchange/dolomite-margin/blob/master/contracts/external/utils/MultiCall.sol)                                                 | A utility contract for aggregating calls to the RPC node                                                                                                                                                  | [0x53338D5Ed2Ef4a35Acf39A73370F9D556fB7f9d6](https://goerli.arbiscan.io/address/0x53338D5Ed2Ef4a35Acf39A73370F9D556fB7f9d6) |
| [`OperationImpl`](https://github.com/dolomite-exchange/dolomite-margin/blob/master/contracts/protocol/impl/OperationImpl.sol)                                          | DolomiteMargin library containing operation functions                                                                                                                                                     | [0x10Dcb98670813F5B551f07d40a81A4F44b1871B8](https://goerli.arbiscan.io/address/0x10Dcb98670813F5B551f07d40a81A4F44b1871B8) |
| [`PayableProxy`](https://github.com/dolomite-exchange/dolomite-margin/blob/master/contracts/external/proxies/PayableProxy.sol)                                         | WETH wrapper proxy                                                                                                                                                                                        | [0xBC41972A9277E5800357f0e7E7e7d72BF22ce977](https://goerli.arbiscan.io/address/0xBC41972A9277E5800357f0e7E7e7d72BF22ce977) |
| [`SignedOperationProxy`](https://github.com/dolomite-exchange/dolomite-margin/blob/master/contracts/external/proxies/SignedOperationProxy.sol)                         | Contract for sending signed operations on behalf of another account owner                                                                                                                                 | [0x603155c7Ad94778F36DFFE1E95D0578C578193C3](https://goerli.arbiscan.io/address/0x603155c7Ad94778F36DFFE1E95D0578C578193C3) |
| [`SimpleFeeOwner`](https://github.com/dolomite-exchange/dolomite-margin/blob/master/contracts/external/amm/SimpleFeeOwner.sol)                                         | Can potentially own the admin fees that are accrued by AMM liquidity providers (LPs)                                                                                                                      | [0x9c2982B821f7c9fEdd845dF1477cCF5eEc356ff9](https://goerli.arbiscan.io/address/0x9c2982B821f7c9fEdd845dF1477cCF5eEc356ff9) |
| [`TradeImpl`](https://github.com/dolomite-exchange/dolomite-margin/blob/master/contracts/protocol/impl/TradeImpl.sol)                                                  | DolomiteMargin library containing the logic for executing internal trades and trades with external accounts, outside of DolomiteMargin                                                                    | [0xfb0405006D97Ed1b5c7C4bB57a4f586c81665C47](https://goerli.arbiscan.io/address/0xfb0405006D97Ed1b5c7C4bB57a4f586c81665C47) |
| [`TransferImpl`](https://github.com/dolomite-exchange/dolomite-margin/blob/master/contracts/protocol/impl/TransferImpl.sol)                                            | DolomiteMargin library containing the logic for executing transfers                                                                                                                                       | [0x8f26bb74Fa5BCfe4081Adb81b9f21F8f3dBd14Ca](https://goerli.arbiscan.io/address/0x8f26bb74Fa5BCfe4081Adb81b9f21F8f3dBd14Ca) |
| [`TransferProxy`](https://github.com/dolomite-exchange/dolomite-margin/blob/master/contracts/external/proxies/TransferProxy.sol)                                       | Contract for transferring funds within Dolomite to other users                                                                                                                                            | [0xb8689de25A06980eD034AE3bf75E2452392e495A](https://goerli.arbiscan.io/address/0xb8689de25A06980eD034AE3bf75E2452392e495A) |
| [`WithdrawalImpl`](https://github.com/dolomite-exchange/dolomite-margin/blob/master/contracts/protocol/impl/WithdrawalImpl.sol)                                        | DolomiteMargin library containing the logic for executing withdrawals                                                                                                                                     | [0x46bF4eB8290fc4Af78B49DfD209BeAF7a8e23043](https://goerli.arbiscan.io/address/0x46bF4eB8290fc4Af78B49DfD209BeAF7a8e23043) |

#### Arbitrum Goerli Testnet Tokens

| Contract Name                                                                                                    | Description                                                               | Address                                                                                                                     |
|------------------------------------------------------------------------------------------------------------------|---------------------------------------------------------------------------|-----------------------------------------------------------------------------------------------------------------------------|
| [`DAI`](https://github.com/dolomite-exchange/dolomite-margin/blob/master/contracts/testing/CustomTestToken.sol)  | DAI token                                                                 | [0xE65A051E0ae02eB66a11c73B2BA14021B5aadAEE](https://goerli.arbiscan.io/address/0xE65A051E0ae02eB66a11c73B2BA14021B5aadAEE) |
| [`LINK`](https://github.com/dolomite-exchange/dolomite-margin/blob/master/contracts/testing/CustomTestToken.sol) | LINK token (unofficial and not supported by the Chainlink Oracle Network) | [0x2d3B3F17d6694d5AA643Cb89A82Ac9214a41536d](https://goerli.arbiscan.io/address/0x2d3B3F17d6694d5AA643Cb89A82Ac9214a41536d) |
| [`USDC`](https://github.com/dolomite-exchange/dolomite-margin/blob/master/contracts/testing/CustomTestToken.sol) | USDC token (unofficial and not supported by Circle)                       | [0x7317eb743583250739862644cef74B982708eBB4](https://goerli.arbiscan.io/address/0x7317eb743583250739862644cef74B982708eBB4) |
| [`WBTC`](https://github.com/dolomite-exchange/dolomite-margin/blob/master/contracts/testing/CustomTestToken.sol) | WBTC token                                                                | [0x6fA07522F1dd8D8cb5b400c957418b4bD2C96F80](https://goerli.arbiscan.io/address/0x6fA07522F1dd8D8cb5b400c957418b4bD2C96F80) |
| [`WETH`](https://github.com/dolomite-exchange/dolomite-margin/blob/master/contracts/testing/TestWETH.sol)        | WETH token                                                                | [0xC033378c6eEa969C001CE9438973ca4d6460999a](https://goerli.arbiscan.io/address/0xC033378c6eEa969C001CE9438973ca4d6460999a) |


> All testnet tokens have an `addBalance(address _target, uint256 _value)` function which can be used to give yourself 
> tokens for testing purposes. The tokens are sent directly to `__taget`'s wallet, NOT to the Dolomite virtual balance. 

### Admin Privileges

In the initial stages of the protocol, the admin rights are owned by Dolomite's executive team using a simple multi
signature wallet (Gnosis Safe) that is stood up behind a delayed multi signature wallet (custom-made by the dYdX team).
The Gnosis Safe is a 2/3 wallet that is owned by the Dolomite team. Meaning, 2 signers are needed out of the 3 owners to 
execute a transaction. The delayed multi signature wallet is solely owned by the Gnosis Safe, which means the security 
and ownership of the delayed multi signature wallet falls back on to the Gnosis Safe. On the other hand, the time delay 
falls completely on the delayed multi signature wallet; what ever delay is set for the delayed multi signature wallet 
indiscriminately requires that *all* transactions sent to it wait the same delay before the transaction can be executed. 
This means, all admin transactions involving the `DolomiteMargin` protocol require that `secondsTimeLocked` amount of 
time must be waited before the transaction effectuates.


> At the time of launch, the delay on the delayed multi signature wallet is 1 day (86,400 seconds). The intention is to 
> raise it incrementally until the protocol is more battle-tested and ownership of the protocol becomes much more 
> decentralized.


To check the current delay (in case these docs ever go out of sync!) you can convert the `secondsTimeLocked` value from
seconds to minutes/hours/days on
[Arbiscan](https://arbiscan.io/address/0xE412991Fb026df586C2f2F9EE06ACaD1A34f585B#readContract).

### Risk Limits

DolomiteMargin initializes an immutable struct called `RiskLimits` upon deployment that defines that absolute maximum
that certain parameters can *ever* be. Meaning, under no possible circumstance can these values change and under no
possible circumstance can `RiskParams` (the mutable counterpart of the `RiskLimit` struct) be changed to a value that
exceeds a value set in `RiskLimits`. The following values are set in `RiskLimits`:

---
```uint64 marginRatioMax```
> The highest that the ratio can be for liquidating under-water accounts. Permanently set at `2000000000000000000`,
> which is equal to 200% collateralization.

---
```uint64 liquidationSpreadMax```
> The highest that the liquidation rewards can be when a liquidator liquidates an account. Permanently set at
> `500000000000000000`, which is equal to a 50% reward.

---
```uint64 earningsRateMax```
> The highest that the supply APR can be for a market, as a proportion of the borrow rate. Meaning, a rate of 100%
> (1e18) would give suppliers all the interest that borrowers are paying. A rate of 90% would give suppliers 90% of the
> interest that borrowers pay. Permanently set at `1000000000000000000`, which is equal to 100% of the borrow rate going
> to suppliers.

---
```uint64 marginPremiumMax```
> The highest min margin ratio premium that can be applied to a particular market. Meaning, a value of 10% (1e17) would
> require borrowers to maintain an extra 10% collateral to maintain a healthy margin ratio. This value works by
> increasing the debt owed and decreasing the supply held for the particular market by this amount, by this the value.
> Permanently set at `2000000000000000000`, which equals 200%. Meaning, if this value were set for an individual
> market's `RiskParams` to `2000000000000000000`, and the protocol's minimum collateralization is 115%, that particular
> market will require a min collateralization of 345% in maintain sufficient collateralization.

---
```uint64 spreadPremiumMax```
> The highest liquidation reward that can be applied to a particular market. This percentage is applied in addition to
> the liquidation spread in `RiskParams`. This value has 18 decimals, meaning a value of 1e18 is 100%. It is applied to
> each market as follows: `liquidationSpread * (1 + spreadPremium)`. This value is permanently set at
> `2000000000000000000`, which equals 200%.

---
```uint128 minBorrowedValueMax```
> The highest minimum borrowed value that can be set by the protocol (this is confusingly worded, we know!). This value
> is permanently set at `100000000000000000000` or $1e-16. Meaning, the minimum borrowed value can never be set beyond
> `100000000000000000000 / 1e36` dollars.

---

To verify any of the above values, you can visit
[Arbiscan](https://arbiscan.io/address/0x6a76986201E1906eb8d887Bb4Ad74b55888617af#readContract) and click the `Query`
button for the function `getRiskLimits`.

### Global Risk Params

DolomiteMargin uses a struct for storing global risk-values called `RiskParams` which is *changeable* by the admin of
the protocol (subject to any time delays, of course). These values include the following:

---
```Decimal.D256 marginRatio```
> The required ratio of over-collateralization. This value is currently set at `150000000000000000` which corresponds
> with 115% collateralization. This value cannot be set below `liquidationSpread` nor above `marginRatioMax` (which is
> permanently set at 200%) and has a theoretical lower limit of 0 (100% collateralization).

---
```Decimal.D256 liquidationSpread```
> The liquidation reward paid from liquidated accounts to liquidators. This value is currently set at
> `50000000000000000` which corresponds with a 5% liquidation reward. This value cannot be set below 0% nor above
> `marginRatio` or `spreadPremiumMax` (which is permanently set at 200%).

---
```Decimal.D256 earningsRate```
> The percentage of the borrower's interest fee that is passed to the suppliers. This value is currently set at
> `850000000000000000` which corresponds with 85%. The remaining 10% is paid to the protocol as a fee.

---
```Monetary.Value minBorrowedValue```
> The minimum borrow value that an account may have. This value is measured in dollars and has 36 decimals of precision.
> This value is currently set at 0 ($0).

---
```uint256 accountMaxNumberOfMarketsWithBalances```
> The maximum number of markets a user can have a non-zero balance for a given account. Recall, an account is defined
> as a user's address, partitioned by an `index`. This value is currently set at 32. Meaning, a user can deposit 32
> assets into each of `wallet-index[0]`, `wallet-index[1]` ... `wallet-index[n]`, etc.

---

### Market Risk Params

The following market-specific functions and parameters can be called or changed by the protocol's admin and are subject
to the same, universal, time delays as well as any applicable limits defined above.

To verify any of these parameters for a particular market, you can first get the `marketId` from the 
[Markets](https://docs.dolomite.io/#/protocol?id=markets) section of the docs. Alternatively, you can visit the
DolomiteMargin smart contract on
[Arbiscan](https://arbiscan.io/address/0x6a76986201E1906eb8d887Bb4Ad74b55888617af#readContract) and get the `marketId`
by calling the `getMarketIdByTokenAddress` function, passing in the token address whose market ID you're seeking. Then,
pass the `marketId` into the `getMarket` function or into individual market risk-oriented functions like:

- `getMarketIsClosing`
- `getMarketIsRecyclable`
- `getMarketPriceOracle`
- `getMarketInterestSetter`
- `getMarketMarginPremium`
- `getMarketSpreadPremium`
- `getMarketMaxWei`

---

```
function ownerAddMarket(
    address token,
    IPriceOracle priceOracle,
    IInterestSetter interestSetter,
    Decimal.D256 memory marginPremium,
    Decimal.D256 memory spreadPremium,
    uint256 maxWei,
    bool isClosing,
    bool isRecyclable
)
```

> This function allows a new market to be added to DolomiteMargin. Upon initialization, `isRecyclable` (explanation 
> below) and the token's address cannot be changed. Other values that are initialized and can be changed include
>`isClosing`, `priceOracle`, `interestSetter`, `marginPremium`, `spreadPremium`, and `maxWei`.

---

```
function ownerRemoveMarkets(
    uint[] memory marketIds,
    address salvager
)
```

> Removes a market entirely from DolomiteMargin, recovering its `marketId`. This function can only be called for markets
> that have `isRecyclable` (defined below) set to `true`. The `salvager` parameter is used

---
```bool isClosing```
> This value defaults to `false`. Setting this value to `true` disallows any *new* borrows from occurring for that
> market. This value is checked after each interaction with DolomiteMargin settles, meaning funds can still be flash
> borrowed (as long as they're returned in full), once the interaction settles.

---
```bool isRecyclable```
> This value cannot be changed after initialization of a new market. This value dictates whether a market is allowed
> to be removed altogether. This value exists mainly for the efficiency of the protocol, allowing market IDs to be
> reclaimed. The main use-case for this is for expirable markets, like if an option token is added that expires at a
> certain timestamp.

---
```IPriceOracle priceOracle```
> The contract address of the price oracle for this market. Must conform to the `IPriceOracle` interface. The price this
> contract returns has `36 - tokenDecimals` decimals. For example, `1000000000000000000000000000000` equals $1.00
> for the USDC market, because USDC has 6 decimals.

---
```IInterestSetter interestSetter```
> Contract address of the interest setter for this market. Must conform to the `IInterestSetter` interface. This
> contract takes the utilization (the total amount borrowed and the total amount supplied) for a given market and
> determines the amount of interest paid by borrowers *every second*. Meaning, a value returned by this contract of
> `325000000` is equivalent to `1.02% APR` (`325000000 * 86400 * 365`). The result has 18 decimals.

---
```Decimal.D256 marginPremium```
> The multiplier to apply to the global `marginRatio`. This value works by increasing the debt owed and decreasing the
> supply held for the particular market by `1 + marginPremium`. Meaning, a `marginPremium` of 100000000000000000 (10%)
> and a marginRatio of `100000000000000000` (110% collateralization) results in that particular market's `marginRatio`
> equalling `110% * 1.1 == 121%`.

---
```Decimal.D256 spreadPremium```
> The multiplier to apply to the global `liquidationSpread`. This value works by increasing the `liquidationSpread` by
> (`Decimal.one + spreadPremium`). Meaning, a `spreadPremium` of `100000000000000000` (10%) and a `liquidationSpread` of
> `50000000000000000`, results in that particular market's `liquidationSpread` equalling `5% * 1.1 == 5.5%`.

---
```Types.Wei maxWei```
> The maximum value that can be deposited into DolomiteMargin for this particular market. This allows the protocol to
> cap any additional risk that is inferred by allowing borrowing against assets with a lower market capitalization or
> assets with increased volatility. Setting this value to 0 is analogous to having no limit. This value can never be
> below 0. This value's number of decimals corresponds with the number of decimals this market's token has.

---

### Other Admin Functions

These functions are responsible for adding global operators to DolomiteMargin and instances of `IAutoTrader` that are
only accessible by global operators. When evaluating the riskiness of the DolomiteMargin protocol, is important to
understand the implications of these two functions, since they likely pose the largest risk to the system from the
perspective of safeguarding users' funds.

Taking a step back, what is an operator?

An operator is an external address that has the same permissions to manipulate an account within `DolomiteMargin` as the 
owner of the account. Operators are simply addresses and therefore may either be externally-owned Ethereum accounts 
(EoAs) OR smart contracts. Operators are also able to act as AutoTrader contracts on behalf of the account owner if the 
operator is a smart contract and implements the `IAutoTrader` interface.

---

```
function ownerSetGlobalOperator(
    address operator,
    bool approved
) public;
```

> This function allows the admin to approve or disapprove a smart contract that has the permission to be an operator for
> all accounts on DolomiteMargin. With regard to the safety of user's funds, this function likely poses the largest
> risk on the system. If a buggy or malicious global operator is ever set, all user's funds could be at risk.
> Therefore, all global operators must undergo extensive testing and review before being added to the system.
>
> A non-exhaustive list of global operators include the
> [LiquidatorProxyV1](https://arbiscan.io/address/0xDda7d883B19536823ccD6d16F0b14d9ba1FAB581) and
> [DepositWithdrawalProxy](https://arbiscan.io/address/0xA526B730B96d0ADC11B206560DE19760f12737c4), which exist
> to simplify the user experience or lower gas costs for Dolomite users.

```
function ownerSetAutoTraderSpecial(
    address autoTrader,
    bool special
) public;
```

> This function sets or unsets an instance of `IAutoTrader` from needing to be called by a global operator. This exists
> to ensure certain contracts, like `Expiry` can eventually only be called by trusted
> [Keepers](https://chain.link/keepers) on the Chainlink Oracle network.

### Other Miscellaneous Admin Functions

These functions are responsible for collecting protocol revenues and salvaging accidentally-sent tokens to the
DolomiteMargin smart contract.

---

```
function ownerWithdrawExcessTokens(
    uint256 marketId,
    address recipient
) public;
```

> This function allows the admin to withdraw an ERC20 token for which there is an associated market. Only excess tokens
> can be withdrawn. The number of excess tokens is calculated by taking the current number of tokens held in
> DolomiteMargin, adding the number of tokens owed to DolomiteMargin by borrowers, and subtracting the number of tokens
> owed to suppliers by DolomiteMargin.

---

```
function ownerWithdrawUnsupportedTokens(
    address token,
    address recipient
) public;
```

> This function allows the admin to withdraw an ERC20 token for which there is no associated market. This is analogous
> to rescuing tokens sent to the protocol by accident.

