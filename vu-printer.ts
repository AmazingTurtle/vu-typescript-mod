import * as ts from "typescript";
import {SyntaxKind} from "typescript";
//@ts-ignore
import * as fs from "fs";
//@ts-ignore
import * as path from "path";
import * as tstl from "typescript-to-lua";
import {
    CallExpression,
    createBooleanLiteral,
    createCallExpression,
    createExpressionStatement,
    createIdentifier,
    createMethodCallExpression,
    createStringLiteral,
    createTableIndexExpression,
    createVariableDeclarationStatement, Expression, Identifier, Statement, VariableDeclarationStatement,
} from "typescript-to-lua";
import {TransformationContext} from "typescript-to-lua/dist/transformation/context/context";
import {transformArguments} from "typescript-to-lua/dist/transformation/visitors/call";
import {peekScope} from "typescript-to-lua/dist/transformation/utils/scope";
import {createSafeName} from "typescript-to-lua/dist/transformation/utils/safe-names";
import {createDefaultExportStringLiteral} from "typescript-to-lua/dist/transformation/utils/export";
import {transformIdentifier} from "typescript-to-lua/dist/transformation/visitors/identifier";
import {
    AnnotationKind,
    getSymbolAnnotations,
    getTypeAnnotations
} from "typescript-to-lua/dist/transformation/utils/annotations";
import {transformPropertyName} from "typescript-to-lua/dist/transformation/visitors/literal";
import {unresolvableRequirePath} from "typescript-to-lua/dist/transformation/utils/diagnostics";

const allowedNamespaces = ['VUShared', 'VUClient', 'VUServer', 'FB'];

