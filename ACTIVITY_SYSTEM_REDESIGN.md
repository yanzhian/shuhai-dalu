# Activity 系统重新设计方案

**基于用户需求的完整重构方案**
**日期**: 2025-11-17

---

## 📋 核心设计理念

### 用户的关键洞察

> **"所有的【骰子】都有自己的独特的一面，所以编辑器肯定是无法完成所有【骰子】的效果"**

因此，编辑器的定位是：
- ✅ **处理标准化的基础操作**：添加、消耗、条件判断
- ✅ **组合式设计**：通过组合基础操作实现复杂效果
- ❌ **不追求完全自动化**：复杂逻辑保留自定义能力

---

## 🎯 八大需求详解

### 1️⃣ 触发时机（必选项）

**只有满足触发时机才能继续**

#### 分类体系

| 触发类型 | 适用物品类型 | 触发方式 | 说明 |
|---------|------------|---------|------|
| **使用时** | 装备骰、被动骰、武器、防具、触发骰 | 点击使用按钮 | actor-player-sheet.hbs 或 combat-area.hbs |
| **攻击时** | 战斗骰、守备骰 | 战斗流程 | 发起攻击时触发 |
| **对抗时** | 战斗骰、守备骰 | 战斗流程 | 对抗判定时触发 |
| **对抗成功** | 战斗骰、守备骰 | 战斗流程 | 对抗胜利时触发 |
| **对抗失败** | 战斗骰、守备骰 | 战斗流程 | 对抗失败时触发 |
| **攻击命中** | 战斗骰、守备骰 | 战斗流程 | 攻击成功命中时触发 |
| **受到伤害** | 战斗骰、守备骰 | 战斗流程 | 受到伤害时触发 |
| **被动触发** | 装备骰、被动骰、武器、防具、触发骰 | 战斗流程 | 满足条件自动触发 |
| **回合开始** | 所有类型 | 回合流程 | 回合开始时，满足条件触发 |
| **回合结束** | 所有类型 | 回合流程 | 回合结束时，满足条件触发 |
| **闪击☪** | 战斗骰 | 点击闪击按钮 | 清除激活标记 |
| **丢弃✦** | 战斗骰 | 点击丢弃按钮 | 清除激活标记 |

#### 被动触发详解

- **触发条件**: 在战斗流程中满足特定条件
- **示例1**: 银刺（武器-西洋剑）
  - 条件: 使用【突刺】分类的【战斗骰】
  - 效果: 本骰【最终伤害】+2
- **示例2**: 荆棘藤甲（防具-藤甲）
  - 条件: 受到【突刺】分类的伤害
  - 效果: 受到伤害-2

---

### 2️⃣ 条件（可选项）

**满足条件后才继续触发**

#### 条件分类

##### A. 属性类
- **生命值**: `{ type: "attribute", attribute: "hp", operator: ">", value: 50, target: "self" }`
- **侵蚀度**: `{ type: "attribute", attribute: "corruption", operator: "<=", value: 10 }`
- **混乱值**: `{ type: "attribute", attribute: "chaos", operator: ">=", value: 20 }`
- **总速度**: `{ type: "attribute", attribute: "totalSpeed", operator: ">", value: 15 }`
- **防具抗性**: `{ type: "armorResistance", category: "pierce", value: "weak", target: "target" }`

**示例**:
```
命中时：若目标【突刺】抗性为弱性，下回合为目标添加 1 层【虚弱】
```
```javascript
{
  trigger: "onHit",
  conditions: [
    { type: "armorResistance", category: "pierce", value: "weak", target: "target" }
  ],
  effects: [
    { type: "addBuff", buffId: "weak", layers: 1, roundTiming: "next", target: "target" }
  ]
}
```

##### B. 资源类
- **激活情况（基础Cost）**: `{ type: "resource", resource: "activatedSlots", operator: ">=", value: 3 }`
- **额外Cost**: `{ type: "resource", resource: "extraCost", operator: ">=", value: 1 }`
- **EX**: `{ type: "resource", resource: "ex", operator: ">=", value: 2 }`

