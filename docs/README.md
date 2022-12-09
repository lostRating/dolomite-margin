<p align="center"><img src="./dolomite-logo.png" width="256"/></p>

# Dolomite Documentation

- Trustless protocol for spot-settled margin trading, borrowing, lending, and spot trading
- Highly composable, allowing any user, smart contract, or entity to build on top of the protocol. DolomiteMargin's main
  entrypoint, the `operate` function, allows sending any number or permutation of [Actions](protocol.md#actions)
  through.
- Users can open as many isolated borrow/margin positions as they'd like with up to 32 assets per position
- Users can open as many cross-margin positions with up to 32 assets per position
- Dolomite's architecture allows it to list (potentially) thousands of assets
- All deposited assets are pooled in the smart contract, which maximizes efficiency and prevents liquidity
  fragmentation. All deposited assets are made available for trading, borrowing (if enabled), and lending.
- Flash loans and trading with external liquidity sources (like via Uniswap) are supported and do not charge any
  protocol fees (you just pay the Uniswap trading fees in this scenario).
- Built on Ethereum, Arbitrum & Web3

## Table of Contents

- [DolomiteMargin Protocol](protocol.md "Dolomite Documentation - DolomiteMargin Protocol")
- [Smart Contracts](contracts.md "Dolomite Documentation - Smart Contracts")
- [TypeScript Client](typescript.md "Dolomite Documentation - DolomiteMargin TypeScript Client")
- [Subgraph API](subgraph.md "Dolomite Documentation - Subgraph API")
- [Trading](trading.md "Dolomite Documentation - Trading")
- [Security](security.md "Dolomite Documentation - Security")

## Additional Communication Channels

- [Discord](https://discord.com/invite/uDRzrB2YgP)
- [Telegram](https://t.me/dolomite_official)
- [contact@dolomite.io](mailto:contact@dolomite.io)
