/**
 * 书海大陆物品表单 - 新设计
 * 支持条件触发系统
 */

// 预定义BUFF类型（从combat-area.mjs复制）
const BUFF_PRESETS = [
  // 增益BUFF
  { id: 'strong', name: '强壮', type: 'positive', icon: 'icons/svg/upgrade.svg', defaultLayers: 1, defaultStrength: 0 },
  { id: 'guard', name: '守护', type: 'positive', icon: 'icons/svg/shield.svg', defaultLayers: 1, defaultStrength: 0 },
  { id: 'swift', name: '迅捷', type: 'positive', icon: 'icons/svg/wing.svg', defaultLayers: 1, defaultStrength: 0 },
  { id: 'endure', name: '忍耐', type: 'positive', icon: 'icons/svg/stone-pile.svg', defaultLayers: 1, defaultStrength: 0 },

  // 减益BUFF
  { id: 'weak', name: '虚弱', type: 'negative', icon: 'icons/svg/downgrade.svg', defaultLayers: 1, defaultStrength: 0 },
  { id: 'vulnerable', name: '易损', type: 'negative', icon: 'icons/svg/break.svg', defaultLayers: 1, defaultStrength: 0 },
  { id: 'bound', name: '束缚', type: 'negative', icon: 'icons/svg/net.svg', defaultLayers: 1, defaultStrength: 0 },
  { id: 'flaw', name: '破绽', type: 'negative', icon: 'icons/svg/hazard.svg', defaultLayers: 1, defaultStrength: 0 },

  // 效果BUFF
  { id: 'rupture', name: '破裂', type: 'effect', icon: 'icons/svg/explosion.svg', defaultLayers: 1, defaultStrength: 3 },
  { id: 'bleed', name: '流血', type: 'effect', icon: 'icons/svg/blood.svg', defaultLayers: 1, defaultStrength: 2 },
  { id: 'corruption_effect', name: '沉沦', type: 'effect', icon: 'icons/svg/shadow.svg', defaultLayers: 1, defaultStrength: 2 },
  { id: 'burn', name: '燃烧', type: 'effect', icon: 'icons/svg/fire.svg', defaultLayers: 1, defaultStrength: 4 },
  { id: 'breath', name: '呼吸', type: 'effect', icon: 'icons/svg/breath.svg', defaultLayers: 1, defaultStrength: 5 },
  { id: 'charge', name: '充能', type: 'effect', icon: 'icons/svg/lightning.svg', defaultLayers: 1, defaultStrength: 0 },
  { id: 'tremor', name: '震颤', type: 'effect', icon: 'icons/svg/frozen.svg', defaultLayers: 1, defaultStrength: 3 },
  { id: 'ammo', name: '弹药', type: 'effect', icon: 'icons/svg/sword.svg', defaultLayers: 10, defaultStrength: 0 },
  { id: 'chant', name: '吟唱', type: 'effect', icon: 'icons/svg/book.svg', defaultLayers: 1, defaultStrength: 0 },
  { id: 'paralyze', name: '麻痹', type: 'effect', icon: 'icons/svg/paralysis.svg', defaultLayers: 1, defaultStrength: 0 }
];

export default class ShuhaiItemSheetNew extends ItemSheet {