**示例**:
```
对抗时：若你拥有【额外Cost】，则本骰【最终骰数】 + 2
```
```javascript
{
  trigger: "onCounter",
  conditions: [
    { type: "resource", resource: "extraCost", operator: ">=", value: 1, target: "self" }
  ],
  effects: [
    { type: "modifyDice", modifyType: "finalValue", value: 2 }
  ]
}
```

##### C. BUFF类
- **效果BUFF**: `{ type: "hasBuff", buffId: "burn", target: "self" }`
- **BUFF层数**: `{ type: "buffLayer", buffId: "grandMagic", operator: ">", value: 10 }`
- **BUFF强度**: `{ type: "buffStrength", buffId: "burn", operator: "==", value: 15 }`

**示例1**:
```
命中时：若你【宏伟法术】层数大于 10 层，则再次使用本骰（一回合 1 次）
```
```javascript
{
  trigger: "onHit",
  conditions: [
    { type: "buffLayer", buffId: "grandMagic", operator: ">", value: 10, target: "self" }
  ],
  effects: [
    { type: "reuseDice", limitPerRound: 1 }
  ]
}
```

**示例2**:
```
若【燃烧】强度为 15，则受到 {【黑炎】层数 * 【燃烧】强度} 的伤害，之后清除【黑炎】
```
```javascript
{
  trigger: "onTurnEnd",
  conditions: [
    { type: "buffStrength", buffId: "burn", operator: "==", value: 15, target: "self" }
  ],
  effects: [
    { type: "dealDamage", formula: "{blackFlame.layers} * {burn.strength}", target: "self" },
    { type: "clearBuff", buffId: "blackFlame", target: "self" }
  ]
}
```

#### 条件目标
- **自己**: 条件检查自己的状态
- **目标**: 条件检查目标的状态

---

### 3️⃣ 消耗（可选项）

#### 消耗类型分类

| 消耗类型 | 说明 | 示例 |
|---------|------|------|
| **生命值** | 扣除HP | 消耗 10 点生命值 |
| **侵蚀度** | 增加侵蚀度 | 消耗 5 点侵蚀度 |
| **混乱值** | 移动混乱值标记 | 消耗 3 点混乱值 |
| **额外Cost** | 消耗额外Cost槽 | 消耗 1 个额外Cost |
| **EX** | 消耗EX槽 | 消耗 2 个EX |
| **效果BUFF** | 消耗BUFF层数 | 消耗 4 层【吟唱】 |
| **自定义BUFF** | 消耗自定义BUFF | 消耗 3 层【羽翼】 |

#### A. 强制消耗

**特点**: 必须消耗，不足则无法触发

**示例**:
```
消耗：4 层【吟唱】
命中时：为目标添加 1 层【燃烧2】
```
```javascript
{
  trigger: "onHit",
  consume: {
    type: "mandatory",
    resources: [
      { type: "buff", buffId: "chant", layers: 4 }
    ]
  },
  effects: [
    { type: "addBuff", buffId: "burn", layers: 1, strength: 2, target: "target" }
  ]
}
```

#### B. 选择消耗

**特点**: 弹窗询问，可能有多个选择

**示例**:
```
命中时：选择以下效果
· 消耗：【额外Cost 1】，则为目标添加 1 层【破裂2】
· 消耗：【额外Cost 2】，则本骰【最终骰数】 + 6，下回合为自己添加 1 层【斩击强化】
```
```javascript
{
  trigger: "onHit",
  consume: {
    type: "optional",
    options: [
      {
        label: "消耗 1 个额外Cost - 添加破裂",
        resources: [
          { type: "extraCost", amount: 1 }
        ],
        effects: [
          { type: "addBuff", buffId: "rupture", layers: 1, strength: 2, target: "target" }
        ]
      },
      {
        label: "消耗 2 个额外Cost - 增强攻击",
        resources: [
          { type: "extraCost", amount: 2 }
        ],
        effects: [
          { type: "modifyDice", modifyType: "finalValue", value: 6 },
          { type: "addBuff", buffId: "strong_slash", layers: 1, roundTiming: "next", target: "self" }
        ]
      }
    ]
  }
}
```

---

### 4️⃣ 添加（可选项）

#### A. 效果BUFF（从 buff-types.mjs）

