# Phase 3: Activity 编辑器重写 - 规划文档

**日期**: 2025-11-17
**阶段**: Phase 3 of 3
**状态**: Planning

---

## 1. 目标概述

Phase 1 和 Phase 2 已完成数据结构统一和执行引擎重构，现在需要重写 Activity 编辑器以支持新的统一数据格式。

### 核心目标
1. ✅ 支持新统一数据格式（trigger 对象、consume 对象、effects 数组等）
2. ✅ 保留基础编辑器和高级 JSON 模式
3. ✅ 向后兼容旧格式（自动迁移）
4. ✅ 提供直观的 UI 用于编辑复杂结构（条件、消耗选项、多效果等）
5. ✅ 支持表达式编辑（骰子公式、变量引用、函数表达式）

---

## 2. 现状分析

### 2.1 旧编辑器 (`activity-editor.mjs`)

**优点**：
- ✅ 双模式设计（基础 + 高级 JSON）
- ✅ 表单验证和错误处理
- ✅ BUFF 预设列表
- ✅ 表达式示例提示

**问题**：
- ❌ 使用旧数据格式
- ❌ `trigger` 是字符串，不支持 `passive` 和 `category`
- ❌ `consume` 是简单的 `hasConsume` + `consumes` 数组
- ❌ `effects` 是对象而非数组
- ❌ 缺少条件编辑器
- ❌ 缺少次数限制编辑器
- ❌ 不支持多效果类型（只有 addBuff）

### 2.2 新格式要求 (`activity-schema.mjs`)

**数据结构**：
```javascript
{
  _id: String,
  name: String,

  // 触发时机 - 对象格式
  trigger: {
    type: String,       // TRIGGER_TYPES
    passive: Boolean,   // 是否被动触发
    category: String    // 'slash' | 'pierce' | 'blunt' | null
  },

  // 条件 - 数组
  conditions: [
    { type, target, operator, value, ... }
  ],

  // 消耗 - 对象格式
  consume: {
    mode: String,       // 'none' | 'mandatory' | 'optional'
    resources: [],      // 强制消耗
    options: [          // 可选消耗（2-3选项）
      { label, resources, effects }
    ]
  },

  // 效果 - 数组格式
  effects: [
    { type: 'addBuff', buffId, layers, strength, target, roundTiming },
    { type: 'consumeBuff', buffId, layers, target },
    { type: 'heal', formula, target },
    { type: 'dealDamage', formula, damageType, target },
    { type: 'modifyDice', modifyType, value, formula },
    { type: 'restoreResource', resourceType, count, target },
    { type: 'deductResource', resourceType, count, target },
    { type: 'customBuff', buffId, layers, strength, target }
  ],

  // 次数限制 - 对象格式
  usageLimit: {
    perRound: Number,
    perCombat: Number
  }
}
```

---

## 3. 实施计划

### 阶段 1：核心编辑器重构

#### 文件结构
- **新建**: `module/sheets/activity-editor-v2.mjs` - 新编辑器主文件
- **新建**: `templates/item-card/activity-editor-v2.hbs` - 新编辑器模板
- **新建**: `templates/item-card/partials/` - 子组件模板
  - `trigger-editor.hbs` - 触发时机编辑器
  - `condition-editor.hbs` - 条件编辑器
  - `consume-editor.hbs` - 消耗编辑器
  - `effect-editor.hbs` - 效果编辑器
  - `usage-limit-editor.hbs` - 次数限制编辑器

#### 核心功能
1. **触发时机编辑器**
   - 下拉选择触发类型
   - 勾选框：是否被动触发
   - 条件显示：被动触发时显示分类选择（斩击/突刺/打击）

2. **条件编辑器**
   - 动态添加/删除条件
   - 条件类型选择（属性/资源/BUFF层数/防具抗性等）
   - 每种条件类型显示不同的参数字段
   - 操作符选择（>、<、>=、<=、==、!=）

3. **消耗编辑器**
   - 消耗模式切换（无/强制/可选）
   - **强制消耗**：resources 数组编辑
   - **可选消耗**：options 数组编辑
     - 每个选项有 label、resources、effects
     - 支持 2-3 个选项
     - 弹出对话框编辑每个选项

4. **效果编辑器**
   - 动态添加/删除效果
   - 效果类型下拉选择（8种类型）
   - 根据效果类型显示不同的参数字段：
     - `addBuff`: buffId, layers, strength, target, roundTiming
     - `consumeBuff`: buffId, layers, target
     - `heal`: formula, target
     - `dealDamage`: formula, damageType, target
     - `modifyDice`: modifyType, value/formula
     - `restoreResource`: resourceType, count, target
     - `deductResource`: resourceType, count, target
     - `customBuff`: buffId, layers, strength, target
   - 表达式输入提示（支持变量、函数、骰子公式）

5. **次数限制编辑器**
   - 每回合次数限制
   - 每战斗次数限制

---

### 阶段 2：高级 JSON 模式

