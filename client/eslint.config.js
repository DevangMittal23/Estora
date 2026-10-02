import js from '@eslint/js';
import globals from 'globals';
import react from 'eslint-plugin-react';
import hooks from 'eslint-plugin-react-hooks';
export default [{ignores:['dist/**','node_modules/**']},js.configs.recommended,{files:['src/**/*.{js,jsx}'],languageOptions:{globals:{...globals.browser,...globals.vitest},parserOptions:{ecmaFeatures:{jsx:true}}},plugins:{react,'react-hooks':hooks},settings:{react:{version:'18.3'}},rules:{...hooks.configs.recommended.rules,'react/jsx-uses-react':'error','react/jsx-uses-vars':'error','no-unused-vars':['error',{argsIgnorePattern:'^_'}]}}];
