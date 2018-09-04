export const MINER_BLOCKLIST = {
  code: [
    // CoinHive
    /window.CoinHive=window.CoinHive/,
    /CoinHive\.CONFIG/,
    /\bcryptonight_hash\b/,
    /CryptonightWASMWrapper/,
  ],
  filenames: [/coinhive(\.min)?\.js/, /cryptonight(\.min)\.js/],
};
