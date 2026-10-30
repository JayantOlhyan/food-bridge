// Shared flat ESLint 9 configuration covering TypeScript client and ESM server files.
import js from '@eslint/js';
import ts from 'typescript-eslint';
import globals from 'globals';
export default [{ignores:['**/dist/**','**/node_modules/**']},js.configs.recommended,...ts.configs.recommended,{languageOptions:{globals:{...globals.browser,...globals.node}},rules:{'@typescript-eslint/no-explicit-any':'off','@typescript-eslint/no-unused-vars':['error',{argsIgnorePattern:'^_'}]}}];
