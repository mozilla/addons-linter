export const MINER_BLOCKLIST = {
  code: [
    // CoinHive
    /window.CoinHive=window.CoinHive/,
    /CoinHive\.CONFIG/,
    /coin-hive\.com/,
    /coinhive\.com/,
    /cnhv\.co/,
    /\bcryptonight_hash\b/,
    /CryptonightWASMWrapper/,
  ],
  filenames: [
    /coinhive(\.min\.)?js/,
    /cryptonight(\.min\.)\.js/,
  ],
};
