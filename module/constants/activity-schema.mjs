/**
 * Activity 系统统一数据结构定义
 *
 * 这个文件定义了 Activity 系统的标准数据结构，
 * 用于编辑器、执行引擎和存储之间的统一格式。
 *
 * 版本: 2.0
 * 日期: 2025-11-17
 */

/**
 * ============================================================
 * 核心原则
 * ============================================================
 * 1. 消耗、添加、恢复/扣除都是数组，可以重复添加多个
 * 2. 目标(target)和回合(roundTiming)是各个操作的子级属性
 * 3. 支持公式和表达式（如 "1d4+3", "{burn.layers}"）
 * 4. 保持与 buff-types.mjs 的兼容性
 */

// ============================================================
// 1. 触发时机类型
// ============================================================

/**
 * 触发时机枚举
 */
export const TRIGGER_TYPES = {
  // 使用时（装备骰、被动骰、武器、防具、触发骰）
  ON_USE: 'onUse',

  // 战斗类时机（战斗骰、守备骰）
  ON_ATTACK: 'onAttack',           // 攻击时
  ON_COUNTER: 'onCounter',         // 对抗时
  ON_COUNTER_SUCCESS: 'onCounterSuccess',  // 对抗成功
  ON_COUNTER_FAIL: 'onCounterFail',       // 对抗失败
  ON_HIT: 'onHit',                 // 攻击命中
  ON_DAMAGED: 'onDamaged',         // 受到伤害

  // 被动触发（装备骰、被动骰、武器、防具、触发骰）
  PASSIVE: 'passive',

  // 回合时机（所有类型）
  ON_ROUND_START: 'onRoundStart',  // 回合开始
  ON_ROUND_END: 'onRoundEnd',      // 回合结束

  // 特殊（战斗骰）
  ON_FLASH_STRIKE: 'onFlashStrike', // 闪击☪
  ON_DISCARD: 'onDiscard'           // 丢弃✦
};

/**
 * 触发时机显示标签
 */
export const TRIGGER_LABELS = {
  [TRIGGER_TYPES.ON_USE]: '使用时',
  [TRIGGER_TYPES.ON_ATTACK]: '攻击时',
  [TRIGGER_TYPES.ON_COUNTER]: '对抗时',
  [TRIGGER_TYPES.ON_COUNTER_SUCCESS]: '对抗成功',
  [TRIGGER_TYPES.ON_COUNTER_FAIL]: '对抗失败',
  [TRIGGER_TYPES.ON_HIT]: '攻击命中',
  [TRIGGER_TYPES.ON_DAMAGED]: '受到伤害',
  [TRIGGER_TYPES.PASSIVE]: '被动触发',
  [TRIGGER_TYPES.ON_ROUND_START]: '回合开始',
  [TRIGGER_TYPES.ON_ROUND_END]: '回合结束',
  [TRIGGER_TYPES.ON_FLASH_STRIKE]: '闪击☪',
  [TRIGGER_TYPES.ON_DISCARD]: '丢弃✦'
};

// ============================================================
// 2. 条件类型
// ============================================================

/**
 * 条件类型枚举
 */
export const CONDITION_TYPES = {
  // 属性类
  ATTRIBUTE: 'attribute',           // 生命值、侵蚀度、混乱值、总速度
  ARMOR_RESISTANCE: 'armorResistance',  // 防具抗性

  // 资源类
  RESOURCE: 'resource',             // 激活情况、额外Cost、EX

  // BUFF类
  HAS_BUFF: 'hasBuff',              // 拥有指定BUFF
  BUFF_LAYER: 'buffLayer',          // BUFF层数条件
  BUFF_STRENGTH: 'buffStrength'     // BUFF强度条件
};

/**
 * 属性类型枚举
 */
export const ATTRIBUTE_TYPES = {
  HP: 'hp',                   // 生命值
  CORRUPTION: 'corruption',   // 侵蚀度
  CHAOS: 'chaos',             // 混乱值
  TOTAL_SPEED: 'totalSpeed'   // 总速度
};

/**
 * 资源类型枚举
 */
