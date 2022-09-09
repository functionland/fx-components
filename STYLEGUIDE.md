# Style Guide

Please refer to our [design files](https://github.com/functionland/apps-monorepo/tree/main/design-files) when contributing to either the File Sync app, Blox app or component library.

Here are the style rules to follow:

### 1 Be consistent with the rest of the codebase

This is the number one rule and should help determine what to do in most cases.

### 2 Use Restyle Theming

All screens and components are built around [restyle](https://github.com/Shopify/restyle). The Restyle library provides a type-enforced system for building UI components in React Native with TypeScript. Please read through the restyle [documentation](https://github.com/Shopify/restyle/blob/master/README.md) before contributing

### 3 Respect Prettier and Linter rules

We use a linter and prettier to automatically help you make style guide decisions easy.

### 4 File Name

Generally file names are PascalCase if they are components or classes, and camelCase otherwise. This is with the exception of the component library (see [rule #1](#1-be-consistent-with-the-rest-of-the-codebase)). Filenames' extension must be .tsx for component files and .ts otherwise.

### 5 Respect Google JavaScript style guide

The style guide accessible
[here](https://google.github.io/styleguide/jsguide.html) should be
respected. However, if a rule is not consistent with the rest of the codebase,
[rule #1](#1-be-consistent-with-the-rest-of-the-codebase) takes precedence. Same thing goes with any of the above rules taking precedence over this rule.

### 6 Follow these grammar rules

- Functions descriptions should start with a verb using the third person of the
  singular.
  - _Ex: `/\*\* Tests the validity of the input. _/`\*
- Inline comments within procedures should always use the imperative.
  - _Ex: `// Check whether the value is true.`_
- Acronyms should be uppercased in comments.
  - _Ex: `// IP, DOM, CORS, URL...`_
  - _Exception: Identity Provider = IdP_
- Acronyms should be capitalized (but not uppercased) in variable names.
  - _Ex: `redirectUrl()`, `signInIdp()`_
- Always start an inline comment with a capital (unless referring to the name of
  a variable/function), and end it with a period.
  - _Ex: `// This is a valid inline comment.`_