  /** @override */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["shuhai-dalu", "sheet", "item", "item-sheet-new"],
      width: 700,
      height: 800,
      tabs: []
    });
  }

  /** @override */
  get template() {
    return `systems/shuhai-dalu/templates/item/item-sheet-new.hbs`;
  }

  /* -------------------------------------------- */

  /** @override */
  async getData() {
    const context = super.getData();
    const itemData = this.item.toObject(false);

    context.rollData = {};
    let actor = this.object?.parent ?? null;
    if (actor) {
      context.rollData = actor.getRollData();
    }

    context.system = itemData.system;
    context.flags = itemData.flags;

    // 添加BUFF预设列表
    context.buffPresets = BUFF_PRESETS;

    // 确保conditions数组存在
    if (!context.system.conditions) {
      context.system.conditions = [];
    }

    // 确保每个condition都有必要的字段
    context.system.conditions = context.system.conditions.map((condition, index) => {
      return {
        trigger: condition.trigger || 'onUse',
        hasConsume: condition.hasConsume || false,
        consumes: condition.consumes || [],
        target: condition.target || 'selected',
        effects: condition.effects || {},
        customEffect: condition.customEffect || { enabled: false, name: '', layers: 0, strength: 0 },
        index: index
      };
    });

    // 添加富文本编辑器
    context.enrichedEffect = await TextEditor.enrichHTML(
      this.item.system.effect || '',
      { async: true }
    );

    // 根据物品类型添加特定数据
    this._prepareItemTypeData(context);

    // 添加编辑锁状态
    context.isLocked = this.item.getFlag('shuhai-dalu', 'isLocked') || false;

    return context;
  }

  /**
   * 准备物品类型特定数据
   */
  _prepareItemTypeData(context) {
    const itemType = this.item.type;

    // 是否显示特定字段
    context.showDiceFormula = ['combatDice', 'shootDice', 'defenseDice', 'triggerDice', 'passiveDice'].includes(itemType);
    context.showStarlightCost = ['combatDice', 'shootDice', 'defenseDice', 'triggerDice', 'passiveDice', 'weapon', 'armor', 'equipment'].includes(itemType);
    context.showArmorProperties = itemType === 'armor';

    // 防具属性
    if (context.showArmorProperties && this.item.system.armorProperties) {
      const props = this.item.system.armorProperties;
      context.armorPropertiesList = [];

      if (props.slashUp) context.armorPropertiesList.push({ label: '斩击↑', type: 'resist' });
      if (props.pierceUp) context.armorPropertiesList.push({ label: '突刺↑', type: 'resist' });
      if (props.bluntUp) context.armorPropertiesList.push({ label: '打击↑', type: 'resist' });
      if (props.slashDown) context.armorPropertiesList.push({ label: '斩击↓', type: 'weak' });
      if (props.pierceDown) context.armorPropertiesList.push({ label: '突刺↓', type: 'weak' });
      if (props.bluntDown) context.armorPropertiesList.push({ label: '打击↓', type: 'weak' });
    }
  }

  /* -------------------------------------------- */

  /** @override */
  activateListeners(html) {
    super.activateListeners(html);

    // 编辑锁切换
    html.find('.item-edit-lock').click(this._onToggleLock.bind(this));

    // 标签页切换
    html.find('.item-tab').click(this._onTabChange.bind(this));

    // 效果面板折叠
    html.find('.effect-panel-header').click(this._onTogglePanel.bind(this));

    // 条件面板折叠
    html.find('.condition-panel-header').click(this._onTogglePanel.bind(this));

    // 只在可编辑状态下添加以下监听器
    if (!this.isEditable) return;

    // 条件管理
    html.find('.add-condition-btn').click(this._onAddCondition.bind(this));
    html.find('.delete-condition-btn').click(this._onDeleteCondition.bind(this));

    // 消耗效果管理
    html.find('.add-consume-btn').click(this._onAddConsume.bind(this));
    html.find('.remove-consume-btn').click(this._onRemoveConsume.bind(this));

    // 使用物品按钮
    html.find('.item-use-btn').click(this._onItemUse.bind(this));

    // 发送到聊天
    html.find('.item-chat-btn').click(this._onItemChat.bind(this));
  }

  /* -------------------------------------------- */

  /**
   * 切换编辑锁
   */
  async _onToggleLock(event) {
    event.preventDefault();
    const currentLock = this.item.getFlag('shuhai-dalu', 'isLocked') || false;
    await this.item.setFlag('shuhai-dalu', 'isLocked', !currentLock);
    this.render();
  }

  /**
   * 标签页切换
   */
  _onTabChange(event) {
    event.preventDefault();
    const tab = $(event.currentTarget);
    const tabName = tab.data('tab');

    // 切换tab激活状态
    tab.siblings('.item-tab').removeClass('active');
    tab.addClass('active');

    // 切换内容显示
    const content = this.element.find(`.item-tab-content`);
    content.removeClass('active');
    this.element.find(`.item-tab-content[data-tab="${tabName}"]`).addClass('active');
  }

  /**
   * 面板折叠切换
   */
  _onTogglePanel(event) {
    event.preventDefault();
    const header = $(event.currentTarget);
    const panel = header.closest('.effect-panel, .condition-panel');
    const content = panel.find('.effect-panel-content, .condition-panel-content').first();

    header.toggleClass('collapsed');
    content.toggleClass('collapsed');
  }

  /**
   * 添加条件
   */
  async _onAddCondition(event) {
    event.preventDefault();

    const conditions = this.item.system.conditions || [];
    const newCondition = {
      trigger: 'onUse',
      hasConsume: false,
      consumes: [],
      target: 'selected',
      effects: {},
      customEffect: {
        enabled: false,
        name: '',
        layers: 0,
        strength: 0
      }
    };

    conditions.push(newCondition);

    await this.item.update({
      'system.conditions': conditions
    });
  }

  /**
   * 删除条件
   */
  async _onDeleteCondition(event) {
    event.preventDefault();

    const conditionIndex = parseInt($(event.currentTarget).closest('.condition-panel').data('index'));
    const conditions = this.item.system.conditions || [];

    // 确认删除
    const confirm = await Dialog.confirm({
      title: "删除条件",
      content: `<p>确定要删除条件 ${conditionIndex + 1} 吗？</p>`,
      yes: () => true,
      no: () => false
    });

    if (!confirm) return;

    conditions.splice(conditionIndex, 1);

    await this.item.update({
      'system.conditions': conditions
    });
  }

  /**
   * 添加消耗效果
   */
  async _onAddConsume(event) {
    event.preventDefault();

    const conditionIndex = parseInt($(event.currentTarget).data('condition-index'));
    const conditions = [...this.item.system.conditions];

    if (!conditions[conditionIndex].consumes) {
      conditions[conditionIndex].consumes = [];
    }

    conditions[conditionIndex].consumes.push({
      buffId: 'charge',
      layers: 1,
      strength: 0
    });

    await this.item.update({
      'system.conditions': conditions
    });
  }

  /**
   * 移除消耗效果
   */
  async _onRemoveConsume(event) {
    event.preventDefault();

    const conditionIndex = parseInt($(event.currentTarget).data('condition-index'));
    const consumeIndex = parseInt($(event.currentTarget).data('consume-index'));
    const conditions = [...this.item.system.conditions];

    conditions[conditionIndex].consumes.splice(consumeIndex, 1);

    await this.item.update({
      'system.conditions': conditions
    });
  }

  /**
   * 使用物品
   */
  async _onItemUse(event) {
    event.preventDefault();

    // 处理条件触发
    await this._processConditionTriggers('onUse');

    if (this.item.type === 'combatDice' || this.item.type === 'shootDice' || this.item.type === 'defenseDice') {
      // 使用骰子
      await this.item.use();
    } else {
      ui.notifications.info(`使用 ${this.item.name}`);
      await this.item.displayCard();
    }
  }

  /**
   * 发送到聊天
   */
  async _onItemChat(event) {
    event.preventDefault();
    await this.item.displayCard();
  }

  /**
   * 处理条件触发
   */
  async _processConditionTriggers(triggerType) {
    const conditions = this.item.system.conditions || [];
    const triggeredConditions = conditions.filter(c => c.trigger === triggerType);

    if (triggeredConditions.length === 0) return;

    // TODO: 实现条件触发逻辑
    // 1. 检查消耗是否满足
    // 2. 选择目标
    // 3. 应用效果
    console.log(`触发了 ${triggeredConditions.length} 个条件`, triggeredConditions);
  }

  /* -------------------------------------------- */

  /** @override */
  async _updateObject(event, formData) {
    // 处理effects对象的特殊格式
    const expanded = foundry.utils.expandObject(formData);

    // 处理conditions数组
    if (expanded.system?.conditions) {
      const conditions = [];
      const conditionsObj = expanded.system.conditions;

      // 将对象转换为数组
      for (let i = 0; i < 100; i++) { // 假设最多100个条件
        if (conditionsObj[i]) {
          const condition = conditionsObj[i];

          // 处理effects对象
          const effects = {};
          if (condition.effects) {
            for (const [buffId, buffData] of Object.entries(condition.effects)) {
              if (buffData.enabled) {
                effects[buffId] = {
                  enabled: true,
                  layers: parseInt(buffData.layers) || 0,
                  strength: parseInt(buffData.strength) || 0
                };
              }
            }
          }

          // 处理consumes数组
          const consumes = [];
          if (condition.consumes) {
            const consumesObj = condition.consumes;
            for (let j = 0; j < 20; j++) { // 假设最多20个消耗
              if (consumesObj[j]) {
                consumes.push({
                  buffId: consumesObj[j].buffId,
                  layers: parseInt(consumesObj[j].layers) || 0,
                  strength: parseInt(consumesObj[j].strength) || 0
                });
              }
            }
          }

          conditions.push({
            trigger: condition.trigger || 'onUse',
            hasConsume: condition.hasConsume || false,
            consumes: consumes,
            target: condition.target || 'selected',
            effects: effects,
            customEffect: {
              enabled: condition.customEffect?.enabled || false,
              name: condition.customEffect?.name || '',
              layers: parseInt(condition.customEffect?.layers) || 0,
              strength: parseInt(condition.customEffect?.strength) || 0
            }
          });
        }
      }

      expanded.system.conditions = conditions;
    }

    return this.item.update(expanded);
  }
}
