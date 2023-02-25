# Governance Transactions

## Primer

In an effort to increase transparency, we will do our best document all governance transactions in this part of the
docs. As we transition to a DAO model, there will likely be a tidier archive of past proposals, on-chain votes, and
more, which will render this document deprecated.

## Transaction Logs

#### 2/23/2023 - [Queued Transaction #38](https://arbiscan.io/tx/0x9b6de66db51680b86d5e410c256725ecdbdd9825d50abcf8d798ff1a9e921a9f)

- This transaction is enqueued behind Dolomite
  Margin's [multisig time delay](https://arbiscan.io/address/0xE412991Fb026df586C2f2F9EE06ACaD1A34f585B).
- Disables the following global operators:
    - BorrowPositionProxyV1 (OLD; no balance check flags): `0x144DcFcd3287cF4372887Ef55225696924A82511`
    - LiquidatorProxyV1 (OLD; no registry): `0x6d13e5F5458f2bC4D6589093ee5632bE658Caa53`
    - LiquidatorProxyV1WithAmm (OLD; no registry): `0x7a20b3d15097c052222b25a5535451dd93aaa8c6`
    - LiquidatorProxyV2WithExternalLiquidity(OLD; no registry): `0x1bBC201f68f209A054E3e86891401d7255f8D3BA`
    - DepositWithdrawalProxy (OLD; no balance check flag): `0x9fA142853AF93D0CC3aF986C27688d54CE61ca8F`
    - DolomiteAmmRouterProxy (OLD; no balance check flag): `0xa09B4a3FC92965E587a94539ee8B35ECf42D5A08`
- Enables the following global operators:
    - LiquidatorProxyV1: `0x84b027f8fcefe40d044ccf9ccb54cc6e48c53450`
    - LiquidatorProxyV1WithAmm: `0xF61A26FF162685c22b880E568f607D0aEB41f1f2`
    - LiquidatorProxyV2WithExternalLiquidity: `0xCC24cAA605375c011a4F7E6BE7f6C2a3e377F368`
    - LiquidatorProxyV2WithLiquidityToken: `0x0c35882B90bc7Da4d499553A8C681Ce4e17fCC02`

#### 2/23/2023 - [Queued Transaction #39](https://arbiscan.io/tx/)

- 
