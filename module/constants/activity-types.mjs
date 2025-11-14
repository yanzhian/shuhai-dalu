/**
 * 书海大陆 TRPG 系统
 * Activity 类型常量定义
 *
 * 定义所有 activity 相关的常量，包括触发类型、目标类型等
 */

/**
 * 触发类型（Trigger Types）
 * 定义 activity 可以在何时被触发
 */
export const TRIGGER_TYPES = {
  // 基础触发
  ON_USE: 'onUse',                        // 使用时
  ON_EQUIP: 'onEquip',                    // 装备时
  ON_UNEQUIP: 'onUnequip',                // 卸下时

  // 战斗触发
  ON_ATTACK: 'onAttack',                  // 攻击时
  ON_COUNTER: 'onCounter',                // 对抗时
  ON_COUNTER_SUCCESS: 'onCounterSuccess', // 对抗成功时
  ON_COUNTER_FAIL: 'onCounterFail',       // 对抗失败时
  ON_HIT: 'onHit',                        // 攻击命中时
  ON_DAMAGED: 'onDamaged',                // 受到伤害时
  ON_KILL: 'onKill',                      // 击杀时
  ON_DEATH: 'onDeath',                    // 死亡时

  // 回合触发
  ON_ROUND_START: 'onRoundStart',         // 回合开始时
  ON_ROUND_END: 'onRoundEnd',             // 回合结束时
  ON_COMBAT_START: 'onCombatStart',       // 战斗开始时
  ON_COMBAT_END: 'onCombatEnd',           // 战斗结束时

  // 特殊触发
  ON_TREMOR_EXPLODE: 'onTremorExplode',   // 震颤引爆时
  ON_BUFF_APPLIED: 'onBuffApplied',       // BUFF被应用时
  ON_BUFF_REMOVED: 'onBuffRemoved',       // BUFF被移除时
};

/**
 * 触发类型的显示名称
 */
export const TRIGGER_TYPE_LABELS = {
  [TRIGGER_TYPES.ON_USE]: '使用时',
  [TRIGGER_TYPES.ON_EQUIP]: '装备时',
  [TRIGGER_TYPES.ON_UNEQUIP]: '卸下时',
  [TRIGGER_TYPES.ON_ATTACK]: '攻击时',
  [TRIGGER_TYPES.ON_COUNTER]: '对抗时',
  [TRIGGER_TYPES.ON_COUNTER_SUCCESS]: '对抗成功时',
  [TRIGGER_TYPES.ON_COUNTER_FAIL]: '对抗失败时',
  [TRIGGER_TYPES.ON_HIT]: '攻击命中时',
  [TRIGGER_TYPES.ON_DAMAGED]: '受到伤害时',
  [TRIGGER_TYPES.ON_KILL]: '击杀时',
  [TRIGGER_TYPES.ON_DEATH]: '死亡时',
  [TRIGGER_TYPES.ON_ROUND_START]: '回合开始时',
  [TRIGGER_TYPES.ON_ROUND_END]: '回合结束时',
  [TRIGGER_TYPES.ON_COMBAT_START]: '战斗开始时',
  [TRIGGER_TYPES.ON_COMBAT_END]: '战斗结束时',
  [TRIGGER_TYPES.ON_TREMOR_EXPLODE]: '震颤引爆时',
  [TRIGGER_TYPES.ON_BUFF_APPLIED]: 'BUFF应用时',
  [TRIGGER_TYPES.ON_BUFF_REMOVED]: 'BUFF移除时',
};

/**
 * 目标类型（Target Types）
 * 定义 activity 效果可以作用于谁
 */
export const TARGET_TYPES = {
  SELF: 'self',           // 自己
  SELECTED: 'selected',   // 选中的目标
  TARGET: 'target',       // 目标（同 selected）
  ALL_ENEMIES: 'allEnemies',     // 所有敌人
  ALL_ALLIES: 'allAllies',       // 所有友军
  ALL: 'all',             // 所有人
  RANDOM_ENEMY: 'randomEnemy',   // 随机敌人
  RANDOM_ALLY: 'randomAlly',     // 随机友军
  ADJACENT: 'adjacent',   // 相邻目标
};

