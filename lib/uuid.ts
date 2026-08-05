import * as Crypto from 'expo-crypto';

/**
 * 產生 uuid v4。
 * 用密碼學等級的隨機來源（不是 Math.random），因為之後接雲端同步時
 * 兩台裝置各自產生的 id 絕對不能撞號。
 */
export function newId(): string {
  return Crypto.randomUUID();
}