**支持所有基础BUFF**:
- 增益: 强壮、守护、迅捷、忍耐
- 减益: 虚弱、易损、束缚、破绽
- 效果: 破裂、流血、沉沦、燃烧、呼吸、充能、震颤、弹药、吟唱、麻痹
- 衍生: 斩击强壮、突刺虚弱、打击守护等

**示例**:
```
命中时：为目标添加 2 层【流血4】
```
```javascript
{
  effects: [
    {
      type: "addBuff",
      buffId: "bleed",
      layers: 2,      // 层数
      strength: 4,    // 强度
      target: "target"
    }
  ]
}
```

**支持公式**:
```
使用时：为自己添加 1D4+3 层【吟唱】
```
```javascript
{
  effects: [
    {
      type: "addBuff",
      buffId: "chant",
      layers: "1d4+3",  // 公式
      strength: 0,
      target: "self"
    }
  ]
}
```

#### B. 自定义BUFF

**特点**:
- **仅支持添加/消耗/条件判断**
- **需要通道编写自定义BUFF的触发时机和效果**
- 同样支持层数和强度

**设计方案**:
```javascript
// 在 buff-types.mjs 中定义自定义BUFF
export const CUSTOM_BUFF_DEFINITIONS = {
  blackFlame: {
    id: 'blackFlame',
    name: '黑炎',
    type: 'custom',
    icon: 'icons/svg/fire-black.svg',
    defaultLayers: 1,
    defaultStrength: 0,

    // 自定义触发逻辑（可选）
    customTriggers: {
      onDamaged: async function(actor, buff, context) {
        // 受到伤害时的自定义逻辑
        const damage = buff.layers * buff.strength;
        await actor.takeDamage(damage);
      }
    }
  },

  feather: {
    id: 'feather',
    name: '羽翼',
    type: 'custom',
    icon: 'icons/svg/feather.svg',
    defaultLayers: 3,
    defaultStrength: 0
  }
};
```

**使用方式与效果BUFF相同**:
```javascript
{
  effects: [
    {
      type: "addBuff",
      buffId: "blackFlame",  // 自定义BUFF ID
      layers: 2,
      strength: 5,
      target: "self"
    }
  ]
}
```

---

### 5️⃣ 恢复/扣除（可选项）

#### A. 属性和资源类

| 类型 | 操作 | 示例 |
|------|------|------|
| **生命值** | 恢复/扣除 | `{ type: "heal", formula: "1d8" }` |
| **侵蚀度** | 恢复/扣除 | `{ type: "changeCorruption", value: -5 }` |
| **混乱值** | 恢复/扣除 | `{ type: "changeChaos", value: 3 }` |
| **额外Cost** | 恢复/扣除 | `{ type: "restoreCost", amount: 2 }` |
| **EX** | 恢复/扣除 | `{ type: "restoreEX", amount: 1 }` |

#### Cost定义澄清

**重要**: 明确三种Cost的区别

1. **基础Cost（激活）**: 战斗骰从空心变成实心金色
2. **额外Cost**: combat-area.hbs 中 resource-row 的 cost 槽
3. **EX**: combat-area.hbs 中 resource-row 的 ex 槽

**默认状态**: 所有槽都是空心（未激活）

**恢复操作**:
- 恢复额外Cost = 将空心变成实心（激活）
- 恢复EX = 将空心变成实心（激活）

**示例**:
```
使用时：为自己恢复 1d8 的【生命值】
```
```javascript
{
  effects: [
    { type: "heal", formula: "1d8", target: "self" }
  ]
}
```

```
攻击时：为自己扣除 2d6 的【生命值】
```
```javascript
{
  effects: [
    { type: "dealDamage", formula: "2d6", target: "self" }
  ]
}
```

#### B. 抽取激活（特殊恢复）

**特点**: 直接调用抽取激活系统

**示例1**:
```
使用时：抽取 1 个【抉择】标记
```
```javascript
{
  effects: [
    { type: "drawActivation", category: "choice", count: 1 }
  ]
}
```

**示例2**:
```
闪击☪：消耗 1 层【羽翼】标记，抽取 3 个【抉择】标记
```
```javascript
{
  trigger: "onFlashStrike",
  consume: {
    type: "mandatory",
    resources: [
      { type: "buff", buffId: "feather", layers: 1 }
    ]
  },
  effects: [
    { type: "drawActivation", category: "choice", count: 3 }
  ]
}
```

