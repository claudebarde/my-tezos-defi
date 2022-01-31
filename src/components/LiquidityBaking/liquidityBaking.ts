import BigNumber from "bignumber.js";
import type {
  TezosToolkit,
  ContractAbstraction,
  ContractProvider,
  Wallet
} from "@taquito/taquito";
import { validateContractAddress } from "@taquito/utils";
import { packDataBytes, unpackDataBytes } from "@taquito/michel-codec";

type Result = {
  status: boolean;
  msg: string | { xtzTokens: number; tzbtcTokens: number };
};

export class LiquidityBaking {
  private Tezos: TezosToolkit;
  private lbInstance:
    | ContractAbstraction<ContractProvider>
    | ContractAbstraction<Wallet>;
  private tzbtcInstance:
    | ContractAbstraction<ContractProvider>
    | ContractAbstraction<Wallet>;
  lbAddress: string;
  tzbtcAddress: string;
  storage: any;
  xtzPool: BigNumber;
  tokenPool: BigNumber;
  lqtPool: BigNumber;
  private taquitoApi: "contract" | "wallet";
  private validity: number;
  private lastUpdate: number;

  /**
   * Constructor for Liquidity Baking instance
   * @class
   * @requires module:@taquito/utils
   * @param {string} lbAddress - the address of the liquidity baking contract
   * @param {string} tzbtcAddress - the address of the tzBTC contract (to allow using the class on testnets)
   * @param {TezosToolkit} Tezos - the instance of the Tezos toolkit, it is a assumed that a wallet provider was set up
   * @param {"contract"|"wallet"} taquitoApi - whether the app uses the contract or the wallet API
   * @param {number} [validity=30_000] - the time after which new data are pulled from the LB contract, default to 30 seconds
   */

  constructor(
    lbAddress: string,
    tzbtcAddress: string,
    Tezos: TezosToolkit,
    taquitoApi: "contract" | "wallet",
    validity: number = 30_000
  ) {
    if (validateContractAddress(lbAddress) === 3) {
      this.Tezos = Tezos;
      this.lbAddress = lbAddress;
      this.tzbtcAddress = tzbtcAddress;
      this.xtzPool = new BigNumber(0);
      this.tokenPool = new BigNumber(0);
      this.lqtPool = new BigNumber(0);
      this.taquitoApi = taquitoApi;
      this.lastUpdate = 0;
      this.validity = validity;
    } else {
      throw "Invalid liquidity baking contract address";
    }
  }

  async setup() {
    if (!this.lbAddress) {
      throw "This instance of LiquidityBaking does not include a contract address";
    } else if (!this.Tezos) {
      throw "This instance of LiquidityBaking does not include a TezosToolkit instance";
    } else if (!this.lbAddress) {
      throw "No address provided for the liquidity baking contract";
    } else if (!this.tzbtcAddress) {
      throw "No address provided for the tzBTC contract";
    } else {
      if (this.taquitoApi === "contract") {
        this.lbInstance = await this.Tezos.contract.at(this.lbAddress);
        this.tzbtcInstance = await this.Tezos.contract.at(this.tzbtcAddress);
      } else {
        this.lbInstance = await this.Tezos.wallet.at(this.lbAddress);
        this.tzbtcInstance = await this.Tezos.wallet.at(this.tzbtcAddress);
      }
      this.update_data();

      return this;
    }
  }

  /**
   * Updates xtzPool, tokenPool, and lqtPool values based on the validity period set in the constructor call
   */
  private async update_data() {
    if (Date.now() > this.lastUpdate + this.validity) {
      const storage: any = await this.lbInstance.storage();
      const { xtzPool, tokenPool, lqtPool } = storage;
      this.xtzPool = xtzPool;
      this.tokenPool = tokenPool;
      this.lqtPool = lqtPool;
      this.lastUpdate = Date.now();
    }
  }

