import path from "path";
import * as ts from "typescript";
import { parse as parseJavaScript } from "acorn";
import fs from "fs";
import diff from "diff";
export function parseCodeToAST(code: string, filePath: string): any {
    const fileExtension = path.extname(filePath);
  
    switch (fileExtension) {
      case ".js":
      case ".jsx":
        return parseJavaScriptToAST(code, filePath);
      case ".ts":
      case ".tsx":
        return parseTypeScriptToAST(code, filePath);
      default:
        throw new Error(`Unsupported file extension: ${fileExtension}`);
    }
  }
  
  export function traverseAST(ast: any, nodeTypes: string[]): any {
    const result: any = {};
  
    function simplifyNode(node: any): any {
      const simplifiedNode: any = {
        kind: node.type,
        // Add other relevant properties as needed
      };
  
      // Recursively simplify child nodes
      if (node.body) {
        if (Array.isArray(node.body)) {
          simplifiedNode.body = node.body.map((child: any) => simplifyNode(child));
        } else {
          simplifiedNode.body = simplifyNode(node.body);
        }
      }
  
      return simplifiedNode;
    }
  
    function traverseNode(node: any) {
      if (nodeTypes.includes(node.type)) {
        result[node.type] = simplifyNode(node);
      }
  
      if (node.body) {
        if (Array.isArray(node.body)) {
          node.body.forEach((child: any) => traverseNode(child));
        } else {
          traverseNode(node.body);
        }
      }
    }
  
    traverseNode(ast);
  
    return result;
  }
  export function applyPatch(filePath: string, className?: string, methodName?: string, edits?: string): void {
    const sourceFile = ts.createSourceFile(filePath, fs.readFileSync(filePath, 'utf-8'), ts.ScriptTarget.Latest, true);
  
    const transformer: ts.TransformerFactory<ts.SourceFile> = (context) => {
      return (sourceFile) => {
        const visitor: ts.Visitor = (node) => {
          if (ts.isClassDeclaration(node) && node.name?.getText() === className) {
            if (methodName) {
              const methodDeclaration = findMethodDeclaration(node, methodName);
              if (methodDeclaration) {
                // Replace the entire method declaration with the provided edits
                const newMethodDeclaration = ts.createSourceFile(
                    methodDeclaration.getSourceFile().fileName,
                    edits ?? '',
                    ts.ScriptTarget.Latest
                ).statements[0] as unknown as ts.MethodDeclaration;
  
                return ts.factory.updateClassDeclaration(
                  node,
                  node.decorators,
                  ts.getModifiers(node),
                  node.name,
                  node.typeParameters,
                  node.heritageClauses,
                  ts.factory.createNodeArray([
                    ...node.members.filter((member) => member !== methodDeclaration),
                    newMethodDeclaration,
                  ])
                );
              } else {
                console.error(`Method '${methodName}' not found in class '${className}'.`);
                return node;
              }
            } else {
              // Replace the entire class declaration with the provided edits
              const newClassDeclaration = ts.createSourceFile(
                node.getSourceFile().fileName,
                edits ?? '',
                ts.ScriptTarget.Latest
              ).statements[0] as ts.ClassDeclaration;
  
              return newClassDeclaration;
            }
          }
          return ts.visitEachChild(node, visitor, context);
        };
  
        return ts.visitNode(sourceFile, visitor);
      };
    };
  
    const transformationResult = ts.transform(sourceFile, [transformer]);
    const updatedSourceFile = transformationResult.transformed[0];
    const updatedCode = ts.createPrinter().printFile(updatedSourceFile);
  
    fs.writeFileSync(filePath, updatedCode, 'utf-8');
  }
  
  function findClassDeclaration(sourceFile: ts.SourceFile, className: string): ts.ClassDeclaration | undefined {
    return sourceFile.statements.find(
      (statement) => ts.isClassDeclaration(statement) && statement.name?.getText() === className
    ) as ts.ClassDeclaration | undefined;
  }
  
  function findMethodDeclaration(classDeclaration: ts.ClassDeclaration, methodName: string): ts.MethodDeclaration | undefined {
    return classDeclaration.members.find(
      (member) => ts.isMethodDeclaration(member) && member.name?.getText() === methodName
    ) as ts.MethodDeclaration | undefined;
  }