保留高级 JSON 编辑模式，但需要：
1. JSON 预览显示新格式
2. JSON 验证支持新格式
3. 提供新格式示例（EXAMPLE_1-5）

---

### 阶段 3：模板和样式

#### 模板设计

**主模板** (`activity-editor-v2.hbs`):
```handlebars
<div class="activity-editor-v2">
  <!-- 模式切换标签 -->
  <div class="mode-tabs">
    <button class="tab-btn {{#if isBasicMode}}active{{/if}}" data-mode="basic">基础编辑器</button>
    <button class="tab-btn {{#if isAdvancedMode}}active{{/if}}" data-mode="advanced">高级 JSON</button>
  </div>

  {{#if isBasicMode}}
    <!-- 基础编辑器 -->
    <form class="basic-editor">
      <div class="form-group">
        <label>活动名称</label>
        <input type="text" name="name" value="{{activity.name}}" />
      </div>

      {{> trigger-editor activity=activity}}
      {{> condition-editor activity=activity}}
      {{> consume-editor activity=activity}}
      {{> effect-editor activity=activity}}
      {{> usage-limit-editor activity=activity}}

      <div class="form-actions">
        <button type="submit" class="save-btn">保存</button>
        <button type="button" class="cancel-btn">取消</button>
      </div>
    </form>
  {{/if}}

  {{#if isAdvancedMode}}
    <!-- JSON 编辑器 -->
    <div class="json-editor-container">
      <textarea class="json-editor">{{activityJSON}}</textarea>
      <div class="json-actions">
        <button class="validate-json-btn">验证</button>
        <button class="format-json-btn">格式化</button>
      </div>
      <div class="json-preview"></div>
    </div>
  {{/if}}
</div>
```

**子模板示例** (`trigger-editor.hbs`):
```handlebars
<div class="trigger-editor">
  <h3>触发时机</h3>

  <div class="form-group">
    <label>触发类型</label>
    <select name="trigger.type">
      {{#each triggerTypes}}
        <option value="{{this.value}}" {{#if (eq this.value ../activity.trigger.type)}}selected{{/if}}>
          {{this.label}}
        </option>
      {{/each}}
    </select>
  </div>

  <div class="form-group">
    <label>
      <input type="checkbox" name="trigger.passive" {{#if activity.trigger.passive}}checked{{/if}} />
      被动触发
    </label>
  </div>

  {{#if activity.trigger.passive}}
    <div class="form-group">
      <label>分类限制</label>
      <select name="trigger.category">
        <option value="">无限制</option>
        <option value="slash" {{#if (eq activity.trigger.category 'slash')}}selected{{/if}}>斩击</option>
        <option value="pierce" {{#if (eq activity.trigger.category 'pierce')}}selected{{/if}}>突刺</option>
        <option value="blunt" {{#if (eq activity.trigger.category 'blunt')}}selected{{/if}}>打击</option>
      </select>
    </div>
  {{/if}}
</div>
```

---

### 阶段 4：向后兼容

#### 迁移策略
1. 编辑器打开时检测数据格式
2. 如果是旧格式，调用 `migrateActivity()` 自动迁移
3. 保存时始终使用新格式
4. 提供"查看原始数据"按钮用于调试

#### 实现
```javascript
constructor(item, activity = null, options = {}) {
  super(options);
  this.item = item;
  this.isNew = !activity;

  if (activity) {
    // 检测并迁移旧格式
    if (!isNewFormat(activity)) {
      console.log('【Activity编辑器】检测到旧格式，自动迁移');
      this.activity = migrateActivity(activity);
      this.needsMigration = true;
    } else {
      this.activity = foundry.utils.deepClone(activity);
      this.needsMigration = false;
    }
    this.activityId = this.activity._id;
  } else {
    // 创建新 activity（使用新格式模板）
    this.activityId = foundry.utils.randomID();
    this.activity = createDefaultActivity();
  }

  this.editMode = this.activity._editMode || 'basic';
}
```

---

### 阶段 5：测试

#### 测试脚本 (`test-activity-editor.mjs`)

**测试用例**：
1. 打开编辑器（新建）
2. 打开编辑器（编辑旧格式 activity）
3. 打开编辑器（编辑新格式 activity）
4. 编辑触发时机
5. 添加/删除条件
6. 编辑消耗（强制/可选模式）
7. 添加/删除效果
8. 编辑次数限制
9. 基础模式 ↔ JSON 模式切换
10. 保存 activity
11. 验证保存后的数据格式

---

## 4. UI 设计

