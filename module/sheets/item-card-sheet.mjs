/**
 * 书海大陆物品卡表单
 * 支持 Activities 系统
 */

import ActivityEditor from './activity-editor.mjs';

// BUFF预设列表
const BUFF_PRESETS = [
  // 增益
  { id: 'strong', name: '强壮', type: 'positive', icon: 'icons/svg/upgrade.svg', defaultLayers: 1, defaultStrength: 0 },
  { id: 'guard', name: '守护', type: 'positive', icon: 'icons/svg/shield.svg', defaultLayers: 1, defaultStrength: 0 },
  { id: 'swift', name: '迅捷', type: 'positive', icon: 'icons/svg/wing.svg', defaultLayers: 1, defaultStrength: 0 },
  { id: 'endure', name: '忍耐', type: 'positive', icon: 'icons/svg/stone-pile.svg', defaultLayers: 1, defaultStrength: 0 },
  // 减益
  { id: 'weak', name: '虚弱', type: 'negative', icon: 'icons/svg/downgrade.svg', defaultLayers: 1, defaultStrength: 0 },
  { id: 'vulnerable', name: '易损', type: 'negative', icon: 'icons/svg/break.svg', defaultLayers: 1, defaultStrength: 0 },
  { id: 'bound', name: '束缚', type: 'negative', icon: 'icons/svg/net.svg', defaultLayers: 1, defaultStrength: 0 },
  { id: 'flaw', name: '破绽', type: 'negative', icon: 'icons/svg/hazard.svg', defaultLayers: 1, defaultStrength: 0 },
  // 效果
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

export default class ItemCardSheet extends ItemSheet {

  constructor(...args) {
    super(...args);
    this._scrollPositions = {};
  }

  /** @override */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["shuhai-dalu", "sheet", "item", "item-card"],
      width: 520,
      height: 630,
      tabs: [],
      submitOnChange: false,  // 禁用自动提交
      closeOnSubmit: false
    });
  }

  /** @override */
  get template() {
    return `systems/shuhai-dalu/templates/item-card/item-card-sheet.hbs`;
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

    // 确保 activities 对象存在
    if (!context.system.activities) {
      context.system.activities = {};
    }

    // 富文本编辑器
    context.enrichedEffect = await TextEditor.enrichHTML(
      this.item.system.effect || '',
      { async: true }
    );

    // 编辑锁状态
    context.isLocked = this.item.getFlag('shuhai-dalu', 'isLocked') || false;

    // 根据类型添加category选项
    context.categoryChoices = this._getCategoryChoices(this.item.type);

    return context;
  }

  /**
   * 获取分类选项
   */
  _getCategoryChoices(itemType) {
    const choices = {
      'combatDice': ['打击', '突刺', '斩击'],
      'shootDice': ['打击', '突刺', '斩击'],
      'defenseDice': ['闪避', '反击-斩击', '反击-突刺', '反击-打击', '强化反击-斩击', '强化反击-突刺', '强化反击-打击', '防御', '强化防御'],
      'triggerDice': ['EX'],
      'passiveDice': ['道具', '标签']
    };
    return choices[itemType] || null;
  }

  /* -------------------------------------------- */

  /** @override */
  async _render(force, options) {
    // 确保 _scrollPositions 存在
    if (!this._scrollPositions) {
      this._scrollPositions = {};
    }

    // 保存滚动位置
    if (this.element && this.element.length) {
      const container = this.element.find('.item-card-container');
      if (container && container.length) {
        this._scrollPositions.main = container.scrollTop();
      }
    }

    await super._render(force, options);

    // 恢复滚动位置 - 使用 requestAnimationFrame 确保 DOM 完全渲染
    if (this._scrollPositions && this._scrollPositions.main !== undefined && this._scrollPositions.main > 0) {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          const container = this.element?.find('.item-card-container');
          if (container && container.length) {
            container.scrollTop(this._scrollPositions.main);
          }
        });
      });
    }
  }

  /* -------------------------------------------- */

  /**
   * 保存当前表单数据
   */
  async _saveFormData() {
    if (!this.element || !this.element.length) {
      console.log('【保存表单】element不存在');
      return;
    }

    const form = this.element.find('form')[0];
    if (!form) {
      console.log('【保存表单】form不存在');
      return;
    }

    try {
      // 手动收集表单数据
      const formData = new FormDataExtended(form).object;
      console.log('【保存表单】原始表单数据:', formData);

      // 使用 _updateObject 处理数据（包括 conditions 的特殊处理）
      const updateData = await this._getUpdateData(formData);
      console.log('【保存表单】处理后的数据:', updateData);

      // 更新 item（会触发渲染，但滚动位置会被保存和恢复）
      if (updateData && Object.keys(updateData).length > 0) {
        console.log('【保存表单】开始更新item');
        await this.item.update(updateData);
        console.log('【保存表单】item更新完成');
      } else {
        console.log('【保存表单】没有需要更新的数据');
      }
    } catch(err) {
      console.error('【保存表单】错误:', err);
      throw err;
    }
  }

  /**
   * 处理表单数据（与 _updateObject 相同的逻辑）
   */
  async _getUpdateData(formData) {
    const expanded = foundry.utils.expandObject(formData);
    console.log('【处理数据】展开后的数据:', expanded);

    // 处理conditions数组（与 _updateObject 相同的逻辑）
    if (expanded.system?.conditions) {
      console.log('【处理数据】发现conditions，原始:', expanded.system.conditions);
      const conditions = [];
      const conditionsObj = expanded.system.conditions;

      for (let i = 0; i < 100; i++) {
        if (conditionsObj[i]) {
          const condition = conditionsObj[i];
          console.log(`【处理数据】处理条件${i}:`, condition);

          // 处理effects对象
          const effects = {};
          if (condition.effects) {
            console.log(`【处理数据】条件${i}的effects原始数据:`, condition.effects);
            for (const [buffId, buffData] of Object.entries(condition.effects)) {
              console.log(`【处理数据】  buff ${buffId}:`, buffData, `enabled=${buffData.enabled}, type=${typeof buffData.enabled}`);
              // checkbox 的值可能是字符串 "on" 或布尔值
              const isEnabled = buffData.enabled === true || buffData.enabled === 'on' || buffData.enabled === 'true';
              if (isEnabled) {
                effects[buffId] = {
                  enabled: true,
                  layers: parseInt(buffData.layers) || 0,
                  strength: parseInt(buffData.strength) || 0
                };
                console.log(`【处理数据】  添加 buff ${buffId}:`, effects[buffId]);
              }
            }
            console.log(`【处理数据】条件${i}的effects处理后:`, effects);
          }

          const processedCondition = {
            trigger: condition.trigger || 'onUse',
            hasConsume: condition.hasConsume || false,
            consumes: condition.consumes || [],
            target: condition.target || 'selected',
            effects: effects,
            customEffect: condition.customEffect || {
              enabled: false,
              name: '',
              layers: 0,
              strength: 0
            }
          };
          console.log(`【处理数据】条件${i}处理后:`, processedCondition);
          conditions.push(processedCondition);
        }
      }

      console.log('【处理数据】所有条件处理完成，总数:', conditions.length);
      expanded.system.conditions = conditions;
    } else {
      console.log('【处理数据】没有发现conditions');
    }

    return expanded;
  }

  /* -------------------------------------------- */

  /** @override */
  activateListeners(html) {
    super.activateListeners(html);

    // 编辑锁
    html.find('.item-card-lock').click(this._onToggleLock.bind(this));

    // 面板折叠
    html.find('.item-card-panel-header').click(this._onTogglePanel.bind(this));

    // 只在可编辑状态添加以下监听器
    if (!this.isEditable) return;

    // Activities 管理
    html.find('.item-card-add-activity-btn').click(this._onAddActivity.bind(this));
    html.find('.edit-activity-btn').click(this._onEditActivity.bind(this));
    html.find('.delete-activity-btn').click(this._onDeleteActivity.bind(this));

    // 使用/聊天按钮
    html.find('.item-use-btn').click(this._onItemUse.bind(this));
    html.find('.item-card-action-btn secondary item-chat-btn').click(this._onItemChat.bind(this));
  }

  /* -------------------------------------------- */

  /**
   * 切换编辑锁
   */
  async _onToggleLock(event) {
    event.preventDefault();

    // 先保存表单数据
    await this._saveFormData();

    // 再切换锁定状态（会自动触发渲染）
    const currentLock = this.item.getFlag('shuhai-dalu', 'isLocked') || false;
    await this.item.setFlag('shuhai-dalu', 'isLocked', !currentLock);
  }

  /**
   * 面板折叠切换
   */
  _onTogglePanel(event) {
    event.preventDefault();
    const header = $(event.currentTarget);
    const content = header.next('.item-card-panel-content');
    const icon = header.find('.collapse-icon');

    content.toggleClass('collapsed');

    // 切换图标方向
    if (content.hasClass('collapsed')) {
      icon.removeClass('fa-chevron-down').addClass('fa-chevron-right');
    } else {
      icon.removeClass('fa-chevron-right').addClass('fa-chevron-down');
    }
  }

  /**
   * 添加条件
   */
  async _onAddCondition(event) {
    event.preventDefault();
    event.stopPropagation();

    const form = this.element.find('form')[0];
    if (!form) return;

    // 手动收集表单数据并处理
    const formData = new FormDataExtended(form).object;
    const updateData = await this._getUpdateData(formData);

    // 添加新条件
    const conditions = [...(this.item.system.conditions || [])];
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
    updateData['system.conditions'] = conditions;

    await this.item.update(updateData);
  }

  /**
   * 保存条件
   */
  async _onSaveCondition(event) {
    event.preventDefault();
    event.stopPropagation();

    console.log('【条件保存】开始保存');

    // 保存整个表单数据
    try {
      await this._saveFormData();
      console.log('【条件保存】保存成功');
      // 显示保存成功提示
      ui.notifications.info("条件已保存");
    } catch(err) {
      console.error('【条件保存】保存失败:', err);
      ui.notifications.error("条件保存失败: " + err.message);
    }
  }

  /**
   * 删除条件
   */
  async _onDeleteCondition(event) {
    event.preventDefault();
    event.stopPropagation();

    const conditionIndex = parseInt($(event.currentTarget).closest('.item-card-condition-panel').data('index'));

    const confirm = await Dialog.confirm({
      title: "删除条件",
      content: `<p>确定要删除条件 ${conditionIndex + 1} 吗？</p>`,
      yes: () => true,
      no: () => false
    });

    if (!confirm) return;

    const form = this.element.find('form')[0];
    if (!form) return;

    // 手动收集表单数据并处理
    const formData = new FormDataExtended(form).object;
    const updateData = await this._getUpdateData(formData);

    // 删除指定条件
    const conditions = [...(this.item.system.conditions || [])];
    conditions.splice(conditionIndex, 1);
    updateData['system.conditions'] = conditions;

    await this.item.update(updateData);
  }

  /**
   * 添加消耗
   */
  async _onAddConsume(event) {
    event.preventDefault();
    event.stopPropagation();

    const form = this.element.find('form')[0];
    if (!form) return;

    // 手动收集表单数据并处理
    const formData = new FormDataExtended(form).object;
    const updateData = await this._getUpdateData(formData);

    const conditionIndex = parseInt($(event.currentTarget).data('condition-index'));
    const conditions = [...(this.item.system.conditions || [])];

    if (!conditions[conditionIndex].consumes) {
      conditions[conditionIndex].consumes = [];
    }

    conditions[conditionIndex].consumes.push({
      buffId: 'charge',
      layers: 1,
      strength: 0
    });

    updateData['system.conditions'] = conditions;
    await this.item.update(updateData);
  }

  /**
   * 移除消耗
   */
  async _onRemoveConsume(event) {
    event.preventDefault();
    event.stopPropagation();

    const form = this.element.find('form')[0];
    if (!form) return;

    // 手动收集表单数据并处理
    const formData = new FormDataExtended(form).object;
    const updateData = await this._getUpdateData(formData);

    const conditionIndex = parseInt($(event.currentTarget).data('condition-index'));
    const consumeIndex = parseInt($(event.currentTarget).data('consume-index'));
    const conditions = [...(this.item.system.conditions || [])];

    conditions[conditionIndex].consumes.splice(consumeIndex, 1);

    updateData['system.conditions'] = conditions;
    await this.item.update(updateData);
  }

  /**
   * 添加 Activity
   */
  async _onAddActivity(event) {
    event.preventDefault();
    const editor = new ActivityEditor(this.item);
    editor.render(true);
  }

  /**
   * 编辑 Activity
   */
  async _onEditActivity(event) {
    event.preventDefault();
    const activityId = $(event.currentTarget).data('activity-id');
    const activity = this.item.system.activities?.[activityId];

    if (!activity) {
      ui.notifications.error("找不到该活动");
      return;
    }

    const editor = new ActivityEditor(this.item, activity);
    editor.render(true);
  }

  /**
   * 删除 Activity
   */
  async _onDeleteActivity(event) {
    event.preventDefault();
    const activityId = $(event.currentTarget).data('activity-id');
    const activity = this.item.system.activities?.[activityId];

    if (!activity) return;

    const confirm = await Dialog.confirm({
      title: "删除活动",
      content: `<p>确定要删除活动 "${activity.name}" 吗？</p>`,
      yes: () => true,
      no: () => false
    });

    if (!confirm) return;

    // 复制 activities 对象并删除指定活动
    const activities = { ...(this.item.system.activities || {}) };
    delete activities[activityId];

    await this.item.update({
      'system.activities': activities
    });

    ui.notifications.info("活动已删除");
  }

  /**
   * 使用物品
   */
  async _onItemUse(event) {
    event.preventDefault();

    ui.notifications.info(`使用 ${this.item.name}`);
    await this.item.displayCard();
  }

  /**
   * 发送到聊天
   */
  async _onItemChat(event) {
    event.preventDefault();
    await this.item.displayCard();
  }

  /* -------------------------------------------- */

  /** @override */
  async _updateObject(event, formData) {
    const expanded = foundry.utils.expandObject(formData);

    // 处理conditions数组
    if (expanded.system?.conditions) {
      const conditions = [];
      const conditionsObj = expanded.system.conditions;

      for (let i = 0; i < 100; i++) {
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

          conditions.push({
            trigger: condition.trigger || 'onUse',
            hasConsume: condition.hasConsume || false,
            consumes: condition.consumes || [],
            target: condition.target || 'selected',
            effects: effects,
            customEffect: condition.customEffect || {
              enabled: false,
              name: '',
              layers: 0,
              strength: 0
            }
          });
        }
      }

      expanded.system.conditions = conditions;
    }

    return this.item.update(expanded);
  }
}