export const RESOURCE_TYPES = {
  ACTIVATED_SLOTS: 'activatedSlots',  // 激活情况（基础Cost）
  EXTRA_COST: 'extraCost',            // 额外Cost
  EX: 'ex'                            // EX
};

/**
 * 操作符枚举
 */
export const OPERATORS = {
  GT: '>',
  LT: '<',
  GTE: '>=',
  LTE: '<=',
  EQ: '==',
  NEQ: '!='
};

// ============================================================
// 3. 目标类型
// ============================================================

/**
 * 目标类型枚举
 */
export const TARGET_TYPES = {
  SELF: 'self',           // 自己
  TARGET: 'target',       // 目标（单个）
  MULTIPLE: 'multiple'    // 多目标
};

/**
 * 目标显示标签
 */
export const TARGET_LABELS = {
  [TARGET_TYPES.SELF]: '自己',
  [TARGET_TYPES.TARGET]: '目标',
  [TARGET_TYPES.MULTIPLE]: '多目标'
};

// ============================================================
// 4. 回合时机
// ============================================================

/**
 * 回合时机枚举
 */
export const ROUND_TIMING = {
  CURRENT: 'current',  // 本回合
  NEXT: 'next',        // 下回合
  BOTH: 'both'         // 本回合和下回合
};

/**
 * 回合时机显示标签
 */
export const ROUND_TIMING_LABELS = {
  [ROUND_TIMING.CURRENT]: '本回合',
  [ROUND_TIMING.NEXT]: '下回合',
  [ROUND_TIMING.BOTH]: '本回合和下回合'
};

// ============================================================
// 5. 效果类型
// ============================================================

/**
 * 效果类型枚举
 */
export const EFFECT_TYPES = {
  // 添加类
  ADD_BUFF: 'addBuff',              // 添加BUFF（可重复）

  // 消耗类
  CONSUME_BUFF: 'consumeBuff',      // 消耗BUFF
  CONSUME_ATTRIBUTE: 'consumeAttribute',  // 消耗属性（生命值、侵蚀度等）
  CONSUME_RESOURCE: 'consumeResource',    // 消耗资源（额外Cost、EX）

  // 恢复/扣除类
  HEAL: 'heal',                     // 恢复生命值
  DEAL_DAMAGE: 'dealDamage',        // 造成伤害/扣除生命值
  CHANGE_ATTRIBUTE: 'changeAttribute',    // 改变属性值（侵蚀度、混乱值）
  RESTORE_RESOURCE: 'restoreResource',    // 恢复资源（额外Cost、EX）
  DRAW_ACTIVATION: 'drawActivation',      // 抽取激活

  // 修正类
  MODIFY_DICE: 'modifyDice',        // 修正骰子

  // 清除类
  CLEAR_BUFF: 'clearBuff',          // 清除BUFF

  // 特殊类
  REUSE_DICE: 'reuseDice'           // 再次使用骰子
};

/**
 * 修正类型枚举
 */
export const MODIFY_TYPES = {
  DICE_COUNT: 'diceCount',    // 修正骰数（3d6中的3）
  DICE_FACE: 'diceFace',      // 修正骰面（3d6中的6）
  FINAL_VALUE: 'finalValue'   // 修正值（最终结果）
};

// ============================================================
// 6. 消耗类型
// ============================================================

/**
 * 消耗模式枚举
 */
export const CONSUME_MODE = {
  NONE: 'none',         // 无消耗
  MANDATORY: 'mandatory',   // 强制消耗
  OPTIONAL: 'optional'      // 选择消耗
};

// ============================================================
// 数据结构模板
// ============================================================

/**
 * Activity 完整数据结构模板
 *
 * @typedef {Object} ActivityData
 */