//   export function applyPatchToAST(filePath: string, nodeKind: string, nodeName: string, methodName: string, startPos: number, endPos: number, edits: string): void {
//     if (!filePath) {
//       console.error(`File path is undefined. Cannot apply patch.`);
//       return;
//     }
  
//     try {
//       const sourceFile = ts.createSourceFile(filePath, fs.readFileSync(filePath, 'utf-8'), ts.ScriptTarget.Latest, true);
  
//       function traverseNode(node: ts.Node) {
//         if (ts.isClassDeclaration(node) && nodeKind === 'ClassDeclaration' && node.name?.text === nodeName) {
//           const classStart = node.getStart(sourceFile);
//           const classEnd = node.getEnd();
  
//           if (classStart === startPos && classEnd === endPos) {
//             // Traverse the class members to find the target method
//             node.members.forEach(member => {
//               if (ts.isMethodDeclaration(member) && member.name?.getText(sourceFile) === methodName) {
//                 const methodStart = member.getStart(sourceFile);
//                 const methodEnd = member.getEnd();
  
//                 const originalMethod = sourceFile.getFullText().slice(methodStart, methodEnd);
//                 const updatedMethod = edits;
  
//                 // Display the diff of changes in the console log
//                 const diffResult = diff.createTwoFilesPatch('original', 'updated', originalMethod, updatedMethod);
//                 console.log('Diff of changes:');
//                 console.log(diffResult);
  
//                 const updatedContent =
//                   sourceFile.getFullText().slice(0, methodStart) +
//                   updatedMethod +
//                   sourceFile.getFullText().slice(methodEnd);
  
//                 fs.writeFileSync(filePath, updatedContent, 'utf-8');
//               }
//             });
//           }
//         } else if (ts.isFunctionDeclaration(node) && nodeKind === 'FunctionDeclaration' && node.name?.text === nodeName) {
//           const start = node.getStart(sourceFile);
//           const end = node.getEnd();
  
//           if (start === startPos && end === endPos) {
//             const originalFunction = sourceFile.getFullText().slice(start, end);
//             const updatedFunction = edits;
  
//             // Display the diff of changes in the console log
//             const diffResult = diff.createTwoFilesPatch('original', 'updated', originalFunction, updatedFunction);
//             console.log('Diff of changes:');
//             console.log(diffResult);
  
//             const updatedContent =
//               sourceFile.getFullText().slice(0, start) +
//               updatedFunction +
//               sourceFile.getFullText().slice(end);
  
//             fs.writeFileSync(filePath, updatedContent, 'utf-8');
//           }
//         }
  
//         ts.forEachChild(node, traverseNode);
//       }
  