  /**
   * Fetches user's tzBTC balance
   * @requires module:@taquito/michel-codec
   * @param {string} userAddress - the address of the user to fetch the balance of
   * @returns {Promise<number|null>} - returns a number if the balance is found, null otherwise
   */
  async fetchTzbtcBalance(userAddress: string): Promise<number | null> {
    if (!this.Tezos) {
      console.error("No Tezos toolkit provided");
      return null;
    }
    if (!this.tzbtcAddress) {
      console.error("No address provided for tzBTC contract");
      return null;
    }

    let contract;
    if (this.taquitoApi === "contract") {
      contract = await this.Tezos.contract.at(this.tzbtcAddress);
    } else {
      contract = await this.Tezos.wallet.at(this.tzbtcAddress);
    }
    const { ledger } = await contract.storage();

    const packedAddress = packDataBytes(
      { string: userAddress },
      { prim: "address" }
    );
    const ledgerKey: any = {
      prim: "Pair",
      args: [{ string: "ledger" }, { bytes: packedAddress.bytes.slice(12) }]
    };
    const ledgerKeyBytes = packDataBytes(ledgerKey);
    const bigmapVal = await ledger.get(ledgerKeyBytes.bytes);
    if (bigmapVal) {
      const bigmapValData = unpackDataBytes({ bytes: bigmapVal });
      if (
        bigmapValData.hasOwnProperty("prim") &&
        (bigmapValData as any).prim === "Pair"
      ) {
        return +(bigmapValData as any).args[0].int / 10 ** 8;
      } else {
        console.error("Invalid properties for big_map value");
        return null;
      }
    } else {
      console.error("No key found in the ledger for this address");
      return null;
    }
  }

  /**
   * Sends a transaction to the %tokenToXtz entrypoint
   *
   * @param {string} to - the address of the recipient of the XTZ tokens
   * @param {number} tokensSold - the amount of tzBTC tokens to exchange
   * @param {number} validity - the validity period of the transaction in seconds
   * @returns {Result} - the status of the operation
   */
  async tokenToXtz(to: string, tokensSold: number): Promise<Result> {
    await this.update_data();

    if (this.xtzPool.isEqualTo(0))
      return { status: false, msg: "xtzPool is equal to zero" };
    if (this.tokenPool.isEqualTo(0))
      return { status: false, msg: "tokenPool is equal to zero" };
    // calculates the minimum amount of XTZ tokens for the transaction
    const minXtzBought = this.tokenToXtzExchangeRate(tokensSold);
    // calculates the deadline
    const deadline = this.getDeadline();
    // forges the transaction
    let batch;
    if (this.taquitoApi === "contract") {
      batch = this.Tezos.contract.batch;
    } else if (this.taquitoApi === "wallet") {
      batch = this.Tezos.wallet.batch;
    } else {
      return { status: false, msg: "Unknown Taquito API value" };
    }

    try {
      const batchOp = batch
        .withContractCall(this.tzbtcInstance.methods.approve(this.lbAddress, 0))
        .withContractCall(
          this.tzbtcInstance.methods.approve(this.lbAddress, tokensSold)
        )
        .withContractCall(
          this.lbInstance.methods.tokenToXtz(
            to,
            tokensSold,
            minXtzBought.toNumber(),
            deadline
          )
        )
        .send();
      await batchOp.confirmation();

      return {
        status: true,
        msg: { xtzTokens: minXtzBought.toNumber(), tzbtcTokens: tokensSold }
      };
    } catch (error) {
      console.error(error);
      return { status: false, msg: JSON.stringify(error) };
    }
  }

