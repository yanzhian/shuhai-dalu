/**
 * Dice So Nice! 辅助工具
 */

/**
 * 检查 Dice So Nice! 是否可用
 * @returns {boolean} 是否可用
 */
export function isDice3dAvailable() {
  return !!game.dice3d;
}

/**
 * 安全显示骰子动画
 * 包含错误处理和降级方案
 *
 * @param {Roll} roll - Roll 对象
 * @param {User} user - 用户对象（默认当前用户）
 * @param {boolean} synchronize - 是否同步给其他用户（默认 true）
 * @param {Object} options - 额外选项（颜色、主题等）
 * @returns {Promise<void>}
 */
export async function showDiceAnimation(roll, user = null, synchronize = true, options = {}) {
  if (!game.dice3d) {
    return;
  }

  try {
    const targetUser = user || game.user;
    await game.dice3d.showForRoll(roll, targetUser, synchronize, null, false, null, options);
  } catch (error) {
    console.error(`Dice So Nice! 动画显示失败:`, error);
  }
}

/**
 * 显示多个骰子动画（同时显示）
 * @param {Array<Roll>} rolls - Roll 对象数组
 * @param {Array<Object>} options - 每个骰子的选项数组
 * @returns {Promise<void>}
 */
export async function showMultipleDiceAnimation(rolls, options = []) {
  if (!game.dice3d) {
    return;
  }

  try {
    const promises = rolls.map((roll, index) => {
      const opts = options[index] || {};
      return game.dice3d.showForRoll(roll, game.user, true, null, false, null, opts);
    });

    await Promise.all(promises);
  } catch (error) {
    console.error(`Dice So Nice! 多个骰子动画失败:`, error);
  }
}
