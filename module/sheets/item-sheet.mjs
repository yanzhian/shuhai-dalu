/**
 * 书海大陆物品表单 - 完整版（支持条件触发系统）
 */
export default class ShuhaiItemSheet extends ItemSheet {

  /** @override */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["shuhai-dalu", "sheet", "item"],
      width: 600,
      height: 700,
      tabs: []
    });
  }

  /** @override */
  get template() {
    return `systems/shuhai-dalu/templates/item/item-sheet.hbs`;
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

    // 编辑锁状态
    context.isLocked = this.item.getFlag('shuhai-dalu', 'locked') || false;

    // 添加富文本编辑器
    context.enrichedEffect = await TextEditor.enrichHTML(
      this.item.system.effect || "",
      { async: true }
    );

    // 根据物品类型添加特定数据
    this._prepareItemTypeData(context);

    return context;
  }

  /**
   * 准备物品类型特定数据
   */
  _prepareItemTypeData(context) {
    const itemType = this.item.type;

    // 所有物品类型的分类选项
    context.categories = this._getCategoryOptions(itemType);

    // 是否允许自定义分类（武器、防具、装备、物品）
    context.allowCustomCategory = ['weapon', 'armor', 'equipment', 'item'].includes(itemType);

    // 是否显示特定字段
    context.showDiceFormula = ['combatDice', 'shootDice', 'defenseDice', 'triggerDice', 'passiveDice'].includes(itemType);
    context.showQuantity = !['passiveDice'].includes(itemType);
    context.showStarlightCost = ['combatDice', 'shootDice', 'defenseDice', 'triggerDice', 'passiveDice', 'weapon', 'armor', 'equipment'].includes(itemType);
    context.showArmorProperties = itemType === 'armor';
  }

  /**
   * 获取分类选项
   */
  _getCategoryOptions(type) {
    const categoryMap = {
      'combatDice': ['打击', '突刺', '斩击'],
      'shootDice': ['打击', '突刺', '斩击'],
      'defenseDice': ['闪避', '反击-斩击', '反击-突刺', '反击-打击', '强化反击-斩击', '强化反击-突刺', '强化反击-打击', '防御', '强化防御'],
      'triggerDice': ['EX'],
      'passiveDice': ['道具', '标签'],
      'weapon': [],
      'armor': [],
      'item': [],
      'equipment': []
    };

    const categories = categoryMap[type] || ['未分类'];
    return categories.map(cat => ({
      value: cat,
      label: cat
    }));
  }

  /* -------------------------------------------- */

  /** @override */
  activateListeners(html) {
    super.activateListeners(html);

    // 只在拥有权限时添加监听器
    if (!this.isEditable) return;

    // 编辑锁按钮
    html.find('.item-lock-btn').click(this._onToggleLock.bind(this));

    // 标签页切换
    html.find('.item-tab-btn').click(this._onTabChange.bind(this));

    // 效果描述折叠
    html.find('.effect-toggle-btn').click(this._onToggleEffect.bind(this));

    // 效果编辑按钮（可选功能，当前始终可编辑）
    html.find('.effect-edit-btn').click(this._onToggleEffectEdit.bind(this));

    // 条件触发相关
    html.find('.condition-toggle-btn').click(this._onToggleCondition.bind(this));
    html.find('.condition-action-btn.delete-btn').click(this._onDeleteCondition.bind(this));
    html.find('.condition-action-btn.use-btn').click(this._onUseCondition.bind(this));
    html.find('.add-condition-btn').click(this._onAddCondition.bind(this));

    // 基础效果多选处理
    html.find('.base-effect-checkbox').change(this._onBaseEffectChange.bind(this));
  }

  /* -------------------------------------------- */

  /**
   * 切换编辑锁
   */
  async _onToggleLock(event) {
    event.preventDefault();
    const currentLock = this.item.getFlag('shuhai-dalu', 'locked') || false;
    await this.item.setFlag('shuhai-dalu', 'locked', !currentLock);
    this.render(false);
  }

  /**
   * 标签页切换
   */
  _onTabChange(event) {
    event.preventDefault();
    const button = event.currentTarget;
    const tab = button.dataset.tab;

    // 更新按钮状态
    $(this.element).find('.item-tab-btn').removeClass('active');
    $(button).addClass('active');

    // 更新面板显示
    $(this.element).find('.item-tab-pane').removeClass('active');
    $(this.element).find(`.item-tab-pane[data-tab="${tab}"]`).addClass('active');
  }

  /**
   * 折叠/展开效果描述
   */
  _onToggleEffect(event) {
    event.preventDefault();
    const button = event.currentTarget;
    const content = $(button).closest('.effect-description-section').find('.effect-content');

    $(button).toggleClass('collapsed');
    content.toggleClass('collapsed');
  }

  /**
   * 切换效果编辑模式（可选功能）
   */
  _onToggleEffectEdit(event) {
    event.preventDefault();
    const button = event.currentTarget;
    const textarea = $(button).closest('.effect-description-section').find('textarea');

    $(button).toggleClass('active');
    textarea.prop('disabled', !$(button).hasClass('active'));
  }

  /**
   * 折叠/展开条件
   */
  _onToggleCondition(event) {
    event.preventDefault();
    const button = event.currentTarget;
    const content = $(button).closest('.condition-item').find('.condition-content');

    $(button).toggleClass('collapsed');
    content.toggleClass('collapsed');
  }

  /**
   * 删除条件
   */
  async _onDeleteCondition(event) {
    event.preventDefault();
    const button = event.currentTarget;
    const conditionItem = $(button).closest('.condition-item');
    const conditionIdx = parseInt(conditionItem.data('condition-idx'));

    const conditions = [...(this.item.system.conditions || [])];
    conditions.splice(conditionIdx, 1);

    await this.item.update({ 'system.conditions': conditions });
  }

  /**
   * 使用条件（触发效果）
   */
  async _onUseCondition(event) {
    event.preventDefault();
    const button = event.currentTarget;
    const conditionItem = $(button).closest('.condition-item');
    const conditionIdx = parseInt(conditionItem.data('condition-idx'));

    const condition = this.item.system.conditions[conditionIdx];
    if (!condition) return;

    // 发送聊天消息显示条件效果
    const triggerNames = {
      onUse: '使用时',
      onAttack: '攻击时',
      onCounter: '对抗时',
      onCounterSuccess: '对抗成功',
      onCounterFailure: '对抗失败',
      onHit: '攻击命中',
      onDamaged: '受到伤害',
      onTurnStart: '回合开始',
      onTurnEnd: '回合结束'
    };

    const targetNames = {
      selected: '选择的目标',
      self: '自己',
      multiple: '多个目标'
    };

    const baseEffectNames = {
      rupture: '破裂',
      sinking: '沉沦',
      bleeding: '流血',
      burn: '燃烧',
      breath: '呼吸',
      charge: '充能',
      tremor: '震颤',
      moan: '呻吟',
      medicine: '携药',
      paralysis: '麻痹'
    };

    let content = `<div style="background: #0F0D1B; border: 2px solid #EBBD68; border-radius: 8px; padding: 12px; color: #ECE4D6; font-family: 'Noto Sans SC', sans-serif;">`;
    content += `<div style="font-size: 18px; font-weight: bold; color: #EBBD68; margin-bottom: 8px;">📜 ${condition.name}</div>`;
    content += `<div style="margin-bottom: 4px;"><strong>触发时机:</strong> ${triggerNames[condition.trigger] || condition.trigger}</div>`;
    content += `<div style="margin-bottom: 4px;"><strong>目标:</strong> ${targetNames[condition.target] || condition.target}</div>`;

    if (condition.baseEffects && condition.baseEffects.length > 0) {
      const effects = condition.baseEffects.map(e => baseEffectNames[e] || e).join(', ');
      content += `<div style="margin-bottom: 4px;"><strong>基础效果:</strong> ${effects}</div>`;
    }

    if (condition.customEffect && condition.customEffect.name) {
      content += `<div style="margin-bottom: 4px;"><strong>其他效果:</strong> ${condition.customEffect.name}`;
      if (condition.customEffect.layers > 0) {
        content += ` (层数: ${condition.customEffect.layers})`;
      }
      if (condition.customEffect.strength > 0) {
        content += ` (强度: ${condition.customEffect.strength})`;
      }
      content += `</div>`;
    }

    if (condition.needConsumption) {
      content += `<div style="color: #E1AA43; font-size: 12px; margin-top: 8px;">需要消耗</div>`;
    }
    content += `</div>`;

    ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor: this.actor }),
      content: content
    });
  }

  /**
   * 添加新条件
   */
  async _onAddCondition(event) {
    event.preventDefault();

    const conditions = [...(this.item.system.conditions || [])];
    conditions.push({
      id: foundry.utils.randomID(),
      name: `条件${conditions.length + 1}`,
      trigger: 'onUse',
      needConsumption: false,
      consumptions: [],
      target: 'selected',
      baseEffects: [],
      customEffect: {
        name: '',
        layers: 0,
        strength: 0
      }
    });

    await this.item.update({ 'system.conditions': conditions });
  }

  /**
   * 基础效果多选处理
   */
  async _onBaseEffectChange(event) {
    const checkbox = event.currentTarget;
    const conditionIdx = parseInt(checkbox.dataset.conditionIdx);
    const effectValue = checkbox.value;
    const isChecked = checkbox.checked;

    const conditions = [...(this.item.system.conditions || [])];
    const condition = conditions[conditionIdx];

    if (!condition) return;

    let baseEffects = [...(condition.baseEffects || [])];

    if (isChecked) {
      if (!baseEffects.includes(effectValue)) {
        baseEffects.push(effectValue);
      }
    } else {
      baseEffects = baseEffects.filter(e => e !== effectValue);
    }

    conditions[conditionIdx].baseEffects = baseEffects;
    await this.item.update({ 'system.conditions': conditions });
  }

  /* -------------------------------------------- */

  /** @override */
  async _updateObject(event, formData) {
    // 展平嵌套的条件数据
    const expandedData = foundry.utils.expandObject(formData);

    // 确保conditions是数组
    if (expandedData.system?.conditions) {
      // 将条件对象转换为数组
      const conditionsObj = expandedData.system.conditions;
      const conditionsArray = [];

      for (let key in conditionsObj) {
        if (conditionsObj.hasOwnProperty(key)) {
          conditionsArray[parseInt(key)] = conditionsObj[key];
        }
      }

      expandedData.system.conditions = conditionsArray.filter(c => c); // 过滤掉undefined
    }

    return this.item.update(expandedData);
  }
}