  async xtzToToken(to: string, xtzSold: number): Promise<Result> {
    await this.update_data();

    if (this.xtzPool.isEqualTo(0))
      return { status: false, msg: "xtzPool is equal to zero" };
    if (this.tokenPool.isEqualTo(0))
      return { status: false, msg: "tokenPool is equal to zero" };

    const minTokensBought = this.xtzToTokenExchangeRate(xtzSold);
    // calculates the deadline
    const deadline = this.getDeadline();

    let batch;
    if (this.taquitoApi === "contract") {
      batch = this.Tezos.contract.batch;
    } else if (this.taquitoApi === "wallet") {
      batch = this.Tezos.wallet.batch;
    } else {
      return { status: false, msg: "Unknown Taquito API value" };
    }

    try {
      const batchOp = batch
        .withContractCall(this.tzbtcInstance.methods.approve(this.lbAddress, 0))
        .withContractCall(
          this.tzbtcInstance.methods.approve(this.lbAddress, xtzSold)
        )
        .withContractCall(
          this.lbInstance.methods.xtzToToken(
            to,
            minTokensBought.toNumber(),
            deadline
          )
        )
        .send();
      await batchOp.confirmation();

      return {
        status: true,
        msg: { xtzTokens: xtzSold, tzbtcTokens: minTokensBought.toNumber() }
      };
    } catch (error) {
      console.error(error);
      return { status: false, msg: JSON.stringify(error) };
    }
  }

  private getDeadline(): string {
    return new Date(Date.now() + 5 * 60_000).toISOString();
  }

  /**
   * Updates xtzPool with the 2.5 tez subsidy. Since this is applied before all other operations it can be assumed to have been applied at least once for any call to the CPMM.
   *
   * @param {BigNumber} xtzPool
   * @returns {BigNumber} xtzPool + 2_500_000
   */
  private creditSubsidy(xtzPool: BigNumber | number): BigNumber {
    if (BigNumber.isBigNumber(xtzPool)) {
      return xtzPool.plus(new BigNumber(2500000));
    } else {
      return new BigNumber(xtzPool).plus(new BigNumber(2500000));
    }
  }

  /**
   * Get the amount of XTZ sold for a given token input and the pool state of Dexter
   * for the Dexter tokenToXtz entrypoint.
   *
   * @param {(BigNumber|number|string)} tokenIn - Token amount the sender sells to Dexter. Must be greater than zero.
   * @param {(BigNumber|number|string)} xtzPool - XTZ amount that Dexter holds. Must be greater than zero.
   * @param {(BigNumber|number|string)} tokenPool - Token amount that Dexter holds. Must be greater than zero.
   * @returns {(BigNumber|null)} The amount of XTZ that Dexter will send to the :to
   * address in the dexter tokenToXtz entrypoint.
   */
  tokenToXtzXtzOutput(p: {
    tokenIn: BigNumber | number;
    xtzPool: BigNumber | number;
    tokenPool: BigNumber | number;
  }): BigNumber | null {
    const { tokenIn, xtzPool: _xtzPool, tokenPool } = p;
    var xtzPool = this.creditSubsidy(_xtzPool);
    var tokenIn_ = new BigNumber(0);
    var xtzPool_ = new BigNumber(0);
    var tokenPool_ = new BigNumber(0);
    try {
      tokenIn_ = new BigNumber(tokenIn);
      xtzPool_ = new BigNumber(xtzPool);
      tokenPool_ = new BigNumber(tokenPool);
    } catch (err) {
      return null;
    }
    if (
      tokenIn_.isGreaterThan(0) &&
      xtzPool_.isGreaterThan(0) &&
      tokenPool_.isGreaterThan(0)
    ) {
      // Includes 0.1% fee and 0.1% burn calculated separatedly: 999/1000 * 999/1000 = 998100/1000000
      var numerator = new BigNumber(tokenIn)
        .times(new BigNumber(xtzPool))
        .times(new BigNumber(998001));
      var denominator = new BigNumber(tokenPool)
        .times(new BigNumber(1000000))
        .plus(new BigNumber(tokenIn).times(new BigNumber(999000)));
      return numerator.dividedBy(denominator);
    } else {
      return null;
    }
  }