export function formatPathToLuaPath(filePath: string): string {
    filePath = filePath.replace(/\.json$/, "");
    // @ts-ignore
    if (process.platform === "win32") {
        // Windows can use backslashes
        filePath = filePath.replace(/\.\\/g, "").replace(/\\/g, "/");
    }
    return filePath.replace(/\.\//g, "").replace(/\//g, "/");
}

const getAbsoluteImportPath = (relativePath: string, directoryPath: string, options: ts.CompilerOptions) =>
    !relativePath.startsWith(".") && options.baseUrl
        ? path.resolve(options.baseUrl, relativePath)
        : path.resolve(directoryPath, relativePath);

function shouldResolveModulePath(context: TransformationContext, moduleSpecifier: ts.Expression): boolean {
    const moduleOwnerSymbol = context.checker.getSymbolAtLocation(moduleSpecifier);
    if (!moduleOwnerSymbol) return true;

    const annotations = getSymbolAnnotations(moduleOwnerSymbol);
    return !annotations.has(AnnotationKind.NoResolution);
}

function getImportPath(context: TransformationContext, relativePath: string, node: ts.Node): string {
    const { options, sourceFile } = context;
    const { fileName } = sourceFile;
    let rootDir = options.rootDir ? path.resolve(options.rootDir) : path.resolve(".");
    rootDir = path.join(rootDir, 'ext');

    const absoluteImportPath = path.format(
        path.parse(getAbsoluteImportPath(relativePath, path.dirname(fileName), options))
    );

    const baseDirectory = path.dirname(fileName).substring(rootDir.length + 1);
    const importBaseDirectory = path.dirname(absoluteImportPath).substring(rootDir.length + 1);
    if ((baseDirectory === 'server' || baseDirectory === 'client') && baseDirectory === importBaseDirectory) {
        rootDir = path.join(rootDir, baseDirectory);
    }

    const absoluteRootDirPath = path.format(path.parse(rootDir));

    if (absoluteImportPath.includes(absoluteRootDirPath)) {
        const importPaths = absoluteImportPath.replace(absoluteRootDirPath, "").slice(1);
        if (importPaths.startsWith('shared\\')) {
            return formatPathToLuaPath('__' + importPaths);
        }
        return formatPathToLuaPath(importPaths);
    } else {
        context.diagnostics.push(unresolvableRequirePath(node, relativePath));
        return relativePath;
    }
}

export function createModuleRequire(
    context: TransformationContext,
    moduleSpecifier: ts.Expression,
    tsOriginal: ts.Node = moduleSpecifier
): CallExpression {
    const params: Expression[] = [];
    if (ts.isStringLiteral(moduleSpecifier)) {
        const modulePath = shouldResolveModulePath(context, moduleSpecifier)
            ? getImportPath(context, moduleSpecifier.text.replace(/"/g, ""), moduleSpecifier)
            : moduleSpecifier.text;

        params.push(createStringLiteral(modulePath));
    }

    return createCallExpression(createIdentifier("require"), params, tsOriginal);
}


function shouldBeImported(context: TransformationContext, importNode: ts.ImportClause | ts.ImportSpecifier): boolean {
    const annotations = getTypeAnnotations(context.checker.getTypeAtLocation(importNode));

    return (
        context.resolver.isReferencedAliasDeclaration(importNode) &&
        !annotations.has(AnnotationKind.Extension) &&
        !annotations.has(AnnotationKind.MetaExtension)
    );
}

function transformImportSpecifier(
    context: TransformationContext,
    importSpecifier: ts.ImportSpecifier,
    moduleTableName: Identifier
): VariableDeclarationStatement {
    const leftIdentifier = transformIdentifier(context, importSpecifier.name);
    const propertyName = transformPropertyName(
        context,
        importSpecifier.propertyName ? importSpecifier.propertyName : importSpecifier.name
    );

    return createVariableDeclarationStatement(
        leftIdentifier,
        createTableIndexExpression(moduleTableName, propertyName),
        importSpecifier
    );
}

const plugin: tstl.Plugin = {
    visitors: {
        [ts.SyntaxKind.ImportEqualsDeclaration]: (node: ts.ImportEqualsDeclaration, context: TransformationContext) => {
            if (node.moduleReference.kind === ts.SyntaxKind.QualifiedName &&
                node.moduleReference.left.kind === ts.SyntaxKind.Identifier &&
                allowedNamespaces.indexOf(<string> node.moduleReference.left.escapedText) !== -1) {
                return undefined;
            }
            return <any> context.superTransformNode(node);
        },
        [ts.SyntaxKind.PropertyAccessExpression]: (node: ts.PropertyAccessExpression, context: TransformationContext) => {
            const propertyExpression = (<ts.PropertyAccessExpression>node.expression);
            const identifierExpression = (<ts.Identifier>node.expression);
            if (node.expression.kind === SyntaxKind.PropertyAccessExpression && propertyExpression.name && (propertyExpression.name.escapedText === 'EventsEnum' || propertyExpression.name.escapedText === 'HooksEnum')) {
                return createStringLiteral((<string> node.name.escapedText).replace(/_/g, ':'));
            } else if (node.expression.kind === SyntaxKind.Identifier && allowedNamespaces.indexOf(<string> identifierExpression.escapedText) !== -1) {
                return createIdentifier(<string> (<ts.Identifier>node.name).escapedText);
            }
            return context.superTransformExpression(node);
        },
        [ts.SyntaxKind.NewExpression]: (node: ts.NewExpression, context: TransformationContext) => {
            const signature = context.checker.getResolvedSignature(node);
            const params = node.arguments
                ? transformArguments(context, node.arguments, signature)
                : [createBooleanLiteral(true)];
            if (node.expression.kind === SyntaxKind.PropertyAccessExpression &&
                (<ts.PropertyAccessExpression>node.expression).expression.kind === SyntaxKind.Identifier &&
                allowedNamespaces.indexOf(<string>(<ts.Identifier>(<ts.PropertyAccessExpression>node.expression).expression).escapedText) !== -1) {
                return createCallExpression(createIdentifier(<string>(<ts.PropertyAccessExpression>node.expression).name.escapedText), params);
            }

            return context.superTransformExpression(node);
        },
        [ts.SyntaxKind.ImportDeclaration]: (statement: ts.ImportDeclaration, context: TransformationContext) => {
            const scope = peekScope(context);

            if (!scope.importStatements) {
                scope.importStatements = [];
            }

            const result: Statement[] = [];
            const requireCall = createModuleRequire(context, statement.moduleSpecifier);

            // import "./module";
            // require("module")
            if (statement.importClause === undefined) {
                result.push(createExpressionStatement(requireCall));

                if (scope.importStatements) {
                    scope.importStatements.push(...result);
                    return undefined;
                } else {
                    return result;
                }
            }

            const importPath = ts.isStringLiteral(statement.moduleSpecifier)
                ? statement.moduleSpecifier.text.replace(/"/g, "")
                : "module";

            // Create the require statement to extract values.
            // local ____module = require("module")
            const importUniqueName = createIdentifier(createSafeName(path.basename(importPath)));

            let usingRequireStatement = false;

            // import defaultValue from "./module";
            // local defaultValue = __module.default
            if (statement.importClause.name) {
                if (shouldBeImported(context, statement.importClause)) {
                    const propertyName = createDefaultExportStringLiteral(statement.importClause.name);
                    const defaultImportAssignmentStatement = createVariableDeclarationStatement(
                        transformIdentifier(context, statement.importClause.name),
                        createTableIndexExpression(importUniqueName, propertyName),
                        statement.importClause.name
                    );

                    result.push(defaultImportAssignmentStatement);
                    usingRequireStatement = true;
                }
            }

            // import * as module from "./module";
            // local module = require("module")
            if (statement.importClause.namedBindings && ts.isNamespaceImport(statement.importClause.namedBindings)) {
                if (context.resolver.isReferencedAliasDeclaration(statement.importClause.namedBindings)) {
                    const requireStatement = createVariableDeclarationStatement(
                        transformIdentifier(context, statement.importClause.namedBindings.name),
                        requireCall,
                        statement
                    );

                    result.push(requireStatement);
                }
            }

            // import { a, b, c } from "./module";
            // local a = __module.a
            // local b = __module.b
            // local c = __module.c
            if (statement.importClause.namedBindings && ts.isNamedImports(statement.importClause.namedBindings)) {
                const assignmentStatements = statement.importClause.namedBindings.elements
                    .filter(importSpecifier => shouldBeImported(context, importSpecifier))
                    .map(importSpecifier => transformImportSpecifier(context, importSpecifier, importUniqueName));

                if (assignmentStatements.length > 0) {
                    usingRequireStatement = true;
                }

                result.push(...assignmentStatements);
            }

            if (result.length === 0) {
                return undefined;
            }

            if (usingRequireStatement) {
                result.unshift(createVariableDeclarationStatement(importUniqueName, requireCall, statement));
            }

            if (scope.importStatements) {
                scope.importStatements.push(...result);
                return undefined;
            } else {
                return result;
            }
        },
        [ts.SyntaxKind.CallExpression]: (node: ts.CallExpression, context: TransformationContext) => {
            // i know code below is far from being sexy
            if (node.expression && (<any>node).expression.expression && (<any>node).expression.expression.escapedText === 'TSUtils' &&
                (<any>node).expression.name && (<any>node).expression.name.escapedText === 'RetrieveEBXInstance') {

                const wantedTypeName =  (<any>node).typeArguments[0].typeName.right.escapedText.toLowerCase();

                const what = (<any>node).arguments[0].text;
                const path = `./rime-dump/${what}.json`;
                if (!fs.existsSync(path)) {
                    context.diagnostics.push({
                        file: context.sourceFile,
                        category: ts.DiagnosticCategory.Error,
                        code: node.pos,
                        start: node.pos,
                        length: node.pos - node.end,
                        messageText: `[rime dump lookup] file not found rime-dump/${what}.json`
                    });
                    return false;
                }
                const jsonData = fs.readFileSync(path);
                const json = JSON.parse(jsonData.toString());
                const match = json['$instances'].find((instanceEntry: any) => `${instanceEntry['$type']}`.toLowerCase() === wantedTypeName);
                if (!match) {
                    context.diagnostics.push({
                        file: context.sourceFile,
                        category: ts.DiagnosticCategory.Error,
                        code: node.pos,
                        start: node.pos,
                        length: node.pos - node.end,
                        messageText: `[rime dump lookup] instance not found ${what} in rime-dump/${what}.json`
                    });
                    return <any>false;
                }

                return createMethodCallExpression(
                    createIdentifier('ResourceManager'),
                    createIdentifier('FindInstanceByGuid'),
                    [
                        createCallExpression(createIdentifier('Guid'), [createStringLiteral(json['$guid'].toUpperCase())]),
                        createCallExpression(createIdentifier('Guid'), [createStringLiteral(match['$guid'].toUpperCase())])
                    ]
                )
            }
            return context.superTransformExpression(node);
        }
    }
};

export default plugin;