---

### 6️⃣ 修正（可选项）

#### 三种修正类型

##### A. 修正骰数
**定义**: 3d6 中的 **3**（骰子数量）

```javascript
{
  type: "modifyDice",
  modifyType: "diceCount",
  value: 2,  // +2个骰子，3d6 → 5d6
  formula: "{charge.layers}"  // 也可以用公式
}
```

##### B. 修正骰面
**定义**: 3d6 中的 **6**（骰子面数）

```javascript
{
  type: "modifyDice",
  modifyType: "diceFace",
  value: 2,  // 3d6 → 3d8
  formula: "floor({burn.layers}/2)"
}
```

##### C. 修正值（最终骰数）
**定义**: 骰子结果的最终调整（最常用）

**示例**: `1d4+2` 或 `20-2d6` 的最后结果调整

```javascript
{
  type: "modifyDice",
  modifyType: "finalValue",
  value: 5,  // 最终结果 +5
  formula: "{strong.layers} * 2"  // 或公式
}
```

**完整示例**:
```
对抗时：本骰【最终骰数】 + {充能层数}
```
```javascript
{
  trigger: "onCounter",
  effects: [
    {
      type: "modifyDice",
      modifyType: "finalValue",
      formula: "{charge.layers}"
    }
  ]
}
```

---

### 7️⃣ 目标（子选择，默认为自己）

#### 重要特性
- **不是父级，是各个操作的子级**
- 每个效果、条件、消耗都有自己的 `target`

#### 三种目标类型

##### A. 自己
```javascript
{ type: "addBuff", buffId: "strong", layers: 2, target: "self" }
```

##### B. 目标（单个）
- 在战斗时机中，默认指对手
- 在【使用时】如果没有指定目标，发送聊天框让其他玩家点击

```javascript
{ type: "addBuff", buffId: "weak", layers: 1, target: "target" }
```

**使用时的目标选择流程**:
```javascript
{
  trigger: "onUse",
  effects: [
    {
      type: "addBuff",
      buffId: "strong",
      layers: 3,
      target: "target",  // 需要选择目标
      targetSelectionType: "click"  // 发送聊天框点击
    }
  ]
}
```

##### C. 多目标
发送聊天框让 N 个目标点击触发（N 不做限制）

```javascript
{
  trigger: "onUse",
  effects: [
    {
      type: "addBuff",
      buffId: "guard",
      layers: 2,
      target: "multiple",
      maxTargets: 3,  // 可选：最多3个目标
      targetSelectionType: "click"
    }
  ]
}
```

---

### 8️⃣ 回合（子选择，默认为本回合）

#### 重要特性
- **不是父级，是各个操作的子级**
- 主要用于 `addBuff` 和其他有时效的效果

#### 三种回合选项

```javascript
{
  type: "addBuff",
  buffId: "strong",
  layers: 2,
  roundTiming: "current"  // 本回合
}

{
  type: "addBuff",
  buffId: "weak",
  layers: 1,
  roundTiming: "next"  // 下回合
}

{
  type: "addBuff",
  buffId: "guard",
  layers: 3,
  roundTiming: "both"  // 本回合和下回合
}
```

---

## 📐 统一的数据结构设计

### 完整的 Activity 结构