  /**
   * Calculate the exchange rate for a token to XTZ trade including the 0.1% fee given
   * to the liquidity providers and the penalty for large trades.
   *
   * @param {(BigNumber|number|string)} tokenIn - Token amount the sender sells to Dexter. Must be greater than zero.
   * @param {(BigNumber|number|string)} xtzPool - XTZ amount that Dexter holds. Must be greater than zero.
   * @param {(BigNumber|number|string)} tokenPool - Token amount that Dexter holds. Must be greater than zero.
   * @returns {(number|null)} The exchange rate as a float number.
   */
  tokenToXtzExchangeRate(tokenIn: BigNumber | number): BigNumber | null {
    var tokenIn_ = new BigNumber(0);
    var xtzPool_ = new BigNumber(0);
    var tokenPool_ = new BigNumber(0);
    try {
      tokenIn_ = new BigNumber(tokenIn);
      xtzPool_ = new BigNumber(this.xtzPool);
      tokenPool_ = new BigNumber(this.tokenPool);
    } catch (err) {
      return null;
    }
    if (
      tokenIn_.isGreaterThan(0) &&
      xtzPool_.isGreaterThan(0) &&
      tokenPool_.isGreaterThan(0)
    ) {
      return this.tokenToXtzXtzOutput({
        tokenIn: tokenIn_,
        xtzPool: xtzPool_,
        tokenPool: tokenPool_
      }).dividedBy(tokenIn_);
    } else {
      return null;
    }
  }

  /**
   * Calculate the exchange rate for an XTZ to Token trade including the 0.1% fee given
   * to the liquidity providers and the penalty for trade size.
   *
   * @param {(BigNumber|number|string)} xtzIn - XTZ amount the sender sells to Dexter. Must be greater than zero.
   * @param {(BigNumber|number|string)} xtzPool - XTZ amount that Dexter holds. Must be greater than zero.
   * @param {(BigNumber|number|string)} tokenPool - Token amount that Dexter holds. Must be greater than zero.
   * @returns {(number|null)} The exchange rate as a float number.
   */
  xtzToTokenExchangeRate(xtzIn: BigNumber | number): BigNumber | null {
    var xtzIn_ = new BigNumber(0);
    var xtzPool_ = new BigNumber(0);
    var tokenPool_ = new BigNumber(0);
    try {
      xtzIn_ = new BigNumber(xtzIn);
      xtzPool_ = new BigNumber(this.xtzPool);
      tokenPool_ = new BigNumber(this.tokenPool);
    } catch (err) {
      return null;
    }
    if (
      xtzIn_.isGreaterThan(0) &&
      xtzPool_.isGreaterThan(0) &&
      tokenPool_.isGreaterThan(0)
    ) {
      return this.xtzToTokenTokenOutput(xtzIn_).dividedBy(xtzIn_);
    } else {
      return null;
    }
  }

  xtzToTokenTokenOutput(xtzIn: BigNumber): BigNumber | null {
    let xtzPool = this.creditSubsidy(this.xtzPool);
    var xtzIn_ = new BigNumber(0);
    var xtzPool_ = new BigNumber(0);
    var tokenPool_ = new BigNumber(0);
    try {
      xtzIn_ = new BigNumber(xtzIn);
      xtzPool_ = new BigNumber(xtzPool);
      tokenPool_ = new BigNumber(this.tokenPool);
    } catch (err) {
      return null;
    }
    if (
      xtzIn_.isGreaterThan(0) &&
      xtzPool_.isGreaterThan(0) &&
      tokenPool_.isGreaterThan(0)
    ) {
      // Includes 0.1% fee and 0.1% burn calculated separatedly: 999/1000 * 999/1000 = 998100/1000000
      // (xtzIn_ * tokenPool_ * 999 * 999) / (tokenPool * 1000 - tokenOut * 999 * 999)
      var numerator = xtzIn_.times(tokenPool_).times(new BigNumber(998001));
      var denominator = xtzPool_
        .times(new BigNumber(1000000))
        .plus(xtzIn_.times(new BigNumber(998001)));
      return numerator.dividedBy(denominator);
    } else {
      return null;
    }
  }
}