//       traverseNode(sourceFile);
//     } catch (error) {
//       console.error(`Error applying patch to file ${filePath}:`, error);
//       // Handle the error appropriately, such as sending an error message to the user
//     }
//   }
  
 
  
 
  
  export function generateCodeFromAST(ast: any): string {
    let code = '';
  
    // Generate code for classes
    if (ast.classes && ast.classes.length > 0) {
      for (const classObj of ast.classes) {
        code += `${classObj}\n\n`;
      }
    }
  
    // Generate code for methods
    if (ast.methods && ast.methods.length > 0) {
      for (const methodObj of ast.methods) {
        code += `${methodObj}\n\n`;
      }
    }
  
    // Generate code for interfaces
    if (ast.interfaces && ast.interfaces.length > 0) {
      for (const interfaceObj of ast.interfaces) {
        code += `${interfaceObj}\n\n`;
      }
    }
  
    // Generate code for types
    if (ast.types && ast.types.length > 0) {
      for (const typeObj of ast.types) {
        code += `${typeObj}\n\n`;
      }
    }
  
    return code.trim();
  }
  
  function parseJavaScriptToAST(code: string, filePath: string): any {
    try {
      const ast = parseJavaScript(code, { ecmaVersion: "latest", sourceType: "module" });
      return simplifyAST(ast);
    } catch (error) {
      if (error instanceof SyntaxError) {
        const { message, pos, loc } = error as unknown as {
          message: string;
          pos: number;
          loc: { line: number; column: number };
        };
        const errorInfo = {
          message,
          filePath,
          line: loc?.line || 0,
          column: loc?.column || 0,
          pos,
          code,
        };
        throw new Error(JSON.stringify(errorInfo));
      } else {
        throw error;
      }
    }
  }
  
  
  function parseTypeScriptToAST(code: string, filePath: string): any {
    const sourceFile = ts.createSourceFile(
      filePath,
      code,
      ts.ScriptTarget.ES2015,
      /*setParentNodes*/ true
    );
  
    const simplified: any = {
      classes: [],
      methods: [],
      interfaces: [],
      types: [],
    };
  
    function getTypeAnnotation(node: any): string | null {
      if (node && node.type) {
        return ts.SyntaxKind[node.type.kind];
      }
      return null;
    }
  
    function getParameters(node: any): any[] {
      if (node.parameters) {
        return node.parameters.map((param: any) => ({
          name: param.name.escapedText || param.name.text,
          type: getTypeAnnotation(param.type),
        }));
      }
      return [];
    }
  
    function getPropertyName(node: any): string | null {
        if (ts.isIdentifier(node)) {
          return node.escapedText.toString();
        } else if (ts.isStringLiteral(node)) {
          return node.text;
        } else if (ts.isNumericLiteral(node)) {
          return node.text;
        } else if (ts.isComputedPropertyName(node)) {
          // Handle computed property names if needed
          return null;
        }
        return null;
      }
  
    function traverseNode(node: ts.Node) {
      if (ts.isClassDeclaration(node)) {
        simplified.classes.push({
          name: getPropertyName(node.name),
          // Add other relevant class-level information
        });
      } else if (ts.isMethodDeclaration(node) || ts.isFunctionDeclaration(node)) {
        simplified.methods.push({
          name: getPropertyName(node.name),
          returnType: getTypeAnnotation(node.type),
          parameters: getParameters(node),
          // Add other relevant method-level information
        });
      } else if (ts.isInterfaceDeclaration(node)) {
        simplified.interfaces.push({
          name: getPropertyName(node.name),
          // Add other relevant interface-level information
        });
      } else if (ts.isTypeAliasDeclaration(node)) {
        simplified.types.push({
          name: getPropertyName(node.name),
          // Add other relevant type-level information
        });
      }
  
      ts.forEachChild(node, traverseNode);
    }
  
    traverseNode(sourceFile);
  
    return simplified;
  }
  

  
    function simplifyAST(ast: any): any {
        const simplified: any = {
          classes: [],
          methods: [],
          interfaces: [],
          types: [],
        };
      
        function getTypeAnnotation(node: any): string | null {
          if (node && node.typeAnnotation) {
            return node.typeAnnotation.type;
          }
          return null;
        }
      
        function getParameters(node: any): any[] {
          if (node.parameters) {
            return node.parameters.map((param: any) => ({
              name: param.name.escapedText || param.name.text,
              type: getTypeAnnotation(param.type),
            }));
          }
          return [];
        }
      
        function traverseNode(node: any) {
          if (node.kind === ts.SyntaxKind.ClassDeclaration) {
            simplified.classes.push({
              name: node.name.escapedText,
              // Add other relevant class-level information
            });
          } else if (
            node.kind === ts.SyntaxKind.MethodDeclaration ||
            node.kind === ts.SyntaxKind.FunctionDeclaration
          ) {
            simplified.methods.push({
              name: node.name?.escapedText,
              returnType: getTypeAnnotation(node.type),
              parameters: getParameters(node),
              // Add other relevant method-level information
            });
          } else if (node.kind === ts.SyntaxKind.InterfaceDeclaration) {
            simplified.interfaces.push({
              name: node.name.escapedText,
              // Add other relevant interface-level information
            });
          } else if (node.kind === ts.SyntaxKind.TypeAliasDeclaration) {
            simplified.types.push({
              name: node.name.escapedText,
              // Add other relevant type-level information
            });
          }
      
          ts.forEachChild(node, traverseNode);
        }
      
        traverseNode(ast);
      
        return simplified;
      }
  