```javascript
{
  // 基础信息
  _id: "activity-uuid",
  name: "活动名称",

  // 1. 触发时机（必选）
  trigger: {
    type: "onHit" | "onUse" | "onCounter" | ...,
    // 可选：额外触发条件（如特定分类）
    category: "pierce",  // 仅触发突刺类攻击
    passive: true  // 被动触发标记
  },

  // 2. 条件（可选）
  conditions: [
    {
      type: "attribute" | "resource" | "hasBuff" | "buffLayer" | "buffStrength" | "armorResistance",
      target: "self" | "target",
      // 具体参数根据类型不同
      attribute: "hp",
      operator: ">" | "<" | ">=" | "<=" | "==",
      value: 50,
      // 或
      buffId: "burn",
      // 或
      resource: "extraCost"
    }
  ],

  // 3. 消耗（可选）
  consume: {
    type: "mandatory" | "optional",

    // mandatory 模式
    resources: [
      {
        type: "buff" | "attribute" | "resource",
        buffId: "chant",
        layers: 4,
        // 或
        attribute: "hp",
        value: 10
      }
    ],

    // optional 模式
    options: [
      {
        label: "选项1描述",
        resources: [...],
        effects: [...]
      },
      {
        label: "选项2描述",
        resources: [...],
        effects: [...]
      }
    ]
  },

  // 4-8. 效果列表（可选）
  effects: [
    // 添加BUFF
    {
      type: "addBuff",
      buffId: "strong",
      layers: "1d4+3",  // 支持公式
      strength: 2,
      target: "self" | "target" | "multiple",
      roundTiming: "current" | "next" | "both",
      targetSelectionType: "auto" | "click",  // 目标选择方式
      maxTargets: 3  // 多目标时的最大数量
    },

    // 消耗BUFF
    {
      type: "consumeBuff",
      buffId: "charge",
      layers: 2,
      target: "self"
    },

    // 清除BUFF
    {
      type: "clearBuff",
      buffId: "blackFlame",
      target: "self"
    },

    // 造成伤害
    {
      type: "dealDamage",
      formula: "2d6+{burn.strength}",
      damageType: "direct" | "slash" | "pierce" | "blunt",
      target: "target"
    },

    // 恢复生命
    {
      type: "heal",
      formula: "1d8+2",
      target: "self"
    },

    // 修正骰子
    {
      type: "modifyDice",
      modifyType: "diceCount" | "diceFace" | "finalValue",
      value: 2,
      formula: "{charge.layers}"
    },

    // 恢复资源
    {
      type: "restoreCost" | "restoreEX",
      amount: 2
    },

    // 抽取激活
    {
      type: "drawActivation",
      category: "choice",
      count: 3
    },

    // 再次使用骰子
    {
      type: "reuseDice",
      limitPerRound: 1
    }
  ],

  // 次数限制（可选）
  usageLimit: {
    type: "perRound" | "perCombat",
    count: 1
  }
}
```

---

## 🛠️ 编辑器改造方案

### 基础编辑器 UI 结构

```
┌─────────────────────────────────────────┐
│ Activity 编辑器                          │
├─────────────────────────────────────────┤
│                                         │
│ 【基础信息】                              │
│  ┌─ 活动名称: [__________________]      │
│                                         │
│ 【1. 触发时机】（必选）                    │
│  ┌─ 触发类型: [下拉选择]                 │
│  └─ □ 被动触发                          │
│      └─ 触发分类: [突刺/斩击/打击]       │
│                                         │
│ 【2. 条件】（可选）                       │
│  ┌─ [添加条件]                          │
│  ├─ 条件1:                              │
│  │  ┌─ 类型: [属性类/资源类/BUFF类]      │
│  │  ├─ 目标: [自己/目标]                │
│  │  ├─ 具体条件...                      │
│  │  └─ [删除]                           │
│  └─ ...                                │
│                                         │
│ 【3. 消耗】（可选）                       │
│  ┌─ ○ 无消耗                            │
│  ├─ ○ 强制消耗                          │
│  │   └─ [添加资源] ...                  │
│  └─ ○ 选择消耗                          │
│      └─ [添加选项] ...                  │
│                                         │
│ 【4. 效果】（可选）                       │
│  ┌─ [添加效果]                          │
│  ├─ 效果1:                              │
│  │  ┌─ 类型: [添加BUFF/造成伤害/...]    │
│  │  ├─ 目标: [自己/目标/多目标]          │
│  │  ├─ 回合: [本回合/下回合/...]         │
│  │  ├─ 具体参数...                      │
│  │  └─ [删除]                           │
│  └─ ...                                │
│                                         │
│ [保存] [取消]                            │
└─────────────────────────────────────────┘
```

### 关键改进点

1. **分组清晰**: 8大需求对应8个区域
2. **动态表单**: 根据选择显示不同字段
3. **目标和回合作为子选项**: 在每个效果/条件中设置
4. **公式支持**: layers/strength 等字段支持表达式
5. **选择消耗的特殊UI**: 多个选项卡

---

## ⚙️ 执行引擎改造方案

### 执行流程

