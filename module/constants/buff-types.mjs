/**
 * 书海大陆 TRPG 系统
 * BUFF 类型定义
 *
 * 集中管理所有BUFF效果的定义，避免重复定义
 */

// 预定义BUFF类型
export const BUFF_TYPES = {
  // 增益BUFF
  positive: [
    {
      id: 'strong',
      name: '强壮',
      type: 'positive',
      description: '一回合内 "战斗骰" 的 "骰数" 增加 等同于本效果层数的数值。',
      icon: 'icons/svg/upgrade.svg',
      defaultLayers: 1,
      defaultStrength: 0
    },
    {
      id: 'guard',
      name: '守护',
      type: 'positive',
      description: '一回合内 [被击中时] 受到 最终伤害 减少 等同于本效果层数的数值。',
      icon: 'icons/svg/shield.svg',
      defaultLayers: 1,
      defaultStrength: 0
    },
    {
      id: 'swift',
      name: '迅捷',
      type: 'positive',
      description: '一回合内 所有【行动槽】"速度" 增加 等同于本效果层数的数值。',
      icon: 'icons/svg/wing.svg',
      defaultLayers: 1,
      defaultStrength: 0
    },
    {
      id: 'endure',
      name: '忍耐',
      type: 'positive',
      description: '一回合内 "守备" 的 骰数 增加 等同于本效果层数的数值。',
      icon: 'icons/svg/stone-pile.svg',
      defaultLayers: 1,
      defaultStrength: 0
    },
  ],

  // 减益BUFF
  negative: [
    {
      id: 'weak',
      name: '虚弱',
      type: 'negative',
      description: '一回合内 "战斗骰" 的 "骰数" 减少 等同于本效果层数的数值。',
      icon: 'icons/svg/downgrade.svg',
      defaultLayers: 1,
      defaultStrength: 0
    },
    {
      id: 'vulnerable',
      name: '易损',
      type: 'negative',
      description: '一回合内 [被击中时] 受到 最终伤害 增加 等同于本效果层数的数值。',
      icon: 'icons/svg/break.svg',
      defaultLayers: 1,
      defaultStrength: 0
    },
    {
      id: 'bound',
      name: '束缚',
      type: 'negative',
      description: '一回合内 所有【行动槽】"速度" 减少 等同于本效果层数的数值。',
      icon: 'icons/svg/net.svg',
      defaultLayers: 1,
      defaultStrength: 0
    },
    {
      id: 'flaw',
      name: '破绽',
      type: 'negative',
      description: '一回合内 "守备" 的 骰数 减少 等同于本效果层数的数值。',
      icon: 'icons/svg/hazard.svg',
      defaultLayers: 1,
      defaultStrength: 0
    },
  ],

  // 效果BUFF
  effect: [
    {
      id: 'rupture',
      name: '破裂',
      type: 'effect',
      description: '受到攻击时：附加数值等同于本效果强度的固定伤害。效果生效后，本效果的层数减少1层。',
      icon: 'icons/svg/explosion.svg',
      defaultLayers: 1,
      defaultStrength: 3
    },
    {
      id: 'bleed',
      name: '流血',
      type: 'effect',
      description: '攻击时：受到数值等同于本效果强度的固定伤害。效果生效后，本效果的层数减少1层。',
      icon: 'icons/svg/blood.svg',
      defaultLayers: 1,
      defaultStrength: 2
    },
    {
      id: 'corruption_effect',
      name: '沉沦',
      type: 'effect',
      description: '受到攻击时：增加数值等同于本效果强度的固定侵蚀点数（没有侵蚀值的目标则受到伤害）。效果生效后，本效果的层数减少1层。',
      icon: 'icons/svg/shadow.svg',
      defaultLayers: 1,
      defaultStrength: 2
    },
    {
      id: 'burn',
      name: '燃烧',
      type: 'effect',
      description: '回合结束时：受到数值等同于本效果强度的固定伤害。效果生效后，本效果的层数减少1层。',
      icon: 'icons/svg/fire.svg',
      defaultLayers: 1,
      defaultStrength: 4
    },
    {
      id: 'breath',
      name: '呼吸',
      type: 'effect',
      description: '攻击命中时：呼吸强度和随机值大于15则暴击，触发暴击时使效果层数减少1层。回合结束时，本效果的层数减少1层。',
      icon: 'icons/svg/breath.svg',
      defaultLayers: 1,
      defaultStrength: 5
    },
    {
      id: 'charge',
      name: '充能',
      type: 'effect',
      description: '特定技能发动附加效果所需的资源。最多叠加至20层。回合结束时，本效果的层数减少1层。',
      icon: 'icons/svg/lightning.svg',
      defaultLayers: 1,
      defaultStrength: 0
    },
    {
      id: 'tremor',
      name: '震颤',
      type: 'effect',
      description: '受到造成【震颤引爆】的攻击时：混乱值前移等同于本效果强度的数值。回合结束时，本效果的层数减少1层。',
      icon: 'icons/svg/frozen.svg',
      defaultLayers: 1,
      defaultStrength: 3
    },
    {
      id: 'ammo',
      name: '弹药',
      type: 'effect',
      description: '特定技能进行攻击时消耗的资源。缺少弹药时这些攻击将被取消。',
      icon: 'icons/svg/sword.svg',
      defaultLayers: 10,
      defaultStrength: 0
    },
    {
      id: 'chant',
      name: '吟唱',
      type: 'effect',
      description: '特定技能发动附加效果所需的资源。回合结束时，本效果的层数减少1层。',
      icon: 'icons/svg/book.svg',
      defaultLayers: 1,
      defaultStrength: 0
    },
    {
      id: 'paralyze',
      name: '麻痹',
      type: 'effect',
      description: '你的下一次攻击骰数结果/2。',
      icon: 'icons/svg/paralysis.svg',
      defaultLayers: 1,
      defaultStrength: 0
    },
    {
      id: 'custom',
      name: '自定义',
      type: 'effect',
      description: '自定义效果，名称和层数由创建者指定。',
      icon: 'icons/svg/mystery-man.svg',
      defaultLayers: 1,
      defaultStrength: 0
    }
  ],

  // 衍生BUFF - 增益类（只对特定攻击类别生效）
  derivedPositive: [
    // 斩击强壮
    {
      id: 'strong_slash',
      name: '斩击强壮',
      type: 'derivedPositive',
      category: 'slash',
      description: '一回合内 "斩击" 类别的 "战斗骰" 的 "骰数" 增加 等同于本效果层数的数值。',
      icon: 'icons/svg/upgrade.svg',
      defaultLayers: 1,
      defaultStrength: 0
    },
    // 突刺强壮
    {
      id: 'strong_pierce',
      name: '突刺强壮',
      type: 'derivedPositive',
      category: 'pierce',
      description: '一回合内 "突刺" 类别的 "战斗骰" 的 "骰数" 增加 等同于本效果层数的数值。',
      icon: 'icons/svg/upgrade.svg',
      defaultLayers: 1,
      defaultStrength: 0
    },
    // 打击强壮
    {
      id: 'strong_blunt',
      name: '打击强壮',
      type: 'derivedPositive',
      category: 'blunt',
      description: '一回合内 "打击" 类别的 "战斗骰" 的 "骰数" 增加 等同于本效果层数的数值。',
      icon: 'icons/svg/upgrade.svg',
      defaultLayers: 1,
      defaultStrength: 0
    },
    // 斩击守护
    {
      id: 'guard_slash',
      name: '斩击守护',
      type: 'derivedPositive',
      category: 'slash',
      description: '一回合内 受到 "斩击" 类别的攻击时 受到 最终伤害 减少 等同于本效果层数的数值。',
      icon: 'icons/svg/shield.svg',
      defaultLayers: 1,
      defaultStrength: 0
    },
    // 突刺守护
    {
      id: 'guard_pierce',
      name: '突刺守护',
      type: 'derivedPositive',
      category: 'pierce',
      description: '一回合内 受到 "突刺" 类别的攻击时 受到 最终伤害 减少 等同于本效果层数的数值。',
      icon: 'icons/svg/shield.svg',
      defaultLayers: 1,
      defaultStrength: 0
    },
    // 打击守护
    {
      id: 'guard_blunt',
      name: '打击守护',
      type: 'derivedPositive',
      category: 'blunt',
      description: '一回合内 受到 "打击" 类别的攻击时 受到 最终伤害 减少 等同于本效果层数的数值。',
      icon: 'icons/svg/shield.svg',
      defaultLayers: 1,
      defaultStrength: 0
    }
  ],

  // 衍生BUFF - 减益类（只对特定攻击类别生效）
  derivedNegative: [
    // 斩击虚弱
    {
      id: 'weak_slash',
      name: '斩击虚弱',
      type: 'derivedNegative',
      category: 'slash',
      description: '一回合内 "斩击" 类别的 "战斗骰" 的 "骰数" 减少 等同于本效果层数的数值。',
      icon: 'icons/svg/downgrade.svg',
      defaultLayers: 1,
      defaultStrength: 0
    },
    // 突刺虚弱
    {
      id: 'weak_pierce',
      name: '突刺虚弱',
      type: 'derivedNegative',
      category: 'pierce',
      description: '一回合内 "突刺" 类别的 "战斗骰" 的 "骰数" 减少 等同于本效果层数的数值。',
      icon: 'icons/svg/downgrade.svg',
      defaultLayers: 1,
      defaultStrength: 0
    },
    // 打击虚弱
    {
      id: 'weak_blunt',
      name: '打击虚弱',
      type: 'derivedNegative',
      category: 'blunt',
      description: '一回合内 "打击" 类别的 "战斗骰" 的 "骰数" 减少 等同于本效果层数的数值。',
      icon: 'icons/svg/downgrade.svg',
      defaultLayers: 1,
      defaultStrength: 0
    },
    // 斩击易损
    {
      id: 'vulnerable_slash',
      name: '斩击易损',
      type: 'derivedNegative',
      category: 'slash',
      description: '一回合内 受到 "斩击" 类别的攻击时 受到 最终伤害 增加 等同于本效果层数的数值。',
      icon: 'icons/svg/break.svg',
      defaultLayers: 1,
      defaultStrength: 0
    },
    // 突刺易损
    {
      id: 'vulnerable_pierce',
      name: '突刺易损',
      type: 'derivedNegative',
      category: 'pierce',
      description: '一回合内 受到 "突刺" 类别的攻击时 受到 最终伤害 增加 等同于本效果层数的数值。',
      icon: 'icons/svg/break.svg',
      defaultLayers: 1,
      defaultStrength: 0
    },
    // 打击易损
    {
      id: 'vulnerable_blunt',
      name: '打击易损',
      type: 'derivedNegative',
      category: 'blunt',
      description: '一回合内 受到 "打击" 类别的攻击时 受到 最终伤害 增加 等同于本效果层数的数值。',
      icon: 'icons/svg/break.svg',
      defaultLayers: 1,
      defaultStrength: 0
    }
  ]
};

