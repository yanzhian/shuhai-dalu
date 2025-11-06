/**
 * 书海大陆角色数据模型 - 完整版
 */
export default class CharacterData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    const fields = foundry.data.fields;
    
    return {
      // ==================== 1. 角色信息属性 ====================
      // 基础信息
      info: new fields.SchemaField({
        gender: new fields.StringField({ initial: "未知", label: "性别" }),
        race: new fields.StringField({ initial: "人类", label: "种族" }),
        faction: new fields.StringField({ initial: "", label: "势力" }),
        experience: new fields.NumberField({ required: true, initial: 0, min: 0, label: "经验值" })
      }),
      
      // 等级
      level: new fields.NumberField({ 
        required: true, 
        initial: 1, 
        min: 1,
        label: "等级"
      }),
      
      // 基础属性
      attributes: new fields.SchemaField({
        strength: new fields.NumberField({ required: true, initial: 10, min: 1, max: 30, label: "力量" }),
        constitution: new fields.NumberField({ required: true, initial: 10, min: 1, max: 30, label: "体质" }),
        dexterity: new fields.NumberField({ required: true, initial: 10, min: 1, max: 30, label: "敏捷" }),
        perception: new fields.NumberField({ required: true, initial: 10, min: 1, max: 30, label: "感知" }),
        intelligence: new fields.NumberField({ required: true, initial: 10, min: 1, max: 30, label: "智力" }),
        charisma: new fields.NumberField({ required: true, initial: 10, min: 1, max: 30, label: "魅力" })
      }),
      
      // 派生属性（自动计算）
      derived: new fields.SchemaField({
        starlight: new fields.NumberField({ initial: 10, min: 0, label: "星光" }), // 10 + 等级*2
        starlightUsed: new fields.NumberField({ initial: 0, min: 0, label: "已用星光" }), // 装备消耗的星光
        hp: new fields.SchemaField({
          value: new fields.NumberField({ initial: 0, min: 0, label: "当前生命值" }),
          max: new fields.NumberField({ initial: 0, min: 0, label: "最大生命值" }) // 体质*3 + 力量 + 等级*3
        }),
        corruption: new fields.SchemaField({
          value: new fields.NumberField({ initial: 0, min: 0, label: "当前侵蚀度" }),
          max: new fields.NumberField({ initial: 0, min: 0, label: "最大侵蚀度" }) // 感知/2 + 智力/3
        }),
        chaos: new fields.SchemaField({
          value: new fields.NumberField({ initial: 0, min: 0, label: "当前混乱值" }),
          max: new fields.NumberField({ initial: 0, min: 0, label: "最大混乱值" }) // 体质>10 ? 生命值/2 : 生命值/3
        }),
        speed: new fields.NumberField({ initial: 0, min: 0, label: "速度值" }), // 1d6 + 敏捷/3
        totalSpeed: new fields.NumberField({ initial: 0, min: 0, label: "总速度" }) // 用于先攻追踪
      }),
      
      // 常用物品货币
      resources: new fields.SchemaField({
        currency: new fields.NumberField({ initial: 0, min: 0, label: "货币" }),
        encounterPoints: new fields.NumberField({ initial: 0, min: 0, label: "奇遇点" }),
        miraclePoints: new fields.NumberField({ initial: 1, min: 0, label: "奇迹点" }),
        replicaCore: new fields.NumberField({ initial: 0, min: 0, label: "复制核心" })
      }),
      
      // ==================== 2. 角色技能属性 ====================
      // 技能点池
      skillPoints: new fields.SchemaField({
        strengthDex: new fields.SchemaField({
          total: new fields.NumberField({ initial: 0, min: 0, label: "力敏技能点总数" }), // 力量 + 敏捷*3 + 等级*3
          used: new fields.NumberField({ initial: 0, min: 0, label: "已用力敏技能点" })
        }),
        intelligence: new fields.SchemaField({
          total: new fields.NumberField({ initial: 0, min: 0, label: "智力技能点总数" }), // 智力*4 + 等级*3
          used: new fields.NumberField({ initial: 0, min: 0, label: "已用智力技能点" })
        }),
        perception: new fields.SchemaField({
          total: new fields.NumberField({ initial: 0, min: 0, label: "感知技能点总数" }), // 感知*4 + 等级*3
          used: new fields.NumberField({ initial: 0, min: 0, label: "已用感知技能点" })
        }),
        charisma: new fields.SchemaField({
          total: new fields.NumberField({ initial: 0, min: 0, label: "魅力技能点总数" }), // 魅力*3 + 等级*3
          used: new fields.NumberField({ initial: 0, min: 0, label: "已用魅力技能点" })
        })
      }),
      
      // 技能值 (0-25)
      skills: new fields.SchemaField({
        // 力敏技能
        athletics: new fields.NumberField({ initial: 0, min: 0, max: 25, label: "运动" }),
        acrobatics: new fields.NumberField({ initial: 0, min: 0, max: 25, label: "体操" }),
        sleight: new fields.NumberField({ initial: 0, min: 0, max: 25, label: "巧手" }),
        stealth: new fields.NumberField({ initial: 0, min: 0, max: 25, label: "隐蔽" }),
        
        // 智力技能
        qidian: new fields.NumberField({ initial: 0, min: 0, max: 25, label: "奇点" }),
        history: new fields.NumberField({ initial: 0, min: 0, max: 25, label: "历史" }),
        investigation: new fields.NumberField({ initial: 0, min: 0, max: 25, label: "调查" }),
        nature: new fields.NumberField({ initial: 0, min: 0, max: 25, label: "自然" }),
        religion: new fields.NumberField({ initial: 0, min: 0, max: 25, label: "宗教" }),
        
        // 感知技能
        animal: new fields.NumberField({ initial: 0, min: 0, max: 25, label: "驯兽" }),
        insight: new fields.NumberField({ initial: 0, min: 0, max: 25, label: "洞悉" }),
        medicine: new fields.NumberField({ initial: 0, min: 0, max: 25, label: "医药" }),
        perception: new fields.NumberField({ initial: 0, min: 0, max: 25, label: "察觉" }),
        survival: new fields.NumberField({ initial: 0, min: 0, max: 25, label: "求生" }),
        
        // 魅力技能
        deception: new fields.NumberField({ initial: 0, min: 0, max: 25, label: "欺瞒" }),
        intimidation: new fields.NumberField({ initial: 0, min: 0, max: 25, label: "威吓" }),
        performance: new fields.NumberField({ initial: 0, min: 0, max: 25, label: "表演" }),
        persuasion: new fields.NumberField({ initial: 0, min: 0, max: 25, label: "游说" })
      }),
      
      // ==================== 3. 装备栏 ====================
      equipment: new fields.SchemaField({
        // 装备槽位 (存储 Item ID)
        weapon: new fields.StringField({ initial: "", label: "武器" }),
        armor: new fields.StringField({ initial: "", label: "防具" }),
        items: new fields.ArrayField(
          new fields.StringField(),
          { initial: ["", "", "", ""], label: "物品槽" }
        ),
        gear: new fields.ArrayField(
          new fields.StringField(),
          { initial: ["", "", "", ""], label: "装备槽" }
        ),
        
        // 战斗骰槽位 (1-6)
        combatDice: new fields.ArrayField(
          new fields.StringField(),
          { initial: ["", "", "", "", "", ""], label: "战斗骰" }
        ),
        
        // 守备骰槽位
        defenseDice: new fields.StringField({ initial: "", label: "守备骰" }),
        
        // 触发骰槽位
        triggerDice: new fields.StringField({ initial: "", label: "触发骰" }),
        
        // 被动技能槽位 (1-6)
        passives: new fields.ArrayField(
          new fields.StringField(),
          { initial: ["", "", "", "", "", ""], label: "被动技能" }
        )
      }),
      
      // ==================== 4. 其他 ====================
      // 备注
      biography: new fields.HTMLField({ initial: "" })
    };
  }
  
  /**
   * 准备派生数据 - 自动计算所有派生属性
   */
  prepareDerivedData() {
    const str = this.attributes.strength;
    const con = this.attributes.constitution;
    const dex = this.attributes.dexterity;
    const per = this.attributes.perception;
    const int = this.attributes.intelligence;
    const cha = this.attributes.charisma;
    const lvl = this.level;
    
    // 计算星光 (10 + 等级*2 - 已用星光)
    const totalStarlight = 10 + lvl * 2;
    this.derived.starlight = totalStarlight - this.derived.starlightUsed;
    
    // 计算最大生命值 (体质*3 + 力量 + 等级*3)
    this.derived.hp.max = con * 3 + str + lvl * 3;

    // 只限制HP不超过最大值（不自动初始化，不重置为0）
    if (this.derived.hp.value > this.derived.hp.max) {
      this.derived.hp.value = this.derived.hp.max;
    }
    
    // 计算最大侵蚀度 (感知/2 + 智力/3，向下取整)
    this.derived.corruption.max = Math.floor(per / 2) + Math.floor(int / 3);

    // 计算混乱值最大值 (体质>10 ? 生命值/2 : 生命值/3，向下取整)
    this.derived.chaos.max = con > 10
      ? Math.floor(this.derived.hp.max / 2)
      : Math.floor(this.derived.hp.max / 3);

    // 初始化当前混乱值
    if (this.derived.chaos.value === 0 || this.derived.chaos.value > this.derived.chaos.max) {
      this.derived.chaos.value = 0; // 混乱值从0开始
    }

    // 计算速度值 (1d6 + 敏捷/3，向下取整) - 这里取平均值
    this.derived.speed = 4 + Math.floor(dex / 3); // 1d6平均值为3.5，向上取4
    
    // 计算技能点总数
    this.skillPoints.strengthDex.total = str + dex * 3 + lvl * 3;
    this.skillPoints.intelligence.total = int * 4 + lvl * 3;
    this.skillPoints.perception.total = per * 4 + lvl * 3;
    this.skillPoints.charisma.total = cha * 3 + lvl * 3;
    
    // 计算已使用的技能点
    this._calculateUsedSkillPoints();
  }
  
  /**
   * 计算已使用的技能点
   */
  _calculateUsedSkillPoints() {
    // 力敏技能
    this.skillPoints.strengthDex.used = 
      this.skills.athletics + 
      this.skills.acrobatics + 
      this.skills.sleight + 
      this.skills.stealth;
    
    // 智力技能
    this.skillPoints.intelligence.used = 
      this.skills.qidian + 
      this.skills.history + 
      this.skills.investigation + 
      this.skills.nature + 
      this.skills.religion;
    
    // 感知技能
    this.skillPoints.perception.used = 
      this.skills.animal + 
      this.skills.insight + 
      this.skills.medicine + 
      this.skills.perception + 
      this.skills.survival;
    
    // 魅力技能
    this.skillPoints.charisma.used = 
      this.skills.deception + 
      this.skills.intimidation + 
      this.skills.performance + 
      this.skills.persuasion;
  }
  
  /**
   * 获取可用技能点
   */
  getAvailableSkillPoints(category) {
    const pool = this.skillPoints[category];
    if (!pool) return 0;
    return pool.total - pool.used;
  }
  
  /**
   * 检查是否可以增加技能点
   */
  canIncreaseSkill(skillName, category) {
    const currentValue = this.skills[skillName];
    if (currentValue >= 25) return false; // 技能上限25
    
    const available = this.getAvailableSkillPoints(category);
    return available > 0;
  }
  
  /**
   * 重写 toObject 以确保数据正确序列化
   */
  toObject(source = true) {
    const data = super.toObject(source);
    return data;
  }
}