```javascript
class ActivityExecutor {
  static async execute(activity, context) {
    // 1. 检查触发时机
    if (!this.checkTrigger(activity.trigger, context)) {
      return { success: false, reason: '触发时机不匹配' };
    }

    // 2. 检查条件
    if (!await this.checkConditions(activity.conditions, context)) {
      return { success: false, reason: '条件不满足' };
    }

    // 3. 处理消耗
    const consumeResult = await this.handleConsume(activity.consume, context);
    if (activity.consume?.type === 'mandatory' && !consumeResult.success) {
      return { success: false, reason: '资源不足' };
    }

    // 4. 执行效果
    const effectResults = [];
    for (const effect of activity.effects || []) {
      const result = await this.executeEffect(effect, context);
      effectResults.push(result);
    }

    // 5. 更新次数限制
    if (activity.usageLimit) {
      await this.updateUsageCount(activity, context);
    }

    return { success: true, effectResults };
  }

  // 新增：检查触发时机
  static checkTrigger(trigger, context) {
    if (trigger.passive) {
      // 被动触发：检查分类匹配
      if (trigger.category && context.diceCategory !== trigger.category) {
        return false;
      }
    }
    return true;
  }

  // 增强：条件检查支持新类型
  static async checkConditions(conditions, context) {
    for (const condition of conditions || []) {
      const target = this.getTarget(condition.target, context);

      switch (condition.type) {
        case 'attribute':
          if (!this.checkAttribute(target, condition)) return false;
          break;
        case 'resource':
          if (!this.checkResource(target, condition)) return false;
          break;
        case 'armorResistance':
          if (!this.checkArmorResistance(target, condition)) return false;
          break;
        case 'hasBuff':
        case 'buffLayer':
        case 'buffStrength':
          if (!this.checkBuff(target, condition)) return false;
          break;
      }
    }
    return true;
  }

  // 新增：护甲抗性检查
  static checkArmorResistance(target, condition) {
    const armor = target.getEquippedArmor();
    if (!armor) return false;

    const property = `${condition.category}${condition.value === 'weak' ? 'Down' : 'Up'}`;
    return armor.system.armorProperties[property] === true;
  }

  // 增强：选择消耗处理
  static async handleConsume(consume, context) {
    if (!consume) return { success: true };

    if (consume.type === 'optional') {
      // 弹出选择对话框
      const choice = await this.showConsumeDialog(consume.options, context);
      if (!choice) return { success: false };

      // 执行选中的消耗和效果
      await this.consumeResources(choice.resources, context);
      for (const effect of choice.effects) {
        await this.executeEffect(effect, context);
      }
      return { success: true };
    } else {
      // 强制消耗
      return await this.consumeResources(consume.resources, context);
    }
  }

  // 新增：消耗对话框
  static async showConsumeDialog(options, context) {
    return new Promise((resolve) => {
      const dialog = new Dialog({
        title: "选择消耗",
        content: this.renderConsumeOptions(options),
        buttons: options.reduce((acc, option, index) => {
          acc[`option${index}`] = {
            label: option.label,
            callback: () => resolve(option)
          };
          return acc;
        }, {
          cancel: {
            label: "取消",
            callback: () => resolve(null)
          }
        })
      });
      dialog.render(true);
    });
  }

  // 增强：效果执行支持新类型
  static async executeEffect(effect, context) {
    const target = this.getTarget(effect.target, context);

    switch (effect.type) {
      case 'addBuff':
        return await this.addBuffEffect(effect, target, context);
      case 'consumeBuff':
        return await this.consumeBuffEffect(effect, target);
      case 'clearBuff':
        return await this.clearBuffEffect(effect, target);
      case 'dealDamage':
        return await this.dealDamageEffect(effect, target, context);
      case 'heal':
        return await this.healEffect(effect, target, context);
      case 'modifyDice':
        return await this.modifyDiceEffect(effect, context);
      case 'restoreCost':
      case 'restoreEX':
        return await this.restoreResourceEffect(effect, target);
      case 'drawActivation':
        return await this.drawActivationEffect(effect, target);
      case 'reuseDice':
        return await this.reuseDiceEffect(effect, context);
      default:
        console.warn('未知效果类型:', effect.type);
        return { success: false };
    }
  }

  // 新增：添加BUFF效果（支持多目标）
  static async addBuffEffect(effect, target, context) {
    if (effect.target === 'multiple') {
      const targets = await this.selectMultipleTargets(effect, context);
      for (const t of targets) {
        await this.addBuffToTarget(effect, t, context);
      }
    } else {
      await this.addBuffToTarget(effect, target, context);
    }
    return { success: true };
  }

  static async addBuffToTarget(effect, target, context) {
    const layers = this.parseExpression(effect.layers, context);
    const strength = this.parseExpression(effect.strength, context);
    await target.addBuff(effect.buffId, layers, strength, effect.roundTiming);
  }

  // 新增：修正骰子效果
  static async modifyDiceEffect(effect, context) {
    if (!context.dice) {
      return { success: false, reason: '没有骰子上下文' };
    }

    const value = this.parseExpression(effect.value || effect.formula, context);

    switch (effect.modifyType) {
      case 'diceCount':
        context.dice.count += value;
        break;
      case 'diceFace':
        context.dice.face += value;
        break;
      case 'finalValue':
        context.dice.finalValue = (context.dice.finalValue || 0) + value;
        break;
    }

    return { success: true, message: `骰子修正 ${effect.modifyType} ${value >= 0 ? '+' : ''}${value}` };
  }

  // 新增：抽取激活效果
  static async drawActivationEffect(effect, target) {
    // 调用抽取激活系统
    await target.drawActivation(effect.category, effect.count);
    return { success: true, message: `抽取 ${effect.count} 个【${effect.category}】标记` };
  }

  // 工具：解析表达式（支持公式和BUFF引用）
  static parseExpression(expression, context) {
    if (typeof expression === 'number') return expression;
    if (typeof expression !== 'string') return 0;

    // 处理骰子公式 (1d4+3)
    if (expression.includes('d')) {
      const roll = new Roll(expression);
      roll.evaluate({ async: false });
      return roll.total;
    }

    // 处理BUFF引用 ({burn.layers})
    let result = expression;
    const buffMatches = result.matchAll(/\{(\w+)\.(layers|strength)\}/g);
    for (const match of buffMatches) {
      const buffId = match[1];
      const property = match[2];
      const buff = context.actor.getBuff(buffId);
      const value = buff ? buff[property] : 0;
      result = result.replace(match[0], value);
    }

    // 评估数学表达式
    try {
      return eval(result);
    } catch (e) {
      console.error('表达式解析失败:', expression, e);
      return 0;
    }
  }
}
```