/**
 * 获取所有BUFF的扁平化列表
 * @returns {Array} 所有BUFF的数组
 */
export function getAllBuffs() {
  return [
    ...BUFF_TYPES.positive,
    ...BUFF_TYPES.negative,
    ...BUFF_TYPES.effect,
    ...BUFF_TYPES.derivedPositive,
    ...BUFF_TYPES.derivedNegative
  ];
}

/**
 * 根据ID查找BUFF定义
 * @param {string} buffId - BUFF ID
 * @returns {Object|undefined} BUFF定义对象，如果找不到则返回undefined
 */
export function findBuffById(buffId) {
  return getAllBuffs().find(b => b.id === buffId);
}

/**
 * 根据中文名称查找BUFF ID
 * @param {string} nameOrId - BUFF中文名称或ID
 * @returns {string} BUFF ID，如果找不到则返回原值
 */
export function normalizeBuffId(nameOrId) {
  if (!nameOrId) return nameOrId;

  // 如果已经是ID（英文），直接返回
  const buff = getAllBuffs().find(b => b.id === nameOrId);
  if (buff) return nameOrId;

  // 查找中文名称
  const buffByName = getAllBuffs().find(b => b.name === nameOrId);
  if (buffByName) return buffByName.id;

  // 找不到，返回原值
  return nameOrId;
}

/**
 * 根据BUFF ID获取中文名称
 * @param {string} buffId - BUFF ID
 * @returns {string} BUFF中文名称，如果找不到则返回ID本身
 */
export function getBuffName(buffId) {
  const buff = findBuffById(buffId);
  return buff ? buff.name : buffId;
}