export const ACTIVITY_TEMPLATE = {
  // 基础信息
  _id: '',              // Activity ID
  name: '',             // 活动名称

  // 1. 触发时机（必选）
  trigger: {
    type: '',           // 触发类型（TRIGGER_TYPES）
    passive: false,     // 是否为被动触发
    category: null      // 被动触发的分类限制（'slash', 'pierce', 'blunt'）
  },

  // 2. 条件（可选）
  conditions: [
    // 示例：属性类条件
    {
      type: CONDITION_TYPES.ATTRIBUTE,
      target: TARGET_TYPES.SELF,
      attribute: ATTRIBUTE_TYPES.HP,
      operator: OPERATORS.GT,
      value: 50
    },
    // 示例：BUFF层数条件
    {
      type: CONDITION_TYPES.BUFF_LAYER,
      target: TARGET_TYPES.SELF,
      buffId: 'grandMagic',
      operator: OPERATORS.GT,
      value: 10
    },
    // 示例：防具抗性条件
    {
      type: CONDITION_TYPES.ARMOR_RESISTANCE,
      target: TARGET_TYPES.TARGET,
      category: 'pierce',  // 'slash', 'pierce', 'blunt'
      value: 'weak'        // 'weak' 或 'resist'
    }
  ],

  // 3. 消耗（可选）
  consume: {
    mode: CONSUME_MODE.MANDATORY,  // 消耗模式

    // mandatory 模式：强制消耗（数组，可重复）
    resources: [
      {
        type: 'buff',
        buffId: 'chant',
        layers: 4
      },
      {
        type: 'attribute',
        attribute: 'hp',
        value: 10
      },
      {
        type: 'resource',
        resource: 'extraCost',
        amount: 1
      }
    ],

    // optional 模式：选择消耗
    options: [
      {
        label: '选项1描述',
        resources: [
          { type: 'resource', resource: 'extraCost', amount: 1 }
        ],
        effects: [
          { type: EFFECT_TYPES.ADD_BUFF, buffId: 'rupture', layers: 1, strength: 2, target: TARGET_TYPES.TARGET }
        ]
      },
      {
        label: '选项2描述',
        resources: [
          { type: 'resource', resource: 'extraCost', amount: 2 }
        ],
        effects: [
          { type: EFFECT_TYPES.MODIFY_DICE, modifyType: MODIFY_TYPES.FINAL_VALUE, value: 6 },
          { type: EFFECT_TYPES.ADD_BUFF, buffId: 'strong_slash', layers: 1, roundTiming: ROUND_TIMING.NEXT, target: TARGET_TYPES.SELF }
        ]
      }
    ]
  },

  // 4-8. 效果列表（可选，数组，可重复添加）
  effects: [
    // 添加BUFF（可重复）
    {
      type: EFFECT_TYPES.ADD_BUFF,
      buffId: 'strong',
      layers: 2,              // 支持数字或公式 "1d4+3"
      strength: 0,            // 支持数字或公式
      target: TARGET_TYPES.SELF,
      roundTiming: ROUND_TIMING.CURRENT,
      targetSelectionType: 'auto',  // 'auto' 或 'click'（多目标时）
      maxTargets: null        // 多目标时的最大数量
    },
    {
      type: EFFECT_TYPES.ADD_BUFF,
      buffId: 'charge',
      layers: 5,
      strength: 0,
      target: TARGET_TYPES.SELF,
      roundTiming: ROUND_TIMING.CURRENT
    },

    // 消耗BUFF
    {
      type: EFFECT_TYPES.CONSUME_BUFF,
      buffId: 'charge',
      layers: 2,
      target: TARGET_TYPES.SELF
    },

    // 清除BUFF
    {
      type: EFFECT_TYPES.CLEAR_BUFF,
      buffId: 'blackFlame',
      target: TARGET_TYPES.SELF
    },

    // 恢复生命值（可重复）
    {
      type: EFFECT_TYPES.HEAL,
      formula: '1d6',         // 支持公式
      target: TARGET_TYPES.SELF
    },

    // 造成伤害/扣除生命值
    {
      type: EFFECT_TYPES.DEAL_DAMAGE,
      formula: '2d6',
      damageType: 'direct',   // 'direct', 'slash', 'pierce', 'blunt'
      target: TARGET_TYPES.TARGET
    },

    // 改变属性（侵蚀度、混乱值）
    {
      type: EFFECT_TYPES.CHANGE_ATTRIBUTE,
      attribute: ATTRIBUTE_TYPES.CORRUPTION,
      value: -5,              // 正数增加，负数减少
      target: TARGET_TYPES.SELF
    },

    // 恢复资源（可重复）
    {
      type: EFFECT_TYPES.RESTORE_RESOURCE,
      resource: RESOURCE_TYPES.EXTRA_COST,
      amount: 1,
      target: TARGET_TYPES.SELF
    },

    // 抽取激活
    {
      type: EFFECT_TYPES.DRAW_ACTIVATION,
      category: 'choice',     // 激活类别
      count: 3,               // 抽取数量
      target: TARGET_TYPES.SELF
    },

    // 修正骰子
    {
      type: EFFECT_TYPES.MODIFY_DICE,
      modifyType: MODIFY_TYPES.FINAL_VALUE,
      value: 2,               // 支持数字或公式
      formula: '{charge.layers}'
    },

    // 再次使用骰子
    {
      type: EFFECT_TYPES.REUSE_DICE,
      limitPerRound: 1
    }
  ],

  // 次数限制（可选）
  usageLimit: {
    type: 'perRound',       // 'perRound' 或 'perCombat'
    count: 1
  }
};