---

## 🔧 自定义BUFF系统

### 定义文件结构

在 `buff-types.mjs` 中添加：

```javascript
/**
 * 自定义BUFF定义
 * 用户可以在这里定义自己的BUFF及其触发逻辑
 */
export const CUSTOM_BUFF_DEFINITIONS = {
  // 黑炎
  blackFlame: {
    id: 'blackFlame',
    name: '黑炎',
    type: 'custom',
    icon: 'icons/svg/fire-black.svg',
    description: '受到伤害时触发特殊效果',
    defaultLayers: 1,
    defaultStrength: 0,

    // 自定义触发器（可选）
    triggers: {
      onDamaged: async function(actor, buff, context) {
        // 当角色受到伤害时触发
        const damage = buff.layers * buff.strength;
        ui.notifications.info(`【黑炎】触发，额外造成 ${damage} 点伤害`);
        await actor.takeDamage(damage);
        await actor.consumeBuff('blackFlame', 1);
      }
    }
  },

  // 羽翼
  feather: {
    id: 'feather',
    name: '羽翼',
    type: 'custom',
    icon: 'icons/svg/feather.svg',
    description: '可用于消耗的资源标记',
    defaultLayers: 3,
    defaultStrength: 0
    // 无自定义触发器，仅用于消耗
  },

  // 宏伟法术
  grandMagic: {
    id: 'grandMagic',
    name: '宏伟法术',
    type: 'custom',
    icon: 'icons/svg/magic-grand.svg',
    description: '累积层数用于强大魔法',
    defaultLayers: 0,
    defaultStrength: 0,
    maxLayers: 20,  // 最大层数限制

    triggers: {
      onTurnEnd: async function(actor, buff, context) {
        // 回合结束时，层数 >= 10，自动触发效果
        if (buff.layers >= 10) {
          ui.notifications.info(`【宏伟法术】层数达到 ${buff.layers}，可以施放强大魔法！`);
        }
      }
    }
  }
};

// 获取所有BUFF（包括自定义）
export function getAllBuffs() {
  return [
    ...BUFF_TYPES.positive,
    ...BUFF_TYPES.negative,
    ...BUFF_TYPES.effect,
    ...BUFF_TYPES.derivedPositive,
    ...BUFF_TYPES.derivedNegative,
    ...Object.values(CUSTOM_BUFF_DEFINITIONS)
  ];
}
```

