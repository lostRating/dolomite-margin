# Governance Transactions

## Primer

In an effort to increase transparency, we will do our best to document all governance transactions in this section of
the docs. As we transition to a DAO model, there will likely be a tidier archive of past proposals, on-chain votes, and
more, which will render this document deprecated.

## Transaction Logs

#### [Safe Transaction #38](https://arbiscan.io/tx/0x544750a635a2f919c6af6b6d69138a31ac86d57627c138e9eb8ccc0d12b7fe4f) - 2/23/2023

- This transaction is enqueued behind Dolomite
  Margin's [multisig time delay](https://arbiscan.io/address/0xE412991Fb026df586C2f2F9EE06ACaD1A34f585B). The following
  actions may be effectuated after waiting 24 hours.
- Disables the following global operators:
    - `BorrowPositionProxyV1` (OLD; no balance check
      flags): [0x144DcFcd3287cF4372887Ef55225696924A82511](https://arbiscan.io/address/0x144DcFcd3287cF4372887Ef55225696924A82511)
    - `LiquidatorProxyV1` (OLD; no
      registry): [0x6d13e5F5458f2bC4D6589093ee5632bE658Caa53](https://arbiscan.io/address/0x6d13e5F5458f2bC4D6589093ee5632bE658Caa53)
    - `LiquidatorProxyV1WithAmm` (OLD; no
      registry): [0x7a20b3d15097c052222b25a5535451dd93aaa8c6](https://arbiscan.io/address/0x7a20b3d15097c052222b25a5535451dd93aaa8c6)
    - `LiquidatorProxyV2WithExternalLiquidity`(OLD; no
      registry): [0x1bBC201f68f209A054E3e86891401d7255f8D3BA](https://arbiscan.io/address/0x1bBC201f68f209A054E3e86891401d7255f8D3BA)
    - `DepositWithdrawalProxy` (OLD; no balance check
      flag): [0x9fA142853AF93D0CC3aF986C27688d54CE61ca8F](https://arbiscan.io/address/0x9fA142853AF93D0CC3aF986C27688d54CE61ca8F)
    - `DolomiteAmmRouterProxy` (OLD; no balance check
      flag): [0xa09B4a3FC92965E587a94539ee8B35ECf42D5A08](https://arbiscan.io/address/0xa09B4a3FC92965E587a94539ee8B35ECf42D5A08)
- Enables the following global operators:
    - `LiquidatorProxyV1`: [0x84b027f8fcefe40d044ccf9ccb54cc6e48c53450](https://arbiscan.io/address/0x84b027f8fcefe40d044ccf9ccb54cc6e48c53450)
    - `LiquidatorProxyV1WithAmm`: [0xF61A26FF162685c22b880E568f607D0aEB41f1f2](https://arbiscan.io/address/0xF61A26FF162685c22b880E568f607D0aEB41f1f2)
    - `LiquidatorProxyV2WithExternalLiquidity`: [0xCC24cAA605375c011a4F7E6BE7f6C2a3e377F368](https://arbiscan.io/address/0xCC24cAA605375c011a4F7E6BE7f6C2a3e377F368)
    - `LiquidatorProxyV3WithLiquidityToken`: [0x0c35882B90bc7Da4d499553A8C681Ce4e17fCC02](https://arbiscan.io/address/0x0c35882B90bc7Da4d499553A8C681Ce4e17fCC02)

#### [Safe Transaction #39](https://arbiscan.io/tx/0xead4847f68064b462c80e43608fe5a5294e1b73ae8de9542d92f60c1e3f03fa2) - 2/25/2023

- This transaction is enqueued behind Dolomite
  Margin's [multisig time delay](https://arbiscan.io/address/0xE412991Fb026df586C2f2F9EE06ACaD1A34f585B). The following
  actions may be effectuated after waiting 24 hours.
- Adds the following as a new market:
    - `Dolomite: Fee + Staked GLP` (`dfsGLP`): [0x34DF4E8062A8C8Ae97E3382B452bd7BF60542698](https://arbiscan.io/address/0x34DF4E8062A8C8Ae97E3382B452bd7BF60542698)
        - Borrowing is disabled
        - All rewards (ETH + esGMX + sGMX + vesting) are passed along to each user's proxy vault
        - Supply is capped at 5,000,000 (`5000000000000000000000000`) `dfsGLP` (this value will likely increase in the
          future)
        - Min collateralization is 120%
            - This is done via the `marginPremium` being set to `43478260869565217` (4.3478%; 115% * 1.043478% == 120%)
        - Price oracle is set
          to [0x26cf2B04bA936Aff81435e67c7C1551E17271744](https://arbiscan.io/address/0x26cf2B04bA936Aff81435e67c7C1551E17271744)
            - The price oracle pulls from the GMX codebase to produce the highest bid price of `fsGLP` and trims the
              price by the fees set by
              the [GMXVault](https://arbiscan.io/address/0x489ee077994b6658eafa855c308275ead8097c4a)
        - Liquidation incentive is 5%
        - Interest setter is set
          to [0xc2cBd99bb35b22C43010a8c8266Cdff057f70BB1](https://arbiscan.io/address/0xc2cBd99bb35b22C43010a8c8266Cdff057f70BB1),
          but it's never really used because
          borrowing is permanently disabled
        - The `marketId` is 6
- Enables the following global operators:
    - `dfsGLP`: [0x34DF4E8062A8C8Ae97E3382B452bd7BF60542698](https://arbiscan.io/address/0x34DF4E8062A8C8Ae97E3382B452bd7BF60542698)
- `dfsGLP` is initialized with the following token converters:
    - `GLPWrapperTraderV1`: [0xFa60E0fC3da354d68F9d3ec5AC638d36bbB13bFe](https://arbiscan.io/address/0xFa60E0fC3da354d68F9d3ec5AC638d36bbB13bFe)
    - `GLPUnwrapperTraderV1`: [0xe2E26241E8572912d0fA3c213b935D10a4Fe2268](https://arbiscan.io/address/0xe2E26241E8572912d0fA3c213b935D10a4Fe2268)
- Enables the following contracts as unwrappers for `LiquidatorProxyV3WithLiquidityToken`
    - `GLPUnwrapperTraderV1`: [0xe2E26241E8572912d0fA3c213b935D10a4Fe2268](https://arbiscan.io/address/0xe2E26241E8572912d0fA3c213b935D10a4Fe2268)

#### [Safe Transaction #40](https://arbiscan.io/tx/0xeb0777a81adbf603d30575f6198503f2a11d465276d6dac2b7f1fcd3e49087bc) - 2/27/2023

- This transaction executes the queued transactions from Safe Transaction #39 and Safe Transaction #40 since the 24-hour
  time delay has passed.
