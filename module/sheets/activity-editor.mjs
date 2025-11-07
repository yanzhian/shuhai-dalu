/**
 * Activity 编辑对话框
 */

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

export default class ActivityEditor extends Application {

  constructor(item, activity = null, options = {}) {
    super(options);
    this.item = item;

    if (activity) {
      // 编辑现有activity
      this.activityId = activity._id;
      this.activity = foundry.utils.deepClone(activity);
      // 将effects对象转换为effectsList数组
      this.activity.effectsList = this._effectsToList(activity.effects || {});
    } else {
      // 创建新activity
      this.activityId = foundry.utils.randomID();
      this.activity = this._getDefaultActivity();
    }
  }

  /**
   * 将 effects 对象转换为列表
   */
  _effectsToList(effects) {
    const list = [];
    for (const [buffId, data] of Object.entries(effects)) {
      list.push({
        buffId: buffId,
        layers: data.layers || 0,
        strength: data.strength || 0
      });
    }
    return list;
  }

  /**
   * 将 effectsList 转换回 effects 对象
   */
  _listToEffects(effectsList) {
    const effects = {};
    for (const effect of effectsList) {
      if (effect.buffId) {
        effects[effect.buffId] = {
          layers: parseInt(effect.layers) || 0,
          strength: parseInt(effect.strength) || 0
        };
      }
    }
    return effects;
  }

  /**
   * 获取默认 Activity 数据
   */
  _getDefaultActivity() {
    return {
      _id: this.activityId,
      name: "",
      trigger: "onUse",
      hasConsume: false,
      consumes: [],
      target: "selected",
      effectsList: [],
      customEffect: {
        enabled: false,
        name: "",
        layers: 0,
        strength: 0
      }
    };
  }

  /** @override */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["shuhai-dalu", "activity-editor"],
      template: "systems/shuhai-dalu/templates/item-card/activity-editor.hbs",
      width: 500,
      height: "auto",
      title: "编辑活动",
      closeOnSubmit: false,
      submitOnChange: false,
      submitOnClose: false,
      resizable: true
    });
  }

  /** @override */
  async getData() {
    return {
      activity: this.activity,
      buffPresets: BUFF_PRESETS
    };
  }

  /** @override */
  activateListeners(html) {
    super.activateListeners(html);

    // 消耗管理
    html.find('.add-consume-btn').click(this._onAddConsume.bind(this));
    html.find('.remove-consume-btn').click(this._onRemoveConsume.bind(this));

    // 效果管理
    html.find('.add-effect-btn').click(this._onAddEffect.bind(this));
    html.find('.remove-effect-btn').click(this._onRemoveEffect.bind(this));

    // checkbox 变化时重新渲染
    html.find('.has-consume-checkbox').change(async (e) => {
      this.activity.hasConsume = e.target.checked;
      this.render();
    });

    html.find('.custom-effect-checkbox').change(async (e) => {
      this.activity.customEffect.enabled = e.target.checked;
      this.render();
    });

    // 保存和取消按钮
    html.find('.save-btn').click(this._onSave.bind(this));
    html.find('.cancel-btn').click(() => this.close());

    // 阻止form默认提交
    html.find('form').submit((e) => {
      e.preventDefault();
      this._onSave(e);
    });
  }

  /**
   * 添加消耗
   */
  _onAddConsume(event) {
    event.preventDefault();
    this.activity.consumes.push({
      buffId: 'charge',
      layers: 1,
      strength: 0
    });
    this.render();
  }

  /**
   * 删除消耗
   */
  _onRemoveConsume(event) {
    event.preventDefault();
    const index = parseInt($(event.currentTarget).data('index'));
    this.activity.consumes.splice(index, 1);
    this.render();
  }

  /**
   * 添加效果
   */
  _onAddEffect(event) {
    event.preventDefault();
    this.activity.effectsList.push({
      buffId: 'strong',
      layers: 1,
      strength: 0
    });
    this.render();
  }

  /**
   * 删除效果
   */
  _onRemoveEffect(event) {
    event.preventDefault();
    const index = parseInt($(event.currentTarget).data('index'));
    this.activity.effectsList.splice(index, 1);
    this.render();
  }

  /**
   * 保存
   */
  async _onSave(event) {
    event.preventDefault();

    const form = this.element.find('form')[0];
    if (!form) return;

    const formData = new FormDataExtended(form).object;

    // 处理 consumes
    const consumes = formData.consumes ? Object.values(formData.consumes) : [];

    // 处理 effectsList
    const effectsList = formData.effects ? Object.values(formData.effects) : [];
    const effects = this._listToEffects(effectsList);

    // 构建 activity 数据
    const activityData = {
      _id: this.activityId,
      name: formData.name || "",
      trigger: formData.trigger || "onUse",
      hasConsume: formData.hasConsume === true || formData.hasConsume === 'on',
      consumes: consumes,
      target: formData.target || "selected",
      effects: effects,
      customEffect: {
        enabled: formData.customEffect?.enabled === true || formData.customEffect?.enabled === 'on',
        name: formData.customEffect?.name || "",
        layers: parseInt(formData.customEffect?.layers) || 0,
        strength: parseInt(formData.customEffect?.strength) || 0
      }
    };

    console.log('【Activity保存】准备保存:', activityData);

    // 更新 item 的 activities
    const activities = foundry.utils.deepClone(this.item.system.activities || {});
    activities[this.activityId] = activityData;

    await this.item.update({
      'system.activities': activities
    });

    ui.notifications.info("活动已保存");
    this.close();
  }
}