// ============================================================
// 示例数据
// ============================================================

/**
 * 示例1：使用时，本回合获得 2 层【守护】和 5 层【充能】
 */
export const EXAMPLE_1 = {
  _id: 'example-1',
  name: '使用时-双重增益',
  trigger: {
    type: TRIGGER_TYPES.ON_USE,
    passive: false,
    category: null
  },
  conditions: [],
  consume: {
    mode: CONSUME_MODE.NONE,
    resources: []
  },
  effects: [
    {
      type: EFFECT_TYPES.ADD_BUFF,
      buffId: 'guard',
      layers: 2,
      strength: 0,
      target: TARGET_TYPES.SELF,
      roundTiming: ROUND_TIMING.CURRENT
    },
    {
      type: EFFECT_TYPES.ADD_BUFF,
      buffId: 'charge',
      layers: 5,
      strength: 0,
      target: TARGET_TYPES.SELF,
      roundTiming: ROUND_TIMING.CURRENT
    }
  ]
};

/**
 * 示例2：对抗胜利，为自己恢复 1d6的【生命值】和 1 点【额外Cost】
 */
export const EXAMPLE_2 = {
  _id: 'example-2',
  name: '对抗胜利-双重恢复',
  trigger: {
    type: TRIGGER_TYPES.ON_COUNTER_SUCCESS,
    passive: false,
    category: null
  },
  conditions: [],
  consume: {
    mode: CONSUME_MODE.NONE,
    resources: []
  },
  effects: [
    {
      type: EFFECT_TYPES.HEAL,
      formula: '1d6',
      target: TARGET_TYPES.SELF
    },
    {
      type: EFFECT_TYPES.RESTORE_RESOURCE,
      resource: RESOURCE_TYPES.EXTRA_COST,
      amount: 1,
      target: TARGET_TYPES.SELF
    }
  ]
};

/**
 * 示例3：命中时，若【宏伟法术】层数>10，再次使用本骰（一回合1次）
 */
export const EXAMPLE_3 = {
  _id: 'example-3',
  name: '命中时-再次使用',
  trigger: {
    type: TRIGGER_TYPES.ON_HIT,
    passive: false,
    category: null
  },
  conditions: [
    {
      type: CONDITION_TYPES.BUFF_LAYER,
      target: TARGET_TYPES.SELF,
      buffId: 'grandMagic',
      operator: OPERATORS.GT,
      value: 10
    }
  ],
  consume: {
    mode: CONSUME_MODE.NONE,
    resources: []
  },
  effects: [
    {
      type: EFFECT_TYPES.REUSE_DICE,
      limitPerRound: 1
    }
  ],
  usageLimit: {
    type: 'perRound',
    count: 1
  }
};

/**
 * 示例4：消耗 4 层【吟唱】，命中时为目标添加 1 层【燃烧2】
 */