### 自定义BUFF的使用

1. **在编辑器中**: 自定义BUFF 出现在 BUFF 选择列表中
2. **在活动中**: 可以作为条件、消耗、添加的对象
3. **自动触发**: 如果定义了 `triggers`，会在对应时机自动执行

---

## 📊 实施计划

### 第一阶段：数据结构统一（3-4天）

- [ ] 定义统一的 Activity 数据结构
- [ ] 更新 item.mjs 的 schema
- [ ] 创建数据迁移脚本（旧格式 → 新格式）
- [ ] 测试数据结构的完整性

### 第二阶段：执行引擎重构（4-5天）

- [ ] 重写 ActivityExecutor
  - [ ] 触发时机检查
  - [ ] 8 种条件类型支持
  - [ ] 强制消耗 vs 选择消耗
  - [ ] 所有效果类型实现
- [ ] 删除 activity-service.mjs（用 ActivityExecutor 替代）
- [ ] 更新所有调用点（counter-area, combat-area, etc.）
- [ ] 测试所有触发点

### 第三阶段：编辑器重写（5-6天）

- [ ] 设计新的 UI 布局
- [ ] 实现动态表单系统
- [ ] 实现 8 大需求的编辑界面
  - [ ] 触发时机选择器
  - [ ] 条件编辑器
  - [ ] 消耗编辑器（含选择消耗对话框）
  - [ ] 效果编辑器（多种效果类型）
  - [ ] 修正编辑器
  - [ ] 目标选择器（子级）
  - [ ] 回合选择器（子级）
- [ ] 公式输入支持和提示
- [ ] 保存和加载逻辑

### 第四阶段：自定义BUFF系统（2-3天）

- [ ] 扩展 buff-types.mjs
- [ ] 创建 CUSTOM_BUFF_DEFINITIONS
- [ ] 实现自定义触发器调用
- [ ] 编辑器集成自定义BUFF
- [ ] 文档和示例

### 第五阶段：测试和优化（3-4天）

- [ ] 创建测试用例
- [ ] 测试所有触发时机
- [ ] 测试复杂条件组合
- [ ] 测试选择消耗对话框
- [ ] 测试多目标选择
- [ ] 性能优化
- [ ] 用户体验优化

### 第六阶段：文档和示例（2天）

- [ ] 更新 CLAUDE.md
- [ ] 创建活动示例库
- [ ] 编写用户指南
- [ ] 创建视频教程（可选）

---

## ✅ 预期成果

### 数据一致性
- ✅ 全系统使用统一的 Activity 数据结构
- ✅ 编辑器输出 = 执行引擎输入
- ✅ 无数据格式转换问题

### 功能完整性
- ✅ 支持 8 大需求的所有功能
- ✅ 编辑器可以创建 90% 的常见效果
- ✅ 剩余 10% 通过自定义BUFF或JSON实现

### 用户友好性
- ✅ 清晰的分组和布局
- ✅ 动态表单，只显示相关字段
- ✅ 公式和表达式支持
- ✅ 实时预览和验证

### 可扩展性
- ✅ 自定义BUFF系统
- ✅ 新增效果类型容易
- ✅ 保留高级JSON模式

---

## 🎯 总结

这个重新设计方案完全基于你的需求，核心理念是：

1. **编辑器处理标准化操作** - 添加、消耗、条件判断
2. **组合式设计** - 通过组合实现复杂效果
3. **保留扩展性** - 自定义BUFF + JSON模式
4. **目标和回合作为子级** - 每个操作独立设置
5. **统一的数据结构** - 消除混乱

预计完成时间：**18-23 天**（约 3 周）

---

**下一步**: 请确认这个设计方案是否符合你的需求，我可以开始实施！
