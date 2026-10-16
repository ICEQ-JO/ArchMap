import ts from 'typescript';
import type { Evidence } from '../shared/schema.js';

export type CallSite = {
  file: string;
  caller: string;
  target: string;
  symbol: string;
  evidence: Evidence;
  conditional: boolean;
};
// This collects lexical call sites to named imported functions. It never claims
// a call was executed; local shadowing and nested callbacks are excluded.
export function collectCalls(
  file: string,
  source: ts.SourceFile,
  resolve: (specifier: string) => string | undefined,
  evidenceFor: (file: string, node: ts.Node) => Evidence,
): CallSite[] {
  const bindings = new Map<string, { target: string; symbol: string }>();
  for (const statement of source.statements) {
    if (
      !ts.isImportDeclaration(statement) ||
      !ts.isStringLiteralLike(statement.moduleSpecifier) ||
      !statement.importClause ||
      statement.importClause.isTypeOnly
    )
      continue;
    const target = resolve(statement.moduleSpecifier.text);
    if (!target) continue;
    if (statement.importClause.name)
      bindings.set(statement.importClause.name.text, { target, symbol: 'default' });
    const named = statement.importClause.namedBindings;
    if (named && ts.isNamedImports(named))
      for (const element of named.elements)
        if (!element.isTypeOnly)
          bindings.set(element.name.text, {
            target,
            symbol: element.propertyName?.text ?? element.name.text,
          });
  }
  const result: CallSite[] = [];
  function inspect(
    fn: ts.FunctionDeclaration | ts.ArrowFunction | ts.FunctionExpression,
    name: string,
  ) {
    const shadowed = new Set<string>();
    function binding(node: ts.BindingName) {
      if (ts.isIdentifier(node)) shadowed.add(node.text);
      else for (const item of node.elements) if (ts.isBindingElement(item)) binding(item.name);
    }
    for (const parameter of fn.parameters) binding(parameter.name);
    function declarations(node: ts.Node) {
      if (node !== fn && (ts.isFunctionLike(node) || ts.isClassLike(node))) {
        if (ts.isFunctionDeclaration(node) && node.name) shadowed.add(node.name.text);
        return;
      }
      if (ts.isVariableDeclaration(node)) binding(node.name);
      if (ts.isCatchClause(node) && node.variableDeclaration)
        binding(node.variableDeclaration.name);
      ts.forEachChild(node, declarations);
    }
    if (fn.body) declarations(fn.body);
    function visit(node: ts.Node, conditional = false) {
      if (node !== fn && (ts.isFunctionLike(node) || ts.isClassLike(node))) return;
      if (
        ts.isCallExpression(node) &&
        ts.isIdentifier(node.expression) &&
        !shadowed.has(node.expression.text)
      ) {
        const imported = bindings.get(node.expression.text);
        if (imported)
          result.push({
            file,
            caller: name,
            target: imported.target,
            symbol: imported.symbol,
            evidence: evidenceFor(file, node),
            conditional,
          });
      }
      const branch =
        conditional ||
        ts.isIfStatement(node) ||
        ts.isConditionalExpression(node) ||
        ts.isIterationStatement(node, false) ||
        ts.isSwitchStatement(node) ||
        (ts.isBinaryExpression(node) &&
          [
            ts.SyntaxKind.AmpersandAmpersandToken,
            ts.SyntaxKind.BarBarToken,
            ts.SyntaxKind.QuestionQuestionToken,
          ].includes(node.operatorToken.kind));
      ts.forEachChild(node, (child) => visit(child, branch));
    }
    if (fn.body) visit(fn.body);
  }
  for (const statement of source.statements) {
    if (ts.isFunctionDeclaration(statement) && statement.name)
      inspect(statement, statement.name.text);
    if (ts.isVariableStatement(statement))
      for (const declaration of statement.declarationList.declarations) {
        if (
          ts.isIdentifier(declaration.name) &&
          declaration.initializer &&
          (ts.isArrowFunction(declaration.initializer) ||
            ts.isFunctionExpression(declaration.initializer))
        )
          inspect(declaration.initializer, declaration.name.text);
      }
  }
  return result;
}