export const EXAMPLE_4 = {
  _id: 'example-4',
  name: '命中时-燃烧效果',
  trigger: {
    type: TRIGGER_TYPES.ON_HIT,
    passive: false,
    category: null
  },
  conditions: [],
  consume: {
    mode: CONSUME_MODE.MANDATORY,
    resources: [
      {
        type: 'buff',
        buffId: 'chant',
        layers: 4
      }
    ]
  },
  effects: [
    {
      type: EFFECT_TYPES.ADD_BUFF,
      buffId: 'burn',
      layers: 1,
      strength: 2,
      target: TARGET_TYPES.TARGET,
      roundTiming: ROUND_TIMING.CURRENT
    }
  ]
};

/**
 * 示例5：使用突刺类战斗骰时，被动触发，最终伤害+2
 */
export const EXAMPLE_5 = {
  _id: 'example-5',
  name: '被动触发-伤害增强',
  trigger: {
    type: TRIGGER_TYPES.PASSIVE,
    passive: true,
    category: 'pierce'
  },
  conditions: [],
  consume: {
    mode: CONSUME_MODE.NONE,
    resources: []
  },
  effects: [
    {
      type: EFFECT_TYPES.MODIFY_DICE,
      modifyType: MODIFY_TYPES.FINAL_VALUE,
      value: 2
    }
  ]
};

// ============================================================
// 工具函数
// ============================================================

/**
 * 创建默认的 Activity
 * @returns {Object} 默认 Activity 数据
 */
export function createDefaultActivity() {
  return {
    _id: foundry.utils.randomID(),
    name: '',
    trigger: {
      type: TRIGGER_TYPES.ON_USE,
      passive: false,
      category: null
    },
    conditions: [],
    consume: {
      mode: CONSUME_MODE.NONE,
      resources: [],
      options: []
    },
    effects: [],
    usageLimit: null
  };
}

/**
 * 验证 Activity 数据结构
 * @param {Object} activity - Activity 数据
 * @returns {Object} { valid: boolean, errors: string[] }
 */
export function validateActivity(activity) {
  const errors = [];

  // 检查必需字段
  if (!activity._id) errors.push('缺少 _id');
  if (!activity.name) errors.push('缺少 name');
  if (!activity.trigger || !activity.trigger.type) errors.push('缺少 trigger.type');

  // 检查触发类型
  if (activity.trigger && !Object.values(TRIGGER_TYPES).includes(activity.trigger.type)) {
    errors.push(`无效的触发类型: ${activity.trigger.type}`);
  }

  // 检查条件
  if (activity.conditions) {
    activity.conditions.forEach((cond, index) => {
      if (!Object.values(CONDITION_TYPES).includes(cond.type)) {
        errors.push(`条件${index}: 无效的条件类型 ${cond.type}`);
      }
      if (!Object.values(TARGET_TYPES).includes(cond.target)) {
        errors.push(`条件${index}: 无效的目标类型 ${cond.target}`);
      }
    });
  }

  // 检查效果
  if (activity.effects) {
    activity.effects.forEach((effect, index) => {
      if (!Object.values(EFFECT_TYPES).includes(effect.type)) {
        errors.push(`效果${index}: 无效的效果类型 ${effect.type}`);
      }
      if (effect.target && !Object.values(TARGET_TYPES).includes(effect.target)) {
        errors.push(`效果${index}: 无效的目标类型 ${effect.target}`);
      }
    });
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * 获取所有触发类型列表（用于UI）
 * @returns {Array} [{value, label}, ...]
 */
export function getAllTriggerTypes() {
  return Object.entries(TRIGGER_TYPES).map(([key, value]) => ({
    value,
    label: TRIGGER_LABELS[value] || value
  }));
}

/**
 * 获取所有目标类型列表（用于UI）
 * @returns {Array} [{value, label}, ...]
 */
export function getAllTargetTypes() {
  return Object.entries(TARGET_TYPES).map(([key, value]) => ({
    value,
    label: TARGET_LABELS[value] || value
  }));
}

/**
 * 获取所有回合时机列表（用于UI）
 * @returns {Array} [{value, label}, ...]
 */
export function getAllRoundTimings() {
  return Object.entries(ROUND_TIMING).map(([key, value]) => ({
    value,
    label: ROUND_TIMING_LABELS[value] || value
  }));
}
