/**
 * 全局敌人战斗区域HUD - 显示所有参战敌人的信息
 * 特性：可拖动、可缩放、可最小化、透明底色
 */

// 预定义BUFF类型（从combat-area.mjs复制）
const BUFF_TYPES = {
  // 增益BUFF
  positive: [
    { id: 'strong', name: '强壮', type: 'positive', description: '一回合内 "战斗骰" 的 "骰数" 增加 等同于本效果层数的数值。', icon: 'icons/svg/upgrade.svg', defaultLayers: 1, defaultStrength: 0 },
    { id: 'guard', name: '守护', type: 'positive', description: '一回合内 [被击中时] 受到 最终伤害 减少 等同于本效果层数的数值。', icon: 'icons/svg/shield.svg', defaultLayers: 1, defaultStrength: 0 },
    { id: 'swift', name: '迅捷', type: 'positive', description: '一回合内 所有【行动槽】"速度" 增加 等同于本效果层数的数值。', icon: 'icons/svg/wing.svg', defaultLayers: 1, defaultStrength: 0 },
    { id: 'endure', name: '忍耐', type: 'positive', description: '一回合内 "守备" 的 骰数 增加 等同于本效果层数的数值。', icon: 'icons/svg/stone-pile.svg', defaultLayers: 1, defaultStrength: 0 },
  ],
  // 减益BUFF
  negative: [
    { id: 'weak', name: '虚弱', type: 'negative', description: '一回合内 "战斗骰" 的 "骰数" 减少 等同于本效果层数的数值。', icon: 'icons/svg/downgrade.svg', defaultLayers: 1, defaultStrength: 0 },
    { id: 'vulnerable', name: '易损', type: 'negative', description: '一回合内 [被击中时] 受到 最终伤害 增加 等同于本效果层数的数值。', icon: 'icons/svg/break.svg', defaultLayers: 1, defaultStrength: 0 },
    { id: 'bound', name: '束缚', type: 'negative', description: '一回合内 所有【行动槽】"速度" 减少 等同于本效果层数的数值。', icon: 'icons/svg/net.svg', defaultLayers: 1, defaultStrength: 0 },
    { id: 'flaw', name: '破绽', type: 'negative', description: '一回合内 "守备" 的 骰数 减少 等同于本效果层数的数值。', icon: 'icons/svg/hazard.svg', defaultLayers: 1, defaultStrength: 0 },
  ],
  // 效果BUFF
  effect: [
    { id: 'rupture', name: '破裂', type: 'effect', description: '受到攻击时：附加数值等同于本效果强度的固定伤害。效果生效后，本效果的层数减少1层。', icon: 'icons/svg/explosion.svg', defaultLayers: 1, defaultStrength: 3 },
    { id: 'bleed', name: '流血', type: 'effect', description: '攻击时：受到数值等同于本效果强度的固定伤害。效果生效后,本效果的层数减少1层。', icon: 'icons/svg/blood.svg', defaultLayers: 1, defaultStrength: 2 },
    { id: 'corruption_effect', name: '沉沦', type: 'effect', description: '受到攻击时：增加数值等同于本效果强度的固定侵蚀点数（没有侵蚀值的目标则受到伤害）。效果生效后，本效果的层数减少1层。', icon: 'icons/svg/shadow.svg', defaultLayers: 1, defaultStrength: 2 },
    { id: 'burn', name: '燃烧', type: 'effect', description: '回合结束时：受到数值等同于本效果强度的固定伤害。效果生效后，本效果的层数减少1层。', icon: 'icons/svg/fire.svg', defaultLayers: 1, defaultStrength: 4 },
    { id: 'breath', name: '呼吸', type: 'effect', description: '攻击命中时：呼吸强度和随机值大于15则暴击，触发暴击时使效果层数减少1层。回合结束时，本效果的层数减少1层。', icon: 'icons/svg/breath.svg', defaultLayers: 1, defaultStrength: 5 },
    { id: 'charge', name: '充能', type: 'effect', description: '特定技能发动附加效果所需的资源。最多叠加至20层。回合结束时，本效果的层数减少1层。', icon: 'icons/svg/lightning.svg', defaultLayers: 1, defaultStrength: 0 },
    { id: 'tremor', name: '震颤', type: 'effect', description: '受到造成【震颤引爆】的攻击时：混乱值前移等同于本效果强度的数值。回合结束时，本效果的层数减少1层。', icon: 'icons/svg/frozen.svg', defaultLayers: 1, defaultStrength: 3 },
    { id: 'ammo', name: '弹药', type: 'effect', description: '特定技能进行攻击时消耗的资源。缺少弹药时这些攻击将被取消。', icon: 'icons/svg/sword.svg', defaultLayers: 10, defaultStrength: 0 },
    { id: 'chant', name: '吟唱', type: 'effect', description: '特定技能发动附加效果所需的资源。回合结束时，本效果的层数减少1层。', icon: 'icons/svg/book.svg', defaultLayers: 1, defaultStrength: 0 },
    { id: 'paralyze', name: '麻痹', type: 'effect', description: '你的下一次攻击骰数结果/2。', icon: 'icons/svg/paralysis.svg', defaultLayers: 1, defaultStrength: 0 }
  ]
};