### 颜色方案
- **触发时机**: 蓝色 (#4A90E2)
- **条件**: 黄色 (#F5A623)
- **消耗**: 红色 (#D0021B)
- **效果**: 绿色 (#7ED321)
- **次数限制**: 紫色 (#9013FE)

### 布局
```
+------------------------------------------+
| [基础编辑器] [高级 JSON]                   |
+------------------------------------------+
| 活动名称: [_____________________]         |
+------------------------------------------+
| 【触发时机】                               |
| 类型: [使用时 ▼]                          |
| □ 被动触发   分类: [无限制 ▼]             |
+------------------------------------------+
| 【条件】(可选)                [+ 添加条件] |
| 1. 属性条件: HP > 50          [× 删除]    |
| 2. BUFF层数: 充能 >= 3        [× 删除]    |
+------------------------------------------+
| 【消耗】                                   |
| 模式: ⦿ 无  ○ 强制  ○ 可选               |
| (根据模式显示不同UI)                       |
+------------------------------------------+
| 【效果】                      [+ 添加效果] |
| 1. 添加BUFF: 强壮 2层         [× 删除]    |
| 2. 恢复生命: 1d6              [× 删除]    |
+------------------------------------------+
| 【次数限制】(可选)                         |
| 每回合: [1] 次   每战斗: [3] 次           |
+------------------------------------------+
| [保存]  [取消]                            |
+------------------------------------------+
```

---

## 5. 实施顺序

### Step 1: 创建基础框架 (1小时)
- [x] 创建 `activity-editor-v2.mjs` 文件
- [x] 创建基础模板 `activity-editor-v2.hbs`
- [x] 实现构造函数和基本生命周期

### Step 2: 触发时机编辑器 (30分钟)
- [ ] 创建 `trigger-editor.hbs` partial
- [ ] 实现触发类型下拉
- [ ] 实现被动触发勾选和分类选择
- [ ] 添加事件监听器

### Step 3: 效果编辑器 (1小时)
- [ ] 创建 `effect-editor.hbs` partial
- [ ] 实现添加/删除效果
- [ ] 实现效果类型切换
- [ ] 为每种效果类型实现参数字段
- [ ] 添加表达式输入提示

### Step 4: 消耗编辑器 (1小时)
- [ ] 创建 `consume-editor.hbs` partial
- [ ] 实现消耗模式切换
- [ ] 实现强制消耗编辑（resources 数组）
- [ ] 实现可选消耗编辑（options 数组）
- [ ] 实现选项编辑对话框

### Step 5: 条件编辑器 (45分钟)
- [ ] 创建 `condition-editor.hbs` partial
- [ ] 实现添加/删除条件
- [ ] 实现条件类型切换
- [ ] 为每种条件类型实现参数字段

### Step 6: 次数限制编辑器 (15分钟)
- [ ] 创建 `usage-limit-editor.hbs` partial
- [ ] 实现每回合/每战斗次数输入

### Step 7: 高级 JSON 模式 (30分钟)
- [ ] 保留 JSON 编辑器
- [ ] 更新 JSON 验证逻辑
- [ ] 更新模式切换逻辑

### Step 8: 保存和验证 (30分钟)
- [ ] 实现表单数据收集
- [ ] 实现数据验证
- [ ] 实现保存逻辑
- [ ] 集成到 item-sheet

### Step 9: 样式美化 (30分钟)
- [ ] 创建 `activity-editor-v2.css`
- [ ] 实现颜色方案
- [ ] 优化布局和间距
- [ ] 响应式设计

### Step 10: 测试 (1小时)
- [ ] 创建测试脚本 `test-activity-editor.mjs`
- [ ] 编写 10+ 测试用例
- [ ] 修复发现的问题
- [ ] 完成文档

**总预计时间**: ~7.5 小时

---

## 6. 风险和挑战

### 6.1 UI 复杂度
**问题**: 新格式的嵌套结构复杂，UI 可能难以直观展示
**解决**: 使用分组、折叠面板、子对话框等方式简化 UI

### 6.2 表单数据收集
**问题**: Handlebars 表单数据的 expandObject 可能无法正确处理深层嵌套
**解决**: 手动构建数据结构，不依赖自动展开

### 6.3 向后兼容
**问题**: 旧数据可能有各种边缘情况
**解决**: 使用已测试的 `migrateActivity()` 函数，记录警告日志

### 6.4 表达式编辑
**问题**: 用户可能输入无效表达式
**解决**: 提供表达式验证、示例提示、实时预览

---

## 7. 成功标准

1. ✅ 编辑器支持所有新格式字段
2. ✅ 基础模式和 JSON 模式都能正确工作
3. ✅ 旧格式 activity 能自动迁移并编辑
4. ✅ 保存的数据格式符合 `ACTIVITY_TEMPLATE` 规范
5. ✅ 所有测试用例通过
6. ✅ UI 直观易用，表单验证有效
7. ✅ 文档完整，代码注释清晰

---

## 8. 下一步

完成 Phase 3 后，Activity 系统重构全部完成：
- ✅ Phase 1: 数据结构统一
- ✅ Phase 2: 执行引擎重构
- ✅ Phase 3: 编辑器重写

系统将完全使用新统一格式，旧代码可以逐步淘汰。

---

**文档版本**: 1.0
**最后更新**: 2025-11-17
