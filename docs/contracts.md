# Smart Contracts

## DolomiteMargin

<a href='https://github.com/dolomite-exchange/dolomite-margin' style="text-decoration:none;">
  <img src='https://img.shields.io/badge/GitHub-dolomite--exchange%2Fdolomite--margin-lightgrey' alt='GitHub'/>
</a>

### Deployed Addresses

The contracts are officially deployed to the following networks:

#### Arbitrum Mainnet

| Contract Name                                                                                                                                                          | Description                                                                                                                                                                                               | Address                                                                                                              |
|------------------------------------------------------------------------------------------------------------------------------------------------------------------------|-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|----------------------------------------------------------------------------------------------------------------------|
| [`AdminImpl`](https://github.com/dolomite-exchange/dolomite-margin/blob/master/contracts/protocol/impl/AdminImpl.sol)                                                  | DolomiteMargin library containing admin functions                                                                                                                                                         | [0x2A50efa8D04D84ee1Aa285e035a97d9e1f1d3431](https://arbiscan.io/address/0x2A50efa8D04D84ee1Aa285e035a97d9e1f1d3431) |
| [`BorrowPositionProxy`](https://github.com/dolomite-exchange/dolomite-margin/blob/master/contracts/external/proxies/BorrowPositionProxy.sol)                           | Proxy contract for opening borrow positions. This makes indexing easier and lowers gas costs on Arbitrum by minimizing call data.                                                                         | [0x2036e188b5fB51a86E6dCf6744c0215a862567C8](https://arbiscan.io/address/0x2036e188b5fB51a86E6dCf6744c0215a862567C8) |
| [`CallImpl`](https://github.com/dolomite-exchange/dolomite-margin/blob/master/contracts/protocol/impl/CallImpl.sol)                                                    | DolomiteMargin library containing the logic for executing general invocations from DolomiteMargin to an arbitrary address                                                                                 | [0xFCe308e5427071876aefA83e31c53985862956c4](https://arbiscan.io/address/0xFCe308e5427071876aefA83e31c53985862956c4) |
| [`ChainlinkPriceOracleV1`](https://github.com/dolomite-exchange/dolomite-margin/blob/master/contracts/external/oracles/ChainlinkPriceOracleV1.sol)                     | Price oracle for all assets, utilizing Chainlink                                                                                                                                                          | [0xc9dA48BBC6d3fA3CedF71c8E57EF5d11B2D157E4](https://arbiscan.io/address/0xc9dA48BBC6d3fA3CedF71c8E57EF5d11B2D157E4) |
| [`DelayedMultiSig`](https://github.com/dolomite-exchange/dolomite-margin/blob/master/contracts/external/amm/DelayedMultiSig.sol)                                       | Multi-signature wallet that owns the `DolomiteMargin` . On Mainnet all admin changes are time-gated for a certain period of time. Learn more below.                                                       | [0xE412991Fb026df586C2f2F9EE06ACaD1A34f585B](https://arbiscan.io/address/0xE412991Fb026df586C2f2F9EE06ACaD1A34f585B) |
| [`DepositImpl`](https://github.com/dolomite-exchange/dolomite-margin/blob/master/contracts/protocol/impl/DepositImpl.sol)                                              | DolomiteMargin library containing the logic for executing deposits                                                                                                                                        | [0x631FAFbfEaF3984E0Ab34a4bE1a74fA2e9060F60](https://arbiscan.io/address/0x631FAFbfEaF3984E0Ab34a4bE1a74fA2e9060F60) |
| [`DepositWithdrawalProxy`](https://github.com/dolomite-exchange/dolomite-margin/blob/master/contracts/external/proxies/DepositWithdrawalProxy.sol)                     | Contract for making deposits into `DolomiteMargin` easily, and it utilizes significantly less call-data, which lowers the gas fees significantly on Arbitrum.                                             | [0xA526B730B96d0ADC11B206560DE19760f12737c4](https://arbiscan.io/address/0xA526B730B96d0ADC11B206560DE19760f12737c4) |
| [`DolomiteAmmFactory`](https://github.com/dolomite-exchange/dolomite-margin/blob/master/contracts/external/amm/DolomiteAmmFactory.sol)                                 | Factory for creating templated AMM pools. These AMM pools allow users to trade with on-chain liquidity. They also are natively integrated with DolomiteMargin, so LPs also accrue interest from borrowers | [0x79C666093972bDCd77EFB350b2f88b42d0de1394](https://arbiscan.io/address/0x79C666093972bDCd77EFB350b2f88b42d0de1394) |
| [`DolomiteAmmRouterProxy`](https://github.com/dolomite-exchange/dolomite-margin/blob/master/contracts/external/traders/DolomiteAmmRouterProxy.sol)                     | Routing contract for trading against Dolomite AMM pools                                                                                                                                                   | [0xC47e015830E775EC932BCcE8CFC9452f5D76f4Bd](https://arbiscan.io/address/0xC47e015830E775EC932BCcE8CFC9452f5D76f4Bd) |
| [`DolomiteMargin`](https://github.com/dolomite-exchange/dolomite-margin/blob/master/contracts/protocol/DolomiteMargin.sol)                                             | Main margin contract                                                                                                                                                                                      | [0x6a76986201E1906eb8d887Bb4Ad74b55888617af](https://arbiscan.io/address/0x6a76986201E1906eb8d887Bb4Ad74b55888617af) |
| [`DoubleExponentInterestSetter`](https://github.com/dolomite-exchange/dolomite-margin/blob/master/contracts/external/interestsetters/DoubleExponentInterestSetter.sol) | Sets interest rates for the system based on each asset's utilization (% of the total pool that's borrowed)                                                                                                | [0x2f05886C57b5B4bD7D2eBf2ADf64A521888F1A95](https://arbiscan.io/address/0x2f05886C57b5B4bD7D2eBf2ADf64A521888F1A95) |
| [`Expiry`](https://github.com/dolomite-exchange/dolomite-margin/blob/master/contracts/external/traders/Expiry.sol)                                                     | Handles account expirations                                                                                                                                                                               | [0x0d64b6C7E51843c053e5AE9A92f88B0A81DCD8Dc](https://arbiscan.io/address/0x0d64b6C7E51843c053e5AE9A92f88B0A81DCD8Dc) |
| [`GnosisSafe`](https://gnosis-safe.io/app/arb1:0xa75c21C5BE284122a87A37a76cc6C4DD3E55a1D4)                                                                             | Operational multi signature wallet that owns the `DelayedMultiSig` wallet                                                                                                                                 | [0xa75c21C5BE284122a87A37a76cc6C4DD3E55a1D4](https://arbiscan.io/address/0xa75c21C5BE284122a87A37a76cc6C4DD3E55a1D4) |
| [`LiquidateOrVaporizeImpl`](https://github.com/dolomite-exchange/dolomite-margin/blob/master/contracts/protocol/impl/LiquidateOrVaporizeImpl.sol)                      | DolomiteMargin library containing liquidation and vaporization functions. Designed to be used within `OperationImpl`                                                                                      | [0x452cA7b561f9c9Af3f77c2d93331a0e0566DEE59](https://arbiscan.io/address/0x452cA7b561f9c9Af3f77c2d93331a0e0566DEE59) |
| [`LiquidatorProxyV1`](https://github.com/dolomite-exchange/dolomite-margin/blob/master/contracts/external/proxies/LiquidatorProxyV1.sol)                               | Proxy contract for liquidating other accounts                                                                                                                                                             | [0xDda7d883B19536823ccD6d16F0b14d9ba1FAB581](https://arbiscan.io/address/0xDda7d883B19536823ccD6d16F0b14d9ba1FAB581) |
| [`LiquidatorProxyV1WithAmm`](https://github.com/dolomite-exchange/dolomite-margin/blob/master/contracts/external/proxies/LiquidatorProxyV1WithAmm.sol)                 | Proxy contract for liquidating other accounts and automatically selling collateral using Dolomite's AMM pools                                                                                             | [0xE6B3895F9A7F81909ddE224Fa2582869736dFD5F](https://arbiscan.io/address/0xE6B3895F9A7F81909ddE224Fa2582869736dFD5F) |
| [`MultiCall`](https://github.com/dolomite-exchange/dolomite-margin/blob/master/contracts/external/utils/MultiCall.sol)                                                 | A utility contract for aggregating calls to the RPC node                                                                                                                                                  | [0xf20b95A1F47C90E2f8c5Bd06C7692b7337aee9F7](https://arbiscan.io/address/0xf20b95A1F47C90E2f8c5Bd06C7692b7337aee9F7) |
| [`OperationImpl`](https://github.com/dolomite-exchange/dolomite-margin/blob/master/contracts/protocol/impl/OperationImpl.sol)                                          | DolomiteMargin library containing operation functions                                                                                                                                                     | [0x8007d1Ad7D73a9Ef93C55b3AfB21861Bcb32e02c](https://arbiscan.io/address/0x8007d1Ad7D73a9Ef93C55b3AfB21861Bcb32e02c) |
| [`PayableProxy`](https://github.com/dolomite-exchange/dolomite-margin/blob/master/contracts/external/proxies/PayableProxy.sol)                                         | WETH wrapper proxy                                                                                                                                                                                        | [0x027DB2781590972D65e7ACC7Aa3D002Ba16B6Fc3](https://arbiscan.io/address/0x027DB2781590972D65e7ACC7Aa3D002Ba16B6Fc3) |
| [`SignedOperationProxy`](https://github.com/dolomite-exchange/dolomite-margin/blob/master/contracts/external/proxies/SignedOperationProxy.sol)                         | Contract for sending signed operations on behalf of another account owner                                                                                                                                 | [0x6Da4cfC73590226868Ce13C6155196f8e6BBC427](https://arbiscan.io/address/0x6Da4cfC73590226868Ce13C6155196f8e6BBC427) |
| [`SimpleFeeOwner`](https://github.com/dolomite-exchange/dolomite-margin/blob/master/contracts/external/amm/SimpleFeeOwner.sol)                                         | Can potentially own the admin fees that are accrued by AMM liquidity providers (LPs)                                                                                                                      | [0x07e323C9303B5646EA265E55d826c88625Da779a](https://arbiscan.io/address/0x07e323C9303B5646EA265E55d826c88625Da779a) |
| [`TradeImpl`](https://github.com/dolomite-exchange/dolomite-margin/blob/master/contracts/protocol/impl/TradeImpl.sol)                                                  | DolomiteMargin library containing the logic for executing internal trades and trades with external accounts, outside of DolomiteMargin                                                                    | [0x7D157fBAaEDc920BCC4A15Dc94A5F10142A19F58](https://arbiscan.io/address/0x7D157fBAaEDc920BCC4A15Dc94A5F10142A19F58) |
| [`TransferImpl`](https://github.com/dolomite-exchange/dolomite-margin/blob/master/contracts/protocol/impl/TransferImpl.sol)                                            | DolomiteMargin library containing the logic for executing transfers                                                                                                                                       | [0xf691B87AF8960e7Dc70BC7636A72B850144eEfA4](https://arbiscan.io/address/0xf691B87AF8960e7Dc70BC7636A72B850144eEfA4) |
| [`TransferProxy`](https://github.com/dolomite-exchange/dolomite-margin/blob/master/contracts/external/proxies/TransferProxy.sol)                                       | Contract for transferring funds within Dolomite to other users                                                                                                                                            | [0xe6f14Dbf3d9c65621c639051b66FCD746E552728](https://arbiscan.io/address/0xe6f14Dbf3d9c65621c639051b66FCD746E552728) |
| [`WithdrawalImpl`](https://github.com/dolomite-exchange/dolomite-margin/blob/master/contracts/protocol/impl/WithdrawalImpl.sol)                                        | DolomiteMargin library containing the logic for executing withdrawals                                                                                                                                     | [0xA8C90016c476540Cb0103E31a98777251e435da5](https://arbiscan.io/address/0xA8C90016c476540Cb0103E31a98777251e435da5) |

#### Arbitrum Rinkeby

| Contract Name                                                                                                                                                          | Description                                                                                                                                                                                               | Address                                                                                                                      |
|------------------------------------------------------------------------------------------------------------------------------------------------------------------------|-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|------------------------------------------------------------------------------------------------------------------------------|
| [`AdminImpl`](https://github.com/dolomite-exchange/dolomite-margin/blob/master/contracts/protocol/impl/AdminImpl.sol)                                                  | DolomiteMargin library containing admin functions                                                                                                                                                         | [0x55f55dbBE616E421e431C5aA6Ab5839dC40a0e10](https://testnet.arbiscan.io/address/0x55f55dbBE616E421e431C5aA6Ab5839dC40a0e10) |
| [`BorrowPositionProxy`](https://github.com/dolomite-exchange/dolomite-margin/blob/master/contracts/external/proxies/BorrowPositionProxy.sol)                           | Proxy contract for opening borrow positions. This makes indexing easier and lowers gas costs on Arbitrum by minimizing call data.                                                                         | [0x04a631F974d93CbECE72d84E9443A6dd9b56316D](https://testnet.arbiscan.io/address/0x04a631F974d93CbECE72d84E9443A6dd9b56316D) |
| [`CallImpl`](https://github.com/dolomite-exchange/dolomite-margin/blob/master/contracts/protocol/impl/CallImpl.sol)                                                    | DolomiteMargin library containing the logic for executing general invocations from DolomiteMargin to an arbitrary address                                                                                 | [0x246c5F1B7c5E7499715aEEe293Bd49f1febB06B4](https://testnet.arbiscan.io/address/0x246c5F1B7c5E7499715aEEe293Bd49f1febB06B4) |
| [`ChainlinkPriceOracleV1`](https://github.com/dolomite-exchange/dolomite-margin/blob/master/contracts/external/oracles/ChainlinkPriceOracleV1.sol)                     | Price oracle for all assets, utilizing Chainlink                                                                                                                                                          | [0xB0E5b4d27A451886c8814403e127B5434c6A178B](https://testnet.arbiscan.io/address/0xB0E5b4d27A451886c8814403e127B5434c6A178B) |
| [`DelayedMultiSig`](https://github.com/dolomite-exchange/dolomite-margin/blob/master/contracts/external/amm/DelayedMultiSig.sol)                                       | Multi-signature wallet that owns the `DolomiteMargin` protocol. On the testnet, all changes are time-gated for 60 seconds.                                                                                | [0xE412991Fb026df586C2f2F9EE06ACaD1A34f585B](https://testnet.arbiscan.io/address/0xE412991Fb026df586C2f2F9EE06ACaD1A34f585B) |
| [`DepositImpl`](https://github.com/dolomite-exchange/dolomite-margin/blob/master/contracts/protocol/impl/DepositImpl.sol)                                              | DolomiteMargin library containing the logic for executing deposits                                                                                                                                        | [0xb19944edB24e3c5DC57672b1203285907e58CC38](https://testnet.arbiscan.io/address/0xb19944edB24e3c5DC57672b1203285907e58CC38) |
| [`DepositWithdrawalProxy`](https://github.com/dolomite-exchange/dolomite-margin/blob/master/contracts/external/proxies/DepositWithdrawalProxy.sol)                     | Contract for making deposits into `DolomiteMargin` easily, and it utilizes significantly less call-data, which lowers the gas fees significantly on Arbitrum.                                             | [0x20C47B75d45791122eFc0877Ec4cc6A2B5390720](https://testnet.arbiscan.io/address/0x20C47B75d45791122eFc0877Ec4cc6A2B5390720) |
| [`DolomiteAmmFactory`](https://github.com/dolomite-exchange/dolomite-margin/blob/master/contracts/external/amm/DolomiteAmmFactory.sol)                                 | Factory for creating templated AMM pools. These AMM pools allow users to trade with on-chain liquidity. They also are natively integrated with DolomiteMargin, so LPs also accrue interest from borrowers | [0xf3f88a800779cC0B0858019D2e09757b49abfFe6](https://testnet.arbiscan.io/address/0xf3f88a800779cC0B0858019D2e09757b49abfFe6) |
| [`DolomiteAmmRouterProxy`](https://github.com/dolomite-exchange/dolomite-margin/blob/master/contracts/external/traders/DolomiteAmmRouterProxy.sol)                     | Routing contract for trading against Dolomite AMM pools                                                                                                                                                   | [0xb80FFa618A0DE7f5506F4F0B3A98b61C51b1563b](https://testnet.arbiscan.io/address/0xb80FFa618A0DE7f5506F4F0B3A98b61C51b1563b) |
| [`DolomiteMargin`](https://github.com/dolomite-exchange/dolomite-margin/blob/master/contracts/protocol/DolomiteMargin.sol)                                             | Main margin contract                                                                                                                                                                                      | [0x28cb259f65fB193e0EDA8f1f7bf5DEae75b0Be51](https://testnet.arbiscan.io/address/0x28cb259f65fB193e0EDA8f1f7bf5DEae75b0Be51) |
| [`DoubleExponentInterestSetter`](https://github.com/dolomite-exchange/dolomite-margin/blob/master/contracts/external/interestsetters/DoubleExponentInterestSetter.sol) | Sets interest rates for the system based on each asset's utilization (% of the total pool that's borrowed)                                                                                                | [0x77860dDD7332f05C7e277b75B19D5A6C4e158C99](https://testnet.arbiscan.io/address/0x77860dDD7332f05C7e277b75B19D5A6C4e158C99) |
| [`Expiry`](https://github.com/dolomite-exchange/dolomite-margin/blob/master/contracts/external/traders/Expiry.sol)                                                     | Handles account expirations                                                                                                                                                                               | [0x3E93c9a8d978BC9B247fa8D32d3686775152Fb16](https://testnet.arbiscan.io/address/0x3E93c9a8d978BC9B247fa8D32d3686775152Fb16) |
| [`LiquidateOrVaporizeImpl`](https://github.com/dolomite-exchange/dolomite-margin/blob/master/contracts/protocol/impl/LiquidateOrVaporizeImpl.sol)                      | DolomiteMargin library containing liquidation and vaporization functions. Designed to be used within `OperationImpl`                                                                                      | [0x2EEe89481705c3bEa78798e756738512956cdC26](https://testnet.arbiscan.io/address/0x2EEe89481705c3bEa78798e756738512956cdC26) |
| [`LiquidatorProxyV1`](https://github.com/dolomite-exchange/dolomite-margin/blob/master/contracts/external/proxies/LiquidatorProxyV1.sol)                               | Proxy contract for liquidating other accounts                                                                                                                                                             | [0x8f26bb74Fa5BCfe4081Adb81b9f21F8f3dBd14Ca](https://testnet.arbiscan.io/address/0x8f26bb74Fa5BCfe4081Adb81b9f21F8f3dBd14Ca) |
| [`LiquidatorProxyV1WithAmm`](https://github.com/dolomite-exchange/dolomite-margin/blob/master/contracts/external/proxies/LiquidatorProxyV1WithAmm.sol)                 | Proxy contract for liquidating other accounts and automatically selling collateral using Dolomite's AMM pools                                                                                             | [0x46bF4eB8290fc4Af78B49DfD209BeAF7a8e23043](https://testnet.arbiscan.io/address/0x46bF4eB8290fc4Af78B49DfD209BeAF7a8e23043) |
| [`MultiCall`](https://github.com/dolomite-exchange/dolomite-margin/blob/master/contracts/external/utils/MultiCall.sol)                                                 | A utility contract for aggregating calls to the RPC node                                                                                                                                                  | [0x370D2a1d43Ba99273E8AC4C870b58241a215B690](https://testnet.arbiscan.io/address/0x370D2a1d43Ba99273E8AC4C870b58241a215B690) |
| [`OperationImpl`](https://github.com/dolomite-exchange/dolomite-margin/blob/master/contracts/protocol/impl/OperationImpl.sol)                                          | DolomiteMargin library containing operation functions                                                                                                                                                     | [0x8007d1Ad7D73a9Ef93C55b3AfB21861Bcb32e02c](https://testnet.arbiscan.io/address/0x8007d1Ad7D73a9Ef93C55b3AfB21861Bcb32e02c) |
| [`PayableProxy`](https://github.com/dolomite-exchange/dolomite-margin/blob/master/contracts/external/proxies/PayableProxy.sol)                                         | WETH wrapper proxy                                                                                                                                                                                        | [0xfb0405006D97Ed1b5c7C4bB57a4f586c81665C47](https://testnet.arbiscan.io/address/0xfb0405006D97Ed1b5c7C4bB57a4f586c81665C47) |
| [`SignedOperationProxy`](https://github.com/dolomite-exchange/dolomite-margin/blob/master/contracts/external/proxies/SignedOperationProxy.sol)                         | Contract for sending signed operations on behalf of another account owner                                                                                                                                 | [0x57Fdc7cBE3b60FFbF62F5522dC13B1E586dF49B5](https://testnet.arbiscan.io/address/0x57Fdc7cBE3b60FFbF62F5522dC13B1E586dF49B5) |
| [`SimpleFeeOwner`](https://github.com/dolomite-exchange/dolomite-margin/blob/master/contracts/external/amm/SimpleFeeOwner.sol)                                         | Can potentially own the admin fees that are accrued by AMM liquidity providers (LPs)                                                                                                                      | [0xd597bB8Ba7A211d975580d3100A5913D7a69c497](https://testnet.arbiscan.io/address/0xd597bB8Ba7A211d975580d3100A5913D7a69c497) |
| [`TradeImpl`](https://github.com/dolomite-exchange/dolomite-margin/blob/master/contracts/protocol/impl/TradeImpl.sol)                                                  | DolomiteMargin library containing the logic for executing internal trades and trades with external accounts, outside of DolomiteMargin                                                                    | [0x8A0F9d14B3e9482De15eEf7ad4568d025670EA6D](https://testnet.arbiscan.io/address/0x8A0F9d14B3e9482De15eEf7ad4568d025670EA6D) |
| [`TransferImpl`](https://github.com/dolomite-exchange/dolomite-margin/blob/master/contracts/protocol/impl/TransferImpl.sol)                                            | DolomiteMargin library containing the logic for executing transfers                                                                                                                                       | [0xe8C65af2A8E4690289EC4D49aA3A0Df74BfaE5ff](https://testnet.arbiscan.io/address/0xe8C65af2A8E4690289EC4D49aA3A0Df74BfaE5ff) |
| [`TransferProxy`](https://github.com/dolomite-exchange/dolomite-margin/blob/master/contracts/external/proxies/TransferProxy.sol)                                       | Contract for transferring funds within Dolomite to other users                                                                                                                                            | [0xa7F020AA74CF76265C4c367DB108DE6679E38b9b](https://testnet.arbiscan.io/address/0xa7F020AA74CF76265C4c367DB108DE6679E38b9b) |
| [`WithdrawalImpl`](https://github.com/dolomite-exchange/dolomite-margin/blob/master/contracts/protocol/impl/WithdrawalImpl.sol)                                        | DolomiteMargin library containing the logic for executing withdrawals                                                                                                                                     | [0xEd71028E3E6662ff95b5Cad2D57585f1796dc5b4](https://testnet.arbiscan.io/address/0xEd71028E3E6662ff95b5Cad2D57585f1796dc5b4) |

### Admin Privileges Overview

In the initial stages of the protocol, the admin rights are owned by Dolomite's executive team using a simple multi
signature wallet (Gnosis Safe) that is stood up behind a delayed multi signature wallet (custom-made by the dYdX team).
The Gnosis Safe is a 2/3 wallet that is owned by the Dolomite executive team. Meaning, 2 signers are needed out of the 3
owners to execute a transaction. The delayed multi signature wallet is solely owned by the Gnosis Safe, which means the 
security and ownership of the delayed multi signature wallet falls back on to the Gnosis Safe. On the other hand, the 
time delay falls completely on the delayed multi signature wallet; what ever delay is set for the delayed multi 
signature wallet indiscriminately requires that *all* transactions sent to it wait the same delay before the transaction 
can be executed. This means, all admin transactions involving the `DolomiteMargin` protocol require that 
`secondsTimeLocked` amount of time must be waited before the transaction effectuates.


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
> `900000000000000000` which corresponds with 90%. The remaining 10% is paid to the protocol as a fee.

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