export default class EnemyBattleAreaHUD extends Application {

  constructor(options = {}) {
    super(options);

    // 加载全局参战角色列表
    this.battleActors = game.settings.get('shuhai-dalu', 'enemyBattleActors') || [];

    // 加载HUD状态（位置、缩放、最小化）
    this.hudState = game.settings.get('shuhai-dalu', 'enemyBattleHudState') || {
      position: { left: 100, top: 100 },
      scale: 1.0,
      minimized: false
    };

    // 标记是否是初次渲染（用于位置恢复）
    this._isFirstRender = true;

    // 保存滚动位置
    this._scrollTop = 0;

    // 监听角色数据更新
    this._setupActorUpdateHook();
  }

  /** @override */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["shuhai-dalu", "enemy-battle-area-hud"],
      template: "systems/shuhai-dalu/templates/hud/enemy-battle-area-hud.hbs",
      width: 420,
      height: "auto",
      resizable: false,
      minimizable: false,
      title: "敌人信息表",
      popOut: true,
      dragDrop: []
    });
  }

  /** @override */
  get title() {
    return "敌人信息表";
  }

  /** @override */
  async getData() {
    const context = await super.getData();

    // 重新加载参战角色列表
    this.battleActors = game.settings.get('shuhai-dalu', 'enemyBattleActors') || [];

    // 获取所有参战角色的数据
    context.players = [];
    for (const actorId of this.battleActors) {
      const actor = game.actors.get(actorId);
      if (actor) {
        const playerData = await this._preparePlayerData(actor);
        context.players.push(playerData);
      }
    }

    // 获取HUD状态
    context.hudState = this.hudState;

    return context;
  }

  /**
   * 准备单个玩家的数据
   */
  async _preparePlayerData(actor) {
    const data = {
      actor: actor,
      system: actor.system
    };

    // 获取战斗状态
    const combatState = actor.getFlag('shuhai-dalu', 'combatState') || {
      costResources: [false, false, false, false, false, false],
      exResources: [true, true, true],
      activatedDice: [false, false, false, false, false, false],
      buffs: [],
      speedValues: null
    };
    data.combatState = combatState;

    // 准备战斗骰数据
    data.combatDiceSlots = this._prepareCombatDiceSlots(actor, combatState);

    // 计算或获取速度值
    if (!combatState.speedValues) {
      combatState.speedValues = this._calculateSpeedValues(actor);
    }
    data.speedValues = this._applySpeedModifiers(actor, combatState.speedValues);

    return data;
  }

  /**
   * 准备战斗骰槽位数据（6个）
   */
  _prepareCombatDiceSlots(actor, combatState) {
    const slots = [];

    for (let i = 0; i < 6; i++) {
      const diceId = actor.system.equipment.combatDice[i];
      if (diceId) {
        const item = actor.items.get(diceId);
        if (item) {
          slots.push({
            index: i,
            item: item,
            activated: combatState.activatedDice[i] || false
          });
        } else {
          slots.push({ index: i, item: null, activated: false });
        }
      } else {
        slots.push({ index: i, item: null, activated: false });
      }
    }
    return slots;
  }

  /**
   * 计算速度值
   */
  _calculateSpeedValues(actor) {
    const constitution = actor.system.attributes.constitution || 0;
    const dexterity = actor.system.attributes.dexterity || 0;

    const diceSize = constitution < 9 ? 6 : 4;
    const bonus = Math.floor(dexterity / 3);

    return [
      Math.floor(Math.random() * diceSize) + 1 + bonus,
      Math.floor(Math.random() * diceSize) + 1 + bonus,
      Math.floor(Math.random() * diceSize) + 1 + bonus
    ];
  }

  /**
   * 应用速度修正（迅捷/束缚）
   */
  _applySpeedModifiers(actor, baseSpeedValues) {
    if (!baseSpeedValues) return [0, 0, 0];

    let modifier = 0;
    const combatState = actor.getFlag('shuhai-dalu', 'combatState') || { buffs: [] };

    if (combatState.buffs) {
      for (const buff of combatState.buffs) {
        if (buff.id === 'swift' && buff.layers > 0) {
          modifier += buff.layers;
        } else if (buff.id === 'bound' && buff.layers > 0) {
          modifier -= buff.layers;
        }
      }
    }

    return baseSpeedValues.map(speed => Math.max(0, speed + modifier));
  }

  /** @override */
  async render(force, options) {
    // 在渲染前保存滚动位置
    if (this.element && this.element.length > 0) {
      const container = this.element.find('.hud-players-container')[0];
      if (container) {
        this._scrollTop = container.scrollTop;
      }
    }

    return super.render(force, options);
  }

  /** @override */
  activateListeners(html) {
    super.activateListeners(html);

    // 缩放按钮
    html.find('.hud-scale-up').click(this._onScaleUp.bind(this));
    html.find('.hud-scale-down').click(this._onScaleDown.bind(this));

    // 最小化/恢复按钮
    html.find('.hud-minimize-toggle').click(this._onToggleMinimize.bind(this));

    // 点击BUFF跳转到战斗区域
    html.find('.hud-buff-slot.empty').click(this._onOpenCombatArea.bind(this));
    html.find('.hud-buff-slot:not(.empty)').click(this._onBuffClick.bind(this));

    // 点击玩家卡片打开战斗区域
    html.find('.hud-player-card').click(this._onPlayerCardClick.bind(this));

    // 移除玩家按钮
    html.find('.hud-remove-player-btn').click(this._onRemovePlayer.bind(this));

    // 点击加入战斗轮
    html.find('.hud-join-battle-btn').click(this._onJoinBattle.bind(this));

    // 设置拖动
    this._setupDragging(html);

    // 应用缩放
    this._applyScale(html);

    // 恢复滚动位置
    this._restoreScrollPosition(html);
  }

  /**
   * 恢复滚动位置
   */
  _restoreScrollPosition(html) {
    const container = html.find('.hud-players-container')[0];
    if (container && this._scrollTop) {
      container.scrollTop = this._scrollTop;
    }
  }

  /**
   * 设置拖动功能
   */
  _setupDragging(html) {
    const header = html.find('.hud-header')[0];
    if (!header) return;

    let isDragging = false;
    let currentX;
    let currentY;
    let initialX;
    let initialY;

    header.addEventListener('mousedown', (e) => {
      if (e.target.classList.contains('hud-control-btn') || e.target.closest('.hud-control-btn')) return;
      isDragging = true;

      // 获取窗口当前的实际位置（避免缩放导致的跳动）
      const rect = html[0].getBoundingClientRect();
      initialX = e.clientX - rect.left;
      initialY = e.clientY - rect.top;
    });

    document.addEventListener('mousemove', (e) => {
      if (isDragging) {
        e.preventDefault();
        currentX = e.clientX - initialX;
        currentY = e.clientY - initialY;

        html[0].style.left = currentX + 'px';
        html[0].style.top = currentY + 'px';
      }
    });

    document.addEventListener('mouseup', (e) => {
      if (isDragging) {
        isDragging = false;
        this.hudState.position.left = parseInt(html[0].style.left);
        this.hudState.position.top = parseInt(html[0].style.top);
        this._saveHudState();
      }
    });
  }

  /**
   * 应用缩放
   */
  _applyScale(html) {
    // 对整个窗口应用缩放（使用this.element获取根元素）
    if (this.element && this.element.length > 0) {
      const appElement = this.element[0];
      appElement.style.transform = `scale(${this.hudState.scale})`;
      appElement.style.transformOrigin = 'top left';
    }
  }

  /**
   * 放大
   */
  async _onScaleUp(event) {
    event.preventDefault();
    this.hudState.scale = Math.min(2.0, this.hudState.scale + 0.1);
    await this._saveHudState();
    this.render();
  }

  /**
   * 缩小
   */
  async _onScaleDown(event) {
    event.preventDefault();
    this.hudState.scale = Math.max(0.5, this.hudState.scale - 0.1);
    await this._saveHudState();
    this.render();
  }

  /**
   * 切换最小化
   */
  async _onToggleMinimize(event) {
    event.preventDefault();
    this.hudState.minimized = !this.hudState.minimized;
    await this._saveHudState();
    this.render();
  }

  /**
   * 点击玩家卡片，打开该玩家的战斗区域
   */
  async _onPlayerCardClick(event) {
    event.preventDefault();
    const actorId = $(event.currentTarget).data('actor-id');
    const actor = game.actors.get(actorId);

    if (!actor) return;

    // 动态导入CombatAreaApplication
    const CombatAreaApplication = (await import('./combat-area.mjs')).default;
    const combatArea = new CombatAreaApplication(actor);
    combatArea.render(true);
  }

  /**
   * 打开战斗区域
   */
  async _onOpenCombatArea(event) {
    event.preventDefault();
    event.stopPropagation(); // 阻止事件冒泡到玩家卡片
    const actorId = $(event.currentTarget).closest('.hud-player-card').data('actor-id');
    const actor = game.actors.get(actorId);

    if (!actor) return;

    // 动态导入CombatAreaApplication
    const CombatAreaApplication = (await import('./combat-area.mjs')).default;
    const combatArea = new CombatAreaApplication(actor);
    combatArea.render(true);
  }

  /**
   * 点击BUFF（显示详情）
   */
  async _onBuffClick(event) {
    event.preventDefault();
    event.stopPropagation(); // 阻止事件冒泡到玩家卡片
    const buffIndex = parseInt($(event.currentTarget).data('buff-index'));
    const actorId = $(event.currentTarget).closest('.hud-player-card').data('actor-id');
    const actor = game.actors.get(actorId);

    if (!actor) return;

    const combatState = actor.getFlag('shuhai-dalu', 'combatState') || { buffs: [] };
    const buff = combatState.buffs[buffIndex];

    if (buff) {
      ui.notifications.info(`${buff.name} - 层数:${buff.layers} 强度:${buff.strength}\n${buff.description || ''}`);
    }
  }

  /**
   * 移除玩家
   */
  async _onRemovePlayer(event) {
    event.preventDefault();
    event.stopPropagation();

    const actorId = $(event.currentTarget).closest('.hud-player-card').data('actor-id');

    // 从列表中移除
    this.battleActors = this.battleActors.filter(id => id !== actorId);
    await game.settings.set('shuhai-dalu', 'enemyBattleActors', this.battleActors);

    // 刷新
    this.render();
  }

  /**
   * 加入战斗轮
   */
  async _onJoinBattle(event) {
    event.preventDefault();

    // 检查是否有选中的Token
    const controlled = canvas.tokens?.controlled;
    let actor = null;

    if (controlled && controlled.length > 0) {
      // 有选中Token，使用该Token的角色
      const token = controlled[0];
      actor = token.actor;

      // 如果是Token Actor（非链接token），获取原始Actor
      if (actor && actor.isToken && !actor.token?.actorLink) {
        const baseActor = game.actors.get(actor.token.actorId);
        if (baseActor) {
          actor = baseActor;
        }
      }
    } else {
      // 没有选中Token，从角色列表选择
      const actors = game.actors.filter(a => a.type === 'character');

      if (actors.length === 0) {
        ui.notifications.warn("没有可用的角色！");
        return;
      }

      // 创建选择对话框
      actor = await this._selectActorDialog(actors);
      if (!actor) return;
    }

    // 添加到参战列表
    if (!this.battleActors.includes(actor.id)) {
      this.battleActors.push(actor.id);
      await game.settings.set('shuhai-dalu', 'enemyBattleActors', this.battleActors);
      this.render();
    }
  }

  /**
   * 选择角色对话框
   */
  async _selectActorDialog(actors) {
    return new Promise((resolve) => {
      const options = actors.map(a => `<option value="${a.id}">${a.name}</option>`).join('');

      new Dialog({
        title: "选择角色加入战斗",
        content: `
          <form>
            <div class="form-group">
              <label>选择角色:</label>
              <select name="actorId" style="width: 100%; padding: 0.5rem; background: #0F0D1B; border: 1px solid #E3B767; color: #E3B767; border-radius: 3px;">
                ${options}
              </select>
            </div>
          </form>
        `,
        buttons: {
          join: {
            icon: '<i class="fas fa-plus"></i>',
            label: "加入",
            callback: (html) => {
              const actorId = html.find('[name="actorId"]').val();
              resolve(game.actors.get(actorId));
            }
          },
          cancel: {
            icon: '<i class="fas fa-times"></i>',
            label: "取消",
            callback: () => resolve(null)
          }
        },
        default: "join"
      }).render(true);
    });
  }

  /**
   * 保存HUD状态
   */
  async _saveHudState() {
    await game.settings.set('shuhai-dalu', 'enemyBattleHudState', this.hudState);
  }

  /**
   * 设置角色数据更新监听
   */
  _setupActorUpdateHook() {
    this._actorUpdateHook = Hooks.on('updateActor', (actor, changes, options, userId) => {
      // 如果更新的是参战角色，刷新HUD
      if (this.battleActors.includes(actor.id) && this.rendered) {
        this.render(false);
      }
    });
  }

  /** @override */
  async close(options) {
    // 移除Hook
    if (this._actorUpdateHook) {
      Hooks.off('updateActor', this._actorUpdateHook);
    }
    return super.close(options);
  }

  /** @override */
  setPosition(options = {}) {
    const position = super.setPosition(options);

    // 只在初次渲染时应用保存的位置，后续渲染保持当前位置
    if (this._isFirstRender && this.hudState.position) {
      position.left = this.hudState.position.left;
      position.top = this.hudState.position.top;
      this._isFirstRender = false;
    }

    return position;
  }
}
