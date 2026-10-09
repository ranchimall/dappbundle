/* avaxSwap.js - swaps between AVAX and NAVIERSTOKES, both directions.
 *
 * Buying goes AVAX -> SOL -> NAVIERSTOKES. Selling goes the other way round.
 * The AVAX<->SOL hop rides the 1Click bridge (no login key needed):
 *   - ask for a quote, and it hands back a deposit address
 *   - send coins to that address from this wallet (a plain AVAX transfer)
 *   - ask "are we there yet?" until it says SUCCESS
 * The SOL<->NAV hop is a Jupiter swap, copied from our Solana wallet.
 *
 * One promise for the whole file: your private key never leaves this browser
 * tab, and it is never saved anywhere - not even in localStorage.
 */
(function (EXPORTS) {
  "use strict";
  const avaxSwap = EXPORTS;

  // ---------- Values we all agree on (checked against the live networks) ----------
  const ONECLICK = "https://1click.chaindefuser.com";
  const AVAX_ASSET = "nep245:v2_1.omni.hot.tg:43114_11111111111111111111";
  const SOL_ASSET = "nep141:sol.omft.near";
  const NAVIERSTOK_MINT = "4svsyTi5yRpVUUHFcKqDozCuEdhhP3H1VPy4xuTQpump";
  const SOL_MINT = "So11111111111111111111111111111111111111112";
  const TOKEN_2022_PROGRAM_ID = "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb";
  const SPL_TOKEN_PROGRAM_ID = "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA";
  const ASSOCIATED_TOKEN_PROGRAM_ID = newSolanaPubkey(
    "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"
  );
  const AVAX_GAS_LIMIT = 21000; // a plain transfer always costs this much gas
  const SOL_DEPOSIT_BUFFER = 100000n; // lamports kept back for the SOL deposit fee
  const WSOL_ATA_RENT = 2039280n; // wrapping SOL locks this much rent mid-swap
  const POLL_MS = 8000;
  const MAX_POLLS = 225; // give up polling after ~30 minutes; you can resume later
  const LS_KEY = "avaxSwap.pending.v1";

  function newSolanaPubkey(s) {
    return new solanaWeb3.PublicKey(s);
  }

  // ---------- Our line to Solana (a public RPC; no secret keys live here) ----------
  let _connection = null;
  function getConnection() {
    if (!_connection) {
      _connection = new solanaWeb3.Connection(
        "https://solana.publicnode.com",
        "confirmed"
      );
    }
    return _connection;
  }

  async function broadcastRawTransaction(serializedTx, options) {
    return getConnection().sendRawTransaction(serializedTx, options);
  }

  async function confirmAndReturn(txid, blockhash, lastValidBlockHeight) {
    const connection = getConnection();
    if (blockhash && lastValidBlockHeight) {
      // The network sometimes cries "expired!" while your transaction is
      // actually still on its way. Don't take its word for it - go and
      // check the signature yourself below, that's the only truth that counts.
      try {
        const res = await connection.confirmTransaction(
          { signature: txid, blockhash, lastValidBlockHeight },
          "confirmed"
        );
        if (res && res.value && res.value.err) {
          throw new Error(
            "Transaction failed on-chain: " + JSON.stringify(res.value.err)
          );
        }
        return txid;
      } catch (e) {
        if (e && e.message && e.message.indexOf("failed on-chain") === 0)
          throw e;
        console.warn("Fast confirm inconclusive, polling status:", e.message);
      }
    }
    // Our transactions take their sweet time here, longer than the Solana
    // wallet waits. So we keep asking for up to ~2.5 minutes instead of 60s.
    for (let i = 0; i < 150; i++) {
      await new Promise((r) => setTimeout(r, 1000));
      const statuses = await connection
        .getSignatureStatuses([txid])
        .catch(() => null);
      const status = statuses && statuses.value && statuses.value[0];
      if (status) {
        if (status.err) {
          throw new Error(
            "Transaction failed on-chain: " + JSON.stringify(status.err)
          );
        }
        if (
          status.confirmationStatus === "confirmed" ||
          status.confirmationStatus === "finalized"
        ) {
          return txid;
        }
      }
    }
    throw new Error("Transaction not confirmed after 150s. Signature: " + txid);
  }

  async function jupiterSwapExactIn(
    senderKeypair,
    inputMint,
    outputMint,
    amountRaw,
    slippageBps,
    label,
    onAttempt,
    onHighSlippage
  ) {
    const connection = getConnection();
    const userPublicKey = senderKeypair.publicKey.toBase58();
    const shortIn = String(inputMint).slice(0, 4);
    const shortOut = String(outputMint).slice(0, 4);
    for (let attempt = 1; attempt <= 3; attempt++) {
      let txid = null;
      try {
        if (onAttempt) {
          try {
            onAttempt(attempt);
          } catch (_) {
            /* updating the screen must never break the swap itself */
          }
        }
        const quoteBase =
          "https://lite-api.jup.ag/swap/v1/quote?inputMint=" +
          inputMint +
          "&outputMint=" +
          outputMint +
          "&amount=" +
          amountRaw +
          "&slippageBps=" +
          slippageBps;
        let quote = null;
        let quoteErr = null;
        const suffixes = ["&maxAccounts=48", ""];
        for (const suffix of suffixes) {
          try {
            const quoteRes = await fetch(quoteBase + suffix);
            if (!quoteRes.ok) {
              const errText = await quoteRes.text();
              quoteErr = new Error(
                "Jupiter quote failed (" +
                  quoteRes.status +
                  "): " +
                  errText.slice(0, 300)
              );
              continue;
            }
            const q = await quoteRes.json();
            if (!q.routePlan || q.routePlan.length === 0) {
              quoteErr = new Error(
                "No Jupiter route found for " +
                  shortIn +
                  " -> " +
                  shortOut +
                  " (outAmount=" +
                  (q.outAmount !== undefined ? q.outAmount : "n/a") +
                  ")"
              );
              continue;
            }
            quote = q;
            break;
          } catch (e) {
            quoteErr = e;
          }
        }
        if (!quote) throw quoteErr;

        const impact = parseFloat(quote.priceImpactPct);
        if (Number.isFinite(impact) && impact > 50) {
          let go = false;
          if (onHighSlippage) {
            try { go = await onHighSlippage({ impact, quote }); } catch (_) { go = false; }
          }
          if (!go) throw new Error("Price impact " + impact.toFixed(2) + "% is beyond the 50% auto-limit - swap cancelled.");
        }

        const swapRes = await fetch("https://lite-api.jup.ag/swap/v1/swap", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            quoteResponse: quote,
            userPublicKey: userPublicKey,
            wrapAndUnwrapSol: true,
            dynamicComputeUnitLimit: true,
            prioritizationFeeLamports: "auto",
          }),
        });
        if (!swapRes.ok) {
          const errText = await swapRes.text();
          throw new Error(
            "Jupiter swap build failed (" +
              swapRes.status +
              "): " +
              errText.slice(0, 300)
          );
        }
        const swapJson = await swapRes.json();
        const swapTransaction = swapJson.swapTransaction;
        const lastValidBlockHeight = swapJson.lastValidBlockHeight;
        if (!swapTransaction)
          throw new Error("Jupiter returned no swapTransaction");
        window.Buffer = window.Buffer || ethereumjs.Buffer.Buffer;
        const txBuf = Uint8Array.from(atob(swapTransaction), (c) =>
          c.charCodeAt(0)
        );
        if (txBuf.length > 1232)
          throw new Error(
            "Jupiter route too large (" +
              txBuf.length +
              " bytes) - retrying for a smaller route"
          );
        const swapTx = solanaWeb3.VersionedTransaction.deserialize(txBuf);
        swapTx.sign([senderKeypair]);
        txid = await broadcastRawTransaction(swapTx.serialize(), {
          skipPreflight: false,
          maxRetries: 3,
        });
        const swapBlockhash =
          swapTx.message && swapTx.message.recentBlockhash;
        if (swapBlockhash && lastValidBlockHeight) {
          return await confirmAndReturn(txid, swapBlockhash, lastValidBlockHeight);
        }
        return await confirmAndReturn(txid);
      } catch (e) {
        console.log(label + " attempt " + attempt + "/3 failed:", e.message);
        if (txid) {
          // We already sent it, so let's see what really happened before
          // panicking. Ask the network a few times - sometimes it just
          // hasn't heard about our transaction yet.
          const CONFIRM_POLLS = 10;
          const CONFIRM_BASE_MS = 2000;
          for (let cp = 0; cp < CONFIRM_POLLS; cp++) {
            await new Promise((r) =>
              setTimeout(r, CONFIRM_BASE_MS + cp * 1000)
            );
            let st = null;
            try {
              const statuses = await connection.getSignatureStatuses([txid]);
              st = statuses && statuses.value && statuses.value[0];
            } catch (_) {
              st = null;
            }
            if (
              st &&
              !st.err &&
              (st.confirmationStatus === "confirmed" ||
                st.confirmationStatus === "finalized")
            ) {
              console.log(
                label + " confirmed after " + (cp + 1) + " extra polls"
              );
              return txid;
            }
            if (st && st.err) {
              throw new Error(
                "Transaction failed on-chain: " + JSON.stringify(st.err)
              );
            }
            // No answer yet only means "not seen", not "failed" - keep waiting.
          }

          // Still nothing after all our checks. Rather than give up, we build
          // a brand-new transaction (fresh prices, fresh expiry) and try again.
          if (attempt < 3) {
            console.log(
              label +
                " signature " +
                txid +
                " still unconfirmed after " +
                CONFIRM_POLLS +
                " polls - retrying with a fresh transaction"
            );
            await new Promise((r) => setTimeout(r, 2000));
            continue; // next attempt in the outer for-loop
          }
          throw new Error(
            "Swap submission unconfirmed after extended polling (signature: " +
              txid +
              "). Use 'Retry swap' to try again. Original error: " +
              e.message
          );
        }
        if (attempt === 3) throw e;
        await new Promise((r) => setTimeout(r, 1000));
      }
    }
  }

  function getAssociatedTokenAddress(mint, owner, tokenProgramId) {
    const found = solanaWeb3.PublicKey.findProgramAddressSync(
      [owner.toBuffer(), tokenProgramId.toBuffer(), mint.toBuffer()],
      ASSOCIATED_TOKEN_PROGRAM_ID
    );
    return found[0];
  }

  async function estimateBuySolCost(userPublicKey, targetMintStr) {
    const connection = getConnection();
    const target = newSolanaPubkey(targetMintStr);
    const mintAcc = await connection.getAccountInfo(target).catch(() => null);
    if (!mintAcc) throw new Error("Unknown token mint");
    const program = mintAcc.owner;
    const isLegacy = program.equals(newSolanaPubkey(SPL_TOKEN_PROGRAM_ID));
    const targetAta = getAssociatedTokenAddress(target, userPublicKey, program);
    const ataSize = isLegacy ? 165 : 250;
    const results = await Promise.all([
      connection.getAccountInfo(targetAta).catch(() => null),
      connection.getMinimumBalanceForRentExemption(ataSize),
    ]);
    const info = results[0];
    const rent = results[1];
    let lamports = 5000n + 40000n + 100000n;
    if (!info) lamports += BigInt(rent);
    return lamports;
  }

  async function getSolBalanceLamports(solAddress) {
    return BigInt(
      await getConnection().getBalance(newSolanaPubkey(solAddress))
    );
  }

  async function getNavierstokBalance(solAddress) {
    // Little gotcha we learned the hard way: one balance lookup needs a
    // special paid RPC and fails here, so we read the same number through
    // the free lookup instead. Same answer, no error.
    const connection = getConnection();
    const navMint = newSolanaPubkey(NAVIERSTOK_MINT);
    const token2022 = newSolanaPubkey(TOKEN_2022_PROGRAM_ID);
    const ata = getAssociatedTokenAddress(
      navMint,
      newSolanaPubkey(solAddress),
      token2022
    );
    const parsed = await connection.getParsedAccountInfo(ata).catch(() => null);
    const amt =
      parsed &&
      parsed.value &&
      parsed.value.data &&
      parsed.value.data.parsed &&
      parsed.value.data.parsed.info &&
      parsed.value.data.parsed.info.tokenAmount;
    if (!amt) return { raw: 0n, decimals: 6, exists: false };
    return { raw: BigInt(amt.amount), decimals: amt.decimals, exists: true };
  }

  function formatNavReceived(navAfter, navBefore) {
    try {
      const before = navBefore ? navBefore.raw : 0n;
      if (navAfter && navAfter.raw > before) {
        return (
          "+" +
          (
            Number(navAfter.raw - before) / Math.pow(10, navAfter.decimals)
          ).toFixed(2) +
          " NAVIERSTOKES"
        );
      }
    } catch (_) {
      /* fall through to balance */
    }
    return formatNavAmount(navAfter);
  }

  function formatNavAmount(nav) {
    if (!nav) return "unknown (check wallet)";
    return (
      (Number(nav.raw) / Math.pow(10, nav.decimals)).toFixed(2) +
      " NAVIERSTOKES"
    );
  }

  // ---------- Talking to the 1Click bridge ----------
  async function oneClickQuote(opts) {
    // Tell us what you're swapping: how much, from where, to where.
    // Leave the coin pair out and it assumes AVAX -> SOL.
    const body = {
      dry: !!opts.dry,
      swapType: "EXACT_INPUT",
      slippageTolerance: 100,
      originAsset: opts.originAsset || AVAX_ASSET,
      destinationAsset: opts.destinationAsset || SOL_ASSET,
      amount: String(opts.amountSat),
      depositType: "ORIGIN_CHAIN",
      refundTo: opts.refundTo,
      refundType: "ORIGIN_CHAIN",
      recipient: opts.recipient,
      recipientType: "DESTINATION_CHAIN",
      deadline: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
    };
    const res = await fetch(ONECLICK + "/v0/quote", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const text = await res.text();
    let json = null;
    try {
      json = JSON.parse(text);
    } catch (_) {
      json = null;
    }
    if (!res.ok) {
      throw new Error(
        "1Click quote failed (" +
          res.status +
          "): " +
          ((json && (json.message || json.error)) || text).slice(0, 300)
      );
    }
    if (!json || !json.quote) throw new Error("1Click quote returned no data");
    return json;
  }

  async function oneClickStatus(depositAddress) {
    const res = await fetch(
      ONECLICK + "/v0/status?depositAddress=" + encodeURIComponent(depositAddress)
    );
    if (!res.ok) {
      const errText = await res.text();
      throw new Error(
        "1Click status failed (" + res.status + "): " + errText.slice(0, 200)
      );
    }
    return res.json();
  }

  async function submitDeposit(txid, depositAddress) {
    // A friendly nudge that helps the bridge notice us faster. If it fails,
    // no harm done - our regular polling below will spot the deposit anyway.
    await fetch(ONECLICK + "/v0/deposit/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ txHash: txid, depositAddress: depositAddress }),
    });
  }

  // ---------- Remembering unfinished swaps (addresses only, never keys) ----------
  function savePending(entry) {
    try {
      const safe = {
        depositAddress: entry.depositAddress,
        deadline: entry.deadline,
        avaxAddr: entry.avaxAddr,
        solAddress: entry.solAddress,
        avaxTxid: entry.avaxTxid || null,
        avaxAmount: entry.avaxAmount,
        stage: entry.stage,
      };
      localStorage.setItem(LS_KEY, JSON.stringify(safe));
    } catch (e) {
      console.warn("Could not persist pending swap:", e);
    }
  }

  function loadPending() {
    try {
      const raw = localStorage.getItem(LS_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }

  function clearPending() {
    try {
      localStorage.removeItem(LS_KEY);
    } catch (_) {}
  }

  avaxSwap.loadPending = loadPending;
  avaxSwap.clearPending = clearPending;

  // ---------- Turning one private key into every address we need ----------
  // Accepts the same keys this wallet accepts (AVAX/FLO/BTC, WIF or hex) and
  // boils them down to the raw 32-byte seed. Garbage in -> loud error out
  // (never a silently generated key).
  function avaxSeedHex(input) {
    const v = String(input || "").trim();
    if (!v) throw new Error("Empty key");
    const hex = v.startsWith("0x") ? v.slice(2) : v;
    if (/^[0-9a-fA-F]{64}$/.test(hex)) return hex.toLowerCase();
    if (/^[0-9a-fA-F]{128}$/.test(hex)) return hex.slice(0, 64).toLowerCase();
    const decode = Bitcoin.Base58.decode(v);
    const keyWithVersion = decode.slice(0, decode.length - 4);
    let key = keyWithVersion.slice(1);
    if (key.length >= 33 && key[key.length - 1] === 0x01) {
      key = key.slice(0, key.length - 1);
    }
    if (key.length !== 32) throw new Error("Invalid private key format");
    return Crypto.util.bytesToHex(key);
  }

  async function deriveAll(input) {
    const seedHex = avaxSeedHex(input);
    const mc = await avaxCrypto.generateMultiChain(input);
    if (!mc || !mc.AVAX || !mc.AVAX.address)
      throw new Error("Could not derive AVAX address from this key");
    const solAddress = floSolana.solanaSeed2SolanaAddress(seedHex);
    const seedBytes = Uint8Array.from(Crypto.util.hexToBytes(seedHex));
    const solKeypair = solanaWeb3.Keypair.fromSeed(seedBytes);
    if (solKeypair.publicKey.toBase58() !== solAddress)
      throw new Error("Solana keypair mismatch - refusing to continue");
    return {
      avaxAddr: mc.AVAX.address,
      avaxHex: mc.AVAX.privateKey,
      solAddress: solAddress,
      solKeypair: solKeypair,
    };
  }

  function libsReady() {
    const missing = [];
    if (typeof avaxCrypto === "undefined") missing.push("avaxCrypto");
    if (typeof getBalanceRPC === "undefined") missing.push("avaxBlockchainAPI");
    if (typeof solanaWeb3 === "undefined") missing.push("solanaWeb3");
    if (typeof floSolana === "undefined") missing.push("floSolana");
    if (typeof ethereumjs === "undefined") missing.push("ethereumjs");
    if (typeof ethers === "undefined") missing.push("ethers");
    return missing;
  }

  // ---------- Small helpers that borrow the page's own popup style ----------
  function uiNotify(msg, type) {
    if (typeof showNotification === "function") showNotification(msg, type);
    else console.log("[" + type + "] " + msg);
  }

  function uiLoading(btnId, on) {
    try {
      const el = document.getElementById(btnId);
      if (el) el.disabled = !!on;
    } catch (_) {}
  }

  function fmtSol(amountOutFormatted) {
    const n = parseFloat(amountOutFormatted);
    return isFinite(n) ? n.toFixed(6) : String(amountOutFormatted);
  }

  function avaxAmountStr(weiStr) {
    try {
      return ethers.utils.formatEther(weiStr);
    } catch (_) {
      return String(weiStr);
    }
  }

  // ---------- The little 1-2-3-4-5 tracker under the Buy button ----------
  const STAGES = ["deposit", "bridging", "received", "swapping", "done"];
  function setStage(stage) {
    const allDone = stage === "done";
    STAGES.forEach((s, i) => {
      const el = document.getElementById("swapStep_" + s);
      if (!el) return;
      const activeIdx = STAGES.indexOf(stage);
      el.classList.toggle("step-done", allDone || i < activeIdx);
      el.classList.toggle("step-active", !allDone && s === stage);
    });
  }
  avaxSwap.setStage = setStage;

  // ---------- What we're working on right now (lives only in memory) ----------
  let active = null;

  const SWAP_HINT_DEFAULT =
    '<small class="form-text">Min ~0.2 AVAX + gas</small>';

  // ---------- Step 0: the moment you type your key, show your addresses ----------
  avaxSwap.onWifInput = function () {
    const missing = libsReady();
    if (missing.length) {
      uiNotify("Swap libraries not loaded: " + missing.join(", "), "error");
      return;
    }
    const input = document.getElementById("swapWif").value.trim();
    const addrRow = document.getElementById("swapDerivedRow");
    if (!input) {
      if (addrRow) addrRow.style.display = "none";
      return;
    }
    deriveAll(input)
      .then((d) => {
        document.getElementById("swapAvaxAddr").textContent = d.avaxAddr;
        document.getElementById("swapSolAddr").textContent = d.solAddress;
        document.getElementById("swapAvaxBal").textContent = "...";
        document.getElementById("swapSolBal").textContent = "...";
        document.getElementById("swapNavBal").textContent = "...";
        if (addrRow) addrRow.style.display = "block";
        getBalanceRPC(d.avaxAddr)
          .then((b) => {
            document.getElementById("swapAvaxBal").textContent =
              parseFloat(b.avax).toFixed(6) + " AVAX";
          })
          .catch(() => {
            document.getElementById("swapAvaxBal").textContent = "unavailable";
          });
        getSolBalanceLamports(d.solAddress)
          .then((lam) => {
            document.getElementById("swapSolBal").textContent =
              (Number(lam) / 1e9).toFixed(6) + " SOL";
          })
          .catch(() => {
            document.getElementById("swapSolBal").textContent = "unavailable";
          });
        getNavierstokBalance(d.solAddress)
          .then((nav) => {
            document.getElementById("swapNavBal").textContent =
              (Number(nav.raw) / Math.pow(10, nav.decimals)).toFixed(2) + " NAV";
          })
          .catch(() => {
            document.getElementById("swapNavBal").textContent = "unavailable";
          });
        avaxSwap.onPreview();
        avaxSwap.onSellPreview();
      })
      .catch(() => {
        if (addrRow) addrRow.style.display = "none";
        document.getElementById("swapPreview").innerHTML = SWAP_HINT_DEFAULT;
      });
  };

  // ---------- Step 1: a pretend quote, just for looking (costs nothing) ----------
  let previewTimer = null;
  avaxSwap.onPreview = function () {
    if (previewTimer) clearTimeout(previewTimer);
    previewTimer = setTimeout(avaxSwap.refreshPreview, 600);
  };

  avaxSwap.refreshPreview = async function () {
    const box = document.getElementById("swapPreview");
    const input = document.getElementById("swapWif").value.trim();
    const amountStr = document.getElementById("swapAmount").value.trim();
    const amount = parseFloat(amountStr);
    if (!input || !isFinite(amount) || amount <= 0) {
      box.innerHTML = SWAP_HINT_DEFAULT;
      return;
    }
    let d;
    try {
      d = await deriveAll(input);
    } catch (e) {
      box.innerHTML = SWAP_HINT_DEFAULT;
      return;
    }
    let amountSat;
    try {
      amountSat = ethers.utils.parseEther(amountStr).toString();
    } catch (e) {
      box.innerHTML = SWAP_HINT_DEFAULT;
      return;
    }
    box.innerHTML = '<small class="form-text">Fetching quote...</small>';
    try {
      const q = await oneClickQuote({
        dry: true,
        amountSat: amountSat,
        refundTo: d.avaxAddr,
        recipient: d.solAddress,
      });
      const quote = q.quote;
      const outSol = parseFloat(quote.amountOutFormatted);
      const tooSmall =
        isFinite(outSol) && outSol < 0.008
          ? " &middot; may be too small for Solana rent"
          : "";
      box.innerHTML =
        '<small class="form-text">&asymp; ' +
        fmtSol(quote.amountOutFormatted) +
        " SOL (min " +
        (parseInt(quote.minAmountOut, 10) / 1e9).toFixed(6) +
        " SOL) &middot; ~3-day window" +
        tooSmall +
        "</small>";
    } catch (e) {
      box.innerHTML = SWAP_HINT_DEFAULT;
    }
  };

  // ---------- Step 2: check everything, then ask "are you sure?" ----------
  avaxSwap.onStartSwap = async function () {
    const missing = libsReady();
    if (missing.length) {
      uiNotify("Swap libraries not loaded: " + missing.join(", "), "error");
      return;
    }
    const input = document.getElementById("swapWif").value.trim();
    const amountStr = document.getElementById("swapAmount").value.trim();
    const amount = parseFloat(amountStr);
    if (!input) return uiNotify("Enter your private key", "error");
    if (!isFinite(amount) || amount <= 0)
      return uiNotify("Enter a valid AVAX amount", "error");
    let d;
    try {
      d = await deriveAll(input);
    } catch (e) {
      return uiNotify("Invalid private key format", "error");
    }
    uiLoading("swapBtn", true);
    try {
      // Same safety check the Send tab does: balance must cover amount + gas.
      const bal = await getBalanceRPC(d.avaxAddr);
      const balAvax = parseFloat(bal.avax);
      const gasPrice = await getGasPrice();
      const gasFee =
        parseFloat(ethers.utils.formatEther(String(gasPrice))) * AVAX_GAS_LIMIT;
      if (!(balAvax >= amount + gasFee))
        throw new Error(
          "Insufficient AVAX balance: have " +
            balAvax +
            ", need " +
            (amount + gasFee).toFixed(6) +
            " (amount + gas)"
        );
      const q = await oneClickQuote({
        dry: true,
        amountSat: ethers.utils.parseEther(amountStr).toString(),
        refundTo: d.avaxAddr,
        recipient: d.solAddress,
      });
      active = {
        d: d,
        avaxAmountStr: amountStr,
        avaxAmount: amount,
        expectedSol: fmtSol(q.quote.amountOutFormatted),
        gasFee: gasFee,
        stage: "preview",
      };
      showSwapConfirm({
        title: "Confirm Bridge: AVAX to SOL",
        rows: [
          ["You send", amountStr + " AVAX (+ gas ~" + gasFee.toFixed(6) + ")"],
          ["You receive (est.)", "&asymp;" + active.expectedSol + " SOL"],
          ["SOL destination", d.solAddress],
          ["Window", "Send soon - floating rate. Exact expiry shown after you confirm."],
        ],
        confirmLabel: "Confirm & Bridge",
        onConfirm: avaxSwap.onConfirmBridge,
      });
    } catch (e) {
      uiNotify("Swap preflight failed: " + (e.message || e), "error");
    } finally {
      uiLoading("swapBtn", false);
    }
  };

  // ---------- Our own "are you sure?" box (the built-in one only speaks sends) ----------
  let swapConfirmCancel = null;
  function askHighSlippage(info) {
    return new Promise((resolve) => {
      showSwapConfirm({
        title: "High price impact",
        rows: [
          ["Price impact", info.impact.toFixed(2) + "%"],
          ["Limit", "Swaps beyond 50% need your explicit approval."],
        ],
        confirmLabel: "Swap anyway",
        onConfirm: () => resolve(true),
        onCancel: () => resolve(false),
      });
    });
  }
  function showSwapConfirm(opts) {
    swapConfirmCancel = typeof opts.onCancel === "function" ? opts.onCancel : null;
    document.getElementById("swapConfirmTitle").textContent =
      opts.title || "Confirm Swap";
    document.getElementById("swapConfirmRows").innerHTML = opts.rows
      .map(
        (r) =>
          '<div class="detail-group"><label>' +
          r[0] +
          ":</label>" +
          '<div class="confirm-value address-value">' +
          r[1] +
          "</div></div>"
      )
      .join("");
    const btn = document.getElementById("swapConfirmBtn");
    btn.innerHTML = opts.confirmLabel || "Confirm";
    const fresh = btn.cloneNode(true);
    btn.parentNode.replaceChild(fresh, btn);
    fresh.addEventListener("click", function () {
      swapConfirmCancel = null;
      avaxSwap.closeSwapConfirm();
      opts.onConfirm();
    });
    document.getElementById("swapConfirmPopup").style.display = "block";
    document.body.style.overflow = "hidden";
  }
  avaxSwap.closeSwapConfirm = function () {
    document.getElementById("swapConfirmPopup").style.display = "none";
    document.body.style.overflow = "auto";
    const cb = swapConfirmCancel;
    swapConfirmCancel = null;
    if (cb) {
      try { cb(); } catch (_) {}
    }
  };

  // ---------- Steps 3-5: the real quote, sending the deposit, waving at the bridge ----------
  avaxSwap.onConfirmBridge = async function () {
    if (!active) return;
    uiLoading("swapBtn", true);
    setStage("deposit");
    try {
      const q = await oneClickQuote({
        dry: false,
        amountSat: ethers.utils.parseEther(active.avaxAmountStr).toString(),
        refundTo: active.d.avaxAddr,
        recipient: active.d.solAddress,
      });
      const depositAddress = q.quote.depositAddress;
      const deadline = q.quote.deadline || q.quote.timeWhenInactive;
      if (!depositAddress) throw new Error("Bridge returned no deposit address");
      if (!/^0x[0-9a-fA-F]{40}$/.test(depositAddress))
        throw new Error("Bridge returned an invalid deposit address");
      active.depositAddress = depositAddress;
      active.deadline = deadline;
      active.solBefore = await getSolBalanceLamports(active.d.solAddress).catch(
        () => 0n
      );
      active.stage = "deposit";
      savePending({
        depositAddress: depositAddress,
        deadline: deadline,
        avaxAddr: active.d.avaxAddr,
        solAddress: active.d.solAddress,
        avaxTxid: null,
        avaxAmount: active.avaxAmountStr,
        stage: "deposit",
      });

      // The deposit goes out exactly like the Send tab sends: same prepare
      // helper, same ethers wallet, same confirmation wait. Only the amount
      // is special - it must equal the quoted wei to the last unit.
      const prepared = await prepareAvalancheTransaction(
        document.getElementById("swapWif").value.trim(),
        depositAddress,
        active.avaxAmountStr
      );
      const provider = new ethers.providers.JsonRpcProvider(prepared.rpcUrl);
      const ethersWallet = new ethers.Wallet(prepared.cleanPrivateKey, provider);
      const txResponse = await ethersWallet.sendTransaction({
        to: prepared.recipientAddress,
        value: ethers.utils.parseEther(active.avaxAmountStr),
        gasLimit: prepared.gasLimit,
        gasPrice: prepared.gasPrice,
        nonce: prepared.nonce,
        chainId: prepared.chainId,
      });
      const receipt = await txResponse.wait();
      const txid = receipt.transactionHash || txResponse.hash;
      active.avaxTxid = txid;
      active.stage = "bridging";
      savePending({
        depositAddress: depositAddress,
        deadline: deadline,
        avaxAddr: active.d.avaxAddr,
        solAddress: active.d.solAddress,
        avaxTxid: txid,
        avaxAmount: active.avaxAmountStr,
        stage: "bridging",
      });

      try {
        await submitDeposit(txid, depositAddress);
      } catch (_) {
        /* a little wave so the bridge notices us sooner; our regular checks would find it anyway */
      }
      setStage("bridging");
      renderBridgeStatus(
        "Deposit sent. Waiting for SOL on " +
          active.d.solAddress +
          " ...",
        txid
      );
      pollStatus(false);
    } catch (e) {
      uiNotify("Bridge failed: " + (e.message || e), "error");
      document.getElementById("swapResult").innerHTML =
        '<div class="form-text">Bridge failed: ' +
        String(e.message || e).slice(0, 300) +
        "</div>";
      uiLoading("swapBtn", false);
    }
  };

  function renderBridgeStatus(msg, avaxTxid) {
    document.getElementById("swapResult").innerHTML =
      '<div class="blockchain-section">' +
      '<div class="detail-row"><label>Status</label>' +
      '<div class="value-container"><code>' +
      msg +
      "</code></div></div>" +
      (avaxTxid
        ? '<div class="detail-row"><label>AVAX deposit</label>' +
          '<div class="value-container"><code>' +
          avaxTxid +
          "</code></div></div>"
        : "") +
      '<div class="detail-row"><label>Bridge deposit address</label>' +
      '<div class="value-container"><code>' +
      active.depositAddress +
      "</code></div></div>" +
      "</div>";
  }

  // ---------- Step 6: keep asking the bridge "is my money there yet?" ----------
  async function pollStatus() {
    let polls = 0;
    while (polls < MAX_POLLS) {
      polls++;
      await new Promise((r) => setTimeout(r, POLL_MS));
      let st;
      try {
        st = await oneClickStatus(active.depositAddress);
      } catch (e) {
        console.warn("Status poll failed, retrying:", e.message);
        continue;
      }
      const status = st.status;
      const details = st.swapDetails || {};
      if (status === "SUCCESS") {
        setStage("received");
        await onBridgeSuccess(details);
        return;
      }
      if (
        status === "REFUNDED" ||
        status === "FAILED" ||
        status === "INCOMPLETE_DEPOSIT"
      ) {
        onBridgeTerminal(status, details);
        return;
      }
      renderBridgeStatus(
        "Bridging... (" + status + ", poll " + polls + ")",
        active.avaxTxid
      );
    }
    uiNotify(
      "Still bridging after ~30 min. Your progress is saved - use Resume to keep waiting.",
      "error"
    );
    uiLoading("swapBtn", false);
  }
  avaxSwap.pollStatus = pollStatus;

  function onBridgeTerminal(status, details) {
    clearPending();
    const refunded =
      details.refundedAmountFormatted || details.refundedAmount || "0";
    const reason = details.refundReason || status;
    document.getElementById("swapResult").innerHTML =
      '<div class="blockchain-section">' +
      '<div class="detail-row"><label>Bridge result</label>' +
      '<div class="value-container"><code>' +
      status +
      "</code></div></div>" +
      '<div class="detail-row"><label>Refunded</label>' +
      '<div class="value-container"><code>' +
      refunded +
      "</code></div></div>" +
      '<div class="detail-row"><label>Reason</label>' +
      '<div class="value-container"><code>' +
      reason +
      "</code></div></div>" +
      "</div>";
    uiNotify("Bridge ended: " + status + ". Refunded: " + refunded, "error");
    clearWif();
    uiLoading("swapBtn", false);
  }

  // ---------- Step 7: count the arrived SOL, hold back the fees, ask once more ----------
  async function onBridgeSuccess(details) {
    try {
      const solAfter = await getSolBalanceLamports(active.d.solAddress);
      const solBefore = active.solBefore || 0n;
      let received = solAfter - solBefore;
      if (received <= 0n && details.amountOut) {
        try {
          received = BigInt(details.amountOut);
        } catch (_) {}
      }
      if (received <= 0n)
        throw new Error(
          "Bridge reports success but no new SOL is visible. Wait a minute and use Retry swap."
        );
      const userPubkey = active.d.solKeypair.publicKey;
      // Same safety check as the Solana wallet: your balance must cover the
      // swap plus the network's own costs, or we stop here with a clear
      // message instead of a confusing on-chain failure.
      const feeLamports = await estimateBuySolCost(
        userPubkey,
        NAVIERSTOK_MINT
      );
      let swapLamports = received - feeLamports;
      const maxFromBalance = solAfter - feeLamports;
      if (maxFromBalance < swapLamports) swapLamports = maxFromBalance;
      if (swapLamports <= 0n) {
        const requiredSol = (
          Number(received) / 1e9 +
          Number(feeLamports) / 1e9
        ).toFixed(6);
        const haveSol = (Number(solAfter) / 1e9).toFixed(6);
        throw new Error(
          "Not enough SOL. This swap needs about " +
            requiredSol +
            " SOL total (swap amount + network fees + account setup). " +
            "This wallet has " +
            haveSol +
            " SOL. Top up SOL or bridge more AVAX - received SOL stays put."
        );
      }
      active.swapLamports = swapLamports;
      active.swapSol = Number(swapLamports) / 1e9;
      active.feeSol = (Number(feeLamports) / 1e9).toFixed(6);
      try {
        active.navBefore = await getNavierstokBalance(active.d.solAddress);
      } catch (_) {
        active.navBefore = { raw: 0n, decimals: 6, exists: false };
      }
      active.stage = "received";
      savePending({
        depositAddress: active.depositAddress,
        deadline: active.deadline,
        avaxAddr: active.d.avaxAddr,
        solAddress: active.d.solAddress,
        avaxTxid: active.avaxTxid,
        avaxAmount: active.avaxAmountStr,
        stage: "received",
      });
      renderBridgeDone();
      showSwapConfirm({
        title: "Confirm Swap: SOL to NAVIERSTOK",
        rows: [
          [
            "Swap",
            "You are about to swap " +
              active.swapSol.toFixed(6) +
              " SOL for NAVIERSTOK via Jupiter. Est. network cost: ~" +
              active.feeSol +
              " SOL.",
          ],
          ["SOL wallet", active.d.solAddress],
        ],
        confirmLabel: "Confirm & Swap",
        onConfirm: avaxSwap.onConfirmJupiter,
      });
    } catch (e) {
      uiNotify("Could not prepare Jupiter swap: " + (e.message || e), "error");
      // The first hop worked, so its SOL is sitting in your wallet. Offer to
      // finish the job without bridging a second time.
      renderRetry(active.avaxTxid, String(e.message || e));
      uiLoading("swapBtn", false);
    }
  }

  // Fixes an embarrassing old bug: the card used to keep saying "bridging..."
  // long after the bridge had finished. Now it celebrates right away.
  function renderBridgeDone() {
    document.getElementById("swapResult").innerHTML =
      '<div class="blockchain-section">' +
      '<div class="detail-row"><label>Bridge</label>' +
      '<div class="value-container"><code>Complete - ' +
      (active && active.swapSol ? active.swapSol.toFixed(6) : "") +
      " SOL ready. Confirm the swap in the popup.</code></div></div>" +
      '<div class="detail-row"><label>AVAX deposit</label>' +
      '<div class="value-container"><code>' +
      (active && active.avaxTxid ? active.avaxTxid : "-") +
      "</code></div></div>" +
      "</div>";
  }

  // The happy ending card, dressed like the Send tab: checkmark, headline,
  // then rows with little copy buttons.
  // We show: your AVAX deposit, the Solana swap link, and what you got.
  function renderSwapSuccess(opts) {
    const copyFor = (text, label) =>
      '<button class="btn-icon" onclick="copyToClipboard(\'' +
      text +
      '\')" title="Copy ' +
      label +
      '"><i class="fas fa-copy"></i></button>';
    const noteRow = opts.note
      ? '<div class="detail-row"><label><i class="fas fa-info-circle"></i> Note</label>' +
        '<div class="value-container"><code>' +
        opts.note +
        "</code></div></div>"
      : "";
    const solRow = opts.solTxid
      ? '<div class="detail-row"><label><i class="fas fa-exchange-alt"></i> Solana swap</label>' +
        '<div class="value-container"><code><a href="https://solscan.io/tx/' +
        opts.solTxid +
        '" target="_blank" rel="noopener">' +
        opts.solTxid +
        "</a></code> " +
        copyFor(opts.solTxid, "Solana txid") +
        "</div></div>"
      : "";
    document.getElementById("swapResult").innerHTML =
      '<div class="wallet-generated-success">' +
      '<div class="success-icon"><i class="fas fa-check"></i></div>' +
      '<div class="success-message"><h3>Swap Complete!</h3>' +
      "<p>" +
      opts.headline +
      "</p></div></div>" +
      '<div class="blockchain-section">' +
      '<div class="blockchain-header"><h4><i class="fas fa-receipt"></i> Swap Details</h4></div>' +
      '<div class="detail-row"><label><i class="fas fa-coins"></i> Received</label>' +
      '<div class="value-container"><code>' +
      opts.receivedStr +
      "</code></div></div>" +
      '<div class="detail-row"><label><i class="fas fa-hashtag"></i> AVAX deposit</label>' +
      '<div class="value-container"><code>' +
      (opts.avaxTxid || "-") +
      "</code> " +
      (opts.avaxTxid ? copyFor(opts.avaxTxid, "AVAX deposit") : "") +
      "</div></div>" +
      solRow +
      noteRow +
      "</div>";
  }

  function renderRetry(avaxTxid, msg) {
    document.getElementById("swapResult").innerHTML =
      '<div class="blockchain-section">' +
      '<div class="detail-row"><label>Bridge</label>' +
      '<div class="value-container"><code>SOL arrived. Jupiter step did not run: ' +
      String(msg).slice(0, 200) +
      "</code></div></div>" +
      (avaxTxid
        ? '<div class="detail-row"><label>AVAX deposit</label>' +
          '<div class="value-container"><code>' +
          avaxTxid +
          "</code></div></div>"
        : "") +
      "</div>" +
      '<button class="btn btn-primary btn-block" onclick="avaxSwap.onRetryJupiter()" id="swapRetryBtn">' +
      '<i class="fas fa-redo"></i> Retry swap (no re-bridge)' +
      "</button>" +
      '<button class="btn btn-secondary btn-block" onclick="avaxSwap.dismissPending()">' +
      "Dismiss (already completed elsewhere)" +
      "</button>";
  }

  avaxSwap.dismissPending = function () {
    clearPending();
    avaxSwap.checkResume();
    document.getElementById("swapResult").innerHTML = "";
    uiNotify("Saved swap cleared.", "success");
  };

  // ---------- Step 8: the actual Jupiter swap (your SOL becomes NAV) ----------
  avaxSwap.onConfirmJupiter = async function () {
    if (!active || !active.swapLamports) return;
    setStage("swapping");
    uiLoading("swapBtn", true);
    const renderSwapping = (n) => {
      document.getElementById("swapResult").innerHTML =
        '<div class="blockchain-section">' +
        '<div class="detail-row"><label>Swap</label>' +
        '<div class="value-container"><code>Swapping via Jupiter (attempt ' +
        n +
        " of 3)...</code></div></div>" +
        "</div>";
    };
    try {
      const slippageBps = 5000;
      const txid = await jupiterSwapExactIn(
        active.d.solKeypair,
        SOL_MINT,
        NAVIERSTOK_MINT,
        active.swapLamports.toString(),
        slippageBps,
        "avaxSwap",
        renderSwapping,
        askHighSlippage
      );
      setStage("done");
      const nav = await getNavierstokBalance(active.d.solAddress).catch(
        () => null
      );
      renderSwapSuccess({
        avaxTxid: active.avaxTxid,
        solTxid: txid,
        receivedStr: formatNavReceived(nav, active.navBefore),
        headline: "Your NAVIERSTOKES have been received.",
        note: null,
      });
      uiNotify("AVAX to NAVIERSTOKES swap complete!", "success");
      clearPending();
      active = null;
      clearWif();
    } catch (e) {
      // Something went wrong - but did it, really? A slow network looks
      // exactly like a failure. So before crying wolf, we count your NAV:
      // if it grew, the swap actually worked and we say congratulations.
      let landed = false;
      try {
        const navAfter = await getNavierstokBalance(active.d.solAddress);
        const before = active.navBefore ? active.navBefore.raw : 0n;
        landed = navAfter && navAfter.raw > before;
        if (landed) active.navAfter = navAfter;
      } catch (_) {
        landed = false;
      }
      if (landed) {
        uiNotify(
          "Swap confirmed late - tokens arrived despite the RPC error.",
          "success"
        );
        setStage("done");
        renderSwapSuccess({
          avaxTxid: active.avaxTxid,
          solTxid: null,
          receivedStr: formatNavReceived(active.navAfter, active.navBefore),
          headline: "Your NAVIERSTOKES have been received.",
          note: "Confirmation was slow; the swap had already landed.",
        });
        clearPending();
        active = null;
        clearWif();
      } else {
        uiNotify("Jupiter swap failed: " + (e.message || e), "error");
        renderRetry(active.avaxTxid, e.message || e);
      }
    } finally {
      uiLoading("swapBtn", false);
    }
  };

  // ---------- Trying the SOL half again, without touching the bridge ----------
  avaxSwap.onRetryJupiter = async function () {
    const saved = loadPending();
    if (!saved) return uiNotify("No saved swap to retry", "error");
    const input = document.getElementById("swapWif").value.trim();
    if (!input)
      return uiNotify("Re-enter your private key to retry", "error");
    let d;
    try {
      d = await deriveAll(input);
    } catch (e) {
      return uiNotify("Invalid private key format", "error");
    }
    if (d.solAddress !== saved.solAddress)
      return uiNotify("This key does not match the saved swap", "error");
    uiLoading("swapRetryBtn", true);
    try {
      let st = null;
      try {
        st = await oneClickStatus(saved.depositAddress);
      } catch (e) {
        console.warn("1Click status unavailable during retry:", e.message);
      }
      active = {
        d: d,
        avaxAmountStr: saved.avaxAmount,
        depositAddress: saved.depositAddress,
        deadline: saved.deadline,
        avaxTxid: saved.avaxTxid,
        solBefore: null,
        stage: "received",
      };
      const solAfter = await getSolBalanceLamports(d.solAddress);
      active.solBefore = 0n;
      // We don't know your whole balance story, only what just arrived -
      // so we spend at most the fresh coins (minus fees), and never dig
      // into SOL you already had. The bridge's own number wins when in doubt.
      let received = null;
      try {
        if (st && st.swapDetails && st.swapDetails.amountOut)
          received = BigInt(st.swapDetails.amountOut);
      } catch (_) {
        received = null;
      }
      const userPubkey = d.solKeypair.publicKey;
      const feeLamports = await estimateBuySolCost(
        userPubkey,
        NAVIERSTOK_MINT
      );
      let swapLamports;
      if (received && received > 0n) {
        swapLamports = received - feeLamports;
        if (swapLamports > solAfter - feeLamports)
          swapLamports = solAfter - feeLamports;
      } else {
        swapLamports = solAfter - feeLamports;
      }
      if (swapLamports <= 0n)
        throw new Error(
          "Not enough SOL. This swap needs about " +
            (Number(solAfter) / 1e9).toFixed(6) +
            " SOL total (swap amount + network fees + account setup). " +
            (st ? "Bridge status: " + st.status : "Bridge status unavailable") +
            ". Top up SOL or bridge more AVAX."
        );
      active.swapLamports = swapLamports;
      active.swapSol = Number(swapLamports) / 1e9;
      active.feeSol = (Number(feeLamports) / 1e9).toFixed(6);
      try {
        active.navBefore = await getNavierstokBalance(d.solAddress);
      } catch (_) {
        active.navBefore = { raw: 0n, decimals: 6, exists: false };
      }
      // Double-checking is better than double-spending: show the popup so
      // you see the exact amount before anything moves.
      renderBridgeDone();
      showSwapConfirm({
        title: "Confirm Swap: SOL to NAVIERSTOK",
        rows: [
          [
            "Swap",
            "You are about to swap " +
              active.swapSol.toFixed(6) +
              " SOL for NAVIERSTOK via Jupiter. Est. network cost: ~" +
              active.feeSol +
              " SOL.",
          ],
          ["SOL wallet", d.solAddress],
        ],
        confirmLabel: "Confirm & Swap",
        onConfirm: avaxSwap.onConfirmJupiter,
      });
    } catch (e) {
      uiNotify("Retry failed: " + (e.message || e), "error");
    } finally {
      uiLoading("swapRetryBtn", false);
    }
  };

  // ---------- "You left something half-done" banner when you come back ----------
  avaxSwap.checkResume = function () {
    const box = document.getElementById("swapResume");
    if (!box) return;
    const saved = loadPending();
    if (
      !saved ||
      !saved.depositAddress ||
      (saved.stage !== "deposit" &&
        saved.stage !== "bridging" &&
        saved.stage !== "received")
    ) {
      box.innerHTML = "";
      return;
    }
    box.innerHTML =
      '<div class="blockchain-section">' +
      '<div class="detail-row"><label>Unfinished swap</label>' +
      '<div class="value-container"><code>Deposit ' +
      saved.depositAddress +
      " (" +
      saved.stage +
      "). Keys are never saved - re-enter your key, then resume.</code></div></div>" +
      "</div>" +
      '<button class="btn btn-secondary btn-block" onclick="avaxSwap.onResumeSaved()">' +
      '<i class="fas fa-history"></i> Resume pending swap</button>' +
      '<button class="btn btn-secondary btn-block" onclick="avaxSwap.dismissPending()">' +
      "Dismiss (already completed elsewhere)</button>";
  };

  avaxSwap.onResumeSaved = async function () {
    const saved = loadPending();
    if (!saved) return;
    if (saved.stage === "received") {
      renderRetry(saved.avaxTxid, "Resumed saved swap. Re-enter key above, then retry.");
      return;
    }
    const input = document.getElementById("swapWif").value.trim();
    if (input) {
      try {
        const d = await deriveAll(input);
        if (d.solAddress !== saved.solAddress)
          return uiNotify("This key does not match the saved swap", "error");
        active = {
          d: d,
          avaxAmountStr: saved.avaxAmount,
          depositAddress: saved.depositAddress,
          deadline: saved.deadline,
          avaxTxid: saved.avaxTxid,
          solBefore: null,
          stage: saved.stage,
        };
      } catch (e) {
        return uiNotify("Invalid private key format", "error");
      }
    } else {
      active = {
        d: null,
        avaxAmountStr: saved.avaxAmount,
        depositAddress: saved.depositAddress,
        deadline: saved.deadline,
        avaxTxid: saved.avaxTxid,
        solBefore: null,
        stage: saved.stage,
      };
    }
    uiLoading("swapBtn", true);
    setStage("bridging");
    renderBridgeStatusNoKey(saved, "Resumed. Waiting for SOL...");
    // Waiting needs no keys at all - only the deposit address. We'll ask for
    // your key later, when there is actually something to sign.
    pollStatusNoKey(saved);
  };

  async function pollStatusNoKey(saved) {
    let polls = 0;
    while (polls < MAX_POLLS) {
      polls++;
      await new Promise((r) => setTimeout(r, POLL_MS));
      let st;
      try {
        st = await oneClickStatus(saved.depositAddress);
      } catch (e) {
        console.warn("Status poll failed, retrying:", e.message);
        continue;
      }
      if (st.status === "SUCCESS") {
        uiNotify(
          "Bridge complete! Re-enter your key above, then use Retry swap.",
          "success"
        );
        const next = Object.assign({}, saved, { stage: "received" });
        try {
          localStorage.setItem(LS_KEY, JSON.stringify(next));
        } catch (_) {}
        renderRetry(saved.avaxTxid, "Bridge complete. Re-enter key, then retry.");
        uiLoading("swapBtn", false);
        return;
      }
      if (
        st.status === "REFUNDED" ||
        st.status === "FAILED" ||
        st.status === "INCOMPLETE_DEPOSIT"
      ) {
        active = {
          depositAddress: saved.depositAddress,
          avaxTxid: saved.avaxTxid,
        };
        onBridgeTerminal(st.status, st.swapDetails || {});
        return;
      }
      renderBridgeStatusNoKey(saved, "Bridging... (" + st.status + ")");
    }
    uiNotify("Still bridging. Progress is saved - resume again later.", "error");
    uiLoading("swapBtn", false);
  }

  function renderBridgeStatusNoKey(saved, msg) {
    document.getElementById("swapResult").innerHTML =
      '<div class="blockchain-section">' +
      '<div class="detail-row"><label>Status</label>' +
      '<div class="value-container"><code>' +
      msg +
      "</code></div></div>" +
      '<div class="detail-row"><label>Bridge deposit address</label>' +
      '<div class="value-container"><code>' +
      saved.depositAddress +
      "</code></div></div>" +
      "</div>";
  }

  function clearWif() {
    const el = document.getElementById("swapWif");
    if (el) el.value = "";
    const addrRow = document.getElementById("swapDerivedRow");
    if (addrRow) addrRow.style.display = "none";
  }
  avaxSwap.clearWif = clearWif;
  avaxSwap._askHighSlippage = askHighSlippage; 

  // ================= SELLING: NAVIERSTOKES -> SOL -> AVAX =================
  // Same trip, backwards. First Jupiter turns your NAV into SOL, then the
  // bridge carries that SOL home as AVAX. Reuses the same helpers as buying.
  // (Reverse direction verified live: 0.1 SOL became about 1.07 AVAX.)
  avaxSwap.showDir = function (dir) {
    const buy = dir !== "sell";
    document.getElementById("buyPanel").style.display = buy ? "block" : "none";
    const sell = document.getElementById("sellPanel");
    if (sell) sell.style.display = buy ? "none" : "block";
    document.getElementById("swapDirBuy").classList.toggle("active", buy);
    document.getElementById("swapDirSell").classList.toggle("active", !buy);
  };

  const SELL_STAGES = ["swap", "deposit", "bridging", "done"];
  function setSellStage(stage) {
    const allDone = stage === "done";
    SELL_STAGES.forEach((s, i) => {
      const el = document.getElementById("sellStep_" + s);
      if (!el) return;
      const activeIdx = SELL_STAGES.indexOf(stage);
      el.classList.toggle("step-done", allDone || i < activeIdx);
      el.classList.toggle("step-active", !allDone && s === stage);
    });
  }
  avaxSwap.setSellStage = setSellStage;

  // A practice run for the Sell preview: asks Jupiter "what would I get?"
  // without moving anything. The real swap still goes through the same
  // trusted function as buying.
  async function fetchJupiterQuote(inputMint, outputMint, amountRawStr) {
    const quoteBase =
      "https://lite-api.jup.ag/swap/v1/quote?inputMint=" +
      inputMint +
      "&outputMint=" +
      outputMint +
      "&amount=" +
      amountRawStr +
        "&slippageBps=5000";
    let quote = null;
    let quoteErr = null;
    const suffixes = ["&maxAccounts=48", ""];
    for (const suffix of suffixes) {
      try {
        const quoteRes = await fetch(quoteBase + suffix);
        if (!quoteRes.ok) {
          const errText = await quoteRes.text();
          quoteErr = new Error(
            "Jupiter quote failed (" +
              quoteRes.status +
              "): " +
              errText.slice(0, 300)
          );
          continue;
        }
        const q = await quoteRes.json();
        if (!q.routePlan || q.routePlan.length === 0) {
          quoteErr = new Error(
            "No Jupiter route (outAmount=" +
              (q.outAmount !== undefined ? q.outAmount : "n/a") +
              ")"
          );
          continue;
        }
        quote = q;
        break;
      } catch (e) {
        quoteErr = e;
      }
    }
    if (!quote) throw quoteErr;
    return quote;
  }

  let sellPreviewTimer = null;
  avaxSwap.onSellPreview = function () {
    if (sellPreviewTimer) clearTimeout(sellPreviewTimer);
    sellPreviewTimer = setTimeout(avaxSwap.refreshSellPreview, 600);
  };

  avaxSwap.refreshSellPreview = async function () {
    const box = document.getElementById("sellPreview");
    const input = document.getElementById("swapWif").value.trim();
    const amount = parseFloat(document.getElementById("sellAmount").value);
    if (!input || !isFinite(amount) || amount <= 0) {
      box.innerHTML =
        "<small>Enter amount for a quote. Needs SOL for fees.</small>";
      return;
    }
    try {
      await deriveAll(input);
    } catch (e) {
      box.innerHTML =
        "<small>Enter amount for a quote. Needs SOL for fees.</small>";
      return;
    }
    box.innerHTML = "<small>Fetching quote...</small>";
    try {
      const q = await fetchJupiterQuote(
        NAVIERSTOK_MINT,
        SOL_MINT,
        String(Math.round(amount * 1e6))
      );
      box.innerHTML =
        "<small>&asymp; " +
        (Number(BigInt(q.outAmount)) / 1e9).toFixed(6) +
        " SOL</small>";
    } catch (e) {
      box.innerHTML =
        "<small>Enter amount for a quote. Needs SOL for fees.</small>";
    }
  };

  let sellActive = null;

  avaxSwap.onStartSell = async function () {
    const missing = libsReady();
    if (missing.length) {
      uiNotify("Swap libraries not loaded: " + missing.join(", "), "error");
      return;
    }
    const input = document.getElementById("swapWif").value.trim();
    const amount = parseFloat(document.getElementById("sellAmount").value);
    if (!input) return uiNotify("Enter your private key", "error");
    if (!isFinite(amount) || amount <= 0)
      return uiNotify("Enter a valid NAV amount", "error");
    let d;
    try {
      d = await deriveAll(input);
    } catch (e) {
      return uiNotify("Invalid private key format", "error");
    }
    uiLoading("sellBtn", true);
    try {
      const navBal = await getNavierstokBalance(d.solAddress);
      const amountRaw = BigInt(Math.round(amount * 1e6));
      if (navBal.raw < amountRaw)
        throw new Error(
          "Insufficient NAV balance: have " +
            (Number(navBal.raw) / Math.pow(10, navBal.decimals)).toFixed(2) +
            ", need " +
            amount
        );
      // Selling costs SOL twice: once for the swap itself (plus a little rent
      // the network holds while wrapping SOL), and once for handing SOL to
      // the bridge. If your SOL can't cover both, we stop here with the same
      // friendly "not enough" message as buying.
      const feeLamports =
        (await estimateBuySolCost(
          d.solKeypair.publicKey,
          NAVIERSTOK_MINT
        )) +
        WSOL_ATA_RENT +
        SOL_DEPOSIT_BUFFER;
      const solBal = await getSolBalanceLamports(d.solAddress);
      if (solBal < feeLamports)
        throw new Error(
          "Not enough SOL. This sell needs about " +
            (Number(feeLamports) / 1e9).toFixed(6) +
            " SOL for network fees. This wallet has " +
            (Number(solBal) / 1e9).toFixed(6) +
            " SOL. Top up SOL first - your NAV stays put."
        );
      sellActive = {
        d: d,
        navAmount: amount,
        navRaw: amountRaw,
        solBefore: solBal,
      };
      showSwapConfirm({
        title: "Confirm Sell: NAVIERSTOKES to AVAX",
        rows: [
          [
            "Sell",
            "You are about to swap " +
              amount +
              " NAVIERSTOKES for SOL via Jupiter, then bridge the SOL to AVAX. Est. network cost: ~" +
              (Number(feeLamports) / 1e9).toFixed(6) +
              " SOL.",
          ],
          ["AVAX destination", d.avaxAddr],
          ["SOL wallet", d.solAddress],
        ],
        confirmLabel: "Confirm & Sell",
        onConfirm: avaxSwap.onConfirmSell,
      });
    } catch (e) {
      uiNotify("Sell preflight failed: " + (e.message || e), "error");
    } finally {
      uiLoading("sellBtn", false);
    }
  };

  async function sendSolDeposit(fromKeypair, toAddressStr, lamportsBig) {
    const connection = getConnection();
    let to;
    try {
      to = new solanaWeb3.PublicKey(toAddressStr);
    } catch (_) {
      throw new Error("Bridge returned an invalid SOL deposit address");
    }
    const lamports = Number(lamportsBig);
    if (!Number.isSafeInteger(lamports) || lamports <= 0)
      throw new Error("Invalid SOL deposit amount");
    const tx = new solanaWeb3.Transaction().add(
      solanaWeb3.SystemProgram.transfer({
        fromPubkey: fromKeypair.publicKey,
        toPubkey: to,
        lamports: lamports,
      })
    );
    tx.feePayer = fromKeypair.publicKey;
    const latest = await connection.getLatestBlockhash("confirmed");
    tx.recentBlockhash = latest.blockhash;
    tx.sign(fromKeypair);
    const txid = await broadcastRawTransaction(tx.serialize(), {
      skipPreflight: false,
      maxRetries: 3,
    });
    return confirmAndReturn(txid, latest.blockhash, latest.lastValidBlockHeight);
  }

  avaxSwap.onConfirmSell = async function () {
    if (!sellActive) return;
    uiLoading("sellBtn", true);
    setSellStage("swap");
    try {
      renderSellStatus("Swapping NAV to SOL via Jupiter...");
      const jupTxid = await jupiterSwapExactIn(
        sellActive.d.solKeypair,
        NAVIERSTOK_MINT,
        SOL_MINT,
        sellActive.navRaw.toString(),
        5000,
        "avaxSwapSell",
        (n) => renderSellStatus("Swapping NAV to SOL (attempt " + n + " of 3)..."),
        askHighSlippage
      );
      sellActive.jupTxid = jupTxid;
      const solAfter = await getSolBalanceLamports(sellActive.d.solAddress);
      const received = solAfter - sellActive.solBefore;
      let bridgeLamports = received - SOL_DEPOSIT_BUFFER;
      if (bridgeLamports > solAfter - SOL_DEPOSIT_BUFFER)
        bridgeLamports = solAfter - SOL_DEPOSIT_BUFFER;
      if (bridgeLamports <= 0n)
        throw new Error(
          "No SOL arrived above the deposit fee - your NAV is untouched (Jupiter is atomic). Check the swap, then retry."
        );
      // The bridge demands exact change: the quote and the deposit must match
      // to the last lamport, so we quote first and send exactly that.
      setSellStage("deposit");
      renderSellStatus("Quoting the SOL to AVAX bridge...");
      const q = await oneClickQuote({
        dry: false,
        amountSat: bridgeLamports.toString(),
        refundTo: sellActive.d.solAddress,
        recipient: sellActive.d.avaxAddr,
        originAsset: SOL_ASSET,
        destinationAsset: AVAX_ASSET,
      });
      const depositAddress = q.quote.depositAddress;
      if (!depositAddress) throw new Error("Bridge returned no deposit address");
      sellActive.depositAddress = depositAddress;
      sellActive.expectedAvax = q.quote.amountOutFormatted;
      setSellStage("deposit");
      renderSellStatus("Depositing SOL to the bridge...");
      const depTxid = await sendSolDeposit(
        sellActive.d.solKeypair,
        depositAddress,
        bridgeLamports
      );
      sellActive.depTxid = depTxid;
      try {
        await submitDeposit(depTxid, depositAddress);
      } catch (_) {
        /* a little wave so the bridge notices us sooner; our regular checks would find it anyway */
      }
      setSellStage("bridging");
      pollSellStatus();
    } catch (e) {
      await reconcileSell(e);
    }
  };

  // The second half of a sell, pulled out so both the happy path and the
  // "wait, did that work?" recovery use the exact same steps. It always
  // measures your real balance first, so it can only ever spend SOL that's
  // actually there - spending twice by accident is impossible by design.
  async function continueSellBridge() {
    const solAfter = await getSolBalanceLamports(sellActive.d.solAddress);
    const received = solAfter - (sellActive.solBefore || 0n);
    let bridgeLamports = received - SOL_DEPOSIT_BUFFER;
    if (bridgeLamports > solAfter - SOL_DEPOSIT_BUFFER)
      bridgeLamports = solAfter - SOL_DEPOSIT_BUFFER;
    if (bridgeLamports <= 0n)
      throw new Error(
        "No SOL arrived above the deposit fee - your NAV is untouched (Jupiter is atomic). Check the swap, then retry."
      );
    setSellStage("deposit");
    renderSellStatus("Quoting the SOL to AVAX bridge...");
    const q = await oneClickQuote({
      dry: false,
      amountSat: bridgeLamports.toString(),
      refundTo: sellActive.d.solAddress,
      recipient: sellActive.d.avaxAddr,
      originAsset: SOL_ASSET,
      destinationAsset: AVAX_ASSET,
    });
    const depositAddress = q.quote.depositAddress;
    if (!depositAddress) throw new Error("Bridge returned no deposit address");
    sellActive.depositAddress = depositAddress;
    sellActive.expectedAvax = q.quote.amountOutFormatted;
    setSellStage("deposit");
    renderSellStatus("Depositing SOL to the bridge...");
    const depTxid = await sendSolDeposit(
      sellActive.d.solKeypair,
      depositAddress,
      bridgeLamports
    );
    sellActive.depTxid = depTxid;
    try {
      await submitDeposit(depTxid, depositAddress);
    } catch (_) {
      /* a little wave so the bridge notices us sooner; our regular checks would find it anyway */
    }
    setSellStage("bridging");
    pollSellStatus();
  }

  // If a sell blows up halfway, we refuse to just shrug. Instead we walk
  // forward, step by step:
  // - Money already sent to the bridge? Then just keep waiting for it.
  //   Waiting is free and re-sending would be madness.
  // - Swap worked but bridging never started? Then start bridging now.
  // - Nothing moved at all? Only then do we admit failure - with your
  //   balances untouched.
  async function reconcileSell(e) {
    const errMsg = String((e && e.message) || e);
    if (sellActive.depositAddress && sellActive.depTxid) {
      try {
        const st = await oneClickStatus(sellActive.depositAddress);
        if (st.status === "SUCCESS") {
          setSellStage("done");
          renderSellSuccess(st.swapDetails || {});
          uiNotify("NAV to AVAX sell complete!", "success");
          sellActive = null;
          clearWif();
          uiLoading("sellBtn", false);
          return;
        }
      } catch (_) {
        /* status unreadable - fall through to polling */
      }
      renderSellStatus("Deposit sent, waiting for bridge confirmation...");
      setSellStage("bridging");
      pollSellStatus();
      return;
    }
    if (sellActive.jupTxid || (await sellSolArrived())) {
      try {
        await continueSellBridge();
        return;
      } catch (e2) {
        uiNotify("Sell needs attention: " + (e2.message || e2), "error");
        document.getElementById("sellResult").innerHTML =
          '<div class="form-text">' +
          String(e2.message || e2).slice(0, 300) +
          "</div>";
        uiLoading("sellBtn", false);
        return;
      }
    }
    // Jupiter swaps are all-or-nothing: if it fails, your NAV never left.
    // And SOL that never left your wallet can't be lost either. So before
    // we show any scary message, we check what actually happened.
    uiNotify("Sell failed: " + errMsg, "error");
    document.getElementById("sellResult").innerHTML =
      '<div class="form-text">Sell failed: ' +
      errMsg.slice(0, 300) +
      ". Your NAV stays put on a failed swap; bridged SOL stays in your Solana address and can be retried.</div>";
    uiLoading("sellBtn", false);
  }

  async function sellSolArrived() {
    try {
      const solNow = await getSolBalanceLamports(sellActive.d.solAddress);
      return solNow > (sellActive.solBefore || 0n) + 5000n;
    } catch (_) {
      return false;
    }
  }

  function renderSellStatus(msg) {
    document.getElementById("sellResult").innerHTML =
      '<div class="blockchain-section">' +
      '<div class="detail-row"><label>Status</label>' +
      '<div class="value-container"><code>' +
      msg +
      "</code></div></div>" +
      "</div>";
  }

  async function pollSellStatus() {
    let polls = 0;
    while (polls < MAX_POLLS) {
      polls++;
      await new Promise((r) => setTimeout(r, POLL_MS));
      let st;
      try {
        st = await oneClickStatus(sellActive.depositAddress);
      } catch (e) {
        console.warn("Sell status poll failed, retrying:", e.message);
        continue;
      }
      const status = st.status;
      const details = st.swapDetails || {};
      if (status === "SUCCESS") {
        setSellStage("done");
        renderSellSuccess(details);
        uiNotify("NAV to AVAX sell complete!", "success");
        sellActive = null;
        clearWif();
        uiLoading("sellBtn", false);
        return;
      }
      if (
        status === "REFUNDED" ||
        status === "FAILED" ||
        status === "INCOMPLETE_DEPOSIT"
      ) {
        const refunded =
          details.refundedAmountFormatted || details.refundedAmount || "0";
        document.getElementById("sellResult").innerHTML =
          '<div class="form-text">Bridge ended: ' +
          status +
          ". Refunded: " +
          refunded +
          ". Any bridged SOL stays in your Solana address.</div>";
        uiNotify("Bridge ended: " + status, "error");
        sellActive = null;
        clearWif();
        uiLoading("sellBtn", false);
        return;
      }
      renderSellStatus("Bridging... (" + status + ", poll " + polls + ")");
    }
    uiNotify("Still bridging. Progress is unsaved for sells - note your deposit address to check the bridge manually.", "error");
    uiLoading("sellBtn", false);
  }

  function renderSellSuccess(details) {
    const arr = details.destinationChainTxHashes || details.destinationChainTxHash;
    const list = (Array.isArray(arr) ? arr : arr ? [arr] : []).filter(
      (h) => typeof h === "string" && h.length > 20
    );
    const arrival = list.length ? list[0] : null;
    const copyFor = (text, label) =>
      '<button class="btn-icon" onclick="copyToClipboard(\'' +
      text +
      '\')" title="Copy ' +
      label +
      '"><i class="fas fa-copy"></i></button>';
    document.getElementById("sellResult").innerHTML =
      '<div class="wallet-generated-success">' +
      '<div class="success-icon"><i class="fas fa-check"></i></div>' +
      '<div class="success-message"><h3>Sell Complete!</h3>' +
      "<p>Your AVAX is on its way to your address.</p></div></div>" +
      '<div class="blockchain-section">' +
      '<div class="blockchain-header"><h4><i class="fas fa-receipt"></i> Swap Details</h4></div>' +
      '<div class="detail-row"><label><i class="fas fa-coins"></i> Expected</label>' +
      '<div class="value-container"><code>&asymp;' +
      (sellActive.expectedAvax || "?") +
      " AVAX</code></div></div>" +
      '<div class="detail-row"><label><i class="fas fa-exchange-alt"></i> NAV to SOL swap</label>' +
      '<div class="value-container"><code><a href="https://solscan.io/tx/' +
      sellActive.jupTxid +
      '" target="_blank" rel="noopener">' +
      sellActive.jupTxid +
      "</a></code> " +
      copyFor(sellActive.jupTxid, "Swap txid") +
      "</div></div>" +
      '<div class="detail-row"><label><i class="fas fa-paper-plane"></i> SOL deposit</label>' +
      '<div class="value-container"><code><a href="https://solscan.io/tx/' +
      sellActive.depTxid +
      '" target="_blank" rel="noopener">' +
      sellActive.depTxid +
      "</a></code> " +
      copyFor(sellActive.depTxid, "Deposit txid") +
      "</div></div>" +
      '<div class="detail-row"><label><i class="fas fa-wallet"></i> AVAX arrival</label>' +
      '<div class="value-container"><code>' +
      (arrival
        ? '<a href="https://snowtrace.io/tx/' +
          arrival +
          '" target="_blank" rel="noopener">' +
          arrival +
          "</a>"
        : sellActive.d.avaxAddr) +
      "</code> " +
      (arrival
        ? copyFor(arrival, "AVAX txid")
        : copyFor(sellActive.d.avaxAddr, "AVAX address")) +
      "</div></div>" +
      "</div>";
  }
})("object" === typeof module ? module.exports : (window.avaxSwap = {}));