/**
 * 目标类型的显示名称
 */
export const TARGET_TYPE_LABELS = {
  [TARGET_TYPES.SELF]: '自己',
  [TARGET_TYPES.SELECTED]: '选中目标',
  [TARGET_TYPES.TARGET]: '目标',
  [TARGET_TYPES.ALL_ENEMIES]: '所有敌人',
  [TARGET_TYPES.ALL_ALLIES]: '所有友军',
  [TARGET_TYPES.ALL]: '所有人',
  [TARGET_TYPES.RANDOM_ENEMY]: '随机敌人',
  [TARGET_TYPES.RANDOM_ALLY]: '随机友军',
  [TARGET_TYPES.ADJACENT]: '相邻目标',
};

/**
 * 回合时机（Round Timing）
 * 定义 BUFF 等效果在哪个回合生效
 */
export const ROUND_TIMING = {
  CURRENT: 'current',     // 本回合
  NEXT: 'next',           // 下回合
  BOTH: 'both',           // 本回合和下回合都生效
};

/**
 * 回合时机的显示名称
 */
export const ROUND_TIMING_LABELS = {
  [ROUND_TIMING.CURRENT]: '本回合',
  [ROUND_TIMING.NEXT]: '下回合',
  [ROUND_TIMING.BOTH]: '本回合和下回合',
};

/**
 * 消耗类型（Consume Types）
 * 定义资源消耗的行为
 */
export const CONSUME_TYPES = {
  MANDATORY: 'mandatory',     // 强制消耗（不足则失败）
  OPTIONAL: 'optional',       // 可选消耗（不足也能触发）
  NONE: 'none',               // 无消耗
};

/**
 * 条件类型（Condition Types）
 * 定义 activity 可用的条件类型
 */
export const CONDITION_TYPES = {
  HAS_BUFF: 'hasBuff',                 // 拥有指定BUFF
  BUFF_LAYER: 'buffLayer',             // BUFF层数满足条件
  HAS_COST: 'hasCost',                 // 拥有足够Cost
  ROUND_LIMIT: 'roundLimit',           // 回合次数限制
  HP_PERCENT: 'hpPercent',             // HP百分比
  CORRUPTION: 'corruption',             // 侵蚀度条件
  ITEM_EQUIPPED: 'itemEquipped',       // 装备了指定物品
};

/**
 * 获取触发类型的显示名称
 * @param {string} triggerType - 触发类型
 * @returns {string} 显示名称
 */
export function getTriggerTypeLabel(triggerType) {
  return TRIGGER_TYPE_LABELS[triggerType] || triggerType;
}

/**
 * 获取目标类型的显示名称
 * @param {string} targetType - 目标类型
 * @returns {string} 显示名称
 */
export function getTargetTypeLabel(targetType) {
  return TARGET_TYPE_LABELS[targetType] || targetType;
}

/**
 * 获取回合时机的显示名称
 * @param {string} roundTiming - 回合时机
 * @returns {string} 显示名称
 */
export function getRoundTimingLabel(roundTiming) {
  return ROUND_TIMING_LABELS[roundTiming] || roundTiming;
}

/**
 * 获取所有触发类型列表（用于UI）
 * @returns {Array} 触发类型列表 [{value, label}, ...]
 */
export function getAllTriggerTypes() {
  return Object.entries(TRIGGER_TYPES).map(([key, value]) => ({
    value,
    label: TRIGGER_TYPE_LABELS[value] || value,
  }));
}

/**
 * 获取所有目标类型列表（用于UI）
 * @returns {Array} 目标类型列表 [{value, label}, ...]
 */
export function getAllTargetTypes() {
  return Object.entries(TARGET_TYPES).map(([key, value]) => ({
    value,
    label: TARGET_TYPE_LABELS[value] || value,
  }));
}

/**
 * 获取所有回合时机列表（用于UI）
 * @returns {Array} 回合时机列表 [{value, label}, ...]
 */
export function getAllRoundTimings() {
  return Object.entries(ROUND_TIMING).map(([key, value]) => ({
    value,
    label: ROUND_TIMING_LABELS[value] || value,
  }));
}
