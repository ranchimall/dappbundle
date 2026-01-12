# RanchiMall Tron Web Wallet

## Introduction

This project implements the RanchiMall Tron Web Wallet, providing multi-chain wallet functionality and seamless integration between Tron, FLO, and Bitcoin blockchains.

## Functions required for RanchiMall Tron Web Wallet

1. **Address Lookup**

   - Allow search for any Tron blockchain address and display full transaction history.

2. **FLO Private Key Integration**

   - Enable sending of TRX using a valid FLO blockchain private key or using TRON blockchain address private key of the sender.

3. **Multi-Chain Address Generation**

   - On creating a new Tron address, automatically generate and display:
     - Equivalent FLO address
     - Equivalent Bitcoin address
     - Associated private keys for all three

4. **Private Key-Based Address Recovery**

   - Derive the original Tron address from a valid FLO, Bitcoin, or Tron private key.

5. **Balance Retrieval**

   - Show TRX balance for any address, using:
     - Tron blockchain address, or
     - Corresponding FLO / Bitcoin private keys

6. **Token Transfer**
   - Enable sending of TRX using:
     - Tron private key, or
     - Its corresponding/equivalent FLO and Bitcoin private keys
