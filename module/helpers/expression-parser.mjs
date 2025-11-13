/**
 * 表达式解析器
 * 用于解析和计算动态表达式，支持：
 * - BUFF层数/强度引用: {buffId.layers}, {buffId.strength}
 * - 资源引用: {cost.extra}, {cost.used}
 * - 骰子属性: {dice.finalValue}, {dice.baseValue}
 * - 数学函数: floor(), ceil(), max(), min(), abs()
 * - 数学运算: +, -, *, /, %
 */
export class ExpressionParser {
  /**
   * 解析表达式
   * @param {string|number} expression - 要解析的表达式
   * @param {Object} context - 上下文对象
   * @param {Actor} context.actor - 当前角色
   * @param {Actor} context.target - 目标角色
   * @param {Object} context.dice - 骰子数据
   * @returns {number} 计算结果
   */
  static parse(expression, context) {
    // 如果是数字，直接返回
    if (typeof expression === 'number') {
      return expression;
    }

    // 如果是字符串数字，转换后返回
    if (typeof expression === 'string' && !isNaN(expression)) {
      return parseFloat(expression);
    }

    try {
      // 替换变量引用
      let evaluated = this._replaceVariables(expression, context);

      // 安全计算
      return this._safeEval(evaluated);
    } catch (error) {
      console.error('【表达式解析】解析失败:', expression, error);
      return 0;
    }
  }

  /**
   * 替换表达式中的变量引用
   */
  static _replaceVariables(expression, context) {
    const { actor, target, dice } = context;

    return expression.replace(/\{([^}]+)\}/g, (match, variable) => {
      const parts = variable.split('.');

      if (parts.length === 2) {
        const [type, property] = parts;

        // BUFF引用: {buffId.layers} 或 {buffId.strength}
        if (property === 'layers' || property === 'strength') {
          const buff = actor?.getBuff?.(type);
          if (buff) {
            return buff[property] || 0;
          }
          return 0;
        }

        // Cost资源引用: {cost.extra}, {cost.used}
        if (type === 'cost') {
          const combatState = actor?.getFlag?.('shuhai-dalu', 'combatState');
          if (combatState) {
            if (property === 'extra') {
              return combatState.exResources.filter(r => r).length;
            } else if (property === 'used') {
              return combatState.costResources.filter(r => r).length;
            }
          }
          return 0;
        }

        // 骰子属性引用: {dice.finalValue}, {dice.baseValue}
        if (type === 'dice' && dice) {
          return dice[property] || 0;
        }
      }

      // 如果无法解析，返回0
      console.warn('【表达式解析】无法解析变量:', variable);
      return 0;
    });
  }

  /**
   * 安全计算表达式
   * 使用白名单的数学函数，防止注入攻击
   */
  static _safeEval(expression) {
    // 允许的数学函数
    const allowedFunctions = {
      floor: Math.floor,
      ceil: Math.ceil,
      round: Math.round,
      max: Math.max,
      min: Math.min,
      abs: Math.abs
    };

    // 检查表达式是否包含危险字符
    if (/[a-zA-Z_$](?![a-zA-Z0-9_]*\()/.test(expression.replace(/floor|ceil|round|max|min|abs/g, ''))) {
      throw new Error('表达式包含非法字符');
    }

    // 创建安全的函数执行环境
    try {
      const func = new Function(
        ...Object.keys(allowedFunctions),
        `"use strict"; return (${expression});`
      );
      const result = func(...Object.values(allowedFunctions));

      // 确保结果是数字
      if (typeof result !== 'number' || !isFinite(result)) {
        throw new Error('计算结果不是有效数字');
      }

      return result;
    } catch (error) {
      console.error('【表达式解析】计算失败:', expression, error);
      return 0;
    }
  }

  /**
   * 检查表达式是否有效
   * @param {string} expression - 要检查的表达式
   * @returns {Object} { valid: boolean, error: string }
   */
  static validate(expression) {
    if (typeof expression === 'number') {
      return { valid: true };
    }

    if (typeof expression !== 'string') {
      return { valid: false, error: '表达式必须是字符串或数字' };
    }

    // 检查括号匹配
    let openBrackets = 0;
    for (const char of expression) {
      if (char === '{') openBrackets++;
      if (char === '}') openBrackets--;
      if (openBrackets < 0) {
        return { valid: false, error: '括号不匹配' };
      }
    }
    if (openBrackets !== 0) {
      return { valid: false, error: '括号不匹配' };
    }

    // 检查变量引用格式
    const variablePattern = /\{([^}]+)\}/g;
    let match;
    while ((match = variablePattern.exec(expression)) !== null) {
      const variable = match[1];
      if (!/^[a-zA-Z_][a-zA-Z0-9_]*\.[a-zA-Z_][a-zA-Z0-9_]*$/.test(variable)) {
        return { valid: false, error: `变量引用格式错误: ${variable}` };
      }
    }

    return { valid: true };
  }
}

/**
 * 常用表达式示例
 */
export const EXPRESSION_EXAMPLES = [
  {
    name: '每4层燃烧恢复1个Cost',
    expression: 'floor({burn.layers}/4)',
    description: '将燃烧层数除以4并向下取整'
  },
  {
    name: '骰数等于惧剑层数',
    expression: '{fearSword.layers}',
    description: '直接引用惧剑的层数'
  },
  {
    name: '恢复层数的一半',
    expression: 'ceil({guard.layers}/2)',
    description: '将守护层数除以2并向上取整'
  },
  {
    name: '最多恢复3个',
    expression: 'min({charge.layers}, 3)',
    description: '取充能层数和3之间的较小值'
  },
  {
    name: '复杂计算',
    expression: 'floor(({burn.layers} + {bleed.layers}) / 2)',
    description: '燃烧和流血层数之和的一半'
  }
];
