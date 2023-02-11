import Handlebars from 'handlebars';
import hbs from 'hbs';
import { AesirJson } from './types';

class Utils {
  private readonly fullReplacement: AesirJson;

  constructor(full: AesirJson) {
    this.fullReplacement = full;
  }

  /**
   * Getting the variables from the Handlebars template.
   * Supports helpers too.
   * @param input
   */
  public getHandlebarsVariables(input: string): string[] {
    const ast: hbs.AST.Program = Handlebars.parseWithoutProcessing(input);

    return ast.body
      .filter(({ type }: hbs.AST.Statement) => type === 'MustacheStatement')
      .map((statement: hbs.AST.Statement) => {
        const moustacheStatement: hbs.AST.MustacheStatement = statement as hbs.AST.MustacheStatement;
        const paramsExpressionList = moustacheStatement.params as hbs.AST.PathExpression[];
        const pathExpression = moustacheStatement.path as hbs.AST.PathExpression;

        return paramsExpressionList[0]?.original || pathExpression.original;
      });
  }

  public getValueForTemplateVariable(variable: string): string | null {
    if (!Utils.isNullEmptyOrUndefined(this.fullReplacement[variable.toUpperCase()])) {
      return this.fullReplacement[variable.toUpperCase()] as string;
    }
    return null;
  }

  public static isNullEmptyOrUndefined(str: string | undefined | null): boolean {
    return str === null || str === undefined || str === '';
  }

  public static getBooleanValue(str: string | undefined | null | boolean): boolean {
    if (str === 'true' || str === true || str === 'True' || str === 'TRUE') {
      return true;
    }
    return false;
  }
}

export default Utils;
